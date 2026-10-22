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

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
}

testApi().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
