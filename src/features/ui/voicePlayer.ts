import { enableVoicePlayback } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiVoicePlayerFeature: FeatureDescriptor = {
  key: 'uiVoicePlayer',
  clientScript: () => enableVoicePlayback,
};
