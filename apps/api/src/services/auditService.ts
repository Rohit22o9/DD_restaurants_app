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

    db.run(
      `INSERT INTO audit_events (id, user_id, user_email, action, resource_type, resource_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, params.userId || null, params.userEmail || null, params.action, params.resourceType, params.resourceId, payloadStr, createdAt]
    );
  }
}
