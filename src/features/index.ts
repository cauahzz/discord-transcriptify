import { imagesFeature } from './images';
import { voiceMessagesFeature } from './voiceMessages';
import { threadMessagesFeature } from './threadMessages';
import { membersFeature } from './members';
import { uiImagePreviewFeature } from './ui/imagePreview';
import { uiSearchFeature } from './ui/search';
import { uiMemberListFeature } from './ui/memberList';
import { uiPinnedMessagesFeature } from './ui/pinnedMessages';
import { uiVoicePlayerFeature } from './ui/voicePlayer';
import { uiThreadModalFeature } from './ui/threadModal';
import { uiServerTagsFeature } from './ui/serverTags';
import { uiSelectMenusFeature } from './ui/selectMenus';
import type { FeatureDescriptor, ResolvedFeatures } from './types';

export { resolveFeatures, type FeatureOptions } from './resolve';
export type { CollectContext, FeatureDescriptor, ResolvedFeatures } from './types';

/** Adding a feature means writing its descriptor and listing it here. */
export const FEATURES: FeatureDescriptor[] = [
  imagesFeature,
  voiceMessagesFeature,
  threadMessagesFeature,
  // after the threads, so their authors are fetched too
  membersFeature,
  uiImagePreviewFeature,
  uiSearchFeature,
  uiMemberListFeature,
  uiPinnedMessagesFeature,
  uiVoicePlayerFeature,
  uiThreadModalFeature,
  uiServerTagsFeature,
  uiSelectMenusFeature,
];

/**
 * The features that should run for these options.
 */
export function activeFeatures(
  features: ResolvedFeatures,
  registry: FeatureDescriptor[] = FEATURES
): FeatureDescriptor[] {
  return registry.filter((feature) => {
    if (!features[feature.key].enabled) return false;

    const missing = feature.requires?.filter((dependency) => !features[dependency].enabled) ?? [];
    if (missing.length > 0) {
      // the caller asked for this feature, so dropping it silently would look like a bug
      console.warn(
        `[discord-transcriptify] "${feature.key}" needs ${missing.join(', ')} to be enabled as well, so it was skipped.`
      );
      return false;
    }

    return true;
  });
}
