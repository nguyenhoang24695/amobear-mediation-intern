# Prompt — Rework màn & logic TikTok App Mappings → trạng thái mapped/unmapped với AdMob

> Copy toàn bộ file này làm prompt cho một agent độc lập thực thi. Đây là bản TikTok **tương đương** với rework đã hoàn tất cho Meta (xem `docs/meta-store-mapping-admob/implement-prompt.md` + `implement-prompt-update-1.md` để đối chiếu kết quả mong muốn). Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend Core/Infrastructure/Jobs/Api + Next.js frontend).

## Bối cảnh & mục tiêu
Màn **TikTok App Mappings** (`/tiktok-ads/app-mappings`) hiện chia **2 tab** (toggle bằng Button group, không phải `<Tabs>`):
- **App Mappings**: các binding `paid_media_app_bindings` với `network='tiktok'`.
- **Mapping Candidates**: app TikTok phát hiện từ aB3dvertiser/ad group, chờ resolve/dismiss.

**Mong muốn**: chỉ còn **một bảng**, mỗi dòng là **một app thực trên store** (`store_app_identities`), cho biết app đó đã **mapped với AdMob** (qua ≥1 `paid_media_app_bindings` với `network='admob'`, tức xuất hiện ở 1 hoặc nhiều AdMob account) hay **unmapped**. Giữ discovery service/job chạy nền (vẫn auto-tạo/cập nhật binding TikTok), chỉ **bỏ UI candidate**.

## Quyết định đã chốt (KHÔNG tự đổi — copy từ Meta)
1. **Đơn vị dòng**: theo **store identity** — gộp binding TikTok + các binding AdMob cùng store identity.
2. **"Mapped với admob"**: store identity có **≥1 binding `network='admob'`**; đếm số AdMob account distinct.
3. **Discovery**: **GIỮ** `TikTokAppMappingDiscoveryService` + job scheduled (nếu có), chỉ **BỎ UI candidate** (tab + resolve/dismiss).

## Khác biệt TikTok so với Meta (đọc kỹ kẻo nhầm)
- TikTok **không** có endpoint `store-app-mappings` riêng. Endpoint `app-mappings` **chính là** danh sách binding `network='tiktok'` (`TikTokAppMappingService.GetAppMappingsAsync` dùng `ListBindingsAsync(org, NetworkTikTok)`), không cần đổi route.
- External id là **`tikTokAppId`** (không phải metaApplicationId). URL store là **`downloadUrl`** (bắt buộc) + `storeUrlOverride` (không có `objectStoreUrl`).
- `TikTokAppMappingDto` có thêm `appPlatform`, `advertiserIds`.
- Controller `TikTokAccountsController.GetAppMappings` **không** lọc theo `accessibleAppIds` (khác Meta). Giữ nguyên hành vi: enrich admob **không** lọc theo quyền (mọi binding admob cùng store identity).
- FE nằm trong file dùng chung `frontend/components/tiktok-ads/admin/tiktok-admin-pages.tsx`, hàm `TikTokAppMappingsPage()` (dòng ~614). Tab là Button group (~dòng 815–824). Dữ liệu load thủ công bằng `useState` + `load()` (không dùng `useApi`). Tái dùng sẵn `PageShell`, `ErrorBox`, component phân trang, `statusTone`, và helper `getTikTokMappingPlatform/getTikTokMappingAppLabel/getTikTokMappingAdMobId`.

## Mô hình dữ liệu & liên kết (đã xác minh)
- Cả binding TikTok và binding AdMob trỏ về **cùng `StoreAppIdentity`** khi cùng `(Platform, NormalizedStoreIdentifier)` — `StoreAppIdentityService.UpsertIdentityAsync`. Vậy "mapped với admob" = với mỗi binding TikTok, tìm binding `network='admob'` cùng **`StoreAppIdentityId`**. `StoreAppIdentityId = null` ⇒ luôn unmapped.
- `AdMobAccount` (`backend/MediationPro.Core/Entities/AdMobAccount.cs`): tên hiển thị là **`DisplayName`** (KHÔNG phải `Name`), external id là **`AccountId`**.
- `StoreAppIdentityService.ListBindingsAsync(org, network, ct)` đã `Include` `StoreAppIdentity.App`, `App`, `AdmobAccount`. Hằng `NetworkTikTok="tiktok"`, `NetworkAdmob="admob"`.
- Phụ thuộc một chiều: chỉ **đọc** binding admob, KHÔNG sửa nghiệp vụ AdMob mapping.

