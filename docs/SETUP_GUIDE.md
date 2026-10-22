# Daily Drop Restaurant Partner System — Setup & Execution Guide

## Overview
This repository contains the complete production-ready Daily Drop Restaurant Partner Management and Update Communication platform, composed of:
1. **Daily Drop Operations Admin Portal (`apps/admin`)**: A React (Vite + TypeScript + TailwindCSS) web application for administrators to manage restaurants, author operational updates, upload attachments, and track restaurant-level acknowledgements and responses in real time.
2. **Restaurant Partner Mobile Application (`apps/mobile`)**: A React Native (Expo + TypeScript + React Navigation) mobile application for restaurant partners to receive briefings, read instructions, download private spreadsheets, acknowledge guidelines, and submit availability confirmations.
3. **Core Backend REST API (`apps/api`)**: A Node.js + Express + TypeScript service using SQLite with strict tenant data isolation, role-based authorization, JWT authentication, and a background task scheduler.
4. **Shared Types and Constants (`packages/shared`)**: Shared types, business constants, and Daily Drop design tokens.

---

## Default Testing Credentials

| Portal / App | Account Role | Email | Password |
|---|---|---|---|
| **Daily Drop Admin Portal** | Head of Operations (Admin) | `admin@dailydrop.com` | `DailyDropAdmin2026!` |
| **Partner Mobile App** | Gulati's Indian Kitchen | `gulati@restaurant.dailydrop.com` | `PartnerPass2026!` |
| **Partner Mobile App** | Bawarchi Biryani | `bawarchi@restaurant.dailydrop.com` | `PartnerPass2026!` |
| **Invitation Link Demo** | Xee La Partner Onboarding | `partner@xeela.dailydrop.com` | Token: `xeela-invite-demo-2026` |

---

## 1. Quick Start Commands

### Step 1: Install Dependencies
From the repository root:
```bash
# Install root and workspace dependencies
npm install
npm run build:shared
npm run build:api
```

### Step 2: Seed the Database
```bash
npm run seed
```
This initializes `dailydrop_restaurant.db` with all collaborating restaurants from `Meals list.xlsx` (Bawarchi Biryani, Gulati's Indian Kitchen, Xee La, Vizio Pasta, G'Fun Cafe, Tie Twist, Korean Meal, Late Night Ramen, Sedap), pre-populates realistic updates with attachments, and records initial responses.

### Step 3: Run the Services

#### Run Backend REST API (Port 4000)
```bash
npm run dev:api
```
Server runs at `http://localhost:4000`. Health check: `http://localhost:4000/api/health`.

#### Run Admin Web Portal (Port 5173)
```bash
npm run dev:admin
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Run Restaurant Partner Mobile App (Expo)
```bash
# Option A: Web Preview in Browser
npm --workspace=apps/mobile run web

# Option B: Android Emulator / Physical Device
npm --workspace=apps/mobile run android
```

---

## 2. Testing On Android Emulator or Physical Device

### Android Emulator Setup
1. Ensure Android Studio and Android SDK are installed with `ANDROID_HOME` configured.
2. Start an Android Virtual Device (AVD).
3. From `apps/mobile`:
   ```bash
   npx expo start --android
   ```
4. In the Android emulator, the app automatically communicates with the host machine's API at `http://10.0.2.2:4000`.

### Physical Device via Expo Go
1. Install **Expo Go** from the Google Play Store or Apple App Store.
2. Ensure your phone and computer are on the same Wi-Fi network.
3. Start Expo:
   ```bash
   cd apps/mobile
   npx expo start
   ```
4. Scan the QR code displayed in your terminal using the Expo Go camera on Android (or Camera app on iOS).

---

## 3. End-to-End Workflow Verification

1. **Admin Management**: Log in to the Admin Portal at [http://localhost:5173](http://localhost:5173) with `admin@dailydrop.com` / `DailyDropAdmin2026!`.
2. **Review Metrics**: Check the live dashboard numbers (Total Restos: 9, Active Partners: 8, Published Updates: 4).
3. **Inspect Partners**: Go to **Restaurant Partners** and click on any partner to inspect status and send/resend invitations.
4. **Publish an Update**: Click **Create Operational Update**, select category *Meal Planning*, priority *Urgent*, choose *Availability Confirmation*, attach `Daily_Drop_Meal_Schedule_W43.xlsx`, and click **Publish Update to Partners**.
5. **Kitchen Mobile Feed**: Log in as `bawarchi@restaurant.dailydrop.com` / `PartnerPass2026!`. Notice the urgent banner at the top of the dashboard.
6. **Kitchen Detail & Response**: Tap on the update card, download the attachment spreadsheet, choose *Confirmed Available*, input *120* boxes capacity, add a prep note, and click *Submit Response*.
7. **Real-time Admin Tracking**: Refresh or open the update in the Admin Portal to observe Bawarchi's response immediately updated from *Delivered* to *Response Submitted* with the exact timestamp.
8. **Operations Review**: Click *Review Response* on Bawarchi's row, write an admin note, and submit to notify the kitchen partner.
