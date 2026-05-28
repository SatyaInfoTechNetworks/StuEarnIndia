# StuEarn India — Android App API Integration Guide

> **Last Updated**: 2026-05-23  
> **Backend Version**: Node.js/Express v3 (MySQL 8.0, Firebase Auth)  
> **Maintained By**: SatyaInfoTech Networks

This guide is the complete, high-fidelity technical specification for integrating the **Android App client** with the modern Node.js/Express backend. All services are secured, optimised, and bound to the production relational database.

---

## 1. Global Specifications

| Property | Value |
|---|---|
| **Base URL** | `https://stuearn-api.satyainfotechnetworks.com` |
| **Content-Type** | `application/json` for all body payloads |
| **Auth Header** | `Authorization: Bearer <jwt_token>` |
| **Legacy Auth** | `token: <base64_legacy_token>` *(header or query param)* |
| **App Check Header** | `X-App-Check: <firebase_app_check_token>` *(on `/api/auth/*` when enabled)* |

> [!IMPORTANT]
> **Identity Architecture — Two-Tier ID System**
>
> The system uses **two separate identity layers** that must never be mixed:
>
> | Layer | Identifier | Used For |
> |---|---|---|
> | Firebase Auth | `uid` (Google Firebase UID) | **Signup & Login only** (`/api/auth/*`) |
> | App Identity | `id` (UUID v4) / `user_id` (10-char hex) | **Everything else** — wallet, tasks, withdrawals, tickets, visit-earn, streaks, spins |
>
> The `uid` is stored internally but is **never passed** by the Android app beyond the authentication handshake. Use `id` or `user_id` returned from the login/signup response for all subsequent calls.

---

## 2. Onboarding & Anti-Cloning Device Telemetry

To prevent account duplication and emulator farm abuse, the authentication pipeline validates physical device metadata via `android_id` (Android `Secure.ANDROID_ID`).

---

### 2.1 · Google Login Check

Verify if a Gmail user already has an active profile before showing signup screens.

- **Endpoint**: `POST /api/auth/check_uid`
- **Legacy Alias**: `/api/auth/check_uid.php`

**Request Body:**
```json
{
  "uid": "114061911747377543839",
  "fcm_token": "optional_fcm_token_string"
}
```

**Response — Profile Exists:**
```json
{
  "success": true,
  "exist": true,
  "is_new_user": false,
  "message": "Login successful",
  "token": "dXNlcl9pZDoxMTQwNjE5MTE3...",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "114061911747377543839",
    "user_id": "3fbd3265b7",
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "balance": 150.00,
    "referral_code": "G77703",
    "android_id": "a987d65c432b10",
    "daily_spins_count": 5,
    "current_streak": 2
  }
}
```

**Response — User Not Registered:**
```json
{
  "success": false,
  "exist": false,
  "is_new_user": true,
  "message": "Please register first"
}
```

---

### 2.2 · User Registration (Signup)

Launches a new profile and permanently binds the hardware device ID for anti-cloning enforcement.

- **Endpoint**: `POST /api/auth/signup`
- **Legacy Alias**: `/api/auth/signup.php`

**Request Body:**
```json
{
  "uid": "114061911747377543839",
  "name": "Devraj Devraj",
  "email": "devraj1625r@gmail.com",
  "phone_number": "+918854557875",
  "profile_pic": "https://lh3.googleusercontent.com/a/ACg8oc...",
  "location": "Hyderabad, India",
  "referred_by": "REFCODE2763",
  "android_id": "a987d65c432b10",
  "device_model": "OnePlus 11R",
  "os_version": "Android 14",
  "fcm_token": "fcm_token_string"
}
```

> [!NOTE]
> `referred_by` is optional. Pass the referral code of the inviting user, not their UUID.

**Success Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "dXNlcl9pZDoxMTQw...",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "114061911747377543839",
    "user_id": "3fbd3265b7",
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "balance": 0.00,
    "referral_code": "G77703"
  }
}
```

**Anti-Cloning Error (Device Multi-Account Prevention):**
```json
{
  "success": false,
  "message": "Device already registered with another account"
}
```

---

## 3. User Profile

---

### 3.1 · Get Profile Details

Fetches the full account state for home/profile screens.

- **Endpoint**: `GET /api/user/profile`
- **Legacy Alias**: `/api/user/profile.php`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "user_id": "3fbd3265b7",
    "uid": "114061911747377543839",
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "phone_number": "+918854557875",
    "profile_pic": "https://lh3.googleusercontent.com/...",
    "location": "Hyderabad, India",
    "balance": 150.00,
    "referral_code": "G77703",
    "referred_by": null,
    "android_id": "a987d65c432b10",
    "daily_spins_count": 5,
    "current_streak": 2,
    "is_banned": 0,
    "created_at": "2026-05-21T06:00:00Z"
  }
}
```

