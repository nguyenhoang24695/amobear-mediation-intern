# Backup & Restore StarRocks

Backup database StarRocks (bronze, silver, gold) ra thư mục local để copy lên server và restore nhanh.

## Khôi phục sau khi mất data (StarRocks khởi tạo lại / volume mới)

Sau khi khởi tạo lại StarRocks (container/volume mới), toàn bộ data trong StarRocks sẽ mất. Khôi phục theo một trong hai hướng sau.

### Trường hợp 1: Bạn đã có bản backup (thư mục `backup/starrocks_YYYYMMDD_HHmm/`)

1. **Đảm bảo StarRocks đang chạy** (FE đã lên, port 9030/8030 mở):
   ```bash
   docker compose up -d starrocks
   ```
   Đợi vài chục giây cho FE sẵn sàng. Có thể chạy thêm `set-production.sql` (query_timeout):
   ```bash
   docker exec -i mediationpro-starrocks mysql -h 127.0.0.1 -P 9030 -u root < docker/starrocks/set-production.sql
   ```

2. **Restore từ thư mục backup** (từ thư mục gốc repo):

   **Windows (PowerShell):**
   ```powershell
   .\scripts\starrocks-restore.ps1 -BackupDir ".\backup\starrocks_YYYYMMDD_HHmm"
   ```
   Thay `starrocks_YYYYMMDD_HHmm` bằng tên thư mục backup thực tế (ví dụ `starrocks_20250202_1430`).

   **Linux / macOS:**
   ```bash
   ./scripts/starrocks-restore.sh backup/starrocks_YYYYMMDD_HHmm
   ```

3. Script sẽ:
   - Áp dụng `schema.sql` (tạo database bronze/silver/gold và các bảng).
   - Load từng file TSV trong `data/` vào bảng tương ứng qua Stream Load.

4. **Restore lên StarRocks chạy trên máy khác** (ví dụ server 192.168.1.10):
   ```powershell
   .\scripts\starrocks-restore.ps1 -BackupDir ".\backup\starrocks_20250202_1430" -StarRocksHost "192.168.1.10"
   ```

**Lưu ý:** Nếu bảng đã tồn tại (do init script tạo) và bạn chỉ muốn load data, có thể chạy với `-DataOnly` (PowerShell) hoặc tương đương trong script bash.

### Trường hợp 2: Không có bản backup

1. **Tạo lại schema (database + bảng):** Chạy các script init trong `docker/starrocks/` để tạo database và bảng (bronze, silver, gold). Ví dụ từ máy có Docker và repo:
   ```bash
   docker compose up -d starrocks
   # Đợi FE lên rồi chạy init (thay <host> bằng starrocks nếu chạy trong compose, hoặc localhost nếu từ host)
   docker exec -i mediationpro-starrocks mysql -h 127.0.0.1 -P 9030 -u root < docker/starrocks/init-bronze-admob.sql
   docker exec -i mediationpro-starrocks mysql -h 127.0.0.1 -P 9030 -u root < docker/starrocks/init-bronze-applovin.sql
   # (và các init khác nếu có: init-bronze-xmp.sql, v.v.)
   ```
   Cấu hình FE/BE trong repo chính dùng **mount trực tiếp** `fe.conf`/`be.conf` (không dùng starrocks-init). Schema bronze/silver/gold có thể do ứng dụng hoặc script riêng tạo.

2. **Đổ lại dữ liệu từ nguồn:**
   - **Raw data (MinIO):** Chạy job **MinIO Raw Restore** để đọc lại toàn bộ file raw (AdMob, XMP, AppLovin) từ MinIO và insert vào StarRocks. Job quét `raw/admob/performance`, `raw/applovin/revenue`, `raw/applovin/cohort`, `raw/xmp/report`; file `.gz` (và `.json`); sắp xếp theo **last modified tăng dần** (file cũ trước) rồi lần lượt load. Gọi qua API test: `POST /api/v1/jobs-test/minio-raw-restore` (khi Development hoặc bật `JobsTest:AllowRun`), hoặc đăng ký Hangfire recurring.
   - **API:** Chạy lại sync từ AdMob/AppLovin/XMP API để lấy data và ghi vào StarRocks (sẽ mất thời gian và phụ thuộc giới hạn API).

