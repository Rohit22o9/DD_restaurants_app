import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/database';
import { config } from '../config';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { EmailService } from '../services/emailService';
import { AuditService } from '../services/auditService';

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.queryOne<any>(
      `SELECT id, email, password_hash, name, role, status, must_change_password, created_at, updated_at
       FROM users WHERE lower(email) = ?`,
      [normalizedEmail]
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Account suspended. Please contact Daily Drop Operations.' });
    }

    if (user.status === 'pending_invitation') {
      return res.status(403).json({ success: false, error: 'Account pending invitation setup. Please use your email invitation link.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    let restaurant = null;
    if (user.role === 'restaurant_partner') {
      const membership = db.queryOne<any>(
        `SELECT r.id, r.name, r.code, r.owner_name, r.email, r.phone, r.status, r.address, r.notes, r.date_joined
         FROM restaurant_memberships rm
         JOIN restaurants r ON rm.restaurant_id = r.id
         WHERE rm.user_id = ?
         LIMIT 1`,
        [user.id]
      );
      if (membership) {
        const now = new Date().toISOString();
        db.run(`UPDATE restaurants SET is_online = 1, last_active_at = ? WHERE id = ?`, [now, membership.id]);
        restaurant = {
          id: membership.id,
          name: membership.name,
          code: membership.code,
          ownerName: membership.owner_name,
          email: membership.email,
          phone: membership.phone,
          status: membership.status,
          address: membership.address,
          notes: membership.notes,
          dateJoined: membership.date_joined,
        };
      }
    }

    AuditService.log({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: user.id,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mustChangePassword: Boolean(user.must_change_password),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      restaurant,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.user,
    restaurant: req.restaurant || null,
  });
});

// POST /api/v1/auth/accept-invitation
authRouter.post('/accept-invitation', async (req, res, next) => {
  try {
    const { token, password, name } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    const invitation = db.queryOne<any>(
      `SELECT id, restaurant_id, email, token, expires_at, status FROM invitations WHERE token = ?`,
      [token]
    );

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invalid invitation link' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'This invitation has already been used or expired' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Invitation link has expired. Please request a new invitation.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();

    let user = db.queryOne<any>(`SELECT id, email FROM users WHERE lower(email) = ?`, [invitation.email.toLowerCase()]);
    let userId = user ? user.id : crypto.randomUUID();

    if (user) {
      db.run(
        `UPDATE users SET password_hash = ?, status = 'active', must_change_password = 0, updated_at = ? WHERE id = ?`,
        [passwordHash, now, userId]
      );
    } else {
      db.run(
        `INSERT INTO users (id, email, password_hash, name, role, status, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'restaurant_partner', 'active', 0, ?, ?)`,
        [userId, invitation.email.toLowerCase(), passwordHash, name || 'Restaurant Owner', now, now]
      );
    }

    // Check membership
    const membership = db.queryOne<any>(
      `SELECT id FROM restaurant_memberships WHERE restaurant_id = ? AND user_id = ?`,
      [invitation.restaurant_id, userId]
    );

    if (!membership) {
      db.run(
        `INSERT INTO restaurant_memberships (id, restaurant_id, user_id, role, is_primary, created_at)
         VALUES (?, ?, ?, 'owner', 1, ?)`,
        [crypto.randomUUID(), invitation.restaurant_id, userId, now]
      );
    }

    // Mark invitation accepted
    db.run(
      `UPDATE invitations SET status = 'accepted', accepted_at = ? WHERE id = ?`,
      [now, invitation.id]
    );

    // Update restaurant status to active if pending
    db.run(
      `UPDATE restaurants SET status = 'active', updated_at = ? WHERE id = ? AND status = 'pending_invitation'`,
      [now, invitation.restaurant_id]
    );

    const sessionToken = jwt.sign(
      { userId, email: invitation.email, role: 'restaurant_partner' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const restaurant = db.queryOne<any>(
      `SELECT id, name, code, owner_name, email, phone, status, address, notes, date_joined FROM restaurants WHERE id = ?`,
      [invitation.restaurant_id]
    );

    AuditService.log({
      userId,
      userEmail: invitation.email,
      action: 'ACCEPT_INVITATION',
      resourceType: 'restaurant',
      resourceId: invitation.restaurant_id,
    });

    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: userId,
        email: invitation.email,
        name: name || 'Restaurant Owner',
        role: 'restaurant_partner',
        status: 'active',
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      },
      restaurant,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/change-password
authRouter.post('/change-password', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long' });
    }

    const user = db.queryOne<any>(`SELECT password_hash FROM users WHERE id = ?`, [req.user!.id]);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    const now = new Date().toISOString();

    db.run(
      `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?`,
      [newHash, now, req.user!.id]
    );

    AuditService.log({
      userId: req.user!.id,
      userEmail: req.user!.email,
      action: 'CHANGE_PASSWORD',
      resourceType: 'user',
      resourceId: req.user!.id,
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/forgot-password
authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = db.queryOne<any>(`SELECT id, email, name FROM users WHERE lower(email) = ?`, [email.toLowerCase().trim()]);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
      await EmailService.sendPasswordResetEmail(user.email, resetUrl);
    }

    // Always return success for security (prevent email enumeration)
    res.json({ success: true, message: 'If this email is registered, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', authenticate, (req: AuthenticatedRequest, res) => {
  const now = new Date().toISOString();
  if (req.user?.role === 'restaurant_partner') {
    const membership = db.queryOne<any>(
      `SELECT restaurant_id FROM restaurant_memberships WHERE user_id = ?`,
      [req.user.id]
    );
    if (membership) {
      db.run(`UPDATE restaurants SET is_online = 0, last_active_at = ? WHERE id = ?`, [now, membership.restaurant_id]);
    }
  }

  AuditService.log({
    userId: req.user!.id,
    userEmail: req.user!.email,
    action: 'LOGOUT',
    resourceType: 'user',
    resourceId: req.user!.id,
  });

  res.json({ success: true, message: 'Logged out successfully' });
});
