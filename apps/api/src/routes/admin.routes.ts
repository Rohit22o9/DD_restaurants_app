import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db } from '../db/database';
import { config } from '../config';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { AuditService } from '../services/auditService';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

// Multer storage for private attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Permitted types: PDF, XLSX, CSV, DOCX, PNG, JPG`));
    }
  },
});

// GET /api/v1/admin/dashboard/metrics
adminRouter.get('/dashboard/metrics', (req, res) => {
  const totalRestaurants = db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM restaurants`)?.count || 0;
  const activePartners = db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM restaurants WHERE status = 'active'`)?.count || 0;
  const updatesPublished = db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM updates WHERE status = 'published'`)?.count || 0;

  const updatesAwaitingResponses = db.queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM update_recipients WHERE status IN ('delivered', 'read', 'acknowledged')`
  )?.count || 0;

  const now = new Date().toISOString();
  const urgentOrOverdueResponses = db.queryOne<{ count: number }>(
    `SELECT COUNT(ur.id) as count
     FROM update_recipients ur
     JOIN updates u ON ur.update_id = u.id
     WHERE ur.status NOT IN ('response_submitted', 'response_reviewed')
       AND (u.priority = 'urgent' OR (u.deadline_at IS NOT NULL AND u.deadline_at < ?))`,
    [now]
  )?.count || 0;

  // Recent Activity
  const recentResponses = db.query<any>(
    `SELECT rr.id, 'response' as type, r.name as restaurantName, u.title as updateTitle, rr.submitted_at as timestamp, rr.status
     FROM restaurant_responses rr
     JOIN restaurants r ON rr.restaurant_id = r.id
     JOIN updates u ON rr.update_id = u.id
     ORDER BY rr.submitted_at DESC
     LIMIT 5`
  );

  // Recent Updates with response counts
  const recentUpdatesRows = db.query<any>(
    `SELECT u.*,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id) as targeted_count,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id AND status IN ('response_submitted', 'response_reviewed')) as response_submitted_count
     FROM updates u
     ORDER BY u.created_at DESC
     LIMIT 5`
  );

  res.json({
    success: true,
    data: {
      totalRestaurants,
      activePartners,
      updatesPublished,
      updatesAwaitingResponses,
      urgentOrOverdueResponses,
      recentActivity: recentResponses.map(r => ({
        id: r.id,
        type: r.type,
        restaurantName: r.restaurantName,
        updateTitle: r.updateTitle,
        timestamp: r.timestamp,
        status: r.status,
      })),
      recentUpdates: recentUpdatesRows.map(u => ({
        id: u.id,
        title: u.title,
        category: u.category,
        priority: u.priority,
        status: u.status,
        deadlineAt: u.deadline_at,
        publishedAt: u.published_at,
        targetedCount: u.targeted_count,
        responseSubmittedCount: u.response_submitted_count,
      })),
    },
  });
});

