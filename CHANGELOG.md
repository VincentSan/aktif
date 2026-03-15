# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [0.1.0] - 2026-03-15

### Added

#### Sprint 1 — CRUD et base de données

- `asset add` — ajout d'un actif avec tous ses champs : nom, type, description, localisation, propriétaire, classification, restrictions d'accès, statut, dates d'entrée/révision, méthode de mise au rebut, tags JSON, composants JSON, risques liés JSON
- `asset list` — liste des actifs avec filtres : `--type`, `--classification`, `--owner`, `--status`
- `asset show <id>` — détail complet d'un actif (tous les champs)
- `asset edit <id>` — modification d'un ou plusieurs champs ; diff avant/après enregistré dans l'audit trail
- `asset retire <id>` — passage au statut `en_cours_de_mise_au_rebut`
- `asset delete <id>` — suppression définitive avec confirmation interactive (`--yes` pour les scripts)
- Schéma SQLite avec migrations versionnées : tables `assets`, `audit_log`, `owners`
- Mode WAL activé par défaut sur la connexion SQLite
- Permissions 600 sur le fichier SQLite à la création
- Flag global `--db <chemin>` pour pointer vers une base SQLite spécifique
- Support des variables d'environnement `AKTIF_DB` et `AKTIF_USER`
- Fichier de configuration `~/.aktifrc` et `aktif.config.json` avec priorité de résolution documentée
- Audit trail immutable : chaque action (`create`, `update`, `retire`, `delete`) écrit dans `audit_log` avec diff JSON avant/après, horodatage et `changed_by`

#### Sprint 2 — Conformité, historique et export/import

- `asset history <id>` — historique chronologique des modifications d'un actif depuis l'audit trail
- `asset changelog` — journal global des modifications avec options `--limit <n>` et `--since <date>`
- `asset review` — liste des actifs dont la `next_review_date` est dépassée ; exit code 1 si des actifs sont en retard
- `asset owners` — liste des actifs sans propriétaire attribué
- `asset unclassified` — liste des actifs sans classification
- `asset report` — rapport de conformité ISO 27001 A.5.9 : taux de couverture propriétaire, classification, révision, score global avec barres de progression colorées ; option `--fail-below <n>` pour intégration CI
- `asset export --format csv` — export CSV complet de l'inventaire avec tous les champs
- `asset export --format json` — export JSON (tableau d'objets)
- Options de filtrage sur `asset export` : `--type`, `--status`, `--owner`, `--classification`
- Option `--output <chemin>` sur `asset export` pour écrire dans un fichier (stdout par défaut)
- `asset import --file <chemin>` — import depuis un fichier CSV encodé UTF-8 ; colonnes obligatoires : `name`, `type`
- Option `--strict` sur `asset import` pour arrêter à la première erreur
- Option `--overwrite` sur `asset import` pour écraser les actifs existants par ID
- Validation des valeurs d'énumération à l'import (`type`, `classification`, `status`) avec messages d'erreur précis par numéro de ligne
- `owner add` — ajout d'un propriétaire avec `--name`, `--email`, `--department`
- Binaires standalone compilés via `bun build --compile` sans dépendance Node.js sur la machine cible : macOS arm64, macOS x64, Linux x64
