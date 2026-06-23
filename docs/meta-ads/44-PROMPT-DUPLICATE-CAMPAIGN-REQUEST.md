# Prompt 44 — Duplicate Meta Campaign Request (tạo mới campaign/adset/ad, tái dùng creative & asset)

> **Vai trò người thực thi:** Bạn là agent độc lập implement tính năng này từ đầu tới cuối trong repo `Amobear.Mediation.Tools`. Prompt này self-contained — đọc kỹ, không cần hỏi lại. Trả lời + comment code bằng **tiếng Việt**. **Chỉ commit khi được yêu cầu**, footer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## 0. Mục tiêu

Cho phép người dùng **duplicate (nhân bản) một Meta Campaign Request đã có** thành một request mới ở trạng thái **Draft**, **sửa được toàn bộ mọi tầng** (campaign → ad set → ad → creative) trước khi execute. Khi execute, request mới tạo **campaign + ad set + ad MỚI** trên Meta, nhưng **tái sử dụng creative/asset** của request nguồn để tiết kiệm thời gian và chi phí upload.

**Bối cảnh nghiệp vụ:** user thường chạy nhiều campaign cùng một bộ creative (test budget/targeting khác nhau). Hiện tại phải tạo lại request từ đầu, upload lại asset, tạo lại creative → chậm và tốn. Duplicate giải quyết việc này.

### Các quyết định sản phẩm đã chốt (KHÔNG được đổi)

1. **Khoá cùng ad account.** Request duplicate **giữ nguyên** `MetaAdAccountId` / `ExecutionMetaIntegrationId` / `PaidMediaAppBindingId` của nguồn. Lý do: `creative_id`, `image_hash`, `video_id`, `playable_asset_id` đều **scoped theo ad account** — không cross-account được. UI khoá (disabled) field ad account trên Draft duplicate.
2. **Trạng thái sau duplicate = `Draft`.** Đi qua nguyên lifecycle hiện có: Draft → (submit/auto-approve) → Approved → Execute. Cho phép sửa rồi mới execute.
3. **Tái dùng creative theo 2 tầng (xem mục 2).**
4. **Tái dùng asset "from meta"** (image_hash/video_id) cho image/video; **giữ `UploadedAssetId`** cho playable.

---

## 1. KIẾN THỨC NỀN — đọc kỹ trước khi code

### 1.1 Mô hình hiện tại (đã verify trong code)

