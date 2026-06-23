# Khuyến nghị cấu hình server – 24 CPU / 64 GB RAM / 2 TB SSD

Tài liệu này tính toán và khuyến nghị phân bổ CPU, RAM và lưu ý lưu trữ cho toàn bộ stack chạy trên **một server** với thông số: **24 CPU**, **64 GB RAM**, **2 TB SSD**.

## 1. Nguyên tắc phân bổ

- **RAM**: Dự trữ ~6 GB cho OS, kernel và process ngoài container (kể cả .NET API nếu chạy trên host). Phân bổ ~58 GB cho các container.
- **CPU**: Giới hạn từng service để tránh một service chiếm hết CPU; tổng limit có thể lớn hơn 24 (oversubscribe nhẹ) vì workload thường không đỉnh cùng lúc.
- **Disk**: 2 TB SSD đủ cho data + log; nên theo dõi dung lượng volume (Postgres, StarRocks, MinIO chiếm nhiều nhất).

## 2. Tổng quan phân bổ RAM

| Thành phần        | RAM (limit) | Ghi chú |
|-------------------|-------------|--------|
| OS + buffer       | ~6 GB       | Không cấu hình trong Docker |
| Postgres          | 6 GB        | shared_buffers 1GB, work_mem/maintenance_work_mem tăng |
| Redis             | 4 GB        | maxmemory 4g, cache cho API |
| RabbitMQ          | 2 GB        | Queue, management |
| MinIO             | 4 GB        | Metadata, cache |
| **StarRocks**     | **32 GB**   | FE heap 6G, BE 24G (analytics) |
| Superset          | 4 GB        | Gunicorn workers |
| **Tổng container**| **52 GB**  | Còn ~6 GB cho host (API, OS) |

## 3. Tổng quan phân bổ CPU

| Service   | CPU limit | Ghi chú |
|-----------|-----------|--------|
| Postgres  | 4         | OLTP, nhiều connection |
| Redis     | 2         | Đơn luồng, limit để tránh tranh chấp |
| RabbitMQ  | 2         | I/O, queue |
| MinIO     | 2         | I/O |
| StarRocks | 10        | FE + BE (query, scan, compaction) |
| Superset  | 2         | BI, query qua Postgres/StarRocks |
| **Tổng**  | **22**    | Còn 2 core cho system/API |

## 4. Khuyến nghị từng service

### 4.1 Postgres (6 GB, 4 CPU)
- **docker-compose**: `memory: 6G`, `cpus: 4`
- **Postgres**: `shared_buffers=1GB`, `effective_cache_size=4g`, `work_mem=32MB`, `maintenance_work_mem=512MB` (có thể đặt qua command hoặc custom.conf)

### 4.2 Redis (4 GB, 2 CPU)
- **docker-compose**: `memory: 4G`, `cpus: 2`
- **Redis**: `maxmemory 4gb`, `maxmemory-policy allkeys-lru` (đã có, chỉ tăng từ 2gb → 4gb)

### 4.3 RabbitMQ (2 GB, 2 CPU)
- **docker-compose**: `memory: 2G`, `cpus: 2`
- Cấu hình mặc định đủ.

### 4.4 MinIO (4 GB, 2 CPU)
- **docker-compose**: `memory: 4G`, `cpus: 2`
- Dùng cho raw JSON / data lake.

### 4.5 StarRocks (32 GB, 10 CPU)
- **docker-compose**: `memory: 32G`, `cpus: 10`
- **FE**: `JAVA_OPTS=-Xms6g -Xmx6g` hoặc `jvm_xmx = 6g` trong fe.conf
- **BE**: `mem_limit = 24g` trong be.conf (32G container − 6G FE − ~2G buffer)

### 4.6 Superset (4 GB, 2 CPU)
- **docker-compose**: `memory: 4G`, `cpus: 2`
- Đủ cho Gunicorn và kết nối tới Postgres/StarRocks.

## 5. Lưu trữ (2 TB SSD)

- **postgres_data**: Kích thước phụ thuộc số bảng và retention; nên monitor.
- **starrocks-be-storage**: Lớn nhất khi có nhiều bảng/batch load; có thể 100–500 GB+.
- **minio_data**: Raw JSON AdMob/AppLovin; tăng theo thời gian.
- **redis_data**: Nhỏ (RDB/AOF).
- **rabbitmq_data**: Trung bình.
- **superset-data**: Nhỏ.
- Khuyến nghị: cấu hình monitoring (disk usage) và retention/cleanup cho StarRocks và MinIO.

## 6. Nếu .NET API chạy trên cùng server (không trong Docker)

- Dự trữ thêm **4–6 GB RAM** và **2–4 CPU** cho API.
- Tổng container khi đó vẫn ~52 GB; phần còn lại (6 GB) dùng cho OS + API. Nếu API cần nhiều hơn, có thể giảm StarRocks xuống 28 GB (BE 20g, FE 6g) để giải chỗ cho API.

## 7. Checklist áp dụng

1. Cập nhật `docker-compose.yml`: thêm `deploy.resources` (memory, cpus) cho từng service theo bảng trên.
2. Cập nhật Postgres: command hoặc file config với `shared_buffers=1GB` (và các tham số khác nếu cần).
3. Cập nhật Redis: `maxmemory 4gb` trong command.
4. Cập nhật StarRocks: `JAVA_OPTS=-Xms6g -Xmx6g`, `be.conf` với `mem_limit = 24g`, `fe.conf` với `jvm_xmx = 6g`.
5. Restart stack: `docker compose down && docker compose up -d`.
6. Kiểm tra: `docker stats` để xem memory/CPU thực tế từng container.
