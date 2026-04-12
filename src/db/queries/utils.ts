import { assets } from '../schema.js';
import type { Asset } from '../../types/asset.js';

export function serializeJson(val: unknown): string {
  return JSON.stringify(val ?? []);
}

export function parseJson<T>(val: string | null | undefined): T {
  if (!val) return [] as unknown as T;
  try {
    return JSON.parse(val) as T;
  } catch {
    return [] as unknown as T;
  }
}

export function rowToAsset(row: typeof assets.$inferSelect): Asset {
  return {
    ...row,
    tags: parseJson<string[]>(row.tags),
  };
}