3. **Về sau:** Chạy backup định kỳ để lần sau có bản restore:
   ```powershell
   .\scripts\starrocks-backup.ps1
   ```
   Hoặc: `./scripts/starrocks-backup.sh` (Linux/macOS).

---

## Yêu cầu

- Docker (để chạy mysql client khi backup/restore qua container).
- Khi backup local: `docker-compose` đã start (service `starrocks` và network).
- Khi restore: `curl` có sẵn (Windows 10+ có sẵn `curl.exe`; Linux/macOS có sẵn `curl`).

## Script theo hệ điều hành

| Hệ điều hành | Backup | Restore |
|--------------|--------|---------|
| **Windows** (PowerShell) | `.\scripts\starrocks-backup.ps1` | `.\scripts\starrocks-restore.ps1 -BackupDir <path>` |
| **Linux / Ubuntu / macOS** (bash) | `./scripts/starrocks-backup.sh` | `./scripts/starrocks-restore.sh <backup_dir>` |

Trên Ubuntu/Linux **không** chạy file `.ps1` bằng bash (sẽ báo syntax error). Dùng file `.sh` hoặc cài PowerShell Core (`pwsh`) rồi chạy `pwsh ./scripts/starrocks-restore.ps1 ...`.

## Backup (chạy tại máy hiện tại)

**Ubuntu / Linux:**
```bash
chmod +x scripts/starrocks-backup.sh
./scripts/starrocks-backup.sh
# Hoặc chỉ định thư mục: ./scripts/starrocks-backup.sh /tmp/backup
```

**Windows (PowerShell):**
```powershell
cd scripts
.\starrocks-backup.ps1
```

- Mặc định kết nối tới StarRocks trong Docker qua service name `starrocks` (port 9030).
- Kết quả: thư mục `backup/starrocks_YYYYMMDD_HHmm/` gồm:
  - `schema.sql`: CREATE DATABASE, CREATE TABLE.
  - `data/*.tsv`: từng bảng export dạng TSV (tab-separated).

Backup ra thư mục khác:

```powershell
.\starrocks-backup.ps1 -OutputDir "D:\Backups"
```

Backup StarRocks chạy trên server (từ máy bạn):

```powershell
.\starrocks-backup.ps1 -StarRocksHost "192.168.1.10" -StarRocksPort 9030 -OutputDir "D:\Backups"
```

(Lúc này script không dùng docker network; container mysql kết nối trực tiếp tới IP server.)

## Restore (chạy trên server hoặc máy có StarRocks)

1. Copy cả thư mục backup lên server (ví dụ `backup/starrocks_20250202_1430/`).

2. Chạy restore:

**Ubuntu / Linux:**
```bash
chmod +x scripts/starrocks-restore.sh
./scripts/starrocks-restore.sh backup/starrocks_20250202_1430
# Restore lên server khác:
./scripts/starrocks-restore.sh backup/starrocks_20250202_1430 192.168.1.10
```

**Tăng tốc restore (bảng lớn vài triệu dòng):** script tự tách file TSV thành chunk và load song song. Có thể chỉnh qua biến môi trường:
- `CHUNK_ROWS=500000` — số dòng mỗi chunk (mặc định 500k).
- `PARALLEL_LOADS=4` — số Stream Load chạy đồng thời (mặc định 4).
- `CURL_TIMEOUT=7200` — timeout mỗi request (giây), 0 = không giới hạn.

Ví dụ: load nhanh hơn với chunk 1M dòng và 8 luồng:
```bash
CHUNK_ROWS=1000000 PARALLEL_LOADS=8 ./scripts/starrocks-restore.sh backup/starrocks_20250202_1430
```

**Windows (PowerShell):**
```powershell
cd scripts
.\starrocks-restore.ps1 -BackupDir "D:\path\to\starrocks_20250202_1430"
```

