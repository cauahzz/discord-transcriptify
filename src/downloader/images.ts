import type { APIAttachment, APIMessage, Awaitable } from 'discord.js';
import debug from 'debug';
import { fetchGuarded } from './fetch';
import { ByteBudget, createLimiter } from './budget';
import { describeUrl } from '../utils/utils';

/**
 * Callback used to save an image attachment.
 * The returned string is the URL that will be used in the transcript.
 *
 * `undefined` indicates to use the original attachment URL.
 * `null` indicates to not include the attachment in the transcript.
 * `string` indicates to use the returned URL as the attachment URL (base64 or remote image).
 */
export type ResolveImageCallback = (
  attachment: APIAttachment,
  message: APIMessage
) => Awaitable<string | null | undefined>;

/**
 * WebP encoder options forwarded to sharp. Declared here instead of imported
 * from sharp so the published typings still resolve when the optional peer is
 * not installed.
 */
export type WebpCompressionOptions = Partial<{
  alphaQuality: number;
  lossless: boolean;
  nearLossless: boolean;
  smartSubsample: boolean;
  smartDeblock: boolean;
  effort: number;
  minSize: boolean;
  mixed: boolean;
  preset: 'default' | 'photo' | 'picture' | 'drawing' | 'icon' | 'text';
  exact: boolean;
  loop: number;
  delay: number | number[];
}>;

/** Default cap for a single image, in kilobytes. */
const DEFAULT_MAX_SIZE_KB = 10240;

/** Default number of images downloaded and processed at the same time. */
const DEFAULT_CONCURRENCY = 4;

/** Builds an image saving callback, with optional resizing and compression. */
export class TranscriptImageDownloader {
  private static log = debug('discord-transcriptify:TranscriptImageDownloader');
  private log = TranscriptImageDownloader.log;

  private maxFileSize?: number; // in kilobytes
  private maxTotalSize = 0; // in kilobytes, 0 for no limit
  private concurrency = DEFAULT_CONCURRENCY;
  private maxDimensions?: { width: number; height: number };
  private compression?: {
    quality: number; // 1-100
    convertToWebP: boolean;
    options: WebpCompressionOptions;
  };
  private allowPrivateNetwork = false;
  private headersTimeout = 10_000;
  private bodyTimeout = 30_000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sharpModule: any = null;

  /**
   * Sets the maximum file size for *each* individual image.
   * Images larger than this will be skipped (not downloaded). The limit is
   * enforced against the bytes actually received, so a server that lies about
   * (or omits) `Content-Length` cannot exceed it.
   * @param size The maximum file size in kilobytes
   */
  withMaxSize(size: number) {
    this.maxFileSize = size;
    return this;
  }

  /**
   * Sets the maximum size of *all* embedded images together, counted on the
   * data that ends up in the transcript (after compression, base64 included).
   * Once it is reached, the remaining images keep their original URL. This is
   * what bounds the memory a transcript with many images needs.
   *
   * The total belongs to the callback returned by `build()`, so build one per
   * transcript.
   * @param size The maximum total size in kilobytes; zero or less means no limit (the default)
   */
  withMaxTotalSize(size: number) {
    this.maxTotalSize = size;
    return this;
  }

  /**
   * Sets how many images are downloaded and processed at the same time. The
   * others wait, so their buffers are not all in memory at once.
   * @param concurrency Zero or less means no limit (default 4)
   */
  withConcurrency(concurrency: number) {
    this.concurrency = concurrency;
    return this;
  }

  /**
   * Sets the maximum dimensions for images. Images larger than this
   * will be resized while maintaining aspect ratio.
   * Requires `sharp` to be installed.
   * @param width Maximum width in pixels
   * @param height Maximum height in pixels
   */
  withMaxDimensions(width: number, height: number) {
    this.maxDimensions = { width, height };
    return this;
  }

  /**
   * Sets the compression quality for each image. This requires `sharp` to be installed.
   * The quality applies to JPEG and WebP images; a PNG stays lossless unless it is
   * converted. Optionally, images can be converted to WebP format which is smaller in size.
   * If sharp is not available, images are saved without compression.
   * @param quality The quality of the image (1 lowest - 100 highest). Lower quality means smaller file size.
   * @param convertToWebP Whether to convert the image to WebP format
   */
  withCompression(quality = 80, convertToWebP = false, options: WebpCompressionOptions = {}) {
    if (quality < 1 || quality > 100) throw new Error('Quality must be between 1 and 100');
    this.compression = { quality, convertToWebP, options };
    return this;
  }

