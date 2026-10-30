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

    const isOnline = i === 0 ? 1 : 0;
    const lastActiveAt = i === 0 ? now : null;

    db.run(
      `INSERT OR REPLACE INTO restaurants (id, name, code, owner_name, email, phone, status, is_online, last_active_at, address, notes, date_joined, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pre-order catering & daily delivery partner', ?, ?, ?)`,
      [rId, r.name, r.code, r.owner, r.email, r.phone, status, isOnline, lastActiveAt, r.address, now, now, now]
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

  // 7. Seed Live Pre-Orders for Kitchen Display System (KDS)
  const gulatiId = seededRestaurants[0].id;
  const bawarchiId = seededRestaurants[1].id;

  const ordersData = [
    {
      id: 'order-dd-8491',
      restaurant_id: gulatiId,
      order_number: '#DD-8491',
      customer_name: 'Vikram Malhotra',
      customer_phone: '+91 98101 23456',
      delivery_slot: 'Lunch Drop • 12:30 PM',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:15 PM',
      status: 'incoming',
      prep_time_mins: 20,
      items: [
        { name: 'Murgh Makhani Thali', quantity: 2, qty: 2, price: 320, dietary: 'Non-Veg', notes: 'Extra butter on top' },
        { name: 'Garlic Butter Naan', quantity: 4, qty: 4, price: 60, dietary: 'Veg' },
        { name: 'Jeera Pulao', quantity: 2, qty: 2, price: 140, dietary: 'Veg' }
      ],
      subtotal: 1160,
      tax: 58,
      total_amount: 1218,
      special_instructions: 'Pack curries in thermal leakproof containers with green seal.',
      rider_name: 'Aman Sharma',
      rider_phone: '+91 98711 00223',
      rider_status: 'arriving',
      rider_eta_mins: 8,
      dispatch_pin: '8491',
    },
    {
      id: 'order-dd-8492',
      restaurant_id: gulatiId,
      order_number: '#DD-8492',
      customer_name: 'Ananya Roy',
      customer_phone: '+91 98200 33445',
      delivery_slot: 'Lunch Drop • 12:45 PM',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:30 PM',
      status: 'preparing',
      prep_time_mins: 15,
      items: [
        { name: 'Dal Makhani Executive Box', quantity: 3, qty: 3, price: 230, dietary: 'Veg', notes: 'Less spicy gravy' },
        { name: 'Lachha Paratha', quantity: 6, qty: 6, price: 50, dietary: 'Veg' }
      ],
      subtotal: 990,
      tax: 49.5,
      total_amount: 1039.5,
      special_instructions: 'Corporate desk delivery - include eco spoons and napkins.',
      rider_name: 'Rajesh Kumar',
      rider_phone: '+91 99112 44556',
      rider_status: 'assigned',
      rider_eta_mins: 14,
      dispatch_pin: '8492',
    },
    {
      id: 'order-dd-8493',
      restaurant_id: gulatiId,
      order_number: '#DD-8493',
      customer_name: 'Karan Johar',
      customer_phone: '+91 98330 66778',
      delivery_slot: 'Lunch Drop • 01:00 PM',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:45 PM',
      status: 'ready',
      prep_time_mins: 0,
      items: [
        { name: 'Tandoori Chicken Half', quantity: 2, qty: 2, price: 380, dietary: 'Non-Veg' },
        { name: 'Mint Chutney & Salad', quantity: 2, qty: 2, price: 40, dietary: 'Veg' }
      ],
      subtotal: 840,
      tax: 42,
      total_amount: 882,
      special_instructions: 'Box ready on dispatch counter. Tamper seal attached.',
      rider_name: 'Sunil Verma',
      rider_phone: '+91 98440 88990',
      rider_status: 'at_kitchen',
      rider_eta_mins: 2,
      dispatch_pin: '8493',
    },
    {
      id: 'order-dd-8488',
      restaurant_id: gulatiId,
      order_number: '#DD-8488',
      customer_name: 'Rohit Mehta',
      customer_phone: '+91 98111 77889',
      delivery_slot: 'Morning Batch • 11:30 AM',
      delivery_date: 'Today, Oct 30',
      handover_time: '11:15 AM',
      driver_confirmed_at: now,
      status: 'dispatched',
      prep_time_mins: 0,
      items: [
        { name: 'Paneer Tikka Roll', quantity: 4, qty: 4, price: 120, dietary: 'Veg' }
      ],
      subtotal: 480,
      tax: 24,
      total_amount: 504,
      special_instructions: 'Handed to driver Aman.',
      rider_name: 'Aman Sharma',
      rider_phone: '+91 98711 00223',
      rider_status: 'picked_up',
      rider_eta_mins: 0,
      dispatch_pin: '8488',
    },
    {
      id: 'order-dd-8495',
      restaurant_id: bawarchiId,
      order_number: '#DD-8495',
      customer_name: 'Siddharth Rao',
      customer_phone: '+91 98480 99887',
      delivery_slot: 'Lunch Drop • 12:30 PM',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:15 PM',
      status: 'incoming',
      prep_time_mins: 25,
      items: [
        { name: 'Special Hyderabadi Mutton Biryani', quantity: 2, qty: 2, price: 420, dietary: 'Non-Veg' },
        { name: 'Mirchi Ka Salan & Raita', quantity: 2, qty: 2, price: 50, dietary: 'Veg' }
      ],
      subtotal: 940,
      tax: 47,
      total_amount: 987,
      special_instructions: 'Keep hot in insulated carrier bag.',
      rider_name: 'Mohammed Ali',
      rider_phone: '+91 98770 11223',
      rider_status: 'arriving',
      rider_eta_mins: 10,
      dispatch_pin: '8495',
    }
  ];

  for (const o of ordersData) {
    db.run(
      `INSERT OR REPLACE INTO orders (id, restaurant_id, order_number, customer_name, customer_phone, delivery_slot, delivery_date, handover_time, status, prep_time_mins, items_json, subtotal, tax, total_amount, special_instructions, rider_name, rider_phone, rider_status, rider_eta_mins, dispatch_pin, driver_confirmed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.id,
        o.restaurant_id,
        o.order_number,
        o.customer_name,
        o.customer_phone,
        o.delivery_slot,
        o.delivery_date,
        o.handover_time,
        o.status,
        o.prep_time_mins,
        JSON.stringify(o.items),
        o.subtotal,
        o.tax,
        o.total_amount,
        o.special_instructions,
        o.rider_name,
        o.rider_phone,
        o.rider_status,
        o.rider_eta_mins,
        o.dispatch_pin,
        (o as any).driver_confirmed_at || null,
        now,
        now,
      ]
    );
  }

  // 8. Seed Menu Items for 86ing / Availability Control
  const menuData = [
    { id: 'menu-1', restoId: gulatiId, name: 'Murgh Makhani Thali', cat: 'Thali & Combos', price: 320, is_avail: 1, quota: 60, remaining: 42 },
    { id: 'menu-2', restoId: gulatiId, name: 'Dal Makhani Executive Box', cat: 'Thali & Combos', price: 230, is_avail: 1, quota: 80, remaining: 55 },
    { id: 'menu-3', restoId: gulatiId, name: 'Tandoori Chicken Half', cat: 'Tandoor & Starters', price: 380, is_avail: 1, quota: 30, remaining: 12 },
    { id: 'menu-4', restoId: gulatiId, name: 'Shahi Paneer Thali', cat: 'Thali & Combos', price: 290, is_avail: 1, quota: 50, remaining: 35 },
    { id: 'menu-5', restoId: gulatiId, name: 'Paneer Tikka Roll', cat: 'Wraps & Rolls', price: 120, is_avail: 1, quota: 40, remaining: 28 },
    { id: 'menu-6', restoId: gulatiId, name: 'Garlic Butter Naan', cat: 'Breads', price: 60, is_avail: 1, quota: 150, remaining: 110 },
    { id: 'menu-7', restoId: gulatiId, name: 'Kulfi Falooda Special', cat: 'Desserts', price: 140, is_avail: 0, quota: 25, remaining: 0 },
  ];

  for (const m of menuData) {
    db.run(
      `INSERT OR REPLACE INTO menu_items (id, restaurant_id, name, category, price, is_available, daily_quota, remaining_quota, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.restoId, m.name, m.cat, m.price, m.is_avail, m.quota, m.remaining, now, now]
    );
  }

  // 9. Seed Weekly Payouts & Settlement Reconciliation
  const payoutsData = [
    {
      id: 'payout-w43',
      restoId: gulatiId,
      start: '2026-10-16',
      end: '2026-10-22',
      orders: 76,
      gross: 38450,
      comm: 5767.5,
      subsidy: 1140,
      net: 33822.5,
      status: 'pending',
      date: '2026-10-24',
    },
    {
      id: 'payout-w42',
      restoId: gulatiId,
      start: '2026-10-09',
      end: '2026-10-15',
      orders: 112,
      gross: 54200,
      comm: 8130,
      subsidy: 1680,
      net: 47750,
      status: 'paid',
      date: '2026-10-17',
    },
    {
      id: 'payout-w41',
      restoId: gulatiId,
      start: '2026-10-02',
      end: '2026-10-08',
      orders: 98,
      gross: 48900,
      comm: 7335,
      subsidy: 1470,
      net: 43035,
      status: 'paid',
      date: '2026-10-10',
    }
  ];

  for (const p of payoutsData) {
    db.run(
      `INSERT OR REPLACE INTO payouts (id, restaurant_id, period_start, period_end, total_orders, gross_amount, commission_rate, commission_amount, packaging_subsidy, net_payout, status, payout_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0.15, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.restoId, p.start, p.end, p.orders, p.gross, p.comm, p.subsidy, p.net, p.status, p.date, now]
    );
  }

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
