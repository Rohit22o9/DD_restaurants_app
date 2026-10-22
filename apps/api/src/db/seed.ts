import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from './database';
import { config } from '../config';

export async function runSeed() {
  console.log('[SEED] Starting Daily Drop database seeding...');

  const now = new Date().toISOString();
  const deadline4h = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
  const deadlineTomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const pastDeadline = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

  // 1. Create Admin Account
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('DailyDropAdmin2026!', adminSalt);
  const adminId = 'dd-admin-001';

  db.run(
    `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, status, must_change_password, created_at, updated_at)
     VALUES (?, 'admin@dailydrop.com', ?, 'Daily Drop Head of Ops', 'admin', 'active', 0, ?, ?)`,
    [adminId, adminHash, now, now]
  );

  // 2. Restaurants from Meals list.xlsx
  const restaurantsData = [
    { name: "Gulati's Indian Kitchen", code: "DD-GULT-101", owner: "Harpreet Gulati", email: "gulati@restaurant.dailydrop.com", phone: "+91 98110 22331", address: "Pandara Road Market, New Delhi" },
    { name: "Bawarchi Biryani", code: "DD-BAWR-102", owner: "Mohammad Irfan", email: "bawarchi@restaurant.dailydrop.com", phone: "+91 98490 12345", address: "RTC X Roads, Hyderabad" },
    { name: "Xee La", code: "DD-XEEL-103", owner: "Tenzin Dorjee", email: "partner@xeela.dailydrop.com", phone: "+91 99100 88224", address: "Majnu Ka Tilla, New Delhi" },
    { name: "Vizio Pasta", code: "DD-VIZI-104", owner: "Marco Rossi", email: "partner@vizio.dailydrop.com", phone: "+91 98200 44119", address: "Bandra West, Mumbai" },
    { name: "G'Fun Cafe - Famous Chicken Rice", code: "DD-GFUN-105", owner: "Chef Jeremy Tan", email: "partner@gfun.dailydrop.com", phone: "+91 97110 33882", address: "Koramangala 5th Block, Bengaluru" },
    { name: "Tie Twist", code: "DD-TIET-106", owner: "Priya Sharma", email: "partner@tietwist.dailydrop.com", phone: "+91 99300 55776", address: "Indiranagar 100ft Rd, Bengaluru" },
    { name: "Korean Meal", code: "DD-KORM-107", owner: "Kim Min-jun", email: "partner@koreanmeal.dailydrop.com", phone: "+91 98880 77112", address: "Humayunpur, Safdarjung, New Delhi" },
    { name: "Late Night Ramen", code: "DD-RAMN-108", owner: "Kenji Sato", email: "partner@ramen.dailydrop.com", phone: "+91 97770 99443", address: "Jubilee Hills, Hyderabad" },
    { name: "Sedap", code: "DD-SEDA-109", owner: "Nurul Aini", email: "partner@sedap.dailydrop.com", phone: "+91 96660 33221", address: "Connaught Place, New Delhi" },
  ];

  const partnerSalt = await bcrypt.genSalt(10);
  const partnerHash = await bcrypt.hash('PartnerPass2026!', partnerSalt);

  const seededRestaurants: Array<{ id: string; name: string; code: string; email: string }> = [];

  for (let i = 0; i < restaurantsData.length; i++) {
    const r = restaurantsData[i];
    const rId = `dd-resto-${i + 1}`;
    const status = i < 7 ? 'active' : (i === 7 ? 'pending_invitation' : 'active');

    db.run(
      `INSERT OR REPLACE INTO restaurants (id, name, code, owner_name, email, phone, status, address, notes, date_joined, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pre-order catering & daily delivery partner', ?, ?, ?)`,
      [rId, r.name, r.code, r.owner, r.email, r.phone, status, r.address, now, now, now]
    );

    seededRestaurants.push({ id: rId, name: r.name, code: r.code, email: r.email });

    // Seed User account for Gulati's and Bawarchi
    if (i === 0 || i === 1) {
      const userId = `dd-user-resto-${i + 1}`;
      db.run(
        `INSERT OR REPLACE INTO users (id, email, password_hash, name, role, status, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'restaurant_partner', 'active', 0, ?, ?)`,
        [userId, r.email, partnerHash, r.owner, now, now]
      );

      db.run(
        `INSERT OR REPLACE INTO restaurant_memberships (id, restaurant_id, user_id, role, is_primary, created_at)
         VALUES (?, ?, ?, 'owner', 1, ?)`,
        [`dd-mem-${i + 1}`, rId, userId, now]
      );
    }
  }

  // 3. Seed an active Invitation Token for Xee La
  const xeeLa = seededRestaurants[2];
  db.run(
    `INSERT OR REPLACE INTO invitations (id, restaurant_id, email, token, role, expires_at, status, created_by, created_at)
     VALUES ('dd-inv-001', ?, ?, 'xeela-invite-demo-2026', 'restaurant_partner', ?, 'pending', ?, ?)`,
    [xeeLa.id, xeeLa.email, deadlineTomorrow, adminId, now]
  );

  // 4. Seed Attachment File in uploads/attachments
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  const sampleSource = path.resolve(__dirname, '../../../sample_attachments/Daily_Drop_Meal_Schedule_W43.xlsx');
  const storedFilename = 'Daily_Drop_Meal_Schedule_W43.xlsx';
  const targetUploadPath = path.resolve(config.uploadDir, storedFilename);

  if (fs.existsSync(sampleSource)) {
    fs.copyFileSync(sampleSource, targetUploadPath);
  } else {
    fs.writeFileSync(targetUploadPath, 'Sample Daily Drop Meal Planning Schedule Data');
  }

  const stat = fs.statSync(targetUploadPath);

  // 5. Seed Realistic Updates
  const updatesData = [
    {
      id: 'update-urgent-meal-planning-01',
      title: 'Urgent: W43 Daily Pre-Order Quantity & Kitchen Capacity Confirmation',
      category: 'Meal Planning',
      priority: 'urgent',
      status: 'published',
      message: `Team Daily Drop requires your immediate confirmation for Week 43 meal planning batch allocations.

**Action Required:**
1. Download the attached schedule spreadsheet (**Daily_Drop_Meal_Schedule_W43.xlsx**).
2. Check your daily lunchtime pre-order quotas (11:30 AM - 1:30 PM).
3. Confirm whether your kitchen can commit to 100% capacity or report any specific dish/ingredient constraints.

Deadline is strictly enforced to calibrate delivery driver assignments. Thank you for your continued partnership!`,
      responseType: 'availability_confirmation',
      responseConfig: JSON.stringify({
        requiresQuantity: true,
        requiresNotes: true,
        promptQuestion: 'Can your kitchen commit to the scheduled order quota for Monday through Friday?',
      }),
      deadlineAt: deadline4h,
      publishedAt: now,
      hasAttachment: true,
    },
    {
      id: 'update-packaging-quality-02',
      title: 'Mandatory Quality Standard: Eco-Friendly Thermal Seal Packaging',
      category: 'Packaging and Food Quality',
      priority: 'high',
      status: 'published',
      message: `Effective Monday, all hot bowl meals and curries must be packed using Daily Drop standard green thermal-sealed lids with tamper-evident stickers.

- Verify lid seals before placing items in driver transfer racks.
- Damaged or loose seals will result in delivery rejection.
- Acknowledge this update to certify that your packaging station has received the new packaging guidelines.`,
      responseType: 'acknowledgement_only',
      responseConfig: null,
      deadlineAt: deadlineTomorrow,
      publishedAt: now,
      hasAttachment: false,
    },
    {
      id: 'update-kitchen-hours-03',
      title: 'Weekend Operational Hours & Order Slot Extension Survey',
      category: 'Kitchen Operations',
      priority: 'important',
      status: 'published',
      message: `Due to heightened customer demand during festive weekends, Daily Drop is evaluating extended pre-order fulfillment slots. Please indicate your restaurant's preferred schedule for the upcoming weekend.`,
      responseType: 'multiple_choice',
      responseConfig: JSON.stringify({
        options: [
          'Accept extended weekend hours (10:00 PM - 1:00 AM)',
          'Maintain regular kitchen hours only (Up to 10:30 PM)',
          'Can accommodate extended hours with adjusted minimum order size',
        ],
      }),
      deadlineAt: deadlineTomorrow,
      publishedAt: now,
      hasAttachment: false,
    },
    {
      id: 'update-system-announcement-04',
      title: 'Welcome to Daily Drop Partner Portal 2.0',
      category: 'Training and Announcements',
      priority: 'normal',
      status: 'published',
      message: `We are proud to introduce the brand new Daily Drop Restaurant Partner management application.

Key highlights:
- Real-time urgent alerts and operational updates.
- Streamlined one-touch meal planning acknowledgements.
- Direct attachment downloads for prep sheets and recipes.
- In-app notification center and submission tracking.

For any questions, reach out to your Daily Drop Partner Success Manager.`,
      responseType: 'announcement_only',
      responseConfig: null,
      deadlineAt: null,
      publishedAt: now,
      hasAttachment: false,
    },
  ];

  for (const u of updatesData) {
    db.run(
      `INSERT OR REPLACE INTO updates (id, title, category, priority, status, message, response_type, response_config, deadline_at, published_at, target_type, version, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'all', 1, ?, ?, ?)`,
      [
        u.id,
        u.title,
        u.category,
        u.priority,
        u.status,
        u.message,
        u.responseType,
        u.responseConfig,
        u.deadlineAt,
        u.publishedAt,
        adminId,
        now,
        now,
      ]
    );

    if (u.hasAttachment) {
      db.run(
        `INSERT OR REPLACE INTO update_attachments (id, update_id, file_name, file_type, file_size, storage_path, created_at)
         VALUES (?, ?, ?, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ?, ?, ?)`,
        [`att-${u.id}`, u.id, 'Daily_Drop_Meal_Schedule_W43.xlsx', stat.size, storedFilename, now]
      );
    }

    // Seed recipients for all active restaurants
    for (let rIdx = 0; rIdx < seededRestaurants.length; rIdx++) {
      const resto = seededRestaurants[rIdx];
      const recipId = `recip-${u.id}-${resto.id}`;

      // Set different states to provide rich dashboard metrics
      let recipientStatus = 'delivered';
      let readAt: string | null = null;
      let acknowledgedAt: string | null = null;
      let responseSubmittedAt: string | null = null;

      if (rIdx === 0) {
        // Gulati's Indian Kitchen has submitted a response for the urgent update!
        recipientStatus = 'response_submitted';
        readAt = now;
        acknowledgedAt = now;
        responseSubmittedAt = now;
      } else if (rIdx === 1) {
        // Bawarchi Biryani has read it, ready for user live testing
        recipientStatus = 'read';
        readAt = now;
      } else if (rIdx === 2) {
        recipientStatus = 'delivered';
      }

      db.run(
        `INSERT OR REPLACE INTO update_recipients (id, update_id, restaurant_id, status, delivered_at, read_at, acknowledged_at, response_submitted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipId, u.id, resto.id, recipientStatus, now, readAt, acknowledgedAt, responseSubmittedAt, now, now]
      );

      // In-app notifications
      db.run(
        `INSERT OR REPLACE INTO in_app_notifications (id, restaurant_id, type, title, message, data, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          `notif-${u.id}-${resto.id}`,
          resto.id,
          u.priority === 'urgent' ? 'urgent_update' : 'new_update',
          u.priority === 'urgent' ? `[URGENT] ${u.title}` : u.title,
          u.message.slice(0, 100) + '...',
          JSON.stringify({ updateId: u.id, priority: u.priority }),
          now,
        ]
      );
    }
  }

  // 6. Pre-seed Gulati's Submitted Response for Update 1
  db.run(
    `INSERT OR REPLACE INTO restaurant_responses (id, update_id, restaurant_id, user_id, response_type, status, availability_status, availability_details, answer_text, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, 'dd-user-resto-1', 'availability_confirmation', 'submitted', 'available', ?, ?, ?, ?, ?)`,
    [
      'resp-gulat-01',
      'update-urgent-meal-planning-01',
      seededRestaurants[0].id,
      JSON.stringify({ maxCapacity: 150, availableFrom: '08:30', availableTo: '14:30' }),
      'Kitchen fully prepared. Special tandoori biryani and butter chicken prep schedule starts at 8:30 AM.',
      now,
      now,
      now,
    ]
  );

  console.log('[SEED] Database seeding completed successfully!');
  console.log('--- DEFAULT CREDENTIALS ---');
  console.log('Admin Account:      admin@dailydrop.com / DailyDropAdmin2026!');
  console.log('Gulati Partner:     gulati@restaurant.dailydrop.com / PartnerPass2026!');
  console.log('Bawarchi Partner:   bawarchi@restaurant.dailydrop.com / PartnerPass2026!');
  console.log('Xee La Invite Link: http://localhost:5173/setup-password?token=xeela-invite-demo-2026');
  console.log('---------------------------');
}

// Allow direct CLI execution
if (require.main === module) {
  runSeed().catch(console.error);
}
