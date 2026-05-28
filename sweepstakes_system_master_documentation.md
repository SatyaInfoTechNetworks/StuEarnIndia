# StuEarn India — Sweepstakes & Contests System Master Technical Manual

> **Document Version**: v1.2 (Production Ready)  
> **Backend Base URL**: `https://stuearn-api.satyainfotechnetworks.com`  
> **Auth System**: Secured via Firebase JSON Web Token (JWT) Bearer Headers  
> **Database Engine**: MySQL 8.0 (InnoDB, Collation UTF8MB4)

This manual is the definitive technical specification and operational documentation for the **Promotional Contests & Sweepstakes Engine** implemented on the StuEarn platform. It covers database schemas, secure API routing, ledger controllers, administrative control interfaces, and Android Kotlin data/view configurations.

---

## 💡 1. Core Architecture & Safety Principles

The sweepstakes engine is engineered around four paramount architectural pillars:
1.  **Zero-Leak Balance Settlement (Ledger Security)**: Prize cashouts and coin awards must bypass standard direct database sets. They must execute within locked transaction blocks, double-writing a matching transaction ledger row (`type: 'CREDIT'`, `source: 'CONTEST_REWARD'`) to ensure financial audit compliance.
2.  **Anti-Abuse Limits (Strict Validations)**: Multi-layered checks operate at database level:
    *   *Free Claims*: Hard daily cap of `1 free ticket per user` verified against date stamps.
    *   *Ad Tickets*: Hard daily cap of `max_ad_entries_per_day` verified before ad-callback credits.
    *   *Coin Purchases*: Balances are verified and deducted atomically using `FOR UPDATE` query locks.
    *   *Overall Limits*: Overall ticket count per user in a contest cannot exceed `max_tickets_per_user`.
3.  **Weighted Random Drawing Matrix (Raffle Logic)**: Drawings are calculated using a ticket-weighted lottery basket algorithm. A user holding 5 tickets has 5 indices loaded into the random selection array, giving them 5x greater probability than a user with 1 ticket. As ranks descend, the winning user's indices are purged dynamically, preventing duplicate prize awards to the same user.
4.  **AdMob Compliance**: All interfaces employ compliant terms like *"Promotional Raffle"*, *"Lucky Ticket Draw"*, and *"Raffle Entry"* to ensure safe AdMob and Play Store compliance.

---

## 🗄️ 2. Database Schema Definition

The system utilizes four relational tables bound with cascading foreign keys to standard UUID v4 internal columns.

```sql
-- 1. contests Table (Core sweepstakes config)
CREATE TABLE IF NOT EXISTS contests (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('LUCKY_DRAW', 'REFERRAL', 'EARNINGS') NOT NULL DEFAULT 'LUCKY_DRAW',
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  max_entries_per_day INT DEFAULT 3,
  total_winners INT DEFAULT 1,
  status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Sweepstakes Settings
  slug VARCHAR(255) UNIQUE NULL,
  banner_image TEXT NULL,
  prize_text VARCHAR(255) NULL,
  allow_free_entry BOOLEAN DEFAULT TRUE,
  allow_ad_entry BOOLEAN DEFAULT TRUE,
  max_ad_entries_per_day INT DEFAULT 3,
  allow_coins_entry BOOLEAN DEFAULT FALSE,
  ticket_coins_cost DECIMAL(10, 2) DEFAULT 0.00,
  max_tickets_per_user INT DEFAULT 10
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. contest_rewards Table (Tiered prizes per contest)
CREATE TABLE IF NOT EXISTS contest_rewards (
  id CHAR(36) PRIMARY KEY,
  contest_id CHAR(36) NOT NULL,
  reward_position INT NOT NULL,
  reward_type ENUM('COINS', 'CASH', 'GIFTCARD') NOT NULL,
  reward_value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. contest_entries Table (Logged user tickets)
CREATE TABLE IF NOT EXISTS contest_entries (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  contest_id CHAR(36) NOT NULL,
  entry_source ENUM('AD', 'FREE', 'REFERRAL', 'EARNINGS') NOT NULL,
  entries_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_contest_source (user_id, contest_id, entry_source),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. contest_winners Table (Drawn winners log)
CREATE TABLE IF NOT EXISTS contest_winners (
  id CHAR(36) PRIMARY KEY,
  contest_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reward_position INT NOT NULL,
  reward_type ENUM('COINS', 'CASH', 'GIFTCARD') NOT NULL,
  reward_value DECIMAL(10, 2) NOT NULL,
  reward_given BOOLEAN DEFAULT FALSE,
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 📡 3. REST API Specification

### A. Mobile App Client API

All user endpoints require the authorization header:  
`Authorization: Bearer <firebase_jwt_token>`

#### 1. Fetch Active & Upcoming Contests
Returns a list of live drawings targeted to the authenticated user's current counts.
*   **Path**: `GET /api/contests/active`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "contests": [
        {
          "id": "78a87612-4fb2-475f-b51c-a9a7c36ad2e1",
          "title": "Weekend Mega Lucky Draw",
          "description": "Watch video ads, claim your daily free ticket to enter!",
          "type": "LUCKY_DRAW",
          "startTime": "2026-05-28T07:00:00.000Z",
          "endTime": "2026-05-30T23:59:00.000Z",
          "maxEntriesPerDay": 3,
          "totalWinners": 1,
          "globalEntriesCount": 142,
          "myTickets": 2,
          "slug": "weekend-mega-lucky-draw",
          "bannerImage": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da",
          "prizeText": "₹500 Paytm Cash",
          "allowFreeEntry": true,
          "allowAdEntry": true,
          "maxAdEntriesPerDay": 5,
          "allowCoinsEntry": true,
          "ticketCoinsCost": 50,
          "maxTicketsPerUser": 10,
          "rewards": [
            { "position": 1, "type": "COINS", "value": 500.00 }
          ]
        }
      ]
    }
    ```

