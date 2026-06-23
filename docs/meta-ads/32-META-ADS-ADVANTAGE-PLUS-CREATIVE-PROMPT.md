# Prompt: Them Advantage+ Creative vao man hinh tao Meta campaign request

## Vai tro

Ban la coding agent lam viec doc lap trong repo `Amobear.Mediation.Tools`. Hay uu tien tra loi/tom tat bang tieng Viet. Doc `AGENTS.md` truoc khi lam. Khong commit secrets, khong bypass branch protection/CI.

## Muc tieu

Them component cau hinh **Advantage+ creative** vao flow tao/sua Meta campaign request, de khi execute request len Meta Graph API co the bat/tat cac creative enhancements tuong ung voi man hinh Meta Ads Manager: All optimizations, Add overlays, Visual touch-ups, Add music, Text improvements, Add animation, Add details to ad layout.

Can implement end-to-end tu frontend form -> DTO/payload JSON -> backend execute Graph API payload.

## Boi canh ky thuat

- Man hinh tao request nam o `frontend/components/meta-ads/create-request/create-request-content.tsx`.
- Section creative hien tai nam o `frontend/components/meta-ads/create-request/section-creative.tsx`.
- TypeScript types Meta Ads nam o `frontend/types/meta-ads.ts`.
- Mapper form <-> DTO nam o `frontend/lib/meta-ads/mappers.ts`:
  - `variantFormStateToCreativeDto`
  - `primaryVariantFromFormState`
  - `adVariantDtoToVariantFormState`
  - `detailDtoToFormState`
  - `formStateToCreateDto`
- Backend DTO request nam o `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`.
- Backend tao Graph API payload nam o `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`:
  - `BuildSingleImageCreativePayloadAsync`
  - `BuildSingleVideoCreativePayloadAsync`
  - `BuildCarouselCreativePayloadAsync`
  - `BuildExistingPostCreativePayload`
  - `BuildFlexibleAdPayloadAsync` cho inline creative cua format FLEXIBLE.
- Repo da co logic doc/check `degrees_of_freedom_spec` trong duplicate readiness tai `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignDuplicateReadinessService.cs`, nen nen canh giu tuong thich voi cach Meta dang chuyen tu legacy `standard_enhancements` sang individual enhancements.

## Meta Marketing API can dung

Xac nhan lai voi tai lieu/SDK chinh thuc cua Meta neu can, nhung field can implement la:

```json
"degrees_of_freedom_spec": {
  "creative_features_spec": {
    "advantage_plus_creative": { "enroll_status": "OPT_IN" },
    "image_touchups": { "enroll_status": "OPT_IN" },
    "music_generation": { "enroll_status": "OPT_IN" },
    "text_optimizations": { "enroll_status": "OPT_IN" },
    "image_animation": { "enroll_status": "OPT_IN" },
    "add_text_overlay": { "enroll_status": "OPT_IN" },
    "inline_comment": { "enroll_status": "OPT_IN" }
  }
}
```

Ghi chu:

- `enroll_status` nen la enum/string `OPT_IN` hoac `OPT_OUT`.
- Neu user tat het feature thi backend co the khong gui `degrees_of_freedom_spec`, hoac gui cac feature voi `OPT_OUT`. Chon cach it rui ro hon theo Meta API version dang cau hinh trong app.
- Tranh chi dung legacy `standard_enhancements` cho tao moi, vi repo da co readiness check coi legacy Standard Enhancements la trang thai can update.
- Neu field `inline_comment` khong duoc API version hien tai support, bo field nay hoac map no thanh feature dung voi Meta SDK hien tai. Hay verify truoc khi hard-code.

## Yeu cau san pham/UI

Them component **Advantage+ creative** trong section Creative cua create/edit request:

- Dat component gan khu vuc creative settings, truoc hoac sau Creative Type tuy theo layout hien tai.
- UI nen giong tinh than screenshot Meta Ads Manager:
  - Mot toggle tong `All optimizations`.
  - Cac toggle rieng cho:
    - Add overlays -> `add_text_overlay`
    - Visual touch-ups -> `image_touchups`
    - Add music -> `music_generation`
    - Text improvements -> `text_optimizations`
    - Add animation -> `image_animation`
    - Add details to ad layout -> field dung cua Meta API/SDK neu co; neu chua co field chinh thuc trong API version hien tai thi UI nen disable/ghi chu ngan trong tooltip, khong gui field la.
  - Co default hop ly: tat toan bo neu muon bao toan hanh vi hien tai, hoac bat theo Meta default neu product owner yeu cau. Neu khong ro, chon default **OFF** de khong thay doi hanh vi tao ad hien tai.
- Su dung component/design pattern san co trong repo; khong tao landing/hero. Dung controls gon, de scan trong tool surface.
- Neu dung icon thi uu tien icon lib dang co trong frontend (lucide neu repo dang dung).
- Component phai hoat dong trong create va edit existing request; khi edit payload cu khong co config thi fallback default khong crash.

## De xuat model/type

Them type moi vao frontend/backend, ten co the dieu chinh theo style repo:

Frontend:

```ts
export type MetaAdvantageCreativeEnrollStatus = "OPT_IN" | "OPT_OUT"

export interface MetaCreativeFeatureEnrollStatusDto {
  enrollStatus: MetaAdvantageCreativeEnrollStatus
}

export interface MetaCreativeFeaturesSpecDto {
  advantagePlusCreative?: MetaCreativeFeatureEnrollStatusDto | null
  imageTouchups?: MetaCreativeFeatureEnrollStatusDto | null
  musicGeneration?: MetaCreativeFeatureEnrollStatusDto | null
  textOptimizations?: MetaCreativeFeatureEnrollStatusDto | null
  imageAnimation?: MetaCreativeFeatureEnrollStatusDto | null
  addTextOverlay?: MetaCreativeFeatureEnrollStatusDto | null
  inlineComment?: MetaCreativeFeatureEnrollStatusDto | null
}

export interface MetaDegreesOfFreedomSpecDto {
  creativeFeaturesSpec?: MetaCreativeFeaturesSpecDto | null
}
```

