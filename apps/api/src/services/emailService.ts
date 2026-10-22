import { db } from '../db/database';
import crypto from 'crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  type: 'invitation' | 'password_reset' | 'urgent_update' | 'deadline_reminder' | 'admin_followup';
}

export class EmailService {
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    const id = crypto.randomUUID();
    const sentAt = new Date().toISOString();

    // Persist to email_logs for auditing and testing verification
    db.run(
      `INSERT INTO email_logs (id, to_email, subject, body, type, sent_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, options.to, options.subject, options.body, options.type, sentAt]
    );

    console.log(`[EMAIL SERVICE] [${options.type.toUpperCase()}] To: ${options.to} | Subject: "${options.subject}"`);
    return true;
  }

  static async sendInvitationEmail(to: string, restaurantName: string, inviteUrl: string): Promise<boolean> {
    const subject = `Welcome to Daily Drop - Invitation for ${restaurantName}`;
    const body = `
Dear Restaurant Partner,

You have been invited to join Daily Drop's Restaurant Partner Platform for ${restaurantName}.
Through this secure portal, your kitchen team will receive meal planning requirements, real-time prep instructions, and submit daily order confirmations.

To complete your setup and create your password, please click the secure link below (valid for 48 hours):
${inviteUrl}

Thank you,
The Daily Drop Operations Team
support@dailydrop.com
    `.trim();

    return this.sendEmail({ to, subject, body, type: 'invitation' });
  }

  static async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const subject = `Daily Drop Partner - Password Reset Request`;
    const body = `
Hello,

A password reset request was received for your Daily Drop Partner account.
Click the link below to set a new password:
${resetUrl}

If you did not request this, please ignore this email.

The Daily Drop Team
    `.trim();

    return this.sendEmail({ to, subject, body, type: 'password_reset' });
  }

  static async sendUrgentUpdateEmail(to: string, restaurantName: string, updateTitle: string, deadlineStr?: string): Promise<boolean> {
    const subject = `URGENT ACTION REQUIRED: ${updateTitle} - Daily Drop`;
    const body = `
Dear ${restaurantName},

Daily Drop Operations has published an urgent operational update:
Title: ${updateTitle}
${deadlineStr ? `Response Deadline: ${deadlineStr}` : ''}

Please open your Daily Drop Restaurant Partner app immediately to acknowledge this notice and confirm your kitchen's availability.

Daily Drop Operations
    `.trim();

    return this.sendEmail({ to, subject, body, type: 'urgent_update' });
  }
}
