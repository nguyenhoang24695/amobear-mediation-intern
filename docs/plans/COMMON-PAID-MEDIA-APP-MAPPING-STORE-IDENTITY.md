# Common Paid Media App Mapping Theo Store Identity

## Bối cảnh

Trước thay đổi này, mapping app cho Meta và TikTok phụ thuộc nhiều vào `apps.app_id`, mà trong hệ thống hiện tại `apps.app_id` là AdMob app id. Điều này gây lệch nghiệp vụ vì Meta/TikTok thực chất cần biết app được quảng cáo trên store là gì: Android package name, iOS App Store ID hoặc bundle id.

Thay đổi mới tách khái niệm **store identity** khỏi **internal app / AdMob app id**. Internal app chỉ còn là liên kết phụ để phục vụ permission, reporting, performance goal và điều hướng UI.

## Mục tiêu

- Dùng một thiết kế DB chung cho Meta và TikTok.
- Mapping chính theo `platform + normalized_store_identifier`, không theo AdMob app id.
- Cho phép mapping package-only chưa link internal app.
- Giữ response tương thích cho frontend Meta/TikTok ở mức tối đa.
- Legacy tables `meta_app_mappings` và `tiktok_app_mappings` chỉ dùng để backfill/rollback, không còn là nguồn tạo mới chính.

## Thiết kế DB mới

### `store_app_identities`

Bảng chuẩn hóa app theo store/package trong phạm vi organization.

Các cột chính:

- `organization_id`: organization sở hữu mapping.
- `platform`: `ANDROID` hoặc `IOS`.
- `package_name`: Android package name nếu có.
- `bundle_id`: iOS bundle id nếu có.
- `app_store_id`: iOS App Store numeric id nếu có.
- `normalized_store_identifier`: khóa store đã normalize.
- `store_identifier_type`: `package_name`, `app_store_id`, hoặc `bundle_id`.
- `primary_store_url`: store URL chính nếu có.
- `app_row_id`: nullable, link optional về internal app.
- `is_active`, audit fields.

Unique chính:

```sql
organization_id, platform, normalized_store_identifier
```

### `paid_media_app_bindings`

Bảng bind network cụ thể vào store identity.

Các cột chính:

- `organization_id`.
- `network`: ví dụ `meta`, `tiktok`.
- `store_app_identity_id`: FK sang `store_app_identities`.
- `external_app_id`: Meta application id hoặc TikTok app id.
- `external_app_name`: optional.
- `download_url`: Meta object store URL hoặc TikTok download URL.
- `deep_link_url`, `store_url_override`.
- `is_active`, audit fields.

Unique chính:

```sql
organization_id, network, external_app_id
```

## Mapping theo network

### Meta

- Network: `meta`.
- `external_app_id`: `metaApplicationId`.
- `download_url`: `objectStoreUrl`.
- Store identity ưu tiên lấy từ `objectStoreUrl`, fallback về input `platform + packageName/appStoreId/bundleId`.
- API frontend vẫn gọi `metaAppMappingsApi`, nhưng endpoint list/create/update/enable/disable đã trỏ sang `/api/v1/meta-accounts/store-app-mappings`.

### TikTok

- Network: `tiktok`.
- `external_app_id`: `tikTokAppId`.
- `download_url`: TikTok download URL.
- Store identity ưu tiên lấy từ `downloadUrl`, fallback về input `platform + packageName/appStoreId/bundleId`.
- Service `TikTokAppMappingService` không tạo row mới trong `tiktok_app_mappings`; thay vào đó tạo `paid_media_app_bindings` qua common service.

## Common service

Service chung: `IStoreAppIdentityService`.

Vai trò:

- Normalize store identity từ URL hoặc explicit input.
- Upsert `store_app_identities`.
- Create/update/list/enable/disable `paid_media_app_bindings` theo network.
- Check app permission khi request có `appRowId`.
- Cho phép package-only mapping khi `appRowId` null.

Implementation hiện tại nằm tại:

- `backend/MediationPro.Core/Interfaces/IStoreAppIdentityService.cs`
- `backend/MediationPro.Infrastructure/Services/PaidMedia/StoreAppIdentityService.cs`
- `backend/MediationPro.Infrastructure/Services/PaidMedia/PaidMediaAppBindingMapper.cs`

## API và DTO

### DTO common nội bộ

- `PaidMediaAppBindingDto`
- `UpsertPaidMediaAppBindingRequestDto`
- `StoreAppIdentityInput`
- `PaidMediaAppBindingInput`

Nằm tại:

- `backend/MediationPro.Core/DTOs/PaidMedia/PaidMediaAppBindingDtos.cs`

### DTO adapter Meta

`MetaAppMappingDto` vẫn expose các field cũ như:

- `metaApplicationId`
- `objectStoreUrl`
- `appRowId`
- `appId`
- `appDisplayName`

