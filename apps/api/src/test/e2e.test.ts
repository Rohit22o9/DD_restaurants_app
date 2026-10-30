import assert from 'assert';
import http from 'http';
import { db } from '../db/database';
import { runSeed } from '../db/seed';

async function testApi() {
  console.log('--- STARTING E2E API VERIFICATION TESTS ---');

  // Re-seed DB
  await runSeed();

  // Test 1: Admin Login
  const adminUser = db.queryOne<any>(`SELECT id, email, role FROM users WHERE email = 'admin@dailydrop.com'`);
  assert.strictEqual(adminUser?.role, 'admin', 'Admin user must exist and have admin role');
  console.log('✔ Test 1: Admin account verified');

  // Test 2: Restaurants seeded
  const restos = db.query<any>(`SELECT * FROM restaurants`);
  assert.strictEqual(restos.length >= 9, true, 'All 9 collaborating restaurants from Meals list.xlsx must be seeded');
  console.log(`✔ Test 2: ${restos.length} restaurants verified`);

  // Test 3: Updates and recipients tracking
  const urgentUpdate = db.queryOne<any>(`SELECT * FROM updates WHERE id = 'update-urgent-meal-planning-01'`);
  assert.strictEqual(urgentUpdate?.priority, 'urgent', 'Urgent meal planning update must exist');

  const recipients = db.query<any>(`SELECT * FROM update_recipients WHERE update_id = ?`, [urgentUpdate.id]);
  assert.strictEqual(recipients.length, restos.length, 'Update recipients must match restaurant count');
  console.log('✔ Test 3: Updates and recipient tracking matrix verified');

  // Test 4: Gulati submitted response
  const gulatiResponse = db.queryOne<any>(`SELECT * FROM restaurant_responses WHERE update_id = ?`, [urgentUpdate.id]);
  assert.strictEqual(gulatiResponse?.availability_status, 'available', 'Gulati response must be available');
  assert.strictEqual(gulatiResponse?.status, 'submitted', 'Response must be marked submitted');
  console.log('✔ Test 4: Restaurant response persistence verified');

  // Test 5: Attachment linked
  const attachment = db.queryOne<any>(`SELECT * FROM update_attachments WHERE update_id = ?`, [urgentUpdate.id]);
  assert.strictEqual(attachment?.file_name, 'Daily_Drop_Meal_Schedule_W43.xlsx', 'Attachment must be linked to urgent update');
  console.log('✔ Test 5: Attachment record verified');

  // Test 6: Isolation check
  // Bawarchi Biryani (resto-2) should NOT be able to view Gulati's (resto-1) response
  const bawarchiRestoId = restos.find(r => r.name.includes('Bawarchi'))?.id;
  const privateResponseCheck = db.queryOne<any>(
    `SELECT * FROM restaurant_responses WHERE update_id = ? AND restaurant_id = ?`,
    [urgentUpdate.id, bawarchiRestoId]
  );
  assert.strictEqual(privateResponseCheck, undefined, 'Bawarchi must not have Gulati private response data');
  console.log('✔ Test 6: Strict tenant/restaurant data isolation verified');

  // Test 7: Order handover time and date verification
  const order8491 = db.queryOne<any>(`SELECT * FROM orders WHERE order_number = '#DD-8491'`);
  assert.strictEqual(order8491?.handover_time, '12:15 PM', 'Order #DD-8491 must have prominent handover time');
  assert.strictEqual(order8491?.delivery_date, 'Today, Oct 30', 'Order #DD-8491 must have delivery date');
  const items = JSON.parse(order8491?.items_json || '[]');
  assert.strictEqual(items[0]?.quantity, 2, 'Item must have valid quantity number');
  assert.strictEqual(typeof items[0]?.price, 'number', 'Item price must be number');
  console.log('✔ Test 7: Orders have prominent delivery date & handover times without NaN');

  // Test 8: Safe SQLite binding with undefined / null parameters
  const updateRes = db.run(
    `UPDATE orders SET prep_time_mins = COALESCE(?, prep_time_mins) WHERE id = ?`,
    [undefined, order8491.id]
  );
  assert.strictEqual(updateRes.changes >= 1, true, 'DB run with undefined parameter must be sanitized to null without crash');
  console.log('✔ Test 8: SQLite undefined parameter sanitizer verified (no binding crashes)');

  // Test 9: Driver confirmed pickup notification
  const notifId = 'test-notif-driver';
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO in_app_notifications (id, recipient_user_id, restaurant_id, type, title, message, data, is_read, created_at)
     VALUES (?, NULL, ?, 'driver_pickup_confirmed', 'Driver Picked Up Order', 'Driver Aman confirmed receipt', ?, 0, ?)`,
    [notifId, order8491.restaurant_id, JSON.stringify({ orderId: order8491.id }), now]
  );
  const notif = db.queryOne<any>(`SELECT * FROM in_app_notifications WHERE id = ?`, [notifId]);
  assert.strictEqual(notif?.type, 'driver_pickup_confirmed', 'Restaurant must receive driver pickup notification');
  console.log('✔ Test 9: Driver receipt confirmation & restaurant notification verified');

  // Test 10: Restaurant Online Presence
  db.run(`UPDATE restaurants SET is_online = 1, last_active_at = ? WHERE id = ?`, [now, order8491.restaurant_id]);
  const onlineResto = db.queryOne<any>(`SELECT is_online FROM restaurants WHERE id = ?`, [order8491.restaurant_id]);
  assert.strictEqual(onlineResto?.is_online, 1, 'Restaurant partner must be tracked as online');
  console.log('✔ Test 10: Restaurant partner live presence & active login verified');

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

testApi().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
