# 27 - PROMPT: Meta Asset Preparation Before Execute

> Trang thai: PARTIALLY IMPLEMENTED. Core BE (entity `MetaUploadedAsset`, migration `20260611110000_AddMetaUploadedAssets`, `MetaAssetPreparationService`, gate trong `MetaCampaignExecutionService`, 3 endpoint trong `MetaCampaignRequestsController`) + UI status o **create/edit** da xong. Phan **ADDENDUM A** (muc 6 Frontend) la phan CHUA lam: hien trang thai upload o man Request Detail.
> Muc tieu: image/video/thumbnail upload tu local phai duoc upload san len Meta ad account va san sang truoc khi cho execute campaign.

## Boi Canh

Hien tai man `/meta-ads/create-request` cho user upload image/video vao he thong Mediation Pro truoc. Asset duoc luu noi bo va duoc tham chieu bang `uploaded_asset` trong request draft.

Khi `Execute`, `MetaCampaignExecutionService` moi resolve `uploaded_asset` bang cach upload len Meta:

- image/thumbnail: `/{ad_account}/adimages` -> `image_hash`
- video: `/{ad_account}/advideos` -> `video_id`

Voi request co nhieu video/variant, execute co the cham, de gap timeout/rate limit, hoac tao orphan/duplicate neu loi xay ra giua chung. Nghiep vu moi yeu cau:

- User van co the create draft, edit, submit, approve khi asset chua san sang.
- Video/image/thumbnail upload tu local phai duoc add vao queue upload len Meta sau khi co du thong tin ad account.
- Den buoc execute campaign, bat buoc tat ca asset can dung phai `ready` tren Meta.
- Man create/edit phai hien thi trang thai asset da upload len Meta thanh cong hay chua.

## Muc Tieu

Tach viec "soan request" khoi viec "prepare creative assets tren Meta".

1. Them store/cache mapping asset noi bo -> Meta asset theo tung Meta ad account.
2. Them Hangfire job/service upload image/video/thumbnail len Meta truoc khi execute.
3. Execute gate: khong cho execute neu required asset chua `ready`.
4. UI create/edit hien thi trang thai preparation cua tung asset va cho retry khi failed.

## Pham Vi Backend

### 1. Them bang `meta_uploaded_assets`

Them entity + migration trong `backend/MediationPro.Infrastructure`. Day la **Postgres master DB** (khong phai StarRocks - khong dinh `STARROCKS-DDL-PITFALLS`). Commit ca `*.cs` lan `*.Designer.cs` cua migration (theo CLAUDE.md).

De xuat columns:

```text
id bigint pk
organization_id uuid not null
meta_ad_account_id int not null                 -- MetaAdAccount.Id (int) - row id trong meta_ad_accounts
meta_request_asset_id int not null              -- MetaRequestAsset.Id (int) - asset noi bo user upload
kind text not null                              -- image | video
status text not null                            -- pending | uploading | processing | ready | failed
meta_image_hash text null
meta_video_id text null
error_message text null
attempt_count int not null default 0
last_attempt_at timestamptz null
last_checked_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

Indexes/constraints:

```text
unique (organization_id, meta_ad_account_id, meta_request_asset_id)
index (organization_id, status)
index (organization_id, meta_video_id)
index (organization_id, meta_image_hash)
```

Ghi chu KIEU DU LIEU (da doi chieu code - BAT BUOC dung dung):

- `MetaRequestAsset.Id` = **int**, `MetaAdAccount.Id` = **int**, `MetaCampaignRequest.Id` = **long**, `MetaCampaignRequest.MetaAdAccountId` = **int**.
- => FK `meta_request_asset_id` va `meta_ad_account_id` deu la **int** (KHONG phai bigint). `id` cua bang moi `meta_uploaded_assets` co the la `bigint` (PK rieng).
- => DTO/service: `requestId` la **long**; `requestAssetId` va `metaAdAccountId` la **int**. (Xem muc 2/3 da chinh.)

Ghi chu nghiep vu:

- Asset upload len Meta la theo ad account, nen cung mot `meta_request_asset_id` neu dung voi account khac phai co row khac.
- `meta_ad_account_id` la DB row id (`int`) cua `meta_ad_accounts` de join permission/token; khong dung external account id o cot nay.

### 2. Them DTO/API status

Them DTO, vi du:

```csharp
public sealed record MetaAssetPreparationDto(
    int RequestAssetId,                         // MetaRequestAsset.Id (int)
    string SlotKey,
    string Kind,
    string Status,
    int? MetaAdAccountId,                        // MetaAdAccount.Id (int)
    string? MetaImageHash,
    string? MetaVideoId,
    string? ErrorMessage,
    int AttemptCount,
    DateTimeOffset? LastAttemptAt,
    DateTimeOffset? LastCheckedAt);

