# Phân Tích Lỗi Superset: Issue 1035 — Failed to start remote query on a worker

## 🔍 Tóm tắt vấn đề

Khi chạy query qua **SQL Lab** trên Superset (kết nối đến StarRocks), bạn nhận được lỗi:

```
DB engine Error
Failed to start remote query on a worker.
Issue 1035 - Failed to start remote query on a worker.
```

---

## 📐 Kiến trúc hiện tại (từ các file đính kèm)

| Component | Chi tiết |
|-----------|----------|
| **Superset** | Container `mediationpro-superset:latest`, chạy standalone (1 container duy nhất) |
| **Metadata DB** | PostgreSQL 15 (container `mediationpro-postgres`) |
| **Data source** | StarRocks allin1 (container `mediationpro-starrocks`, port 9030) |
| **RESULTS_BACKEND** | `FileSystemCache` lưu tại `/var/lib/superset/sqllab` |
| **Celery worker** | ❌ **KHÔNG CÓ** — không có Celery worker, broker (Redis/RabbitMQ cho Superset), hay Celery Beat |
| **Async query** | Không cấu hình |

---

## 🎯 Nguyên nhân gốc (Root Cause)

> [!CAUTION]
> **Superset đang cố gửi query tới Celery worker (async mode) nhưng KHÔNG có Celery worker nào đang chạy.**

### Giải thích chi tiết:

Superset SQL Lab có **2 mode** chạy query:

1. **Synchronous mode** (mặc định cũ): Query chạy trực tiếp trong web process → trả kết quả ngay.
2. **Asynchronous mode** (mặc định mới trên các phiên bản Superset gần đây): Query được gửi đến **Celery worker** xử lý nền → web process chỉ poll kết quả.

Từ Superset **4.x+** (đặc biệt `apache/superset:latest`), SQL Lab **mặc định bật async queries**. Điều này yêu cầu:
- ✅ Một **Celery broker** (Redis hoặc RabbitMQ)
- ✅ Một **Celery worker** chạy song song
- ✅ Cấu hình `RESULTS_BACKEND` (bạn đã có)

Trong setup hiện tại:
- ❌ Không có `CELERY_CONFIG` trong `superset_config.py`
- ❌ Không có container Celery worker
- ❌ Superset cố dispatch query qua Celery → không ai nhận → **Issue 1035**

---

## 🛠️ Các cách khắc phục

### Cách 1: Tắt Async Query (⭐ Đơn giản nhất — Khuyến nghị)

Thêm cấu hình vào `superset_config.py` để force SQL Lab chạy **synchronous**:

#### Sửa file [superset_config.py](file:///d:/Data/Antigravity/Amobear/Mediation/Amobear.Mediation.Tools/docker/superset/superset_config.py)

Thêm các dòng sau vào cuối file:

```python
# === Fix Issue 1035: Tắt async query (không cần Celery) ===
# Force SQL Lab chạy synchronous — query xử lý trực tiếp trong web process.
# Phù hợp khi chạy Superset standalone (1 container, không deploy Celery worker).

# Tăng timeout cho SQL Lab queries (mặc định 30s — StarRocks có thể cần lâu hơn)
SQLLAB_TIMEOUT = 300          # 5 phút
SUPERSET_WEBSERVER_TIMEOUT = 300

# Giới hạn kết quả trả về (tránh OOM khi query lớn)
SQL_MAX_ROW = 100000
DISPLAY_MAX_ROW = 10000
```

#### Rebuild và restart container:

```bash
cd /home/amobear/Amobear.Mediation.Tools
docker compose build superset
docker compose up -d superset
```

> [!IMPORTANT]
> Cách này hoạt động tốt khi số lượng user đồng thời ít (< 10) và query trung bình < 5 phút. Nếu hệ thống scale lên, nên chuyển sang Cách 2.

---

### Cách 2: Bật Celery Worker (Scalable — cho Production lớn)

Nếu bạn muốn async queries hoạt động (tránh timeout web, hỗ trợ nhiều user query đồng thời), cần thêm:

#### 2a. Thêm Celery config vào `superset_config.py`:

```python
# === Celery Configuration cho Async SQL Lab ===
from celery.schedules import crontab

class CeleryConfig:
    broker_url = "redis://redis:6379/0"
    result_backend = "redis://redis:6379/1"
    worker_prefetch_multiplier = 1
    task_acks_late = True
    task_annotations = {
        "sql_lab.get_sql_results": {
            "rate_limit": "100/s",
        },
    }
    beat_schedule = {
        "reports.scheduler": {
            "task": "reports.scheduler",
            "schedule": crontab(minute="*", hour="*"),
        },
    }

CELERY_CONFIG = CeleryConfig
```

#### 2b. Thêm container Celery worker vào `docker-compose.yml`:

```yaml
  superset-worker:
    image: mediationpro-superset:latest
    container_name: mediationpro-superset-worker
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          memory: 256M
    environment:
      SUPERSET_DATABASE_URI: "postgresql+psycopg2://superset:superset123@postgres:5432/superset"
      SUPERSET_SECRET_KEY: "your-secret-key-change-this-in-production"
      SUPERSET_HOME: "/var/lib/superset"
    volumes:
      - superset-data:/var/lib/superset
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      celery --app=superset.tasks.celery_app:app worker
      --loglevel=INFO
      --pool=prefork
      --concurrency=4
    restart: always
    networks:
      - mediationpro-network
```

> [!NOTE]
> Bạn đã có Redis container (`mediationpro-redis`) trong stack, nên có thể dùng luôn làm Celery broker mà không cần tạo thêm service.

---

### Cách 3: Kiểm tra và chỉ định phiên bản Superset cụ thể

`apache/superset:latest` có thể thay đổi behavior giữa các version. Để ổn định:

```dockerfile
# Thay vì:
FROM apache/superset:latest
# Dùng phiên bản cụ thể:
FROM apache/superset:4.1.1
```

---

## 📋 Quy trình khắc phục khuyến nghị (Step-by-step)

### Bước 1: Áp dụng Cách 1 (nhanh nhất)

```bash
# 1. SSH vào server
ssh root@your-server

# 2. Di chuyển đến project
cd /home/amobear/Amobear.Mediation.Tools

# 3. Sửa superset_config.py (thêm config tắt async)
nano docker/superset/superset_config.py

# 4. Rebuild image
docker compose build superset

# 5. Restart container
docker compose up -d superset

# 6. Kiểm tra logs
docker logs -f mediationpro-superset --tail 50

# 7. Test lại SQL Lab
# Mở http://localhost:8088 → SQL Lab → chạy query đến StarRocks
```

### Bước 2: Verify

```bash
# Kiểm tra container healthy
docker ps | grep superset

# Kiểm tra health endpoint
curl http://localhost:8088/health

# Test query đơn giản trong SQL Lab
# SELECT 1;
```

---

## 🔎 Debug bổ sung (nếu Cách 1 vẫn không fix)

Nếu sau khi áp dụng Cách 1 vẫn lỗi, kiểm tra thêm:

### 1. Xem log chi tiết Superset:

```bash
docker logs mediationpro-superset --tail 200 2>&1 | grep -i "error\|fail\|celery\|worker"
```

### 2. Kiểm tra kết nối StarRocks từ trong container Superset:

```bash
docker exec -it mediationpro-superset bash
# Trong container:
python -c "
from sqlalchemy import create_engine
e = create_engine('starrocks://root:@starrocks:9030/bronze')
with e.connect() as c:
    print(c.execute('SELECT 1').fetchone())
"
```

### 3. Kiểm tra RESULTS_BACKEND có writable không:

```bash
docker exec -it mediationpro-superset bash -c "ls -la /var/lib/superset/sqllab"
```

### 4. Kiểm tra version Superset đang chạy:

```bash
docker exec mediationpro-superset superset version
```

---

## 📝 Tổng kết

| Cách | Độ phức tạp | Phù hợp khi | Ưu điểm | Nhược điểm |
|------|-------------|-------------|----------|------------|
| **Cách 1**: Tắt async | ⭐ Thấp | Team nhỏ, ít query đồng thời | Nhanh, không thêm service | Query lớn có thể timeout web |
| **Cách 2**: Thêm Celery | ⭐⭐⭐ Cao | Production scale | Async, không block web | Cần thêm container, cấu hình phức tạp |
| **Cách 3**: Pin version | ⭐ Thấp | Phòng ngừa | Ổn định, tránh breaking change | Không tự update |

> [!TIP]
> **Khuyến nghị**: Áp dụng **Cách 1 + Cách 3** ngay. Nếu sau này cần scale, chuyển sang Cách 2.


