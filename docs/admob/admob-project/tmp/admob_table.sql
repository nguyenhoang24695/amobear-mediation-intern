-- Create admob_table
CREATE TABLE IF NOT EXISTS admob_db.admob_table (
    hash_key VARCHAR(64) NOT NULL,
    date DATE,
    ad_unit_name VARCHAR(255),
    ad_unit_id VARCHAR(255),
    app_id VARCHAR(128),
    format VARCHAR(64),
    app_version_name VARCHAR(128),
    app_name VARCHAR(255),
    platform VARCHAR(32),
    ad_requests BIGINT,
    clicks BIGINT,
    estimated_earnings DOUBLE,
    impressions BIGINT,
    matched_requests BIGINT,
    match_rate DOUBLE,
    show_rate DOUBLE,
    observed_ecpm DOUBLE
)
PRIMARY KEY (hash_key)
DISTRIBUTED BY HASH(hash_key) BUCKETS 10
PROPERTIES (
    "replication_num" = "1"
);

-- Create mkt_table
CREATE TABLE IF NOT EXISTS admob_db.mkt_table (
    hash_key VARCHAR(64) NOT NULL,
    date DATE,
    app_id VARCHAR(128),
    country VARCHAR(32),
    app_version_name VARCHAR(128),
    app_name VARCHAR(255),
    format VARCHAR(64),
    platform VARCHAR(32),
    ad_requests BIGINT,
    clicks BIGINT,
    estimated_earnings DOUBLE,
    impressions BIGINT,
    matched_requests BIGINT,
    match_rate DOUBLE,
    show_rate DOUBLE,
    observed_ecpm DOUBLE
)
PRIMARY KEY (hash_key)
DISTRIBUTED BY HASH(hash_key) BUCKETS 10
PROPERTIES (
    "replication_num" = "1"
);

-- Create mediation_table
CREATE TABLE IF NOT EXISTS admob_db.mediation_table (
    hash_key VARCHAR(64) NOT NULL,
    date DATE,
    ad_unit_name VARCHAR(255),
    ad_unit_id VARCHAR(255),
    app_id VARCHAR(128),
    country VARCHAR(32),
    ad_source_name VARCHAR(255),
    ad_source_id VARCHAR(255),
    mediation_group_name VARCHAR(255),
    mediation_group_id VARCHAR(255),
    app_name VARCHAR(255),
    format VARCHAR(64),
    platform VARCHAR(32),
    ad_requests BIGINT,
    clicks BIGINT,
    estimated_earnings DOUBLE,
    impressions BIGINT,
    matched_requests BIGINT,
    match_rate DOUBLE,
    show_rate DOUBLE,
    observed_ecpm DOUBLE
)
PRIMARY KEY (hash_key)
DISTRIBUTED BY HASH(hash_key) BUCKETS 10
PROPERTIES (
    "replication_num" = "1"
);
