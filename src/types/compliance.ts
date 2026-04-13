export interface ComplianceReport {
  totalActive: number;
  withOwner: number;
  withClassification: number;
  reviewUpToDate: number;
  ownerCoverageRate: number;          // 0-100
  classificationCoverageRate: number;
  reviewCoverageRate: number;
  globalComplianceRate: number;       // moyenne des 3 taux
  overdueAssets: number;
  unownedAssets: number;
  unclassifiedAssets: number;
}
