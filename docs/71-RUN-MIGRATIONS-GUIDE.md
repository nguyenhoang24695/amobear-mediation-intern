# Hướng dẫn script Migration (đếm assembly + DB, apply thiếu)

## Tổng quan

Script **80-run-migrations.ps1** trong thư mục `scripts/` dùng để:

1. **Đếm số migration trong assembly**: đếm file migration trong `backend/MediationPro.Infrastructure/Migrations` (loại trừ Snapshot, Designer, backup).
2. **Đếm số bản ghi trong DB**: truy vấn trực tiếp bảng `__EFMigrationsHistory` trên PostgreSQL (connection string lấy từ `backend/MediationPro.Api/appsettings.json`).
3. **Chạy migration còn thiếu**: nếu số bản ghi trong DB nhỏ hơn số migration trong assembly thì chạy `dotnet ef database update`.

## Yêu cầu

- PowerShell.
- .NET 8 SDK.
- Project **MediationPro.Tools** trong `backend/` (dùng để truy vấn `__EFMigrationsHistory`).
- Connection string **DefaultConnection** trong `backend/MediationPro.Api/appsettings.json` trỏ tới PostgreSQL (ví dụ Host=172.19.8.100).

## Cách chạy

Từ **thư mục gốc repo**:

```powershell
.\scripts\80-run-migrations.ps1
```

Script tự xác định đường dẫn `backend/` (repo root + `backend`).

## Output mẫu

```
========================================
 MEDIATION PRO - MIGRATION REPORT & RUN
========================================

[1] So ban ghi migration trong assembly (MediationPro.Infrastructure/Migrations): 17
    Cac file: 20260114110546_InitialCreate.cs, ...

[2] Connection string (appsettings.json): Host=172.19.8.100 (DefaultConnection)

[3] So ban ghi thuc te trong DB (bang __EFMigrationsHistory): 12
    Cac migration da apply: 20260114110546_InitialCreate, ...

[4] So migration chua apply (Pending): 5
    (Assembly: 17, DB: 12)

[5] Chay migration cho cac ban con thieu...
...
[OK] Da apply xong cac migration con thieu.

========================================
 HOAN TAT
========================================
```

## IDesignTimeDbContextFactory (kích hoạt migration khi chạy `dotnet ef`)

- Vị trí: `backend/MediationPro.Infrastructure/Data/DesignTimeDbContextFactory.cs`.
- Khi chạy `dotnet ef database update`, EF Core tools **ưu tiên** tạo DbContext qua factory thay vì chạy host. Factory đọc connection string từ `appsettings.json` của MediationPro.Api (tìm theo thư mục hiện tại hoặc `../MediationPro.Api`, …) và tạo `ApplicationDbContext` với Npgsql.
- Nhờ đó migration được **chạy trực tiếp** bởi tools (không cần host), tránh trường hợp host bị abort trước khi `Migrate()` trong Program.cs chạy — migration sẽ được áp dụng đúng.
- Cần chạy lệnh từ thư mục `backend/MediationPro.Api` (hoặc nơi có thể tìm thấy `appsettings.json` theo các đường dẫn trong factory).

## MediationPro.Tools

- Vị trí: `backend/MediationPro.Tools/`.
- Chức năng: đọc `appsettings.json` (path truyền qua tham số), kết nối PostgreSQL, chạy `SELECT "MigrationId" FROM "__EFMigrationsHistory"`, in ra dòng đầu `COUNT:<n>` và các dòng sau là từng `MigrationId`.
- Nếu bảng chưa tồn tại hoặc lỗi kết nối thì in `COUNT:0` (và ghi WARN ra stderr).

## Script 81: Chạy migration từ 20260122 đến Seed hangfire_job_schedules

Script **81-run-migrations-from-20260122-to-sync.ps1** dùng để áp dụng (hoặc áp dụng lại) các migration từ `20260122035526_RemoveOrganizationIdFromAppDailySummary` đến `20260202100000_SeedHangfireJobSchedules` (bao gồm seed bảng hangfire_job_schedules).

**Cách chạy (từ repo root):**

- Chỉ apply các migration còn thiếu lên tới SyncSnapshot:
  ```powershell
  .\scripts\81-run-migrations-from-20260122-to-sync.ps1
  ```

- Rollback DB về trạng thái trước 20260122, sau đó apply lại từ 20260122 đến SyncSnapshot (cần gõ `yes` để xác nhận):
  ```powershell
  .\scripts\81-run-migrations-from-20260122-to-sync.ps1 -RollbackAndReapply
  ```

Connection string lấy từ `backend/MediationPro.Api/appsettings.json` (DefaultConnection). Cần chạy từ thư mục gốc repo.

## Liên quan

- **20-EF-CORE-MIGRATION-GUIDE.md**: hướng dẫn EF Core migration nói chung.
- **66-MIGRATION-TROUBLESHOOTING.md**, **67-FIX-MIGRATION-NOT-APPLIED.md**: xử lý lỗi migration.
- Khi chạy `dotnet ef database update`, host có thể in "Host stopped (e.g. after EF migration or tooling)" — đây là hành vi bình thường, không phải lỗi.
