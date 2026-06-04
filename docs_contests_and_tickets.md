# StuEarn - Contests Cooldown, Support Tickets, & Redeem Code Payouts Documentation

This document covers the implementation, API integration details, and administration workflows for:
1. **Lucky Draw Contest Ad Entry Cooldown**
2. **Support Ticket Message Threads & Replies**
3. **Redeem Voucher Codes for Specific Payout Methods (with Email Dispatch)**

---

## 1. Lucky Draw Contest Ad Entry Cooldown

### Overview
To prevent spam, fraudulent ad completions, and rate-limit ticket entries from video ads, contests now support a configurable cooldown timer (in seconds) for ad-based ticket entries. 

### Admin Configuration
- When creating or editing a contest in the **Admin Panel -> Contests** tab:
  - Check **Enable Ad Ticket Entries**.
  - Provide a value in the **Ad Entry Cooldown (seconds)** field (e.g., `60` for 1 minute, `300` for 5 minutes). Setting this to `0` disables the cooldown.
- The value is stored in the `contests.ad_entry_cooldown` column in the database.

### API Integration (Mobile Client / API)

#### A. Fetching Cooldown Status
When fetching contest details via the user endpoint:
* **Endpoint**: `GET /api/contests/:id` (Authenticated)
* **Response Payload Snippet**:
  ```json
  {
    "success": true,
    "contest": {
      "id": "contest-uuid",
      "title": "Weekly Mega Draw",
      "allow_ad_entry": 1,
      "ad_entry_cooldown": 300,
      "adEntryCooldownRemaining": 184
    }
  }
  ```
* **Client Behavior**: If `adEntryCooldownRemaining` is greater than `0`, the "Watch Ad to Enter" button should display a countdown timer indicating the remaining seconds (e.g., `03:04` remaining) and be disabled. Once the timer hits `0`, it should be re-enabled.

#### B. Submitting Ad Entry
* **Endpoint**: `POST /api/contests/:id/enter`
* **Body**:
  ```json
  {
    "source": "AD"
  }
  ```
* **Validation & Cooldown Check**:
  - The server verifies if the user's last `AD` entry for this contest was within the `ad_entry_cooldown` period.
  - If the user tries to submit an entry while on cooldown, the API rejects it:
    * **Status Code**: `400 Bad Request`
    * **Response**:
      ```json
      {
        "success": false,
        "message": "Ad entry is on cooldown. Please wait."
      }
      ```

---

## 2. Support Ticket Threads & Replies

### Overview
Users can submit support tickets from the mobile app, and administrators can reply to these tickets in a conversational style. The system supports full reply threads, read/write message sequences, and status transitions.

### Ticket Statuses
- `OPEN`: Initial status when created by a user.
- `REPLIED`: Updated when an admin posts a reply.
- `CLOSED`: Set when either the user or admin marks the ticket as resolved. Closed tickets are locked from further replies.

### Visual Styling in Admin Panel
The ticket thread interface has been designed to resemble a premium chat client:
- **Left Aligned (Client Messages)**: Rendered in white bubbles with a subtle border (`#e2e8f0`) and soft shadows, indicating it is an inquiry or follow-up from the client.
- **Right Aligned (Admin Replies)**: Styled with a premium indigo-to-purple gradient background (`linear-gradient(135deg, #4f46e5, #3730a3)`), white text, and shadow, making it stand out as official admin activity.
- **Scroll Tracking**: The messages container automatically tracks scroll position, scrolling to the bottom whenever a new ticket is opened or a reply is sent.
- **Status Indicator Badges**: The list view features state-dependent badges (`badge-warning` for `OPEN`, `badge-primary` for `REPLIED`, and `badge-secondary` for `CLOSED`) and lists items in a clear card layout showing metadata (User Email, Public ID, and Date).

### Admin API Endpoints

#### A. List All Support Tickets
* **Endpoint**: `GET /api/admin/tickets?status=ALL` (or `OPEN`, `REPLIED`, `CLOSED`)
* **Headers**: `Authorization: Bearer <token>`
* **Response**:
  ```json
  {
    "success": true,
    "tickets": [
      {
        "id": "ticket-id",
        "subject": "Coins not credited",
        "message": "I completed an offer but got no coins.",
        "status": "OPEN",
        "created_at": "2026-06-04T10:00:00Z",
        "user_email": "user@example.com",
        "user_public_id": "STU12345"
      }
    ]
  }
  ```

#### B. Fetch Ticket Reply Thread
* **Endpoint**: `GET /api/admin/tickets/:id`
* **Response**:
  ```json
  {
    "success": true,
    "replies": [
      {
        "id": "reply-id",
        "message": "We have credited your coins. Check your wallet.",
        "sender_type": "ADMIN",
        "created_at": "2026-06-04T10:30:00Z"
      }
    ]
  }
  ```

#### C. Post a Reply
* **Endpoint**: `POST /api/admin/tickets/:id/reply`
* **Body**:
  ```json
  {
    "message": "Hello, we are looking into this."
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Reply sent successfully"
  }
  ```

#### D. Close a Ticket
* **Endpoint**: `POST /api/admin/tickets/:id/close`
* **Response**:
  ```json
  {
    "success": true,
    "message": "Ticket closed successfully"
  }
  ```

---

## 3. Redeem Voucher Codes for Payout Methods

### Overview
Certain payout methods (like Google Play Redeem Codes, Amazon Pay Gift Cards) require sending a redeem code to the user rather than transferring funds directly to their bank/UPI account. The system allows designating specific payout methods to request a redeem code from the administrator upon approval.

### Configuration
1. In **Admin Panel -> Payout Methods**:
   - Check **Requires Redeem Code on Approval** when creating/editing a payout method.
   - The value is stored in `payout_methods.requires_redeem_code`.
2. In **Admin Panel -> Awaiting Disbursements**:
   - When clicking **Approve** on a withdrawal request that requires a redeem code:
     - The panel opens a dialog prompt: `Enter the redeem voucher code for <method>:`
     - The administrator enters the code.
     - The code is sent as `redeem_code` in the approval POST body.
     - On successful approval, the code is saved to `withdrawals.redeem_code`.

### Email Dispatch Setup
When the withdrawal is approved with a redeem code, the backend automatically dispatches a premium HTML email directly to the beneficiary's email.
- **Email Resolution**: The system extracts the email from the payment `details` JSON field (looks for any key containing `@` or matching an email address format) and falls back to the user's primary account email if none is found.
- **SMTP Environment Variables**: Make sure to configure SMTP details in the backend `.env` file:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  SMTP_FROM="StuEarn India" <your-email@gmail.com>
  ```
- **Robust Failure Isolation**: If SMTP settings are missing, invalid, or fail during dispatch, the transaction will still be marked as **APPROVED** in the database successfully, logging a warning message rather than returning a server crash.

### User History Display
Approved withdrawals that include a redeem code will expose that code directly to the client app in their transaction history.
- **User Endpoint**: `GET /api/wallet/redeems` or `GET /api/wallet/transactions`
- **Field Returned**: `redeemCode` / `redeem_code`
This lets users fetch their gift codes directly inside the app, ensuring they never lose them even if the email goes to spam.