  /**
   * Sets how long to wait for an image server, in milliseconds.
   * @param headers Time to wait for response headers (default 10000)
   * @param body Time to wait for the response body (default 30000)
   */
  withTimeout(headers: number, body: number) {
    this.headersTimeout = headers;
    this.bodyTimeout = body;
    return this;
  }

  /**
   * Allows downloading images from loopback and private network addresses.
   *
   * Off by default: message components can reference arbitrary URLs, so without
   * this guard anyone able to post in the channel could make the process that
   * generates the transcript read from your internal network and embed the
   * response in the output. Only enable this if your images are genuinely
   * hosted on an internal host and you trust everyone who can post.
   */
  withAllowPrivateNetwork(allow = true) {
    this.allowPrivateNetwork = allow;
    return this;
  }

  /** Loads sharp, or returns null when it is not installed. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadSharp(): Promise<any | null> {
    if (this.sharpModule !== null) return this.sharpModule;
    try {
      this.sharpModule = await import('sharp');
      return this.sharpModule;
    } catch {
      this.log('sharp not installed - compression and resize disabled');
      return null;
    }
  }

  /** Builds the image saving callback. */
  build(): ResolveImageCallback {
    const budget = new ByteBudget(this.maxTotalSize * 1024);
    const limit = createLimiter(this.concurrency);

    return async (attachment) => {
      // no width/height means it is not an image
      if (!attachment.width || !attachment.height) return undefined;

      const source = await limit(() => (budget.exhausted ? Promise.resolve(undefined) : this.download(attachment)));
      if (source === undefined) return undefined;

      if (!budget.take(source.length)) {
        this.log(`Skipping ${attachment.id}: the total size limit for embedded images was reached`);
        return undefined;
      }
      return source;
    };
  }

  /** Downloads one image and returns it as a data url, or `undefined` to keep the original URL. */
  private async download(attachment: APIAttachment): Promise<string | undefined> {
    const maxBytes = (this.maxFileSize ?? DEFAULT_MAX_SIZE_KB) * 1024;

    // cheap early exit when Discord reported the size; components can report 0, so this is not the real limit
    if (attachment.size > 0 && attachment.size > maxBytes) {
      this.log(
        `Skipping ${attachment.id}: file too large (${Math.round(attachment.size / 1024)}KB > ${Math.round(maxBytes / 1024)}KB)`
      );
      return undefined;
    }

    this.log(`Fetching attachment ${attachment.id}: ${describeUrl(attachment.url)}`);
    const fetched = await fetchGuarded(attachment.url, {
      maxBytes,
      allowPrivateNetwork: this.allowPrivateNetwork,
      headersTimeout: this.headersTimeout,
      bodyTimeout: this.bodyTimeout,
    });
    if (!fetched) return undefined;

    const { buffer, contentType: mimetype } = fetched;

    // sharp would flatten a GIF to a single frame and rasterise an SVG, so both are embedded as served
    const baseType = (mimetype ?? '').split(';')[0].trim().toLowerCase();
    if (baseType === 'image/gif' || baseType === 'image/svg+xml') {
      return `data:${baseType};base64,${buffer.toString('base64')}`;
    }

    // only load sharp when compression or a resize was asked for
    const wantsProcessing = this.compression !== undefined || this.maxDimensions !== undefined;
    const sharp = wantsProcessing ? await this.loadSharp() : null;

    if (sharp) {
      try {
        // sharp can be the module itself or { default: sharp }
        const sharpFn = sharp.default || sharp;
        let pipeline = sharpFn(buffer);

        if (this.maxDimensions) {
          const { width, height } = this.maxDimensions;
          if ((attachment.width ?? 0) > width || (attachment.height ?? 0) > height) {
            pipeline = pipeline.resize(width, height, {
              fit: 'inside',
              withoutEnlargement: true,
            });
            this.log(`Resizing ${attachment.id} to fit ${width}x${height}`);
          }
        }

        const quality = this.compression?.quality ?? 80;
        const sharpbuf = await pipeline
          // without `force` an image keeps its own format, and each format only reads its own options
          .jpeg({ quality, force: false })
          .webp({
            quality,
            force: this.compression?.convertToWebP ?? false,
            effort: 2,
            ...this.compression?.options,
          })
          .toBuffer({ resolveWithObject: true });

        this.log(
          `Compressed ${attachment.id}: ${buffer.length} -> ${sharpbuf.info.size} bytes (${Math.round((1 - sharpbuf.info.size / buffer.length) * 100)}% reduction)`
        );

        return `data:image/${sharpbuf.info.format};base64,${sharpbuf.data.toString('base64')}`;
      } catch (err) {
        this.log(`Failed to compress ${attachment.id}, using original: ${err}`);
      }
    }

    // sharp missing or failed: embed the original
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  }
}
