# 🏆 StuEarn India — Production Contests & Competitions Engine

> **System Version**: v2.5 (Dynamic Live Production Specs)  
> **Target Android Package**: `com.thinkforgeapps.stuearnindia`  
> **Backend Base URL**: `https://stuearn-api.satyainfotechnetworks.com`  
> **Auth Header**: Secured via Firebase JSON Web Token (JWT) Bearer Headers (`Authorization: Bearer <token>`)  
> **Database Engine**: MySQL 8.0 (InnoDB)  

This master document details the database definitions, SQL queries, REST contracts, and Node.js/Express transactional controllers required to run the **Android Contests & Competitions Engine** on the StuEarn platform.

---

## 🎨 1. Front-to-Back Architecture Mapping

The mobile client (Jetpack Compose UI) dynamically changes its structures based on the `type` property returned in the `/api/contests` REST responses:

| Mobile Client Tab | Backend Contest `type` | Entry Mechanism | Limit Rules & UI Behavior |
| :--- | :--- | :--- | :--- |
| **Free Contest** | `LUCKY_DRAW` | ticket | watch ads, free claim, buy tickets |
| **Referral Contest** | `REFERRAL_CONTEST` | join | leaderboard ranking, invite users |
| **Earnings Contest** | `EARNINGS_CONTEST` | join | performance competition, earn more now |

### 🎟️ 1️⃣ LUCKY DRAW CONTEST (Tickets & Raffle System)
- **Entry Logic**: Users claim daily free tickets, watch AdMob rewarded video ads (capped at `max_ad_entries_per_day`), or purchase tickets using coins.
- **Raffle drawing**: Selected randomly using a ticket-weighted lottery basket algorithm (e.g. 5 tickets = 5 entries in the raffle basket). Purges duplicate winner IDs for subsequent rank draws.
- **Database Tables**: Enters tickets in `contest_entries`. Enlists winners in `contest_winners`.
- **UI Render Requirement**: Hero Card with My Tickets progress counter, Watch Ads button, Claim Free button, Buy Ticket button, Chance Indicator (e.g. "🔥 High chance"), and Recent Winner feed.

### 👥 2️⃣ REFERRAL CONTEST (Pure Leaderboard System)
- **Entry Logic**: One-time registration. User clicks "Join Contest". The backend stores their registration timestamp in `contest_participants.joined_at`.
- **Leaderboard score**: Counts valid referrals referred **strictly after** the user's join time (`joined_at`). Pre-existing referrals or registrations prior to joining the contest are *never* counted.
- **Randomness**: Absolutely 0% randomness. Prizes are awarded strictly based on leaderboard position rankings at contest completion.
- **UI Render Requirement**: Competitive Referral Dashboard. Stands Card ("Your Standing: Rank #12 - 23 Referrals"), Invite Friends Call-to-Action (opens system native share sheet with referral links), Rank movement indicator (e.g. "⬆ +3 today"), and a visual Leaderboard showing the top 10 referrers. No ad buttons or ticket claims.

### 💰 3️⃣ EARNINGS CONTEST (Performance Leaderboard System)
- **Entry Logic**: One-time registration. User clicks "Join Contest", storing registration state in `contest_participants.joined_at`.
- **Leaderboard score**: Accumulates valid coins earned from performance sources (`'OFFER'`, `'TASK'`, `'WATCH_VIDEO'`, `'VIDEO_AD'`, `'OFFER_COMPLETION'`) completed **strictly after** the user's join time (`joined_at`). Ignores admin manual adjustments, daily bonuses, streak rewards, or referral commission coins.
- **UI Render Requirement**: Performance competition screen. Standing Card ("Your Standing: Rank #8 - 24,500 coins"), Progress indicators to next rank ("Need +5,000 coins to reach #7"), Leaderboard standings, and an **"Earn More Now"** Call-to-Action block (direct deep-links to Open Offerwall, Complete Tasks, and Watch Videos).

---

## 🗄️ 2. Database Schema Definition (MySQL 8.0)

To support secure coin purchases, dynamic daily limits, and segregated drawing/leaderboard modes, the platform database operates on five main tables:

