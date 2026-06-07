# StuEarn India — Custom Offer System Master Documentation

This document provides a comprehensive overview of the **Custom Offer System** built for StuEarn India. It explains the system's purpose, database architecture, administration capabilities, API specifications, and frontend-backend communications.

---

## 1. System Overview & Purpose

The **Custom Offer System** is a core monetization and engagement feature in the StuEarn India platform. Unlike standard third-party advertising SDKs or offerwalls (like Pubscale, CPX Research, etc.), custom offers are curated and controlled directly by the platform's administrators.

### Core Features
1. **Online vs. Offline Tasks**:
   - **Online Tasks (`type: 'online'`)**: Typically external redirects where completion is tracked automatically (e.g., via S2S postback webhooks using the generated `click_id`).
   - **Offline/Manual Tasks (`type: 'offline'`)**: Require manual verification. Users complete a task and submit a text answer, transaction ID, or screenshot link as proof. The admin reviews and approves/rejects the submission.
2. **Reward Structure**:
   - **Single Reward**: Users get a single reward upon completing the entire offer.
   - **Multi Reward (Tiers)**: Offers can have multiple sub-tasks (tiers) with individual coin rewards. Users get paid as they complete each step (e.g., Step 1: Register = 50 coins, Step 2: Level 5 = 50 coins, Step 3: Level 10 = 50 coins).
3. **Geo-Targeting & Completion Controls**:
   - **Country Targeting**: Restricts offers to specific regions (e.g., `IN` for India, or `*` for all countries) using the user's location.
   - **Daily Completion Cap**: Restricts the maximum number of times an offer can be completed daily. If reached, the offer is temporarily disabled for the day (`isCapped = true`).
4. **Hot Offers**:
   - Offers marked as `is_hot = true` are highlighted on the user dashboard. Marking a new offer as hot automatically resets the hot status of other offers to maintain focus on a single featured offer.

---

## 2. Database Architecture

The Custom Offer System is powered by three primary tables: `offers`, `offer_tiers`, and `user_offer_progress`, alongside the `offer_completions` statistical table and transaction ledger tables.

