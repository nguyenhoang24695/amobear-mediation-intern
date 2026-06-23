import os
import json
import traceback
import urllib.request
from step1_create_StarRocks_table_and_GCS_bucket import create_gcs_bucket, create_starrocks_table
from step3_transform_and_load_data_to_StarRocks import transform_and_load

# Config URL and fallback local file
CONFIG_URL = "https://openai.amobear.com/server-data/config/firebase/list-app.json"
script_dir = os.path.dirname(os.path.abspath(__file__))
LOCAL_CONFIG_PATH = os.path.join(script_dir, "config_app_and_date.json")

# Try to load config from URL first, fallback to local file
config = None
try:
    print(f"Attempting to load config from URL: {CONFIG_URL}", flush=True)
    with urllib.request.urlopen(CONFIG_URL, timeout=10) as response:
        config = json.loads(response.read().decode('utf-8'))
    print("✓ Successfully loaded config from URL", flush=True)
except Exception as e:
    print(f"⚠ Failed to load config from URL: {e}", flush=True)
    print(f"→ Falling back to local config file: {LOCAL_CONFIG_PATH}", flush=True)
    try:
        with open(LOCAL_CONFIG_PATH, "r", encoding="utf-8") as f:
            config = json.load(f)
        print("✓ Successfully loaded config from local file", flush=True)
    except Exception as local_error:
        print(f"✗ Failed to load local config: {local_error}", flush=True)
        raise Exception("Cannot load config from both URL and local file") from local_error

# Lấy thông tin list app name, khoảng ngày từ JSON
app_names = config["list_app"]
year = config["year"]
month = config["month"]
start_date = config["start_date"]
end_date = config["end_date"]


print(f"\nProcessing apps: {app_names}", flush=True)
print(f"Date range: {year}{month:02d}{start_date:02d} to {year}{month:02d}{end_date:02d}", flush=True)

# STEP 1: Create GCS bucket and StarRocks table
print("\n=== STEP 1: Creating GCS buckets and StarRocks tables ===", flush=True)
for app_name in app_names:
    try:
        print(f"Processing {app_name}...", flush=True)
        create_gcs_bucket(app_name)
        create_starrocks_table(app_name)
    except Exception as e:
        print(f"Error in Step 1 for {app_name}: {e}", flush=True)
        traceback.print_exc()

# STEP 2: Lưu trữ dữ liệu vào StarRocks
print("\n=== STEP 2: Transforming and loading data to StarRocks ===", flush=True)
for date in range(start_date, end_date+1):
    transform_date = f"{year}{month:02d}{date:02d}"
    print(f"Processing date: {transform_date}", flush=True)
    for app_name in app_names:
        try:
            print(f"Start transform data from {app_name}", flush=True)
            transform_and_load(app_name, transform_date)
        except Exception as e:
            print(f"FAILED to transform and load data app {app_name} ngày {transform_date}: {e}", flush=True)
            traceback.print_exc()
            continue

print("\n=== Script completed ===", flush=True)
