-- Facebook Ads Manager Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS facebook_ads_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE facebook_ads_manager;

-- Ad Accounts Table
CREATE TABLE ad_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    access_token TEXT,
    currency VARCHAR(10) DEFAULT 'USD',
    spend_cap DECIMAL(15,2) DEFAULT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    account_status VARCHAR(50) DEFAULT 'ACTIVE',
    business_id VARCHAR(50) DEFAULT NULL,
    timezone_name VARCHAR(100) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_status (account_status)
);

-- Campaigns Table
CREATE TABLE campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id VARCHAR(50) UNIQUE NOT NULL,
    ad_account_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(100) NOT NULL,
    status ENUM('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED') DEFAULT 'PAUSED',
    daily_budget DECIMAL(15,2) DEFAULT NULL,
    lifetime_budget DECIMAL(15,2) DEFAULT NULL,
    bid_strategy VARCHAR(100) DEFAULT 'LOWEST_COST',
    buying_type VARCHAR(50) DEFAULT 'AUCTION',
    start_time DATETIME DEFAULT NULL,
    stop_time DATETIME DEFAULT NULL,
    special_ad_categories JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE,
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_account_id (ad_account_id),
    INDEX idx_status (status),
    INDEX idx_objective (objective)
);

-- Ad Sets Table
CREATE TABLE adsets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    adset_id VARCHAR(50) UNIQUE NOT NULL,
    campaign_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED') DEFAULT 'PAUSED',
    optimization_goal VARCHAR(100) NOT NULL,
    targeting JSON NOT NULL,
    daily_budget DECIMAL(15,2) DEFAULT NULL,
    lifetime_budget DECIMAL(15,2) DEFAULT NULL,
    bid_amount DECIMAL(15,6) DEFAULT NULL,
    bid_strategy VARCHAR(100) DEFAULT 'LOWEST_COST',
    billing_event VARCHAR(50) DEFAULT 'IMPRESSIONS',
    start_time DATETIME DEFAULT NULL,
    end_time DATETIME DEFAULT NULL,
    frequency_control_specs JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    INDEX idx_adset_id (adset_id),
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_status (status),
    INDEX idx_optimization_goal (optimization_goal)
);

-- Ad Creatives Table
CREATE TABLE ad_creatives (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creative_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT NULL,
    body TEXT DEFAULT NULL,
    call_to_action_type VARCHAR(50) DEFAULT NULL,
    image_hash VARCHAR(100) DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    video_id VARCHAR(50) DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    link_url TEXT DEFAULT NULL,
    object_story_spec JSON DEFAULT NULL,
    asset_feed_spec JSON DEFAULT NULL,
    creative_type VARCHAR(50) DEFAULT 'SINGLE_IMAGE',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_creative_id (creative_id),
    INDEX idx_creative_type (creative_type),
    INDEX idx_status (status)
);

-- Ads Table
CREATE TABLE ads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_id VARCHAR(50) UNIQUE NOT NULL,
    adset_id INT NOT NULL,
    creative_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED') DEFAULT 'PAUSED',
    bid_amount DECIMAL(15,6) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (adset_id) REFERENCES adsets(id) ON DELETE CASCADE,
    FOREIGN KEY (creative_id) REFERENCES ad_creatives(id) ON DELETE CASCADE,
    INDEX idx_ad_id (ad_id),
    INDEX idx_adset_id (adset_id),
    INDEX idx_creative_id (creative_id),
    INDEX idx_status (status)
);

-- Campaign Insights Table
CREATE TABLE campaign_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    impressions BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    unique_clicks BIGINT DEFAULT 0,
    spend DECIMAL(15,4) DEFAULT 0.0000,
    ctr DECIMAL(10,6) DEFAULT 0.000000,
    cpc DECIMAL(15,6) DEFAULT 0.000000,
    cpm DECIMAL(15,6) DEFAULT 0.000000,
    frequency DECIMAL(10,4) DEFAULT 0.0000,
    actions JSON DEFAULT NULL,
    action_values JSON DEFAULT NULL,
    cost_per_action_type JSON DEFAULT NULL,
    video_30_sec_watched_actions JSON DEFAULT NULL,
    video_p25_watched_actions JSON DEFAULT NULL,
    video_p50_watched_actions JSON DEFAULT NULL,
    video_p75_watched_actions JSON DEFAULT NULL,
    video_p100_watched_actions JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_campaign_date (campaign_id, date_start, date_stop),
    INDEX idx_date_range (date_start, date_stop),
    INDEX idx_campaign_id (campaign_id)
);

-- AdSet Insights Table
CREATE TABLE adset_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    adset_id INT NOT NULL,
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    impressions BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    unique_clicks BIGINT DEFAULT 0,
    spend DECIMAL(15,4) DEFAULT 0.0000,
    ctr DECIMAL(10,6) DEFAULT 0.000000,
    cpc DECIMAL(15,6) DEFAULT 0.000000,
    cpm DECIMAL(15,6) DEFAULT 0.000000,
    frequency DECIMAL(10,4) DEFAULT 0.0000,
    actions JSON DEFAULT NULL,
    action_values JSON DEFAULT NULL,
    cost_per_action_type JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (adset_id) REFERENCES adsets(id) ON DELETE CASCADE,
    UNIQUE KEY unique_adset_date (adset_id, date_start, date_stop),
    INDEX idx_date_range (date_start, date_stop),
    INDEX idx_adset_id (adset_id)
);

