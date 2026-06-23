# Kéo dữ liệu IAA thông qua AdMob API

## 1. Mô tả dự án
Dự án này trích xuất dữ liệu từ AdMob API và load vào StarRocks database


## 2. Công nghệ sử dụng
- Python được sử dụng để đọc dữ liệu từ AdMob API và biến đổi dữ liệu để dữ liệu có đầu ra như mong muốn
- StarRocks được sử dụng để lưu trữ dữ liệu đã xử lý


## 3.Triển khai
### 3.1. Cách lấy AdMob API key (chỉ cần làm 1 lần - ĐÃ LÀM)
1. Truy cập: https://console.cloud.google.com/apis/credentials. Sau đó chọn project trên Google Cloud
2. Vào Credentials, sau đó nhấn Create Credentials -> OAuth client ID với các thông tin sau:
    - Application type = "Desktop app"
    - Name = "AdMob Python Client"
Sau đó ấn "Create" và download file json

### 3.2. Cấu trúc code
- Step 1: Lấy access_token (thông qua client_secret.json): Để có quyền truy cập vào tài khoản AdMob
- Step 2: Lấy list app_id (thông qua AdMob API): Để chạy for loop qua tất cả các app
- Step 3: Đọc dữ liệu từ các app thông qua AdMob API.
- Step 4: Transform dữ liệu: Để biến dữ liệu bán cấu trúc (khi kéo từ AdMob API) thành dữ liệu có cấu trúc
- Step 5: Load dữ liệu đã transform vào StarRocks.
- Main:
    - z_main_last_10_days: ETL dữ liệu trong 10 ngày gần nhất tính từ ngày chạy code (ví dụ chạy code ngày 15/10 thì code sẽ ETL dữ liệu trong khoảng 6/10-15/10 từ AdMob API) (code này được sử dụng để chạy cronjob vào 2h sáng mỗi ngày)
    - z_main_many_days: ETL dữ liệu trong custom date range (ta sẽ chọn start_date, end_date để ETL dữ liệu trong khoảng đó)
    - z_main_mini_batch: ETL dữ liệu của ngày hiện tại (có chữ mini_batch vì code này sẽ được dùng để dặt cronjob chạy 30 phút/lần)


## 4. Hướng dẫn chạy
### 4.1. Chạy với Docker (Khuyến nghị)
Docker sẽ tự động cài đặt và cấu hình toàn bộ môi trường bao gồm Python, StarRocks database, và cron jobs.

#### Yêu cầu:
- Docker và Docker Compose
- Ít nhất 8GB RAM (khuyến nghị 16GB)

#### Các bước:

1. **Khởi động dự án:**
```bash
docker-compose up -d
```

2. **Kiểm tra trạng thái:**
```bash
docker-compose ps
docker-compose logs -f admob-platform
```

3. **Truy cập StarRocks Web UI:**
- Frontend: http://localhost:8030
- Backend: http://localhost:8040

4. **Kết nối database:**
```bash
mysql -h localhost -P 9030 -u root admob_db
```

5. **Chạy ETL thủ công (nếu cần):**
```bash
# ETL 10 ngày gần nhất
docker-compose exec admob-platform python /app/code/z_main_last_10_day.py

# ETL custom date range
docker-compose exec admob-platform python /app/code/z_main_many_days.py

# ETL ngày hiện tại
docker-compose exec admob-platform python /app/code/z_main_mini_batch.py

# ETL custom date range với lệnh Python, ta sửa các thông tin month, start_date, end_date rồi chạy lệnh sau:
conda activate admob_xmp
nohup python -u /path/to/z_main_many_days.py > admob.log 2>&1 &
```

6. **Xem logs:**
```bash
# Mini batch logs
docker-compose exec admob-platform tail -f /app/logs/cron_mini_batch.log

# Last 10 days logs
docker-compose exec admob-platform tail -f /app/logs/last_3_day_job.log
```

7. **Dừng dự án:**
```bash
docker-compose down

# Hoặc dừng và xóa data
docker-compose down -v
```

#### Cron jobs tự động:
- **Mini batch**: Mỗi 30 phút - ETL dữ liệu ngày hiện tại
- **Last 10 days**: 2h sáng mỗi ngày - ETL dữ liệu 10 ngày gần nhất

### 4.2. Chạy với Conda (Cách truyền thống)

1. Cài conda
```
sudo apt update && sudo apt upgrade -y
sudo apt install wget bzip2 -y
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh
```

2. Khởi tạo conda environment
```
conda create -n admob_xmp python=3.10 -y && conda activate admob_xmp
```

3. Cài thư viện
```
cd amo-platform
pip install -r requirements.txt
```

### 4.3. Đặt lịch (Chỉ khi chạy với Conda)
1. Cài đặt cron
```
sudo apt update
sudo apt install cron -y
```

2. Đổi lịch sang múi giờ UTC+7
- B1: Đổi múi giờ sang múi giờ UTC+7
    ```
    sudo timedatectl set-timezone Asia/Ho_Chi_Minh
    ```
- B2: Kiểm tra múi giờ hiện tại xem đã là UTC+7 chưa
    ```
    timedatectl
    ```

3. Đặt lịch
- B1: Chạy lệnh ```crontab -e``` để thực hiện đặt lịch
- B2: Paste đoạn sau vào
    ```
    */30 * * * * /bin/bash -c "source /home/mcrc1894/miniconda3/etc/profile.d/conda.sh && conda activate admob_xmp && python /home/mcrc1894/Amo-Platform/code/z_main_mini_batch.py >> /home/mcrc1894/logs/cron_mini_batch.log 2>&1"
    0 2 * * * /bin/bash -c "source /home/mcrc1894/miniconda3/etc/profile.d/conda.sh && conda activate admob_xmp && python /home/mcrc1894/Amo-Platform/code/z_main_last_3_day.py >> /home/mcrc1894/logs/last_3_day_job.log 2>&1"
    ```
- B3: Kiểm tra lại bằng ```crontab -l``` coi lịch đã được đặt chưa
