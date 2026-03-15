# aktif — Inventaire d'actifs ISO 27001 A.5.9

**aktif** est un outil CLI léger pour gérer un inventaire d'actifs conformément à la norme ISO 27001 A.5.9. Il remplace les tableurs statiques par une solution versionnée, automatable et auditable, sans imposer la complexité d'une CMDB.

- Audit trail immutable (SQLite append-only)
- Export CSV, JSON pour vos auditeurs
- Rapport de conformité A.5.9 en une commande
- Binaire standalone — aucune dépendance à installer

---

## Installation

### Téléchargement du binaire (recommandé)

Téléchargez le binaire correspondant à votre système depuis [GitHub Releases](https://github.com/votrecompte/aktif/releases) :

```bash
# macOS Apple Silicon
curl -L https://github.com/votrecompte/aktif/releases/latest/download/aktif-macos-arm64 -o aktif
chmod +x aktif
sudo mv aktif /usr/local/bin/

# macOS Intel
curl -L https://github.com/votrecompte/aktif/releases/latest/download/aktif-macos-x64 -o aktif
chmod +x aktif
sudo mv aktif /usr/local/bin/

# Linux x86_64
curl -L https://github.com/votrecompte/aktif/releases/latest/download/aktif-linux-x64 -o aktif
chmod +x aktif
sudo mv aktif /usr/local/bin/
```

### Mode développement

```bash
git clone https://github.com/votrecompte/aktif
cd aktif
bun install
bun run src/cli.ts asset list
```

---

## Démarrage rapide

Cinq commandes pour démarrer :

```bash
# 1. Ajouter un actif
aktif asset add --name "Serveur de production" --type matériel --owner "Sophie Martin" --classification Confidentiel

# 2. Lister les actifs
aktif asset list

# 3. Voir le détail d'un actif
aktif asset show <id>

# 4. Modifier un actif
aktif asset edit <id> --classification Secret --owner "Mehdi Benali"

# 5. Supprimer un actif
aktif asset delete <id>
```

La base de données SQLite est créée automatiquement dans `~/.aktif/aktif.db` au premier lancement.

---

## Référence complète des commandes

### Flag global

```
aktif --db <chemin>    Pointer vers une base SQLite spécifique
```

### asset add

Ajoute un nouvel actif à l'inventaire.

```
aktif asset add --name <nom> --type <type> [options]
```

| Flag | Obligatoire | Description |
|------|-------------|-------------|
| `--name <n>` | oui | Nom de l'actif |
| `--type <t>` | oui | `informationnel` \| `logiciel` \| `matériel` \| `service` \| `personnel` |
| `--description <d>` | non | Description fonctionnelle |
| `--location <l>` | non | Emplacement physique ou logique |
| `--owner <o>` | non | Propriétaire |
| `--classification <c>` | non | `Public` \| `Interne` \| `Confidentiel` \| `Secret` |
| `--access-restrictions <a>` | non | Description des contrôles d'accès |
| `--status <s>` | non | `actif` (défaut) \| `en_maintenance` \| `en_cours_de_mise_au_rebut` \| `retiré` |
| `--entry-date <d>` | non | Date d'entrée YYYY-MM-DD (défaut : aujourd'hui) |
| `--review-date <d>` | non | Date de dernière révision YYYY-MM-DD |
| `--next-review-date <d>` | non | Prochaine révision YYYY-MM-DD (défaut : +365 jours) |
| `--disposal-method <m>` | non | Méthode de mise au rebut |
| `--tags <json>` | non | Tags JSON, ex : `'["tag1","tag2"]'` |
| `--components <json>` | non | Composants JSON, ex : `'[{"name":"nginx","version":"1.25"}]'` |
| `--related-risks <json>` | non | Références aux risques, ex : `'["R-01","R-05"]'` |

Retourne l'UUID de l'actif créé.

```bash
aktif asset add \
  --name "Serveur GitLab" \
  --type logiciel \
  --owner "Mehdi Benali" \
  --classification Confidentiel \
  --tags '["infrastructure","ci-cd"]'
```

### asset list

Liste les actifs avec filtres optionnels.

```
aktif asset list [--type <t>] [--classification <c>] [--owner <o>] [--status <s>]
```

