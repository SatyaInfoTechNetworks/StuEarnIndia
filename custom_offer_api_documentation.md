# StuEarn India — Custom Offer API Documentation

Full reference for the **Custom Offer System** used by the StuEarn India mobile app.  
Base URL: `https://stuearn-api.satyainfotechnetworks.com`

> All authenticated endpoints require the `Authorization: Bearer <jwt_token>` header.  
> The JWT token is obtained after Google sign-in / signup.

---

## Table of Contents

1. [List All Offers](#1-list-all-offers)
2. [Get Offer Details](#2-get-offer-details)
3. [Get Hot Offers](#3-get-hot-offers)
4. [Start Offer (Click Logging)](#4-start-offer-click-logging)
5. [Like Offer](#5-like-offer)
6. [Submit Proof (Manual / Offline Tasks)](#6-submit-proof-manual--offline-tasks)
7. [Get Offer History](#7-get-offer-history)
8. [Admin — List All Offers](#8-admin--list-all-offers)
9. [Admin — Create Offer](#9-admin--create-offer)
10. [Admin — Update Offer](#10-admin--update-offer)
11. [Admin — Delete Offer](#11-admin--delete-offer)
12. [Data Models](#12-data-models)
13. [Error Responses](#13-error-responses)

---

## 1. List All Offers

Returns all **active** custom offers, optionally filtered by category, country, search, and excluding already-completed offers for a user.

**Endpoint:** `GET /api/offers`  
**Auth:** None required (pass `user_id` to exclude completed offers)

### Query Parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `user_id`  | string | No       | User's public hex ID, UUID, or Firebase UID. Excludes completed offers if supplied. |
| `category` | string | No       | Filter by category name. Case-insensitive. e.g. `Gaming`, `Survey`, `Finance` |
| `search`   | string | No       | Full-text search across title and description. |
| `country`  | string | No       | Two-letter country code e.g. `IN`. Filters out geo-restricted offers. |

### Sample Request

```http
GET /api/offers?user_id=SE1A2B3C&category=Gaming&country=IN
Authorization: Bearer eyJhbGci...
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "offers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "external_id": "ext_game_001",
      "title": "Play Ludo King & Reach Level 10",
      "description": "Download Ludo King, create an account and reach Level 10 to earn your reward.",
      "category": "Gaming",
      "iconUrl": "https://cdn.stuearnmedia.in/offers/ludo.png",
      "trackingUrl": "https://tracking.stuearnmedia.in/go?offer_id=550e8400-e29b-41d4-a716-446655440000&user_id={USER_ID}",
      "totalReward": 150.0,
      "type": "online",
      "inputType": null,
      "inputInstruction": null,
      "isCompleted": false,
      "rewardType": "Multi Reward",
      "extraLabel": "🎮 Popular",
      "estimatedTime": "30 mins",
      "difficulty": "Easy",
      "likesCount": 342,
      "isHot": true,
      "dailyCompletionCap": 500,
      "countryTargeting": "IN",
      "completionsToday": 127,
      "isCapped": false,
      "tiers": [
        {
          "id": 1,
          "title": "Install & Register",
          "backend_title": "Install & Register",
          "reward": "50",
          "status": "active",
          "steps": [
            "Download Ludo King from Play Store",
            "Create a new account using your email",
            "Verify your email"
          ]
        },
        {
          "id": 2,
          "title": "Reach Level 5",
          "backend_title": "Reach Level 5",
          "reward": "50",
          "status": "active",
          "steps": [
            "Play 5 multiplayer matches",
            "Win at least 2 matches"
          ]
        },
        {
          "id": 3,
          "title": "Reach Level 10",
          "backend_title": "Reach Level 10",
          "reward": "50",
          "status": "active",
          "steps": [
            "Continue playing to reach Level 10",
            "Screenshot your Level 10 achievement"
          ]
        }
      ]
    }
  ]
}
```

### Empty Response

```json
{
  "success": true,
  "offers": []
}
```

---

## 2. Get Offer Details

Returns complete details of a single offer, including the user's current progress and tier completion status.

**Endpoint:** `GET /api/offers/:id`  
**Alt Endpoint:** `GET /api/offers/detail?id=:id`  
**Auth:** None required (pass `user_id` to get personalized progress)

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Offer UUID |

### Query Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `user_id` | string | No       | User's public hex ID, UUID, or Firebase UID. Returns personalized progress if supplied. |

### Sample Request

```http
GET /api/offers/550e8400-e29b-41d4-a716-446655440000?user_id=SE1A2B3C
```

### Sample Response `200 OK`

> [!TIP]
> **Multi-Casing Compatibility Support:** To support both standard client/mobile React Native codebases (which expect camelCase properties) and admin portal components (which expect snake_case properties), the endpoint maps and returns **both casing styles** simultaneously (e.g. `iconUrl` and `icon_url`, `totalReward` and `total_reward`). This eliminates translation overhead. It also includes the previously missing `actual_price` / `actualPrice` (Internal Budget Price) and `is_active` / `isActive` fields.

```json
{
  "success": true,
  "offer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "external_id": "ext_game_001",
    "title": "Play Ludo King & Reach Level 10",
    "description": "Download Ludo King, create an account and reach Level 10 to earn your reward.",
    "category": "Gaming",
    "iconUrl": "https://cdn.stuearnmedia.in/offers/ludo.png",
    "icon_url": "https://cdn.stuearnmedia.in/offers/ludo.png",
    "trackingUrl": "https://tracking.stuearnmedia.in/go?offer_id=550e8400&user_id={USER_ID}",
    "tracking_url": "https://tracking.stuearnmedia.in/go?offer_id=550e8400&user_id={USER_ID}",
    "totalReward": 150.0,
    "total_reward": 150.0,
    "actualPrice": 10.0,
    "actual_price": 10.0,
    "isActive": true,
    "is_active": true,
    "type": "online",
    "inputType": null,
    "input_type": null,
    "inputInstruction": null,
    "input_instruction": null,
    "isCompleted": false,
    "rewardType": "Multi Reward",
    "reward_type": "Multi Reward",
    "extraLabel": "🎮 Popular",
    "extra_label": "🎮 Popular",
    "estimatedTime": "30 mins",
    "estimated_time": "30 mins",
    "difficulty": "Easy",
    "likesCount": 342,
    "isHot": true,
    "is_hot": true,
    "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
    "userInput": null,
    "adminStatus": null,
    "rejectionReason": null,
    "dailyCompletionCap": 500,
    "daily_completion_cap": 500,
    "countryTargeting": "IN",
    "country_targeting": "IN",
    "completionsToday": 127,
    "isCapped": false,
    "tiers": [
      {
        "id": 1,
        "title": "Install & Register",
        "backend_title": "Install & Register",
        "reward": "50",
        "status": "active",
        "steps": ["Download Ludo King from Play Store", "Create account", "Verify email"],
        "is_completed": true
      },
      {
        "id": 2,
        "title": "Reach Level 5",
        "backend_title": "Reach Level 5",
        "reward": "50",
        "status": "active",
        "steps": ["Play 5 multiplayer matches", "Win at least 2 matches"],
        "is_completed": false
      }
    ]
  }
}
```

### Not Found Response `404`

```json
{
  "success": false,
  "message": "Offer not found"
}
```

---

## 3. Get Hot Offers

Returns up to **20 active offers** that have been marked as `is_hot = true`.

**Endpoint:** `GET /api/offers/hot`  
**Auth:** None required

### Query Parameters

Same as [List All Offers](#1-list-all-offers): `user_id`, `country`

### Sample Request

```http
GET /api/offers/hot?country=IN
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "offers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Play Ludo King & Reach Level 10",
      "category": "Gaming",
      "iconUrl": "https://cdn.stuearnmedia.in/offers/ludo.png",
      "totalReward": 150.0,
      "type": "online",
      "isHot": true,
      "difficulty": "Easy",
      "estimatedTime": "30 mins",
      "likesCount": 342,
      "isCompleted": false,
      "isCapped": false,
      "dailyCompletionCap": 500,
      "completionsToday": 127,
      "tiers": [...]
    }
  ]
}
```

---

## 4. Start Offer (Click Logging)

Logs the start of an offer for a user and generates a unique `click_id` for tracking and reward attribution.  
If the user has already started this offer, the existing `click_id` is returned.

**Endpoint:** `POST /api/offers/start`  
**Auth:** Required `Authorization: Bearer <jwt_token>`

### Request Body (JSON)

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `user_id`  | string | Yes      | User's public hex ID, UUID, or Firebase UID |
| `offer_id` | string | Yes      | Offer UUID to start |

### Sample Request

```http
POST /api/offers/start
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "user_id": "SE1A2B3C",
  "offer_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Sample Response `200 OK` — New Start

```json
{
  "success": true,
  "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d"
}
```

### Sample Response `200 OK` — Already Started

```json
{
  "success": true,
  "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d"
}
```

### Error Responses

```json
{ "success": false, "message": "Daily completion limit reached for this offer" }
{ "success": false, "message": "This offer is not available in your region" }
{ "success": false, "message": "User not found" }
{ "success": false, "message": "Offer not found" }
```

---

## 5. Like Offer

Adds a like from the authenticated user to the specified offer. Each user can only like an offer once.

**Endpoint:** `POST /api/offers/:id/like`  
**Alt Endpoint:** `POST /api/offers/like`  
**Auth:** Required `Authorization: Bearer <jwt_token>`

### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `id`      | string | Yes      | Offer UUID |

### Sample Request

```http
POST /api/offers/550e8400-e29b-41d4-a716-446655440000/like
Authorization: Bearer eyJhbGci...
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "message": "Offer liked successfully"
}
```

### Already Liked Response

```json
{
  "success": false,
  "message": "Already liked"
}
```

---

## 6. Submit Proof (Manual / Offline Tasks)

Submits user input/proof for manual verification tasks (e.g. screenshot URLs, form answers, transaction IDs). The admin reviews the submission and approves/rejects it.

**Endpoint:** `POST /api/offers/submit-proof`  
**Auth:** None required (uses `click_id` for identification)

### Request Body (JSON)

| Field        | Type            | Required | Description |
|--------------|-----------------|----------|-------------|
| `click_id`   | string          | Yes      | The `click_id` generated when the offer was started |
| `input_data` | object or string | Yes     | User's proof data. Can be a JSON object or a plain string. |

### Sample Request — Single Input

```http
POST /api/offers/submit-proof
Content-Type: application/json

{
  "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
  "input_data": "UTR123456789"
}
```

### Sample Request — Multi-field Input

```http
POST /api/offers/submit-proof
Content-Type: application/json

{
  "click_id": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
  "input_data": {
    "screenshot_url": "https://drive.google.com/file/d/abc123",
    "transaction_id": "UTR123456789",
    "note": "Completed Level 10 on 31st May 2026"
  }
}
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "message": "Proof submitted successfully"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Missing click_id or input_data"
}
```

```json
{
  "success": false,
  "message": "Failed to submit proof. Invalid Click ID or already completed."
}
```

---

## 7. Get Offer History

Returns the user's complete offer history — including started, completed, and pending manual verification offers.

**Endpoint:** `GET /api/offers/history`  
**Auth:** None required (pass `user_id` as query param)

### Query Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `user_id` | string | Yes      | User's public hex ID, UUID, or Firebase UID |

### Sample Request

```http
GET /api/offers/history?user_id=SE1A2B3C
Authorization: Bearer eyJhbGci...
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "history": [
    {
      "clickId": "3b1cd8e4-aa01-4f9e-b3a1-8d5f2a2b6c3d",
      "offerId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Play Ludo King & Reach Level 10",
      "iconUrl": "https://cdn.stuearnmedia.in/offers/ludo.png",
      "totalReward": 150.0,
      "category": "Gaming",
      "status": "COMPLETED",
      "statusText": "Completed",
      "completedTiersCount": 3,
      "completedTiers": [
        {
          "title": "Install & Register",
          "reward": 50.0,
          "completed_at": "2026-05-30T10:15:22.000Z"
        },
        {
          "title": "Reach Level 5",
          "reward": 50.0,
          "completed_at": "2026-05-30T11:45:10.000Z"
        },
        {
          "title": "Reach Level 10",
          "reward": 50.0,
          "completed_at": "2026-05-30T14:20:55.000Z"
        }
      ],
      "lastUpdated": "2026-05-30T14:20:55.000Z"
    },
    {
      "clickId": "9f3ac12b-bb02-5e0d-c4b2-9e6f3b3c7d4e",
      "offerId": "660f9500-f30c-52e5-b827-557766551111",
      "title": "Fill HDFC Credit Card Form",
      "iconUrl": "https://cdn.stuearnmedia.in/offers/hdfc.png",
      "totalReward": 300.0,
      "category": "Finance",
      "status": "STARTED",
      "statusText": "Started",
      "completedTiersCount": 0,
      "completedTiers": [],
      "lastUpdated": "2026-05-31T08:00:00.000Z"
    }
  ]
}
```

### Status Values

| Status       | Description |
|--------------|-------------|
| `STARTED`    | User clicked the offer. Tier progress may be ongoing. |
| `COMPLETED`  | All tiers completed and rewards credited. |
| `PENDING`    | Manual proof submitted, waiting for admin review. |

---

## 8. Admin — List All Offers

Returns all offers in the database (active and inactive) for admin management.

**Endpoint:** `GET /api/admin/offers`  
**Auth:** Admin JWT required

### Sample Request

```http
GET /api/admin/offers
Authorization: Bearer <admin_token>
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "offers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Play Ludo King & Reach Level 10",
      "category": "Gaming",
      "type": "online",
      "total_reward": 150,
      "is_active": 1,
      "is_hot": 1,
      "difficulty": "Easy",
      "estimated_time": "30 mins",
      "daily_completion_cap": 500,
      "country_targeting": "IN",
      "created_at": "2026-05-01T10:00:00.000Z"
    }
  ]
}
```

---

## 9. Admin — Create Offer

Creates a new custom offer in the database.

**Endpoint:** `POST /api/admin/offers`  
**Auth:** Admin JWT required  
**Content-Type:** `application/json`

### Request Body

| Field                | Type    | Required | Description |
|----------------------|---------|----------|-------------|
| `title`              | string  | Yes      | Offer display title |
| `description`        | string  | Yes      | Full offer description |
| `category`           | string  | Yes      | e.g. `Gaming`, `Survey`, `Finance`, `Shopping` |
| `icon_url`           | string  | No       | URL to offer icon/logo |
| `tracking_url`       | string  | No       | Postback or tracking link |
| `total_reward`       | number  | Yes      | Total coins reward for offer |
| `type`               | string  | No       | `online` (default) or `offline` |
| `input_type`         | string  | No       | `text`, `image`, `screenshot` etc for manual tasks |
| `input_instruction`  | string  | No       | Instructions shown to user for proof submission |
| `reward_type`        | string  | No       | `Single Reward` or `Multi Reward` |
| `extra_label`        | string  | No       | Promotional badge e.g. `🔥 Limited` |
| `estimated_time`     | string  | No       | e.g. `15 mins`, `1 hour` |
| `difficulty`         | string  | No       | `Easy`, `Medium`, `Hard` |
| `is_hot`             | boolean | No       | Mark as hot/featured. Default `false` |
| `is_active`          | boolean | No       | Default `true` |
| `daily_completion_cap` | number | No     | Max completions per day. `0` = unlimited |
| `country_targeting`  | string  | No       | Comma-separated ISO codes e.g. `IN,US` or `*` for all |
| `tiers`              | array   | No       | Array of tier objects (see below) |

#### Tier Object

| Field            | Type    | Required | Description |
|------------------|---------|----------|-------------|
| `tier_title`     | string  | Yes      | Internal tier label |
| `app_tier_title` | string  | No       | User-facing tier label shown in app |
| `reward`         | number  | Yes      | Coins for completing this tier |
| `status`         | string  | No       | `active` or `inactive`. Default `active` |
| `steps`          | array   | No       | Array of step instruction strings |

### Sample Request

```http
POST /api/admin/offers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Download PhonePe & Make First UPI Payment",
  "description": "Install PhonePe, register and make your first UPI payment to earn coins.",
  "category": "Finance",
  "icon_url": "https://cdn.stuearnmedia.in/offers/phonepe.png",
  "total_reward": 200,
  "type": "online",
  "reward_type": "Multi Reward",
  "extra_label": "💰 High Reward",
  "estimated_time": "15 mins",
  "difficulty": "Easy",
  "is_hot": true,
  "is_active": true,
  "daily_completion_cap": 1000,
  "country_targeting": "IN",
  "tiers": [
    {
      "tier_title": "Install & Register",
      "app_tier_title": "Step 1: Install & Register",
      "reward": 50,
      "steps": [
        "Download PhonePe from Play Store",
        "Register with your mobile number",
        "Verify OTP"
      ]
    },
    {
      "tier_title": "Link Bank Account",
      "app_tier_title": "Step 2: Link Your Bank",
      "reward": 50,
      "steps": [
        "Go to Bank Account settings",
        "Add your bank account via UPI"
      ]
    },
    {
      "tier_title": "First UPI Payment",
      "app_tier_title": "Step 3: Make First Payment",
      "reward": 100,
      "steps": [
        "Make a minimum UPI payment of ₹1",
        "Screenshot the success screen"
      ]
    }
  ]
}
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "message": "Offer created",
  "id": "770g0600-g41d-63f6-c938-668877662222"
}
```

---

## 10. Admin — Update Offer

Updates an existing offer by ID. Accepts any subset of fields from the create request.

**Endpoint:** `PUT /api/admin/offers/:id`  
**Auth:** Admin JWT required

### Sample Request

```http
PUT /api/admin/offers/770g0600-g41d-63f6-c938-668877662222
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "is_active": false,
  "daily_completion_cap": 2000,
  "extra_label": "🔥 Last Chance"
}
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "message": "Offer updated"
}
```

---

## 11. Admin — Delete Offer

Permanently deletes an offer and all associated user progress records.

**Endpoint:** `DELETE /api/admin/offers/:id`  
**Auth:** Admin JWT required

### Sample Request

```http
DELETE /api/admin/offers/770g0600-g41d-63f6-c938-668877662222
Authorization: Bearer <admin_token>
```

### Sample Response `200 OK`

```json
{
  "success": true,
  "message": "Offer deleted"
}
```

---

## 12. Data Models

### Offer Object

| Field                | Type     | Description |
|----------------------|----------|-------------|
| `id`                 | string   | Offer UUID (primary key) |
| `external_id`        | string   | External network's offer ID |
| `title`              | string   | Offer display name |
| `description`        | string   | Full offer description |
| `category`           | string   | Offer category |
| `iconUrl`            | string   | Icon image URL |
| `trackingUrl`        | string   | Click-tracking URL |
| `totalReward`        | float    | Total coins earnable from all tiers |
| `type`               | string   | `online` or `offline` |
| `inputType`          | string?  | For offline tasks: `text`, `image`, `screenshot` |
| `inputInstruction`   | string?  | Instructions for proof submission |
| `isCompleted`        | boolean  | Whether the user has completed this offer |
| `rewardType`         | string   | `Single Reward` or `Multi Reward` |
| `extraLabel`         | string?  | Promotional badge text |
| `estimatedTime`      | string?  | Human-readable time estimate |
| `difficulty`         | string   | `Easy`, `Medium`, `Hard` |
| `likesCount`         | integer  | Total user likes |
| `isHot`              | boolean  | Whether offer is featured |
| `dailyCompletionCap` | integer  | Max completions allowed per day (`0` = unlimited) |
| `countryTargeting`   | string?  | Comma-separated country codes, `*` for all |
| `completionsToday`   | integer  | How many users completed it today |
| `isCapped`           | boolean  | Whether daily cap has been reached |
| `tiers`              | array    | Offer tier objects |

### Tier Object

| Field           | Type     | Description |
|-----------------|----------|-------------|
| `id`            | integer  | Tier database ID |
| `title`         | string   | App-friendly tier name |
| `backend_title` | string   | Internal tier name |
| `reward`        | string   | Coins reward for completing this tier |
| `status`        | string   | `active` or `inactive` |
| `steps`         | array    | Array of instruction strings |
| `is_completed`  | boolean  | Whether this tier is completed by the user |

### Offer History Item

| Field                  | Type    | Description |
|------------------------|---------|-------------|
| `clickId`              | string  | Unique click tracking ID |
| `offerId`              | string  | Offer UUID |
| `title`                | string  | Offer title |
| `iconUrl`              | string  | Offer icon URL |
| `totalReward`          | float   | Max coins available |
| `category`             | string  | Offer category |
| `status`               | string  | `STARTED`, `COMPLETED`, `PENDING` |
| `statusText`           | string  | Human-readable status |
| `completedTiersCount`  | integer | Number of tiers completed |
| `completedTiers`       | array   | Completed tier details with timestamps |
| `lastUpdated`          | string  | ISO 8601 timestamp of last update |

---

## 13. Error Responses

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request — Missing or invalid parameters |
| `401` | Unauthorized — Invalid or missing JWT token |
| `403` | Forbidden — Admin access required |
| `404` | Not Found — Offer or user does not exist |
| `500` | Internal Server Error |

### Common Error Messages

| Message | When It Occurs |
|---------|----------------|
| `"Daily completion limit reached for this offer"` | Offer has hit its daily cap |
| `"This offer is not available in your region"` | Country targeting mismatch |
| `"User not found"` | Invalid user ID passed to start/history |
| `"Offer not found"` | Invalid offer ID |
| `"Missing click_id or input_data"` | Proof submission missing required fields |
| `"Failed to submit proof. Invalid Click ID or already completed."` | Click ID doesn't exist or is already done |
| `"Already liked"` | User has already liked this offer |

---

*Documentation generated for StuEarn India Backend — Version 1.0*  
*Base API: `https://stuearn-api.satyainfotechnetworks.com`*
