import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db/database';
import { User, Restaurant } from '@dailydrop/shared';

export interface AuthenticatedRequest extends Request {
  user?: User;
  restaurant?: Restaurant;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const userRow = db.queryOne<any>(
      `SELECT id, email, name, role, status, must_change_password, created_at, updated_at FROM users WHERE id = ?`,
      [decoded.userId]
    );

    if (!userRow) {
      return res.status(401).json({ success: false, error: 'User account not found' });
    }

    if (userRow.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'Account has been suspended. Please contact Daily Drop Operations.' });
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      status: userRow.status,
      mustChangePassword: Boolean(userRow.must_change_password),
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };

    if (req.user.role === 'restaurant_partner') {
      const membership = db.queryOne<any>(
        `SELECT r.id, r.name, r.code, r.owner_name, r.email, r.phone, r.status, r.address, r.notes, r.date_joined, r.created_at, r.updated_at
         FROM restaurant_memberships rm
         JOIN restaurants r ON rm.restaurant_id = r.id
         WHERE rm.user_id = ?
         LIMIT 1`,
        [req.user.id]
      );

      if (membership) {
        req.restaurant = {
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

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden: Daily Drop Administrator privileges required' });
  }
  next();
}

export function requireRestaurantPartner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'restaurant_partner' || !req.restaurant) {
    return res.status(403).json({ success: false, error: 'Forbidden: Active Restaurant Partner account required' });
  }
  if (req.restaurant.status === 'suspended') {
    return res.status(403).json({ success: false, error: 'Restaurant account is suspended' });
  }
  next();
}