---

## A. Backend

### A1. DTO (additive)
File: `backend/MediationPro.Core/DTOs/TikTokAds/TikTokAdsDtos.cs` (class `TikTokAppMappingDto` dòng ~154).
- Thêm vào `TikTokAppMappingDto`:
  ```csharp
  public bool IsMappedToAdmob { get; set; }
  public int AdmobAccountCount { get; set; }
  public List<TikTokAppMappingAdmobBindingDto> AdmobBindings { get; set; } = new();
  ```
- Thêm DTO mới (cùng file):
  ```csharp
  public sealed class TikTokAppMappingAdmobBindingDto
  {
      public int BindingId { get; set; }
      public int? AdmobAccountId { get; set; }
      public string? AdmobAccountName { get; set; }        // AdMobAccount.DisplayName
      public string? AdmobAccountExternalId { get; set; }  // AdMobAccount.AccountId
      public int? AppRowId { get; set; }
      public string? AppId { get; set; }                   // App.AppId (AdMob App ID nội bộ)
      public string? AppDisplayName { get; set; }
      public string ExternalAppId { get; set; } = string.Empty; // AdMob App ID của binding
      public bool IsActive { get; set; }
  }
  ```
- `TikTokReferenceResponseDto.AppMappings` vẫn dùng `TikTokAppMappingDto` — field mới để trống, không ảnh hưởng.

