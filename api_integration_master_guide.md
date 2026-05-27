# StuEarn India - Android App Master API Integration Guide

> **Base URL**: `https://stuearn-api.satyainfotechnetworks.com`  
> **Content-Type**: `application/json` (for all body payloads)  
> **Authorization Header**: `Authorization: Bearer <jwt_token>` (obtained via login/signup response)

---

## 💡 1. Core Identity & Architecture Rules

### 🔒 Two-Tier Identity Mapping
To ensure robust accounting and security, the system divides identity into two layers:
1. **Auth Identity (`uid`)**: The Google Firebase User ID. Used **exclusively** during Google authentication handshakes (`/api/auth/check_uid` and `/api/auth/signup`).
2. **App/Ledger Identity (`id` / `user_id`)**: 
   * `id`: Internal UUID v4 string representing the user globally.
   * `user_id`: 10-char public hex ID used in referral shares, affiliate tracking URLs, and ad network webhooks.
   
> [!IMPORTANT]
> The Android app **must never** pass the Firebase `uid` after the login handshake. Use the internal UUID `id` or hex `user_id` for all wallet, ticket, offer, streak, spin, and visit-earn transactions.

### 🚫 Anti-Cloning Device Telemetry
To prevent duplicate account exploits and emulator farm abuse, the backend binds a user's account to a physical device using `android_id` (retrieved via `Secure.ANDROID_ID` on Android). If a device with the same `android_id` attempts to register under a different Gmail/Firebase profile, the registration is rejected.

---

## 🔑 2. Onboarding & Authentication Endpoints

### A. Google Login Check
Verify if the authenticated Firebase Gmail account already has a registered profile.
* **Endpoint**: `POST /api/auth/check_uid`
* **Request Body**:
```json
{
  "uid": "114061911747377543839",
  "fcm_token": "optional_fcm_token_string"
}
```
* **Response (User Exists)**:
```json
{
  "success": true,
  "exist": true,
  "is_new_user": false,
  "message": "Login successful",
  "token": "dXNlcl9pZDoxMTQw...",
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
* **Response (User Does Not Exist)**:
```json
{
  "success": false,
  "exist": false,
  "is_new_user": true,
  "message": "Please register first"
}
```

### B. User Registration (Signup)
Create a new profile and bind device credentials permanently.
* **Endpoint**: `POST /api/auth/signup`
* **Request Body**:
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
* **Response (Success)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "dXNlcl9pZDoxMTQw...",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "user_id": "3fbd3265b7",
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "balance": 0.00,
    "referral_code": "G77703"
  }
}
```
* **Response (Device already registered - Clone block)**:
```json
{
  "success": false,
  "message": "Device already registered with another account"
}
```

---

## 👤 3. User Profile & Preferences

### A. Get Profile Details
Fetches standard stats, balance, spin availability, and streak information.
* **Endpoint**: `GET /api/user/profile`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
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

### B. Update FCM Push Token
Submit the dynamic device notification token for targeted push updates.
* **Endpoint**: `POST /api/user/fcm-token`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "fcm_token": "new_fcm_token_string_here"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "FCM Token updated successfully"
}
```

---

## 🔗 4. Visit & Earn (Direct Traffic Integration)

> [!IMPORTANT]
> **Decommissioning Notice:** Both "Watch & Earn" (video ads) and "Scratch & Win" card mini-games have been permanently retired from the API endpoints. They are replaced by the brand-new, structured **Visit & Earn** system.

Visit & Earn rewards users for visiting sponsored links and remaining active for a set timer.
* **Flow**:
  1. Fetch tasks list.
  2. If `is_ad == true`, Android app must display a Google AdMob interstitial ad *before* launching the URL.
  3. Load `visit_url` inside an in-app WebView.
  4. Run a countdown timer matching `timer_seconds`.
  5. Upon timer expiration, hit `/api/visit-earn/claim` to collect reward coins.

### A. List Active Visit Tasks
* **Endpoint**: `GET /api/visit-earn`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
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

### B. Claim Visit Task Coins
* **Endpoint**: `POST /api/visit-earn/claim`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "task_id": "b3c1d2e4-0001-4abc-8def-11223344aabb"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Reward claimed successfully! Added 50 coins to your wallet.",
  "reward": 50,
  "new_balance": 200.00
}
```

---

## 🎯 5. In-App Offers & Proof Submissions

