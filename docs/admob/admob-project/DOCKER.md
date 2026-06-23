# 🐳 Docker Quick Start

## 📦 Kiến trúc hệ thống

Dự án gồm 3 services (hoặc 4 nếu dùng compose có starrocks-init):

1. **starrocks-fe** - Frontend node (metadata, query planning)
2. **starrocks-be** - Backend node (data storage)
3. **admob-platform** - Python app với cron jobs

**Lưu ý:** Trong repo chính **Amobear.Mediation.Tools** StarRocks chạy all-in-one, cấu hình qua **mount** `fe.conf`/`be.conf`, không dùng service starrocks-init.

## 🚀 Khởi động

```bash
# Khởi động (lần đầu sẽ lâu hơn do phải build image)
docker-compose up -d

# Kiểm tra trạng thái
docker-compose ps

# Xem logs
docker-compose logs -f admob-platform
```

**Lưu ý:** Nếu compose của bạn có service `starrocks-init`, nó sẽ chạy xong và thoát (exit 0) - đây là bình thường. Repo chính đã bỏ starrocks-init, dùng mount conf.

## Truy cập
- StarRocks FE UI: http://localhost:8030
- StarRocks BE UI: http://localhost:8040
- Database: `mysql -h localhost -P 9030 -u root admob_db`

## Lệnh quan trọng

### ETL thủ công
```bash
# Last 10 days
docker-compose exec admob-platform python /app/code/z_main_last_10_day.py

# Custom date range
docker-compose exec admob-platform python /app/code/z_main_many_days.py

# Mini batch
docker-compose exec admob-platform python /app/code/z_main_mini_batch.py
```

### Xem logs
```bash
docker-compose exec admob-platform tail -f /app/logs/cron_mini_batch.log
docker-compose exec admob-platform tail -f /app/logs/last_3_day_job.log
```

### Database
```bash
# Xem tables
docker exec starrocks-fe mysql -h 127.0.0.1 -P 9030 -u root -e "USE admob_db; SHOW TABLES;"

# Query
docker exec starrocks-fe mysql -h 127.0.0.1 -P 9030 -u root -e "USE admob_db; SELECT COUNT(*) FROM admob_table;"
```

## Cron Jobs
- Mini batch: Mỗi 30 phút
- Last 10 days: 2h sáng mỗi ngày

## Troubleshooting
```bash
# Restart
docker-compose restart admob-platform

# Reset toàn bộ và xóa orphan containers
docker-compose down --remove-orphans -v
docker-compose up -d
```

## ❓ Giải thích các service

### starrocks-init (Service khởi tạo) — tùy chọn
- **Mục đích:** Thêm Backend node vào Frontend cluster (khi dùng compose tách FE/BE).
- **Trạng thái:** Exited (0) - Chạy xong và thoát (bình thường).
- **Repo chính (Amobear.Mediation.Tools):** Đã bỏ starrocks-init; StarRocks all-in-one, cấu hình qua mount `fe.conf`/`be.conf`.

Nếu compose của bạn vẫn có **starrocks-init**, nó thường: chờ FE/BE lên → `ALTER SYSTEM ADD BACKEND 'starrocks-be:9050'` → thoát. Sau đó `admob-platform` mới có thể tạo database và insert data.

### Làm sạch containers cũ
```bash
# Nếu thấy container orphan (ví dụ: amo-platform-db-init-1)
docker-compose down --remove-orphans
```