#### 2. Fetch Single Contest Details & Limits
Fetches specific contest configurations and computes current remaining counts for the calling user.
*   **Path**: `GET /api/contests/:id`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "contest": {
        "id": "78a87612-4fb2-475f-b51c-a9a7c36ad2e1",
        "title": "Weekend Mega Lucky Draw",
        "description": "Rules and conditions details...",
        "type": "LUCKY_DRAW",
        "startTime": "2026-05-28T07:00:00.000Z",
        "endTime": "2026-05-30T23:59:00.000Z",
        "maxEntriesPerDay": 3,
        "totalWinners": 1,
        "status": "ACTIVE",
        "slug": "weekend-mega-lucky-draw",
        "bannerImage": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da",
        "prizeText": "₹500 Paytm Cash",
        "allowFreeEntry": true,
        "allowAdEntry": true,
        "maxAdEntriesPerDay": 5,
        "allowCoinsEntry": true,
        "ticketCoinsCost": 50,
        "maxTicketsPerUser": 10,
        "totalEntries": 142,
        "myTickets": 2,
        "freeEntriesLeftToday": 1,
        "adEntriesLeftToday": 4,
        "overallEntriesLeft": 8,
        "rewards": [
          { "position": 1, "type": "COINS", "value": 500.00 }
        ]
      }
    }
    ```

#### 3. Log Contest Entry Ticket
Claims 1 ticket via ad watch, free check-in, or coins payment.
*   **Path**: `POST /api/contests/:id/enter`
*   **Request Payload**:
    ```json
    {
      "source": "AD" // "FREE", "AD", or "COINS"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Congratulations! You earned 1 raffle ticket."
    }
    ```
*   **Response (400 Bad Request — Insufficient Coins / Daily Limit Reached)**:
    ```json
    {
      "success": false,
      "message": "Daily ad entry limit reached. You can only earn up to 5 ad tickets per day."
    }
    ```

#### 4. Historical Winners Feed
*   **Path**: `GET /api/contests/winners`
*   **Response**:
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

### B. Admin Panel Controls API

All admin endpoints require administrative header validation:  
`Authorization: Bearer <admin_jwt_token>`

#### 1. Fetch Admin Contests Directory
*   **Path**: `GET /api/admin/contests`
*   **Response**: Returns list of all contests alongside total participants and entries calculations.

#### 2. Launch New Event
*   **Path**: `POST /api/admin/contests`
*   **Request Payload**:
    ```json
    {
      "title": "🎁 Daily Free Draw",
      "description": "Rules, requirements, or terms for this draw...",
      "type": "LUCKY_DRAW",
      "start_time": "2026-05-28 07:23:00",
      "end_time": "2026-05-29 07:23:00",
      "max_entries_per_day": 3,
      "total_winners": 1,
      "slug": "daily-free-draw",
      "banner_image": "https://images.unsplash.com/...",
      "prize_text": "500 Coins Paytm",
      "allow_free_entry": true,
      "allow_ad_entry": true,
      "max_ad_entries_per_day": 5,
      "allow_coins_entry": false,
      "ticket_coins_cost": 0,
      "max_tickets_per_user": 6,
      "rewards": [
        { "reward_position": 1, "reward_type": "COINS", "reward_value": 500 }
      ]
    }
    ```

#### 3. Draw Winners (Weighted Raffle Matrix)
Atomic computation block. Resolves tickets, populates winner ledger rows, and auto-disburses Coins/Cash.
*   **Path**: `POST /api/admin/contests/:id/draw`
*   **Response**: `{ "success": true, "message": "Successfully drew 1 winners!" }`

#### 4. Approve & Deliver Gift Card Vouchers
Provides proof parameters and dispatches code to the winner user via FCM pushes.
*   **Path**: `POST /api/admin/contests/winners/:winnerId/give-reward`
*   **Request Body**:
    ```json
    {
      "remark": "AMZN-VOUCH-CODE-1627AB"
    }
    ```

---

## ⚙️ 4. Backend Implementation Flows

### A. Database Auto-Migration (`initDb.js`)
Handles database upgrades dynamically at startup without purging user profiles:
```javascript
// Sweepstakes / Contests Configuration Migrations
await addColumnIfNotExists(connection, 'contests', 'slug', 'VARCHAR(255) NULL');
await addColumnIfNotExists(connection, 'contests', 'banner_image', 'TEXT NULL');
await addColumnIfNotExists(connection, 'contests', 'prize_text', 'VARCHAR(255) NULL');
await addColumnIfNotExists(connection, 'contests', 'allow_free_entry', 'BOOLEAN DEFAULT TRUE');
await addColumnIfNotExists(connection, 'contests', 'allow_ad_entry', 'BOOLEAN DEFAULT TRUE');
await addColumnIfNotExists(connection, 'contests', 'max_ad_entries_per_day', 'INT DEFAULT 3');
await addColumnIfNotExists(connection, 'contests', 'allow_coins_entry', 'BOOLEAN DEFAULT FALSE');
await addColumnIfNotExists(connection, 'contests', 'ticket_coins_cost', 'DECIMAL(10, 2) DEFAULT 0.00');
await addColumnIfNotExists(connection, 'contests', 'max_tickets_per_user', 'INT DEFAULT 10');
```

---

### B. Raffle Drawing Logic (`contestController.js`)
Below is the core Javascript weighted raffle lottery drawing engine:
```javascript
// Draw winners using lottery tickets weights
export const drawContestWinners = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const contestId = req.params.id;
    await connection.beginTransaction();

    // 1. Fetch contest and rewards
    const [contestRows] = await connection.query('SELECT * FROM contests WHERE id = ? FOR UPDATE', [contestId]);
    const contest = contestRows[0];
    const [rewards] = await connection.query('SELECT * FROM contest_rewards WHERE contest_id = ? ORDER BY reward_position ASC', [contestId]);

    // 2. Group user entries
    const [entries] = await connection.query(
      'SELECT user_id, SUM(entries_count) as total_tickets FROM contest_entries WHERE contest_id = ? GROUP BY user_id',
      [contestId]
    );

    // 3. Build lottery weighted array basket
    let raffleBasket = [];
    entries.forEach(e => {
      const count = parseInt(e.total_tickets || 0);
      for (let i = 0; i < count; i++) {
        raffleBasket.push(e.user_id);
      }
    });

    const winnersDrawn = [];
    for (const reward of rewards) {
      if (raffleBasket.length === 0) break;

      // Select weighted index
      const randIdx = Math.floor(Math.random() * raffleBasket.length);
      const winnerUserId = raffleBasket[randIdx];

      winnersDrawn.push({
        userId: winnerUserId,
        position: reward.reward_position,
        type: reward.reward_type,
        value: parseFloat(reward.reward_value)
      });

      // Filter out this user to prevent winning multiple slots in the same sweepstakes
      raffleBasket = raffleBasket.filter(uid => uid !== winnerUserId);
    }

    // 4. Save and Disburse rewards atomically
    for (const w of winnersDrawn) {
      const winnerId = uuidv4();
      const giveInstant = (w.type === 'COINS' || w.type === 'CASH');

      await connection.query(
        `INSERT INTO contest_winners (id, contest_id, user_id, reward_position, reward_type, reward_value, reward_given, selected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [winnerId, contestId, w.userId, w.position, w.type, w.value, giveInstant ? 1 : 0]
      );

      if (giveInstant) {
        // Disburse Coins/Cash ledger double entries
        await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [w.value, w.userId]);
        await connection.query(
          `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
           VALUES (?, ?, ?, 'CREDIT', 'CONTEST_REWARD', ?, ?, NOW())`,
          [uuidv4(), w.userId, w.value, `Won Position #${w.position} in Draw: ${contest.title}`, winnerId]
        );
      }
    }

    await connection.query("UPDATE contests SET status = 'COMPLETED' WHERE id = ?", [contestId]);
    await connection.commit();
    res.json({ success: true, winners: winnersDrawn });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};