### A. Fetch Available Campaigns
Retrieve in-app manual review offers.
* **Endpoint**: `GET /api/offers`
* **Query Parameters (Optional)**: `user_id` (Hex ID to exclude already completed offers), `country` (e.g. `IN`).
* **Response**:
```json
{
  "success": true,
  "offers": [
    {
      "id": "77492c19-74d1-4171-87ab-89cd23ef981a",
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
      "tiers": [
        {
          "id": "tier-1-uuid",
          "title": "KYC Complete",
          "reward": "500.00",
          "steps": ["Register account", "Verify details"]
        }
      ]
    }
  ]
}
```

### B. Register Offer Click
Call immediately when the user clicks the "Start Offer" button to generate a session click token.
* **Endpoint**: `POST /api/offers/start`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "offer_id": "77492c19-74d1-4171-87ab-89cd23ef981a"
}
```
* **Response**:
```json
{
  "success": true,
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9"
}
```

### C. Submit Manual Verification proof (Offline Tasks Only)
Allows users to submit screenshots and input details.
> [!TIP]
> The Android client should upload verification screenshots directly to Firebase Storage first, then send the public download URL strings inside the `input_data` fields map.
* **Endpoint**: `POST /api/offers/submit-proof`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9",
  "input_data": {
    "Registered Phone Number": "9988776655",
    "Upload KYC Screenshot": "https://firebasestorage.googleapis.com/.../proof.png"
  }
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Proof submitted successfully"
}
```

---

## 📈 6. Streaks, Daily Check-In, and Spin Wheel

### A. Fetch Daily Streak Details
* **Endpoint**: `GET /api/user/streak`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "current_streak": 2,
  "last_checkin": "2026-05-26T08:00:00Z",
  "is_checkin_available": true
}
```

### B. Claim Daily Check-In Reward
* **Endpoint**: `POST /api/user/daily-checkin`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "message": "Check-in successful! Streak incremented.",
  "reward": 10.00,
  "new_balance": 160.00
}
```

### C. Check Daily Spin Configuration
* **Endpoint**: `GET /api/user/spin`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "spins_left": 5,
  "max_spins": 5
}
```

### D. Perform Wheel Spin
* **Endpoint**: `POST /api/user/spin`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "reward": 15.00,
  "new_balance": 175.00
}
```

---

## 💳 7. Wallet Ledger, Gateways & Withdrawals

### A. Fetch Ledger Transactions
* **Endpoint**: `GET /api/wallet/transactions`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
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
      "amount": 50.00,
      "type": "CREDIT",
      "source": "VISIT_EARN",
      "description": "Completed Visit & Earn task",
      "created_at": "2026-05-23T09:00:00Z"
    }
  ]
}
```
* **Supported `source` keys**: `OFFLINE_OFFER`, `ONLINE_OFFER` (Ad partner webhooks), `VISIT_EARN`, `DAILY_CHECKIN`, `SPIN_WIN`, `REFERRAL_BONUS`, `ADMIN_CREDIT`, `DEBIT_WITHDRAWAL`, `ADMIN_DEBIT`.

### B. List Payout Gateways with Custom Dynamic Fields
* **Endpoint**: `GET /api/wallet/payout-methods`
* **Response**:
```json
{
  "success": true,
  "payoutMethods": [
    {
      "id": "gateway-upi-id",
      "name": "UPI Transfer",
      "description": "Receive directly to UPI handle",
      "iconUrl": "https://cdn.stuearn.com/icons/upi.png",
      "minCoins": 100,
      "conversionRate": 1.0,
      "currencySymbol": "₹",
      "processingTime": "Instant - 2 Hours",
      "inputType": "text",
      "inputLabel": "UPI Address",
      "inputPlaceholder": "enter_upi@ybl",
      "tiers": [
        { "id": "tier-1", "coinCost": 100, "monetaryValue": 100.0, "currencySymbol": "₹" },
        { "id": "tier-2", "coinCost": 500, "monetaryValue": 500.0, "currencySymbol": "₹" }
      ]
    },
    {
      "id": "gateway-bank-id",
      "name": "Bank Transfer",
      "description": "Transfer to IMPS Accounts",
      "iconUrl": "https://cdn.stuearn.com/icons/bank.png",
      "minCoins": 1000,
      "conversionRate": 1.0,
      "currencySymbol": "₹",
      "processingTime": "12-24 Hours",
      "inputType": "text,text,number",
      "inputLabel": "Bank Name,IFSC Code,Account Number",
      "inputPlaceholder": "Enter Bank,Enter IFSC,Enter Number",
      "tiers": [
        { "id": "bank-tier-1", "coinCost": 1000, "monetaryValue": 1000.0, "currencySymbol": "₹" }
      ]
    }
  ]
}
```
> [!TIP]
> **Dynamic Field Processing (Compose/XML):**
> 1. Split `inputType`, `inputLabel`, and `inputPlaceholder` by comma (`,`).
> 2. Dynamically build a layout list of text input fields mapping index-to-index.
> 3. Create a JSON dictionary of the user's responses, mapping input label to input value, e.g. `{"Bank Name":"HDFC","IFSC Code":"HDFC00012","Account Number":"9821213"}` before submitting.

### C. Request Withdrawal Cashout
* **Endpoint**: `POST /api/wallet/withdraw`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "amount": 100,
  "method": "UPI",
  "details": "{\"UPI Address\":\"test@ybl\"}"
}
```
> [!CAUTION]
> **Strict Integer Rule**: The withdrawal `amount` parameter must be a strictly positive **whole integer**. Fractional decimals (double/float) will fail validation. Enforce integer-only constraints on the cashout input form.

