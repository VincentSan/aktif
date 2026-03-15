import type { Asset } from '../types/asset.js';
import { VERSION } from '../version.js';

export function exportToJson(assets: Asset[]): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      version: VERSION,
      count: assets.length,
      assets,
    },
    null,
    2
  );
}
