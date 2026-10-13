import { enableThreadModal } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiThreadModalFeature: FeatureDescriptor = {
  key: 'uiThreadModal',
  clientScript: () => enableThreadModal,
};