### A2. Mapper helper
File: `backend/MediationPro.Infrastructure/Services/TikTokAds/TikTokPhase2Services.cs` (cạnh `TikTokAdsMapper.ToDto(PaidMediaAppBinding)`).
- Thêm:
  ```csharp
  public static TikTokAppMappingAdmobBindingDto ToAdmobBindingDto(PaidMediaAppBinding binding)
  {
      var app = binding.StoreAppIdentity?.App ?? binding.App;
      return new TikTokAppMappingAdmobBindingDto
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

### A3. Enrich danh sách
File: `backend/MediationPro.Infrastructure/Services/TikTokAds/TikTokPhase2Services.cs` → `TikTokAppMappingService.GetAppMappingsAsync` (dòng ~391).
- Đổi thân hàm từ `.Select(TikTokAdsMapper.ToDto)` thành vòng lặp để truy cập `binding.StoreAppIdentityId`:
  1. `var tiktokBindings = await _storeAppIdentityService.ListBindingsAsync(org, NetworkTikTok, ct);`
  2. `var admobBindings = await _storeAppIdentityService.ListBindingsAsync(org, StoreAppIdentityService.NetworkAdmob, ct);`
  3. Group admob theo `StoreAppIdentityId` (bỏ null) → `Dictionary<int, List<PaidMediaAppBinding>>`.
  4. Với mỗi tiktok binding: `var dto = TikTokAdsMapper.ToDto(binding);` rồi nếu `binding.StoreAppIdentityId` có và map chứa key:
     - `dto.AdmobBindings = list.Select(TikTokAdsMapper.ToAdmobBindingDto).ToList();`
     - `dto.AdmobAccountCount = list.Where(x => x.AdmobAccountId.HasValue).Select(x => x.AdmobAccountId!.Value).Distinct().Count();`
     - `dto.IsMappedToAdmob = dto.AdmobAccountCount > 0;`
  5. Trả `List<TikTokAppMappingDto>`.
- KHÔNG lọc theo quyền (giữ đúng hành vi hiện tại của TikTok app-mappings).

### A4. KHÔNG đổi
`TikTokAppMappingDiscoveryService`, job scheduled, entity/bảng/endpoint candidate (`app-mappings/candidates`, `.../resolve`), `TikTokReferenceService`. Không migration.

---

## B. Frontend

### B1. Types
File: `frontend/types/tiktok-ads.ts` (interface `TikTokAppMappingDto`).
- Thêm vào `TikTokAppMappingDto`:
  ```ts
  isMappedToAdmob: boolean
  admobAccountCount: number
  admobBindings: TikTokAppMappingAdmobBindingDto[]
  ```
- Thêm interface:
  ```ts
  export interface TikTokAppMappingAdmobBindingDto {
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
- GIỮ nguyên các type candidate.

### B2. API client
File: `frontend/lib/api/tiktok-ads.ts` — không bắt buộc đổi. `tiktokAccountsApi.getAppMappings()` đã trả danh sách đã enrich. Giữ `listAppMappingCandidates/resolveAppMappingCandidate` (ngừng dùng ở màn này).

### B3. Viết lại màn — `TikTokAppMappingsPage()` trong `frontend/components/tiktok-ads/admin/tiktok-admin-pages.tsx`
Tham chiếu kết quả Meta: `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx` (đã group theo store identity, mapped/unmapped, ảnh + link store-first). Và pattern gốc: `frontend/components/admob-ads/app-mappings/app-mappings-content.tsx`.

**Xoá:**
- Tab toggle Button group (App Mappings / Mapping Candidates) → chỉ còn 1 bảng, bỏ `activeTab`.
- Toàn bộ state/handler candidate: `candidates`, `candidateSearch/MatchFilter/OsFilter/Page/PageSize`, `resolveTarget/Form/DialogOpen/AppSelectOpen`, `resolvingId`, `filteredCandidates`, `paginatedCandidates`, `openResolve`, `handleResolve*`, `resolveCandidate`, `dismissCandidate`, dialog Resolve, lời gọi `listAppMappingCandidates/resolveAppMappingCandidate`. Bỏ `mappedAppRows`/`getResolveSelectableApps` nếu chỉ dùng cho candidate.
- `load()` chỉ còn `getAppMappings()` + `structureApi.getApps()`.

**Giữ:** tạo/sửa mapping TikTok (drawer Add/Edit nếu màn có; nếu hiện chưa có drawer create/update thì giữ nguyên hành vi hiện tại của bảng mappings), enable/disable (`enableAppMapping/disableAppMapping`), quyền `s-tiktok-accounts`. Tái dùng `PageShell`, `ErrorBox`, phân trang.

**Bảng mới — gom theo store identity** (logic giống Meta `buildMetaAppMappingGroups`):
- Group theo `normalizedStoreIdentifier` (fallback `tiktok:{id}` khi null). Mỗi group: binding TikTok chính (cho Edit/enable/disable), tập admob bindings gộp (dedupe theo `bindingId`), `admobAccountCount` distinct, `status` = `"mapped"` nếu count>0 else `"unmapped"`.
- Cột: **App | Platform | Store Identity | TikTok App ID | AdMob Mapping | Status | Updated | (actions)** (KHÔNG có cột Enabled — xem B5).
- **Cột App** (giống Meta sau update):
  - Avatar/ảnh bên trái: ưu tiên icon của **AdMob app đầu tiên đã mapped**:
    ```ts
    const firstAdmobBinding = group.admobBindings[0]
    const mappedIconUri = firstAdmobBinding?.appRowId ? appByRowId.get(firstAdmobBinding.appRowId)?.iconUri : undefined
    const appIconUri = mappedIconUri ?? group.app?.iconUri ?? undefined
    ```
    Có ảnh → `<img>`; không → ô chữ cái đầu của app label.
  - **Tên app**: text thường (KHÔNG `<Link>`).
  - **Dòng AdMob App ID** dưới tên = link, ưu tiên **public store**:
    1. Nếu `mapping.storeUrlOverride` hoặc `mapping.downloadUrl` là URL http hợp lệ (`isHttpUrl`) → dùng làm href.
    2. Nếu không, build từ `group.platform + group.storeIdentifier`: Android → `https://play.google.com/store/apps/details?id={id}`; iOS → `https://apps.apple.com/app/id{appStoreId}` **chỉ khi identifier toàn số** (hoặc `storeIdentifierType==='app_store_id'`), nếu không thì bỏ qua.
    3. Fallback internal `/apps/{appId}` (`appId = group.app?.appId ?? mapping.appId`).
    - Text khớp đích: ra store thì hiện store URL; fallback internal mới hiện AdMob App ID.
    - External dùng `<a target="_blank" rel="noreferrer">`; internal dùng Next `<Link>`.
- **Cột AdMob Mapping**: nếu count>0 liệt kê account (vd "2 AdMob accounts") + mỗi binding 1 dòng nhỏ: badge On/Off theo `isActive`, account name, và **AdMob App ID hiển thị nguyên văn**, link internal `/apps/{binding.appId ?? binding.externalAppId}` (Next `Link`, KHÔNG đổi sang store URL ở cột này). Nếu 0 → "—".
- **Cột Status**: badge Mapped (emerald) / Unmapped (amber).
- **Filter**: search (giữ) + platform + status (All / Mapped / Unmapped).

### B4. Helper UI gợi ý (thêm trong file, thuần FE)
```ts
function isHttpUrl(value?: string | null) {
  return /^https?:\/\//i.test(value?.trim() ?? "")
}
function buildStoreUrl(platform?: string | null, storeIdentifier?: string | null) {
  const id = storeIdentifier?.trim()
  if (!id) return null
  switch ((platform ?? "").toUpperCase()) {
    case "ANDROID":
      return `https://play.google.com/store/apps/details?id=${encodeURIComponent(id)}`
    case "IOS": {
      const appStoreId = id.replace(/\D/g, "")
      // chỉ build khi identifier vốn là số (tránh nhầm bundle id)
      return appStoreId && /^\d+$/.test(id) ? `https://apps.apple.com/app/id${appStoreId}` : null
    }
    default:
      return null
  }
}
```

### B5. Bỏ cột "Enabled" trên bảng chính
- Xoá `<TableHead>Enabled</TableHead>` + `<TableCell>` chứa `<Switch>` trong row.
- Cập nhật `colSpan` các row loading/error/empty cho đúng số cột mới.
- Giữ enable/disable ở dropdown action (nếu có) và `Switch` ở drawer Add/Edit (nếu có). Không tạo import thừa.

---

## C. Ràng buộc & git-guard
- Không đổi backend ngoài 3 mục A1–A3. Không migration. Không đụng discovery/job/candidate backend, không đụng nghiệp vụ AdMob mapping.
- File FE/BE đều là tracked → chỉ sửa, không xoá file. Trước khi xoá bất cứ file nào (plan này không cần xoá file) chạy `git status --porcelain -- <path>`; tracked thì không `rm`.
- Không commit trừ khi được yêu cầu.

## D. Verification
1. Build BE (nếu API đang chạy khoá DLL → build ra `-p:BaseOutputPath=obj\check\` rồi dọn):
   ```
   dotnet build backend/MediationPro.Core/MediationPro.Core.csproj
   dotnet build backend/MediationPro.Infrastructure/MediationPro.Infrastructure.csproj
   dotnet build backend/MediationPro.Api/MediationPro.Api.csproj
   ```
2. `dotnet test` cho test TikTok nếu có (vd `MediationPro.Infrastructure.Tests`/`...UnitTests`) — kỳ vọng pass do additive.
3. FE trong `frontend`:
   ```powershell
   pnpm test
   npx.cmd tsc --noEmit --incremental false --pretty false
   ```
   (nếu không có script `pnpm typecheck` thì dùng lệnh tsc trên; báo rõ nếu fail bởi lỗi cũ ngoài module TikTok.)
4. E2E thủ công mở `/tiktok-ads/app-mappings`:
   - chỉ còn 1 bảng, không còn tab/nút "Mapping Candidates";
   - cột App có ảnh (mapped lấy icon AdMob app đầu tiên), tên app không phải link, dòng AdMob App ID click ra store nếu có store identity, fallback `/apps/{appId}`;
   - cột AdMob Mapping: mỗi AdMob App ID hiện nguyên văn + link internal;
   - dòng có binding admob → **Mapped** + đúng số/tên account; không có → **Unmapped**;
   - không còn cột Enabled/Switch trên bảng; Add/Edit/enable/disable vẫn chạy.
5. (Tuỳ chọn) kiểm chứng DB qua MCP postgres: với 1 `store_app_identity_id`, đếm `paid_media_app_bindings` `network='admob'` so với badge.

## E. Báo cáo khi xong
Liệt kê: file đã sửa, field DTO đã thêm, logic enrich + group, kết quả build/test/typecheck, các phần candidate/discovery đã gỡ khỏi UI nhưng giữ ở backend.