- Một `MetaCampaignRequest` (`backend/MediationPro.Core/Entities/MetaCampaignRequest.cs`) chứa toàn bộ cấu hình ở `PayloadJson` (serialize của `CreateMetaCampaignRequestDto`). Khi execute, `MetaCampaignExecutionService.ExecuteAsync` tạo campaign → ad set → các variant (creative + ad).
- **Creative thường** (`SINGLE_IMAGE / SINGLE_VIDEO / CAROUSEL_IMAGE / PLAYABLE / EXISTING_POST`): `EnsureCreativeAsync` gọi `POST /adcreatives` → nhận **`creative_id` standalone**, lưu vào bảng `MetaCreative.ExternalCreativeId` (gắn `CreatedFromRequestId` + `SequenceNumber`). Ad được tạo bằng `BuildAdPayload` tham chiếu `creative: { creative_id }`.
  - File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs` — `EnsureCreativeAsync` (~dòng 600), `BuildAdPayload` (~dòng 1941).
- **Creative FLEXIBLE** (Advantage+): KHÔNG tạo `/adcreatives` riêng. Creative được **nhúng inline** trong `POST /ads` (`object_story_spec` + `creative_asset_groups_spec`) qua `BuildFlexibleAdPayloadAsync` (~dòng 1812). Hệ thống **không lưu** `creative_id` cho flexible (chỉ ghi op-log `Skipped`, reason `flexible_inline_creative`). ⇒ **flexible KHÔNG share được creative_id**, nhưng **share được asset**.

### 1.2 `creative_id` reuse trên Meta

Một `creative_id` **dùng chung được cho nhiều ad ở nhiều ad set/campaign khác nhau** trong **cùng ad account**. Tạo ad mới với `creative: { creative_id: "<id cũ>" }` là hợp lệ và không tốn thêm call tạo creative. Đây là nền tảng của "share creative".

### 1.3 Asset source modes (đã có sẵn — KHÔNG cần thêm mode mới cho image/video)

`MetaCreativeMediaSourceDto` (`backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`):
```csharp
public string Mode;          // "uploaded_asset" | (direct) | ...
public string? ImageHash;    // direct image reference
public string? ImageUrl;
public string? VideoId;      // direct video reference
public int? UploadedAssetId; // tham chiếu MetaRequestAsset trong DB
```
Trong `MetaCampaignExecutionService`:
- `ResolveImageReferenceAsync` (~dòng 1960): mode `uploaded_asset` → resolve qua `GetReadyImageHashAsync`; **nếu `ImageHash` có giá trị → dùng thẳng** (đây là "from meta"). Tương tự `ImageUrl`.
- `ResolveVideoIdAsync` (~dòng 1990): mode `uploaded_asset` → `GetReadyVideoIdAsync`; **nếu `VideoId` có giá trị → dùng thẳng**.
- `ResolvePlayableAssetIdAsync` (~dòng 2009): **chỉ** hỗ trợ mode `uploaded_asset` → `GetReadyPlayableAssetIdAsync`. **Không có direct mode** cho `playable_asset_id`.

⇒ Image/Video reuse "from meta" = set `ImageHash`/`VideoId` trực tiếp, bỏ qua upload + prepare. Playable reuse = **giữ nguyên `UploadedAssetId`** trỏ cùng `MetaRequestAsset`; lúc execute `GetReadyPlayableAssetIdAsync` re-resolve ra `playable_asset_id` đã prepare (idempotent, file MinIO còn nguyên).

### 1.4 Nguồn giá trị asset đã prepare

Sau khi request nguồn đã execute (hoặc đã prepare xong), mỗi asset có `MetaImageHash` / `MetaVideoId` / `MetaPlayableAssetId` trong asset-preparation. Lấy qua:
- `IMetaAssetPreparationService.GetStatusAsync(orgId, userId, requestId, ct)` → `MetaAssetPreparationResponseDto { IsReadyForExecution, Assets: [ { RequestAssetId, SlotKey, Kind, Status, MetaImageHash, MetaVideoId, MetaPlayableAssetId, ... } ] }`.
- File interface: `backend/MediationPro.Core/Interfaces/IMetaAssetPreparationService.cs`; DTO: `MetaAssetPreparationDto` trong `MetaCampaignRequestDtos.cs`.

---

## 2. MÔ HÌNH TÁI SỬ DỤNG — 2 TẦNG

Khi duplicate, mỗi **variant** được khởi tạo theo bảng dưới. **Mặc định ưu tiên share ở tầng cao nhất có thể.**

| Tình huống variant nguồn | Tầng reuse | Cách khởi tạo trong Draft mới |
|---|---|---|
| Creative thường (non-flexible) **đã có `ExternalCreativeId`** | **creative_id** | Creative → mode `EXISTING_CREATIVE`, mang `ExternalCreativeId` + `SourceMetaCreativeId`. Execute: **bỏ qua** `/adcreatives`, ad trỏ thẳng creative_id cũ. Read-only trên UI. |
| Flexible, **hoặc** non-flexible nhưng chưa có `ExternalCreativeId` | **asset "from meta"** | Giữ nguyên cấu trúc creative (Type giữ nguyên: FLEXIBLE/SINGLE_*), nhưng **rewrite mỗi media source** sang reference đã prepare:<br>• image → `{ ImageHash }`<br>• video → `{ VideoId }`<br>• playable → **giữ `UploadedAssetId`**. Execute: build creative MỚI nhưng **không upload lại** asset. |

### Quy tắc chuyển mode khi user sửa creative (frontend)

- Draft duplicate khởi tạo creative ở mode reuse (creative_id) khi đủ điều kiện.
- **Ngay khi user sửa BẤT KỲ field creative nào** (message/headline/CTA/đổi/thêm/bớt asset…) với một variant đang ở `EXISTING_CREATIVE` → **tự chuyển variant đó sang "tạo creative mới"** bằng cách rehydrate creative gốc về dạng SINGLE_*/FLEXIBLE với asset "from meta" (image_hash/video_id) + playable giữ `UploadedAssetId`. Từ đó execute sẽ build creative mới.
- User vẫn **thêm asset mới** (upload thường, mode `uploaded_asset`) trộn lẫn với asset "from meta" thoải mái.

---

## 3. SCOPE BACKEND

### Phần A — DTO creative type `EXISTING_CREATIVE`

File: `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`

1. Thêm DTO:
```csharp
public class MetaExistingCreativeDraftDto
{
    public string? ExternalCreativeId { get; set; }   // creative_id Meta để reuse
    public int? SourceMetaCreativeId { get; set; }     // truy vết về MetaCreative gốc (bookkeeping)
    public string? Name { get; set; }                  // tên creative gốc, để preview read-only
}
```
2. Trong `MetaCreativeDraftDto`: thêm property `public MetaExistingCreativeDraftDto? ExistingCreative { get; set; }` (đặt cạnh `ExistingPost`). Type mới: `"EXISTING_CREATIVE"`.

### Phần B — Cột truy vết nguồn duplicate (migration)

File entity: `backend/MediationPro.Core/Entities/MetaCampaignRequest.cs`
- Thêm `public long? DuplicatedFromRequestId { get; set; }` + navigation optional (không bắt buộc nav).

Cấu hình EF: `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs` — map cột `duplicated_from_request_id` (nullable, không FK cascade; chỉ index thường để truy vết).

**Migration:** từ repo root, theo CLAUDE.md:
```
cd backend/MediationPro.Api
dotnet ef migrations add AddMetaCampaignRequestDuplicatedFrom --project ..\MediationPro.Infrastructure --startup-project .
```
- ⚠️ Commit **cả `.cs` lẫn `.Designer.cs`**.
- Cột nullable, không cần backfill.

### Phần C — Service duplicate

Tạo logic dựng payload Draft mới. Có thể đặt trong **một service mới** `IMetaCampaignDuplicateRequestService` / `MetaCampaignDuplicateRequestService` (KHÁC hẳn `MetaCampaignDuplicateService` hiện có — service cũ là deep-copy live campaign qua `/copies`, **không tái dùng**). Đăng ký DI trong `backend/MediationPro.Api/Program.cs`.

Đầu vào: `(organizationId, userId, sourceRequestId)`. Các bước:

1. Load request nguồn `includeDetails: true` qua `IMetaCampaignRequestRepository.GetByIdAsync`. Không thấy → throw/NotFound.
2. **Điều kiện nguồn:** chỉ cho duplicate khi nguồn ở trạng thái `Completed` (đã execute, đã có creative/asset prepare). Nếu chưa → trả lỗi rõ "Chỉ duplicate được request đã execute thành công (Completed)." *(Lý do: cần `ExternalCreativeId`/meta hash để reuse.)*
3. Deserialize payload nguồn: `MetaAdsMapper.DeserializePayload(request)` → `CreateMetaCampaignRequestDto`.
4. Lấy creatives nguồn theo sequence: `IMetaCampaignRepository.GetCreativesByRequestIdAsync` → map `SequenceNumber → MetaCreative` (lấy `ExternalCreativeId`, `Id`, `Name`).
5. Lấy asset-preparation nguồn: `IMetaAssetPreparationService.GetStatusAsync` → map theo `SlotKey`/`RequestAssetId` để biết `MetaImageHash`/`MetaVideoId` đã prepare.
6. Với **mỗi variant** trong payload, dựng creative theo bảng mục 2:
   - **Non-flexible & có `ExternalCreativeId`:** thay `variant.Creative` thành:
     ```csharp
     new MetaCreativeDraftDto {
       Type = "EXISTING_CREATIVE",
       Common = variant.Creative.Common,         // giữ page_id/instagram_actor_id
       ExistingCreative = new() {
         ExternalCreativeId = creative.ExternalCreativeId,
         SourceMetaCreativeId = creative.Id,
         Name = creative.Name
       }
     }
     ```
   - **Flexible hoặc non-flexible không có creative_id:** **giữ nguyên `variant.Creative.Type`** và cấu trúc, nhưng **rewrite media source** trong creative đó:
     - Mọi `MetaCreativeMediaSourceDto` là **image** → set `{ Mode = "meta", ImageHash = <MetaImageHash đã prepare>, UploadedAssetId = null }`.
     - Mọi source là **video** → set `{ Mode = "meta", VideoId = <MetaVideoId đã prepare>, UploadedAssetId = null }`.
     - Mọi source là **playable** → **GIỮ NGUYÊN** `{ Mode = "uploaded_asset", UploadedAssetId = <giữ nguyên> }`.
     - Thumbnail của video flexible: rewrite về `{ ImageHash }` nếu đã có hash; nếu là playable thumbnail thì xử lý như image.
   - Phải xác định source nào là image/video/playable: dựa vào vị trí trong DTO (SingleImage.Image, SingleVideo.Video/Thumbnail, Carousel.Cards[].Image, Flexible.Assets[].{Image,Video,Thumbnail}, Playable.{PlayableSource,LeadInVideo,Thumbnail}). Map `RequestAssetId`/`SlotKey` từ asset-preparation để lấy đúng hash/id.
7. Dựng entity mới:
   ```csharp
   var dup = new MetaCampaignRequest {
     OrganizationId, MetaAdAccountId = src.MetaAdAccountId,
     ExecutionMetaIntegrationId = src.ExecutionMetaIntegrationId,
     AppRowId = src.AppRowId, MetaAppMappingId = null,
     PaidMediaAppBindingId = src.PaidMediaAppBindingId,
     CampaignName = src.CampaignName + " (Copy)",   // hoặc theo quy ước đặt tên, xem dưới
     Objective = src.Objective,
     PayloadJson = JsonSerializer.Serialize(newPayload, MetaValueNormalizer.JsonOptions),
     Status = MetaValueNormalizer.ToStorageValue(MetaRequestStatus.Draft),
     IdempotencyKey = Guid.NewGuid().ToString("N"),   // BẮT BUỘC mới, tránh 409
     DuplicatedFromRequestId = src.Id,
     RequestedBy = userId, CreatedAt = now, UpdatedAt = now
   };
   ```
   - Đổi tên trong payload tương ứng: `newPayload.Campaign.Name`, có thể thêm hậu tố " (Copy)". AdSet/Ad name giữ nguyên hoặc thêm hậu tố — **giữ đơn giản: chỉ campaign name + " (Copy)"**, còn lại để user tự sửa.
   - **KHÔNG** copy: `Status`, `ApprovedBy/At`, `RejectedBy/At`, `ExecutedBy/At`, `FailedAt`, `FailureSummary`, `CorrelationId`, `ValidationErrorsJson`, `SubmittedAt`.
8. Lưu qua repository. Sau đó chạy validate (`IMetaCampaignValidationService.ValidateAsync`) để set `ValidationErrorsJson` như luồng CreateDraft.
9. **Asset preparation cho Draft mới:**
   - Image/video đã ở dạng direct (`ImageHash`/`VideoId`) → **không cần** queue prepare (đã sẵn sàng).
   - Playable (mode `uploaded_asset`) → **gọi** `TryQueueAssetPreparationAsync` để đảm bảo playable_asset_id sẵn sàng cho ad account (idempotent — nếu đã prepare trên cùng account sẽ reuse cache).
   - Đơn giản nhất: gọi `_assetPreparationService.QueueForRequestAsync` như CreateDraft; nó sẽ no-op với slot đã có hash và chỉ chuẩn bị playable còn thiếu. **Xác nhận hành vi này khi đọc `MetaAssetPreparationService`**, nếu nó cố prepare lại cả image/video thì chỉ queue cho slot playable.

### Phần D — Endpoint

File: `backend/MediationPro.Api/Controllers/MetaCampaignRequestsController.cs`

Thêm:
```csharp
[HttpPost("{id:long}/duplicate")]
public async Task<ActionResult<MetaCampaignRequestDetailDto>> Duplicate(long id, CancellationToken cancellationToken)
```
- Quyền: `FnCreate` (`HasScreenFunctionAsync(userId, ScreenMetaRequests, FnCreate)`).
- Kiểm tra `HasRequestViewAccessAsync` trên request nguồn (ad account + app access).
- Gọi service duplicate → trả `201` + `BuildDetailAsync(newEntity)`.
- Log activity: thêm event type mới `MetaCampaignRequestDuplicated` trong `backend/MediationPro.Core/Constants/ActivityLogEventTypes.cs`; summary "Duplicated Meta campaign request from #{sourceId}.", metadata `{ sourceRequestId, newRequestId }`.
- Xử lý lỗi điều kiện (nguồn chưa Completed…) → `BadRequest` message tiếng Việt rõ ràng.

### Phần E — Execution: nhánh `EXISTING_CREATIVE`

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`