---

### 3.2 · Update FCM Token

Updates the FCM push notification token when the device refreshes it.

- **Endpoint**: `POST /api/user/fcm-token`
- **Legacy Alias**: `/api/user/update_fcm.php`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{ "fcm_token": "new_fcm_token_string" }
```

**Response:**
```json
{ "success": true, "message": "FCM Token updated successfully" }
```

---

## 4. Offers, Tiers & Offline Proof Verification

---

### 4.1 · List Active Offers

Fetch all campaigns with user-completion awareness and regional targeting.

- **Endpoint**: `GET /api/offers`
- **Legacy Alias**: `/api/offers/list.php`
- **Query Params** *(optional)*:

| Param | Description |
|---|---|
| `user_id` | Filters out already completed offers for this user |
| `country` | ISO country code (e.g. `IN`) to apply regional targeting rules |

**Response:**
```json
{
  "success": true,
  "offers": [
    {
      "id": "77492c19-74d1-4171-87ab-89cd23ef981a",
      "external_id": "kotak_cherry_01",
      "title": "Install & Review Kotak Cherry",
      "description": "Download Kotak Cherry, register and submit KYC proof.",
      "category": "Finance",
      "iconUrl": "https://stuearn.com/icons/kotak.png",
      "trackingUrl": "https://tracking.stuearn.com/click?offer_id=kotak&pub_id={user_id}",
      "totalReward": 500.00,
      "type": "offline",
      "extraLabel": "Hot Payout",
      "estimatedTime": "10 Mins",
      "difficulty": "Medium",
      "dailyCompletionCap": 100,
      "completionsToday": 14,
      "isCapped": false,
      "countryTargeting": "IN,US",
      "tiers": [
        {
          "id": "tier-1-uuid",
          "title": "KYC Complete",
          "reward": "500.00",
          "steps": ["Register account", "Verify Aadhar and PAN details"]
        }
      ]
    }
  ]
}
```

> [!NOTE]
> `type` is either `"online"` (automated server postback webhook — no user proof needed) or `"offline"` (manual proof submission reviewed by admin).

---

### 4.2 · Trigger Offer Click (Click Registration)

Call immediately when a user taps the offer start button. Logs the click and returns a `click_id`.

- **Endpoint**: `POST /api/offers/start`
- **Legacy Alias**: `/api/offers/start.php`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{ "offer_id": "77492c19-74d1-4171-87ab-89cd23ef981a" }
```

**Response:**
```json
{
  "success": true,
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9"
}
```

---

### 4.3 · Submit Verification Proof (Offline Campaigns)

For manual campaigns, submit user-collected evidence for admin review.

> [!TIP]
> Upload screenshots or documents to **Firebase Storage** on the Android client first, then pass the public download URL string inside `input_data`, keyed to match the offer's field labels.

- **Endpoint**: `POST /api/offers/submit-proof`
- **Legacy Alias**: `/api/offers/submit_proof.php`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9",
  "input_data": {
    "Registered Phone Number": "9988776655",
    "Upload KYC Screenshot": "https://firebasestorage.googleapis.com/.../proof.png"
  }
}
```

**Response:**
```json
{ "success": true, "message": "Proof submitted successfully" }
```

---

## 5. Visit & Earn

> [!IMPORTANT]
> **New Feature — replaces Watch & Earn and Scratch & Win.**
> Both the Watch & Earn (video ads) and Scratch & Win features have been **permanently decommissioned**. Their endpoints are removed from the backend.

Visit & Earn tasks give users coins for visiting a sponsored URL and staying for a configured countdown timer. If a task has `is_ad: true`, the Android app must display an interstitial ad *before* redirecting the user to `visit_url`; the timer begins after the redirect.

---

### 5.1 · List Available Visit Tasks

Returns all active visit tasks the authenticated user has **not yet completed today**.

- **Endpoint**: `GET /api/visit-earn`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "b3c1d2e4-0001-4abc-8def-11223344aabb",
      "title": "Visit TechCrunch & Earn",
      "coins": 50,
      "visit_url": "https://techcrunch.com",
      "timer_seconds": 30,
      "is_ad": false
    },
    {
      "id": "c4d5e6f7-0002-4abc-8def-aabbccddeeff",
      "title": "Explore PhonePe Blog",
      "coins": 80,
      "visit_url": "https://blog.phonepe.com",
      "timer_seconds": 60,
      "is_ad": true
    }
  ]
}
```

