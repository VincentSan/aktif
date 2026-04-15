# aktif — ISO 27001 A.5.9 Asset Inventory

**aktif** is a lightweight CLI tool to manage an asset inventory in compliance with ISO 27001 A.5.9. It replaces static spreadsheets with a versioned, automatable, and auditable solution — without the complexity of a full CMDB.

- Immutable audit trail (SQLite append-only)
- CSV, JSON export for auditors
- A.5.9 compliance report in one command
- Standalone binary — no dependencies to install

---

## Installation

### Download binary (recommended)

Download the binary for your platform from [GitHub Releases](https://github.com/VincentSan/aktif/releases):

```bash
# macOS Apple Silicon
curl -L https://github.com/VincentSan/aktif/releases/latest/download/aktif-macos-arm64 -o aktif
chmod +x aktif
sudo mv aktif /usr/local/bin/

# macOS Intel
curl -L https://github.com/VincentSan/aktif/releases/latest/download/aktif-macos-x64 -o aktif
chmod +x aktif
sudo mv aktif /usr/local/bin/

# Linux x86_64
curl -L https://github.com/VincentSan/aktif/releases/latest/download/aktif-linux-x64 -o aktif
chmod +x aktif
sudo mv aktif /usr/local/bin/
```

### Development mode

```bash
git clone https://github.com/VincentSan/aktif
cd aktif
bun install
bun run src/cli.ts asset list
```

---

## Quick start

Five commands to get started:

```bash
# 1. Add an asset
aktif asset add --name "Production server" --type matériel --owner "John Doe" --classification Confidentiel

# 2. List assets
aktif asset list

# 3. Show asset details
aktif asset show <id>

# 4. Edit an asset
aktif asset edit <id> --classification Secret --owner "John Doe"

# 5. Delete an asset
aktif asset delete <id>
```

The SQLite database is automatically created at `~/.aktif/aktif.db` on first run.

---

## Command reference

### Global flag

```
aktif --db <path>    Point to a specific SQLite file
```

---

### asset add

Add a new asset to the inventory.

```
aktif asset add --name <name> --type <type> [options]
```

| Flag                        | Required | Description                                                                      |
| --------------------------- | -------- | -------------------------------------------------------------------------------- |
| `--name <n>`                | yes      | Asset name                                                                       |
| `--type <t>`                | yes      | `informationnel` \| `logiciel` \| `matériel` \| `service` \| `personnel`         |
| `--description <d>`         | no       | Functional description                                                           |
| `--location <l>`            | no       | Physical or logical location                                                     |
| `--owner <o>`               | no       | Owner name                                                                       |
| `--classification <c>`      | no       | `Public` \| `Interne` \| `Confidentiel` \| `Secret`                              |
| `--access-restrictions <a>` | no       | Description of access controls                                                   |
| `--status <s>`              | no       | `actif` (default) \| `en_maintenance` \| `en_cours_de_mise_au_rebut` \| `retiré` |
| `--entry-date <d>`          | no       | Entry date YYYY-MM-DD (default: today)                                           |
| `--review-date <d>`         | no       | Last review date YYYY-MM-DD                                                      |
| `--next-review-date <d>`    | no       | Next review date YYYY-MM-DD (default: +365 days)                                 |
| `--disposal-method <m>`     | no       | Disposal method                                                                  |
| `--tags <json>`             | no       | Tags JSON, e.g. `'["tag1","tag2"]'`                                              |
| `--components <json>`       | no       | Components JSON, e.g. `'[{"name":"nginx","version":"1.25"}]'`                    |
| `--related-risks <json>`    | no       | Risk references, e.g. `'["R-01","R-05"]'`                                        |

Returns the UUID of the created asset.

```bash
aktif asset add \
  --name "GitLab server" \
  --type logiciel \
  --owner "John Doe" \
  --classification Confidentiel \
  --tags '["infrastructure","ci-cd"]'
```

---

### asset list

List assets with optional filters.

```
aktif asset list [--type <t>] [--classification <c>] [--owner <o>] [--status <s>]
```

```bash
aktif asset list --status actif --classification Confidentiel
aktif asset list --owner "John Doe"
aktif asset list --type logiciel
```

---

### asset show

Display the full details of an asset.

```
aktif asset show <id>
```

---

### asset search

Full-text search across asset names, descriptions, and tags.

```
aktif asset search <query>
```

```bash
aktif asset search "gitlab"
aktif asset search "production"
```

---

### asset edit

Edit one or more fields of an existing asset. Accepts the same flags as `add`.

```
aktif asset edit <id> [--name <n>] [--classification <c>] [--owner <o>] ...
```

```bash
aktif asset edit a1b2c3d4 --classification Secret --review-date 2026-03-15
```

---

### asset retire

Set an asset's status to `en_cours_de_mise_au_rebut`.

```
aktif asset retire <id>
```

---

### asset delete

Permanently delete an asset. Prompts for confirmation, or use `--yes` for scripts.

```
aktif asset delete <id> [--yes]
```

```bash
aktif asset delete a1b2c3d4 --yes
```

---

### asset history

Display the chronological history of changes for an asset.

```
aktif asset history <id>
```

---

### asset changelog

Display the global log of all changes.

```
aktif asset changelog [--limit <n>] [--since <date>]
```

```bash
aktif asset changelog --limit 20
aktif asset changelog --since 2026-01-01
```

---

### asset review

List assets whose review date has passed. Exits with code 1 if overdue assets exist (usable in CI).

```
aktif asset review
```

---

### asset owners

List assets with no assigned owner.

```
aktif asset owners
```

---

### asset unclassified

List assets with no classification.

```
aktif asset unclassified
```

---

### asset report

Display the ISO 27001 A.5.9 compliance report: owner coverage rate, classification, review, and global score.

```
aktif asset report [--fail-below <n>]
```

```bash
aktif asset report
aktif asset report --fail-below 80   # exit 1 if score < 80%
```

---

### asset export

Export assets to CSV or JSON.

```
aktif asset export --format csv|json [--output <path>] [--type <t>] [--status <s>] [--owner <o>] [--classification <c>]
```

```bash
aktif asset export --format csv --output inventory.csv
aktif asset export --format json > inventory.json
aktif asset export --format csv --status actif --output active-assets.csv
```

---

### asset import

Import assets from a CSV file (migration from Excel).

```
aktif asset import --file <path> [--strict] [--overwrite]
```

| Flag            | Description                                          |
| --------------- | ---------------------------------------------------- |
| `--file <path>` | Path to the CSV file                                 |
| `--strict`      | Stop on first error (default: continue)              |
| `--overwrite`   | Overwrite asset if ID already exists (default: skip) |

```bash
aktif asset import --file inventory.csv
aktif asset import --file inventory.csv --strict --overwrite
```

---

### asset config

Read or write configuration values from `~/.aktifrc`.

```
aktif asset config get <key>
aktif asset config set <key> <value>
```

Supported keys: `db`, `user`, `defaultReviewPeriodDays`

```bash
aktif asset config get db
aktif asset config set defaultReviewPeriodDays 180
```

---

### owner add

Add an owner to the `owners` table.

```
aktif owner add --name <name> [--email <e>] [--department <d>]
```

```bash
aktif owner add --name "John Doe" --email "john@example.com" --department "Security"
```

---

### owner list

List all registered owners.

```
aktif owner list
```

---

### owner edit

Edit an existing owner (by UUID or prefix).

```
aktif owner edit <id> [--name <n>] [--email <e>] [--department <d>]
```

```bash
aktif owner edit a1b2c3d4 --email "new@example.com" --department "IT"
```

---

### owner delete

Delete an owner. If linked assets exist, you will be prompted to choose how to handle them.

```
aktif owner delete <id> [--reassign <owner-id>] [--clear] [--force]
```

| Flag              | Description                               |
| ----------------- | ----------------------------------------- |
| `--reassign <id>` | Reassign linked assets to another owner   |
| `--clear`         | Set owner to null on linked assets        |
| `--force`         | Delete linked assets along with the owner |

```bash
aktif owner delete a1b2c3d4 --reassign b2c3d4e5
aktif owner delete a1b2c3d4 --clear
```

---

### tags new

Create a new tag.

```
aktif tags new <name>
```

```bash
aktif tags new infrastructure
aktif tags new ci-cd
```

---

### tags list

List all tags.

```
aktif tags list
```

---

### tags edit

Rename a tag. Automatically updates all assets referencing it.

```
aktif tags edit <old_name> <new_name>
```

```bash
aktif tags edit ci-cd cicd
```

---

### tags delete

Delete a tag. Automatically removes it from all assets referencing it.

```
aktif tags delete <name>
```

```bash
aktif tags delete obsolete-tag
```

---

### tui

Launch the interactive terminal UI.

```
aktif tui
```

---

### config edit

Open `~/.aktifrc` in your system editor (`$EDITOR` or `vi`). Creates the file with a default template if it does not exist.

```
aktif config edit
```

---

## Migration guide from Excel

### Expected CSV format

The CSV file must be **UTF-8** encoded with a header row. The `name` and `type` columns are required.

```csv
name,type,description,owner,classification,status,entry_date,next_review_date,location,tags
Production server,matériel,Main server,John Doe,Confidentiel,actif,2024-01-15,2025-01-15,Paris DC,["production"]
Office 365 License,logiciel,Office suite,Foo Doe,Interne,actif,2023-06-01,2024-06-01,Cloud,,
Customer database,informationnel,CRM data,John Doe,Secret,actif,2024-03-01,2025-03-01,DB Server,,["crm","gdpr"]
```

### Accepted values

| Column                                          | Values                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `type`                                          | `informationnel`, `logiciel`, `matériel`, `service`, `personnel` |
| `classification`                                | `Public`, `Interne`, `Confidentiel`, `Secret`                    |
| `status`                                        | `actif`, `en_maintenance`, `en_cours_de_mise_au_rebut`, `retiré` |
| `entry_date`, `next_review_date`, `review_date` | `YYYY-MM-DD` format                                              |
| `tags`, `components`, `related_risks`           | Valid JSON or empty                                              |

### Migration steps

```bash
# 1. Export your Excel file to CSV (Save as > CSV UTF-8)
# 2. Check encoding and required columns
# 3. Import
aktif asset import --file inventory.csv

# 4. Verify the result
aktif asset list
aktif asset report
```

---

## Full ISO 27001 workflow example

Scenario: prepare an A.5.9 compliance audit from scratch.

```bash
# Step 1 — Import existing inventory from Excel
aktif asset import --file inventory-2025.csv
# Result: 47 asset(s) imported, 0 skipped, 0 error(s)

# Step 2 — Find gaps
aktif asset owners          # assets without owner
aktif asset unclassified    # assets without classification
aktif asset review          # overdue assets

# Step 3 — Search and fix gaps
aktif asset search "server"
aktif asset edit a1b2c3d4 --owner "John Doe" --classification Confidentiel
aktif asset edit e5f6a7b8 --next-review-date 2027-03-15

# Step 4 — Check compliance
aktif asset report
# Shows: owner rate, classification, review rate, and global score

# Step 5 — Export for the auditor
aktif asset export --format csv --output inventory-audit-2026.csv
aktif asset export --format json --output inventory-audit-2026.json

# Step 6 — Prove traceability
aktif asset changelog --since 2025-01-01
aktif asset history a1b2c3d4

# In CI: ensure the score doesn't drop below 80%
aktif asset report --fail-below 80
```

---

## Configuration

Configuration is resolved in this priority order (highest to lowest):

1. CLI flag `--db <path>`
2. Environment variables `AKTIF_DB` / `AKTIF_USER`
3. `aktif.config.json` in the current directory
4. `~/.aktifrc`
5. Default values

### `~/.aktifrc` file

```json
{
  "db": "/path/to/aktif.db",
  "user": "John Doe",
  "defaultReviewPeriodDays": 365
}
```

| Key                       | Default             | Description                                 |
| ------------------------- | ------------------- | ------------------------------------------- |
| `db`                      | `~/.aktif/aktif.db` | Path to the SQLite database                 |
| `user`                    | `$USER`             | Name used in the audit trail (`changed_by`) |
| `defaultReviewPeriodDays` | `365`               | Default review interval in days             |

### Environment variables

```bash
export AKTIF_DB=/nas/shared/aktif.db    # shared database on NAS
export AKTIF_USER="John Doe"       # author for the audit trail
```

---

## Limitations

- **Local SQLite**: single write process at a time. WAL mode is enabled by default to reduce concurrent access conflicts.
- **No multi-user**: no role management or authentication. For a shared NAS, point all users to the same file via `--db` or `AKTIF_DB`.
- **PDF export** not available in v1.0.0.
- **Windows not supported** — targets: macOS arm64, macOS x64, Linux x64.

---

## Development

```bash
# Install dependencies
bun install

# Run in dev mode
bun run src/cli.ts asset list

# Tests
bun test

# Type checking
bun run typecheck

# Lint
bun run lint

# Build standalone binaries
bun run build

# Generate and apply migrations
bun run db:generate
bun run db:migrate
```

---

## License

MIT — see [LICENSE](./LICENSE).
