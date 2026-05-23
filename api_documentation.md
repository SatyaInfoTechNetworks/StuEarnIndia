# StuEarn India - Android App API Integration Guide

This guide is the complete, high-fidelity technical specification for integrating the **Android App client** with the modern Node.js/Express backend services. All backend services are optimized, hardened, and securely bound to the relational database.

---

## 1. Global Specifications

* **Base URL**: `https://stuearn-api.satyainfotechnetworks.com`
* **Request Format**: All requests sending payloads must specify header `'Content-Type': 'application/json'` and transmit structured JSON.
* **Authentication Header Requirement**:
  * All protected user endpoints require the standard header:
    * `Authorization`: `Bearer <jwt_token>` (Generated during Google login/signup verification)
  * Backward compatibility support is also maintained for:
    * `token`: `<legacy_base64_token>` (Passable directly as a header or query parameter)
* **Anti-Spoofing Layer (App Check)**:
  * When Firebase App Check middleware is activated on the server, all authentication endpoints (`/api/auth/*`) require:
    * `X-App-Check`: `<firebase_app_check_token>`

> [!IMPORTANT]
> **Identifier Architectural Scope**:
> * **Firebase UID (`uid`)**: This is strictly utilized *only* for the initial registration (signup) and login/checking pipelines under `/api/auth/*`.
> * **User UUID (`id`) / Public ID (`user_id`)**: All remaining application endpoints (e.g. wallet ledger, task list progress, daily check-ins, withdrawals, support tickets, etc.) are mapped and processed using the unique User UUID (`id`) or the public 10-character hex identifier (`user_id`) returned during signup/login. Do *not* pass the Firebase UID for these operations.

---

## 2. Onboarding & Anti-Cloning Device Telemetry

To prevent account duplication, emulator farms, and self-referral abuse, the authentication pipeline validates physical device metadata.

### A. Google Login Check
Verify if a Gmail user already has an active profile before executing signup screens.

* **Endpoint**: `POST /api/auth/check_uid` (Legacy: `/api/auth/check_uid.php`)
* **Request Body**:
```json
{
  "uid": "google-firebase-uid-114061911747377543839",
  "fcm_token": "optional_fcm_token_string"
}
```
* **Success Response (Profile Exists - Returns Session Tokens)**:
```json
{
  "success": true,
  "exist": true,
  "is_new_user": false,
  "message": "Login successful",
  "token": "dXNlcl9pZDoxMTQwNjE5MTE3...", // Legacy token
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // JWT Token (Include in Authorization Bearer)
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "google-firebase-uid-114061911747377543839",
    "user_id": "3fbd3265b7", // 10-char hex identifier
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "balance": 0.00,
    "referral_code": "G77703",
    "android_id": "a987d65c432b10",
    "daily_spins_count": 5,
    "current_streak": 2
  }
}
```
* **Response (User Not Registered)**:
```json
{
  "success": false,
  "exist": false,
  "is_new_user": true,
  "message": "Please register first"
}
```

---

### B. User Registration (Signup)
Launches a new profile and permanently binds the hardware device ID.

