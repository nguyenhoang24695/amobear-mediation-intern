-- Quick setup script to create database and basic table

CREATE DATABASE IF NOT EXISTS facebook_ads_manager;
USE facebook_ads_manager;

-- Create ad_accounts table
CREATE TABLE IF NOT EXISTS ad_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    timezone_name VARCHAR(100) DEFAULT 'UTC',
    account_status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Show tables
SHOW TABLES;

SELECT 'Database setup complete!' as status;