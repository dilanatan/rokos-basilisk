import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'cyberops.db');
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export function migrate() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('employee','manager','director')),
    team TEXT NOT NULL,
    title TEXT NOT NULL,
    manager_id INTEGER REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'daily' CHECK (type IN ('daily','backup','project','incident')),
    category TEXT NOT NULL DEFAULT 'SOC',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
    assignee_id INTEGER REFERENCES users(id),
    backup_assignee_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    due_date TEXT,
    recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('conference','training','ctf','webinar','meetup','exam')),
    participation TEXT NOT NULL CHECK (participation IN ('individual','corporate')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    location TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_by INTEGER REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS event_participants (
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee','speaker','organizer')),
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','attended')),
    PRIMARY KEY (event_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    UNIQUE (user_id, name)
  );
  CREATE TABLE IF NOT EXISTS certifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuer TEXT DEFAULT '',
    obtained_at TEXT,
    expires_at TEXT
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'all',
    author_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    link TEXT DEFAULT '',
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}

export function resetDb() {
  db.exec(`
    DROP TABLE IF EXISTS notifications; DROP TABLE IF EXISTS announcements;
    DROP TABLE IF EXISTS certifications; DROP TABLE IF EXISTS skills;
    DROP TABLE IF EXISTS event_participants; DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS task_comments; DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS users;
  `);
  migrate();
}

/** Plain-object helpers (node:sqlite returns null-prototype rows). */
export const all = (sql, ...p) => db.prepare(sql).all(...p).map((r) => ({ ...r }));
export const get = (sql, ...p) => {
  const r = db.prepare(sql).get(...p);
  return r ? { ...r } : null;
};
export const run = (sql, ...p) => db.prepare(sql).run(...p);