**Field Reference:**

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Task identifier — pass back in claim request |
| `title` | `string` | Display name of the task |
| `coins` | `integer` | Reward coins for completing the task |
| `visit_url` | `string` | URL to open in WebView / browser |
| `timer_seconds` | `integer` | Number of seconds user must stay on the URL |
| `is_ad` | `boolean` | If `true`, show an interstitial ad **before** opening `visit_url` |

---

### 5.2 · Claim Visit & Earn Reward

Call this **after** the countdown timer completes. The server validates the task exists, is active, and hasn't already been claimed by this user today before crediting the wallet.

- **Endpoint**: `POST /api/visit-earn/claim`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{ "task_id": "b3c1d2e4-0001-4abc-8def-11223344aabb" }
```

**Success Response:**
```json
{
  "success": true,
  "message": "Reward claimed successfully! Added 50 coins to your wallet.",
  "reward": 50,
  "new_balance": 200.00
}
```

**Error — Already Claimed Today:**
```json
{
  "success": false,
  "message": "You have already completed this visit task today."
}
```

**Error — Task Not Found / Inactive:**
```json
{
  "success": false,
  "message": "Task not found or inactive."
}
```

> [!IMPORTANT]
> **Android Integration Flow for Visit & Earn:**
> 1. Fetch task list from `GET /api/visit-earn` on screen load.
> 2. When user taps a task:
>    - If `is_ad == true` → show interstitial ad → on ad completion, open `visit_url` in WebView.
>    - If `is_ad == false` → directly open `visit_url` in WebView.
> 3. Start a countdown timer for `timer_seconds`.
> 4. When timer reaches zero → call `POST /api/visit-earn/claim` with `task_id`.
> 5. Show the coins credited and update the wallet balance from `new_balance`.

---

## 6. Wallet, Transactions & Strict Integer Cashouts

---

### 6.1 · Fetch Transaction Ledger

Returns full credit/debit history for the authenticated user.

- **Endpoint**: `GET /api/wallet/transactions`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "trans-uuid-9999",
      "amount": 500.00,
      "type": "CREDIT",
      "source": "OFFLINE_OFFER",
      "description": "Completed manual verification: Kotak Cherry",
      "created_at": "2026-05-21T06:15:00Z"
    },
    {
      "id": "trans-uuid-1234",
      "amount": 50,
      "type": "CREDIT",
      "source": "VISIT_EARN",
      "description": "Completed Visit & Earn task: Visit TechCrunch & Earn",
      "created_at": "2026-05-23T09:00:00Z"
    }
  ]
}
```

**Transaction `source` Values:**

| Source | Origin |
|---|---|
| `OFFLINE_OFFER` | Manual proof offer approved by admin |
| `ONLINE_OFFER` | Automatic webhook postback from ad network |
| `VISIT_EARN` | Visit & Earn task completion |
| `DAILY_CHECKIN` | Daily streak check-in reward |
| `SPIN_WIN` | Spin wheel prize |
| `REFERRAL_BONUS` | Referral commission |
| `ADMIN_CREDIT` | Manual admin balance adjustment |
| `DEBIT_WITHDRAWAL` | Cashout request debit |
| `ADMIN_DEBIT` | Manual admin deduction |

---

### 6.2 · Request Cash Settlement (Withdrawal)

Submit a cashout request. The amount is immediately debited from the wallet and placed in pending state for admin approval.

- **Endpoint**: `POST /api/wallet/withdraw`
- **Legacy Alias**: `/api/wallet/withdraw.php`
- **Auth**: `Authorization: Bearer <jwt_token>`

> [!CAUTION]
> The `amount` field **must be a whole integer**. Fractional (float/double) values are rejected at validation. The Android client must enforce this with integer-only input validation before calling this endpoint.

**Request Body:**
```json
{
  "amount": 200,
  "method": "UPI",
  "details": "devraj@upi"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Withdrawal submitted successfully!",
  "transactionId": "withdrawal-uuid-555"
}
```

**Rejection — Float/Double Validation Failure:**
```json
{
  "success": false,
  "message": "Invalid withdrawal amount. Only whole integers are accepted. Fractional (float or double) coin values are not allowed."
}
```

---

## 7. Daily Check-In, Streaks & Spin Wheel

---

### 7.1 · Streak Status & Daily Check-In