```bash
aktif asset list --status actif --classification Confidentiel
aktif asset list --owner "Sophie Martin"
aktif asset list --type logiciel
```

### asset show

Affiche le détail complet d'un actif.

```
aktif asset show <id>
```

```bash
aktif asset show a1b2c3d4-...
```

### asset edit

Modifie un ou plusieurs champs d'un actif existant. Accepte les mêmes flags que `add` (sauf `--name` et `--type` qui restent optionnels).

```
aktif asset edit <id> [--name <n>] [--classification <c>] [--owner <o>] ...
```

```bash
aktif asset edit a1b2c3d4 --classification Secret --review-date 2026-03-15
```

### asset retire

Passe l'actif au statut `en_cours_de_mise_au_rebut`.

```
aktif asset retire <id>
```

### asset delete

Supprime définitivement un actif. Demande confirmation interactive, ou utilisez `--yes` pour les scripts.

```
aktif asset delete <id> [--yes]
```

```bash
aktif asset delete a1b2c3d4 --yes
```

### asset history

Affiche l'historique chronologique des modifications d'un actif.

```
aktif asset history <id>
```

### asset changelog

Affiche le journal global de toutes les modifications.

```
aktif asset changelog [--limit <n>] [--since <date>]
```

```bash
aktif asset changelog --limit 20
aktif asset changelog --since 2026-01-01
```

### asset review

Liste les actifs dont la date de révision est dépassée. Quitte avec code 1 si des actifs sont en retard (utilisable en CI).

```
aktif asset review
```

### asset owners

Liste les actifs sans propriétaire attribué.

```
aktif asset owners
```

### asset unclassified

Liste les actifs sans classification.

```
aktif asset unclassified
```

### asset report

Affiche le rapport de conformité ISO 27001 A.5.9 : taux de couverture propriétaire, classification, révision, et score global.

```
aktif asset report [--fail-below <n>]
```

```bash
aktif asset report
aktif asset report --fail-below 80   # exit 1 si score < 80%
```

### asset export

Exporte les actifs au format CSV ou JSON.

```
aktif asset export --format csv|json [--output <chemin>] [--type <t>] [--status <s>] [--owner <o>] [--classification <c>]
```

```bash
aktif asset export --format csv --output inventaire.csv
aktif asset export --format json > inventaire.json
aktif asset export --format csv --status actif --output actifs-actifs.csv
```

### asset import

Importe des actifs depuis un fichier CSV (migration depuis Excel).

```
aktif asset import --file <chemin> [--strict] [--overwrite]
```

| Flag | Description |
|------|-------------|
| `--file <chemin>` | Chemin vers le fichier CSV |
| `--strict` | Arrêter à la première erreur (défaut : continuer) |
| `--overwrite` | Écraser l'actif si l'ID existe déjà (défaut : ignorer) |

```bash
aktif asset import --file inventaire-excel.csv
aktif asset import --file inventaire-excel.csv --strict --overwrite
```

### owner add

Ajoute un propriétaire dans la table `owners`.

```
aktif owner add --name <nom> [--email <e>] [--department <d>]
```

```bash
aktif owner add --name "Sophie Martin" --email "sophie@exemple.fr" --department "SSI"
```

---

## Guide de migration depuis Excel

### Format CSV attendu

Le fichier CSV doit être encodé en **UTF-8** avec une ligne d'en-tête. Les colonnes `name` et `type` sont obligatoires.

```csv
name,type,description,owner,classification,status,entry_date,next_review_date,location,tags
Serveur de production,matériel,Serveur principal,Sophie Martin,Confidentiel,actif,2024-01-15,2025-01-15,Datacenter Paris,["production"]
Licence Office 365,logiciel,Suite bureautique,Mehdi Benali,Interne,actif,2023-06-01,2024-06-01,Cloud,,
Base de données clients,informationnel,Données CRM,Sophie Martin,Secret,actif,2024-03-01,2025-03-01,Serveur BDD,,["crm","rgpd"]
```

### Valeurs acceptées

