# 1. Giới thiệu
## 1.1. Mô tả dự án
- Xây dựng hệ thống xử lý dữ liệu
- Luồng dữ liệu: Firebase --> BigQuery --> GCS --Spark_for_transform_data--> StarRocks --> Superset

**Cấu hình từng app (MediationPro):** Để thêm một app mới vào pipeline (tạo JSON param như `com_earthmap_livesatellite_worldmap_view`), xem **[Hướng dẫn cấu hình Firebase cho từng app](./HUONG-DAN-CAU-HINH-FIREBASE-MOI-APP.md)** — quy trình tạo Service Account, firebaseAppKey, firebase_params và cấu hình qua API/DB.

## 1.2. Công nghệ sử dụng
1. BigQuery để lưu trữ dữ liệu từ Firebase của các project
2. GCS được sử dụng để lưu trữ dữ liệu (dạng parquet) được push từ BigQuery
3. Apache Spark được sử dụng để xử lý dữ liệu (loại bỏ các trường dữ liệu không cần thiết và flatten các trường dữ liệu kiểu JSON thành nhiều trường dữ liệu mới)
4. StarRocks được sử dụng để nhận dữ liệu đã làm sạch cho mục đích phân tích dữ liệu, BI
5. Superset được sử dụng để trực quan hóa dữ liệu


# 2. Quy tắc đặt tên key service, bucket, table trong pipeline
- Đặt tên **key_service** theo cú pháp **{"app_id"}.json**. Ví dụ **com_fastsigninemail_securemail_bestemail.json**

- **Trên StarRocks**
    - Tên **database** là **amobear_app_dwh**
    - Tên **table** được đặt bằng **{"app_id"}_table**. Ví dụ: **com_fastsigninemail_securemail_bestemail_table**

# 3. Tạo key service
- Tạo key service cho từng project cho 2 mục đích:
    - Bắn dữ liệu từ BigQuery vào GCS (của chính project đó)
    - Bắn dữ liệu đã transform vào StarRocks

- Các bước tạo service account:
    - Google Cloud Console -> IAM & Admin -> Service accounts -> Create service account -> Đặt tên service account (**phải đặt theo đúng quy định** như đã nói ở **mục #2**) -> Add quyền cho service account (nhìn bên dưới) -> Có thể thêm description "Service account for Data Platform" -> Ấn "Done" để kết thúc việc tạo service account -> Click vào service vừa tạo -> Ấn vào tab Key để add key -> Chọn key kiểu JSON -> Tải về và nhóm đặt tên cho key_service (**phải đặt theo đúng quy định** như đã nói ở **mục #2**)

- Các quyền mà service account cần có:
    - BigQuery Admin
    - Storage Admin
    - (Không cần add luôn, nhưng nếu chạy mà có thông báo thiếu quyền thì có thể thử thêm Environment and Storage Object Viewer, BigQuery Data Viewer và BigQuery Data Editor)

- Cuối cùng, tải key về vào add vào folder z_api_key


# 4. Hướng dẫn chạy pipeline
## 4.1. Phương pháp 1: Chạy bằng Docker (Khuyến nghị)
### 4.1.1. Yêu cầu
- Docker và Docker Compose đã được cài đặt
- Điền thông tin vào `MKT_HOST_DB`, `MKT_USER_DB`, `MKT_PASSWD_DB` trong `.env`

### 4.1.2. Khởi động container
```bash
cd /home/ubuntu/gcp_starrocks_server
sudo docker compose up -d --build
```

### 4.1.3. Lịch chạy tự động
- Container sẽ tự động chạy script `z_main_yesterday.py` **2 lần mỗi ngày**:
    - **2h sáng** (2:00 AM)
    - **2h chiều** (2:00 PM)
- Múi giờ: **Asia/Ho_Chi_Minh** (GMT+7)

### 4.1.4. Kiểm tra và theo dõi
- Xem trạng thái container:
    ```bash
    sudo docker ps
    ```

- Xem log realtime:
    ```bash
    sudo docker logs -f starrocks_scheduler
    ```

- Xem log cron job:
    ```bash
    tail -f logs/cron.log
    ```

### 4.1.5. Chạy thủ công (test)
- Chạy script ngay lập tức mà không cần đợi cron:
    ```bash
    sudo docker exec starrocks_scheduler python /app/code/z_main_yesterday.py
    ```

### 4.1.6. Dừng/Khởi động lại container
- Dừng container:
    ```bash
    sudo docker compose down
    ```

- Khởi động lại:
    ```bash
    sudo docker compose up -d
    ```

### 4.1.7. Cấu hình app cần chạy
- Sửa file `code/config_app_and_date.json`:
    ```json
    {
        "list_app": ["callerid", "live_world_map", "weather_now"],
        "year": 2025,
        "month": 11,
        "start_date": 21,
        "end_date": 21
    }
    ```
- **Lưu ý**: `z_main_yesterday.py` chỉ đọc `list_app`, các trường khác (`year`, `month`, `start_date`, `end_date`) chỉ dùng cho `z_main_many_days.py`

---

## 4.2. Phương pháp 2: Chạy thủ công với Conda
### 4.2.1. Thiết lập môi trường
- `cd` vào folder setup, sau đó:
    - Cài conda, java bằng cách chạy lệnh
        ```bash
        chmod +x install_conda_java.sh
        ./install_conda_java.sh
        ```
        - Sau đó chạy `source ~/.bashrc` là xong
        - Có thể kiểm tra bằng lệnh `conda --version`

    - Tạo conda env và cài thư viện bằng cách chạy lệnh
        ```bash
        chmod +x install_libs.sh
        ./install_libs.sh
        ```

### 4.2.2. Chạy pipeline
- Để chạy pipeline cần:
    - Điền thông tin vào `MKT_HOST_DB`, `MKT_USER_DB`, `MKT_PASSWD_DB` trong `.env`
    - Khởi động conda environment bằng cách chạy lệnh
        ```bash
        conda activate spark_env
        ```
    - Sửa thông tin app, ngày muốn chạy trong file config

- Chạy lệnh:
    - Nếu kéo dữ liệu hôm qua:
        ```bash
        python -u code/z_main_yesterday.py
        ```
    - Nếu kéo dữ liệu nhiều ngày:
        ```bash
        python -u code/z_main_many_days.py
        ```