```

---

## 🖥️ 5. Admin Panel Interface (`AdminContests.jsx`)

The Admin console is built in React. The form leverages state hooks to bind the configuration parameters:

```jsx
// Sweepstakes launcher settings form
<div className="card-body">
  <div className="row">
    <div className="col-6 form-group">
      <label>Campaign Title</label>
      <input type="text" value={contestForm.title} onChange={e => setContestForm({...contestForm, title: e.target.value})} className="form-control" />
    </div>
    <div className="col-6 form-group">
      <label>URL Slug</label>
      <input type="text" value={contestForm.slug} onChange={e => setContestForm({...contestForm, slug: e.target.value})} className="form-control" />
    </div>
  </div>

  <div className="row">
    <div className="col-6 d-flex align-items-center">
      <input type="checkbox" checked={contestForm.allow_free_entry} onChange={e => setContestForm({...contestForm, allow_free_entry: e.target.checked})} id="free_check" />
      <label htmlFor="free_check" className="ml-2 mb-0">Allow Daily Free Ticket</label>
    </div>
    <div className="col-6 d-flex align-items-center">
      <input type="checkbox" checked={contestForm.allow_ad_entry} onChange={e => setContestForm({...contestForm, allow_ad_entry: e.target.checked})} id="ad_check" />
      <label htmlFor="ad_check" className="ml-2 mb-0">Enable Ad Ticket Entries</label>
    </div>
  </div>

  {contestForm.allow_ad_entry && (
    <div className="form-group mt-2">
      <label>Maximum Daily Ad Tickets</label>
      <input type="number" value={contestForm.max_ad_entries_per_day} onChange={e => setContestForm({...contestForm, max_ad_entries_per_day: parseInt(e.target.value)})} className="form-control" />
    </div>
  )}

  <div className="d-flex align-items-center mt-3">
    <input type="checkbox" checked={contestForm.allow_coins_entry} onChange={e => setContestForm({...contestForm, allow_coins_entry: e.target.checked})} id="coins_check" />
    <label htmlFor="coins_check" className="ml-2 mb-0">Enable Coins Purchased Tickets</label>
  </div>

  {contestForm.allow_coins_entry && (
    <div className="form-group mt-2">
      <label>Ticket Cost (Coins)</label>
      <input type="number" value={contestForm.ticket_coins_cost} onChange={e => setContestForm({...contestForm, ticket_coins_cost: parseFloat(e.target.value)})} className="form-control" />
    </div>
  )}
