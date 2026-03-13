# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CLI + TUI tool for ISO 27001 A.5.9 asset inventory management. Replaces static spreadsheets with a lightweight, versioned, automatable solution. See `note.md` for the full specification.

## Planned Tech Stack

- **Language**: TypeScript (Node.js)
- **Database**: SQLite via `better-sqlite3` (sync, ideal for CLI) or `drizzle-orm` + SQLite
- **TUI**: [Ink](https://github.com/vadimdemedes/ink) (React for terminal) — same codebase for CLI and TUI modes
- **Export**: `csv-stringify` for CSV, `pdf-lib` or `puppeteer` for PDF
- **Dev runtime**: `tsx`; **Distribution**: `esbuild` or `pkg` for standalone binaries

## Intended Architecture

```
src/
  commands/     # CLI command handlers (add, list, export, report...)
  components/   # Ink TUI components (AssetTable, AssetForm, Dashboard...)
  db/           # SQLite schema, migrations, queries
  export/       # CSV, JSON, PDF exporters
  types/        # Shared types (Asset, Owner, AuditLog...)
  cli.ts        # CLI entry point (commander or yargs)
  tui.ts        # TUI entry point (ink render)
```

**Key design principle**: CLI and TUI share the same data model and SQLite queries — no duplication.

## Data Model

Three SQLite tables: `assets`, `audit_log`, `owners`. See `note.md` for full schema.

- `assets`: UUID-keyed records with classification, owner, status, review dates, JSON columns for tags/components/related_risks
- `audit_log`: immutable append-only log of create/update/retire/delete with before/after diff as JSON
- `owners`: lookup table for asset owners (name, email, department)

## Core Commands to Implement

- `asset add/list/show/edit/retire/delete` — CRUD with filters
- `asset export --format csv|json|pdf` and `asset import --file`
- `asset review/owners/unclassified/report` — ISO 27001 compliance queries
- `asset history <id>` and `asset changelog` — audit trail inspection
- `asset tui` — launch interactive terminal UI
