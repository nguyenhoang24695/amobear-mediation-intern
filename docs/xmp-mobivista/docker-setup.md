# XMP Platform Docker Setup

## Tổng quan
Dự án này sử dụng Docker để container hóa ứng dụng XMP Platform, tự động kéo dữ liệu từ XMP API và load vào StarRocks database.

## Yêu cầu hệ thống
- Docker & Docker Compose
- StarRocks database đã được cài đặt và chạy (external)

## Cấu trúc Docker
```
├── Dockerfile              # Container definition cho XMP Platform
├── docker-compose.yml      # Docker Compose configuration  
├── docker-entrypoint.sh    # Entry point script với cron jobs
├── run-with-env.sh         # Helper script để load environment
├── .env.example            # Environment variables template
└── logs/                   # Volume cho application logs
```

## Cài đặt và chạy

### 1. Chuẩn bị environment
```bash
# Copy và chỉnh sửa environment file
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin thực tế:
- `MKT_HOST_DB`: IP/hostname của StarRocks server
- `MKT_PORT_DB`: Port của StarRocks (mặc định 9030)  
- `MKT_USER_DB`: Username StarRocks
- `MKT_PASSWD_DB`: Password StarRocks
- `XMP_CLIENT_ID`: Client ID từ XMP API
- `XMP_CLIENT_SECRET`: Client Secret từ XMP API

### 2. Tạo thư mục logs
```bash
mkdir -p logs
```

### 3. Build và chạy container
```bash
# Build image
docker-compose build

# Chạy container
docker-compose up -d

# Xem logs
docker-compose logs -f
```

## Cron Jobs được cài đặt
Container sẽ tự động thiết lập các cron jobs:

1. **Mini Batch** (mỗi 30 phút):
   ```
   */30 * * * * python /app/code/z_main_mini_batch.py
   ```

2. **Last 10 Days** (6h sáng mỗi ngày):
   ```
   0 6 * * * python /app/code/z_main_last_10_day.py
   ```

## Logs
Tất cả logs được lưu trong thư mục `./logs/`:
- `xmp_cron_mini_batch.log`: Logs của mini batch job
- `xmp_last_10_day_job.log`: Logs của 10-day job

## Quản lý Container

### Xem trạng thái
```bash
docker-compose ps
```

### Xem logs realtime
```bash
docker-compose logs -f xmp-platform
```

### Restart container
```bash
docker-compose restart
```

### Stop container
```bash
docker-compose down
```

### Chạy manual job
```bash
# Vào container
docker-compose exec xmp-platform bash

# Chạy manual job
python /app/code/z_main_many_days.py
```

## Troubleshooting

### Kiểm tra kết nối StarRocks
```bash
docker-compose exec xmp-platform nc -zv $MKT_HOST_DB $MKT_PORT_DB
```

### Kiểm tra cron jobs
```bash
docker-compose exec xmp-platform crontab -l
```

### Kiểm tra logs chi tiết
```bash
docker-compose exec xmp-platform tail -f /app/logs/*.log
```