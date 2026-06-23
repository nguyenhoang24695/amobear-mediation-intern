# Kéo dữ liệu doanh thu thông qua XMP API

## 1. Mô tả dự án
Dự án này trích xuất dữ liệu từ XMP API và load vào StarRocks database


## 2. Công nghệ sử dụng
- Python được sử dụng để đọc dữ liệu từ XMP API và biến đổi dữ liệu để dữ liệu có đầu ra như mong muốn
- StarRocks được sử dụng để lưu trữ dữ liệu đã xử lý


## 3. Cấu trúc code
- Step 1: Lấy đọc dữ liệu thông qua XMP API, sau đó thêm trường dữ liệu hash_key để làm PRIMARY KEY, sau đó sắp xếp lại cột dữ liệu và trả về Pandas DataFrame
- Step 2: Load dữ liệu đã xử lý vào StarRocks.
- Main:
    - z_main_last_10_days: ETL dữ liệu trong 10 ngày gần nhất tính từ ngày chạy code (ví dụ chạy code ngày 15/10 thì code sẽ ETL dữ liệu trong khoảng 6/10-15/10 từ XMP API) (code này được sử dụng để chạy cronjob vào 6h sáng mỗi ngày)
    - z_main_many_days: ETL dữ liệu trong custom date range (ta sẽ chọn start_date, end_date để ETL dữ liệu trong khoảng đó)
    - z_main_mini_batch: ETL dữ liệu của ngày hiện tại (có chữ mini_batch vì code này sẽ được dùng để dặt cronjob chạy 30 phút/lần)


## 4. Hướng dẫn chạy
### 4.1. Tạo StarRocks database
1. Có thể sử dụng Docker với image: ```starrocks/allin1-ubuntu```

2. Tạo bảng dữ liệu trong StarRocks db
- B1: Tạo bằng tay database ```xmp_db```
- B2: Tạo bảng dữ liệu:
    ```
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
    ```

### 4.2. Khởi tạo môi trường
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
    cd pull_data_xmp
    pip install -r requirements.txt
    ```

### 4.2. Đặt lịch
1. Cài đặt cron
    ```
    sudo apt update
    sudo apt install cron -y
    ```

2. Đặt lịch
- B1: Chạy lệnh ```crontab -e``` để thực hiện đặt lịch
- B2: Paste đoạn sau vào
    ```
    */30 * * * * /bin/bash -c "source /home/mcrc1894/miniconda3/etc/profile.d/conda.sh && conda activate admob_xmp && python /home/mcrc1894/DE-Project---Amo-Platform/Docker/pull_data_xmp/code/z_main_mini_batch.py >> /home/mcrc1894/logs/xmp_cron_mini_batch.log 2>&1 &"
    0 6 * * * /bin/bash -c "source /home/mcrc1894/miniconda3/etc/profile.d/conda.sh && conda activate admob_xmp && python /home/mcrc1894/DE-Project---Amo-Platform/Docker/pull_data_xmp/code/z_main_last_10_day.py >> /home/mcrc1894/logs/xmp_last_10_day_job.log 2>&1"
    ```
- B3: Kiểm tra lại bằng ```crontab -l``` coi lịch đã được đặt chưa
