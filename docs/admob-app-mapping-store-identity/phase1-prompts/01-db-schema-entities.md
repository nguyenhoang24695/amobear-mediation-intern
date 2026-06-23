# Prompt 01 — DB Schema + Entity + DTO (nền tảng)

> Đọc trước: `docs/admob-app-mapping-store-identity/README.md` và `phase1-prompts/00-INDEX.md` (mục "Bối cảnh dùng chung" + "Nguyên tắc bất biến").

## Mục tiêu
Mở rộng hạ tầng binding hiện có để chứa thông tin đặc thù AdMob, **không thay đổi hành vi runtime** (chỉ schema + model + DTO). Sau prompt này backend build pass và migration up/down chạy được.

## Bối cảnh
- AdMob app đã nằm trong bảng `apps`; nhiều AdMob app (khác account) có thể cùng map về 1 `store_app_identities`. Vì `StoreAppIdentity.AppRowId` là 1:1 nên phía **binding** phải mang `app_row_id` + `admob_account_id` riêng.
- Bảng `paid_media_app_bindings` đã tồn tại (tạo ở migration `20260521100000_AddCommonPaidMediaAppMappings.cs`, cột dòng 42-66). Unique index `(organization_id, network, external_app_id)` đã có.

## Phạm vi
### IN
1. **Migration mới** (raw SQL, đặt tên `<timestamp>_AddAdmobColumnsToPaidMediaAppBindings.cs`, theo mẫu `20260521100000`):
   ```sql
   ALTER TABLE paid_media_app_bindings
       ADD COLUMN IF NOT EXISTS admob_account_id integer NULL,
       ADD COLUMN IF NOT EXISTS app_row_id integer NULL;

   -- store_app_identity_id chuyển sang nullable để hỗ trợ binding admob Unmapped
   ALTER TABLE paid_media_app_bindings
       ALTER COLUMN store_app_identity_id DROP NOT NULL;

   -- FK (bọc trong DO $$ ... $$ IF NOT EXISTS nếu cần idempotent)
   ALTER TABLE paid_media_app_bindings
       ADD CONSTRAINT fk_paid_media_app_bindings_admob_accounts_admob_account_id
       FOREIGN KEY (admob_account_id) REFERENCES admob_accounts (id) ON DELETE SET NULL;
   ALTER TABLE paid_media_app_bindings
       ADD CONSTRAINT fk_paid_media_app_bindings_apps_app_row_id
       FOREIGN KEY (app_row_id) REFERENCES apps (id) ON DELETE SET NULL;

   CREATE INDEX IF NOT EXISTS ix_paid_media_app_bindings_app_row_id
       ON paid_media_app_bindings (app_row_id);
   ```
   - `Down`: drop 2 FK, drop index, drop 2 cột (IF EXISTS), và **khôi phục `store_app_identity_id` về NOT NULL** (`ALTER COLUMN ... SET NOT NULL`) — chỉ an toàn nếu chưa có binding admob NULL; nếu đã backfill, `Down` cần xử lý/ghi rõ (xem prompt 02).
2. **Entity** `PaidMediaAppBinding.cs`: thêm
   ```csharp
   public int? AdmobAccountId { get; set; }
   public int? AppRowId { get; set; }
   public AdMobAccount? AdmobAccount { get; set; }   // navigation tùy chọn
   public App? App { get; set; }                      // navigation tùy chọn
   ```
   - **Đổi `StoreAppIdentityId` sang nullable**: `public int? StoreAppIdentityId { get; set; }`. Rà soát mọi nơi đọc field này (service Meta/TikTok, mapper, controller) để xử lý null an toàn — Meta/TikTok vẫn luôn có giá trị nên không đổi hành vi, nhưng kiểu đã là `int?`.
3. **DbContext** `ApplicationDbContext.cs` (block `modelBuilder.Entity<PaidMediaAppBinding>` ~dòng 1650): map cột `admob_account_id`, `app_row_id`; đổi `store_app_identity_id` thành **không** `IsRequired()` (hiện dòng ~1657 đang `.IsRequired()` — gỡ); FK `StoreAppIdentity` đổi `OnDelete` phù hợp (giữ Restrict cho Meta/TikTok vẫn ổn vì luôn có giá trị); cấu hình FK `AdmobAccount`/`App` với `HasOne(...).WithMany().HasForeignKey(...).OnDelete(DeleteBehavior.SetNull)`; thêm `HasIndex` cho `app_row_id`. Cập nhật `ApplicationDbContextModelSnapshot.cs`.
4. **DTO** `PaidMediaAppBindingDtos.cs`:
   - `PaidMediaAppBindingDto`: thêm `int? AdmobAccountId`, `int? AppRowId` (lưu ý: `AppRowId` đã có sẵn — kiểm tra để không trùng; thêm `AdmobAccountId`).
   - `UpsertPaidMediaAppBindingRequestDto`: thêm `int? AdmobAccountId` (đã có `AppRowId`).
   - `PaidMediaAppBindingInput`: thêm `int? AdmobAccountId`, `int? AppRowId` (giữ tương thích ngược: tham số optional/null cho Meta/TikTok).

### OUT (không làm ở prompt này)
- Không sửa `StoreAppIdentityService`, không sửa controller, không backfill dữ liệu, không đụng phân quyền, không sửa frontend.

## Files dự kiến chạm
- `backend/MediationPro.Infrastructure/Migrations/<timestamp>_AddAdmobColumnsToPaidMediaAppBindings.cs` (+ `.Designer.cs` nếu sinh bằng EF)
- `backend/MediationPro.Core/Entities/PaidMediaAppBinding.cs`
- `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs`
- `backend/MediationPro.Infrastructure/Migrations/ApplicationDbContextModelSnapshot.cs`
- `backend/MediationPro.Core/DTOs/PaidMedia/PaidMediaAppBindingDtos.cs`

## Acceptance criteria
- `dotnet build` backend pass.
- Áp migration lên DB dev: 2 cột + 2 FK + index xuất hiện; `Down` gỡ sạch.
- `PaidMediaAppBindingInput`/DTO mới biên dịch được, các caller Meta/TikTok hiện tại **không vỡ** (tham số mới optional).
- Snapshot khớp model (không còn pending model changes).

## Verification
- `dotnet build` toàn solution.
- `dotnet ef database update` (và thử `dotnet ef migrations script` để review SQL), rồi rollback bằng cách update về migration trước.
