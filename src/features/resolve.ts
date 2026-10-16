import type { SaveImagesOptions, SaveThreadMessagesOptions, SaveVoiceMessagesOptions, UiOptions } from '../types';
import type { ResolvedFeatures } from './types';

/** The public options that switch features on and off. */
export type FeatureOptions = Partial<{
  saveImages: boolean | SaveImagesOptions;
  saveVoiceMessages: boolean | SaveVoiceMessagesOptions;
  saveThreadMessages: boolean | SaveThreadMessagesOptions;
  fetchMembers: boolean;
  ui: boolean | UiOptions;
}>;

/**
 * Turns a public toggle into a resolved feature: `true` means the defaults,
 * an object overrides them field by field, anything else leaves it disabled.
 */
export function normalize<T extends object>(
  value: boolean | Partial<T> | null | undefined,
  defaults: T
): T & { enabled: boolean } {
  // typeof null is 'object', and null is what JavaScript callers use for "not set"
  if (typeof value === 'object' && value !== null) return { ...defaults, ...value, enabled: true };
  return { ...defaults, enabled: value === true };
}

/**
 * Unlike `normalize`, interactive UI is on unless turned off: omitted and
 * `true` enable every key, `false` disables every key, and an object only
 * overrides the keys it names.
 */
export function ui(value: boolean | UiOptions | null | undefined, key: keyof UiOptions): { enabled: boolean } {
  if (typeof value === 'object' && value !== null) return { enabled: value[key] ?? true };
  return { enabled: value !== false };
}

export function resolveFeatures(options: FeatureOptions = {}): ResolvedFeatures {
  return {
    images: normalize(options.saveImages, {
      maxSizeKb: 10240,
      maxTotalSizeKb: 51200,
      concurrency: 4,
      quality: 75,
      maxWidth: 800,
      maxHeight: 800,
      webp: false,
      sharpCache: true,
    }),
    voiceMessages: normalize(options.saveVoiceMessages, { maxSizeKb: 25600, maxTotalSizeKb: 51200 }),
    threadMessages: normalize(options.saveThreadMessages, { limit: 500 }),
    // on unless turned off: it costs one gateway request per 100 authors and fixes the name colours
    members: { enabled: options.fetchMembers !== false },
    uiImagePreview: ui(options.ui, 'imagePreview'),
    uiSearch: ui(options.ui, 'search'),
    uiMemberList: ui(options.ui, 'memberList'),
    uiPinnedMessages: ui(options.ui, 'pinnedMessages'),
    uiVoicePlayer: ui(options.ui, 'voicePlayer'),
    uiThreadModal: ui(options.ui, 'threadModal'),
    uiServerTags: ui(options.ui, 'serverTags'),
    uiSelectMenus: ui(options.ui, 'selectMenus'),
  };
}