---

## 👥 8. Referral Network Integration

### A. Get Referral Profile & Metrics
* **Endpoint**: `GET /api/referral/info`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "referral_code": "G77703",
  "total_referred": 14,
  "total_rewards_earned": 280.00,
  "invitation_link": "https://stuearn.com/join?ref=G77703"
}
```

### B. List Referred Users Network History
* **Endpoint**: `GET /api/referral/history`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "history": [
    {
      "referee_name": "Rohan Kumar",
      "status": "COMPLETED",
      "reward_credited": 20.00,
      "date": "2026-05-25T12:00:00Z"
    }
  ]
}
```

---

## 🎫 9. Support Ticketing Lifecycle

### A. List Open/Closed Support Tickets
* **Endpoint**: `GET /api/tickets`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "tickets": [
    {
      "id": "ticket-uuid-777",
      "subject": "Missing Coins for Kotak Offer",
      "category": "Offer Issue",
      "status": "OPEN",
      "created_at": "2026-05-21T06:30:00Z"
    }
  ]
}
```

### B. Create New Support Request
* **Endpoint**: `POST /api/tickets`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "subject": "Missing Coins for Kotak Offer",
  "category": "Offer Issue",
  "message": "I completed the Kotak Cherry offer, uploaded proof, but no balance was added."
}
```
* **Response**:
```json
{
  "success": true,
  "ticket_id": "ticket-uuid-777",
  "message": "Ticket created successfully"
}
```

### C. Retrieve Ticket Message Thread
* **Endpoint**: `GET /api/tickets/:id` (Replace `:id` with Ticket UUID)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "ticket": {
    "id": "ticket-uuid-777",
    "subject": "Missing Coins for Kotak Offer",
    "category": "Offer Issue",
    "status": "OPEN"
  },
  "messages": [
    {
      "id": "msg-1",
      "sender_type": "USER",
      "message": "I completed the Kotak Cherry offer, uploaded proof, but no balance was added.",
      "created_at": "2026-05-21T06:30:00Z"
    },
    {
      "id": "msg-2",
      "sender_type": "ADMIN",
      "message": "Hello Devraj, we have received your proof. We are reviewing the logs and will update you in 24 hours.",
      "created_at": "2026-05-21T10:00:00Z"
    }
  ]
}
```
> [!TIP]
> Align messages with `sender_type == "ADMIN"` to the left and highlight with a separate background accent. Align `sender_type == "USER"` to the right to represent the user's replies.

### D. Reply to a Support Thread
* **Endpoint**: `POST /api/tickets/:id/reply`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "message": "Okay, thank you for the quick support!"
}
```