Gan vao `MetaCreativeDraftDto`:

```ts
degreesOfFreedomSpec?: MetaDegreesOfFreedomSpecDto | null
```

Backend C# DTO tuong ung trong `MetaCampaignRequestDtos.cs`, dung `JsonPropertyName` neu can de giu camelCase payload noi bo. Khi build Graph API payload, convert camelCase DTO thanh snake_case field Meta yeu cau.

## Yeu cau backend payload

Trong `MetaCampaignExecutionService.cs`, them helper rieng, vi nhieu loai creative can gan cung logic:

```csharp
private static void ApplyDegreesOfFreedomSpec(Dictionary<string, object?> creativePayload, MetaCreativeDraftDto creative)
```

Helper nay nen:

- Doc `creative.DegreesOfFreedomSpec?.CreativeFeaturesSpec`.
- Neu null/khong co feature nao duoc set thi khong them field, de giu backward compatibility.
- Map sang Graph API snake_case:
  - `advantagePlusCreative` -> `advantage_plus_creative`
  - `imageTouchups` -> `image_touchups`
  - `musicGeneration` -> `music_generation`
  - `textOptimizations` -> `text_optimizations`
  - `imageAnimation` -> `image_animation`
  - `addTextOverlay` -> `add_text_overlay`
  - `inlineComment` -> `inline_comment` chi khi verified support.
- Moi feature object dang `{ "enroll_status": "OPT_IN" }` hoac `{ "enroll_status": "OPT_OUT" }`.
- Apply vao payload tra ve tu:
  - single image creative
  - single video creative
  - carousel creative
  - existing post creative neu Meta API cho phep; neu khong, bo qua va validate/ghi chu ro
  - inline creative trong `BuildFlexibleAdPayloadAsync`

Vi `BuildSingleImageCreativePayloadAsync`/`BuildSingleVideoCreativePayloadAsync` dang return dictionary truc tiep o nhieu branch, hay refactor nho de tao `result`, apply helper, roi return. Khong refactor lon.

## Yeu cau frontend mapping

Cap nhat `MetaRequestFormState` va `AdVariantFormState` trong `frontend/types/meta-ads.ts` de luu feature toggles.

Cap nhat `frontend/lib/meta-ads/mappers.ts`:

- `variantFormStateToCreativeDto`: serialize toggle state vao `creative.degreesOfFreedomSpec`.
- `primaryVariantFromFormState`: dua state moi cua primary variant vao variant.
- `composeAdditionalVariantForSerialization`: vi additional variants inherit shared text/page/type tu form, Advantage+ creative config cung nen inherit tu form tru khi product yeu cau per-variant. Mac dinh de **shared across variants**.
- `adVariantDtoToVariantFormState`: parse payload cu va moi, fallback default OFF.
- `detailDtoToFormState`: edit request phai hien lai dung toggle da luu.

Neu app co default form state trong file khac, cap nhat default state de moi field co gia tri an toan.

## Validation

Them validation toi thieu neu da co validator Meta campaign request:

- Chi chap nhan `OPT_IN`/`OPT_OUT`.
- Neu creative type/placement/API version khong support mot feature, khong fail ca request neu co the bo qua feature khong support; nhung can hien warning ro trong UI hoac operation log. Neu codebase validation hien tai chi co hard errors, giu validation conservative.
- Khong lam thay doi behavior cua request cu khong co `degreesOfFreedomSpec`.

## Testing/verification

Chay cac lenh phu hop voi repo sau khi implement:

- Frontend: typecheck/lint/test theo `frontend/package.json`.
- Backend: it nhat `dotnet build backend/MediationPro.Api/MediationPro.Api.csproj --no-restore -v minimal /m:1` neu restore da san sang; neu build fail vi moi truong/restore, bao ro.
- Neu co test san cho Meta Ads mapper/service thi them focused tests cho:
  - form -> DTO co `degreesOfFreedomSpec`
  - detail DTO -> form giu lai toggles
  - backend Graph payload co `degrees_of_freedom_spec.creative_features_spec...enroll_status`
  - payload cu khong co field thi khong them field vao Graph API payload.

Neu can test payload backend ma helper private kho truy cap, co the them test o service muc cao hon theo pattern san co; tranh expose API public chi de test.

## Acceptance criteria

- Create request screen co component Advantage+ creative, gom toggle tong va cac toggle con.
- Submit create request luu config vao payload JSON.
- Edit request hien lai config da luu, payload cu van mo duoc.
- Execute request tao Graph API payload dung snake_case `degrees_of_freedom_spec` cho creative/inline creative.
- Khong gui legacy `standard_enhancements` cho request tao moi.
- Khong lam hong multi-variant flow; config Advantage+ creative duoc inherit cho all variants theo mac dinh.
- Co verify/test duoc ghi lai trong final response.

## Final response mong doi tu agent implement

Tom tat ngan bang tieng Viet:

- Da them UI/component o dau.
- Da them DTO/mapping/backend payload o dau.
- Da chay test/build gi, ket qua ra sao.
- Neu bo qua feature nao vi Meta API version khong support, noi ro field nao va ly do.
