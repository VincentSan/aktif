import { stringify } from 'csv-stringify/sync';
import type { Asset } from '../types/asset.js';

const HEADERS: (keyof Asset)[] = [
  'id',
  'name',
  'type',
  'description',
  'location',
  'owner',
  'owner_id',
  'classification',
  'access_restrictions',
  'status',
  'entry_date',
  'review_date',
  'next_review_date',
  'disposal_method',
  'tags',
  'components',
  'related_risks',
  'created_at',
  'updated_at',
];

export function exportToCsv(assets: Asset[]): string {
  const rows = assets.map((asset) =>
    HEADERS.map((key) => {
      const value = asset[key];
      if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
        return JSON.stringify(value);
      }
      return value ?? null;
    })
  );

  return stringify([HEADERS, ...rows]);
}