-- Ad Insights Table
CREATE TABLE ad_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_id INT NOT NULL,
    date_start DATE NOT NULL,
    date_stop DATE NOT NULL,
    impressions BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    unique_clicks BIGINT DEFAULT 0,
    spend DECIMAL(15,4) DEFAULT 0.0000,
    ctr DECIMAL(10,6) DEFAULT 0.000000,
    cpc DECIMAL(15,6) DEFAULT 0.000000,
    cpm DECIMAL(15,6) DEFAULT 0.000000,
    frequency DECIMAL(10,4) DEFAULT 0.0000,
    actions JSON DEFAULT NULL,
    action_values JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ad_date (ad_id, date_start, date_stop),
    INDEX idx_date_range (date_start, date_stop),
    INDEX idx_ad_id (ad_id)
);

-- Custom Audiences Table
CREATE TABLE custom_audiences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    audience_id VARCHAR(50) UNIQUE NOT NULL,
    ad_account_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    subtype VARCHAR(100) NOT NULL,
    approximate_count BIGINT DEFAULT 0,
    data_source_types JSON DEFAULT NULL,
    delivery_status JSON DEFAULT NULL,
    operation_status JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE,
    INDEX idx_audience_id (audience_id),
    INDEX idx_account_id (ad_account_id),
    INDEX idx_subtype (subtype)
);

-- Automated Rules Table
CREATE TABLE automated_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_id VARCHAR(50) UNIQUE DEFAULT NULL,
    ad_account_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    entity_type ENUM('campaign', 'adset', 'ad') NOT NULL,
    entity_ids JSON DEFAULT NULL,
    conditions JSON NOT NULL,
    action_spec JSON NOT NULL,
    status ENUM('active', 'paused', 'deleted') DEFAULT 'active',
    evaluation_spec JSON DEFAULT NULL,
    execution_spec JSON DEFAULT NULL,
    last_executed_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (ad_account_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_status (status)
);

-- Users Table (for user management)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    role ENUM('admin', 'advertiser', 'analyst', 'viewer') DEFAULT 'viewer',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- User Account Access Table (many-to-many relationship)
CREATE TABLE user_account_access (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    ad_account_id INT NOT NULL,
    access_level ENUM('full', 'limited', 'view_only') DEFAULT 'view_only',
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_account (user_id, ad_account_id),
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (ad_account_id)
);

-- Activity Log Table
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    ad_account_id INT DEFAULT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id VARCHAR(50) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    old_values JSON DEFAULT NULL,
    new_values JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (ad_account_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Scheduled Reports Table
CREATE TABLE scheduled_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    ad_account_id INT NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_ids JSON DEFAULT NULL,
    metrics JSON NOT NULL,
    filters JSON DEFAULT NULL,
    schedule_frequency ENUM('daily', 'weekly', 'monthly') NOT NULL,
    schedule_day INT DEFAULT NULL,
    schedule_time TIME DEFAULT '09:00:00',
    email_recipients JSON DEFAULT NULL,
    format ENUM('csv', 'excel', 'pdf') DEFAULT 'csv',
    status ENUM('active', 'paused', 'deleted') DEFAULT 'active',
    last_sent_at TIMESTAMP DEFAULT NULL,
    next_send_at TIMESTAMP DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_account_id (ad_account_id),
    INDEX idx_status (status),
    INDEX idx_next_send (next_send_at)
);

-- API Rate Limiting Table
CREATE TABLE api_rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_account_id INT NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    requests_count INT DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_duration_minutes INT DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_account_id) REFERENCES ad_accounts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_account_endpoint_window (ad_account_id, endpoint, window_start),
    INDEX idx_account_id (ad_account_id),
    INDEX idx_window_start (window_start)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status)
VALUES (
    'admin',
    'admin@example.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System',
    'Administrator',
    'admin',
    'active'
);

-- Create Views for easier querying
CREATE VIEW campaign_performance_view AS
SELECT 
    c.campaign_id,
    c.name as campaign_name,
    c.objective,
    c.status,
    c.daily_budget,
    c.lifetime_budget,
    aa.account_id,
    aa.name as account_name,
    COUNT(DISTINCT a.id) as total_adsets,
    COUNT(DISTINCT ads.id) as total_ads,
    SUM(ci.impressions) as total_impressions,
    SUM(ci.reach) as total_reach,
    SUM(ci.clicks) as total_clicks,
    SUM(ci.spend) as total_spend,
    AVG(ci.ctr) as avg_ctr,
    AVG(ci.cpc) as avg_cpc,
    AVG(ci.cpm) as avg_cpm
FROM campaigns c
JOIN ad_accounts aa ON c.ad_account_id = aa.id
LEFT JOIN adsets a ON c.id = a.campaign_id
LEFT JOIN ads ON a.id = ads.adset_id
LEFT JOIN campaign_insights ci ON c.id = ci.campaign_id
GROUP BY c.id, c.campaign_id, c.name, c.objective, c.status, c.daily_budget, c.lifetime_budget, aa.account_id, aa.name;

CREATE VIEW adset_performance_view AS
SELECT 
    a.adset_id,
    a.name as adset_name,
    a.optimization_goal,
    a.status,
    a.daily_budget,
    a.lifetime_budget,
    c.campaign_id,
    c.name as campaign_name,
    COUNT(DISTINCT ads.id) as total_ads,
    SUM(ai.impressions) as total_impressions,
    SUM(ai.reach) as total_reach,
    SUM(ai.clicks) as total_clicks,
    SUM(ai.spend) as total_spend,
    AVG(ai.ctr) as avg_ctr,
    AVG(ai.cpc) as avg_cpc,
    AVG(ai.cpm) as avg_cpm
FROM adsets a
JOIN campaigns c ON a.campaign_id = c.id
LEFT JOIN ads ON a.id = ads.adset_id
LEFT JOIN adset_insights ai ON a.id = ai.adset_id
GROUP BY a.id, a.adset_id, a.name, a.optimization_goal, a.status, a.daily_budget, a.lifetime_budget, c.campaign_id, c.name;