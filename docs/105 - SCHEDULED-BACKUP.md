# Lịch backup hệ thống định kỳ

Tài liệu mô tả cơ chế **backup định kỳ** cho Mediation Pro: **hàng ngày incremental** và **cuối tuần full backup**, áp dụng cho **PostgreSQL** và **StarRocks**. Code và cấu hình ứng dụng đã nằm trên **GitHub** và triển khai qua **CI/CD**, nên **không cần backup code**.

---

## 1. Tổng quan

| Thành phần      | Hàng ngày (incremental) | Cuối tuần (full) | Ghi chú |
|-----------------|-------------------------|-------------------|---------|
| **PostgreSQL**  | pg_dump (full dump, RPO 1 ngày) | pg_dump full + nén, retention 4 tuần | Master data, Hangfire, config |
| **StarRocks**   | Export dữ liệu (script có sẵn)  | Full backup, retention 4 tuần        | Bronze/Silver/Gold |
| **Code / Config** | Không backup            | —                 | GitHub + CI/CD; config qua mount (103) |

- **Incremental (hàng ngày):** Chạy mỗi ngày, dung lượng và thời gian thường nhỏ hơn full; mục tiêu RPO ~24h.
- **Full (cuối tuần):** Bản đầy đủ, lưu lâu hơn (ví dụ 4 bản weekly), dùng khi cần restore toàn bộ.

### Đường dẫn trên server (mặc định)

| Thứ | Đường dẫn |
|-----|-----------|
| **Thư mục scripts** | Giống local, sync từ GitHub (vd. `/home/amobear/Amobear.Mediation.Tools/scripts`) |
| **Thư mục backup gốc** | `/home/amobear/Amobear.Mediation.Tools/backup` |

Cấu trúc backup:

- `backup/postgres/daily/` — Postgres daily (retention 7 ngày)
- `backup/postgres/weekly/` — Postgres full (retention 4 bản)
- `backup/starrocks/daily/` — StarRocks daily (retention 7 ngày)
- `backup/starrocks/weekly/` — StarRocks full (retention 4 bản)
- `backup/config/` — Config (tùy chọn, retention 4 bản)

