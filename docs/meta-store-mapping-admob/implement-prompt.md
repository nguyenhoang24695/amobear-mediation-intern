# Prompt — Rework màn & logic Meta Store Mappings → trạng thái mapped/unmapped với AdMob

> Copy toàn bộ file này làm prompt cho một agent độc lập thực thi. Prompt đã self-contained: đủ đường dẫn file, vị trí code, mô hình dữ liệu, quyết định chốt và cách verify. Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend nhiều tầng Core/Infrastructure/Jobs/Api + Next.js frontend).

## Bối cảnh & mục tiêu
Màn **Meta Store Mappings** (`/meta-ads/app-mappings`) hiện chia **2 tab**:
- **Store Mappings**: các binding `paid_media_app_bindings` với `network='meta'`.
- **Discovery Candidates**: app Meta phát hiện từ ad account đã sync, chờ resolve/dismiss.

Hai khái niệm này gây rối, không cần thiết. **Mong muốn**: chỉ còn **một bảng**, mỗi dòng là **một app thực trên store** (`store_app_identities`), cho biết app đó đã **mapped với AdMob** (qua ≥1 `paid_media_app_bindings` với `network='admob'`, tức xuất hiện ở 1 hoặc nhiều AdMob account) hay **unmapped**.

## Quyết định đã chốt (KHÔNG tự đổi)
1. **Đơn vị dòng**: theo **store identity** — gộp binding Meta + các binding AdMob cùng store identity. Đồng nhất với màn AdMob App Mappings.
2. **Định nghĩa "mapped với admob"**: store identity có **≥1 binding `network='admob'`**; đếm số AdMob account distinct để hiển thị "1 hoặc nhiều account".
3. **Discovery**: **GIỮ** `MetaAppMappingDiscoveryJob` chạy nền (vẫn auto-create/maintain binding Meta), chỉ **BỎ UI candidate** (tab + luồng resolve/dismiss + nút Discover trên màn này). Không xoá job/service/endpoint/bảng candidate.

## Mô hình dữ liệu & cơ chế liên kết (đã xác minh — đừng giả định lại)
- `PaidMediaAppBinding` (`backend/MediationPro.Core/Entities/PaidMediaAppBinding.cs`): có `Network`, `StoreAppIdentityId` (nullable), `ExternalAppId`, `AppRowId`, `AdmobAccountId`, các nav `StoreAppIdentity`, `App`, `AdmobAccount`.
- `StoreAppIdentity` (`backend/MediationPro.Core/Entities/StoreAppIdentity.cs`): key `(OrganizationId, Platform, NormalizedStoreIdentifier)`, có `AppRowId`, nav `App`, `ICollection<PaidMediaAppBinding>`.
- `AdMobAccount` (`backend/MediationPro.Core/Entities/AdMobAccount.cs`): **tên hiển thị là `DisplayName`** (KHÔNG phải `Name`); external id là **`AccountId`** (pub-xxx). Dùng đúng 2 field này khi map DTO.
- **Liên kết Meta↔AdMob**: cả binding Meta và binding AdMob trỏ về **cùng một `StoreAppIdentity`** khi cùng `(Platform, NormalizedStoreIdentifier)` — xem `StoreAppIdentityService.UpsertIdentityAsync` (`backend/MediationPro.Infrastructure/Services/PaidMedia/StoreAppIdentityService.cs`, key `org + platform + normalized_store_identifier`). Vậy: với mỗi binding Meta, "mapped với admob" = tồn tại binding `network='admob'` có **cùng `StoreAppIdentityId`**. Binding Meta có `StoreAppIdentityId = null` ⇒ luôn **unmapped**.
- Phụ thuộc **một chiều**: code màn Meta chỉ **đọc** binding admob; KHÔNG được sửa nghiệp vụ AdMob App Mapping.

