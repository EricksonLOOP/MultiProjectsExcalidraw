import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

// ── Types (espelham os tipos do renderer) ────────────────────────────────────

export interface DbWorkspace {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface DbWebIntegration {
  id: string
  name: string
  url: string
  description: string
  color: string
  workspaceId: string
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

    CREATE TABLE IF NOT EXISTS workspaces (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT 'slate',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS web_integrations (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      url          TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      color        TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT 'default',
      position     INTEGER NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS snippets (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      language     TEXT NOT NULL DEFAULT 'text',
      code         TEXT NOT NULL DEFAULT '',
      tags         TEXT NOT NULL DEFAULT '[]',
      workspace_id TEXT NOT NULL DEFAULT 'default',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      content      TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT 'default',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
  `)

  // Migrations: add workspace_id to existing tables (safe - ignored if column already exists)
  const tryAlter = (sql: string) => { try { db.exec(sql) } catch { /* column already exists */ } }
  tryAlter(`ALTER TABLE snippets ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'`)
  tryAlter(`ALTER TABLE notes ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'`)
  tryAlter(`ALTER TABLE web_integrations ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'`)

  // Ensure default workspace always exists
  db.prepare(`INSERT OR IGNORE INTO workspaces (id, name, color, created_at) VALUES ('default', 'Geral', 'slate', ?)`)
    .run(Date.now())
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export function getWorkspaces(): DbWorkspace[] {
  type Row = { id: string; name: string; color: string; created_at: number }
  const rows = db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC').all() as Row[]
  return rows.map(r => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at }))
}

export function upsertWorkspace(w: DbWorkspace): void {
  db.prepare(`
    INSERT INTO workspaces (id, name, color, created_at)
    VALUES (@id, @name, @color, @createdAt)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color
  `).run(w)
}

export function deleteWorkspace(id: string): void {
  const txn = db.transaction(() => {
    db.prepare('DELETE FROM snippets WHERE workspace_id = ?').run(id)
    db.prepare('DELETE FROM notes WHERE workspace_id = ?').run(id)
    db.prepare('DELETE FROM web_integrations WHERE workspace_id = ?').run(id)
    db.prepare('DELETE FROM settings WHERE key = ?').run(`excalidraw-folder:${id}`)
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id)
  })
  txn()
}

// ── Web Integrations ──────────────────────────────────────────────────────────

export function getIntegrations(workspaceId: string): DbWebIntegration[] {
  type Row = { id: string; name: string; url: string; description: string; color: string; workspace_id: string }
  return (db
    .prepare('SELECT id, name, url, description, color, workspace_id FROM web_integrations WHERE workspace_id = ? ORDER BY position ASC')
    .all(workspaceId) as Row[])
    .map(r => ({ ...r, workspaceId: r.workspace_id }))
}

export function upsertIntegration(i: DbWebIntegration): void {
  const { p } = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS p FROM web_integrations WHERE workspace_id = ?')
    .get(i.workspaceId) as { p: number }
  db.prepare(`
    INSERT INTO web_integrations (id, name, url, description, color, workspace_id, position)
    VALUES (@id, @name, @url, @description, @color, @workspaceId, @position)
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

// ── Snippets ──────────────────────────────────────────────────────────────────

export interface DbSnippet {
  id: string
  title: string
  language: string
  code: string
  tags: string[]
  workspaceId: string
  createdAt: number
  updatedAt: number
}

export function getSnippets(workspaceId: string): DbSnippet[] {
  type Row = { id: string; title: string; language: string; code: string; tags: string; workspace_id: string; created_at: number; updated_at: number }
  const rows = db.prepare('SELECT * FROM snippets WHERE workspace_id = ? ORDER BY updated_at DESC').all(workspaceId) as Row[]
  return rows.map(r => ({
    id: r.id, title: r.title, language: r.language, code: r.code,
    tags: JSON.parse(r.tags) as string[],
    workspaceId: r.workspace_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function upsertSnippet(s: DbSnippet): void {
  db.prepare(`
    INSERT INTO snippets (id, title, language, code, tags, workspace_id, created_at, updated_at)
    VALUES (@id, @title, @language, @code, @tags, @workspaceId, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, language = excluded.language,
      code = excluded.code, tags = excluded.tags, updated_at = excluded.updated_at
  `).run({ ...s, tags: JSON.stringify(s.tags) })
}

export function deleteSnippet(id: string): void {
  db.prepare('DELETE FROM snippets WHERE id = ?').run(id)
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export interface DbNote {
  id: string
  title: string
  content: string
  workspaceId: string
  createdAt: number
  updatedAt: number
}

export function getNotes(workspaceId: string): DbNote[] {
  type Row = { id: string; title: string; content: string; workspace_id: string; created_at: number; updated_at: number }
  const rows = db.prepare('SELECT * FROM notes WHERE workspace_id = ? ORDER BY updated_at DESC').all(workspaceId) as Row[]
  return rows.map(r => ({
    id: r.id, title: r.title, content: r.content,
    workspaceId: r.workspace_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function upsertNote(n: DbNote): void {
  db.prepare(`
    INSERT INTO notes (id, title, content, workspace_id, created_at, updated_at)
    VALUES (@id, @title, @content, @workspaceId, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, content = excluded.content, updated_at = excluded.updated_at
  `).run(n)
}

export function deleteNote(id: string): void {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
}
