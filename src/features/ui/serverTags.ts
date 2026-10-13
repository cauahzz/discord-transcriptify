import { applyServerTags } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiServerTagsFeature: FeatureDescriptor = {
  key: 'uiServerTags',
  clientScript: () => applyServerTags,
};