1. `ExecuteVariantSequentialAsync` (~dòng 717): thêm nhánh — nếu `variant.Creative.Type == "EXISTING_CREATIVE"`:
   - **KHÔNG** gọi `EnsureCreativeAsync`. Ghi op-log `Creative / Skipped`, action `create_creative`, reason `reuse_existing_creative`, kèm `externalCreativeId` (theo mẫu `AddFlexibleCreativeSkipLogAsync`).
   - Tạo `MetaCreative? creative` "ảo" để truyền xuống `EnsureAdAsync`: dùng `ExternalCreativeId` từ `variant.Creative.ExistingCreative.ExternalCreativeId`. Vì `EnsureAdAsync` (non-flexible) cần `creative.ExternalCreativeId` → có thể nạp `MetaCreative` gốc theo `SourceMetaCreativeId`, hoặc tạo object tạm chỉ set `ExternalCreativeId`. **Lưu ý `MetaAd.MetaCreativeId`**: set = `SourceMetaCreativeId` (chia sẻ row creative nguồn, không nhân bản). Nếu để null cũng chấp nhận nhưng nên link để campaign-detail hiển thị đúng.
2. `EnsureAdAsync` (~dòng 667): với `EXISTING_CREATIVE` đi theo nhánh **non-flexible** → `BuildAdPayload(variantPayload, adSet.ExternalAdSetId, externalCreativeId)`. `IsFlexibleCreative` phải trả `false` cho type này (kiểm tra `IsFlexibleCreative` ~dòng 1589 — đảm bảo chỉ true khi Type == "FLEXIBLE").
3. `BuildCreativePayloadAsync` (~dòng 1643): KHÔNG cần nhánh mới (vì không tạo creative). Nhưng để an toàn, nếu `EXISTING_CREATIVE` lọt vào đây thì throw rõ ràng "EXISTING_CREATIVE không tạo adcreative".

