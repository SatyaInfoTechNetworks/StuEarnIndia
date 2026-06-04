# StuEarn India: App Configuration System Documentation

This document provides a comprehensive overview of the **App Configuration System** for StuEarn India. It explains how configurations are stored in the database, accessed via backend APIs, managed from the Admin Portal, and consumed by the Android Kotlin application.

---

## 1. Database Persistence Confirmation

**Yes, the app configuration data is fully persistent and saved in the MySQL database.**

- **Database Table:** `app_configs`
- **Table Definition (from [initDb.js](file:///c:/Users/devra/OneDrive/Desktop/SatyaInfoTechNetwork/Stuearn/Backend/initDb.js#L185-L192)):**
  ```sql
  CREATE TABLE IF NOT EXISTS app_configs (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ```

### How Persistence Works
- When the Administrator updates settings on the **System Config** page, a `POST` request is sent to the backend `/api/admin/configs` endpoint.
- The backend executes an `INSERT ... ON DUPLICATE KEY UPDATE` query (located in [adminController.js](file:///c:/Users/devra/OneDrive/Desktop/SatyaInfoTechNetwork/Stuearn/Backend/controllers/adminController.js#L930-L933)):
  ```javascript
  await pool.query(
    `INSERT INTO app_configs (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [config_key, config_value]
  );
  ```
- This guarantees that any changes made via the admin panel are written permanently to the SQL database and immediately take effect live.

---

## 2. API Endpoints

### A. Client App Endpoint (Public)
Used by the Android app on launch to fetch app updates and check maintenance mode status.
- **URL Path:** `/api/config/app-config` (aliases: `/api/config/app_config.php`, `/api/config/app_config`)
- **HTTP Method:** `GET`
- **Controller Method:** `getAppConfig` in [userController.js](file:///c:/Users/devra/OneDrive/Desktop/SatyaInfoTechNetwork/Stuearn/Backend/controllers/userController.js#L766-L792)
- **JSON Response Payload:**
  ```json
  {
    "success": true,
    "configs": {
      "latest_version": "1.1.3",
      "latest_version_code": 17,
      "force_update": true,
      "update_url": "https://play.google.com/store/apps/details?id=com.thinkforgeapps.stuearnindia",
      "update_message": "A critical update is available!",
      "is_maintenance": false,
      "maintenance_mode": "0",
      "maintenance_message": "App is under maintenance. Please try again later."
    },
    "data": { ... } // Duplicate object for backward compatibility
  }
  ```

### B. Admin Retrieval Endpoint
Fetches all configuration items as an array of rows.
- **URL Path:** `/api/admin/configs`
- **HTTP Method:** `GET`
- **Controller Method:** `listAppConfigs` in [adminController.js](file:///c:/Users/devra/OneDrive/Desktop/SatyaInfoTechNetwork/Stuearn/Backend/controllers/adminController.js#L915-L923)

### C. Admin Save Endpoint
Updates or inserts a specific configuration key and value.
- **URL Path:** `/api/admin/configs`
- **HTTP Method:** `POST`
- **Controller Method:** `updateAppConfig` in [adminController.js](file:///c:/Users/devra/OneDrive/Desktop/SatyaInfoTechNetwork/Stuearn/Backend/controllers/adminController.js#L925-L939)

---

## 3. Configuration Keys Reference

The following keys are stored in the `app_configs` table and manage various aspects of the application:

| Configuration Key | Data Type | Default Value | Description / Usage |
| :--- | :--- | :--- | :--- |
| **`latest_version`** | String | `1.1.2` | The latest user-facing version name (e.g. `1.1.3`) to check for available updates. |
| **`latest_version_code`** | Numeric String | `16` | The build version code of the latest app. Used to check if an update is available by comparing with `BuildConfig.VERSION_CODE`. |
| **`force_update`** | String | `true` | Tells the client app if the update is mandatory (`true`) or skippable (`false`). |
| **`update_url`** | String | `https://play.google.com/store/apps/details?id=...` | Direct link to the Play Store page for updating the application. |
| **`update_message`** | String | `A critical update is available!` | The message shown to users in the update prompt popup. |
| **`is_maintenance`** | String | `false` | When set to `true`, locks the app and displays a full-screen maintenance message. |
| **`maintenance_message`** | String | `App is under maintenance...` | The message shown to users when the app is in maintenance mode. |
| **`spin_daily_limit`** | Numeric String | `2` | Maximum spins allowed per user per day. |
| **`spin_probabilities`** | JSON Array | *See below* | A JSON string matrix defining reward categories, coin ranges, and exact percentage chances (must sum to 100%). |
| **`streak_rewards`** | JSON Object | *See below* | A day-to-reward mapping for consecutive check-ins from Days 1 to 7. |
| **`scratch_card_daily_limit`** | Numeric String | `5` | Maximum scratch cards a user can scratch daily. |
| **`scratch_card_reward_min`** | Numeric String | `5` | Minimum coin payout from scratch cards. |
| **`scratch_card_reward_max`** | Numeric String | `20` | Maximum coin payout from scratch cards. |
| **`watch_video_daily_limit`** | Numeric String | `5` | Maximum video ads a user can watch to earn daily. |
| **`watch_video_reward_min`** | Numeric String | `5` | Minimum coin payout for watching a video. |
| **`watch_video_reward_max`** | Numeric String | `10` | Maximum coin payout for watching a video. |
| **`daily_withdraw_limit`** | Numeric String | `2` | Max withdrawals a user can perform daily (Set to `0` for unlimited). |
| **`earning_icons`** | JSON Object | *See below* | Mapping of platform and game feature codes to their corresponding dashboard icons. |

---

## 4. Complex Data Formats

### A. Spin Probabilities (`spin_probabilities`)
Stores a JSON array of weights for the Lucky Spin feature. Must sum up exactly to 100%.
```json
[
  { "type": "JACKPOT", "range": [500, 500], "prob": 1 },
  { "type": "BIG",     "range": [200, 300], "prob": 2 },
  { "type": "MEDIUM",  "range": [50, 100],  "prob": 10 },
  { "type": "SMALL",   "range": [10, 30],   "prob": 17 },
  { "type": "NONE",    "range": [0, 0],     "prob": 70 }
]
```

### B. Daily Loyalty Streak Rewards (`streak_rewards`)
Stores a Day $\rightarrow$ Coin reward mapping.
```json
{
  "1": 30,
  "2": 40,
  "3": 50,
  "4": 60,
  "5": 70,
  "6": 80,
  "7": 200
}
```

### C. Earning & Offerwall Icons (`earning_icons`)
A mapping of icons loaded dynamically by the client dashboard.
```json
{
  "PUBSCALE": "https://i.ibb.co/68gPz3Y/pubscale.png",
  "OFFERMARU": "https://i.ibb.co/1fWfN9k/offermaru.png",
  "CPX_RESEARCH": "https://i.ibb.co/LdQyJt8/cpx.png",
  "DAILY_BONUS": "https://img.icons8.com/color/96/calendar.png",
  "WATCH_VIDEO": "https://img.icons8.com/color/96/youtube-play.png",
  "SCRATCH_CARD": "https://i.ibb.co/5X03C8wq/scratchcard-1.png",
  "REFERRAL": "https://img.icons8.com/color/96/conference-call.png"
}
```

---

## 5. Mobile App Integration (Android / Kotlin)

The Android application handles configurations on startup to block access during maintenance or outdated builds.

### Key Class Files
1. **[ApiService.kt](file:///c:/Users/devra/AndroidStudioProjects/StuEarn/app/src/main/java/com/thinkforgeapps/stuearnindia/data/remote/ApiService.kt#L195-L196):**
   Declares the endpoint `@GET("config/app-config")` which returns an `AppUpdateResponse`.
2. **[AppUpdateResponse.kt](file:///c:/Users/devra/AndroidStudioProjects/StuEarn/app/src/main/java/com/thinkforgeapps/stuearnindia/data/model/AppUpdateResponse.kt):**
   Contains the data models mapping the JSON response:
   - `AppUpdateResponse` mappings: `success` (Boolean), `configs` (AppConfigData)
   - `AppConfigData` holds: `maintenance_mode` (String), `maintenance_message` (String?), `latest_version` (String?), `latest_version_code` (Int?), `force_update` (Boolean?), `update_url` (String?), `update_message` (String?).
3. **[ConfigRepository.kt](file:///c:/Users/devra/AndroidStudioProjects/StuEarn/app/src/main/java/com/thinkforgeapps/stuearnindia/data/repository/ConfigRepository.kt#L12-L24):**
   Fetches the configurations using Retrofit into a Coroutines Flow.
4. **[SplashScreen.kt](file:///c:/Users/devra/AndroidStudioProjects/StuEarn/app/src/main/java/com/thinkforgeapps/stuearnindia/ui/screens/splash/SplashScreen.kt#L97-L149):**
   Collects from the repository at startup:
   - **Maintenance Block:** If `maintenanceMode == "1"`, displays the maintenance dialog and prevents user from reaching home/login screens.
   - **Update Prompt:** If `latestVersionCode > BuildConfig.VERSION_CODE`, triggers the Update Dialog. If `forceUpdate == true`, the "Later" button is hidden, forcing the user to tap "Update Now" to navigate to the Play Store link.
