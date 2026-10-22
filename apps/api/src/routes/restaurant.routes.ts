import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../db/database';
import { config } from '../config';
import { authenticate, requireRestaurantPartner, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/auditService';

export const restaurantRouter = Router();

restaurantRouter.use(authenticate);
restaurantRouter.use(requireRestaurantPartner);

// GET /api/v1/restaurant/dashboard
restaurantRouter.get('/dashboard', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const now = new Date().toISOString();

  // Urgent Updates for this restaurant
  const urgentUpdates = db.query<any>(
    `SELECT u.id, u.title, u.category, u.priority, u.status, u.message, u.response_type, u.deadline_at, u.published_at,
            ur.status as recipient_status, ur.read_at, ur.acknowledged_at, ur.response_submitted_at,
            (SELECT COUNT(*) FROM update_attachments WHERE update_id = u.id) as attachment_count
     FROM update_recipients ur
     JOIN updates u ON ur.update_id = u.id
     WHERE ur.restaurant_id = ? AND u.status = 'published' AND u.priority = 'urgent'
       AND ur.status NOT IN ('response_submitted', 'response_reviewed')
     ORDER BY u.created_at DESC`,
    [restaurantId]
  );

  // Counts
  const counts = {
    urgentCount: urgentUpdates.length,
    newCount: db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM update_recipients ur
       JOIN updates u ON ur.update_id = u.id
       WHERE ur.restaurant_id = ? AND u.status = 'published' AND ur.status IN ('delivered', 'pending_delivery')`,
      [restaurantId]
    )?.count || 0,
    pendingAcknowledgements: db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM update_recipients ur
       JOIN updates u ON ur.update_id = u.id
       WHERE ur.restaurant_id = ? AND u.status = 'published' AND ur.status IN ('delivered', 'read')
         AND u.response_type = 'acknowledgement_only'`,
      [restaurantId]
    )?.count || 0,
    awaitingResponse: db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM update_recipients ur
       JOIN updates u ON ur.update_id = u.id
       WHERE ur.restaurant_id = ? AND u.status = 'published' AND ur.status NOT IN ('response_submitted', 'response_reviewed')
         AND u.response_type != 'announcement_only'`,
      [restaurantId]
    )?.count || 0,
    recentlyCompleted: db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM update_recipients ur
       JOIN updates u ON ur.update_id = u.id
       WHERE ur.restaurant_id = ? AND ur.status IN ('response_submitted', 'response_reviewed', 'acknowledged')`,
      [restaurantId]
    )?.count || 0,
    unreadNotifications: db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM in_app_notifications
       WHERE (restaurant_id = ? OR recipient_user_id = ?) AND is_read = 0`,
      [restaurantId, req.user!.id]
    )?.count || 0,
  };

  // Recent update cards
  const recentUpdates = db.query<any>(
    `SELECT u.id, u.title, u.category, u.priority, u.status, u.message, u.response_type, u.deadline_at, u.published_at,
            ur.status as recipient_status, ur.read_at, ur.acknowledged_at, ur.response_submitted_at,
            (SELECT COUNT(*) FROM update_attachments WHERE update_id = u.id) as attachment_count
     FROM update_recipients ur
     JOIN updates u ON ur.update_id = u.id
     WHERE ur.restaurant_id = ? AND u.status = 'published'
     ORDER BY u.created_at DESC
     LIMIT 10`,
    [restaurantId]
  );

  res.json({
    success: true,
    data: {
      restaurant: req.restaurant,
      counts,
      urgentUpdates: urgentUpdates.map(formatUpdateCard),
      recentUpdates: recentUpdates.map(formatUpdateCard),
    },
  });
});

// GET /api/v1/restaurant/updates
restaurantRouter.get('/updates', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const { filter = 'all', sort = 'newest', search } = req.query;

  let sql = `
    SELECT u.id, u.title, u.category, u.priority, u.status, u.message, u.response_type, u.deadline_at, u.published_at,
           ur.status as recipient_status, ur.read_at, ur.acknowledged_at, ur.response_submitted_at,
           (SELECT COUNT(*) FROM update_attachments WHERE update_id = u.id) as attachment_count
    FROM update_recipients ur
    JOIN updates u ON ur.update_id = u.id
    WHERE ur.restaurant_id = ? AND u.status = 'published'
  `;
  const params: any[] = [restaurantId];

  // Filters
  const now = new Date().toISOString();
  if (filter === 'unread') {
    sql += ` AND ur.status IN ('delivered', 'pending_delivery')`;
  } else if (filter === 'urgent') {
    sql += ` AND u.priority = 'urgent'`;
  } else if (filter === 'awaiting_response') {
    sql += ` AND ur.status NOT IN ('response_submitted', 'response_reviewed') AND u.response_type != 'announcement_only'`;
  } else if (filter === 'acknowledged') {
    sql += ` AND ur.status = 'acknowledged'`;
  } else if (filter === 'completed') {
    sql += ` AND ur.status IN ('response_submitted', 'response_reviewed')`;
  } else if (filter === 'overdue') {
    sql += ` AND (ur.status = 'overdue' OR (u.deadline_at IS NOT NULL AND u.deadline_at < ? AND ur.status NOT IN ('response_submitted', 'response_reviewed')))`;
    params.push(now);
  }

  // Search
  if (search) {
    sql += ` AND (lower(u.title) LIKE ? OR lower(u.message) LIKE ? OR lower(u.category) LIKE ?)`;
    const term = `%${String(search).toLowerCase().trim()}%`;
    params.push(term, term, term);
  }

  // Sort
  if (sort === 'oldest') {
    sql += ` ORDER BY u.published_at ASC`;
  } else if (sort === 'deadline') {
    sql += ` ORDER BY CASE WHEN u.deadline_at IS NULL THEN 1 ELSE 0 END, u.deadline_at ASC`;
  } else if (sort === 'priority') {
    sql += ` ORDER BY CASE u.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'important' THEN 3 ELSE 4 END, u.published_at DESC`;
  } else {
    // newest default
    sql += ` ORDER BY u.published_at DESC`;
  }

  const rows = db.query<any>(sql, params);
  res.json({
    success: true,
    data: rows.map(formatUpdateCard),
  });
});

// GET /api/v1/restaurant/updates/:id
restaurantRouter.get('/updates/:id', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const { id } = req.params;

  const recipientRecord = db.queryOne<any>(
    `SELECT ur.*, u.id as update_id, u.title, u.category, u.priority, u.status as update_status, u.message,
            u.response_type, u.response_config, u.deadline_at, u.published_at, u.version
     FROM update_recipients ur
     JOIN updates u ON ur.update_id = u.id
     WHERE ur.update_id = ? AND ur.restaurant_id = ? AND u.status = 'published'`,
    [id, restaurantId]
  );

  if (!recipientRecord) {
    return res.status(404).json({ success: false, error: 'Update not found or not addressed to your restaurant' });
  }

  // Auto mark as READ if currently delivered
  const now = new Date().toISOString();
  if (recipientRecord.status === 'delivered' || !recipientRecord.read_at) {
    db.run(
      `UPDATE update_recipients
       SET status = CASE WHEN status = 'delivered' THEN 'read' ELSE status END,
           read_at = COALESCE(read_at, ?),
           updated_at = ?
       WHERE id = ?`,
      [now, now, recipientRecord.id]
    );
    recipientRecord.status = recipientRecord.status === 'delivered' ? 'read' : recipientRecord.status;
    recipientRecord.read_at = recipientRecord.read_at || now;
  }

  // Fetch Attachments
  const attachments = db.query<any>(
    `SELECT id, file_name as fileName, file_type as fileType, file_size as fileSize, created_at as createdAt
     FROM update_attachments WHERE update_id = ?`,
    [id]
  );

  // Fetch Restaurant's submitted response if any
  const response = db.queryOne<any>(
    `SELECT id, response_type, status, availability_status, availability_details, answer_text, selected_options,
            submitted_at, reviewed_at, admin_notes
     FROM restaurant_responses WHERE update_id = ? AND restaurant_id = ?`,
    [id, restaurantId]
  );

  // Check overdue condition
  const isOverdue = recipientRecord.status !== 'response_submitted' &&
                    recipientRecord.status !== 'response_reviewed' &&
                    recipientRecord.deadline_at &&
                    new Date(recipientRecord.deadline_at) < new Date();

  res.json({
    success: true,
    data: {
      id: recipientRecord.update_id,
      title: recipientRecord.title,
      category: recipientRecord.category,
      priority: recipientRecord.priority,
      status: recipientRecord.update_status,
      message: recipientRecord.message,
      responseType: recipientRecord.response_type,
      responseConfig: recipientRecord.response_config ? JSON.parse(recipientRecord.response_config) : null,
      deadlineAt: recipientRecord.deadline_at,
      publishedAt: recipientRecord.published_at,
      version: recipientRecord.version,
      isOverdue: Boolean(isOverdue),
      recipientStatus: recipientRecord.status,
      readAt: recipientRecord.read_at,
      acknowledgedAt: recipientRecord.acknowledged_at,
      responseSubmittedAt: recipientRecord.response_submitted_at,
      attachments,
      response: response
        ? {
            id: response.id,
            responseType: response.response_type,
            status: response.status,
            availabilityStatus: response.availability_status,
            availabilityDetails: response.availability_details ? JSON.parse(response.availability_details) : null,
            answerText: response.answer_text,
            selectedOptions: response.selected_options ? JSON.parse(response.selected_options) : null,
            submittedAt: response.submitted_at,
            reviewedAt: response.reviewed_at,
            adminNotes: response.admin_notes,
          }
        : null,
    },
  });
});

// GET /api/v1/restaurant/updates/:id/attachments/:attachmentId/download
restaurantRouter.get('/updates/:id/attachments/:attachmentId/download', (req: AuthenticatedRequest, res: Response) => {
  const restaurantId = req.restaurant!.id;
  const { id, attachmentId } = req.params;

  // Authorization check: Must be a recipient of this update
  const recipient = db.queryOne<any>(
    `SELECT id FROM update_recipients WHERE update_id = ? AND restaurant_id = ?`,
    [id, restaurantId]
  );

  if (!recipient) {
    return res.status(403).json({ success: false, error: 'Unauthorized to download attachments for this update' });
  }

  const attachment = db.queryOne<any>(
    `SELECT id, file_name, file_type, file_size, storage_path FROM update_attachments WHERE id = ? AND update_id = ?`,
    [attachmentId, id]
  );

  if (!attachment) {
    return res.status(404).json({ success: false, error: 'Attachment not found' });
  }

  const filePath = path.resolve(config.uploadDir, attachment.storage_path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Attachment file not found on server storage' });
  }

  res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.file_name)}"`);
  res.setHeader('Content-Length', attachment.file_size);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// POST /api/v1/restaurant/updates/:id/acknowledge
