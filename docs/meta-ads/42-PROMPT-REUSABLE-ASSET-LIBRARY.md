# Task: Thư viện asset dùng lại (Nexus local library) cho Meta Campaign Request

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` — .NET 8 backend (Clean Architecture) + Next.js 16 frontend.
Màn tạo/sửa request Meta: `/meta-ads/requests/create` (component `frontend/components/meta-ads/create-request/section-creative.tsx`).

Hiện tại, mỗi lần chọn ảnh/video cho creative người dùng **phải upload file lên** (qua
`metaRequestsApi.uploadAsset`). File được lưu vào MinIO + ghi 1 dòng vào bảng `meta_request_assets`.
Nếu dùng lại đúng file đó cho request khác, người dùng **phải upload lại từ đầu** → lãng phí.

### Mong muốn (nghiệp vụ user yêu cầu)
1. **Chọn asset từ thư viện local**: các asset đã upload trước đây (đã nằm trong MinIO + bảng
   `meta_request_assets`) được **liệt kê lại** để người dùng **chọn tái sử dụng**, không cần upload lần 2.
2. **Đổi cách lưu asset**: lưu theo cấu trúc **`org → username → asset`** — tức path lồng
   `{organizationId}/{username}/...`, trong đó username = email người dùng **bỏ phần `@domain`**
   (vd `nguyen.van.a@amobear.com` → folder `nguyen.van.a`). Hiện đang chỉ lưu theo `organizationId`.
3. **Chưa phân quyền theo thư mục**: coi asset là **tài nguyên chung cho tất cả user** (thư viện hiển thị
   asset của mọi người trong cùng organization, không lọc theo người tạo).
4. Áp dụng cho **request Meta campaign** (màn create/edit creative).

---

## Hiện trạng đã xác minh (đọc trước khi code)

### Backend
- **Entity** `backend/MediationPro.Core/Entities/MetaRequestAsset.cs`: `Id(int)`, `OrganizationId`,
  `Kind`, `StorageProvider`, `Bucket`, `ObjectKey`, `FileName`, `ContentType`, `SizeBytes`,
  `CreatedBy(Guid userId)`, `CreatedAt`.
- **Service** `backend/MediationPro.Infrastructure/Services/MetaAds/MetaRequestAssetService.cs`:
  - `UploadAsync(orgId, userId, kind, fileName, contentType, content, sizeBytes, ct)` —
    objectKey hiện tại (dòng ~48):
    ```csharp
    var objectKey = $"meta/meta-campaign-request-assets/{organizationId:N}/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid():N}{extension}";
    ```
  - `GetByIdAsync`, `GetContentAsync`. Bucket = `amobear-datalake`, provider = `minio`.
- **Interface** `backend/MediationPro.Core/Interfaces/IMetaRequestAssetService.cs`.
- **Controller** `backend/MediationPro.Api/Controllers/MetaCampaignRequestsController.cs`:
  - `POST assets` (dòng ~426 `UploadAsset`) → gọi `UploadAsync(organizationId, userId, ...)`.
  - `GET assets/{id}` (~443), `GET assets/{id}/content` (~458, trả file, **yêu cầu auth**).
  - Lấy context qua `TryGetContext(out userId, out organizationId)`; **email** lấy qua
    `User.GetUserEmail()` (extension `backend/MediationPro.Api/Extensions/ClaimsPrincipalExtensions.cs`,
    đọc claim `ClaimTypes.Email`).
  - Quyền: screen `s-meta-requests`, function `create` (ghi) / `view` (đọc).
- **DTO** `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs` (dòng ~341)
  `MetaRequestAssetDto { Id, Kind, FileName, ContentType, SizeBytes, PreviewUrl, CreatedAt }`.
- **Mapper** `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs` (dòng ~203)
  `ToDto(MetaRequestAsset, previewUrl)`.
- **DbContext** `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs` (dòng ~1942):
  bảng `meta_request_assets`, đã có index `ix_meta_request_assets_org_kind_created_at`
  `(OrganizationId, Kind, CreatedAt)` — **dùng được cho query thư viện**.

### Frontend
- **API** `frontend/lib/api/meta-ads.ts` (dòng ~113): `metaRequestsApi.uploadAsset(file, kind)`,
  `getAsset(id)`. Prefix `REQUESTS_PREFIX`.
- **Types** `frontend/types/meta-ads.ts`: `MetaRequestAssetDto` (mirror DTO BE) và
  `MetaRequestAssetSelectionState` (dòng ~1148) — slot media của form, có các field
  `mode`, `uploadedAssetId`, `uploadedAssetName`, `uploadedAssetPreviewUrl`, `imageHash`, `imageUrl`,
  `videoId`, `metaPreviewUrl`, `metaPlayableUrl`, `metaAssetId`, `metaAssetType`, `metaAdAccountId`…
- **Preview** `frontend/lib/meta-ads/media-preview.ts`:
  - `buildMetaRequestAssetContentUrl(assetId)` → URL tuyệt đối tới endpoint content.
  - `getSelectionPreviewSource(selection)`: **nếu `selection.uploadedAssetId` có** → tự build content URL
    với `requiresAuth: true` (nên khi chọn từ thư viện chỉ cần set `uploadedAssetId`, preview tự lên).
- **Picker hiện có** `frontend/components/meta-ads/create-request/meta-media-picker-dialog.tsx`
  (`MetaMediaPickerDialog`) — picker "From Meta" (ảnh/video từ ad account). **Là mẫu để clone** cho
  picker thư viện local (tabs Images/Videos, search, "Load more", grid, nút Select).
- **section-creative.tsx**: mỗi slot media (single image, single video, single-video thumbnail,
  carousel card, flexible asset) có nút **"From Meta"** mở `MetaMediaPickerDialog` và 1 nút **Upload**
  gọi `handleUpload`/`handleCarouselUpload`/`handleFlexibleUpload`/`handleVariantUpload`. Các nút
  "From Meta" + dialog nằm rải tại các vùng dòng ~2582, ~2597, ~2622, ~2661, ~2808, ~2825.
  Khi upload xong, các handler set patch dạng:
  ```ts
  { mode: "uploaded_asset", uploadedAssetId: asset.id, uploadedAssetName: asset.fileName,
    uploadedAssetPreviewUrl: <blob|"">, metaPlayableUrl: "", imageHash: "", imageUrl: "", videoId: "" }
  ```
- **ProtectedMediaImage** `frontend/components/meta-ads/shared/protected-media-image.tsx` — render ảnh
  cần Authorization header (dùng cho content URL `requiresAuth`).

---

## Yêu cầu triển khai

### Phần A — BE: lưu asset theo thư mục username + lưu owner

**A1. Entity:** thêm cột `OwnerUsername` (nullable) vào `MetaRequestAsset.cs`:
```csharp
public string? OwnerUsername { get; set; }
```

**A2. DbContext** (`ApplicationDbContext.cs`, block `meta_request_assets` ~1942): map cột mới:
```csharp
entity.Property(e => e.OwnerUsername).HasColumnName("owner_username").HasMaxLength(255);
```
(nullable → không `.IsRequired()`).

**A3. Interface + Service:** đổi chữ ký `UploadAsync` để nhận **email/username người tạo**, và đổi
objectKey sang folder username.
- `IMetaRequestAssetService.UploadAsync(...)`: thêm tham số `string? ownerEmail` (đặt **trước**
  `CancellationToken`, sau `userId` cho dễ đọc — vd `(Guid orgId, Guid userId, string? ownerEmail, string kind, ...)`).
- `MetaRequestAssetService.UploadAsync`:
  - Derive username folder từ email (local-part, sanitize). Thêm helper:
    ```csharp
    private static string ResolveOwnerFolder(string? ownerEmail)
    {
        var raw = (ownerEmail ?? string.Empty).Trim();
        var atIndex = raw.IndexOf('@');
        var localPart = atIndex > 0 ? raw[..atIndex] : raw;
        localPart = localPart.ToLowerInvariant();
        var sanitized = new string(localPart.Select(c =>
            (c is >= 'a' and <= 'z') || (c is >= '0' and <= '9') || c is '.' or '_' or '-' ? c : '_').ToArray());
        return string.IsNullOrWhiteSpace(sanitized) ? "unknown" : sanitized;
    }
    ```
  - Đổi objectKey (lồng `org → username → ngày → file`):
    ```csharp
    var ownerFolder = ResolveOwnerFolder(ownerEmail);
    var objectKey = $"meta/meta-campaign-request-assets/{organizationId:N}/{ownerFolder}/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid():N}{extension}";
    ```
  - Set `OwnerUsername = ownerFolder` khi tạo `entity`.
- **Controller** `UploadAsset` (~439): truyền email vào:
  ```csharp
  var asset = await _requestAssetService.UploadAsync(organizationId, userId, User.GetUserEmail(), request.Kind ?? string.Empty, request.File.FileName, request.File.ContentType, stream, request.File.Length, cancellationToken);
  ```
- **Lưu ý**: asset cũ vẫn nằm ở path `.../{orgId}/...`; `ObjectKey` lưu tuyệt đối nên vẫn đọc được —
  **không cần di chuyển dữ liệu cũ**.

**A4. Migration** (EF Core, project Infrastructure, startup Api):
```powershell
cd backend/MediationPro.Api
dotnet ef migrations add AddOwnerUsernameToMetaRequestAssets --project ..\MediationPro.Infrastructure --startup-project .
```
- Commit **cả `*.cs` lẫn `*.Designer.cs`** (theo CLAUDE.md). Cột `owner_username VARCHAR(255) NULL`.

### Phần B — BE: endpoint liệt kê thư viện (shared trong org)

**B1. DTO:** thêm field owner vào `MetaRequestAssetDto`:
```csharp
public string? OwnerUsername { get; set; }
```
Map trong `MetaAdsMapper.ToDto` (gán `OwnerUsername = entity.OwnerUsername`).
Thêm DTO phân trang:
```csharp
public class MetaRequestAssetPageDto
{
    public List<MetaRequestAssetDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
}
```

**B2. Service:** thêm vào `IMetaRequestAssetService` + impl:
```csharp
Task<(IReadOnlyList<MetaRequestAsset> Items, int Total)> ListAsync(
    Guid organizationId, string? kind, string? search, int page, int pageSize,
    CancellationToken cancellationToken = default);
