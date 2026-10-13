import { enablePinnedMessages } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiPinnedMessagesFeature: FeatureDescriptor = {
  key: 'uiPinnedMessages',
  clientScript: () => enablePinnedMessages,
};
