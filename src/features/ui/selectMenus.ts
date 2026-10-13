import { closeSelectMenus } from '../../static/client';
import type { FeatureDescriptor } from '../types';

export const uiSelectMenusFeature: FeatureDescriptor = {
  key: 'uiSelectMenus',
  clientScript: () => closeSelectMenus,
};
