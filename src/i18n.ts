/**
 * i18n — Internationalisation légère sans dépendance externe.
 *
 * Langue contrôlée par la variable d'environnement AKTIF_LANG (défaut : fr).
 * Valeurs acceptées : fr | en
 *
 * Usage :
 *   import { t } from '../i18n.js';
 *   t('col_name')   // → 'Nom' ou 'Name' selon AKTIF_LANG
 */

import { fr } from './locales/fr.js';
import { en } from './locales/en.js';
import type { Messages } from './locales/fr.js';

type Lang = 'fr' | 'en';

function detectLang(): Lang {
  const raw = process.env['AKTIF_LANG'];
  if (raw === 'en') return 'en';
  return 'fr'; // défaut
}

const LOCALES: Record<Lang, Messages> = { fr, en };

const lang = detectLang();
const messages: Messages = LOCALES[lang];

export function t(key: keyof Messages): string {
  return messages[key] as string;
}

export type { Messages };