### Phần F — Validation

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs` (và/hoặc `MetaAdSetDraftValidationService`).

- Nếu payload chứa bất kỳ variant `EXISTING_CREATIVE`:
  - Bắt buộc `ExternalCreativeId` không rỗng → lỗi nếu thiếu.
  - **Chặn đổi `MetaAdAccountId`** so với khi duplicate: vì creative_id không cross-account. Cách thực thi: ở `UpdateDraft` (controller, ~dòng 174) nếu payload mới có `EXISTING_CREATIVE` mà `request.MetaAdAccountId != entity.MetaAdAccountId` → `BadRequest` "Không thể đổi ad account khi đang dùng lại creative có sẵn. Hãy chỉnh sửa creative để tạo bản mới nếu muốn đổi account." (Đồng thời UI khoá field — xem frontend.)
- Đảm bảo các validate hiện có (objective, bid strategy, geo…) vẫn chạy bình thường trên payload duplicate.

### Phần G — Mapper / Normalize

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs`
- `NormalizePayload`: đảm bảo không xoá mất `ExistingCreative` khi normalize; type `EXISTING_CREATIVE` được giữ. Kiểm tra `DeserializePayload` round-trip ok.

---

## 4. SCOPE FRONTEND

Thư mục: `frontend/components/meta-ads/`

