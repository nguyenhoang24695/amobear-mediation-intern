# step1_create_StarRocks_table_and_GCS_bucket.py - K8s version
import os
from dotenv import load_dotenv
from google.cloud import storage
import mysql.connector

load_dotenv()

def create_gcs_bucket(app_name):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(script_dir, "..", "z_api_key", f"{app_name}.json")

    # Khởi tạo client từ key service account
    client = storage.Client.from_service_account_json(key_path)

    # Tạo bucket
    try:
        bucket_name = f"{app_name}_bucket"
        bucket = client.bucket(bucket_name)
        bucket.location = "US"
        client.create_bucket(bucket)
        print(f"Bucket {bucket_name} created.")
    except:
        print("Might have made the bucket!!!")


def create_starrocks_table(app_name):
    starrocks_config = {
        "host": os.getenv("MKT_HOST_DB"),
        "jdbc_port": int(os.getenv("MKT_JDBC_PORT")),
        "http_port": int(os.getenv("MKT_HTTP_PORT")),
        "database": os.getenv("MKT_FIREBASE_DB"),
        "table": f"{app_name}",
        "user": os.getenv("MKT_USER_DB"),
        "password": os.getenv("MKT_PASSWD_DB")
    }

    # Kết nối JDBC tới FE
    conn = mysql.connector.connect(
        host=starrocks_config["host"],
        port=starrocks_config["jdbc_port"],
        user=starrocks_config["user"],
        password=starrocks_config["password"],
        database=starrocks_config["database"]
    )

    # Tạo bảng dữ liệu trong StarRocks
    cursor = conn.cursor()
    create_sql = f"""
    CREATE TABLE IF NOT EXISTS {starrocks_config["database"]}.{starrocks_config["table"]} (
        event_date                   DATE,
        event_timestamp              BIGINT,
        user_pseudo_id               VARCHAR(64),
        install_date                 DATE,
        retention_day                INT,
        event_name                   VARCHAR(64),
        app_version                  VARCHAR(32),
        `device.advertising_id`     VARCHAR(128),
        `device.category`           VARCHAR(32),
        `device.language`           VARCHAR(16),
        `device.mobile_brand_name`  VARCHAR(32),
        `device.mobile_marketing_name` VARCHAR(64),
        `device.mobile_model_name`  VARCHAR(64),
        `device.OS_version`         VARCHAR(32),
        `geo.city`                  VARCHAR(64),
        `geo.continent`             VARCHAR(64),
        `geo.country`               VARCHAR(64),
        `geo.sub_continent`         VARCHAR(64),
        `traffic_source.medium`     VARCHAR(32),
        `traffic_source.name`       VARCHAR(128),
        `traffic_source.source`     VARCHAR(32)
    )
    DUPLICATE KEY(`event_date`, `event_timestamp`, `user_pseudo_id`)
    PARTITION BY RANGE(`event_date`) (
        START ("2025-01-01") END ("2027-01-01") EVERY (INTERVAL 1 DAY)
    )
    DISTRIBUTED BY HASH(`user_pseudo_id`) BUCKETS 32
    PROPERTIES (
        "compression" = "ZSTD",
        "bloom_filter_columns" = "user_pseudo_id,event_name",
        "replication_num" = "1"               
    );
    """
    cursor.execute(create_sql)
    conn.commit()
    print(f"StarRocks table {app_name} created")
