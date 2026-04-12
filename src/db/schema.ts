import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const owners = sqliteTable('owners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  department: text('department'),
  created_at: text('created_at').notNull().default(sql`(DATETIME('now'))`),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['informationnel', 'logiciel', 'matériel', 'service', 'personnel'],
  }).notNull(),
  description: text('description'),
  location: text('location'),
  owner: text('owner'),
  owner_id: text('owner_id').references(() => owners.id),
  classification: text('classification', {
    enum: ['public', 'interne', 'confidentiel', 'secret'],
  }),
  access_restrictions: text('access_restrictions'),
  status: text('status', {
    enum: ['actif', 'en_maintenance', 'en_cours_de_mise_au_rebut', 'retiré'],
  }).notNull().default('actif'),
  entry_date: text('entry_date').notNull().default(sql`(DATETIME('now'))`),
  review_date: text('review_date'),
  next_review_date: text('next_review_date'),
  disposal_method: text('disposal_method'),
  tags: text('tags').notNull().default('[]'),            // JSON string
  components: text('components').notNull().default('[]'), // JSON string
  related_risks: text('related_risks').notNull().default('[]'), // JSON string
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  created_at: text('created_at').notNull().default(sql`(DATETIME('now'))`),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  asset_id: text('asset_id').notNull(),
  action: text('action', {
    enum: ['create', 'update', 'retire', 'delete'],
  }).notNull(),
  changed_by: text('changed_by').notNull(),
  changed_at: text('changed_at').notNull().default(sql`(DATETIME('now'))`),
  diff: text('diff').notNull().default('{}'), // JSON string
});