- **Check Streak Status**: `GET /api/user/streak`  *(Auth required)*
  - Returns current streak day, last check-in timestamp, and whether today's reward is available.

- **Claim Daily Check-In**: `POST /api/user/daily-checkin`  *(Auth required)*

**Claim Response:**
```json
{
  "success": true,
  "message": "Check-in successful! Streak incremented.",
  "reward": 10.00,
  "new_balance": 160.00
}
```

---

### 7.2 · Spin & Win Wheel

- **Check Spins Left**: `GET /api/user/spin`  *(Auth required)*
  - Response: `{ "success": true, "spins_left": 5 }`

- **Perform a Spin**: `POST /api/user/spin`  *(Auth required)*

**Spin Response:**
```json
{
  "success": true,
  "reward": 15.00,
  "new_balance": 175.00
}
```

---

## 8. Support Ticketing

---

### 8.1 · List User Tickets

- **Endpoint**: `GET /api/tickets`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "tickets": [
    {
      "id": "ticket-uuid-777",
      "subject": "Missing Coins for Kotak Cherry",
      "category": "Offer Issue",
      "status": "OPEN",
      "created_at": "2026-05-21T06:30:00Z"
    }
  ]
}
```

---

### 8.2 · Create Ticket

- **Endpoint**: `POST /api/tickets`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "subject": "Missing Coins for Kotak Cherry",
  "category": "Offer Issue",
  "message": "I completed KYC 3 days ago but haven't received coins."
}
```

**Response:**
```json
{
  "success": true,
  "ticket_id": "ticket-uuid-777",
  "message": "Ticket created successfully"
}
```

---

### 8.3 · Reply to a Ticket

- **Endpoint**: `POST /api/tickets/:id/reply`
- **Auth**: `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{ "message": "Here is my registered mobile: +918854557875" }
```

**Response:**
```json
{ "success": true, "message": "Reply sent successfully" }
```

---

## 9. App Configuration & System Metadata

These endpoints serve app-wide configuration values fetched at startup.

---

### 9.1 · Fetch App Configs

Returns all key-value configuration pairs set by the admin panel (spin probabilities, maintenance state, minimum withdrawal, loyalty rewards, etc.)

- **Endpoint**: `GET /api/app/config`
- **Auth**: None required

**Response:**
```json
{
  "success": true,
  "configs": {
    "maintenance_mode": "0",
    "min_withdrawal": "100",
    "daily_spin_limit": "5",
    "loyalty_day_1_reward": "5",
    "loyalty_day_7_reward": "50",
    "spin_jackpot_probability": "1",
    "referral_reward_referrer": "20",
    "referral_reward_referee": "10"
  }
}
```

---

### 9.2 · Fetch Active Banners

Returns promotional banners to display in the home screen carousel.

- **Endpoint**: `GET /api/banners`

**Response:**
```json
{
  "success": true,
  "banners": [
    {
      "id": "banner-uuid-001",
      "image_url": "https://cdn.stuearn.com/banners/diwali.jpg",
      "action_url": "https://stuearn.com/offers",
      "is_active": 1
    }
  ]
}
```

---

### 9.3 · Fetch Ticker / Marquee Messages

Returns scrolling ticker messages for the app header.

- **Endpoint**: `GET /api/tickers`

**Response:**
```json
{
  "success": true,
  "tickers": [
    {
      "id": "ticker-uuid-001",
      "message": "🎉 New offers added! Complete tasks and earn big today.",
      "is_active": 1
    }
  ]
}
```

---

### 9.4 · Leaderboard

Returns the top earners leaderboard for a given period.

- **Endpoint**: `GET /api/leaderboard`
- **Query Params** *(optional)*: `period=weekly` or `period=monthly`

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "3fbd3265b7",
      "name": "Devraj Devraj",
      "profile_pic": "https://lh3.googleusercontent.com/...",
      "total_earned": 4500.00
    }
  ]
}
```

---

## 10. Deep Link Registry

The app supports the following deep link URI scheme for in-app navigation:

| Deep Link | Destination |
|---|---|
| `stuearn://home` | Home screen |
| `stuearn://offers` | Offers wall / task list |
| `stuearn://visit-earn` | Visit & Earn task list screen |
| `stuearn://wallet` | Wallet / transactions screen |
| `stuearn://withdraw` | Withdrawal request screen |
| `stuearn://spin` | Spin & Win wheel screen |
| `stuearn://leaderboard` | Leaderboard screen |
| `stuearn://ticket/new` | Open new support ticket form |
| `stuearn://ticket/:id` | Open specific support ticket thread |
| `stuearn://referral` | Referral code sharing screen |