restaurantRouter.post('/updates/:id/acknowledge', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const { id } = req.params;

  const recipient = db.queryOne<any>(
    `SELECT id, status FROM update_recipients WHERE update_id = ? AND restaurant_id = ?`,
    [id, restaurantId]
  );

  if (!recipient) {
    return res.status(404).json({ success: false, error: 'Update not found for your restaurant' });
  }

  const now = new Date().toISOString();
  db.run(
    `UPDATE update_recipients
     SET status = 'acknowledged', acknowledged_at = ?, updated_at = ?
     WHERE id = ?`,
    [now, now, recipient.id]
  );

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'ACKNOWLEDGE_UPDATE',
    resourceType: 'update',
    resourceId: id,
    payload: { restaurantId },
  });

  res.json({
    success: true,
    message: 'Update acknowledged successfully',
    acknowledgedAt: now,
  });
});

// POST /api/v1/restaurant/updates/:id/response
restaurantRouter.post('/updates/:id/response', (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurant!.id;
    const { id } = req.params;
    const {
      availabilityStatus,
      availabilityDetails,
      answerText,
      selectedOptions,
      isDraft,
    } = req.body;

    const update = db.queryOne<any>(`SELECT * FROM updates WHERE id = ?`, [id]);
    if (!update) {
      return res.status(404).json({ success: false, error: 'Update not found' });
    }

    const recipient = db.queryOne<any>(
      `SELECT id, status FROM update_recipients WHERE update_id = ? AND restaurant_id = ?`,
      [id, restaurantId]
    );

    if (!recipient) {
      return res.status(403).json({ success: false, error: 'This update was not assigned to your restaurant' });
    }

    const now = new Date().toISOString();
    const submissionStatus = isDraft ? 'draft' : 'submitted';

    // Upsert response
    const existingResponse = db.queryOne<any>(
      `SELECT id FROM restaurant_responses WHERE update_id = ? AND restaurant_id = ?`,
      [id, restaurantId]
    );

    const responseId = existingResponse ? existingResponse.id : crypto.randomUUID();

    if (existingResponse) {
      db.run(
        `UPDATE restaurant_responses
         SET user_id = ?,
             response_type = ?,
             status = ?,
             availability_status = ?,
             availability_details = ?,
             answer_text = ?,
             selected_options = ?,
             submitted_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          req.user!.id,
          update.response_type,
          submissionStatus,
          availabilityStatus || null,
          availabilityDetails ? JSON.stringify(availabilityDetails) : null,
          answerText || null,
          selectedOptions ? JSON.stringify(selectedOptions) : null,
          isDraft ? null : now,
          now,
          responseId,
        ]
      );
    } else {
      db.run(
        `INSERT INTO restaurant_responses (id, update_id, restaurant_id, user_id, response_type, status, availability_status, availability_details, answer_text, selected_options, submitted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          responseId,
          id,
          restaurantId,
          req.user!.id,
          update.response_type,
          submissionStatus,
          availabilityStatus || null,
          availabilityDetails ? JSON.stringify(availabilityDetails) : null,
          answerText || null,
          selectedOptions ? JSON.stringify(selectedOptions) : null,
          isDraft ? null : now,
          now,
          now,
        ]
      );
    }

    // If submitted (not draft), update recipient tracking status
    if (!isDraft) {
      db.run(
        `UPDATE update_recipients
         SET status = 'response_submitted',
             response_submitted_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [now, now, recipient.id]
      );
    }

    AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: isDraft ? 'SAVE_RESPONSE_DRAFT' : 'SUBMIT_RESPONSE',
      resourceType: 'response',
      resourceId: responseId,
      payload: {
        updateId: id,
        restaurantId,
        availabilityStatus,
        answerText,
      },
    });

    res.json({
      success: true,
      message: isDraft ? 'Response saved as draft' : 'Response successfully submitted to Daily Drop Operations',
      data: {
        id: responseId,
        status: submissionStatus,
        submittedAt: isDraft ? null : now,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/restaurant/responses
restaurantRouter.get('/responses', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;

  const rows = db.query<any>(
    `SELECT rr.*, u.title as update_title, u.category as update_category, u.priority as update_priority
     FROM restaurant_responses rr
     JOIN updates u ON rr.update_id = u.id
     WHERE rr.restaurant_id = ?
     ORDER BY rr.submitted_at DESC`,
    [restaurantId]
  );

  res.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      updateId: r.update_id,
      updateTitle: r.update_title,
      updateCategory: r.update_category,
      updatePriority: r.update_priority,
      responseType: r.response_type,
      status: r.status,
      availabilityStatus: r.availability_status,
      availabilityDetails: r.availability_details ? JSON.parse(r.availability_details) : null,
      answerText: r.answer_text,
      selectedOptions: r.selected_options ? JSON.parse(r.selected_options) : null,
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at,
      adminNotes: r.admin_notes,
    })),
  });
});

// GET /api/v1/restaurant/notifications
restaurantRouter.get('/notifications', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const rows = db.query<any>(
    `SELECT * FROM in_app_notifications
     WHERE restaurant_id = ? OR recipient_user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [restaurantId, req.user!.id]
  );

  res.json({
    success: true,
    data: rows.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ? JSON.parse(n.data) : null,
      isRead: Boolean(n.is_read),
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
  });
});

// PATCH /api/v1/restaurant/notifications/:id/read
restaurantRouter.patch('/notifications/:id/read', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const { id } = req.params;
  const now = new Date().toISOString();

  db.run(
    `UPDATE in_app_notifications SET is_read = 1, read_at = ? WHERE id = ? AND (restaurant_id = ? OR recipient_user_id = ?)`,
    [now, id, restaurantId, req.user!.id]
  );

  res.json({ success: true, message: 'Notification marked as read' });
});