Helper dùng lại: `StoreAppIdentityService.ListBindingsAsync(orgId, network, ct)` đã `Include` `StoreAppIdentity.App`, `App`, `AdmobAccount`. Có hằng `StoreAppIdentityService.NetworkMeta = "meta"`, `NetworkAdmob = "admob"`.

---

## A. Backend

### A1. DTO (additive — KHÔNG phá contract cũ)
File: `backend/MediationPro.Core/DTOs/MetaAds/MetaReferenceDtos.cs` (class `MetaAppMappingDto` ở dòng ~38).
- Thêm vào `MetaAppMappingDto` các property **mới**:
  ```csharp
  public bool IsMappedToAdmob { get; set; }
  public int AdmobAccountCount { get; set; }
  public List<MetaAppMappingAdmobBindingDto> AdmobBindings { get; set; } = new();
  ```
- Thêm DTO mới (cùng file):
  ```csharp
  public class MetaAppMappingAdmobBindingDto
  {
      public int BindingId { get; set; }
      public int? AdmobAccountId { get; set; }
      public string? AdmobAccountName { get; set; }        // từ AdMobAccount.DisplayName
      public string? AdmobAccountExternalId { get; set; }  // từ AdMobAccount.AccountId
      public int? AppRowId { get; set; }
      public string? AppId { get; set; }                   // AdMob App ID nội bộ (App.AppId)
      public string? AppDisplayName { get; set; }
      public string ExternalAppId { get; set; } = string.Empty; // AdMob App ID của binding
      public bool IsActive { get; set; }
  }
  ```
- `MetaCreateCampaignReferenceDto.appMappings` vẫn dùng `MetaAppMappingDto` — các field mới để trống mặc định, không ảnh hưởng.

