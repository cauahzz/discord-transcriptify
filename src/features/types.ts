import type { Channel, Message } from 'discord.js';
import type { RenderMessageContext } from '../generator';

/**
 * Every optional feature, with its options filled in. This is the only shape
 * the generator and the renderers read; the public options are normalized
 * into it once, by `resolveFeatures`.
 */
export type ResolvedFeatures = {
  images: {
    enabled: boolean;
    maxSizeKb: number;
    maxTotalSizeKb: number;
    concurrency: number;
    quality: number;
    maxWidth: number;
    maxHeight: number;
    webp: boolean;
    sharpCache: boolean;
  };
  voiceMessages: { enabled: boolean; maxSizeKb: number; maxTotalSizeKb: number };
  threadMessages: { enabled: boolean; limit: number };
  members: { enabled: boolean };
  uiImagePreview: { enabled: boolean };
  uiSearch: { enabled: boolean };
  uiMemberList: { enabled: boolean };
  uiPinnedMessages: { enabled: boolean };
  uiVoicePlayer: { enabled: boolean };
  uiThreadModal: { enabled: boolean };
  uiServerTags: { enabled: boolean };
  uiSelectMenus: { enabled: boolean };
};

export type CollectContext = {
  channel: Channel;
  features: ResolvedFeatures;
  /** the `filter` the caller gave `createTranscript`, so features that fetch more messages can apply it too */
  filter?: (message: Message) => boolean;
  /** messages of the threads started from the collected messages, by parent message id; one per run */
  threads: Map<string, Message[]>;
};

/**
 * What a feature contributes to a transcript. Each part only runs when the
 * feature is enabled, so a disabled feature costs nothing.
 */
export type FeatureDescriptor = {
  key: keyof ResolvedFeatures;

  /** features that must also be enabled for this one to make sense */
  requires?: (keyof ResolvedFeatures)[];

  /** gathers extra data before rendering starts */
  collect?: (messages: Message[], context: CollectContext) => Promise<void>;

  /** callbacks the feature provides; the caller's own callbacks still win */
  callbacks?: (features: ResolvedFeatures, context: CollectContext) => Partial<RenderMessageContext['callbacks']>;

  /** script added to the page */
  clientScript?: (features: ResolvedFeatures) => string | null;
};