// PATCH /api/v1/restaurant/notifications/mark-all-read
restaurantRouter.patch('/notifications/mark-all-read', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const now = new Date().toISOString();

  db.run(
    `UPDATE in_app_notifications SET is_read = 1, read_at = ? WHERE (restaurant_id = ? OR recipient_user_id = ?) AND is_read = 0`,
    [now, restaurantId, req.user!.id]
  );

  res.json({ success: true, message: 'All notifications marked as read' });
});

// GET /api/v1/restaurant/profile
restaurantRouter.get('/profile', (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      restaurant: req.restaurant,
    },
  });
});

// PUT /api/v1/restaurant/profile
restaurantRouter.put('/profile', (req: AuthenticatedRequest, res) => {
  const restaurantId = req.restaurant!.id;
  const { phone, address, notes, ownerName } = req.body;
  const now = new Date().toISOString();

  db.run(
    `UPDATE restaurants
     SET phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         notes = COALESCE(?, notes),
         owner_name = COALESCE(?, owner_name),
         updated_at = ?
     WHERE id = ?`,
    [phone, address, notes, ownerName, now, restaurantId]
  );

  const updated = db.queryOne<any>(`SELECT * FROM restaurants WHERE id = ?`, [restaurantId]);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: updated,
  });
});

function formatUpdateCard(u: any) {
  return {
    id: u.id,
    title: u.title,
    category: u.category,
    priority: u.priority,
    status: u.status,
    message: u.message,
    responseType: u.response_type,
    deadlineAt: u.deadline_at,
    publishedAt: u.published_at,
    recipientStatus: u.recipient_status,
    isUnread: u.recipient_status === 'delivered' || u.recipient_status === 'pending_delivery',
    isAwaitingResponse: !['response_submitted', 'response_reviewed'].includes(u.recipient_status) && u.response_type !== 'announcement_only',
    isOverdue: u.deadline_at && new Date(u.deadline_at) < new Date() && !['response_submitted', 'response_reviewed'].includes(u.recipient_status),
    attachmentCount: u.attachment_count || 0,
  };
}
