import type { AttachmentBuilder, Message } from 'discord.js';
import type { RenderMessageContext } from './generator';

export type AttachmentTypes = 'audio' | 'video' | 'image' | 'file';

export enum ExportReturnType {
  Buffer = 'buffer',
  String = 'string',
  Attachment = 'attachment',
}

export type ObjectType<T extends ExportReturnType> = T extends ExportReturnType.Buffer
  ? Buffer
  : T extends ExportReturnType.String
    ? string
    : AttachmentBuilder;

/**
 * Limits for the images that `saveImages` downloads. Resizing and
 * compression need `sharp` to be installed.
 */
export type SaveImagesOptions = Partial<{
  /** Largest image to download, in kilobytes. Bigger ones are left as links. @default 10240 */
  maxSizeKb: number;
  /**
   * Largest size of all embedded images together, in kilobytes, counted on what
   * ends up in the file. Once it is reached the remaining images are left as
   * links. This bounds the memory a transcript with many images needs. Zero or
   * less means no limit.
   * @default 51200
   */
  maxTotalSizeKb: number;
  /** How many images are downloaded and processed at the same time. Zero or less means no limit. @default 4 */
  concurrency: number;
  /** Compression quality of JPEG and WebP images, 1-100. PNG images stay lossless. @default 75 */
  quality: number;
  /** Widest an image may be before it is resized, in pixels. @default 800 */
  maxWidth: number;
  /** Tallest an image may be before it is resized, in pixels. @default 800 */
  maxHeight: number;
}>;

/** The interactive features that `ui` can switch on and off one by one. */
export type UiOptions = Partial<{
  imagePreview: boolean;
  search: boolean;
  memberList: boolean;
  pinnedMessages: boolean;
  voicePlayer: boolean;
  threadModal: boolean;
  serverTags: boolean;
  selectMenus: boolean;
}>;

/** Limits for the voice messages that `saveVoiceMessages` downloads. */
export type SaveVoiceMessagesOptions = Partial<{
  /** Largest voice message to download, in kilobytes. Bigger ones stay as links. @default 25600 */
  maxSizeKb: number;
  /**
   * Largest size of all embedded voice messages together, in kilobytes. Once it
   * is reached the remaining ones stay as links. Zero or less means no limit.
   * @default 51200
   */
  maxTotalSizeKb: number;
}>;

/** Limits for the thread messages that `saveThreadMessages` fetches. */
export type SaveThreadMessagesOptions = Partial<{
  /**
   * Most messages to export per thread; the newest ones are kept. Below 1 means
   * no limit, as `-1` does for the main channel. The `filter` given to
   * `createTranscript` applies to thread messages too, and the limit counts
   * the messages that pass it.
   * @default 500
   */
  limit: number;
}>;

export type GenerateFromMessagesOptions<T extends ExportReturnType> = Partial<{
  /**
   * The type of object to return.
   * @default ExportReturnType.Attachment
   */
  returnType: T;

  /**
   * Downloads images and encodes them as base64 data urls.
   * Pass an object instead of `true` to change the limits.
   * @default false
   */
  saveImages: boolean | SaveImagesOptions;

  /**
   * Downloads voice messages and embeds them as base64 data urls, so the
   * transcript plays them without Discord's CDN.
   * Pass an object instead of `true` to change the limit.
   * @default false
   */
  saveVoiceMessages: boolean | SaveVoiceMessagesOptions;

  /**
   * Fetches the messages of every thread started from an exported message and
   * shows them under the thread preview. Costs extra Discord API requests,
   * one per 100 messages of each thread.
   * Pass an object instead of `true` to change the per-thread limit.
   * The `filter` of `createTranscript` applies to thread messages as well.
   * @default false
   */
  saveThreadMessages: boolean | SaveThreadMessagesOptions;

  /**
   * Asks Discord for the members behind the authors of the exported messages
   * that are not cached, so names show in their role colour. Messages fetched
   * from a channel carry no member of their own. This is one gateway request
   * per 100 authors, and a failure only leaves the names uncoloured.
   * @default true
   */
  fetchMembers: boolean;

  /**
   * Interactive UI embedded in the file. `false` adds none of it.
   * Pass an object to switch single features, e.g. `{ imagePreview: false }`.
   * @default true
   */
  ui: boolean | UiOptions;

  /**
   * Callbacks for resolving channels, users, roles, and image and voice sources.
   * They take precedence over the ones the enabled features provide.
   */
  callbacks: Partial<RenderMessageContext['callbacks']>;

  /**
   * The name of the file to return if returnType is ExportReturnType.Attachment.
   * @default 'transcript-{channel name}.html'
   */
  filename: string;

  /**
   * Whether to include the "Powered by discord-transcriptify" footer.
   * @default true
   */
  poweredBy: boolean;

  /**
   * The message right before "Powered by" text. Remember to put the {s}
   * @default 'Exported {number} message{s}.'
   */
  footerText: string;

  /**
   * The favicon of the page: `'guild'` uses the guild icon, or pass a url to use a custom icon.
   * @default "guild"
   */
  favicon: 'guild' | string;

  /**
   * Whether to hydrate the html server-side. When `false`, the returned html is hydrated client-side.
   * @default false
   */
  hydrate: boolean;
}>;

export type CreateTranscriptOptions<T extends ExportReturnType> = Partial<
  GenerateFromMessagesOptions<T> & {
    /**
     * The max amount of messages to fetch. Omit it or use `-1` to fetch every message of the channel.
     */
    limit: number;

    /**
     * Keeps only the messages of the channel for which it returns `true`.
     * @default (() => true)
     */
    filter: (message: Message<boolean>) => boolean;
  }
>;