// GET /api/v1/admin/restaurants
adminRouter.get('/restaurants', (req, res) => {
  const { search, status } = req.query;
  let sql = `
    SELECT r.*,
      (SELECT COUNT(*) FROM update_recipients ur WHERE ur.restaurant_id = r.id AND ur.status NOT IN ('response_submitted', 'response_reviewed')) as pending_update_count,
      (SELECT MAX(created_at) FROM audit_events ae WHERE ae.resource_id = r.id) as last_activity
    FROM restaurants r
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) {
    sql += ` AND (lower(r.name) LIKE ? OR lower(r.email) LIKE ? OR lower(r.code) LIKE ? OR lower(r.owner_name) LIKE ?)`;
    const term = `%${String(search).toLowerCase().trim()}%`;
    params.push(term, term, term, term);
  }

  if (status && status !== 'all') {
    sql += ` AND r.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY r.name ASC`;

  const rows = db.query<any>(sql, params);
  res.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      ownerName: r.owner_name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      address: r.address,
      notes: r.notes,
      dateJoined: r.date_joined,
      pendingUpdateCount: r.pending_update_count,
      lastActivity: r.last_activity,
    })),
  });
});

// POST /api/v1/admin/restaurants
adminRouter.post('/restaurants', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, ownerName, email, phone, address, notes, sendInvite } = req.body;
    if (!name || !email || !ownerName || !phone) {
      return res.status(400).json({ success: false, error: 'Name, owner name, email, and phone are required' });
    }

    const existing = db.queryOne<any>(`SELECT id FROM restaurants WHERE lower(email) = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'A restaurant with this email already exists' });
    }

    const id = crypto.randomUUID();
    const code = 'DD-' + name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const now = new Date().toISOString();
    const initialStatus = sendInvite ? 'pending_invitation' : 'active';

    db.run(
      `INSERT INTO restaurants (id, name, code, owner_name, email, phone, status, address, notes, date_joined, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, code, ownerName, email.toLowerCase().trim(), phone, initialStatus, address || '', notes || '', now, now, now]
    );

    let invitationUrl = null;
    if (sendInvite) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const inviteId = crypto.randomUUID();

      db.run(
        `INSERT INTO invitations (id, restaurant_id, email, token, role, expires_at, status, created_by, created_at)
         VALUES (?, ?, ?, ?, 'restaurant_partner', ?, 'pending', ?, ?)`,
        [inviteId, id, email.toLowerCase().trim(), token, expiresAt, req.user!.id, now]
      );

      invitationUrl = `${config.appUrl}/setup-password?token=${token}`;
      await EmailService.sendInvitationEmail(email, name, invitationUrl);
    }

    AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'CREATE_RESTAURANT',
      resourceType: 'restaurant',
      resourceId: id,
      payload: { name, email, code },
    });

    res.status(201).json({
      success: true,
      data: {
        id,
        name,
        code,
        ownerName,
        email,
        phone,
        status: initialStatus,
        dateJoined: now,
        invitationUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/admin/restaurants/:id
adminRouter.put('/restaurants/:id', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, ownerName, phone, address, notes, status } = req.body;

  const existing = db.queryOne<any>(`SELECT id FROM restaurants WHERE id = ?`, [id]);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Restaurant not found' });
  }

  const now = new Date().toISOString();
  db.run(
    `UPDATE restaurants
     SET name = COALESCE(?, name),
         owner_name = COALESCE(?, owner_name),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         notes = COALESCE(?, notes),
         status = COALESCE(?, status),
         updated_at = ?
     WHERE id = ?`,
    [name, ownerName, phone, address, notes, status, now, id]
  );

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'UPDATE_RESTAURANT',
    resourceType: 'restaurant',
    resourceId: id,
    payload: req.body,
  });

  res.json({ success: true, message: 'Restaurant updated successfully' });
});

// POST /api/v1/admin/restaurants/:id/invite
adminRouter.post('/restaurants/:id/invite', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const restaurant = db.queryOne<any>(`SELECT id, name, email FROM restaurants WHERE id = ?`, [id]);
    if (!restaurant) {
      return res.status(404).json({ success: false, error: 'Restaurant not found' });
    }

    // Cancel old pending invitations
    db.run(`UPDATE invitations SET status = 'cancelled' WHERE restaurant_id = ? AND status = 'pending'`, [id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const now = new Date().toISOString();
    const inviteId = crypto.randomUUID();

    db.run(
      `INSERT INTO invitations (id, restaurant_id, email, token, role, expires_at, status, created_by, created_at)
       VALUES (?, ?, ?, ?, 'restaurant_partner', ?, 'pending', ?, ?)`,
      [inviteId, id, restaurant.email, token, expiresAt, req.user!.id, now]
    );

    const inviteUrl = `${config.appUrl}/setup-password?token=${token}`;
    await EmailService.sendInvitationEmail(restaurant.email, restaurant.name, inviteUrl);

    AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'SEND_INVITATION',
      resourceType: 'restaurant',
      resourceId: id,
      payload: { email: restaurant.email },
    });

    res.json({
      success: true,
      message: `Invitation successfully sent to ${restaurant.email}`,
      invitationUrl: inviteUrl,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/restaurants/:id/status
adminRouter.patch('/restaurants/:id/status', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status. Must be active or suspended.' });
  }

  const now = new Date().toISOString();
  db.run(`UPDATE restaurants SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: status === 'active' ? 'REACTIVATE_RESTAURANT' : 'SUSPEND_RESTAURANT',
    resourceType: 'restaurant',
    resourceId: id,
  });

  res.json({ success: true, message: `Restaurant status updated to ${status}` });
});