### Phần H — Nút Duplicate + API client

- `frontend/lib/api/meta-ads.ts`: thêm `metaRequestsApi.duplicate(id)` → `POST /api/v1/meta-campaign-requests/{id}/duplicate`.
- `frontend/components/meta-ads/requests/request-detail-content.tsx`: thêm nút **"Duplicate"** (icon copy) — gọi API → toast thành công → `router.push` sang trang edit Draft mới (`/meta-ads/requests/{newId}/edit` hoặc route hiện hành của edit; xem route trong `request-detail-content` / `create-request-content`). Invalidate cache list.
- `frontend/components/meta-ads/requests/request-list-content.tsx`: thêm action "Duplicate" ở menu mỗi hàng (chỉ hiện khi request `Completed` và user có quyền create).

### Phần I — Creative section: mode `EXISTING_CREATIVE`

- `frontend/types/meta-ads.ts`: thêm `"EXISTING_CREATIVE"` vào union creative type; thêm shape `ExistingCreative` ({ externalCreativeId, sourceMetaCreativeId, name }).
- `frontend/lib/meta-ads/mappers.ts`: map `EXISTING_CREATIVE` ↔ form state (cả `detailDtoToFormState`, `formStateToCreateDto`, `formStateToUpdateDto`).
- `frontend/components/meta-ads/create-request/section-creative.tsx`:
  - Khi variant ở mode `EXISTING_CREATIVE`: hiển thị **read-only preview** (tên creative gốc + badge "Dùng lại creative có sẵn (#creativeId)") + nút **"Chỉnh sửa creative"**.
  - Bấm "Chỉnh sửa creative" → **rehydrate** về creative editable: chuyển sang type thật của creative gốc với asset ở dạng "from meta" (đã có image_hash/video_id) / playable giữ uploadedAssetId, mở khoá sửa. *(Cần payload nguồn mang đủ thông tin để rehydrate — backend nên kèm cấu trúc creative gốc trong `ExistingCreative` hoặc giữ field cũ; chốt: backend khi tạo `EXISTING_CREATIVE` vẫn copy kèm các text/asset gốc vào một field phụ để FE rehydrate, hoặc FE gọi lại detail của request nguồn. **Cách đơn giản: khi bấm "Chỉnh sửa creative", FE gọi API duplicate-source detail để lấy creative gốc dạng editable.** Người thực thi chọn cách gọn nhất, miễn rehydrate đúng.)*
  - Asset "from meta" (image_hash/video_id) hiển thị thumbnail/preview qua đường dẫn Meta hoặc preview có sẵn; cho phép xoá/thêm.