### E. Mark Ticket as Resolved/Closed
* **Endpoint**: `POST /api/tickets/:id/close`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "message": "Ticket closed successfully"
}
```
> [!WARNING]
> When `ticket.status == "CLOSED"`, the message input bar and reply button in the app must be permanently disabled, displaying a read-only locked status.

---

## 🎁 10. Surprise Bonus Envelope (Lifafa)

* **Fetch Envelope Details**: `GET /api/lifafa/detail/:id`
  * Validates the active envelope ID.
* **Claim Envelope Reward**: `POST /api/lifafa/claim`
  * **Headers**: `Authorization: Bearer <jwt_token>`
  * **Request Body**: `{"lifafa_id": "lifafa-uuid-string"}`
  * **Response**: `{ "success": true, "reward": 50, "message": "Bonus claimed!" }`

---

## 🤖 11. Telegram Bot Verification Generator

To cross-verify users via Telegram:
* **Generate Verification token**: `POST /api/telegram/generate`
  * **Headers**: `Authorization: Bearer <jwt_token>`
  * **Response**:
  ```json
  {
    "success": true,
    "bot_username": "StuEarnVerificationBot",
    "token": "VERIFY_5A7F39D2",
    "verification_url": "https://t.me/StuEarnVerificationBot?start=VERIFY_5A7F39D2"
  }
  ```
  The Android app can show this URL in a clickable button to deep-link straight to Telegram.

---

## 📢 12. Dynamic Real-Time App Feeds

### A. Promotional App Carousel Banners
* **Endpoint**: `GET /api/banners`
* **Response**:
```json
{
  "success": true,
  "banners": [
    {
      "id": "banner-1",
      "image_url": "https://cdn.stuearn.com/banners/diwali.jpg",
      "action_url": "stuearn://spin",
      "is_active": 1
    }
  ]
}
```

### B. Recent Global Earnings Ticker/Marquee
Displays dynamic, real-time transaction updates of active app users.
* **Endpoint**: `GET /api/ticker/earnings`
* **Response**:
```json
{
  "success": true,
  "ticker": [
    {
      "username": "Devraj",
      "amount": 250.00,
      "offer_name": "CPX Research Survey",
      "logo_url": "https://cdn.stuearn.com/logos/cpx.png",
      "time_ago": "3 mins ago"
    }
  ]
}
```

### C. Top Earners Leaderboard
* **Endpoint**: `GET /api/leaderboard/list`
* **Query Parameters (Optional)**: `period=weekly` or `period=monthly`
* **Response**:
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "name": "Devraj Devraj",
      "profile_pic": "https://lh3.googleusercontent.com/...",
      "total_earned": 4500.00
    }
  ]
}
```

### D. General System Configuration
Retrieve global variables such as system maintenance updates on app launch.
* **Endpoint**: `GET /api/config/app-config`
* **Response**:
```json
{
  "success": true,
  "configs": {
    "maintenance_mode": "0",
    "min_withdrawal": "100",
    "daily_spin_limit": "5",
    "referral_reward_referrer": "20",
    "referral_reward_referee": "10"
  }
}
```

---

## 📲 13. Deep Link Route Protocols

The Android client should support the following deep link schemas inside its manifest filters for seamless system navigation (e.g. from banner action clicks or push updates):

| Target Action | Deep Link Schema |
| :--- | :--- |
| **Home Dashboard** | `stuearn://home` |
| **Offers Board** | `stuearn://offers` |
| **Visit & Earn Screen** | `stuearn://visit-earn` |
| **Wallet/Ledger screen** | `stuearn://wallet` |
| **Withdrawal Request Screen**| `stuearn://withdraw` |
| **Spin Wheel Screen** | `stuearn://spin` |
| **Leaderboard Standings** | `stuearn://leaderboard` |
| **Open New Support Ticket** | `stuearn://ticket/new` |
| **Support Thread Detail** | `stuearn://ticket/:id` |
| **Referrals Dashboard** | `stuearn://referral` |

---

## 🔔 14. Firebase Cloud Messaging (FCM) Integration

To ensure robust scale and deliverability, the app subscribes users to dynamic topic channels based on feature interest:

### Standard Topic Subscriptions
* **`all`** — System-wide broadcast alerts.
* **`offers`** — Survey availability & special multipliers.
* **`wallet`** — Cashout request updates & balance triggers.
* **`vip`** — Streak notifications & check-in reminders.

### Big Picture Image Style (Glide/Coil)
When an FCM push alert contains a banner image URL in the `image` parameter (both inside the `notification` block and `data` block), the app should fetch the bitmap asynchronously in the custom `FirebaseMessagingService` background runner before posting it to the system tray.

---

*This specification represents the production API implementation of StuEarn India backend.*