* **Endpoint**: `POST /api/auth/signup` (Legacy: `/api/auth/signup.php`)
* **Request Body**:
```json
{
  "uid": "google-firebase-uid-114061911747377543839",
  "name": "Devraj Devraj",
  "email": "devraj1625r@gmail.com",
  "phone_number": "+918854557875",
  "profile_pic": "https://lh3.googleusercontent.com/a/ACg8oc...",
  "location": "Hyderabad, India",
  "referred_by": "REFCODE2763", // Optional: referral code of the inviter
  "android_id": "a987d65c432b10", // Secure.ANDROID_ID (Anti-fraud validation)
  "device_model": "OnePlus 11R",
  "os_version": "Android 14",
  "fcm_token": "fcm_token_string"
}
```
* **Success Response**:
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "dXNlcl9pZDoxMTQw...",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "google-firebase-uid-114061911747377543839",
    "user_id": "3fbd3265b7",
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "balance": 0.00,
    "referral_code": "G77703"
  }
}
```
* **Anti-Cloning Error Response (Device Multi-Account Prevention)**:
```json
{
  "success": false,
  "message": "Device already registered with another account"
}
```

---

## 3. Retrieving & Accessing User Profile Data

Authenticated routes are provided to sync user balances, game currencies, streaks, and account configurations.

### A. Get Profile Details
Fetches active state variables for user account views.

* **Endpoint**: `GET /api/user/profile` (Legacy: `/api/user/profile.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Success Response**:
```json
{
  "success": true,
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "user_id": "3fbd3265b7",
    "uid": "google-firebase-uid-114061911747377543839",
    "name": "Devraj Devraj",
    "email": "devraj1625r@gmail.com",
    "phone_number": "+918854557875",
    "profile_pic": "https://lh3.googleusercontent.com/...",
    "location": "Hyderabad, India",
    "balance": 150.00, // Current coins
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

### B. Update FCM Token
Updates pushing parameters when the device updates token parameters dynamically.

* **Endpoint**: `POST /api/user/fcm-token` (Legacy: `/api/user/update_fcm.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "fcm_token": "new_fcm_token_string"
}
```
* **Success Response**:
```json
{
  "success": true,
  "message": "FCM Token updated successfully"
}
```

---

## 4. Offers, Tiers, & Offline Evidence Verification

### A. List Active Offers (with targeting parameters)
Fetch all campaigns, including daily caps and targeting parameters.

* **Endpoint**: `GET /api/offers` (Legacy: `/api/offers/list.php`)
* **Query Parameters (Optional)**:
  * `user_id`: Filters out already finished offers from list.
  * `country`: Current country string/ISO (e.g. `IN`) to process active regional filters.
* **Success Response**:
```json
{
  "success": true,
  "offers": [
    {
      "id": "77492c19-74d1-4171-87ab-89cd23ef981a",
      "external_id": "kotak_cherry_01",
      "title": "Install & Review Kotak Cherry",
      "description": "Download Kotak Cherry app, register and submit KYC proof.",
      "category": "Finance",
      "iconUrl": "https://stuearn.com/icons/kotak.png",
      "trackingUrl": "https://tracking.stuearn.com/click?offer_id=kotak&pub_id={user_id}",
      "totalReward": 500.00,
      "type": "offline", // "online" (auto server postback) vs "offline" (manual proof)
      "extraLabel": "Hot Payout",
      "estimatedTime": "10 Mins",
      "difficulty": "Medium",
      "likesCount": 42,
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

### B. Trigger Offer (Click Registration)
Call this immediately when a user clicks the offer button. It logs a click action and outputs a `click_id`.

* **Endpoint**: `POST /api/offers/start` (Legacy: `/api/offers/start.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "offer_id": "77492c19-74d1-4171-87ab-89cd23ef981a"
}
```
* **Success Response**:
```json
{
  "success": true,
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9"
}
```

### C. Submit Verification Proof (Offline Campaigns)
For manual campaigns, upload files or input keys.
> [!TIP]
> Upload screenshots or documents to **Firebase Storage** first on the Android app, obtain the public download URL, and pass the URL string inside the `input_data` object matching the schema labels.

* **Endpoint**: `POST /api/offers/submit-proof` (Legacy: `/api/offers/submit_proof.php`)
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
* **Success Response**:
```json
{
  "success": true,
  "message": "Proof submitted successfully"
}
```

---

## 5. Wallet, Transactions, & Strict Integer Cashouts

### A. Fetch Balance & Transaction Ledger
Get ledger entries representing credits/debits.

* **Endpoint**: `GET /api/wallet/transactions`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Success Response**:
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
    }
  ]
}
```

### B. Request Cash Settlement (Withdrawal)
Submit a cashout payout. 

* **Endpoint**: `POST /api/wallet/withdraw` (Legacy: `/api/wallet/withdraw.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "amount": 200,      // Integer value ONLY (Fractional float/double amounts will be rejected)
  "method": "UPI",    // Payment method ID/name
  "details": "devraj@upi" // UPI ID or banking detail parameters
}
```
* **Success Response**:
```json
{
  "success": true,
  "message": "Withdrawal submitted successfully!",
  "transactionId": "withdrawal-uuid-555"
}
```
* **Rejection Error (Float / Double validation fail)**:
```json
{
  "success": false,
  "message": "Invalid withdrawal amount. Only whole integers are accepted. Fractional (float or double) coin values are not allowed."
}
```

---

## 6. Daily Check-In, Streaks, & Spin Wheel Gamification

### A. Streak Status & Claim Check-In
* **Check Status**: `GET /api/user/streak`
* **Claim Daily checkin reward**: `POST /api/user/daily-checkin`
  * **Headers**: `Authorization: Bearer <jwt_token>`
  * **Success Response**:
  ```json
  {
    "success": true,
    "message": "Check-in successful! Streak incremented.",
    "reward": 10.00,
    "new_balance": 160.00
  }
  ```

### B. Play Spin & Win Wheel
* **Check Spins Left**: `GET /api/user/spin`
  * *Response*: `{ "success": true, "spins_left": 5 }`
* **Perform Spin play**: `POST /api/user/spin`
  * **Headers**: `Authorization: Bearer <jwt_token>`
  * **Success Response**:
  ```json
  {
    "success": true,
    "reward": 15.00,
    "new_balance": 175.00
  }
  ```

---

## 7. Support Ticketing Center

### A. List Support Tickets
* **Endpoint**: `GET /api/tickets`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
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

### B. Create Ticket
* **Endpoint**: `POST /api/tickets`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "subject": "Missing Coins for Kotak Cherry",
  "category": "Offer Issue",
  "message": "I completed KYC 3 days ago but haven't received coins."
}
```
* **Success Response**:
```json
{
  "success": true,
  "ticket_id": "ticket-uuid-777",
  "message": "Ticket created successfully"
}
```

### C. Chat Reply to Ticket
* **Endpoint**: `POST /api/tickets/:id/reply`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "message": "Here is my registered mobile: +918854557875"
}
```
* **Success Response**:
```json
{
  "success": true,
  "message": "Reply sent successfully"
}
```
