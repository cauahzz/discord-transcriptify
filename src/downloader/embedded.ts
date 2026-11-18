import { randomBytes } from 'node:crypto';
import type { Awaitable } from 'discord.js';
import debug from 'debug';

const log = debug('discord-transcriptify:embedded');

/** Hex digits of the file index that follows the nonce in a token. */
const INDEX_WIDTH = 8;

/**
 * Bytes encoded per step when a file is written into the page. A multiple of
 * 3, so the steps join without base64 padding in between, and small enough
 * that the string each step makes stays a few megabytes.
 */
const ENCODE_STEP = 3 * 1024 * 1024;

/** Length of the base64 text for `bytes` bytes, padding included. */
function base64Length(bytes: number) {
  return Math.ceil(bytes / 3) * 4;
}

/**
 * The files a transcript embeds, kept as bytes until the page is rendered.
 *
 * React holds the whole page until it is read, so a data url passed through
 * it sits in memory as base64 for the entire render, and hydrate parses all
 * of it again. Instead, the page gets a data url whose payload is a token, and
 * `splice` writes the real base64 straight into the final buffer.
 *
 * The token keeps the `data:` scheme because React adds a preload link to the
 * head for every image whose source is not a data url.
 */
export class EmbeddedFiles {
  // random per transcript, so message text written before the export cannot contain it
  private readonly nonce = randomBytes(16).toString('hex');
  private readonly files: (Buffer | null)[] = [];
  private spliced = false;

  get empty() {
    return this.files.length === 0;
  }

  /**
   * Keeps the file of a base64 data url and returns the token that stands in
   * for it. Any other source is returned as it is, including a data url whose
   * base64 would not come back byte for byte from `splice`.
   */
  adopt(source: string) {
    if (!source.startsWith('data:')) return source;
    const marker = source.indexOf(';base64,');
    if (marker === -1) return source;

    const payload = source.slice(marker + ';base64,'.length);
    if (payload.length === 0) return source;
    // Node also decodes whitespace, url-safe characters and missing padding, which would come
    // back written differently; only a payload that encodes back to itself is kept
    const data = Buffer.from(payload, 'base64');
    if (data.toString('base64') !== payload) return source;

    const token = this.nonce + this.files.length.toString(16).padStart(INDEX_WIDTH, '0');
    this.files.push(data);
    return `${source.slice(0, marker)};base64,${token}`;
  }

  /**
   * Returns `page` with every token replaced by the base64 of its file. Each
   * file is released after its last use, and the store is spent afterwards.
   */
  splice(page: Buffer): Buffer {
    // the files are released on the way, so a second page would keep its tokens as broken sources
    if (this.spliced) throw new Error('[discord-transcriptify] embedded files can only be spliced into one page');
    this.spliced = true;
    if (this.empty) return page;

    const nonce = Buffer.from(this.nonce, 'latin1');
    const tokenLength = nonce.length + INDEX_WIDTH;

    // a file can appear more than once (hydrate copies attributes into the component), so the
    // uses are counted first; that also gives the exact size of the output, allocated once
    const found: { at: number; file: number }[] = [];
    const uses = new Array<number>(this.files.length).fill(0);
    for (let at = page.indexOf(nonce); at !== -1; at = page.indexOf(nonce, at + tokenLength)) {
      const file = parseInt(page.toString('latin1', at + nonce.length, at + tokenLength), 16);
      if (!this.files[file]) continue;
      found.push({ at, file });
      uses[file]++;
    }
    // files the page never showed are dropped, and a page that shows none needs no copy
    if (found.length === 0) {
      this.files.fill(null);
      return page;
    }

    let size = page.length;
    for (const { file } of found) size += base64Length(this.files[file]!.length) - tokenLength;

    const output = Buffer.allocUnsafe(size);
    let read = 0;
    let written = 0;
    for (const { at, file } of found) {
      written += page.copy(output, written, read, at);
      const data = this.files[file]!;
      for (let start = 0; start < data.length; start += ENCODE_STEP) {
        written += output.write(data.subarray(start, start + ENCODE_STEP).toString('base64'), written, 'latin1');
      }
      read = at + tokenLength;
      if (--uses[file] === 0) this.files[file] = null;
    }
    page.copy(output, written, read);

    log(`Spliced ${this.files.length} file(s) into ${found.length} place(s): ${page.length} -> ${size} bytes`);
    this.files.fill(null);
    return output;
  }
}

/**
 * Wraps an image or voice callback so every base64 data url it returns is
 * kept in `files`, and the page gets a token in its place. Built-in or not,
 * the callback is unchanged and the file comes out the same.
 */
export function adoptingSources<A extends unknown[], R extends string | null | undefined>(
  callback: (...args: A) => Awaitable<R>,
  files: EmbeddedFiles
) {
  return async (...args: A) => {
    const source = await callback(...args);
    return (typeof source === 'string' ? files.adopt(source) : source) as R;
  };
}
