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

      -- Live Orders Table (KDS & Order Flow)
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        order_number TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        delivery_slot TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'incoming' CHECK(status IN ('incoming', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled')),
        prep_time_mins INTEGER DEFAULT 20,
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'prepaid',
        special_instructions TEXT,
        rider_name TEXT,
        rider_phone TEXT,
        rider_status TEXT DEFAULT 'assigned',
        rider_eta_mins INTEGER DEFAULT 12,
        dispatch_pin TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Menu Items Table (86ing & Item Availability)
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        is_available INTEGER NOT NULL DEFAULT 1,
        daily_quota INTEGER DEFAULT 50,
        remaining_quota INTEGER DEFAULT 50,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Restaurant Weekly Payouts Table
      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        total_orders INTEGER NOT NULL,
        gross_amount REAL NOT NULL,
        commission_rate REAL NOT NULL DEFAULT 0.15,
        commission_amount REAL NOT NULL,
        packaging_subsidy REAL NOT NULL DEFAULT 0,
        net_payout REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('pending', 'processing', 'paid')),
        payout_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      -- Indices for Performance
      CREATE INDEX IF NOT EXISTS idx_update_recipients_update ON update_recipients(update_id);
      CREATE INDEX IF NOT EXISTS idx_update_recipients_restaurant ON update_recipients(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_update_recipients_status ON update_recipients(status);
      CREATE INDEX IF NOT EXISTS idx_responses_update ON restaurant_responses(update_id);
      CREATE INDEX IF NOT EXISTS idx_responses_restaurant ON restaurant_responses(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON in_app_notifications(restaurant_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
      CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_payouts_restaurant ON payouts(restaurant_id);
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
