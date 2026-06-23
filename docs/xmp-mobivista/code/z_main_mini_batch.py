import datetime
from datetime import datetime
import pandas as pd
from step1_read_data import fetch_all_pages
from step2_load_data_to_starrocks import load_data_to_xmp_table

start_code = datetime.now()
print(f"Bắt đầu chạy code lúc {start_code}")

today = (datetime.today()).strftime("%Y-%m-%d")
dimensions = ["date", "store_package_id", "product_id", "product_name", "os", "account_name"]
metrics = ["cost", "xmp_cost"]


df = fetch_all_pages(
    start_date=today,
    end_date=today,
    metrics=metrics,
    dimensions=dimensions
)
t1 = datetime.now()
print(f"Thời gian lấy dữ liệu từ AdMob API là {t1 - start_code}")

load_data_to_xmp_table(df)
t2 = datetime.now()
print(f"Thời gian load dữ liệu vào StarRocks database là {t2 - t1}")

end_code = datetime.now()
print(f"Kết thúc chạy code lúc {end_code} với tổng thời gian là {end_code-start_code}")

