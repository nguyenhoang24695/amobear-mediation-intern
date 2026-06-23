import os
import time
import hashlib
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

XMP_CLIENT_ID = os.getenv("XMP_CLIENT_ID")
XMP_CLIENT_SECRET = os.getenv("XMP_CLIENT_SECRET")

# Debug: Kiểm tra credentials
if not XMP_CLIENT_ID or not XMP_CLIENT_SECRET:
    print(f"⚠️ Missing credentials - CLIENT_ID: {XMP_CLIENT_ID[:10] + '...' if XMP_CLIENT_ID else 'None'}, SECRET: {'***' if XMP_CLIENT_SECRET else 'None'}")
else:
    print(f"✅ Credentials loaded - CLIENT_ID: {XMP_CLIENT_ID[:10]}..., SECRET: {'***' if XMP_CLIENT_SECRET else 'None'}")

def make_sign(client_secret: str, timestamp: int) -> str:
    # Debug signature generation
    raw = f"{client_secret}{timestamp}"
    print(f"🔐 Generating signature: secret + timestamp = {client_secret} + {timestamp}")
    print(f"🔐 Raw string: {raw}")
    m = hashlib.md5()
    m.update(raw.encode("utf-8"))
    sign = m.hexdigest()
    print(f"🔐 Generated signature: {sign}")
    return sign

def get_report(
    start_date: str,
    end_date: str,
    metrics: list,
    dimensions: list = None,
    module: str = None,
    account_ids: list = None,
    geo: list = None,
    page: int = 1,
    page_size: int = 200,
    currency: str = "USD",
    third_party_timezone: str = None
):
    url = "https://xmp-open.mobvista.com/v2/media/account/report"
    timestamp = int(time.time())
    sign = make_sign(XMP_CLIENT_SECRET, timestamp)
    
    body = {
        "client_id": XMP_CLIENT_ID,
        "timestamp": timestamp,
        "sign": sign,
        "start_date": start_date,
        "end_date": end_date,
        "metrics": metrics,
        "page": page,
        "page_size": page_size,
        "currency": currency
    }
    if dimensions:
        body["dimension"] = dimensions
    if module:
        body["module"] = module
    if account_ids:
        body["account_id"] = account_ids
    if geo:
        body["geo"] = geo
    if third_party_timezone:
        body["third_party_timezone"] = third_party_timezone

    headers = {
        "Content-Type": "application/json"
    }
    try:
        print(f"🔄 Making API request to XMP... Page: {page}")
        print(f"📊 Request body: client_id={body['client_id'][:10]}..., timestamp={body['timestamp']}")
        
        resp = requests.post(url, json=body, headers=headers)
        result = resp.json()
        
        if result.get('code') != 0:
            print(f"❌ API Error: {result}")
        else:
            print(f"✅ API Success: Got {len(result.get('data', {}).get('list', []))} records")
            
        return result
        
    except Exception as e:
        print(f"💥 Request exception: {str(e)}")
        return {'code': -1, 'msg': f'Request failed: {str(e)}', 'data': []}

def fetch_all_pages(max_pages: int = 100, **kwargs):
    all_records = []
    page = 1
    
    # Thêm delay nhỏ trước lần request đầu tiên để tránh rate limit
    print("⏳ Initial delay to avoid rate limit...")
    time.sleep(3)
    
    while page <= max_pages:
        result = get_report(page=page, **kwargs)
        if result.get("code") != 0:
            print("Error fetching:", result)
            break

        data = result.get("data", {})
        recs = data.get("list", [])
        all_records.extend(recs)

        if not recs:
            break

        page += 1

        # Sleep giữa các requests để tránh rate limit
        if page <= max_pages:  # Không sleep ở page cuối cùng
            print(f"⏳ Waiting 2 seconds before next request...")
            time.sleep(2)
        
        # Sleep sau mỗi 10 requests để không bị block
        if page % 10 == 0:
            print("Hit 10 requests, sleeping 60s...")
            time.sleep(60)
    df = pd.DataFrame(all_records)
    
    # Kiểm tra nếu DataFrame rỗng
    if df.empty:
        print("⚠️ No data received from API. Returning empty DataFrame with proper structure.")
        # Tạo DataFrame rỗng với đúng cấu trúc
        cols_order = ["hash_key", "account_id", "account_name", "date", "module", "os", "product_id",
                      "product_name", "store_package_id", "timezone", "currency", "cost", "xmp_cost"]
        return pd.DataFrame(columns=cols_order)

    print(f"📊 Processing {len(df)} records...")
    
    # Thêm cột hash_key
    df["hash_key"] = df.apply(
        lambda x: hashlib.md5(
            f"{x['date']}_{x['store_package_id']}_{x['product_id']}_{x['account_id']}_{x['os']}_{x['module']}".encode("utf-8")
        ).hexdigest(),
        axis=1
    )

    # Đổi thứ tự cột dữ liệu
    cols_order = ["hash_key", "account_id", "account_name", "date", "module", "os", "product_id",
                  "product_name", "store_package_id", "timezone", "currency", "cost", "xmp_cost"]

    # Reorder DataFrame
    df = df[cols_order]
    print(f"✅ Data processed successfully: {len(df)} records with hash_key")
    return df