### 2.1 The `offers` Table
Stores the master metadata for each offer.
```sql
CREATE TABLE IF NOT EXISTS offers (
  id CHAR(36) PRIMARY KEY,
  external_id VARCHAR(255) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  tracking_url TEXT NULL,
  total_reward DECIMAL(10, 2) DEFAULT 0.00,
  actual_price DECIMAL(10, 2) DEFAULT 0.00,  -- Internal cost/budget price
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  likes_count INT DEFAULT 0,
  is_hot BOOLEAN DEFAULT FALSE,
  type VARCHAR(50) DEFAULT 'online',         -- 'online' or 'offline'
  input_type VARCHAR(50) NULL,               -- For offline tasks: 'text', 'screenshot', etc.
  input_instruction TEXT NULL,               -- Instructions on what proof to submit
  reward_type VARCHAR(50) DEFAULT 'Multi Reward',
  extra_label VARCHAR(100) NULL,             -- Custom badge, e.g. "🔥 Limited"
  estimated_time VARCHAR(100) NULL,
  difficulty VARCHAR(50) DEFAULT 'Medium',
  daily_completion_cap INT DEFAULT 0,        -- 0 = unlimited
  country_targeting VARCHAR(255) DEFAULT 'IN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 The `offer_tiers` Table
Stores individual steps/milestones for multi-tier rewards.
```sql
CREATE TABLE IF NOT EXISTS offer_tiers (
  id CHAR(36) PRIMARY KEY,
  offer_id CHAR(36) NOT NULL,
  title VARCHAR(255),                        -- Legacy title field
  tier_title VARCHAR(255) NULL,               -- Internal backend title
  app_tier_title VARCHAR(255) NULL,           -- User-facing display title
  reward DECIMAL(10, 2) DEFAULT 0.00,
  steps JSON,                                -- Array of step instructions
  sequence INT DEFAULT 1,                    -- Ordering index
  status VARCHAR(50) DEFAULT 'ACTIVE',
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 The `user_offer_progress` Table
Tracks user engagement, clicked tracking states, tier completion details, and manual proof submissions.
```sql
CREATE TABLE IF NOT EXISTS user_offer_progress (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  offer_id CHAR(36) NOT NULL,
  click_id VARCHAR(255) UNIQUE NULL,         -- Generated click tracking ID
  status ENUM('STARTED', 'COMPLETED') DEFAULT 'STARTED',
  completed_tiers JSON,                      -- Array of completed tiers, e.g. [{"title": "Install", "reward": 50, "completed_at": "..."}]
  user_input TEXT NULL,                      -- Submitted manual proof (string or JSON)
  admin_status VARCHAR(50) DEFAULT 'PENDING',-- For offline tasks: 'PENDING', 'APPROVED', 'REJECTED'
  admin_remark TEXT NULL,                    -- Admin remarks or rejection reason
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.4 Index Optimizations
To handle high-traffic operations, the following indexes are applied:
- `idx_user_offer_status`: Speed up user progress checks (`(user_id, offer_id, status)`).
- `idx_offer_type_status`: Optimize admin panel dashboard loading for pending offline tasks (`(admin_status, last_updated DESC)`).
- `idx_offer_active_hot`: Speed up dashboard feeds filtering active and hot offers (`(is_active, is_hot)`).

---

## 3. Admin Panel Capabilities

The admin panel frontend (`AdminPortal.jsx`) communicates with the backend `adminController.js` to manage offers and verify tasks. 

### 3.1 Offer Management Actions
Administrators can execute the following operations:
1. **Create Offer**: Adds metadata and associated tiers. Setting `is_hot` to `true` automatically updates all other offers to `is_hot = 0` to preserve the single featured spot.
2. **Update Offer**: Updates properties (active status, description, caps, country restrictions) and syncs the tiers array atomically (deletes and re-inserts tiers sequence).
3. **Delete Offer**: Permanently drops the offer and cascade deletes all user progress records.
4. **List Offers**: Displays offers with statistics like completion count (`completion_count`) and tier count.

### 3.2 Offline Proof Verification System
For offline tasks, the user submits proof via the app, which sets the `admin_status` of their progress record to `PENDING`.
- **View Pending Proofs**: The admin views a dedicated table showing:
  - User details (name, email, current balance).
  - Offer details (title, total reward, expected input type, instructions).
  - Submitted proof (parsed JSON fields or text strings, e.g. transaction IDs, screenshot URLs).
- **Approve Proof**:
  - Automatically updates the user's progress: `admin_status = 'APPROVED'`, `status = 'COMPLETED'`, `admin_remark = 'Approved by Admin'`.
  - Credits the user's wallet balance using a double-entry ledger transaction (`recordLedgerTransaction` with source `'OFFLINE_OFFER'`).
  - Registers the completion in `offer_completions` for user statistics and leaderboard integration.
  - Sends a push notification: **"Task Approved! 🎉"** containing credit details.
- **Reject Proof**:
  - Updates the progress: `admin_status = 'REJECTED'`, `admin_remark = <rejection_reason>`.
  - Sends a push notification: **"Task Proof Rejected ⚠️"** containing the explanation.

---

## 4. Frontend Response Formatting & API Specifications

To support multiple platforms—specifically **React Native mobile apps** (which conventionally expect camelCase keys) and **Admin React portals** (which expect snake_case fields)—the backend incorporates **Dual-Casing Compatibility**. It returns both versions of parameters (e.g., `iconUrl` and `icon_url`, `totalReward` and `total_reward`).

### 4.1 Get Active Offers List
Returns active offers filtered by category, search strings, country targeting, and excluding completed offers.

* **Endpoint**: `GET /api/offers`
* **Query Parameters**:
  - `user_id` (string, optional) - Resolves user UUID to filter out already completed offers.
  - `country` (string, optional) - User's region (e.g., `IN`). Filters out geofenced offers.
  - `category` (string, optional) - Category filter.
  - `search` (string, optional) - Search title/description.
* **Sample Response (`200 OK`)**:
```json
{
  "success": true,
  "offers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "external_id": "ext_ludo_01",
      "title": "Reach Level 10 in Ludo",
      "description": "Download and play Ludo to Level 10.",
      "category": "Gaming",
      "iconUrl": "https://cdn.stuearn.in/icon.png",
      "icon_url": "https://cdn.stuearn.in/icon.png",
      "trackingUrl": "https://track.stuearn.in/go?click_id={click_id}&uid={user_id}",
      "tracking_url": "https://track.stuearn.in/go?click_id={click_id}&uid={user_id}",
      "totalReward": 100.0,
      "total_reward": 100.0,
      "type": "online",
      "inputType": null,
      "input_type": null,
      "isCompleted": false,
      "rewardType": "Multi Reward",
      "reward_type": "Multi Reward",
      "dailyCompletionCap": 200,
      "completionsToday": 42,
      "isCapped": false,
      "tiers": [
        {
          "id": 1,
          "title": "Install Game",
          "backend_title": "Install Game",
          "reward": "40.00",
          "status": "ACTIVE",
          "steps": ["Search for Ludo", "Install and open"]
        }
      ]
    }
  ]
}
```

### 4.2 Get Offer Details
Retrieves details of a single offer. If `user_id` is supplied, it also returns the user's progress, completion status, and custom proof remarks.

* **Endpoint**: `GET /api/offers/:id` or `GET /api/offers/detail?id=:id`
* **Query Parameters**:
  - `user_id` (string, optional) - User UID or hex public ID.
* **Sample Response (`200 OK`)**:
```json
{
  "success": true,
  "offer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Reach Level 10 in Ludo",
    "totalReward": 100.0,
    "total_reward": 100.0,
    "actualPrice": 12.0,
    "actual_price": 12.0,
    "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
    "isCompleted": false,
    "adminStatus": "PENDING",
    "userInput": {
      "transaction_id": "TXN998822"
    },
    "rejectionReason": null,
    "tiers": [
      {
        "id": 1,
        "title": "Install Game",
        "backend_title": "Install Game",
        "reward": "40.00",
        "is_completed": true
      }
    ]
  }
}
```

### 4.3 Start Offer (Click Logging)
Logs the offer starting point. Resolves variables in the offer's `tracking_url` so the frontend can redirect the user.

* **Endpoint**: `POST /api/offers/start` (Requires JWT bearer authentication)
* **Request Body**:
```json
{
  "user_id": "SE1A2B3C",
  "offer_id": "550e8400-e29b-41d4-a716-446655440000",
  "gaid": "38400000-8cf0-11bd-b23e-10b96e40000d",
  "device_model": "Samsung SM-G998B"
}
```
* **Dynamic URL Placeholders**:
  The system automatically parses the raw database tracking URL and replaces placeholders:
  - `{click_id}`, `{clickId}`, `{TRANS_ID}`, `{trans_id}` $\rightarrow$ Unique Click UUID.
  - `{user_id}`, `{userId}`, `{USER_ID}`, `{UID}`, `{uid}` $\rightarrow$ User's ID.
  - `{gaid}`, `{GAID}`, `{ad_id}`, `{AD_ID}` $\rightarrow$ Google Advertising ID (`gaid`).
  - `{guid}`, `{GUID}` $\rightarrow$ Replaced with `gaid` (Google Ads ID).
  - `{device_model}`, `{DEVICE_MODEL}` $\rightarrow$ URL-encoded device model.
* **Sample Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Offer started successfully",
  "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
  "url": "https://track.stuearn.in/go?click_id=3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d&uid=SE1A2B3C&ad_id=38400000-8cf0-11bd-b23e-10b96e40000d"
}
```

