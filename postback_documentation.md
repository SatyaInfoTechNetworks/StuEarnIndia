# StuEarn India - Partner S2S Postback Integration Guide

This guide contains the exact **Server-to-Server (S2S) Postback URL formats** configured on your production Node.js backend. Use these URLs in your partner dashboards to trigger automated user credits and coin balance deductions (for chargebacks/reversals).

---

## 🚀 Postback Configuration URLs

Configure these exact URL templates in your publisher dashboards. Replace the bracketed variables (e.g. `{user_id}`) if your provider uses different placeholder syntax.

| Ad Network / Partner | HTTP Method | Target URL Configuration | Chargeback / Reversal Supported? |
| :--- | :---: | :--- | :---: |
| **Custom App Offers (In-House S2S)** | `GET` / `POST` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/postback?click_id={click_id}&tier_title={tier_title}` | **Idempotent** (Credits exact task tier reward) |
| **PubScale (Offers/Surveys)** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/pubscale?user_id={user_id}&value={value}&token={token}&signature={signature}&offer_name={offer_name}&goal_name={goal_name}&gaid={gaid}&ip={ip}` | **Yes** (Runs validation check) |
| **PubScale (Chargebacks)** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/pubscale-chargeback?user_id={user_id}&value={value}&token={token}&signature={signature}&offer_name={offer_name}&reason={reason}&gaid={gaid}&ip={ip}` | **Yes** (Automated coin deduction) |
| **CPX Research** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/cpx-research?status={status}&trans_id={trans_id}&user_id={user_id}&amount_local={amount_local}&hash={hash}&type={type}&offer_id={offer_id}` | **Yes** (Reverses coins on status `2` or `-2`) |
| **Opinion Universe** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/opinionuniverse?userid={userid}&PAYOUT={PAYOUT}&OFFERID={OFFERID}&offername={offername}&TransactionID={TransactionID}&PUBPAYOUT={PUBPAYOUT}&STATUS={STATUS}&eventname={eventname}&IP={IP}&gaid={gaid}&SIG={SIG}` | **Yes** (Deducts balance on status `2`) |
| **Pocketsfull** | `GET`/`POST` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/pocketsfull?status={status}&trans_id={trans_id}&user_id={user_id}&amount_local={amount_local}&hash={hash}&offer_id={offer_id}&type={type}` | **Yes** (Deducts balance on status `2`/`rejected`) |
| **Adjump** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/adjump?user_id={userid}&reward={reward_amount}&transaction_id={transaction_id}&campaign={campaign}&offer_id={offer_id}&gaid={gaid}` | No (Credit-only webhook) |
| **Growdeck Playtime** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/growdeck?user_id={user_id}&reward={reward}&transaction_id={transaction_id}&signature={signature}&campaign={campaign}&offer_id={offer_id}&click_ip={click_ip}&gaid={gaid}` | No (Credit-only webhook) |
| **Playtime Ads** | `GET`/`POST` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/playtimeads?user_id={user_id}&offer_id={offer_id}&offer_name={offer_name}&amount={amount}&signature={signature}&task_id={task_id}&task_name={task_name}` | No (Credit-only webhook) |
| **Offermaru** | `GET` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/offermaru?user_id={user_id}&user_reward={user_reward}&offer_id={offer_id}&offer_name={offer_name}&transaction_id={transaction_id}&publisher_payout={publisher_payout}&timestamp={timestamp}` | No (Credit-only webhook) |
| **Real Opinion** | `POST` | `https://stuearn-api.satyainfotechnetworks.com/api/webhook/realopinion` | No (Credit-only webhook) |

---

## 📝 Real Opinion JSON POST Payload Format

When configuring the **Real Opinion** dashboard, select the **HTTP POST** format and set the raw JSON body structure to:

```json
{
  "app_id": "{app_id}",
  "user_id": "{user_id}",
  "status": {status},
  "trans_id": "{trans_id}",
  "publisher_payout": {publisher_payout},
  "user_payout": {user_payout},
  "bonus_amount": {bonus_amount}
}
```

---

## 🛠️ Security Verification & Ledger Flow

> [!NOTE]
> All S2S callbacks are protected by cryptographic validation to prevent malicious token generation or timing-based transaction spoofing.

### 1. Hash & Key Configurations
The Node.js backend validates incoming payloads using secure system variables. Ensure your provider matches the following hash algorithms used by the server:
* **CPX Research**: `md5(trans_id - secure_hash)` (Secure Hash: `c61DO2Aq2vD6kZZ9OlLZzNtiXPoDrh2R`)
* **Pocketsfull**: `md5(trans_id - secure_hash)` (Secure Hash: `32bd6747585ce63889cc74de8bdc6b4e`)
* **PubScale**: `md5(secret_key . user_id . int_value . token)` (Secret Key: `5e3b39c2-755c-40ba-8c96-6b9d2e60a166`)
* **Growdeck**: `hmac-sha256(secret_key, secret_key . user_id . trunc(reward) . transaction_id)` (Secret Key: `30a11d6e8a666dd4bf5d6a4ab0a899`)
* **Playtime Ads**: `sha1(user_id + offer_id + amount + app_key + app_secret)`

### 2. Transaction Auditing
* **Credit Operations**: On successful offer completion, the server records a `CREDIT` transaction under the respective network name, updates the user's wallet, and pushes an FCM notification.
* **Debit Reversal Operations**: For CPX (`status: 2`/`-2`), Pubscale, Pocketsfull, and Opinion Universe (`status: 2`), the server performs a **secure wallet rollback**. It marks the `offer_completions` record as `REVERSED`, deducts the coins, inserts a `DEBIT` entry with the rejection details in the ledger, and triggers warning alerts.
