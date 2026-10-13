import { enableImagePreview } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiImagePreviewFeature: FeatureDescriptor = {
  key: 'uiImagePreview',
  clientScript: () => enableImagePreview,
};