### 4.4 Submit Proof (Offline Tasks)
Submits manual answers, transaction IDs, or screenshot paths for manual verification.

* **Endpoint**: `POST /api/offers/submit-proof`
* **Request Body**:
```json
{
  "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
  "input_data": {
    "screenshot_url": "https://stuearn-uploads.s3.amazonaws.com/proofs/user_112_screenshot.png",
    "transaction_id": "TXN998822"
  }
}
```
* **Sample Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Proof submitted successfully"
}
```

### 4.5 Get Offer History
Retrieves list of offers started/completed by the user.

* **Endpoint**: `GET /api/offers/history`
* **Query Parameters**:
  - `user_id` (string, required)
* **Sample Response (`200 OK`)**:
```json
{
  "success": true,
  "history": [
    {
      "clickId": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
      "offerId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Reach Level 10 in Ludo",
      "iconUrl": "https://cdn.stuearn.in/icon.png",
      "totalReward": 100.0,
      "status": "STARTED",
      "statusText": "Started",
      "completedTiersCount": 1,
      "completedTiers": [
        {
          "title": "Install Game",
          "reward": 40,
          "completed_at": "2026-06-01T12:00:00.000Z"
        }
      ],
      "lastUpdated": "2026-06-01T12:00:00.000Z"
    }
  ]
}
```

---

## 5. Admin API Endpoints Reference

All administrative endpoints require authentication using the `Authorization: Bearer <admin_jwt_token>` header.

### 5.1 Offer Management
* **List Admin Offers**: `GET /api/admin/offers`
  - Returns active and inactive offers, completions count, and tier count.
* **Create Custom Offer**: `POST /api/admin/offers`
  - Accepts full JSON payload of metadata and tiers array.
* **Update Custom Offer**: `PUT /api/admin/offers/:id`
  - Accepts partial fields to update.
* **Delete Custom Offer**: `DELETE /api/admin/offers/:id`
  - Cascades deleted records from related tables.

### 5.2 Proof Validation Management
* **Get Pending Proofs**: `GET /api/admin/proofs`
  - Returns pending proofs for offline offers.
* **Approve User Proof**: `POST /api/admin/proofs/:clickId/approve`
  - Approves and credits coins.
* **Reject User Proof**: `POST /api/admin/proofs/:clickId/reject`
  - Rejects and logs remarks.
  - Request body: `{ "reason": "Screenshot blurred" }`

---

## 6. Frontend Integration Guidelines

### 6.1 Admin Portal Form Structure
The administration panel integrates offer creation using React. The state payload structure includes:
```javascript
const [offerForm, setOfferForm] = useState({
  title: '',
  external_id: '',
  description: '',
  category: 'Top Offers',
  icon_url: '',
  tracking_url: '',
  total_reward: 0,
  actual_price: 0,
  is_active: true,
  type: 'online',
  reward_type: 'Multi Reward',
  estimated_time: '5 mins',
  difficulty: 'Medium',
  is_hot: false,
  extra_label: '',
  input_type: '',
  input_instruction: [],
  tiers: [],
  daily_completion_cap: 0,
  country_targeting: 'IN'
});
```
Tiers are added dynamically by appending objects to the `tiers` array:
```javascript
const addTierToForm = () => {
  const nextSeq = offerForm.tiers.length + 1;
  setOfferForm({
    ...offerForm,
    tiers: [
      ...offerForm.tiers,
      { 
        title: `Tier ${nextSeq}`, 
        backend_title: `tier_${nextSeq}`, 
        reward: 10, 
        steps: ['Instruction Step 1'], 
        sequence: nextSeq 
      }
    ]
  });
};
```

### 6.2 Mobile Client App Integration Flow
To integrate custom offers in the client app:
1. **Fetch Offers**: Send a request to `GET /api/offers?user_id=...&country=...` to display active offers.
2. **Display Details**: On selection, call `GET /api/offers/:id?user_id=...` to fetch specific details, completed tiers (`is_completed`), and pending manual status.
3. **Start & Redirect**:
   - When a user clicks "Start Offer", invoke `POST /api/offers/start` with `{ user_id, offer_id, gaid, device_model }`.
   - The API resolves and returns a tracking URL. Open this URL in the browser/webview using `Linking.openURL()`.
4. **Submit Proof**:
   - If `type` is `offline`, render fields based on `inputType` (e.g., File Upload for screenshots, Text Input for transaction IDs).
   - Once the user uploads assets, call `POST /api/offers/submit-proof` with the `click_id` and the input payload.
   - Show a pending status indicators while `adminStatus` is `'PENDING'`. Show approval or rejection remarks based on `adminStatus` and `rejectionReason`.