và bổ sung các field store identity:

- `linkedAppRowId`
- `packageName`
- `bundleId`
- `appStoreId`
- `normalizedStoreIdentifier`
- `storeIdentifierType`

### DTO adapter TikTok

`TikTokAppMappingDto` vẫn expose các field cũ như:

- `tikTokAppId`
- `downloadUrl`
- `appRowId`
- `appId`
- `appDisplayName`

và bổ sung các field store identity tương tự Meta.

## Discovery và resolve candidate

### Meta

`MetaAppMappingDiscoveryService.ResolveCandidateAsync` tạo/update common binding thay vì tạo `meta_app_mappings` mới.

- `dismiss`: giữ nguyên hành vi cũ.
- `create_mapping` với `appRowId = null`: tạo package-only binding.
- `create_mapping` với `appRowId`: tạo binding + link internal app.
- `update_mapping`: tìm binding theo `network = meta` và `external_app_id = metaApplicationId`, rồi update identity/link.

### TikTok

TikTok app mapping CRUD đã đi qua common binding service. Discovery hiện vẫn còn logic legacy ở nhiều đoạn apply/sync; cần test kỹ nếu muốn chuyển toàn bộ discovery/apply sang common lookup ở phase tiếp theo.

## Campaign flow

Thiết kế mới cho phép chọn package-only mapping khi tạo campaign.

Khi mapping chưa link internal app:

- Payload campaign lấy app id/download URL từ binding.
- Không thể dùng các tính năng cần internal app như performance goal theo app nếu chưa có `appRowId`.
- UI cần hiển thị cảnh báo mapping chưa link internal app.

Các màn đã được chỉnh để `appRowId` nullable không gây lỗi TypeScript/runtime ở các luồng Meta/TikTok chính.

## Migration/backfill

Migration mới:

- `backend/MediationPro.Infrastructure/Migrations/20260521100000_AddCommonPaidMediaAppMappings.cs`

Backfill:

- Meta từ `meta_app_mappings.object_store_url` hoặc `store_url_override`.
- TikTok từ `tiktok_app_mappings.download_url`, `store_url_override`, `package_name_override`, `bundle_id_override`.
- Row không normalize được sẽ không tạo identity/binding sai; legacy row vẫn còn để manual review/rollback.

## Files chính đã thay đổi

Backend:

- `backend/MediationPro.Core/Entities/StoreAppIdentity.cs`
- `backend/MediationPro.Core/Entities/PaidMediaAppBinding.cs`
- `backend/MediationPro.Core/DTOs/PaidMedia/PaidMediaAppBindingDtos.cs`
- `backend/MediationPro.Core/Interfaces/IStoreAppIdentityService.cs`
- `backend/MediationPro.Infrastructure/Services/PaidMedia/StoreAppIdentityService.cs`
- `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs`
- `backend/MediationPro.Api/Controllers/MetaAccountsController.cs`
- `backend/MediationPro.Infrastructure/Services/TikTokAds/TikTokPhase2Services.cs`

Frontend:

- `frontend/types/meta-ads.ts`
- `frontend/types/tiktok-ads.ts`
- `frontend/lib/api/meta-ads.ts`
- `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx`
- `frontend/components/tiktok-ads/create-request/section-account-app.tsx`

## Test checklist

Backend:

```powershell
dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1
```

Frontend typecheck:

```powershell
cd frontend
npx.cmd tsc --noEmit --pretty false
```

Lưu ý: typecheck frontend hiện còn các lỗi cũ ngoài scope ở AI assistant, permissions, date picker, v.v. Không còn lỗi mới liên quan Meta/TikTok mapping tại thời điểm cập nhật.

Manual test nên chạy:

1. Apply migration DB.
2. Vào Meta Store Mappings, tạo mapping chỉ bằng store URL/package, không chọn internal app.
3. Vào TikTok App Mappings, tạo mapping chỉ bằng TikTok app id + download URL/package.
4. Tạo campaign Meta/TikTok bằng mapping package-only.
5. Link mapping với internal app và kiểm tra lại performance-goal/reporting UI.
6. Disable/enable binding và kiểm tra list/reference API phản ánh đúng.

## Rủi ro và lưu ý

- Legacy tables vẫn tồn tại để rollback/backfill, nhưng không nên tạo mapping mới vào đó từ UI.
- Package-only mapping có thể thiếu reporting theo internal app cho đến khi được link `app_row_id`.
- TikTok discovery/apply campaign sync còn một số logic legacy lookup theo `tiktok_app_mappings`; cần phase tiếp theo để chuyển toàn bộ sang `paid_media_app_bindings` nếu muốn đồng nhất hoàn toàn.
- Nếu một package có nhiều external app id trên cùng network, schema hiện cho phép vì unique chính là `network + external_app_id`, không khóa unique `network + store_app_identity_id`.
