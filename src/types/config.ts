export interface Config {
  db: string;           // chemin absolu vers le fichier SQLite
  user: string;         // valeur pour changed_by dans audit_log
  defaultReviewPeriodDays: number;  // défaut 365
}
