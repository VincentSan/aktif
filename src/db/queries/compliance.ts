import { eq, or, isNull, lt, and, sql } from 'drizzle-orm';
import { assets } from '../schema.js';
import type { Db } from '../connection.js';
import type { Asset } from '../../types/asset.js';
import type { ComplianceReport } from '../../types/compliance.js';
import { rowToAsset } from './utils.js';

export function getOverdueAssets(db: Db): Asset[] {
  return db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.status, 'actif'),
        lt(assets.next_review_date, sql`DATE('now')`)
      )
    )
    .all()
    .map(rowToAsset);
}

export function getAssetsWithoutOwner(db: Db): Asset[] {
  return db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.status, 'actif'),
        or(isNull(assets.owner), eq(assets.owner, ''))
      )
    )
    .all()
    .map(rowToAsset);
}

export function getUnclassifiedAssets(db: Db): Asset[] {
  return db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.status, 'actif'),
        isNull(assets.classification)
      )
    )
    .all()
    .map(rowToAsset);
}

export function getComplianceReport(db: Db): ComplianceReport {
  const activeAssets = db
    .select()
    .from(assets)
    .where(eq(assets.status, 'actif'))
    .all();

  const totalActive = activeAssets.length;

  if (totalActive === 0) {
    return {
      totalActive: 0, withOwner: 0, withClassification: 0, reviewUpToDate: 0,
      ownerCoverageRate: 100, classificationCoverageRate: 100, reviewCoverageRate: 100,
      globalComplianceRate: 100, overdueAssets: 0, unownedAssets: 0, unclassifiedAssets: 0,
    };
  }

  const today = new Date().toISOString().split('T')[0];

  const withOwner = activeAssets.filter((a) => a.owner && a.owner.trim() !== '').length;
  const withClassification = activeAssets.filter((a) => a.classification != null).length;
  const reviewUpToDate = activeAssets.filter(
    (a) => a.next_review_date != null && a.next_review_date >= today
  ).length;

  const ownerCoverageRate = Math.round((withOwner / totalActive) * 100);
  const classificationCoverageRate = Math.round((withClassification / totalActive) * 100);
  const reviewCoverageRate = Math.round((reviewUpToDate / totalActive) * 100);
  const globalComplianceRate = Math.round(
    (ownerCoverageRate + classificationCoverageRate + reviewCoverageRate) / 3
  );

  return {
    totalActive,
    withOwner,
    withClassification,
    reviewUpToDate,
    ownerCoverageRate,
    classificationCoverageRate,
    reviewCoverageRate,
    globalComplianceRate,
    overdueAssets: totalActive - reviewUpToDate,
    unownedAssets: totalActive - withOwner,
    unclassifiedAssets: totalActive - withClassification,
  };
}
