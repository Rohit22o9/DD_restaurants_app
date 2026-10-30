import { db } from '../db/database';
import crypto from 'crypto';

export class AuditService {
  static log(params: {
    userId?: string;
    userEmail?: string;
    action: string;
    resourceType: string;
    resourceId: string;
    payload?: any;
  }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const payloadStr = params.payload ? JSON.stringify(params.payload) : null;

    // Check if userId is a valid user in the users table to prevent FOREIGN KEY constraint violations
    let validUserId: string | null = null;
    if (params.userId) {
      try {
        const userExists = db.queryOne<{ id: string }>('SELECT id FROM users WHERE id = ?', [params.userId]);
        if (userExists) {
          validUserId = params.userId;
        }
      } catch (e) {
        validUserId = null;
      }
    }

    try {
      db.run(
        `INSERT INTO audit_events (id, user_id, user_email, action, resource_type, resource_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, validUserId, params.userEmail || null, params.action, params.resourceType, params.resourceId, payloadStr, createdAt]
      );
    } catch (err: any) {
      console.warn('[AuditService] Failed to record audit log:', err.message);
    }
  }
}

