import datetime
from datetime import datetime
from step1_read_data_test import fetch_all_pages

start_code = datetime.now()
print(f"Bắt đầu chạy code lúc {start_code}")

today = (datetime.today()).strftime("%Y-%m-%d")
dimensions = ["geo"]
metrics = ["cost", "xmp_cost"]

df = fetch_all_pages(
    start_date=today,
    end_date=today,
    metrics=metrics,
    dimensions=dimensions
)
t1 = datetime.now()
print(f"Thời gian lấy dữ liệu từ AdMob API là {t1 - start_code}")