### A2. Mapper helper
File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs` (cạnh `ToMetaAppMappingDto`, dòng ~129).
- Thêm:
  ```csharp
  public static MetaAppMappingAdmobBindingDto ToAdmobBindingDto(PaidMediaAppBinding binding)
  {
      var app = binding.StoreAppIdentity?.App ?? binding.App;
      return new MetaAppMappingAdmobBindingDto
      {
          BindingId = binding.Id,
          AdmobAccountId = binding.AdmobAccountId,
          AdmobAccountName = binding.AdmobAccount?.DisplayName,
          AdmobAccountExternalId = binding.AdmobAccount?.AccountId,
          AppRowId = binding.AppRowId ?? binding.StoreAppIdentity?.AppRowId,
          AppId = app?.AppId,
          AppDisplayName = app?.DisplayName ?? app?.Name ?? binding.ExternalAppName,
          ExternalAppId = binding.ExternalAppId,
          IsActive = binding.IsActive
      };
  }
  ```

### A3. Enrich endpoint list
File: `backend/MediationPro.Api/Controllers/MetaAccountsController.cs` → method `GetStoreAppMappings` (dòng ~363, route `[HttpGet("store-app-mappings")]`).
Logic hiện tại: lấy meta bindings qua `_storeAppIdentityService.ListBindingsAsync(org, NetworkMeta)`, lọc theo `accessibleAppIds`, map `MetaAdsMapper.ToMetaAppMappingDto`.
Cần bổ sung:
1. Load admob bindings: `var admobBindings = await _storeAppIdentityService.ListBindingsAsync(organizationId, StoreAppIdentityService.NetworkAdmob, cancellationToken);`
2. Lọc admob binding theo quyền: chỉ giữ binding có `App` (qua `b.StoreAppIdentity?.App ?? b.App`) thuộc `accessibleAppIds` (cùng tập đã dùng cho meta).
3. Group admob bindings theo `StoreAppIdentityId` (bỏ qua null): `Dictionary<int, List<PaidMediaAppBinding>>`.
4. Khi map mỗi meta binding → DTO: nếu `binding.StoreAppIdentityId` có và map chứa key thì set:
   - `dto.AdmobBindings = list.Select(MetaAdsMapper.ToAdmobBindingDto).ToList();`
   - `dto.AdmobAccountCount = list.Where(x => x.AdmobAccountId.HasValue).Select(x => x.AdmobAccountId!.Value).Distinct().Count();`
   - `dto.IsMappedToAdmob = dto.AdmobAccountCount > 0;`
   - (nếu không có key → giữ mặc định: rỗng, count 0, false)
5. Vì `ToMetaAppMappingDto` trả DTO mới mỗi lần, có thể map xong rồi gán field admob; giữ cấu trúc filter/permission y như cũ.

### A4. KHÔNG đổi
- `MetaAppMappingDiscoveryJob` (`backend/MediationPro.Jobs/MetaAppMappingDiscoveryJob.cs`), `MetaAppMappingDiscoveryService`, entity/bảng/endpoint candidate, `MetaReferenceController`. Không migration DB.

---

## B. Frontend

### B1. Types
File: `frontend/types/meta-ads.ts` (interface `MetaAppMappingDto` dòng ~160).
- Thêm field optional vào `MetaAppMappingDto`:
  ```ts
  isMappedToAdmob: boolean
  admobAccountCount: number
  admobBindings: MetaAppMappingAdmobBindingDto[]
  ```
- Thêm interface mới:
  ```ts
  export interface MetaAppMappingAdmobBindingDto {
    bindingId: number
    admobAccountId?: number | null
    admobAccountName?: string | null
    admobAccountExternalId?: string | null
    appRowId?: number | null
    appId?: string | null
    appDisplayName?: string | null
    externalAppId: string
    isActive: boolean
  }
  ```
- GIỮ nguyên các type candidate (`MetaAppMappingCandidate*`, `Resolve...`, `MetaAppMappingDiscovery*`) để không vỡ chỗ khác.

### B2. API client
File: `frontend/lib/api/meta-ads.ts` — KHÔNG bắt buộc đổi. `metaAppMappingsApi.list()` đã gọi `GET store-app-mappings`. Giữ `listCandidates/discover/resolveCandidate` (chỉ ngừng dùng ở màn này).

### B3. Viết lại màn — `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx`
Tham chiếu pattern: `frontend/components/admob-ads/app-mappings/app-mappings-content.tsx` (grouping theo store identity + badge status + bảng + pagination).

**Xoá khỏi file Meta:**
- `<Tabs>`/`TabsList`/`TabsContent` và toàn bộ tab "Discovery Candidates".
- State + handler candidate: `candidates`, `candidatesLoading/Error`, `refetchCandidates`, `filteredCandidates`, các filter candidate, `openResolve`, `handleResolveResolutionTypeChange`, `handleResolveSubmit`, `handleDismissCandidate`, `handleDiscover`, `handleOpenMapping`, dialog Resolve, các state `resolve*`, `discovering`, `lastDiscoveryResult`.
- Nút "Discover from Synced Accounts".
- Import icon/không dùng còn lại (dọn để qua lint/typecheck).
- Lời gọi `metaAppMappingsApi.listCandidates/discover/resolveCandidate`.

**Giữ:**
- Tải `metaAppMappingsApi.list()` + `structureApi.getApps()`.
- Drawer **Add/Edit Store Mapping** (tạo/sửa binding Meta thủ công) + enable/disable (`metaAppMappingsApi.create/update/enable/disable`).
- Quyền màn `s-meta-accounts` (`hasScreenFunction`).

**Bảng mới — gom theo store identity:**
- Build group theo `normalizedStoreIdentifier` (fallback key `meta:{id}` khi null), mỗi group:
  - meta binding chính (binding đầu — dùng cho Edit/enable/disable);
  - tập admob bindings gộp từ tất cả meta binding trong group, **dedupe theo `bindingId`**;
  - `admobAccountCount` = số `admobAccountId` distinct trong tập admob đã gộp (hoặc lấy max field `admobAccountCount` BE trả — nên tự tính lại từ danh sách đã dedupe cho chính xác);
  - `status`: `"mapped"` nếu admobAccountCount > 0, ngược lại `"unmapped"`.
- Cột: **App | Platform | Store Identity | Meta App ID | AdMob Mapping | Status | Enabled | Updated | (actions)**.
  - **AdMob Mapping**: nếu count>0 hiển thị tóm tắt (vd `"2 AdMob accounts"`) + liệt kê account name + AdMob App ID (mỗi binding 1 dòng nhỏ, kèm badge On/Off theo `isActive`); nếu 0 → `"—"`.
  - **Status**: badge **Mapped** (emerald) / **Unmapped** (amber) — copy class kiểu `getStatusBadgeClass` từ màn AdMob.
  - **Enabled**: switch theo `isActive` của meta binding chính (enable/disable như cũ).
- **Filter**: search (giữ) + platform (giữ) + status (All / Mapped / Unmapped).
- **Pagination**: tuỳ chọn, mô phỏng màn AdMob nếu muốn (không bắt buộc).
- Header: đổi phụ đề cho khớp ý nghĩa mới (vd "Mỗi app store hiển thị trạng thái mapped/unmapped với AdMob").

### B4. Page route
`frontend/app/meta-ads/app-mappings/page.tsx` GIỮ nguyên (chỉ render `AppMappingsContent`, guard `s-meta-accounts`/`view`).

---

## C. Git-guard (chống xoá nhầm)
Màn `app-mappings-content.tsx` là file **tracked** → đây là **sửa lớn (rewrite)**, KHÔNG xoá file. Trước khi xoá bất cứ file nào (không có file nào cần xoá theo plan này), chạy `git status --porcelain -- <path>`; nếu file tracked thì chỉ sửa, không `rm`. Mọi thay đổi BE là **additive**.

## D. Ngoài phạm vi (TUYỆT ĐỐI KHÔNG đụng)
- `MetaAppMappingDiscoveryJob` / `MetaAppMappingDiscoveryService` / entity + bảng + endpoint `MetaAppMappingCandidate` / `meta_app_mapping_candidates`.
- Nghiệp vụ AdMob App Mapping → Store Identity (`StoreAppIdentityService`, `AdmobAppMappingsController`, màn `admob-ads/app-mappings`).
- Không migration DB. Không commit trừ khi được yêu cầu.

## E. Verification (phải xanh)
1. Build BE (nếu API đang chạy khoá DLL → build ra output tạm `-p:BaseOutputPath=obj\check\`, sau đó dọn):
   ```
   dotnet build backend/MediationPro.Core/MediationPro.Core.csproj
   dotnet build backend/MediationPro.Infrastructure/MediationPro.Infrastructure.csproj
   dotnet build backend/MediationPro.Api/MediationPro.Api.csproj
   ```
2. `dotnet test backend/MediationPro.Api.Tests/MediationPro.Api.Tests.csproj` (nếu có test cho `MetaAccountsController`) — kỳ vọng pass vì thay đổi additive.
3. FE: `cd frontend && pnpm typecheck && pnpm test`.
4. E2E thủ công mở `/meta-ads/app-mappings`:
   - chỉ còn 1 bảng, không còn tab/nút candidate/Discover;
   - app có store identity trùng binding AdMob → **Mapped** + đúng số/tên AdMob account + AdMob App ID;
   - app không có binding admob → **Unmapped**;
   - Add/Edit/enable/disable store mapping vẫn hoạt động.
5. (Tuỳ chọn) kiểm chứng DB: với 1 `store_app_identity_id`, đếm `paid_media_app_bindings` `network='admob'` so với badge.

## F. Báo cáo khi xong
Liệt kê: file đã sửa, field DTO đã thêm, ảnh chụp/logic group, kết quả build/test/typecheck, các điểm "candidate/discovery" đã gỡ khỏi UI nhưng giữ ở backend.
