import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

class DatabaseService {
  private db: DatabaseSync;

  constructor() {
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(config.dbPath);
    this.initPragmas();
    this.initTables();
  }

  private initPragmas() {
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
  }

  private initTables() {
    this.db.exec(`
      -- Users Table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'restaurant_partner')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending_invitation', 'suspended')),
        must_change_password INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Restaurants Table
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        owner_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'pending_invitation', 'suspended')),
        address TEXT,
        notes TEXT,
        date_joined TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Restaurant Memberships Table
      CREATE TABLE IF NOT EXISTS restaurant_memberships (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'manager', 'staff')),
        is_primary INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        UNIQUE(restaurant_id, user_id)
      );

      -- Invitations Table
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'restaurant_partner',
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'expired', 'cancelled')),
        created_by TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        accepted_at TEXT
      );

      -- Updates Table
      CREATE TABLE IF NOT EXISTS updates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('normal', 'important', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'published', 'archived', 'cancelled')),
        message TEXT NOT NULL,
        response_type TEXT NOT NULL CHECK(response_type IN ('acknowledgement_only', 'availability_confirmation', 'multiple_choice', 'info_request', 'announcement_only')),
        response_config TEXT,
        deadline_at TEXT,
        scheduled_at TEXT,
        published_at TEXT,
        target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all', 'selected')),
        version INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Update Recipients Table (Per-Restaurant Tracking)
      CREATE TABLE IF NOT EXISTS update_recipients (
        id TEXT PRIMARY KEY,
        update_id TEXT NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('pending_delivery', 'delivered', 'read', 'acknowledged', 'response_submitted', 'response_reviewed', 'overdue')),
        delivered_at TEXT,
        read_at TEXT,
        acknowledged_at TEXT,
        response_submitted_at TEXT,
        response_reviewed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(update_id, restaurant_id)
      );

      -- Update Attachments Table
      CREATE TABLE IF NOT EXISTS update_attachments (
        id TEXT PRIMARY KEY,
        update_id TEXT NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- Restaurant Responses Table
      CREATE TABLE IF NOT EXISTS restaurant_responses (
        id TEXT PRIMARY KEY,
        update_id TEXT NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        response_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('draft', 'submitted', 'reviewed')),
        availability_status TEXT CHECK(availability_status IN ('available', 'partially_available', 'unavailable', 'not_applicable')),
        availability_details TEXT,
        answer_text TEXT,
        selected_options TEXT,
        submitted_at TEXT,
        reviewed_at TEXT,
        reviewed_by TEXT REFERENCES users(id),
        admin_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(update_id, restaurant_id)
      );

      -- In-App Notifications Table
      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id TEXT PRIMARY KEY,
        recipient_user_id TEXT,
        restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        read_at TEXT,
        created_at TEXT NOT NULL
      );

      -- Audit Events Table
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        user_email TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        payload TEXT,
        created_at TEXT NOT NULL
      );

      -- Simulated Sent Emails Log
      CREATE TABLE IF NOT EXISTS email_logs (
        id TEXT PRIMARY KEY,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL,
        sent_at TEXT NOT NULL
      );

      -- Indices for Performance
      CREATE INDEX IF NOT EXISTS idx_update_recipients_update ON update_recipients(update_id);
      CREATE INDEX IF NOT EXISTS idx_update_recipients_restaurant ON update_recipients(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_update_recipients_status ON update_recipients(status);
      CREATE INDEX IF NOT EXISTS idx_responses_update ON restaurant_responses(update_id);
      CREATE INDEX IF NOT EXISTS idx_responses_restaurant ON restaurant_responses(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON in_app_notifications(restaurant_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
    `);
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  public run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }
}

export const db = new DatabaseService();
