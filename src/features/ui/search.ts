import { enableMessageSearch } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiSearchFeature: FeatureDescriptor = {
  key: 'uiSearch',
  clientScript: () => enableMessageSearch,
};