```sql
-- 1. contests: Main event definitions & limits configurations
CREATE TABLE IF NOT EXISTS contests (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(50) NOT NULL, -- 'LUCKY_DRAW', 'REFERRAL_CONTEST', 'EARNINGS_CONTEST', 'STREAK_EVENT'
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  max_entries_per_day INT DEFAULT 3,
  total_winners INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'CANCELLED'
  slug VARCHAR(255) UNIQUE NULL,
  banner_image TEXT NULL,
  prize_text VARCHAR(255) NULL,
  allow_free_entry BOOLEAN DEFAULT TRUE,
  allow_ad_entry BOOLEAN DEFAULT TRUE,
  max_ad_entries_per_day INT DEFAULT 3,
  allow_coins_entry BOOLEAN DEFAULT FALSE,
  ticket_coins_cost DECIMAL(10, 2) DEFAULT 0.00,
  max_tickets_per_user INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. contest_rewards: Tiered positional rewards per contest (e.g. Rank 1 Paytm, Rank 2 Coins)
CREATE TABLE IF NOT EXISTS contest_rewards (
  id CHAR(36) PRIMARY KEY,
  contest_id CHAR(36) NOT NULL,
  reward_position INT NOT NULL, -- e.g. 1, 2, 3
  reward_type VARCHAR(20) NOT NULL, -- 'COINS', 'CASH', 'GIFTCARD'
  reward_value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. contest_entries: Logged ticket entries (ONLY used by LUCKY_DRAW sweepstakes)
CREATE TABLE IF NOT EXISTS contest_entries (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  contest_id CHAR(36) NOT NULL,
  entry_source VARCHAR(50) NOT NULL, -- 'AD', 'FREE', 'COINS'
  entries_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_contest_source (user_id, contest_id, entry_source),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. contest_participants: One-time joined users registration (Used by REFERRAL_CONTEST & EARNINGS_CONTEST)
CREATE TABLE IF NOT EXISTS contest_participants (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  contest_id CHAR(36) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_contest_participation (user_id, contest_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. contest_winners: Drawn winners database logs
CREATE TABLE IF NOT EXISTS contest_winners (
  id CHAR(36) PRIMARY KEY,
  contest_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reward_position INT NOT NULL,
  reward_type VARCHAR(20) NOT NULL, -- 'COINS', 'CASH', 'GIFTCARD'
  reward_value DECIMAL(10, 2) NOT NULL,
  reward_given BOOLEAN DEFAULT FALSE,
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 📡 3. REST Contracts & Endpoint Payload Specs

All API requests are secured via JWT tokens. Headers must include:  
`Authorization: Bearer <firebase_jwt_token>`

### 1️⃣ List Active & Upcoming Contests
Fetch live contests targeted to the user's status (`myTickets = 1` if registered in competitive leagues, and `globalEntriesCount` matches total participants for competitive modes).
* **Path**: `GET /api/contests/active`
* **Response (200 OK)**:
```json
{
  "success": true,
  "contests": [
    {
      "id": "c1f7a83d-e6fb-4081-9b16-aa971c26bdf1",
      "title": "Weekend Mega Earnings League",
      "description": "Compete with other users by completing tasks and offers this weekend. Top ranks win big!",
      "type": "EARNINGS_CONTEST",
      "startTime": "2026-05-29T00:00:00.000Z",
      "endTime": "2026-05-31T23:59:59.000Z",
      "maxEntriesPerDay": 0,
      "totalWinners": 5,
      "globalEntriesCount": 182,
      "myTickets": 1,
      "slug": "weekend-mega-earnings-league",
      "bannerImage": "https://stuearn-api.satyainfotechnetworks.com/uploads/banners/earnings.png",
      "prizeText": "₹5000 Prize Pool",
      "allowFreeEntry": false,
      "allowAdEntry": false,
      "maxAdEntriesPerDay": 0,
      "allowCoinsEntry": false,
      "ticketCoinsCost": 0,
      "maxTicketsPerUser": 1,
      "rewards": [
        { "position": 1, "type": "CASH", "value": 2500 },
        { "position": 2, "type": "CASH", "value": 1500 },
        { "position": 3, "type": "CASH", "value": 1000 }
      ]
    }
  ]
}
```

### 2️⃣ Fetch Single Contest Details & Limits
Fetches specific contest configuration, dynamically computing user limit balances and today's remaining counts.
* **Path**: `GET /api/contests/:id`
* **Response (200 OK - LUCKY_DRAW)**:
```json
{
  "success": true,
  "contest": {
    "id": "df2a768c-ff81-42e1-a083-d92e8c2fb91e",
    "title": "Daily Coins Lucky Raffle Draw",
    "description": "Watch rewarding video ads, earn raffle tickets, and get added to our daily lucky draw!",
    "type": "LUCKY_DRAW",
    "startTime": "2026-05-28T07:00:00.000Z",
    "endTime": "2026-05-28T23:59:59.000Z",
    "maxEntriesPerDay": 3,
    "totalWinners": 10,
    "status": "ACTIVE",
    "slug": "daily-coins-raffle",
    "bannerImage": "",
    "prizeText": "₹500 Paytm Cash",
    "allowFreeEntry": true,
    "allowAdEntry": true,
    "maxAdEntriesPerDay": 3,
    "allowCoinsEntry": true,
    "ticketCoinsCost": 10.00,
    "maxTicketsPerUser": 10,
    "totalEntries": 242,
    "myTickets": 2,
    "entriesLeftToday": 1,
    "freeEntriesLeftToday": 0,
    "adEntriesLeftToday": 1,
    "overallEntriesLeft": 8,
    "myScore": 2,
    "rewards": [
      { "position": 1, "type": "COINS", "value": 500 }
    ]
  }
}
```
* **Response (200 OK - REFERRAL_CONTEST / EARNINGS_CONTEST)**:
```json
{
  "success": true,
  "contest": {
    "id": "c1f7a83d-e6fb-4081-9b16-aa971c26bdf1",
    "title": "Weekend Mega Earnings League",
    "description": "Compete with other users by completing tasks and offers this weekend. Top ranks win big!",
    "type": "EARNINGS_CONTEST",
    "startTime": "2026-05-29T00:00:00.000Z",
    "endTime": "2026-05-31T23:59:59.000Z",
    "status": "ACTIVE",
    "slug": "weekend-mega-earnings-league",
    "bannerImage": "",
    "prizeText": "₹5000 Prize Pool",
    "allowFreeEntry": false,
    "allowAdEntry": false,
    "maxAdEntriesPerDay": 0,
    "allowCoinsEntry": false,
    "ticketCoinsCost": 0.00,
    "maxTicketsPerUser": 1,
    "totalEntries": 182,
    "myTickets": 1, -- 1 indicates joined/registered in contest_participants
    "entriesLeftToday": 0,
    "freeEntriesLeftToday": 0,
    "adEntriesLeftToday": 0,
    "overallEntriesLeft": 0,
    "myScore": 24500.00, -- dynamic live score calculation strictly after joined_at timestamp!
    "rewards": [
      { "position": 1, "type": "CASH", "value": 2500 }
    ]
  }
}
```

### 3️⃣ Join Contest / Register Raffle Ticket
Registers user to competitive leaderboard or adds 1 ticket for raffle sweepstakes.
* **Path**: `POST /api/contests/:id/enter`
* **Payload (Lucky Draw tickets)**:
```json
{
  "source": "AD" -- "FREE", "AD", "COINS"
}
```
* **Response (Lucky Draw free check-in / ad / purchased success)**:
```json
{
  "success": true,
  "message": "Daily free ticket claimed!" -- or "Raffle ticket purchased successfully!"
}
```
* **Payload (Referral/Earnings leagues - one time join)**:
```json
{}
```
* **Response (Leagues Join Success)**:
```json
{
  "success": true,
  "message": "Successfully registered! Your referrals are now being actively tracked."
}
```

### 4️⃣ Get Live Leaderboard Standings
Retrieves top 10 standings list along with calling user's absolute rank position and formatted score.
* **Path**: `GET /api/contests/:id/leaderboard`
* **Response (200 OK - REFERRAL_CONTEST)**:
```json
{
  "success": true,
  "leaderboard": [
    { "rank": 1, "userName": "Rahul Sharma", "score": "125 Referrals" },
    { "rank": 2, "userName": "Aryan Patel", "score": "101 Referrals" },
    { "rank": 3, "userName": "Devraj Devraj", "score": "89 Referrals" }
  ],
  "myStanding": {
    "rank": 12,
    "score": "23 Referrals"
  }
}
```

### 5️⃣ Past Winners Global Scoreboard Feed
* **Path**: `GET /api/contests/winners`
* **Response (200 OK)**:
```json
{
  "success": true,
  "winners": [
    {
      "reward_position": 1,
      "reward_type": "CASH",
      "reward_value": 2500.00,
      "selected_at": "2026-05-27T23:59:59.000Z",
      "contest_title": "Mega Referrals League",
      "user_name": "Rahul Sharma"
    }
  ]
}
```

---

## 🗜️ 4. Transactional Winner Drawing Mechanics (Express Backend)

Admin drawings are completely secure. The transactional controllers prevent race conditions, guarantee double-entry ledger match, and split logic perfectly by contest type:

### 1. Raffle Drawings (`LUCKY_DRAW`)
Utilizes a ticket-weighted lottery basket. Purges user IDs after draw selections to ensure one user cannot sweep multiple rank prizes in a single raffle event.
```javascript
// LUCKY_DRAW weighted basket population
let raffleBasket = [];
entries.forEach(e => {
  const count = parseInt(e.total_tickets || 0);
  for (let i = 0; i < count; i++) {
    raffleBasket.push(e.user_id);
  }
});

