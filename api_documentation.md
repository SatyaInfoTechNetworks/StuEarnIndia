# StuEarn India - Android App API Integration Guide

This guide is prepared specifically for the **Android App Developer / Agent** to easily integrate with the modern Node.js/Express backend. All legacy PHP endpoints have been seamlessly migrated, optimized, and secured.

---

## 1. Global Specifications

* **Base URL**: `https://stuearn-api.satyainfotechnetworks.com`
* **Headers Required for Authenticated Routes**:
  * `Authorization`: `Bearer <jwt_token>` (Modern standard, recommended)
  * Alternatively, `token`: `<legacy_base64_token>` (Retained for backwards compatibility)
  * `X-App-Check`: `<firebase_app_check_token>` (Required if Firebase App Check middleware is enabled)

---

## 2. Authentication & Onboarding

All onboarding and sign-in endpoints have been hardened with **Device Fingerprint Telemetry** to prevent account cloning, emulation farms, and self-referral loops.

### A. Google Login Check (Standard Check)
Quickly determine if a Firebase UID already exists in the system before triggering registration.

* **Endpoint**: `POST /api/auth/check_uid` (Legacy fallback: `/api/auth/check_uid.php`)
* **Headers**: `X-App-Check` (if enabled)
* **Request Body**:
```json
{
  "uid": "firebase-google-uid-123456",
  "fcm_token": "fcm_push_token_here" // Optional: Update FCM token during checking
}
```
* **Response (User Found - Proceed to Login)**:
```json
{
  "success": true,
  "exist": true,
  "is_new_user": false,
  "message": "Login successful",
  "token": "dXNlcl9pZDoxNzY2MzQ5Mjgy",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "firebase-google-uid-123456",
    "user_id": "8f3a9e2d7c",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "balance": 150.00,
    "referral_code": "STU888"
  }
}
```
* **Response (User Not Found - Must Trigger Signup)**:
```json
{
  "success": false,
  "exist": false,
  "is_new_user": true,
  "message": "Please register first"
}
```

---

### B. Google Login / Authentication
Verify Google Credentials and securely bind the current physical device to the user account.

* **Endpoint**: `POST /api/auth/google` (Legacy: `/api/auth/google.php`)
* **Headers**: `X-App-Check` (if enabled)
* **Request Body**:
```json
{
  "uid": "firebase-google-uid-123456",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "android_id": "a987d65c432b10", // Secure.ANDROID_ID (Crucial for anti-fraud)
  "device_model": "Pixel 7 Pro",   // Build.MODEL
  "os_version": "Android 14"       // Build.VERSION.RELEASE
}
```

> [!WARNING]
> If `android_id` is passed and has already been bound to *another* existing account (UID), the system blocks the request to prevent account cloning.
> **Fraud Response (HTTP 200 or 400)**:
> ```json
> {
>   "success": false,
>   "message": "Device already registered with another account"
> }
> ```

* **Success Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "dXNlcl9pZDoxNzY2MzQ5Mjgy",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "firebase-google-uid-123456",
    "user_id": "8f3a9e2d7c",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "balance": 150.00,
    "referral_code": "STU27A1B"
  }
}
```

---

### C. User Registration (Signup)
Create a new user profile with absolute device mapping telemetry.

* **Endpoint**: `POST /api/auth/signup` (Legacy: `/api/auth/signup.php`)
* **Headers**: `X-App-Check` (if enabled)
* **Request Body**:
```json
{
  "uid": "firebase-google-uid-123456",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone_number": "9876543210",
  "profile_pic": "https://lh3.googleusercontent.com/a/avatar",
  "location": "IN",                    // User's country code or location
  "referred_by": "REFCODE999",          // Optional Referral Code
  "android_id": "a987d65c432b10",      // Secure.ANDROID_ID (Required for anti-fraud)
  "device_model": "Pixel 7 Pro",        // Build.MODEL
  "os_version": "Android 14",           // Build.VERSION.RELEASE
  "fcm_token": "fcm_push_token_here"
}
```

> [!WARNING]
> Duplicate hardware bindings trigger immediate fraud prevention:
> ```json
> {
>   "success": false,
>   "message": "Device already registered with another account"
> }
> ```

* **Success Response**:
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "dXNlcl9pZDoxNzY2MzQ5Mjgy",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e30e716c-7e61-46ab-bb1e-a4b11a511ff3",
    "uid": "firebase-google-uid-123456",
    "user_id": "8f3a9e2d7c", // Custom 10-char public user ID
    "name": "Jane Doe",
    "email": "jane@example.com",
    "profile_pic": "https://lh3.googleusercontent.com/a/avatar",
    "location": "IN",
    "balance": 0.00,
    "referral_code": "STU27A1B",
    "referred_by": "referred_user_internal_uuid",
    "created_at": "2026-05-21T06:00:00Z"
  }
}
```

---

## 3. Offers & Offline Campaigns Integration

The offers subsystem supports advanced **Daily Completion Caps** and **Dynamic Country Targeting**.

### A. List Active Campaigns (with Geotargeting & Limits)
Retrieve active offers filtered dynamically by country code and decorated with daily limits.