| Colonne | Valeurs |
|---------|---------|
| `type` | `informationnel`, `logiciel`, `matériel`, `service`, `personnel` |
| `classification` | `Public`, `Interne`, `Confidentiel`, `Secret` |
| `status` | `actif`, `en_maintenance`, `en_cours_de_mise_au_rebut`, `retiré` |
| `entry_date`, `next_review_date`, `review_date` | Format `YYYY-MM-DD` |
| `tags`, `components`, `related_risks` | JSON valide ou vide |

### Étapes de migration

```bash
# 1. Exporter votre fichier Excel en CSV (Enregistrer sous > CSV UTF-8)
# 2. Vérifier l'encodage et les colonnes obligatoires
# 3. Importer
aktif asset import --file inventaire.csv

# 4. Vérifier le résultat
aktif asset list
aktif asset report
```

---

## Exemple de workflow ISO 27001 complet

Scénario : préparer un audit de conformité A.5.9 depuis zéro.

```bash
# Étape 1 — Importer l'inventaire existant depuis Excel
aktif asset import --file inventaire-2025.csv
# Résultat : 47 actif(s) importé(s), 0 ignoré(s), 0 erreur(s)

# Étape 2 — Identifier les lacunes
aktif asset owners          # actifs sans propriétaire
aktif asset unclassified    # actifs sans classification
aktif asset review          # actifs en retard de révision

# Étape 3 — Corriger les lacunes
aktif asset edit a1b2c3d4 --owner "Sophie Martin" --classification Confidentiel
aktif asset edit e5f6a7b8 --next-review-date 2027-03-15

# Étape 4 — Vérifier la conformité
aktif asset report
# Affiche : taux propriétaire, classification, révision et score global

# Étape 5 — Exporter pour l'auditeur
aktif asset export --format csv --output inventaire-audit-2026.csv
aktif asset export --format json --output inventaire-audit-2026.json

# Étape 6 — Prouver la traçabilité
aktif asset changelog --since 2025-01-01
aktif asset history a1b2c3d4

# En CI : vérifier que le score ne descend pas en dessous de 80%
aktif asset report --fail-below 80
```

---

## Configuration

La configuration se lit dans cet ordre de priorité (du plus prioritaire au moins prioritaire) :

1. Flag CLI `--db <chemin>`
2. Variable d'environnement `AKTIF_DB` / `AKTIF_USER`
3. Fichier `aktif.config.json` dans le répertoire courant
4. Fichier `~/.aktifrc`
5. Valeurs par défaut

### Fichier `~/.aktifrc`

```json
{
  "db": "/chemin/vers/aktif.db",
  "user": "Sophie Martin",
  "defaultReviewPeriodDays": 365
}
```

| Clé | Défaut | Description |
|-----|--------|-------------|
| `db` | `~/.aktif/aktif.db` | Chemin vers la base SQLite |
| `user` | `$USER` | Nom utilisé dans l'audit trail (`changed_by`) |
| `defaultReviewPeriodDays` | `365` | Intervalle de révision par défaut en jours |

### Variables d'environnement

```bash
export AKTIF_DB=/nas/partage/aktif.db    # base partagée sur NAS
export AKTIF_USER="Sophie Martin"        # auteur pour l'audit trail
```

---

## Limitations

- **SQLite local** : un seul processus en écriture à la fois. Le mode WAL est activé par défaut pour réduire les conflits en accès concurrent.
- **Pas de multi-utilisateur** : pas de gestion de rôles ni d'authentification. Pour un NAS partagé, pointez tous les utilisateurs vers le même fichier via `--db` ou `AKTIF_DB`.
- **Pas d'interface web** : outil CLI uniquement (TUI en Sprint 3).
- **Windows non supporté** en v0.1.0 — cibles : macOS arm64, macOS x64, Linux x64.
- **Export PDF** non disponible en v0.1.0.

---

## Développement

```bash
# Installer les dépendances
bun install

# Lancer en mode dev
bun run src/cli.ts asset list

# Tests
bun test

# Vérification des types
bun run typecheck

# Lint
bun run lint

# Compiler les binaires standalone
bun run build

# Générer et appliquer les migrations
bun run db:generate
bun run db:migrate
```

---

## Licence

MIT — voir [LICENSE](./LICENSE).