// GET /api/v1/admin/updates
adminRouter.get('/updates', (req, res) => {
  const { status, priority, category, search } = req.query;

  let sql = `
    SELECT u.*,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id) as targeted_count,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id AND status IN ('delivered', 'read', 'acknowledged', 'response_submitted', 'response_reviewed')) as delivered_count,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id AND status IN ('read', 'acknowledged', 'response_submitted', 'response_reviewed')) as read_count,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id AND status IN ('acknowledged', 'response_submitted', 'response_reviewed')) as acknowledged_count,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id AND status IN ('response_submitted', 'response_reviewed')) as response_submitted_count,
      (SELECT COUNT(*) FROM update_recipients WHERE update_id = u.id AND status NOT IN ('response_submitted', 'response_reviewed')) as pending_count,
      (SELECT COUNT(*) FROM update_attachments WHERE update_id = u.id) as attachment_count
    FROM updates u
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    sql += ` AND u.status = ?`;
    params.push(status);
  }
  if (priority && priority !== 'all') {
    sql += ` AND u.priority = ?`;
    params.push(priority);
  }
  if (category && category !== 'all') {
    sql += ` AND u.category = ?`;
    params.push(category);
  }
  if (search) {
    sql += ` AND (lower(u.title) LIKE ? OR lower(u.message) LIKE ?)`;
    const term = `%${String(search).toLowerCase().trim()}%`;
    params.push(term, term);
  }

  sql += ` ORDER BY u.created_at DESC`;

  const rows = db.query<any>(sql, params);
  res.json({
    success: true,
    data: rows.map(u => ({
      id: u.id,
      title: u.title,
      category: u.category,
      priority: u.priority,
      status: u.status,
      message: u.message,
      responseType: u.response_type,
      responseConfig: u.response_config ? JSON.parse(u.response_config) : null,
      deadlineAt: u.deadline_at,
      scheduledAt: u.scheduled_at,
      publishedAt: u.published_at,
      targetType: u.target_type,
      version: u.version,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      attachmentCount: u.attachment_count,
      metrics: {
        targetedCount: u.targeted_count,
        deliveredCount: u.delivered_count,
        readCount: u.read_count,
        acknowledgedCount: u.acknowledged_count,
        responseSubmittedCount: u.response_submitted_count,
        pendingCount: u.pending_count,
      },
    })),
  });
});

// POST /api/v1/admin/updates
adminRouter.post('/updates', async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      title,
      category,
      priority,
      message,
      targetType, // 'all' or 'selected'
      targetRestaurantIds, // array of IDs if 'selected'
      responseType,
      responseConfig,
      deadlineAt,
      scheduledAt,
      publishNow,
    } = req.body;

    if (!title || !category || !priority || !message || !responseType) {
      return res.status(400).json({ success: false, error: 'Title, category, priority, message, and responseType are required' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let status = 'draft';
    let publishedAt = null;

    if (publishNow) {
      status = 'published';
      publishedAt = now;
    } else if (scheduledAt) {
      status = 'scheduled';
    }

    db.run(
      `INSERT INTO updates (id, title, category, priority, status, message, response_type, response_config, deadline_at, scheduled_at, published_at, target_type, version, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        title,
        category,
        priority,
        status,
        message,
        responseType,
        responseConfig ? JSON.stringify(responseConfig) : null,
        deadlineAt || null,
        scheduledAt || null,
        publishedAt,
        targetType || 'all',
        req.user!.id,
        now,
        now,
      ]
    );

    // If published now, create recipients and send alerts
    if (status === 'published') {
      let targetRestaurants: Array<{ id: string; name: string; email: string }> = [];
      if (targetType === 'selected' && Array.isArray(targetRestaurantIds) && targetRestaurantIds.length > 0) {
        const placeholders = targetRestaurantIds.map(() => '?').join(',');
        targetRestaurants = db.query<any>(`SELECT id, name, email FROM restaurants WHERE id IN (${placeholders})`, targetRestaurantIds);
      } else {
        targetRestaurants = db.query<any>(`SELECT id, name, email FROM restaurants WHERE status = 'active'`);
      }

      for (const r of targetRestaurants) {
        const recipId = crypto.randomUUID();
        db.run(
          `INSERT INTO update_recipients (id, update_id, restaurant_id, status, delivered_at, created_at, updated_at)
           VALUES (?, ?, ?, 'delivered', ?, ?, ?)`,
          [recipId, id, r.id, now, now, now]
        );

        // In-app notification
        NotificationService.createNotification({
          restaurantId: r.id,
          type: priority === 'urgent' ? 'urgent_update' : 'new_update',
          title: priority === 'urgent' ? `[URGENT] ${title}` : `New Update: ${title}`,
          message: message.slice(0, 150) + (message.length > 150 ? '...' : ''),
          data: { updateId: id, priority },
        });

        // Email for urgent updates
        if (priority === 'urgent') {
          EmailService.sendUrgentUpdateEmail(r.email, r.name, title, deadlineAt);
        }
      }
    }

    AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: status === 'published' ? 'PUBLISH_UPDATE' : 'CREATE_UPDATE',
      resourceType: 'update',
      resourceId: id,
      payload: { title, priority, status, targetType },
    });

    res.status(201).json({
      success: true,
      data: { id, title, status, version: 1 },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/updates/:id/attachments
adminRouter.post('/updates/:id/attachments', upload.array('attachments', 10), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const update = db.queryOne<any>(`SELECT id FROM updates WHERE id = ?`, [id]);
  if (!update) {
    return res.status(404).json({ success: false, error: 'Update not found' });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  const uploadedRecords = [];
  const now = new Date().toISOString();

  for (const file of files) {
    const attachmentId = crypto.randomUUID();
    db.run(
      `INSERT INTO update_attachments (id, update_id, file_name, file_type, file_size, storage_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [attachmentId, id, file.originalname, file.mimetype, file.size, file.filename, now]
    );

    uploadedRecords.push({
      id: attachmentId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });
  }

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'UPLOAD_ATTACHMENT',
    resourceType: 'update',
    resourceId: id,
    payload: { count: files.length },
  });

  res.json({ success: true, data: uploadedRecords });
});

// GET /api/v1/admin/updates/:id
adminRouter.get('/updates/:id', (req, res) => {
  const { id } = req.params;
  const u = db.queryOne<any>(`SELECT * FROM updates WHERE id = ?`, [id]);
  if (!u) {
    return res.status(404).json({ success: false, error: 'Update not found' });
  }

  const attachments = db.query<any>(
    `SELECT id, file_name as fileName, file_type as fileType, file_size as fileSize, created_at as createdAt
     FROM update_attachments WHERE update_id = ?`,
    [id]
  );

  const recipients = db.query<any>(
    `SELECT ur.*, r.name as restaurantName, r.email as restaurantEmail, r.code as restaurantCode,
            rr.availability_status as availabilityStatus, rr.answer_text as answerText, rr.submitted_at as submittedAt,
            rr.admin_notes as adminNotes, rr.id as responseId
     FROM update_recipients ur
     JOIN restaurants r ON ur.restaurant_id = r.id
     LEFT JOIN restaurant_responses rr ON rr.update_id = ur.update_id AND rr.restaurant_id = ur.restaurant_id
     WHERE ur.update_id = ?
     ORDER BY r.name ASC`,
    [id]
  );

  const metrics = {
    targetedCount: recipients.length,
    deliveredCount: recipients.filter(r => ['delivered', 'read', 'acknowledged', 'response_submitted', 'response_reviewed'].includes(r.status)).length,
    readCount: recipients.filter(r => ['read', 'acknowledged', 'response_submitted', 'response_reviewed'].includes(r.status)).length,
    acknowledgedCount: recipients.filter(r => ['acknowledged', 'response_submitted', 'response_reviewed'].includes(r.status)).length,
    responseSubmittedCount: recipients.filter(r => ['response_submitted', 'response_reviewed'].includes(r.status)).length,
    pendingCount: recipients.filter(r => !['response_submitted', 'response_reviewed'].includes(r.status)).length,
    overdueCount: recipients.filter(r => r.status === 'overdue' || (u.deadline_at && new Date(u.deadline_at) < new Date() && !['response_submitted', 'response_reviewed'].includes(r.status))).length,
  };

  res.json({
    success: true,
    data: {
      id: u.id,
      title: u.title,
      category: u.category,
      priority: u.priority,
      status: u.status,
      message: u.message,
      responseType: u.response_type,
      responseConfig: u.response_config ? JSON.parse(u.response_config) : null,
      deadlineAt: u.deadline_at,
      scheduledAt: u.scheduled_at,
      publishedAt: u.published_at,
      targetType: u.target_type,
      version: u.version,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      attachments,
      metrics,
      recipients: recipients.map(r => ({
        id: r.id,
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurantName,
        restaurantEmail: r.restaurantEmail,
        restaurantCode: r.restaurantCode,
        status: r.status,
        deliveredAt: r.delivered_at,
        readAt: r.read_at,
        acknowledgedAt: r.acknowledged_at,
        responseSubmittedAt: r.response_submitted_at,
        responseReviewedAt: r.response_reviewed_at,
        responseId: r.responseId,
        availabilityStatus: r.availabilityStatus,
        answerText: r.answerText,
        adminNotes: r.adminNotes,
      })),
    },
  });
});

// POST /api/v1/admin/updates/:id/publish
adminRouter.post('/updates/:id/publish', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const u = db.queryOne<any>(`SELECT * FROM updates WHERE id = ?`, [id]);
    if (!u) {
      return res.status(404).json({ success: false, error: 'Update not found' });
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE updates SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );

    // Target restaurants
    const targetRestaurants = db.query<any>(`SELECT id, name, email FROM restaurants WHERE status = 'active'`);
    for (const r of targetRestaurants) {
      const existing = db.queryOne<any>(
        `SELECT id FROM update_recipients WHERE update_id = ? AND restaurant_id = ?`,
        [id, r.id]
      );

      if (!existing) {
        db.run(
          `INSERT INTO update_recipients (id, update_id, restaurant_id, status, delivered_at, created_at, updated_at)
           VALUES (?, ?, ?, 'delivered', ?, ?, ?)`,
          [crypto.randomUUID(), id, r.id, now, now, now]
        );
      }

      NotificationService.createNotification({
        restaurantId: r.id,
        type: u.priority === 'urgent' ? 'urgent_update' : 'new_update',
        title: u.priority === 'urgent' ? `[URGENT] ${u.title}` : `New Update: ${u.title}`,
        message: u.message.slice(0, 150) + (u.message.length > 150 ? '...' : ''),
        data: { updateId: id, priority: u.priority },
      });

      if (u.priority === 'urgent') {
        EmailService.sendUrgentUpdateEmail(r.email, r.name, u.title, u.deadline_at);
      }
    }

    AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'PUBLISH_UPDATE',
      resourceType: 'update',
      resourceId: id,
    });

    res.json({ success: true, message: 'Update successfully published' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/updates/:id/archive
adminRouter.post('/updates/:id/archive', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  db.run(`UPDATE updates SET status = 'archived', updated_at = ? WHERE id = ?`, [now, id]);

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'ARCHIVE_UPDATE',
    resourceType: 'update',
    resourceId: id,
  });

  res.json({ success: true, message: 'Update archived successfully' });
});

// PATCH /api/v1/admin/updates/:id/responses/:responseId/review
adminRouter.patch('/updates/:id/responses/:responseId/review', (req: AuthenticatedRequest, res) => {
  const { id, responseId } = req.params;
  const { adminNotes } = req.body;

  const response = db.queryOne<any>(`SELECT id, restaurant_id FROM restaurant_responses WHERE id = ? AND update_id = ?`, [responseId, id]);
  if (!response) {
    return res.status(404).json({ success: false, error: 'Response not found' });
  }

  const now = new Date().toISOString();
  db.run(
    `UPDATE restaurant_responses SET status = 'reviewed', reviewed_at = ?, reviewed_by = ?, admin_notes = ?, updated_at = ? WHERE id = ?`,
    [now, req.user!.id, adminNotes || '', now, responseId]
  );

  db.run(
    `UPDATE update_recipients SET status = 'response_reviewed', response_reviewed_at = ?, updated_at = ? WHERE update_id = ? AND restaurant_id = ?`,
    [now, now, id, response.restaurant_id]
  );

  NotificationService.createNotification({
    restaurantId: response.restaurant_id,
    type: 'response_reviewed',
    title: 'Update Response Reviewed',
    message: `Daily Drop Operations has reviewed your submission${adminNotes ? `: "${adminNotes}"` : '.'}`,
    data: { updateId: id },
  });

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'REVIEW_RESPONSE',
    resourceType: 'response',
    resourceId: responseId,
    payload: { adminNotes },
  });

  res.json({ success: true, message: 'Response marked as reviewed' });
});