</div>
```

---

## 📲 6. Mobile App Integration (Android Kotlin/Compose)

To build the frontend, register these four modules:

### Module 1: Kotlin DTO Models (`ContestModels.kt`)
```kotlin
package com.thinkforgeapps.stuearnindia.data.model

import com.google.gson.annotations.SerializedName

data class ContestReward(
    @SerializedName("position") val position: Int,
    @SerializedName("type") val type: String,
    @SerializedName("value") val value: Double
)

data class ContestDetail(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("type") val type: String,
    @SerializedName("startTime") val startTime: String,
    @SerializedName("endTime") val endTime: String,
    @SerializedName("status") val status: String,
    @SerializedName("bannerImage") val bannerImage: String,
    @SerializedName("prizeText") val prizeText: String,
    @SerializedName("allowFreeEntry") val allowFreeEntry: Boolean,
    @SerializedName("allowAdEntry") val allowAdEntry: Boolean,
    @SerializedName("maxAdEntriesPerDay") val maxAdEntriesPerDay: Int,
    @SerializedName("allowCoinsEntry") val allowCoinsEntry: Boolean,
    @SerializedName("ticketCoinsCost") val ticketCoinsCost: Double,
    @SerializedName("maxTicketsPerUser") val maxTicketsPerUser: Int,
    @SerializedName("myTickets") val myTickets: Int,
    @SerializedName("freeEntriesLeftToday") val freeEntriesLeftToday: Int,
    @SerializedName("adEntriesLeftToday") val adEntriesLeftToday: Int,
    @SerializedName("overallEntriesLeft") val overallEntriesLeft: Int,
    @SerializedName("rewards") val rewards: List<ContestReward>
)

