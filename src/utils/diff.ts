import type { Asset } from '../types/asset.js';

type DiffResult = Record<string, { before: unknown; after: unknown }>;

export function computeDiff(before: Asset, after: Asset): DiffResult {
  const diff: DiffResult = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof Asset>;

  for (const key of keys) {
    const beforeVal = before[key];
    const afterVal = after[key];

    if (beforeVal === afterVal) continue;

    // Comparaison profonde pour les tableaux JSON (ex: tags)
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diff[key] = { before: beforeVal, after: afterVal };
    }
  }

  return diff;
}