public sealed record MetaAssetPreparationResponseDto(
    long RequestId,                             // MetaCampaignRequest.Id (long)
    bool IsReadyForExecution,
    IReadOnlyList<MetaAssetPreparationDto> Assets);
```

API de xuat trong `MetaCampaignRequestsController`:

```http
GET  /api/v1/meta-campaign-requests/{id}/asset-preparation
POST /api/v1/meta-campaign-requests/{id}/asset-preparation/queue
POST /api/v1/meta-campaign-requests/assets/{assetId}/meta-upload/retry?metaAdAccountId={id}
```

`{id}` (request) la **long**; `{assetId}` va `metaAdAccountId` la **int**.

Quyen:

- Dung permission hien tai cua Meta request create/edit/view.
- Retry/queue nen yeu cau user co access request va Meta ad account lien quan.
- Khong noi rong quyen ad account.

### 3. Them service `IMetaAssetPreparationService`

Vi tri de xuat:

- Interface trong `MediationPro.Core/Interfaces` hoac `MediationPro.Core/MetaAds` neu codebase co pattern tuong tu.
- Implementation trong `MediationPro.Infrastructure/Services/MetaAds`.

Methods de xuat:

```csharp
Task<MetaAssetPreparationResponseDto> GetStatusAsync(Guid organizationId, Guid userId, long requestId, CancellationToken ct);
Task QueueForRequestAsync(Guid organizationId, Guid userId, long requestId, CancellationToken ct);
Task QueueAssetAsync(Guid organizationId, int metaAdAccountId, int requestAssetId, CancellationToken ct);
Task<MetaAssetReadinessResult> ValidateReadyForExecutionAsync(Guid organizationId, long requestId, CancellationToken ct);
Task ProcessOneAsync(long metaUploadedAssetId, CancellationToken ct);   // metaUploadedAssetId = PK bang moi (bigint)
```

KIEU: `requestId` la **long**; `metaAdAccountId`/`requestAssetId` la **int**; `metaUploadedAssetId` la **long** (PK bang `meta_uploaded_assets`).

Responsibilities:

- Parse request payload/draft de tim tat ca `uploaded_asset` required:
  - Single media image: image asset.
  - Single media video: video asset + thumbnail asset neu co/required.
  - Additional variants: tat ca image/video/thumbnail theo variant.
  - Carousel cards: card images.
  - Flexible assets: images, videos, thumbnails.
- Bo qua media `meta_ref` da co `image_hash/video_id` tu Meta library.
- Bo qua `external_url` neu execute logic van chap nhan URL.
- Upsert row `meta_uploaded_assets` voi status `pending` neu chua co.
- Enqueue Hangfire job upload tung asset.
- Neu user doi Meta ad account, queue lai theo account moi.

**Gate theo DUNG ad account hien tai (BAT BUOC):** `ValidateReadyForExecutionAsync` va `GetStatusAsync` chi tinh ready cho row khop `meta_ad_account_id == request.MetaAdAccountId` (account dang chon cua request). Asset ready o account A nhung request dang tro account B => coi nhu CHUA ready. Unique key da co `meta_ad_account_id`, nhung phai loc dung khi validate, dung gop het moi account.

**Dedupe enqueue (BAT BUOC):** chi enqueue job khi status la `pending` hoac `failed`. Transition `pending -> uploading` (hoac dung Hangfire dedup key theo `meta_uploaded_assets.id`) lam guard de queue endpoint goi nhieu lan / polling khong tao job trung va khong spam Meta.

### 4. Them Hangfire job upload asset len Meta

Them job, vi du `MetaAssetPreparationJob` trong `MediationPro.Jobs` hoac Infrastructure theo pattern hien co.

Flow image/thumbnail:

1. Set status `uploading`, increment attempt.
2. Doc file tu **MinIO** theo `MetaRequestAsset.StorageProvider/Bucket/ObjectKey` (xem `docs/72-MINIO-OBJECT-PATH-GUIDE.md`), dung MinIO client hien co - KHONG gia dinh local filesystem.
3. POST `/{accountPath}/adimages`.
4. Lay `image_hash`.
5. Set `ready`.

Flow video:

1. Set status `uploading`, increment attempt.
2. POST `/{accountPath}/advideos`.
3. Lay `video_id`.
4. Set `processing` hoac `ready` tuy theo Meta response.
5. Poll/verify video status neu Marketing API tra trang thai xu ly.
6. Chi set `ready` khi video usable cho ad creative.

Luu y:

- Neu Meta API version trong code hien tai chua co poll status, giai doan dau co the set `ready` sau khi co `video_id`, nhung can TODO ro rang va log warning. Tuy nhien nghiep vu mong muon video that su san sang, nen uu tien poll neu co endpoint/ref service san co.
- Retry co backoff, khong spam Meta.
- Log correlation/request id.
- Khong de exception mot asset lam hong batch cac asset khac.
- **Staleness/expiry:** neu luc execute resolver nhan loi tu Meta kieu invalid/expired `image_hash`/`video_id`, mark row ve `failed` + cho re-queue, KHONG de request kẹt ready vinh vien voi hash da chet. (Phase dau co the coi hash/video_id la on dinh, nhung phai co duong thoat nay.)

### 5. Sua `MetaCampaignExecutionService`

Vi tri hien tai: resolver `ResolveImageReferenceAsync` (~dong 1920) va `ResolveVideoIdAsync` (~dong 1950) dang goi `UploadImageAssetToMetaAsync`/`UploadVideoAssetToMetaAsync` (upload truc tiep tai execute time). Day la cho phai doi.

Truoc khi tao campaign/ad set/ad/creative:

1. Goi `ValidateReadyForExecutionAsync` (loc theo `request.MetaAdAccountId` hien tai - xem gate-per-account o muc 3).
2. Neu co asset chua ready:
   - Throw/return loi nghiep vu ro rang, vi du `Meta assets are not ready for execution.`
   - Include danh sach slot/file/status/error de UI/debug biet can retry/cho.
   - Tuyet doi khong bat dau tao campaign/ad set/ad neu asset chua ready.

Trong resolver:

- `ResolveImageReferenceAsync(...)` voi `uploaded_asset`:
  - Khong upload truc tiep len Meta nua.
  - Doc `meta_uploaded_assets` ready row va tra `ImageReference` tu `meta_image_hash`.
- `ResolveVideoIdAsync(...)` voi `uploaded_asset`:
  - Khong upload truc tiep len Meta nua.
  - Doc ready row va tra `meta_video_id`.

Co the giu fallback upload truc tiep sau feature flag trong giai doan rollout, nhung default nen la strict ready gate.

### 6. Queue asset khi nao?

Bat buoc:

- Khi create/update draft co `uploaded_asset` va request co `metaAdAccountId`.
- Khi user goi manual `POST /asset-preparation/queue`.
- Khi retry asset failed.

Khuyen nghi:

- Sau upload local trong UI, neu da co draft id + ad account id thi goi queue endpoint.
- Sau Save draft/update draft thanh cong thi queue toan bo request.

## Pham Vi Frontend

Files du kien:

- `frontend/lib/api/meta-ads.ts`
- `frontend/types/meta-ads.ts`
- `frontend/components/meta-ads/create-request/create-request-content.tsx`
- `frontend/components/meta-ads/create-request/section-creative.tsx`
- `frontend/components/meta-ads/requests/request-detail-content.tsx` (ADDENDUM A - muc 6)

### 1. Them API client + types

Types de xuat:

```ts
export type MetaAssetPreparationStatus = "pending" | "uploading" | "processing" | "ready" | "failed"