Script trong repo (thư mục **scripts/**):

| Script | Mô tả | Cron đề xuất |
|--------|--------|----------------|
| `postgres-backup-daily.sh` | pg_dump từng DB, 7 ngày | `0 2 * * *` (02:00 hàng ngày) |
| `postgres-backup-weekly.sh` | pg_dumpall + gzip, 4 bản | `0 1 * * 0` (01:00 Chủ nhật) |
| `starrocks-backup-daily.sh` | Gọi starrocks-backup.sh, 7 ngày | `0 4 * * *` (04:00 hàng ngày) |
| `starrocks-backup-weekly.sh` | Gọi starrocks-backup.sh, 4 bản | `0 3 * * 0` (03:00 Chủ nhật) |
| `config-backup-weekly.sh` | tar config/, 4 bản | `0 1 * * 0` (tùy chọn) |

Override đường dẫn bằng env: `BACKUP_ROOT`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `POSTGRES_DATABASES`, `STARROCKS_HOST`, `MYSQL_PORT`, `REPO_ROOT` (xem đầu mỗi file script).

**Cron mẫu (server, timezone Asia/Ho_Chi_Minh):**

```cron
# Backup Postgres daily 02:00
0 2 * * * /home/amobear/Amobear.Mediation.Tools/scripts/postgres-backup-daily.sh
# Backup Postgres weekly Chủ nhật 01:00
0 1 * * 0 /home/amobear/Amobear.Mediation.Tools/scripts/postgres-backup-weekly.sh
# Backup StarRocks daily 04:00
0 4 * * * /home/amobear/Amobear.Mediation.Tools/scripts/starrocks-backup-daily.sh
# Backup StarRocks weekly Chủ nhật 03:00
0 3 * * 0 /home/amobear/Amobear.Mediation.Tools/scripts/starrocks-backup-weekly.sh
# (Tùy chọn) Backup config Chủ nhật 01:00
0 1 * * 0 /home/amobear/Amobear.Mediation.Tools/scripts/config-backup-weekly.sh
```

Chạy từ thư mục repo hoặc đặt đủ quyền: `chmod +x scripts/postgres-backup-daily.sh ...`. Postgres cần `pg_dump`/`pg_dumpall` và `PGPASSWORD` — hoặc **chỉ cần Docker** (xem mục 1.1).

---

## 1.1. Cài đặt backup trên Ubuntu (chỉ cần Docker)

Trên server chỉ chạy ứng dụng bằng **Docker** (docker-compose), không cần cài `postgresql-client` hay `mysql-client`. Các script backup đã hỗ trợ **chạy lệnh qua Docker**:

| Thành phần | Cách chạy | Ghi chú |
|------------|-----------|---------|
| **PostgreSQL** | `postgres-backup-daily.sh` / `postgres-backup-weekly.sh` | Nếu không có `pg_dump`/`pg_dumpall`, script tự gọi `docker run --rm postgres:15-alpine pg_dump(...)` (hoặc `pg_dumpall`) với cùng network của container Postgres, mount thư mục backup vào container. |
| **StarRocks** | `starrocks-backup.sh` / `starrocks-backup-daily.sh` | Dùng sẵn `docker run --rm mysql:8 mysql ...` để kết nối FE (port 9030), không cần cài MySQL client. |

**Yêu cầu:**

1. **Docker** đã cài và user chạy backup có quyền `docker` (hoặc chạy bằng root).
2. Container Postgres (vd. `mediationpro-postgres`) và StarRocks đang chạy khi chạy backup (hoặc đảm bảo đúng network nếu dùng tên service).
3. **Biến môi trường** (đặt trong cron hoặc file env):
   - `PGPASSWORD` — mật khẩu user Postgres (vd. `mediationpro`).
   - Tùy chọn: `BACKUP_ROOT`, `PGHOST` (khi dùng Docker fallback, script tự đổi `localhost` → `postgres`), `POSTGRES_IMAGE` (mặc định `postgres:15-alpine`), `DOCKER_NET` (nếu auto-detect không đúng).

**Cài đặt nhanh (Ubuntu):**

```bash
# 1. Clone/pull repo (đã có code)
cd /home/amobear/Amobear.Mediation.Tools

# 2. Chỉ cần Docker — không cài postgresql-client hay mysql-client
# 3. Cho script quyền thực thi
chmod +x scripts/postgres-backup-daily.sh scripts/postgres-backup-weekly.sh \
         scripts/starrocks-backup.sh scripts/starrocks-backup-daily.sh scripts/starrocks-backup-weekly.sh

# 4. Tạo thư mục backup
mkdir -p backup/postgres/daily backup/postgres/weekly backup/starrocks/daily backup/starrocks/weekly

# 5. Chạy thử (cần export PGPASSWORD trước)
export PGPASSWORD='your_postgres_password'
./scripts/postgres-backup-daily.sh
./scripts/starrocks-backup-daily.sh
```

**Cron (chỉ Docker, không cài pg/mysql):**

```cron
# Backup Postgres daily 02:00 (script tự dùng docker run postgres nếu không có pg_dump)
0 2 * * * PGPASSWORD='xxx' /home/amobear/Amobear.Mediation.Tools/scripts/postgres-backup-daily.sh
# Backup Postgres weekly Chủ nhật 01:00
0 1 * * 0 PGPASSWORD='xxx' /home/amobear/Amobear.Mediation.Tools/scripts/postgres-backup-weekly.sh
# Backup StarRocks daily 04:00 (dùng docker run mysql:8)
0 4 * * * /home/amobear/Amobear.Mediation.Tools/scripts/starrocks-backup-daily.sh
# Backup StarRocks weekly Chủ nhật 03:00
0 3 * * 0 /home/amobear/Amobear.Mediation.Tools/scripts/starrocks-backup-weekly.sh
```

Lưu ý: Nên đặt `PGPASSWORD` trong file bảo mật (vd. `~/.pgbackup_env`) và trong cron dùng `source ~/.pgbackup_env` hoặc cron env từ file (tùy cách bạn bảo mật).

---

## 2. PostgreSQL

### 2.1 Công cụ

- **pg_dump** (full dump từng database) hoặc **pg_dumpall** (toàn bộ cluster).
- Format: **custom** (`-Fc`) để nén và restore linh hoạt, hoặc **plain SQL** (`-Fp`) nếu cần đọc được.

### 2.2 Backup hàng ngày (incremental)

- **Mục đích:** Có bản backup mỗi ngày, RPO 1 ngày.
- **Cách làm:** Chạy **pg_dump** full (mỗi ngày một bản). Gọi là "incremental" theo lịch (chạy hàng ngày), không phải block-level incremental.
- **Lịch đề xuất:** 02:00 hoặc 03:00 (sau các job sync đêm).
- **Retention:** Giữ 7 bản daily (7 ngày).

**Script:** `scripts/postgres-backup-daily.sh` (dùng `BACKUP_ROOT`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `POSTGRES_DATABASES`; mặc định backup `mediationpro` và `mediationpro_hangfire`). Cron: xem bảng và mẫu cron ở mục 1.

### 2.3 Backup full (cuối tuần)

- **Mục đích:** Bản full để restore toàn bộ, lưu lâu hơn.
- **Lịch:** Chủ nhật 01:00 (hoặc thứ Bảy đêm).
- **Retention:** 4 bản weekly.

**Script:** `scripts/postgres-backup-weekly.sh`. Cron: xem mục 1.

### 2.4 Restore PostgreSQL

- **Daily:** `pg_restore -d mediationpro -h localhost -U mediationpro mediationpro_YYYYMMDD.dump`
- **Weekly (full):** `gunzip -c full_YYYYMMDD.dump.gz | psql -h localhost -U mediationpro -d postgres` (sau khi tạo DB nếu dùng pg_dumpall).

---

## 3. StarRocks

### 3.1 Công cụ

- Script có sẵn trong repo: **scripts/starrocks-backup.sh** (Linux), **scripts/starrocks-backup.ps1** (Windows/PowerShell).
- Chi tiết restore: **99e - STARROCKS-BACKUP-RESTORE.md**.

### 3.2 Backup hàng ngày (incremental)

- **Mục đích:** Có bản export StarRocks mỗi ngày (schema + data).
- **Cách làm:** Gọi script backup (export toàn bộ bảng ra TSV). Về dung lượng có thể lớn; nếu cần "nhẹ hơn" có thể chỉ backup một số bảng quan trọng hoặc partition mới (tùy chỉnh script).
- **Lịch đề xuất:** 04:00 (sau Postgres daily, tránh trùng job sync).
- **Retention:** 7 bản daily.

**Script:** `scripts/starrocks-backup-daily.sh` (gọi `starrocks-backup.sh`, đổi tên thành `starrocks_daily_YYYYMMDD`, retention 7). Cron: xem mục 1.

### 3.3 Backup full (cuối tuần)

- **Mục đích:** Bản full StarRocks, lưu 4 tuần.
- **Lịch:** Chủ nhật 03:00.
- **Cùng script** backup, đưa vào thư mục `weekly/` và retention 4 bản.

**Script:** `scripts/starrocks-backup-weekly.sh`. Cron: xem mục 1.

### 3.4 Restore StarRocks

- Theo **99e - STARROCKS-BACKUP-RESTORE.md**: dùng script restore với thư mục backup tương ứng (daily hoặc weekly).

---

## 4. Code và cấu hình ứng dụng

- **Code:** Đã lưu trên **GitHub**; triển khai qua **CI/CD** (build image, deploy). Không cần backup code trên server.
- **Config (appsettings, env):** Được mount từ host (xem **103 - DOCKER-DEPLOYMENT.md**). Nên backup thư mục **config/** trên server (ví dụ copy vào cùng thư mục backup Postgres weekly hoặc script riêng 1 lần/tuần).

**Script:** `scripts/config-backup-weekly.sh` (tar `config/`, lưu vào `backup/config/`, retention 4). Cron: xem mục 1 (tùy chọn).

---

## 5. Lịch tổng hợp đề xuất

| Thời gian  | Công việc              | Thành phần  |
|------------|-------------------------|-------------|
| 01:00 CN   | Full backup             | PostgreSQL (weekly) |
| 02:00 hàng ngày | Daily backup        | PostgreSQL |
| 03:00 CN   | Full backup             | StarRocks (weekly) |
| 04:00 hàng ngày | Daily backup        | StarRocks |

(Timezone: theo server, ví dụ Asia/Ho_Chi_Minh.)

---

## 6. Lưu trữ backup

- **Vị trí:** Thư mục local (ví dụ `/opt/backup/postgres`, `/opt/backup/starrocks`) hoặc **NAS/SAN** (mount vào server).
- **Khuyến nghị:** Copy weekly (và có thể daily) sang storage khác (NAS, object storage) để tránh mất khi hỏng ổ server.
- **Bảo mật:** Hạn chế quyền đọc (chỉ user chạy backup và admin); không commit backup lên Git.

---

## 7. Checklist vận hành

- [ ] Đã cấu hình cron (hoặc systemd timer) cho Postgres daily + weekly.
- [ ] Đã cấu hình cron cho StarRocks daily + weekly.
- [ ] Đã kiểm tra chạy thử script backup và restore (Postgres + StarRocks) theo 99e.
- [ ] Đã đặt retention (7 daily, 4 weekly) và dọn bản cũ.
- [ ] (Tùy chọn) Copy backup lên NAS/object storage định kỳ.
- [ ] (Tùy chọn) Backup thư mục config/ 1 lần/tuần.

---

**Tài liệu liên quan:** **99e - STARROCKS-BACKUP-RESTORE.md** (restore StarRocks), **103 - DOCKER-DEPLOYMENT.md** (triển khai Docker và config).
