import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { AuditService } from '../services/auditService';

export const deliveryRouter = Router();

// POST /api/v1/delivery/orders/:id/confirm-receipt
// Direct delivery driver endpoint to confirm receipt/pickup of an order
deliveryRouter.post('/orders/:id/confirm-receipt', (req, res) => {
  const { id } = req.params;
  const { driverName } = req.body || {};

  const order = db.queryOne<any>(`SELECT * FROM orders WHERE id = ?`, [id]);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const now = new Date().toISOString();
  const rider = driverName || order.rider_name || 'Assigned Delivery Driver';

  db.run(
    `UPDATE orders 
     SET status = 'dispatched', 
         rider_status = 'picked_up', 
         driver_confirmed_at = ?, 
         rider_name = ?,
         updated_at = ? 
     WHERE id = ?`,
    [now, rider, now, id]
  );

  // Send real-time notification to the restaurant app
  const notifId = crypto.randomUUID();
  db.run(
    `INSERT INTO in_app_notifications (id, recipient_user_id, restaurant_id, type, title, message, data, is_read, created_at)
     VALUES (?, NULL, ?, 'driver_pickup_confirmed', ?, ?, ?, 0, ?)`,
    [
      notifId,
      order.restaurant_id,
      `Driver Picked Up Order ${order.order_number}`,
      `Driver ${rider} has confirmed receipt of order ${order.order_number}. Order successfully dispatched!`,
      JSON.stringify({ orderId: order.id, orderNumber: order.order_number, riderName: rider, confirmedAt: now }),
      now,
    ]
  );

  AuditService.log({
    userId: 'delivery-driver-app',
    userEmail: 'driver@delivery.dailydrop.com',
    action: 'DRIVER_CONFIRMED_PICKUP',
    resourceType: 'order',
    resourceId: id,
    payload: { rider, orderNumber: order.order_number, timestamp: now },
  });

  return res.json({
    success: true,
    message: `Driver receipt confirmed! Restaurant notified of successful handover for ${order.order_number}.`,
    data: {
      orderId: order.id,
      orderNumber: order.order_number,
      riderName: rider,
      status: 'dispatched',
      driverConfirmedAt: now,
    },
  });
});