export interface MetaAssetPreparationDto {
  requestAssetId: number
  slotKey: string
  kind: "image" | "video"
  status: MetaAssetPreparationStatus
  metaAdAccountId?: number | null
  metaImageHash?: string | null
  metaVideoId?: string | null
  errorMessage?: string | null
  attemptCount: number
  lastAttemptAt?: string | null
  lastCheckedAt?: string | null
}

export interface MetaAssetPreparationResponseDto {
  requestId: number
  isReadyForExecution: boolean
  assets: MetaAssetPreparationDto[]
}
```

API methods:

```ts
metaRequestsApi.getAssetPreparation(requestId)
metaRequestsApi.queueAssetPreparation(requestId)
metaRequestsApi.retryAssetMetaUpload(assetId, metaAdAccountId)
```

### 2. Hien thi status trong create/edit media cards

Voi moi selected `uploaded_asset`:

- Hien badge:
  - `Waiting for ad account`
  - `Queued`
  - `Uploading to Meta`
  - `Processing video`
  - `Ready on Meta`
  - `Failed`
- Neu failed: hien error + nut `Retry upload to Meta`.
- Neu ready: voi image co the hien `image_hash`, voi video hien `video_id` compact.

Mapping status theo `uploadedAssetId` la du trong phase dau. Neu can chinh xac hon cho tung slot, dung `slotKey`.

### 3. Polling

- Khi request co draft id va co asset status `pending/uploading/processing`, poll `GET /asset-preparation` moi 5-10 giay.
- Dung hook/cache pattern hien co trong frontend.
- Dung polling khi tat ca `ready/failed` hoac user roi page.

### 4. Save/Create/Update behavior

- Sau create draft/update draft thanh cong, goi `queueAssetPreparation(requestId)` neu co uploaded assets va co ad account.
- Neu chua co ad account, khong queue, hien `Waiting for Meta ad account`.
- Khi user doi ad account, queue lai sau save vi Meta asset gan theo account.

### 5. Execute button behavior

- Neu request co uploaded assets va preparation chua ready:
  - Disable execute hoac cho click nhung confirm/error ro.
  - Text vi du: `Assets are still uploading to Meta. Execution will be available when all assets are ready.`
- Backend van la source of truth, bat buoc gate o server.

### 6. ADDENDUM A - Hien trang thai upload o man Request Detail

> Ly do: hien tai UI status chi co o luong create/edit (`create-request`). Man **Request Detail** (`frontend/components/meta-ads/requests/request-detail-content.tsx`) KHONG hien asset preparation -> user mo detail khong biet video/image nao da `ready`/`pending`/`failed`. Phan nay them hien thi (read-only + retry) vao man detail, TAI DUNG API/type da co (`metaRequestsApi.getAssetPreparation`, `MetaAssetPreparationResponseDto`). KHONG sua backend.

Yeu cau:

- Khi load detail, neu request co `uploaded_asset` (payload variant co media `mode = "uploaded_asset"`), goi `GET /api/v1/meta-campaign-requests/{id}/asset-preparation` (qua `metaRequestsApi.getAssetPreparation`).
- Trong tab/section Creative cua detail, voi moi media slot la `uploaded_asset`, hien badge trang thai map theo `assets[]` (khop bang `requestAssetId`, can chinh hon thi dung `slotKey` da co dang `variant-{seq}.singleVideo.video`...):
  - `pending` -> `Queued`
  - `uploading` -> `Uploading to Meta`
  - `processing` -> `Processing video`
  - `ready` -> `Ready on Meta` (image co the show `metaImageHash` rut gon, video show `metaVideoId` rut gon)
  - `failed` -> `Failed` + `errorMessage` + nut `Retry upload to Meta`.
- Them banner tong o dau detail (canh badge request status) khi co uploaded asset:
  - `isReadyForExecution = false` -> chip `Assets preparing on Meta (X/Y ready)` mau warning.
  - `isReadyForExecution = true` -> chip `All Meta assets ready` mau success.
- **Retry**: nut retry goi `metaRequestsApi.retryAssetMetaUpload(requestAssetId, metaAdAccountId)` (lay `metaAdAccountId` tu response/detail). Chi enable khi status `failed`. Sau retry, refresh poll.
- **Retry all failed**: neu co tu 1 asset `failed` tro len, banner tong tren Request Detail phai hien nut `Retry all failed uploads` cho user co quyen create/edit. Nut nay khong can backend endpoint moi; frontend goi tuan tu `metaRequestsApi.retryAssetMetaUpload(requestAssetId, metaAdAccountId)` cho tung asset failed, dedupe theo `requestAssetId`, sau do refresh `getAssetPreparation`. Neu mot vai retry queue loi, thong bao so asset da queue thanh cong vs tong so failed.
- **Polling**: neu con bat ky asset `pending/uploading/processing`, poll lai moi 5-10s (tai dung hook/pattern cua create-request); dung khi tat ca `ready/failed` hoac user roi page. Tranh poll khi request da `completed`/`executing` neu khong con asset dang chay.
- **Read-only theo quyen**: hien status cho moi user co quyen view detail; nut Retry chi hien khi user co quyen create/edit request (`canCreate`/tuong duong da dung trong detail). Khong noi rong quyen.
- **Khong co uploaded asset** (toan bo media la `from_meta`/`external_url`): khong goi API, khong hien block nay.
- Lien ket voi nut Execute o detail (neu co): khi `isReadyForExecution = false` ap dung lai hanh vi muc 5 (disable/confirm ro). Backend van gate that.

## Behavior Rules

- Draft/create/edit/submit/approve: khong bi chan boi asset chua ready.
- Execute: bat buoc tat ca required uploaded assets ready.
- Meta library media (`from_meta`) da co `video_id/image_hash` khong can upload lai.
- Local uploaded video bat buoc co video ready; thumbnail neu creative can thumbnail thi thumbnail image cung phai ready.
- Cung file noi bo nhung khac Meta ad account phai upload rieng.
- Failed asset khong tu dong execute fallback upload truc tiep trong execute.

## Tests Bat Buoc

### Backend

1. `QueueForRequestAsync` parse request co nhieu variants image/video va tao du row `meta_uploaded_assets`.
2. Cung asset + cung ad account queue nhieu lan khong duplicate row VA khong enqueue job trung (dedupe).
3. Cung asset + khac ad account tao row rieng.
4. `ValidateReadyForExecutionAsync`:
   - Tat ca ready (dung account cua request) -> pass.
   - Co pending/uploading/processing/failed -> fail voi danh sach asset.
   - Asset ready o account A nhung `request.MetaAdAccountId` = B -> fail (gate theo dung account, khong gop).
5. `MetaCampaignExecutionService` khong goi upload truc tiep neu uploaded_asset chua ready; stop truoc khi tao campaign/adset.
6. Resolver image/video lay `image_hash/video_id` tu `meta_uploaded_assets` ready.
7. Job upload image/video cap nhat status ready/failed dung voi fake Meta API.

### Frontend

1. Uploaded image/video hien badge status theo API response.
2. Pending/uploading/processing hien polling/loader.
3. Failed hien error + Retry.
4. Ready hien `Ready on Meta`.
5. Sau save draft goi queue endpoint.
6. Execute disabled/blocked khi asset chua ready (neu UI co nut execute trong man nay).

### Frontend - ADDENDUM A (Request Detail)

1. Detail co `uploaded_asset` -> goi `getAssetPreparation` va render badge tung media theo `assets[]`.
2. Detail toan bo media `from_meta`/`external_url` -> KHONG goi API, khong hien block status.
3. Banner tong hien `X/Y ready` (warning) khi `isReadyForExecution = false`, hien `All Meta assets ready` (success) khi `true`.
4. Asset `failed` hien error + nut Retry; Retry goi `retryAssetMetaUpload(requestAssetId, metaAdAccountId)` roi refresh.
5. Neu co bat ky asset `failed`, banner tong hien nut `Retry all failed uploads`; nut nay retry tuan tu tat ca asset failed bang endpoint retry tung asset hien co, roi refresh preparation. User chi-view van thay badge/error nhung khong thay nut batch retry.
6. Con asset `pending/uploading/processing` -> co polling; dung khi tat ca `ready/failed`.
7. Nut Retry chi hien voi user co quyen create/edit; user chi-view van thay badge.

## Validate

Backend:

```powershell
dotnet build backend/MediationPro.Api/MediationPro.Api.csproj
dotnet test backend/MediationPro.Api.Tests/MediationPro.Api.Tests.csproj -v minimal
```

Frontend:

```powershell
cd frontend
npx.cmd tsc --noEmit --incremental false --pretty false
pnpm.cmd test
```

Neu local dang chay `dotnet watch` va khoa DLL, dung output path rieng hoac bao ro caveat, khong kill process cua user.

## Out Of Scope

- Khong doi UI multi-file upload da co o prompt 26.
- Khong doi approval permission semantics.
- Khong auto execute khi asset ready.
- Khong tao kenh alert moi.
- Khong gop/chuyen doi asset giua Meta ad accounts.
- Khong xoa fallback/manual media mode nao ngoai logic asset preparation.

## Assumptions

- Meta Marketing API cho upload asset o ad account level, khong can gan voi ad set/ad truoc.
- `uploaded_asset` hien tai la asset noi bo cua Mediation Pro, chua dong nghia voi asset ready tren Meta.
- Video readiness can duoc verify bang API/poll neu Meta endpoint hien co trong integration cho phep; neu chua lam duoc ngay, phai ghi TODO va van gate dua tren trang thai upload `ready` co y thuc rui ro.
- Request co the duoc approve truoc khi asset ready; execute moi la diem bat buoc chan.
