# Prompt 02 — Backfill AdMob Bindings từ bảng `apps`

> Đọc trước: README gốc + `00-INDEX.md`. **Phụ thuộc: Prompt 01 đã xong** (đã có cột `admob_account_id`, `app_row_id`).

## Mục tiêu
Tạo dữ liệu mapping ban đầu cho AdMob: với mỗi app trong bảng `apps`, tạo/reuse `store_app_identities` (nếu phân giải được package) và tạo `paid_media_app_bindings` với `network='admob'`. Idempotent — chạy lại không nhân đôi.

## Bối cảnh phân giải package (tái dùng quy ước có sẵn)
- ANDROID: AdMob lưu **package name** ở `apps.app_store_id` (xem `StructureSyncJob.cs` ~dòng 395-397).
- IOS: `apps.app_store_id` là **App Store numeric ID**; bundle id resolve qua `itunesLookupService` (chỉ có ở runtime job, KHÔNG gọi được trong migration SQL).
- Chuẩn hóa store identifier theo cùng quy tắc `MetaAppMappingDiscoveryNormalizer` / migration `20260521100000` (xem CTE `meta_normalized`/`tiktok_normalized`).

## Phạm vi
### IN
**Migration mới** `<timestamp>_BackfillAdmobAppBindings.cs` (raw SQL, idempotent):
1. CTE chuẩn hóa từ `apps`:
   - `platform` = `apps.platform` (ANDROID/IOS).
   - ANDROID: `normalized_store_identifier = LOWER(BTRIM(app_store_id))`, `store_identifier_type='package_name'` (chỉ khi `app_store_id` khớp dạng package `^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$`).
   - IOS: `normalized_store_identifier = SUBSTRING(app_store_id FROM '([0-9]+)')`, `store_identifier_type='app_store_id'` (khi là chuỗi số). Bundle id IOS để job sync xử lý sau (prompt 03) — backfill chỉ làm được phần có sẵn.
2. INSERT `store_app_identities` (`DISTINCT ON (organization_id, platform, normalized_store_identifier)`, `ON CONFLICT (organization_id, platform, normalized_store_identifier) DO NOTHING`). Lấy `organization_id` của app (xác định nguồn org của `apps` — kiểm tra cột thực tế trên bảng `apps`/liên kết account; nếu `apps` không có `organization_id` trực tiếp thì join qua `admob_accounts`/publisher để suy ra org). **Phải verify cách lấy org trước khi viết.**
3. INSERT `paid_media_app_bindings`:
   - `network='admob'`, `external_app_id = apps.app_id`, `app_row_id = apps.id`, `admob_account_id` = id account AdMob tương ứng (join theo `apps.publisher_id` → `admob_accounts`).
   - `store_app_identity_id`: id của identity vừa tạo/reuse nếu phân giải được package; nếu **KHÔNG** phân giải được → vẫn tạo binding với **`store_app_identity_id = NULL`** (trạng thái Unmapped). Cột này đã được đổi sang nullable ở **prompt 01** — không cần ALTER lại ở đây.
   - `ON CONFLICT (organization_id, network, external_app_id) DO NOTHING`.
4. `Down`: xóa các binding `network='admob'` được sinh bởi backfill (cân nhắc: chỉ nên no-op hoặc xóa theo điều kiện an toàn; ghi rõ chiến lược). Lưu ý phối hợp với `Down` của prompt 01 (khôi phục NOT NULL chỉ khả thi sau khi đã xóa hết binding admob NULL).

### OUT
- Không xử lý IOS bundle-id resolve (cần itunes lookup — để job sync ở prompt 03 bổ sung khi chạy).
- Không migrate `app_permissions` (prompt 04).

## Files dự kiến chạm
- `backend/MediationPro.Infrastructure/Migrations/<timestamp>_BackfillAdmobAppBindings.cs`
- (Chỉ data — schema nullable đã làm ở prompt 01.)

## Bắt buộc verify trước khi code
- Bảng `apps` lấy `organization_id` như thế nào (cột trực tiếp hay suy ra qua account/publisher). Tìm trong `ApplicationDbContext.cs` block `Entity<App>` và `StructureSyncJob.cs`.
- `admob_accounts` khóa nối với `apps` qua trường nào (`publisher_id`?).
- (Đã chốt) Unmapped = `store_app_identity_id NULL`; cột đã nullable từ prompt 01.

## Acceptance criteria
- Migration chạy idempotent (chạy 2 lần không tăng số binding).
- Sau backfill: `SELECT count(*) FROM paid_media_app_bindings WHERE network='admob'` = số app AdMob hợp lệ; app cùng package (khác account) trỏ cùng `store_app_identity_id`.
- App chưa phân giải package → binding ở trạng thái Unmapped theo phương án đã chốt.

## Verification
- Chạy trên DB dev (data clone từ prod). Query kiểm tra số lượng + vài cặp app cùng package.
- Đối chiếu vài app thủ công với AdMob console.
