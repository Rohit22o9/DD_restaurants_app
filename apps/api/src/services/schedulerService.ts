import { db } from '../db/database';
import { NotificationService } from './notificationService';
import { EmailService } from './emailService';
import crypto from 'crypto';

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs = 30000) {
    this.runTasks();
    this.timer = setInterval(() => this.runTasks(), intervalMs);
    console.log('[SCHEDULER] Daily Drop background scheduler started (30s interval)');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  runTasks() {
    this.publishScheduledUpdates();
    this.checkOverdueDeadlines();
  }

  private publishScheduledUpdates() {
    try {
      const now = new Date().toISOString();
      const scheduled = db.query<any>(
        `SELECT * FROM updates WHERE status = 'scheduled' AND scheduled_at <= ?`,
        [now]
      );

      for (const u of scheduled) {
        console.log(`[SCHEDULER] Automatically publishing scheduled update: "${u.title}" (${u.id})`);
        db.run(`UPDATE updates SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?`, [now, now, u.id]);

        // Target restaurants
        const restaurants = db.query<any>(`SELECT id, name, email FROM restaurants WHERE status = 'active'`);
        for (const r of restaurants) {
          db.run(
            `INSERT INTO update_recipients (id, update_id, restaurant_id, status, delivered_at, created_at, updated_at)
             VALUES (?, ?, ?, 'delivered', ?, ?, ?)`,
            [crypto.randomUUID(), u.id, r.id, now, now, now]
          );

          NotificationService.createNotification({
            restaurantId: r.id,
            type: u.priority === 'urgent' ? 'urgent_update' : 'new_update',
            title: u.priority === 'urgent' ? `[URGENT] ${u.title}` : `New Update: ${u.title}`,
            message: u.message.slice(0, 150) + (u.message.length > 150 ? '...' : ''),
            data: { updateId: u.id, priority: u.priority },
          });

          if (u.priority === 'urgent') {
            EmailService.sendUrgentUpdateEmail(r.email, r.name, u.title, u.deadline_at);
          }
        }
      }
    } catch (err) {
      console.error('[SCHEDULER ERROR - Publish]', err);
    }
  }

  private checkOverdueDeadlines() {
    try {
      const now = new Date().toISOString();
      // Find recipient records that haven't responded and are past deadline
      const overdueRecipients = db.query<any>(
        `SELECT ur.id, ur.restaurant_id, u.id as update_id, u.title as update_title
         FROM update_recipients ur
         JOIN updates u ON ur.update_id = u.id
         WHERE u.status = 'published'
           AND u.deadline_at IS NOT NULL
           AND u.deadline_at < ?
           AND ur.status NOT IN ('response_submitted', 'response_reviewed', 'overdue')`,
        [now]
      );

      for (const r of overdueRecipients) {
        db.run(
          `UPDATE update_recipients SET status = 'overdue', updated_at = ? WHERE id = ?`,
          [now, r.id]
        );

        NotificationService.createNotification({
          restaurantId: r.restaurant_id,
          type: 'overdue',
          title: `Overdue Response: ${r.update_title}`,
          message: `The deadline for "${r.update_title}" has passed. Please submit your kitchen status immediately.`,
          data: { updateId: r.update_id },
        });
      }
    } catch (err) {
      console.error('[SCHEDULER ERROR - Overdue]', err);
    }
  }
}

export const scheduler = new SchedulerService();
