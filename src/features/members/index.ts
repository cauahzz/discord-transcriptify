import type { FeatureDescriptor } from '../types';
import { collectMembers } from './collect';

export const membersFeature: FeatureDescriptor = {
  key: 'members',
  collect: collectMembers,
};
