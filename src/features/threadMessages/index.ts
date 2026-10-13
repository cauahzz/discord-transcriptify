import type { FeatureDescriptor } from '../types';
import { collectThreadMessages } from './collect';

export const threadMessagesFeature: FeatureDescriptor = {
  key: 'threadMessages',
  collect: collectThreadMessages,
};
