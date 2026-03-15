export type AssetType = 'informationnel' | 'logiciel' | 'matériel' | 'service' | 'personnel';

export type Classification = 'public' | 'interne' | 'confidentiel' | 'secret';

export type AssetStatus = 'actif' | 'en_maintenance' | 'en_cours_de_mise_au_rebut' | 'retiré';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  description: string | null;
  location: string | null;
  owner: string | null;
  owner_id: string | null;
  classification: Classification | null;
  access_restrictions: string | null;
  status: AssetStatus;
  entry_date: string;        // DATE as ISO string
  review_date: string | null;
  next_review_date: string | null;
  disposal_method: string | null;
  tags: string[];            // JSON array, désérialisé
  components: Array<{ name: string; version?: string }>;  // JSON array
  related_risks: string[];   // JSON array
  created_at: string;        // DATETIME as ISO string
  updated_at: string;
}

export const ASSET_TYPES: AssetType[] = ['informationnel', 'logiciel', 'matériel', 'service', 'personnel'];
export const CLASSIFICATIONS: Classification[] = ['public', 'interne', 'confidentiel', 'secret'];
export const ASSET_STATUSES: AssetStatus[] = ['actif', 'en_maintenance', 'en_cours_de_mise_au_rebut', 'retiré'];
