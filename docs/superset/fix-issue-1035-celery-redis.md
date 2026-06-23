# Fix Superset Issue 1035 — SQL Lab "Failed to start remote query on a worker"

## Tổng quan

Superset 4.x (`apache/superset:latest`) mặc định dispatch **mọi query SQL Lab** qua **Celery**. Khi chưa cấu hình Celery worker → lỗi:

```
DB engine Error
Failed to start remote query on a worker.
Issue 1035 - Failed to start remote query on a worker.
```

### Giải pháp

Cấu hình Celery worker chạy trong cùng container Superset, dùng **Redis** (đã có sẵn trong stack) làm broker và results backend.

### Các file cần sửa (4 file)

| # | File | Thay đổi |
|---|------|----------|
| 1 | `docker/superset/superset_config.py` | Cấu hình Celery + Redis results backend |
| 2 | `docker/superset/docker-init.sh` | Khởi động Celery worker background |
| 3 | `docker/superset/Dockerfile` | Strip CRLF cho `.py`, patch bug float/Decimal |
| 4 | `docker-compose.yml` | Thêm `depends_on: redis` cho service superset |

---

## Kiến trúc sau khi fix

```
┌─────────────────────────────────────────────────────┐
│  Container: mediationpro-superset                   │
│                                                     │
│  ┌──────────────┐      ┌──────────────────┐         │
│  │  Web Server   │      │  Celery Worker   │         │
│  │  (Gunicorn)   │      │  (prefork x2)    │         │
│  │  port 8088    │      │  background      │         │
│  └──────┬───────┘      └────────┬─────────┘         │
│         │                       │                    │
└─────────┼───────────────────────┼────────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────┐
│  Container: mediationpro-redis              │
│                                             │
│  db=0  Celery broker (message queue)        │
│  db=1  Celery result backend (task results) │
│  db=2  RESULTS_BACKEND (SQL query results)  │
└─────────────────────────────────────────────┘
```

---

## Chi tiết thay đổi từng file

### File 1: `docker/superset/superset_config.py`

Nội dung **hoàn chỉnh** (thay thế toàn bộ file cũ):

```python
import os
from flask import g
from flask_caching.backends.rediscache import RedisCache

_uri = os.environ.get("SUPERSET_DATABASE_URI")
if not _uri:
    _dialect = os.environ.get("DATABASE_DIALECT", "postgresql")
    _user = os.environ.get("DATABASE_USER", "superset")
    _password = os.environ.get("DATABASE_PASSWORD", "")
    _host = os.environ.get("DATABASE_HOST", "postgres")
    _port = os.environ.get("DATABASE_PORT", "5432")
    _db = os.environ.get("DATABASE_DB", "superset")
    if _dialect == "postgresql":
        _dialect = "postgresql+psycopg2"
    _uri = f"{_dialect}://{_user}:{_password}@{_host}:{_port}/{_db}"

SQLALCHEMY_DATABASE_URI = _uri
SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "CHANGE_ME_INSECURE")
SUPERSET_HOME = os.environ.get("SUPERSET_HOME", "/var/lib/superset")

# SQL Lab results — dùng Redis db=2 để Celery worker và web server chia sẻ kết quả
RESULTS_BACKEND = RedisCache(host="redis", port=6379, db=2, default_timeout=86400)

FEATURE_FLAGS = {
    "ENABLE_TEMPLATE_PROCESSING": True,
    "SQL_LAB_TEMPLATE_PROCESSING_ENABLED": True,
    "DASHBOARD_RBAC": True,
    "SQLLAB_BACKEND_PERSISTENCE": False,
    "GLOBAL_ASYNC_QUERIES": False,
    "SCHEDULED_QUERIES": False,
    "ALERT_REPORTS": False,
}

JINJA_CONTEXT_ADDONS = {
    "get_username": lambda: g.user.username if g.user else "guest",
    "get_user_id": lambda: g.user.id if g.user else None,
}

FAB_ADD_SECURITY_API = True


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


CELERY_CONFIG = CeleryConfig

SQLLAB_TIMEOUT = 300
SUPERSET_WEBSERVER_TIMEOUT = 300
SQL_MAX_ROW = 100000
DISPLAY_MAX_ROW = 10000
```

> [!IMPORTANT]
> **Không dùng `task_always_eager = True`** — sẽ gây lỗi `Instance <Query> is not bound to a Session` (SQLAlchemy session detach).

> [!IMPORTANT]
> **Không dùng `FileSystemCache`** cho `RESULTS_BACKEND` — Celery worker và web server là 2 process riêng biệt, FileSystemCache không chia sẻ kết quả giữa chúng.

---

### File 2: `docker/superset/docker-init.sh`

Thêm khởi động **Celery worker trong background** trước khi start webserver.

Nội dung **hoàn chỉnh**:

```bash
#!/usr/bin/env bash
set -eu

echo "[superset] Waiting for metadata DB..."
python - <<'PY'
import os, time
import sqlalchemy as sa

uri = os.environ.get("SUPERSET_DATABASE_URI")
if not uri:
    raise SystemExit("SUPERSET_DATABASE_URI is required")

engine = sa.create_engine(uri, pool_pre_ping=True)
for i in range(60):
    try:
        with engine.connect() as c:
            c.execute(sa.text("SELECT 1"))
        print("[superset] Metadata DB is ready")
        break
    except Exception as e:
        time.sleep(1)
else:
    raise SystemExit("[superset] Metadata DB not ready after 60s")
PY

echo "[superset] Migrating and initializing..."
superset db upgrade

if [[ "${SUPERSET_LOAD_EXAMPLES:-no}" == "yes" ]]; then
  superset load_examples
fi

superset init

if [[ -n "${SUPERSET_ADMIN_USERNAME:-}" ]]; then
  echo "[superset] Ensuring admin user exists..."
  superset fab create-admin \
    --username "${SUPERSET_ADMIN_USERNAME}" \
    --firstname "${SUPERSET_ADMIN_FIRSTNAME:-Admin}" \
    --lastname "${SUPERSET_ADMIN_LASTNAME:-User}" \
    --email "${SUPERSET_ADMIN_EMAIL:-admin@example.com}" \
    --password "${SUPERSET_ADMIN_PASSWORD:-admin}" || true
fi

# === Celery worker (Fix Issue 1035) ===
echo "[superset] Starting Celery worker in background..."
celery --app=superset.tasks.celery_app:app worker \
  --loglevel=INFO \
  --pool=prefork \
  --concurrency=2 \
  &
CELERY_PID=$!
echo "[superset] Celery worker started (PID: $CELERY_PID)"

echo "[superset] Starting webserver..."
exec /usr/bin/run-server.sh
```

---

### File 3: `docker/superset/Dockerfile`

Thêm 2 lệnh `RUN`:
1. `sed` strip CRLF cho `superset_config.py` (tránh IndentationError khi build từ Windows)
2. `sed` patch bug `float/Decimal` trong `results.py`

Thay đổi (diff):

```diff
 COPY superset_config.py /app/superset_config.py
-RUN chown superset:superset /app/superset_config.py
+RUN sed -i 's/\r$//' /app/superset_config.py && chown superset:superset /app/superset_config.py
 ENV SUPERSET_CONFIG_PATH=/app/superset_config.py

+# Fix bug: float/Decimal type mismatch in SQL Lab results
+RUN sed -i 's/now_as_float() - (/now_as_float() - float(/' \
+    /app/superset/commands/sql_lab/results.py || true
+
 COPY docker-init.sh /app/docker-init.sh
```

---

### File 4: `docker-compose.yml`

Thêm `redis` vào `depends_on` của service `superset`:

```diff
     depends_on:
       postgres:
         condition: service_healthy
       postgres-init:
         condition: service_completed_successfully
+      redis:
+        condition: service_healthy
```

---

## Hướng dẫn Build & Deploy

### Bước 1: Cập nhật code trên server

```bash
cd /home/amobear/Amobear.Mediation.Tools
git pull
```

Hoặc nếu sửa tay trên server, dùng `cat << 'EOF'` để tạo file (tránh lỗi tab/CRLF):

```bash
cat > docker/superset/superset_config.py << 'PYEOF'
# ... paste nội dung file 1 ở trên ...
PYEOF

cat > docker/superset/docker-init.sh << 'SHEOF'
# ... paste nội dung file 2 ở trên ...
SHEOF
```

### Bước 2: Verify Python syntax

```bash
python3 -c "compile(open('docker/superset/superset_config.py').read(), 'test', 'exec'); print('OK - no syntax errors')"
```

### Bước 3: Build image (bắt buộc `--no-cache`)

```bash
docker compose build --no-cache superset
```

### Bước 4: Restart service

```bash
docker compose up -d superset
```

### Bước 5: Kiểm tra

```bash
# Xem logs (chờ đến khi thấy "Starting webserver...")
docker logs -f mediationpro-superset --tail 50

# Kiểm tra Celery worker đang chạy
docker exec mediationpro-superset ps aux | grep celery

# Kiểm tra health
curl http://localhost:8088/health

# Test SQL Lab: mở browser → SQL Lab → chạy "SELECT 1"
```

### Bước 6: Verify patch Decimal/float đã apply

```bash
docker exec mediationpro-superset grep "now_as_float" /app/superset/commands/sql_lab/results.py
# Kết quả phải chứa: now_as_float() - float(
```

---

## Troubleshooting

### Lỗi `IndentationError: unexpected indent`

**Nguyên nhân**: File `.py` có CRLF line endings (từ Windows) hoặc lẫn tab/space.

**Fix**: Dùng `cat << 'PYEOF'` trên server để tạo lại file, hoặc đảm bảo Dockerfile có:
```dockerfile
RUN sed -i 's/\r$//' /app/superset_config.py
```

### Lỗi `NameError: name 'CeleryConfig' is not defined`

**Nguyên nhân**: Dòng `CELERY_CONFIG = CeleryConfig` bị thụt vào trong class (indentation sai).

**Fix**: Đảm bảo `CELERY_CONFIG = CeleryConfig` nằm ở **module level** (không indent).

### Lỗi `Instance <Query> is not bound to a Session`

**Nguyên nhân**: Dùng `task_always_eager = True` trong CeleryConfig.

**Fix**: **Bỏ** `task_always_eager`, dùng Celery worker thật.

### Lỗi `Data could not be retrieved from the results backend`

**Nguyên nhân**: `RESULTS_BACKEND` dùng `FileSystemCache` — Celery worker (process A) ghi cache, web server (process B) không thể đọc.

**Fix**: Dùng `RedisCache` thay vì `FileSystemCache`:
```python
from flask_caching.backends.rediscache import RedisCache
RESULTS_BACKEND = RedisCache(host="redis", port=6379, db=2, default_timeout=86400)
```

---

## Sơ đồ Redis DB Usage

| Redis DB | Sử dụng | Cấu hình |
|----------|---------|----------|
| `db=0` | Celery broker (message queue) | `CeleryConfig.broker_url` |
| `db=1` | Celery result backend (task return values) | `CeleryConfig.result_backend` |
| `db=2` | Superset RESULTS_BACKEND (SQL query results) | `RESULTS_BACKEND = RedisCache(...)` |
| `db=3+` | Trống — dành cho tương lai | — |
