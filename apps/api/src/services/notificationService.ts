import { db } from '../db/database';
import crypto from 'crypto';

export class NotificationService {
  static createNotification(params: {
    recipientUserId?: string;
    restaurantId?: string;
    type: 'new_update' | 'urgent_update' | 'deadline_approaching' | 'overdue' | 'response_reviewed' | 'general';
    title: string;
    message: string;
    data?: any;
  }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const dataStr = params.data ? JSON.stringify(params.data) : null;

    db.run(
      `INSERT INTO in_app_notifications (id, recipient_user_id, restaurant_id, type, title, message, data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, params.recipientUserId || null, params.restaurantId || null, params.type, params.title, params.message, dataStr, createdAt]
    );

    return id;
  }
}
