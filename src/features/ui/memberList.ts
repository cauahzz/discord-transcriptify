import { enableMemberStats } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiMemberListFeature: FeatureDescriptor = {
  key: 'uiMemberList',
  clientScript: () => enableMemberStats,
};