```
Impl trong `MetaRequestAssetService`:
- Base query `_dbContext.MetaRequestAssets.AsNoTracking().Where(x => x.OrganizationId == organizationId)`
  (**shared toàn org — KHÔNG lọc theo `CreatedBy`**).
- Nếu `kind` ∈ {image, video} → lọc `x.Kind == normalizedKind`.
- Nếu `search` non-empty → `EF.Functions.ILike(x.FileName, $"%{search}%")` (hoặc
  `x.FileName.ToLower().Contains(search.ToLower())` nếu provider không hỗ trợ ILike — Postgres hỗ trợ ILike).
- `Total = await query.CountAsync(ct)`.
- Order `OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)`, phân trang
  `Skip((page-1)*pageSize).Take(pageSize)`. Clamp `page >= 1`, `pageSize` trong [1, 100] (mặc định 24).

**B3. Controller:** thêm endpoint (cạnh các endpoint assets, ~443), quyền **đọc**
(`HasMetaRequestReadAccessAsync`):
```csharp
[HttpGet("assets")]
public async Task<ActionResult<MetaRequestAssetPageDto>> ListAssets(
    [FromQuery] string? kind, [FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 24,
    CancellationToken cancellationToken = default)
{
    if (!TryGetContext(out var userId, out var organizationId))
        return Unauthorized(new { message = "User context not found in token." });
    if (!await HasMetaRequestReadAccessAsync(userId))
        return Forbid();

    var (items, total) = await _requestAssetService.ListAsync(organizationId, kind, q, page, pageSize, cancellationToken);
    var safePage = page < 1 ? 1 : page;
    var safePageSize = pageSize is < 1 or > 100 ? 24 : pageSize;
    return Ok(new MetaRequestAssetPageDto
    {
        Items = items.Select(ToAssetDto).ToList(),
        Total = total,
        Page = safePage,
        PageSize = safePageSize,
        HasMore = safePage * safePageSize < total,
    });
}
```
- **Lưu ý route trùng:** đã có `[HttpPost("assets")]` (UploadAsset) và `[HttpGet("assets/{assetId:int}")]`.
  `[HttpGet("assets")]` (không param route) **không xung đột** với hai cái đó. Đặt method này phía trên
  `GetAsset` để rõ ràng.

### Phần C — FE: types + API

**C1.** `frontend/types/meta-ads.ts`:
- Thêm `ownerUsername?: string | null` vào `MetaRequestAssetDto`.
- Thêm interface:
  ```ts
  export interface MetaRequestAssetPageDto {
    items: MetaRequestAssetDto[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }
  ```

**C2.** `frontend/lib/api/meta-ads.ts` — thêm vào `metaRequestsApi` (cạnh `uploadAsset`):
```ts
listAssets: async (params?: { kind?: "image" | "video"; q?: string; page?: number; pageSize?: number }) => {
  const query = new URLSearchParams()
  if (params?.kind) query.set("kind", params.kind)
  if (params?.q) query.set("q", params.q)
  if (params?.page) query.set("page", String(params.page))
  if (params?.pageSize) query.set("pageSize", String(params.pageSize))
  const qs = query.toString()
  return apiClient.get<MetaRequestAssetPageDto>(`${REQUESTS_PREFIX}/assets${qs ? `?${qs}` : ""}`)
},
```
Import `MetaRequestAssetPageDto` vào type-import của file.

### Phần D — FE: dialog thư viện local

Tạo `frontend/components/meta-ads/create-request/nexus-asset-library-dialog.tsx`, **clone cấu trúc**
`meta-media-picker-dialog.tsx` nhưng đổi nguồn dữ liệu sang `metaRequestsApi.listAssets`:
- Props:
  ```ts
  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    targetKind: "image" | "video" | "both"
    selectedAssetId?: number | null
    onSelect: (asset: MetaRequestAssetDto) => void
  }
  ```
- Tabs Images/Videos (mặc định theo `targetKind`), ô Search (debounce ~250ms), nút **Load more**
  (page+1, merge unique theo `asset.id`). Mỗi tab gọi `listAssets({ kind, q, page, pageSize: 24 })`.
- Grid card: thumbnail ảnh dùng `ProtectedMediaImage` với
  `src={buildMetaRequestAssetContentUrl(asset.id)}` + `requiresAuth`. **Video** (content là file video,
  không phải ảnh, lại không có thumbnail riêng) → hiển thị **icon `Video` placeholder** (KHÔNG render
  `<img>` cho video) **và thêm nút `Preview`** (giống nút Preview của `MetaMediaPickerDialog`). Hiển thị
  `fileName`, kind, kích thước (format bytes), `ownerUsername` (nếu có), `createdAt.slice(0,10)`.
- **Preview video**: tái dùng `MetaVideoPreviewDialog` (`./meta-video-preview-dialog`) — set state
  `previewItem: MetaRequestAssetDto | null`; mở với
  `playableUrl={buildMetaRequestAssetContentUrl(previewItem.id)}`, `requiresAuth` (content endpoint cần
  Bearer token; `ProtectedMediaVideo` bên trong tự fetch blob kèm Authorization), `title={previewItem.fileName}`.
- Nút **Select** → `onSelect(asset); onOpenChange(false)`.
- Trạng thái rỗng/loading/error tương tự `MetaMediaPickerDialog`. **Không** cần `adAccountId`
  (thư viện không gắn ad account).

### Phần E — FE: gắn nút "From Library" vào từng slot creative

Trong `section-creative.tsx`:
- Thêm 1 patch-builder dùng chung (đặt cạnh `buildMetaLibrarySelectionPatch`):
  ```ts
  function buildNexusAssetSelectionPatch(asset: MetaRequestAssetDto): Partial<MetaRequestAssetSelectionState> {
    return {
      mode: "uploaded_asset",
      uploadedAssetId: asset.id,
      uploadedAssetName: asset.fileName,
      uploadedAssetPreviewUrl: "", // rỗng → getSelectionPreviewSource tự build content URL (auth)
      metaPlayableUrl: "",
      imageHash: "",
      imageUrl: "",
      videoId: "",
      // clear meta_ref decoration
      metaPreviewUrl: "",
      metaPreviewRequiresAuth: false,
      metaAssetId: "",
      metaAssetName: "",
      metaAssetType: "",
      metaAdAccountId: "",
      metaRefSource: "manual",
    }
  }
  ```
- Thêm các handler chọn-từ-thư-viện **song song** với nhóm `handleMetaSelection` (áp cùng cách apply
  patch mà mỗi slot đang dùng cho `From Meta`/upload):
  - `handleLibrarySelection(field, asset)` — cho single image/video/thumbnail (dùng `handleMediaPatch`).
  - `handleCarouselLibrarySelection(index, asset)` — dùng `updateCarouselCardImage`.
  - `handleFlexibleLibrarySelection(index, field, asset)` — dùng `updateFlexibleAssetMedia`.
  - `handleVariantLibrarySelection(sequenceNumber, field, asset)` — dùng `patchAdditionalVariantFromLatest`.
  Mỗi handler `const patch = buildNexusAssetSelectionPatch(asset)` rồi apply như nhánh `from_meta` tương ứng.
  **Không cần** auto-capture thumbnail khi chọn video từ thư viện (giữ đơn giản; thumbnail vẫn chọn tay
  hoặc chọn riêng từ thư viện).
- Với **mỗi** vị trí đang có nút **"From Meta"** (các vùng ~2582, ~2597/2622, ~2661, ~2808, ~2825), thêm
  nút **"From Library"** ngay cạnh, mở `NexusAssetLibraryDialog` (state mở/đóng riêng cho từng slot,
  hoặc 1 state `libraryPickerSlot` định danh slot đang mở — mô phỏng cách `pickerOpen`/`setPickerOpen`
  hiện dùng cho `MetaMediaPickerDialog`). `targetKind` truyền đúng theo slot (image/video). `onSelect`
  gọi handler tương ứng ở trên.
- **Không xoá** nút Upload và nút From Meta — bổ sung thêm lựa chọn thứ ba.

---

## KHÔNG làm
- KHÔNG phân quyền theo thư mục/owner (thư viện shared toàn org theo yêu cầu).
- KHÔNG di chuyển/đổi path asset cũ đã lưu.
- KHÔNG đổi luồng asset-preparation / execute (asset chọn từ thư viện vẫn là `uploadedAssetId` như upload,
  pipeline chuẩn bị Meta xử lý y hệt).
- KHÔNG đụng AdMob / màn khác.

## Verify
1. BE build (API có thể đang khoá DLL → build ra thư mục khác):
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
2. Migration áp được:
   ```powershell
   cd backend/MediationPro.Api
   dotnet ef database update --project ..\MediationPro.Infrastructure --startup-project .
   ```
3. BE test xanh: `dotnet test backend/MediationPro.sln -c Release`. Nên thêm unit test cho
   `ResolveOwnerFolder` (`a.b@x.com` → `a.b`; email rỗng → `unknown`; ký tự lạ → `_`) và cho `ListAsync`
   (lọc kind + search + phân trang + shared org).
4. FE: `cd frontend && pnpm typecheck && pnpm lint`.
5. E2E thủ công tại `/meta-ads/requests/create`:
   - Upload 1 ảnh mới → kiểm tra trong MinIO object nằm dưới `meta/meta-campaign-request-assets/<username>/...`
     (username = email không có `@domain`); dòng DB `owner_username` đúng.
   - Bấm **From Library** ở slot ảnh → dialog liệt kê asset đã upload (gồm của user khác trong org),
     search + load more chạy; chọn 1 asset → slot hiển thị preview (qua content URL, auth) mà **không
     upload lại**; submit/execute request dùng đúng `uploadedAssetId`.
   - Lặp cho slot video, carousel, flexible, variant.

## Phạm vi & ràng buộc
- BE: `MetaRequestAsset.cs`, `IMetaRequestAssetService.cs`, `MetaRequestAssetService.cs`,
  `ApplicationDbContext.cs`, `MetaCampaignRequestsController.cs`, `MetaAdsMapper.cs`,
  `MetaCampaignRequestDtos.cs`, migration mới.
- FE: `types/meta-ads.ts`, `lib/api/meta-ads.ts`, `nexus-asset-library-dialog.tsx` (mới),
  `section-creative.tsx`.
- Convention: C# PascalCase public / `_camelCase` private; JSON/cột snake_case
  (`owner_username`); TS/React camelCase.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build/test BE xanh, migration áp được; `pnpm typecheck`+`pnpm lint` xanh; asset upload mới lưu theo
folder username trong MinIO + cột `owner_username`; màn create/edit creative có nút **From Library** ở
mọi slot media, liệt kê asset shared toàn org, chọn lại được **không cần upload lần 2**, preview hiển thị
đúng và request execute dùng đúng `uploadedAssetId`.