- Khoá (disabled) field **Ad Account** trong `section-account-app.tsx` khi Draft có nguồn duplicate **và** còn variant `EXISTING_CREATIVE` (đọc cờ từ payload). Tooltip giải thích.

### Phần J — Hiển thị nguồn duplicate (tuỳ chọn, nên có)

- Trong `request-detail-content.tsx`: nếu `duplicatedFromRequestId` có giá trị, hiển thị badge "Nhân bản từ #{id}" link sang request nguồn. Thêm field `DuplicatedFromRequestId` vào `MetaCampaignRequestDetailDto` + mapper `ToDetailDto`.

---

## 5. EDGE CASES & QUY TẮC BẮT BUỘC

1. **Idempotency key mới** mỗi lần duplicate — tuyệt đối không copy key nguồn (sẽ `409` ở `GetByIdempotencyKeyAsync`).
2. **Chỉ duplicate request `Completed`.** Trạng thái khác → chặn với message tiếng Việt.
3. **Cùng ad account** — chặn đổi account khi còn `EXISTING_CREATIVE` (mục F).
4. **Multi-variant:** map creative/asset theo `SequenceNumber`. Variant nào không có `ExternalCreativeId` (vd flexible) → đi nhánh asset "from meta". Trộn lẫn được: variant 1 reuse creative_id, variant 2 flexible reuse asset.
5. **Playable:** giữ `UploadedAssetId`; **không** tự đổi sang direct mode. Execute re-resolve `playable_asset_id` (idempotent). Nếu `MetaRequestAsset` gốc đã bị xoá khỏi MinIO → prepare sẽ lỗi; bắt lỗi và báo rõ "Asset playable gốc không còn, cần upload lại."
6. **Op-log nhất quán:** reuse creative ghi `Creative/Skipped` reason `reuse_existing_creative`; reuse asset không cần log riêng (đi qua resolve direct, không upload).
7. **`MetaCreative` nguồn không nhân bản** — ad mới chỉ link `MetaCreativeId = SourceMetaCreativeId`. Lưu ý truy vấn campaign-detail có thể hiện 1 creative cho nhiều ad ⇒ chấp nhận (đúng bản chất share).
8. **Không phá luồng cũ:** request tạo mới bình thường (không duplicate) phải hoạt động y như trước. `EXISTING_CREATIVE` chỉ xuất hiện qua duplicate.