* **Endpoint**: `GET /api/offers` (Legacy: `/api/offers/list.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Query Parameters (Optional)**:
  * `user_id`: Filter out already completed campaigns.
  * `country`: **NEW** - Pass the current country ISO-2 code (e.g. `IN`, `US`) to dynamically filter target regional offers at the database layer.
* **Response**:
```json
{
  "success": true,
  "offers": [
    {
      "id": "77492c19-74d1-4171-87ab-89cd23ef981a",
      "title": "Install & Review Kotak Cherry",
      "description": "Download Kotak Cherry app, register and submit registered mobile number.",
      "category": "Finance",
      "iconUrl": "https://stuearn.com/icons/kotak.png",
      "trackingUrl": "https://tracking.stuearn.com/click?offer_id=kotak&pub_id={user_id}",
      "totalReward": 500.00,
      "type": "offline",
      "extraLabel": "Hot Payout",
      "estimatedTime": "10 Mins",
      "difficulty": "Medium",
      "likesCount": 42,
      "dailyCompletionCap": 100,      // Max allowed completions today across all users (0 = unlimited)
      "completionsToday": 14,          // Completed count today
      "isCapped": false,               // True if completionsToday >= dailyCompletionCap
      "countryTargeting": "IN,US",     // Allowed regions (comma-separated, null or * = all)
      "tiers": [
        {
          "id": "tier-1-uuid",
          "title": "Registration complete",
          "reward": "500.00",
          "steps": ["Install app", "Complete full KYC registration"]
        }
      ]
    }
  ]
}
```

---

### B. Trigger/Start a Campaign
Generate a unique `click_id` before launching target affiliate links. 

* **Endpoint**: `POST /api/offers/start` (Legacy: `/api/offers/start.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "offer_id": "77492c19-74d1-4171-87ab-89cd23ef981a"
}
```

> [!IMPORTANT]
> The backend automatically validates whether:
> 1. The offer is capped (`isCapped` = true). If so, it rejects starting:
>    ```json
>    { "success": false, "message": "Daily completion limit reached for this offer" }
>    ```
> 2. The user's region matches the targeting boundaries:
>    ```json
>    { "success": false, "message": "This offer is not available in your region" }
>    ```

* **Success Response**:
```json
{
  "success": true,
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9"
}
```

> [!IMPORTANT]
> The resulting `click_id` is essential for submitting proof files/keys back to the backend. The app **MUST** store this click ID during the campaign runtime.

---

### C. Submit Manual Verification Evidence (Offline Proofs)
For manual campaigns (where `type = "offline"`), submit the proof items defined in the offer's `input_instruction` schema.

* **Endpoint**: `POST /api/offers/submit-proof` (Legacy: `/api/offers/submit_proof.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "click_id": "a6f87d4c-e832-4752-9b2f-410a8274dcd9",
  "input_data": {
    "Registered Phone Number": "9988776655",
    "Upload Completion Screenshot": "https://firebasestorage.googleapis.com/.../screenshot1.png"
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

> [!TIP]
> Upload screenshots or documents to **Firebase Storage** first on the Android app, obtain the public download URL, and pass the URL string inside the `input_data` object matching the schema labels.

---

## 4. Wallet & Cash Settlements

### A. Get Balance & Wallet Ledger
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
      "source": "OFFLINE_OFFER", // CREDITED via manual proof verification passing
      "description": "Completed offline task: Install & Review Kotak Cherry",
      "created_at": "2026-05-21T06:15:00Z"
    }
  ]
}
```

---

### B. Request Cash Withdrawal
Submit a request to withdraw coins/money using direct UPI ID or banking details.

* **Endpoint**: `POST /api/wallet/withdraw` (Legacy: `/api/wallet/withdraw.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "amount": 200.00,
  "method": "UPI",
  "details": "devraj@upi"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully"
}
```

---

## 5. Daily Gamification & Streaks

### A. Fetch Streak Status
* **Endpoint**: `GET /api/user/streak` (Legacy: `/api/user/streak.php`)
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Response**:
```json
{
  "success": true,
  "current_streak": 3,
  "is_today_claimed": false
}
```

### B. Claim Daily Check-In
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

### C. Spin the Wheel Status & Play
* **Check Status**: `GET /api/user/spin`
* **Perform Spin**: `POST /api/user/spin`
  * *Request Body*: None
  * *Response*:
```json
{
  "success": true,
  "reward": 15.00,
  "new_balance": 175.00
}
```

---

## 6. Support Ticketing Center

### A. Create Support Ticket
* **Endpoint**: `POST /api/tickets`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "subject": "Missing Coins for Kotak Cherry",
  "category": "Offer Issue",
  "message": "I completed the task Kotak Cherry 3 days ago but haven't received my coins yet."
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

### B. Reply to Ticket / Chat
* **Endpoint**: `POST /api/tickets/:id/reply`
* **Headers**: `Authorization: Bearer <jwt_token>`
* **Request Body**:
```json
{
  "message": "Here is my registered email: test@example.com"
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Reply sent successfully"
}
```