---

## 11. Decommissioned Features

The following features have been permanently removed from both the backend and Android app:

| Feature | Reason | Replacement |
|---|---|---|
| **Watch & Earn** (video rewarded ads) | Deprecated — ad fill rates and UX friction were poor | **Visit & Earn** (Section 5) |
| **Scratch & Win** (scratch card mini-game) | Deprecated — replaced by more structured reward system | Spin & Win (Section 7.2) |

> [!WARNING]
> Do **not** call `/api/user/watch` or `/api/user/scratch` — these routes no longer exist. Calling them will return `404 Not Found`. Remove any legacy calls to these endpoints from the Android codebase.

---

## 12. Ad Network S2S Postback Webhooks

These endpoints are called **server-to-server** by ad networks when a user completes an offer. They are not called by the Android app directly.

| Network | Postback URL |
|---|---|
| CPX Research | `GET /api/postback/cpx` |
| Pubscale | `GET /api/postback/pubscale` |
| Adjump | `GET /api/postback/adjump` |
| Growdeck | `GET /api/postback/growdeck` |
| Offermaru | `GET /api/postback/offermaru` |
| OpinionUniverse | `GET /api/postback/opinionuniverse` |
| PlaytimeAds | `GET /api/postback/playtimeads` |

All postback endpoints validate a shared secret key and then credit the user's wallet via the internal ledger transaction system.

---

## 13. Contests & Giveaways APIs

Promotional loyalty contests are created in the admin panel and verified automatically on draw completion. Users watch rewarded ads to claim "Raffle Tickets" (max 3/day per contest). Decoupled ledger crediting processes execute instantly on draw matrix calculation for Coins or Cash, while Gift Cards wait in pending admin queues.

### A. List Active Contests & Global/Personal Tickets
* **Endpoint**: `GET /api/contests/active`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "contests": [
    {
      "id": "78a87612-4fb2-475f-b51c-a9a7c36ad2e1",
      "title": "Daily Coins Lucky Raffle Draw",
      "description": "Watch rewarding video ads, earn raffle tickets, and get added to our daily lucky draw!",
      "type": "LUCKY_DRAW",
      "startTime": "2026-05-28T07:00:00.000Z",
      "endTime": "2026-05-28T23:59:00.000Z",
      "maxEntriesPerDay": 3,
      "totalWinners": 10,
      "globalEntriesCount": 142,
      "myTickets": 1,
      "rewards": [
        { "position": 1, "type": "COINS", "value": 500.00 },
        { "position": 2, "type": "COINS", "value": 250.00 }
      ]
    }
  ]
}
```

### B. Get Contest Details & Daily Limits Left
* **Endpoint**: `GET /api/contests/:id`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "contest": {
    "id": "78a87612-4fb2-475f-b51c-a9a7c36ad2e1",
    "title": "Daily Coins Lucky Raffle Draw",
    "description": "Watch rewarding video ads, earn raffle tickets, and get added to our daily lucky draw!",
    "type": "LUCKY_DRAW",
    "startTime": "2026-05-28T07:00:00.000Z",
    "endTime": "2026-05-28T23:59:00.000Z",
    "maxEntriesPerDay": 3,
    "totalWinners": 10,
    "status": "ACTIVE",
    "totalEntries": 142,
    "myTickets": 1,
    "entriesLeftToday": 2,
    "rewards": [
      { "position": 1, "type": "COINS", "value": 500.00 },
      { "position": 2, "type": "COINS", "value": 250.00 }
    ]
  }
}
```

### C. Log Contest Entry (Watch Rewarded Ad Callback)
Submit 1 completed ad session to earn 1 raffle ticket. Double-entry validators on the server prevent daily limit overrides.
* **Endpoint**: `POST /api/contests/:id/enter`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "source": "AD"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Congratulations! You earned 1 raffle ticket."
}
```

### D. Get Past Completed Contest Winners Scoreboard
* **Endpoint**: `GET /api/contests/winners`
* **Response**:
```json
{
  "success": true,
  "winners": [
    {
      "reward_position": 1,
      "reward_type": "COINS",
      "reward_value": 500.00,
      "selected_at": "2026-05-27T23:59:59.000Z",
      "contest_title": "Daily Coins Lucky Raffle Draw",
      "user_name": "Devraj Devraj"
    }
  ]
}
```

---

*For backend admin panel access and route-level details, refer to the admin portal at `/admin` and the source code in `Backend/server.js` and `Backend/controllers/`.*