- Mặc định: `StarRocksHost = localhost`, port MySQL 9030, HTTP 8030 (Stream Load).
- Restore sẽ:
  - Áp dụng `schema.sql` (tạo database + bảng).
  - Load từng file trong `data/*.tsv` vào bảng tương ứng qua Stream Load.

Restore lên server khác (chỉ định host):

```powershell
.\starrocks-restore.ps1 -BackupDir ".\backup\starrocks_20250202_1430" -StarRocksHost "192.168.1.10"
```

Chỉ restore schema (không load data):

```powershell
.\starrocks-restore.ps1 -BackupDir ".\backup\starrocks_20250202_1430" -SchemaOnly
```

Chỉ load data (đã có schema sẵn):

```powershell
.\starrocks-restore.ps1 -BackupDir ".\backup\starrocks_20250202_1430" -DataOnly
```

Có mật khẩu root:

```powershell
.\starrocks-restore.ps1 -BackupDir ".\backup\starrocks_20250202_1430" -Password "your_password"
```

## Cấu trúc thư mục backup

```
backup/starrocks_YYYYMMDD_HHmm/
├── schema.sql
└── data/
    ├── bronze_applovin_revenue.tsv
    ├── bronze_applovin_cohort.tsv
    ├── bronze_admob_performance.tsv
    └── ...
```

Tên file data: `{database}_{table}.tsv`. Script restore map lại đúng database và table.

## Stream Load từ ứng dụng (IP ngoài server StarRocks)

Khi ứng dụng (MediationPro.Api) chạy trên **một máy khác** và gọi Stream Load tới StarRocks (ví dụ `172.19.8.100:8030`), nếu gặp lỗi (ví dụ **unknown table** dù bảng đã có, hoặc connection refused) trong khi **MySQL (port 9030) vẫn kết nối và INSERT bình thường**, thường do FE **chỉ lắng nghe HTTP (8030) trên localhost** và từ chối request từ IP ngoài.

### Cách xử lý trên server StarRocks

1. **Kiểm tra và sửa `fe.conf`** (thư mục cài StarRocks FE, ví dụ `/opt/starrocks/fe/conf/fe.conf`):
   - Tham số **`priority_networks`**: nếu đặt theo dải **127.0.0.1** (ví dụ `127.0.0.1/32`) thì FE chỉ bind vào localhost, HTTP 8030 không nhận kết nối từ máy khác.
   - Đổi thành **dải IP của server** (để FE lắng nghe trên interface đó), ví dụ:
     ```ini
     priority_networks = 172.19.8.0/24
     ```
     (thay đúng theo subnet của máy StarRocks, ví dụ `172.19.8.100` thì dùng `172.19.8.0/24`).
   - **Khởi động lại FE** sau khi sửa (tham số này là static).

2. **Firewall**: đảm bảo port **8030** (HTTP FE) được mở cho IP của máy chạy ứng dụng, ví dụ:
   ```bash
   # Ubuntu/Debian (ufw)
   sudo ufw allow from 172.19.8.0/24 to any port 8030
   sudo ufw reload
   ```

3. **Kiểm tra FE đã bind đúng** (trên máy StarRocks):
   ```bash
   curl -u root: http://127.0.0.1:8030/api/health
   curl -u root: http://172.19.8.100:8030/api/health
   ```
   Nếu chỉ `127.0.0.1` trả về 200 mà IP LAN không thì cần chỉnh `priority_networks` và restart FE như trên.

Sau khi FE lắng nghe trên IP LAN (ví dụ 172.19.8.100) và firewall cho phép 8030, Stream Load từ ứng dụng ở máy khác sẽ hoạt động.

## Lưu ý

- Stream Load dùng label duy nhất; chạy lại restore cùng bản backup sẽ append (trùng label có thể bị bỏ qua tùy cấu hình).
- Nếu bảng đã có dữ liệu và muốn “ghi đè”, cần xóa dữ liệu cũ (DELETE hoặc DROP bảng) trước khi restore, hoặc dùng schema-only rồi restore data.
- Trên server Linux có thể dùng `curl` tương tự; có thể viết thêm `starrocks-restore.sh` gọi `curl` và `mysql` nếu cần.
