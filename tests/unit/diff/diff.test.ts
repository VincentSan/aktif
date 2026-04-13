import { describe, it, expect } from 'bun:test';
import { computeDiff } from '../../../src/utils/diff.js';
import type { Asset } from '../../../src/types/asset.js';

const baseAsset: Asset = {
  id: 'abc-123',
  name: 'Serveur X',
  type: 'matériel',
  description: null,
  location: null,
  owner: null,
  owner_id: null,
  classification: null,
  status: 'actif',
  entry_date: '2026-01-01',
  review_date: null,
  next_review_date: null,
  disposal_method: null,
  tags: [],
};

describe('computeDiff', () => {
  it('retourne {} si aucun champ modifié', () => {
    expect(computeDiff(baseAsset, { ...baseAsset })).toEqual({});
  });

  it('détecte un seul champ modifié', () => {
    const after = { ...baseAsset, owner: 'Sophie' };
    const diff = computeDiff(baseAsset, after);
    expect(diff).toEqual({ owner: { before: null, after: 'Sophie' } });
  });

  it('détecte plusieurs champs modifiés', () => {
    const after = { ...baseAsset, owner: 'Sophie', status: 'en_maintenance' as const };
    const diff = computeDiff(baseAsset, after);
    expect(Object.keys(diff)).toHaveLength(2);
    expect(diff.owner).toEqual({ before: null, after: 'Sophie' });
    expect(diff.status).toEqual({ before: 'actif', after: 'en_maintenance' });
  });

  it('détecte les changements dans les colonnes JSON (tags)', () => {
    const after = { ...baseAsset, tags: ['iso27001'] };
    const diff = computeDiff(baseAsset, after);
    expect(diff.tags).toEqual({ before: [], after: ['iso27001'] });
  });
});
