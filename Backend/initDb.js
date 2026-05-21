import pool from './db.js';

async function addColumnIfNotExists(connection, tableName, columnName, columnDefinition) {
  try {
    const [rows] = await connection.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
    if (rows.length === 0) {
      console.log(`➕ Adding column [${columnName}] to table [${tableName}]...`);
      await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
  } catch (error) {
    console.error(`❌ Error adding column [${columnName}] to [${tableName}]:`, error);
  }
}

export async function initializeDatabase() {
  console.log('🔄 Checking and initializing database tables...');
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY,
        uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(20),
        name VARCHAR(255),
        profile_pic TEXT,
        location VARCHAR(255),
        balance DECIMAL(10, 2) DEFAULT 0.00,
        referral_code VARCHAR(50) UNIQUE,
        referred_by CHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add extra user columns for new features
    await addColumnIfNotExists(connection, 'users', 'fcm_token', 'TEXT NULL');
    await addColumnIfNotExists(connection, 'users', 'daily_spins_count', 'INT DEFAULT 0');
    await addColumnIfNotExists(connection, 'users', 'last_spin_date', 'DATE NULL');
    await addColumnIfNotExists(connection, 'users', 'current_streak', 'INT DEFAULT 0');
    await addColumnIfNotExists(connection, 'users', 'last_streak_claim_date', 'DATE NULL');

    // 2. offers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id CHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url TEXT,
        total_reward DECIMAL(10, 2) DEFAULT 0.00,
        category VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add extra offer columns for new features
    await addColumnIfNotExists(connection, 'offers', 'likes_count', 'INT DEFAULT 0');
    await addColumnIfNotExists(connection, 'offers', 'is_hot', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfNotExists(connection, 'offers', 'external_id', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(connection, 'offers', 'tracking_url', 'TEXT NULL');
    await addColumnIfNotExists(connection, 'offers', 'type', 'VARCHAR(50) DEFAULT \'online\'');
    await addColumnIfNotExists(connection, 'offers', 'input_type', 'VARCHAR(50) NULL');
    await addColumnIfNotExists(connection, 'offers', 'input_instruction', 'TEXT NULL');
    await addColumnIfNotExists(connection, 'offers', 'reward_type', 'VARCHAR(50) DEFAULT \'Single Reward\'');
    await addColumnIfNotExists(connection, 'offers', 'extra_label', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(connection, 'offers', 'estimated_time', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(connection, 'offers', 'difficulty', 'VARCHAR(50) DEFAULT \'Medium\'');

    // 3. offer_tiers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS offer_tiers (
        id CHAR(36) PRIMARY KEY,
        offer_id CHAR(36) NOT NULL,
        title VARCHAR(255),
        reward DECIMAL(10, 2) DEFAULT 0.00,
        steps JSON,
        sequence INT DEFAULT 1,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await addColumnIfNotExists(connection, 'offer_tiers', 'tier_title', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(connection, 'offer_tiers', 'app_tier_title', 'VARCHAR(255) NULL');
    await addColumnIfNotExists(connection, 'offer_tiers', 'status', 'VARCHAR(50) DEFAULT \'ACTIVE\'');

    // 4. user_offer_progress Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_offer_progress (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        offer_id CHAR(36) NOT NULL,
        click_id VARCHAR(255) UNIQUE NULL,
        status ENUM('STARTED', 'COMPLETED') DEFAULT 'STARTED',
        completed_tiers JSON,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await addColumnIfNotExists(connection, 'user_offer_progress', 'click_id', 'VARCHAR(255) UNIQUE NULL');

    // 5. transactions Table
    // Let's modify the ENUM values safely or use simple VARCHAR for source/type to be flexible.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(20) NOT NULL,
        source VARCHAR(50) NOT NULL,
        reference_id VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await addColumnIfNotExists(connection, 'transactions', 'description', 'TEXT NULL');

    // 6. withdrawals Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(50) NOT NULL,
        details TEXT,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Dynamically expand withdrawals table if missing columns from legacy PHP
    await addColumnIfNotExists(connection, 'withdrawals', 'method_id', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(connection, 'withdrawals', 'amount_coins', 'INT DEFAULT 0');
    await addColumnIfNotExists(connection, 'withdrawals', 'amount_currency', 'DECIMAL(10, 2) DEFAULT 0.00');

    // 6a. payout_methods Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payout_methods (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        icon_url TEXT NULL,
        min_coins INT DEFAULT 0,
        conversion_rate DECIMAL(10, 4) DEFAULT 0.0000,
        currency_symbol VARCHAR(10) DEFAULT '₹',
        processing_time VARCHAR(100) NULL,
        input_type VARCHAR(50) DEFAULT 'text',
        input_label VARCHAR(100) NULL,
        input_placeholder VARCHAR(255) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6b. payout_tiers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payout_tiers (
        id VARCHAR(100) PRIMARY KEY,
        method_id VARCHAR(100) NOT NULL,
        coin_cost INT NOT NULL,
        monetary_value DECIMAL(10, 2) NOT NULL,
        currency_symbol VARCHAR(10) DEFAULT '₹',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (method_id) REFERENCES payout_methods(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. app_configs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_configs (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. streaks Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS streaks (
        user_id CHAR(36) PRIMARY KEY,
        current_streak INT DEFAULT 0,
        last_claim_date DATE NULL,
        total_claims INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. lucky_spins Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lucky_spins (
        user_id CHAR(36) PRIMARY KEY,
        spins_left INT DEFAULT 2,
        last_spin_date DATE NULL,
        total_spins INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. banners Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id CHAR(36) PRIMARY KEY,
        image_url TEXT NOT NULL,
        action_url TEXT NULL,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. lifafas Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lifafas (
        id CHAR(36) PRIMARY KEY,
        lifafa_id VARCHAR(100) UNIQUE NOT NULL,
        bonus_amount DECIMAL(10, 2) NOT NULL,
        total_limit INT NOT NULL,
        claimed_count INT DEFAULT 0,
        required_offer_id CHAR(36) NULL,
        required_offers_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. lifafa_claims Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lifafa_claims (
        id CHAR(36) PRIMARY KEY,
        lifafa_id VARCHAR(100) NOT NULL,
        user_id CHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. telegram_verification Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS telegram_verification (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NULL,
        verify_token VARCHAR(255) UNIQUE NULL,
        telegram_user_id VARCHAR(255) NULL,
        click_id VARCHAR(255) UNIQUE NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. tickets Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('OPEN', 'REPLIED', 'CLOSED') DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 15. ticket_replies Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id CHAR(36) PRIMARY KEY,
        ticket_id CHAR(36) NOT NULL,
        user_id CHAR(36) NULL,
        sender_type ENUM('USER', 'ADMIN') NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 16. offer_likes Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS offer_likes (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        offer_id CHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (user_id, offer_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 17. deletion_requests Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deletion_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id CHAR(36) NULL,
        email VARCHAR(255) NOT NULL,
        reason TEXT NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 18. referral_settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS referral_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bonus_coins DECIMAL(10, 2) DEFAULT 10.00,
        commission_percent INT DEFAULT 10,
        offers_required INT DEFAULT 2
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 19. referral_uses Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS referral_uses (
        id CHAR(36) PRIMARY KEY,
        referrer_id CHAR(36) NOT NULL,
        referred_user_id CHAR(36) NOT NULL,
        referral_code VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        offers_completed_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 20. notifications Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id CHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        target_type VARCHAR(50) NOT NULL DEFAULT 'specific',
        target_uid VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 21. offer_completions Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS offer_completions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        completion_id VARCHAR(255) UNIQUE NOT NULL,
        user_id CHAR(36) NOT NULL,
        offer_id VARCHAR(100) NULL,
        provider VARCHAR(100) NULL,
        payout_coins DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'COMPLETED',
        raw_payload TEXT NULL,
        offer_name VARCHAR(255) NULL,
        goal_name VARCHAR(255) NULL,
        gaid VARCHAR(255) NULL,
        ip_address VARCHAR(255) NULL,
        validated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed Config Defaults
    const configs = [
      {
        key: 'streak_rewards',
        value: JSON.stringify({ 1: 30, 2: 40, 3: 50, 4: 60, 5: 70, 6: 80, 7: 200 }),
        desc: 'Daily streak rewards mapping for days 1-7.'
      },
      {
        key: 'spin_probabilities',
        value: JSON.stringify([
          { type: 'JACKPOT', range: [500, 500], prob: 1 },
          { type: 'BIG',     range: [200, 300], prob: 9 },
          { type: 'MEDIUM',  range: [50, 100],  prob: 20 },
          { type: 'SMALL',   range: [10, 30],   prob: 40 },
          { type: 'NONE',    range: [0, 0],     prob: 30 }
        ]),
        desc: 'Lucky spin rewards probability configuration.'
      },
      {
        key: 'spin_daily_limit',
        value: '2',
        desc: 'Daily limit of lucky spins per user.'
      },
      {
        key: 'scratch_card_daily_limit',
        value: '5',
        desc: 'Daily limit of scratch cards per user.'
      },
      {
        key: 'scratch_card_reward_min',
        value: '5',
        desc: 'Minimum scratch card coin reward.'
      },
      {
        key: 'scratch_card_reward_max',
        value: '20',
        desc: 'Maximum scratch card coin reward.'
      },
      {
        key: 'watch_video_daily_limit',
        value: '5',
        desc: 'Daily limit of watch videos per user.'
      },
      {
        key: 'watch_video_reward_min',
        value: '5',
        desc: 'Minimum watch video coin reward.'
      },
      {
        key: 'watch_video_reward_max',
        value: '10',
        desc: 'Maximum watch video coin reward.'
      },
      {
        key: 'telegram_bot_username',
        value: 'stuearn_bot',
        desc: 'Telegram bot username.'
      },
      {
        key: 'telegram_channel_username',
        value: '@stuearn',
        desc: 'Official telegram channel handle.'
      },
      {
        key: 'latest_version',
        value: '1.1.2',
        desc: 'Latest version code for update checks.'
      },
      {
        key: 'latest_version_code',
        value: '16',
        desc: 'Latest version integer code for update checks.'
      },
      {
        key: 'force_update',
        value: 'true',
        desc: 'Force user to update the app.'
      },
      {
        key: 'update_url',
        value: 'https://play.google.com/store/apps/details?id=com.thinkforgeapps.stuearnindia',
        desc: 'App store download / update url.'
      },
      {
        key: 'update_message',
        value: 'A critical update is available!',
        desc: 'Update dialog message shown to users.'
      },
      {
        key: 'is_maintenance',
        value: 'false',
        desc: 'Enable or disable maintenance mode.'
      }
    ];

    for (const config of configs) {
      await connection.query(
        `INSERT INTO app_configs (config_key, config_value, description) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [config.key, config.value, config.desc]
      );
    }

    // Seed Payout Methods
    const payoutMethods = [
      {
        id: 'upi',
        name: 'UPI',
        description: 'Instant transfer to your bank account via UPI.',
        icon_url: 'https://i.ibb.co/C5wR90Z8/upi.png',
        min_coins: 500,
        conversion_rate: 0.01,
        currency_symbol: '₹',
        processing_time: 'Instant',
        input_type: 'text',
        input_label: 'UPI ID',
        input_placeholder: 'yourname@upi',
        is_active: 1
      },
      {
        id: 'giftcard',
        name: 'Google Play Gift Card',
        description: 'Google Play Gift Codes instantly delivered to email.',
        icon_url: 'https://i.ibb.co/3ykG5M0Y/playstore.png',
        min_coins: 1000,
        conversion_rate: 0.01,
        currency_symbol: '₹',
        processing_time: 'Within 24 Hours',
        input_type: 'text',
        input_label: 'Email Address',
        input_placeholder: 'yourname@example.com',
        is_active: 1
      }
    ];

    for (const m of payoutMethods) {
      await connection.query(
        `INSERT INTO payout_methods 
          (id, name, description, icon_url, min_coins, conversion_rate, currency_symbol, processing_time, input_type, input_label, input_placeholder, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), icon_url=VALUES(icon_url), min_coins=VALUES(min_coins), conversion_rate=VALUES(conversion_rate), currency_symbol=VALUES(currency_symbol), processing_time=VALUES(processing_time), input_type=VALUES(input_type), input_label=VALUES(input_label), input_placeholder=VALUES(input_placeholder), is_active=VALUES(is_active)`,
        [m.id, m.name, m.description, m.icon_url, m.min_coins, m.conversion_rate, m.currency_symbol, m.processing_time, m.input_type, m.input_label, m.input_placeholder, m.is_active]
      );
    }

    // Seed Payout Tiers
    const payoutTiers = [
      { id: 'upi_1', method_id: 'upi', coin_cost: 500, monetary_value: 5.0, currency_symbol: '₹' },
      { id: 'upi_2', method_id: 'upi', coin_cost: 1000, monetary_value: 10.0, currency_symbol: '₹' },
      { id: 'upi_3', method_id: 'upi', coin_cost: 2000, monetary_value: 20.0, currency_symbol: '₹' },
      { id: 'upi_4', method_id: 'upi', coin_cost: 5000, monetary_value: 50.0, currency_symbol: '₹' },
      { id: 'gc_1', method_id: 'giftcard', coin_cost: 1000, monetary_value: 10.0, currency_symbol: '₹' },
      { id: 'gc_2', method_id: 'giftcard', coin_cost: 5000, monetary_value: 50.0, currency_symbol: '₹' },
      { id: 'gc_3', method_id: 'giftcard', coin_cost: 10000, monetary_value: 100.0, currency_symbol: '₹' }
    ];

    for (const t of payoutTiers) {
      await connection.query(
        `INSERT INTO payout_tiers 
          (id, method_id, coin_cost, monetary_value, currency_symbol) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE method_id=VALUES(method_id), coin_cost=VALUES(coin_cost), monetary_value=VALUES(monetary_value), currency_symbol=VALUES(currency_symbol)`,
        [t.id, t.method_id, t.coin_cost, t.monetary_value, t.currency_symbol]
      );
    }

    console.log('✅ All database tables checked/created successfully.');
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