data class EnterContestRequest(
    @SerializedName("source") val source: String
)
```

---

### Module 2: Retrofit Api Service (`ContestApiService.kt`)
```kotlin
package com.thinkforgeapps.stuearnindia.data.remote

import com.thinkforgeapps.stuearnindia.data.model.*
import retrofit2.http.*

interface ContestApiService {
    @GET("api/contests/{id}")
    suspend fun getContestDetail(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): ContestDetailResponse

    @POST("api/contests/{id}/enter")
    suspend fun enterContest(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body request: EnterContestRequest
    ): BaseContestResponse
}
```

---

### Module 3: State Flow Repository (`ContestRepository.kt`)
```kotlin
package com.thinkforgeapps.stuearnindia.data.repository

import com.thinkforgeapps.stuearnindia.data.remote.ContestApiService
import com.thinkforgeapps.stuearnindia.util.Resource
import kotlinx.coroutines.flow.flow
import retrofit2.HttpException
import java.io.IOException

class ContestRepository(private val api: ContestApiService) {
    suspend fun enterContest(token: String, id: String, source: String) = try {
        val res = api.enterContest("Bearer $token", id, EnterContestRequest(source))
        if (res.success) Resource.Success(res.message) else Resource.Error(res.message)
    } catch (e: HttpException) {
        val error = e.response()?.errorBody()?.string() ?: e.message()
        Resource.Error(error)
    } catch (e: IOException) {
        Resource.Error("Check connection")
    }
}
```

---

### Module 4: Compose Layout Hook (`ContestDetailScreen.kt`)
Renders the gorgeous CTA list interface where actions trigger the specific backend ticket paths:

```kotlin
@Composable
fun EntryOptionsLayout(
    detail: ContestDetail,
    isSubmitting: Boolean,
    onClaimFree: () -> Unit,
    onWatchAd: () -> Unit,
    onBuyTicket: () -> Unit
) {
    Column {
        // 1. FREE daily entry claim
        if (detail.allowFreeEntry) {
            Row(modifier = Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Daily Free Raffle Ticket")
                Button(onClick = onClaimFree, enabled = !isSubmitting && detail.freeEntriesLeftToday > 0) {
                    Text(if (detail.freeEntriesLeftToday > 0) "Claim Free" else "Claimed")
                }
            }
        }

        // 2. Google AdMob rewarded video ad entry
        if (detail.allowAdEntry) {
            Row(modifier = Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Ad Ticket (${detail.adEntriesLeftToday} remaining)")
                Button(onClick = onWatchAd, enabled = !isSubmitting && detail.adEntriesLeftToday > 0) {
                    Text("Watch Video")
                }
            }
        }

        // 3. Coins Wallet deduction ticket claim
        if (detail.allowCoinsEntry) {
            Row(modifier = Modifier.fillMaxWidth().padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Buy Ticket (${detail.ticketCoinsCost.toInt()} Coins)")
                Button(onClick = onBuyTicket, enabled = !isSubmitting && detail.overallEntriesLeft > 0) {
                    Text("Buy Entry")
                }
            }
        }
    }
}
```
