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

  // 2. Restaurants from Meals list.xlsx (Perth, Western Australia)
  const restaurantsData = [
    { name: "Gulati's Indian Kitchen", code: "DD-GULT-101", owner: "Harpreet Gulati", email: "gulati@restaurant.dailydrop.com", phone: "+61 412 345 678", address: "142 St Georges Terrace, Perth CBD WA 6000" },
    { name: "Bawarchi Biryani", code: "DD-BAWR-102", owner: "Mohammad Irfan", email: "bawarchi@restaurant.dailydrop.com", phone: "+61 498 765 432", address: "78 James Street, Northbridge WA 6003" },
    { name: "Xee La", code: "DD-XEEL-103", owner: "Tenzin Dorjee", email: "partner@xeela.dailydrop.com", phone: "+61 422 113 445", address: "23 South Terrace, Fremantle WA 6160" },
    { name: "Vizio Pasta", code: "DD-VIZI-104", owner: "Marco Rossi", email: "partner@vizio.dailydrop.com", phone: "+61 433 998 776", address: "115 Oxford Street, Leederville WA 6007" },
    { name: "G'Fun Cafe - Famous Chicken Rice", code: "DD-GFUN-105", owner: "Chef Jeremy Tan", email: "partner@gfun.dailydrop.com", phone: "+61 455 667 889", address: "34 Subiaco Square, Subiaco WA 6008" },
    { name: "Tie Twist", code: "DD-TIET-106", owner: "Priya Sharma", email: "partner@tietwist.dailydrop.com", phone: "+61 477 223 344", address: "55 Beaufort Street, Mount Lawley WA 6050" },
    { name: "Korean Meal", code: "DD-KORM-107", owner: "Kim Min-jun", email: "partner@koreanmeal.dailydrop.com", phone: "+61 488 445 566", address: "12 Albany Highway, Victoria Park WA 6100" },
    { name: "Late Night Ramen", code: "DD-RAMN-108", owner: "Kenji Sato", email: "partner@ramen.dailydrop.com", phone: "+61 499 556 677", address: "88 Barrack Street, Perth CBD WA 6000" },
    { name: "Sedap", code: "DD-SEDA-109", owner: "Nurul Aini", email: "partner@sedap.dailydrop.com", phone: "+61 411 778 899", address: "45 Market Street, Fremantle WA 6160" },
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

  // 7. Seed Live Pre-Orders for Kitchen Display System (KDS) - Perth (AWST) & AUD
  const gulatiId = seededRestaurants[0].id;
  const bawarchiId = seededRestaurants[1].id;

  const ordersData = [
    {
      id: 'order-dd-8491',
      restaurant_id: gulatiId,
      order_number: '#DD-8491',
      customer_name: 'Liam Henderson',
      customer_phone: '+61 411 223 344',
      delivery_slot: 'Lunch Drop • 12:30 PM (AWST)',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:15 PM',
      status: 'incoming',
      prep_time_mins: 20,
      items: [
        { name: 'Murgh Makhani Thali', quantity: 2, qty: 2, price: 18.5, dietary: 'Non-Veg', notes: 'Extra butter on top' },
        { name: 'Garlic Butter Naan', quantity: 4, qty: 4, price: 4.5, dietary: 'Veg' },
        { name: 'Jeera Pulao', quantity: 2, qty: 2, price: 6.5, dietary: 'Veg' }
      ],
      subtotal: 68.0,
      tax: 6.8,
      total_amount: 74.8,
      special_instructions: 'Pack curries in thermal leakproof containers with green seal.',
      rider_name: 'Jack Davies',
      rider_phone: '+61 422 334 455',
      rider_status: 'arriving',
      rider_eta_mins: 8,
      dispatch_pin: '8491',
    },
    {
      id: 'order-dd-8492',
      restaurant_id: gulatiId,
      order_number: '#DD-8492',
      customer_name: 'Chloe Williams',
      customer_phone: '+61 433 445 566',
      delivery_slot: 'Lunch Drop • 12:45 PM (AWST)',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:30 PM',
      status: 'preparing',
      prep_time_mins: 15,
      items: [
        { name: 'Dal Makhani Executive Box', quantity: 3, qty: 3, price: 16.0, dietary: 'Veg', notes: 'Mild gravy' },
        { name: 'Lachha Paratha', quantity: 6, qty: 6, price: 4.0, dietary: 'Veg' }
      ],
      subtotal: 72.0,
      tax: 7.2,
      total_amount: 79.2,
      special_instructions: 'Corporate desk delivery - include eco cutlery and napkins.',
      rider_name: 'Oliver Smith',
      rider_phone: '+61 444 556 677',
      rider_status: 'assigned',
      rider_eta_mins: 14,
      dispatch_pin: '8492',
    },
    {
      id: 'order-dd-8493',
      restaurant_id: gulatiId,
      order_number: '#DD-8493',
      customer_name: 'Noah Taylor',
      customer_phone: '+61 455 667 788',
      delivery_slot: 'Lunch Drop • 01:00 PM (AWST)',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:45 PM',
      status: 'ready',
      prep_time_mins: 0,
      items: [
        { name: 'Tandoori Chicken Half', quantity: 2, qty: 2, price: 17.5, dietary: 'Non-Veg' },
        { name: 'Mint Chutney & Salad', quantity: 2, qty: 2, price: 3.5, dietary: 'Veg' }
      ],
      subtotal: 42.0,
      tax: 4.2,
      total_amount: 46.2,
      special_instructions: 'Box ready on dispatch counter. Tamper seal attached.',
      rider_name: 'Ethan Brown',
      rider_phone: '+61 466 778 899',
      rider_status: 'at_kitchen',
      rider_eta_mins: 2,
      dispatch_pin: '8493',
    },
    {
      id: 'order-dd-8488',
      restaurant_id: gulatiId,
      order_number: '#DD-8488',
      customer_name: 'Mason Clarke',
      customer_phone: '+61 477 889 900',
      delivery_slot: 'Morning Batch • 11:30 AM (AWST)',
      delivery_date: 'Today, Oct 30',
      handover_time: '11:15 AM',
      driver_confirmed_at: now,
      status: 'dispatched',
      prep_time_mins: 0,
      items: [
        { name: 'Paneer Tikka Roll', quantity: 4, qty: 4, price: 12.5, dietary: 'Veg' }
      ],
      subtotal: 50.0,
      tax: 5.0,
      total_amount: 55.0,
      special_instructions: 'Handed to driver Jack.',
      rider_name: 'Jack Davies',
      rider_phone: '+61 422 334 455',
      rider_status: 'picked_up',
      rider_eta_mins: 0,
      dispatch_pin: '8488',
    },
    {
      id: 'order-dd-8495',
      restaurant_id: bawarchiId,
      order_number: '#DD-8495',
      customer_name: 'Sophie Martin',
      customer_phone: '+61 488 990 011',
      delivery_slot: 'Lunch Drop • 12:30 PM (AWST)',
      delivery_date: 'Today, Oct 30',
      handover_time: '12:15 PM',
      status: 'incoming',
      prep_time_mins: 25,
      items: [
        { name: 'Special Hyderabadi Mutton Biryani', quantity: 2, qty: 2, price: 21.0, dietary: 'Non-Veg' },
        { name: 'Mirchi Ka Salan & Raita', quantity: 2, qty: 2, price: 4.5, dietary: 'Veg' }
      ],
      subtotal: 51.0,
      tax: 5.1,
      total_amount: 56.1,
      special_instructions: 'Keep hot in insulated carrier bag.',
      rider_name: 'Lucas Wilson',
      rider_phone: '+61 499 001 122',
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

  // 8. Seed Menu Items for 86ing / Availability Control (Prices in AUD)
  const menuData = [
    { id: 'menu-1', restoId: gulatiId, name: 'Murgh Makhani Thali', cat: 'Thali & Combos', price: 18.5, is_avail: 1, quota: 60, remaining: 42 },
    { id: 'menu-2', restoId: gulatiId, name: 'Dal Makhani Executive Box', cat: 'Thali & Combos', price: 16.0, is_avail: 1, quota: 80, remaining: 55 },
    { id: 'menu-3', restoId: gulatiId, name: 'Tandoori Chicken Half', cat: 'Tandoor & Starters', price: 17.5, is_avail: 1, quota: 30, remaining: 12 },
    { id: 'menu-4', restoId: gulatiId, name: 'Shahi Paneer Thali', cat: 'Thali & Combos', price: 16.5, is_avail: 1, quota: 50, remaining: 35 },
    { id: 'menu-5', restoId: gulatiId, name: 'Paneer Tikka Roll', cat: 'Wraps & Rolls', price: 12.5, is_avail: 1, quota: 40, remaining: 28 },
    { id: 'menu-6', restoId: gulatiId, name: 'Garlic Butter Naan', cat: 'Breads', price: 4.5, is_avail: 1, quota: 150, remaining: 110 },
    { id: 'menu-7', restoId: gulatiId, name: 'Kulfi Falooda Special', cat: 'Desserts', price: 8.5, is_avail: 0, quota: 25, remaining: 0 },
  ];

  for (const m of menuData) {
    db.run(
      `INSERT OR REPLACE INTO menu_items (id, restaurant_id, name, category, price, is_available, daily_quota, remaining_quota, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [m.id, m.restoId, m.name, m.cat, m.price, m.is_avail, m.quota, m.remaining, now, now]
    );
  }

  // 9. Seed Weekly Payouts & Settlement Reconciliation (AUD)
  const payoutsData = [
    {
      id: 'payout-w43',
      restoId: gulatiId,
      start: '2026-10-16',
      end: '2026-10-22',
      orders: 76,
      gross: 2845.0,
      comm: 426.75,
      subsidy: 85.0,
      net: 2503.25,
      status: 'pending',
      date: '2026-10-24',
    },
    {
      id: 'payout-w42',
      restoId: gulatiId,
      start: '2026-10-09',
      end: '2026-10-15',
      orders: 112,
      gross: 3420.0,
      comm: 513.0,
      subsidy: 110.0,
      net: 3017.0,
      status: 'paid',
      date: '2026-10-17',
    },
    {
      id: 'payout-w41',
      restoId: gulatiId,
      start: '2026-10-02',
      end: '2026-10-08',
      orders: 98,
      gross: 2980.0,
      comm: 447.0,
      subsidy: 95.0,
      net: 2628.0,
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