// Selection loop
for (const reward of rewards) {
  if (raffleBasket.length === 0) break;
  const randIdx = Math.floor(Math.random() * raffleBasket.length);
  const winnerUserId = raffleBasket[randIdx];

  winnersDrawn.push({
    userId: winnerUserId,
    position: reward.reward_position,
    type: reward.reward_type,
    value: parseFloat(reward.reward_value)
  });

  // Safe filter out to avoid duplicates
  raffleBasket = raffleBasket.filter(uid => uid !== winnerUserId);
}
```

### 2. Referral Leaderboards (`REFERRAL_CONTEST`)
Sorts users dynamically based on real sign-up conversions occurring **strictly after** the user clicked "Join Contest":
```sql
SELECT cp.user_id, u.name as userName, COUNT(ru.id) as scoreValue
FROM contest_participants cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN referral_uses ru ON ru.referrer_id = cp.user_id 
                         AND ru.created_at > cp.joined_at 
                         AND ru.created_at BETWEEN ? AND ?
WHERE cp.contest_id = ?
GROUP BY cp.user_id, u.name
ORDER BY scoreValue DESC, cp.joined_at ASC
```

### 3. Earnings Leaderboards (`EARNINGS_CONTEST`)
Ranks participants strictly by aggregated credits from verified tasks, video ads, or offer completions occurring **strictly after** the user clicked "Join Contest":
```sql
SELECT cp.user_id, u.name as userName, COALESCE(SUM(t.amount), 0) as scoreValue
FROM contest_participants cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN transactions t ON t.user_id = cp.user_id 
                        AND t.type = 'CREDIT' 
                        AND t.source IN ('OFFER', 'TASK', 'WATCH_VIDEO', 'VIDEO_AD', 'OFFER_COMPLETION') 
                        AND t.created_at > cp.joined_at 
                        AND t.created_at BETWEEN ? AND ?
WHERE cp.contest_id = ?
GROUP BY cp.user_id, u.name
ORDER BY scoreValue DESC, cp.joined_at ASC
```

---

## 📈 5. Double-Entry Prize Ledger Crediting
Prize disbursement runs inside a safe, isolated database transaction. Coins or cash payouts instantly credit the user's profile and insert a matching ledger record to prevent coin leakage:

```javascript
// Atomic reward crediting double-entry block
await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [w.value, w.userId]);

const transId = uuidv4();
const description = `Won Rank #${w.position} in Contest: ${contest.title}`;
await connection.query(
  `INSERT INTO transactions (id, user_id, amount, type, source, description, reference_id, created_at)
   VALUES (?, ?, ?, 'CREDIT', 'CONTEST_REWARD', ?, ?, NOW())`,
  [transId, w.userId, w.value, description, winnerId]
);
```
*(Gift Card items are saved as pending in `contest_winners` and dispatched manually by admins, who input the Amazon/Google Play voucher code).*
