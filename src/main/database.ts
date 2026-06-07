import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

// ── Types (espelham os tipos do renderer) ────────────────────────────────────

export interface DbWebIntegration {
  id: string
  name: string
  url: string
  description: string
  color: string
}

export interface DbTemplateOption {
  id: string
  label: string
  description?: string
  default: boolean
  flag: string
}

export interface DbTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  textColor: string
  commandTemplate: string
  postInstallTemplate?: string
  options: DbTemplateOption[]
  createdAt: number
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'devson.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS web_integrations (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color       TEXT NOT NULL DEFAULT '',
      position    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quickstart_templates (
      id                    TEXT PRIMARY KEY,
      name                  TEXT NOT NULL,
      description           TEXT NOT NULL DEFAULT '',
      category              TEXT NOT NULL,
      icon                  TEXT NOT NULL DEFAULT '⚡',
      color                 TEXT NOT NULL DEFAULT 'bg-primary/20',
      text_color            TEXT NOT NULL DEFAULT 'text-primary',
      command_template      TEXT NOT NULL,
      post_install_template TEXT,
      options               TEXT NOT NULL DEFAULT '[]',
      created_at            INTEGER NOT NULL
    );
  `)
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// ── Web Integrations ──────────────────────────────────────────────────────────

export function getIntegrations(): DbWebIntegration[] {
  type Row = { id: string; name: string; url: string; description: string; color: string }
  return db
    .prepare('SELECT id, name, url, description, color FROM web_integrations ORDER BY position ASC')
    .all() as Row[]
}

export function upsertIntegration(i: DbWebIntegration): void {
  const { p } = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS p FROM web_integrations')
    .get() as { p: number }
  db.prepare(`
    INSERT INTO web_integrations (id, name, url, description, color, position)
    VALUES (@id, @name, @url, @description, @color, @position)
    ON CONFLICT(id) DO UPDATE SET
      name        = excluded.name,
      url         = excluded.url,
      description = excluded.description,
      color       = excluded.color
  `).run({ ...i, position: p + 1 })
}

export function deleteIntegration(id: string): void {
  db.prepare('DELETE FROM web_integrations WHERE id = ?').run(id)
}

// ── Quick Start Templates ─────────────────────────────────────────────────────

export function getTemplates(): DbTemplate[] {
  type Row = {
    id: string; name: string; description: string; category: string
    icon: string; color: string; text_color: string
    command_template: string; post_install_template: string | null
    options: string; created_at: number
  }
  const rows = db
    .prepare('SELECT * FROM quickstart_templates ORDER BY created_at ASC')
    .all() as Row[]
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    icon: r.icon,
    color: r.color,
    textColor: r.text_color,
    commandTemplate: r.command_template,
    postInstallTemplate: r.post_install_template ?? undefined,
    options: JSON.parse(r.options) as DbTemplateOption[],
    createdAt: r.created_at,
  }))
}

export function upsertTemplate(t: DbTemplate): void {
  db.prepare(`
    INSERT INTO quickstart_templates
      (id, name, description, category, icon, color, text_color,
       command_template, post_install_template, options, created_at)
    VALUES
      (@id, @name, @description, @category, @icon, @color, @textColor,
       @commandTemplate, @postInstallTemplate, @options, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      name                  = excluded.name,
      description           = excluded.description,
      category              = excluded.category,
      icon                  = excluded.icon,
      color                 = excluded.color,
      text_color            = excluded.text_color,
      command_template      = excluded.command_template,
      post_install_template = excluded.post_install_template,
      options               = excluded.options
  `).run({
    ...t,
    postInstallTemplate: t.postInstallTemplate ?? null,
    options: JSON.stringify(t.options),
  })
}

export function deleteTemplate(id: string): void {
  db.prepare('DELETE FROM quickstart_templates WHERE id = ?').run(id)
}
