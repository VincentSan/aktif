import type { AssetType, Classification, AssetStatus } from './asset.js';

export interface AssetFilters {
  type?: AssetType;
  classification?: Classification;
  owner?: string;
  status?: AssetStatus;
}
