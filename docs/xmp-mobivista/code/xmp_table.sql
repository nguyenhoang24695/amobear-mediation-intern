CREATE DATABASE IF NOT EXISTS xmp_db;

CREATE TABLE IF NOT EXISTS xmp_db.xmp_table (
    hash_key VARCHAR(32) NOT NULL,
    account_id VARCHAR(255),
    account_name VARCHAR(255),
    `date` DATE,
    module VARCHAR(100),
    os VARCHAR(50),
    product_id VARCHAR(255),
    product_name VARCHAR(255),
    store_package_id VARCHAR(255),
    timezone VARCHAR(100),
    currency VARCHAR(10),
    cost DECIMAL(18, 6),
    xmp_cost DECIMAL(18, 6)
)
PRIMARY KEY (hash_key)
DISTRIBUTED BY HASH(hash_key) BUCKETS 10
PROPERTIES (
    "replication_num" = "1"
);