---

## 6. TIÊU CHÍ HOÀN THÀNH (DEFINITION OF DONE)

1. `POST /api/v1/meta-campaign-requests/{id}/duplicate` tạo Draft mới từ request `Completed`, giữ cùng ad account, status `Draft`, idempotency key mới, `DuplicatedFromRequestId` set đúng.
2. Draft mới **sửa được toàn bộ** campaign/adset/ad/creative qua UI hiện có.
3. Variant non-flexible có creative_id → execute **không** gọi `/adcreatives`, ad trỏ creative_id cũ (kiểm chứng qua op-log `Skipped` + ad tạo thành công).
4. Variant flexible (vd 4 video) → 4 asset xuất hiện dạng "from meta", execute **không upload lại** video (kiểm chứng: không có call `/advideos` cho các asset đó), tạo creative flexible mới + ad mới.
5. Playable → giữ `UploadedAssetId`, execute re-resolve `playable_asset_id` thành công, không upload lại file HTML.
6. User sửa creative của variant `EXISTING_CREATIVE` → tự chuyển sang "tạo creative mới", execute build creative mới với asset "from meta".
7. Chặn đổi ad account khi còn `EXISTING_CREATIVE`.
8. Build pass: `dotnet build backend/MediationPro.sln` và `cd frontend && pnpm build` + `pnpm lint`. Migration apply sạch.
9. Bổ sung/cập nhật test:
   - `backend/MediationPro.Infrastructure.UnitTests/MetaAds/MetaCampaignExecutionServiceTests.cs`: case execute với `EXISTING_CREATIVE` skip tạo creative.
   - Test cho service duplicate: dựng payload đúng cho các tổ hợp (creative_id / flexible asset / playable).

---

## 7. GỢI Ý THỨ TỰ THỰC HIỆN

1. Phần A (DTO) → B (entity + migration) → G (mapper round-trip).
2. Phần C (service duplicate) + D (endpoint) → test thủ công tạo Draft.
3. Phần E (execution nhánh EXISTING_CREATIVE) + F (validation).
4. Frontend H → I → J.
5. Test + build + lint.

> **Lưu ý đọc thêm trước khi code:** `MetaCampaignExecutionService.cs` (toàn bộ luồng execute & resolve asset), `MetaCampaignRequestsController.cs` (lifecycle CreateDraft/UpdateDraft), `MetaAssetPreparationService` (hành vi queue/prepare idempotent theo ad account), `frontend/components/meta-ads/create-request/*` (form state & mappers). Prompt 27 (`27-PROMPT-META-ASSET-PREPARATION-BEFORE-EXECUTE.md`) và 43 (`43-PROMPT-PLAYABLE-SOURCE.md`) cung cấp bối cảnh asset/playable.
