# Prompt: Hien thi Advantage+ Creative tren Meta campaign detail

## Vai tro

Ban la coding agent lam viec doc lap trong repo `Amobear.Mediation.Tools`. Hay uu tien tra loi/tom tat bang tieng Viet. Doc `AGENTS.md` truoc khi lam. Khong commit secrets, khong bypass branch protection/CI.

## Muc tieu

Cap nhat man hinh **Meta campaign request/detail** de hien thi ro cau hinh **Advantage+ Creative** da duoc luu trong request payload, bao gom cac toggle creative enhancements da them o prompt `32-META-ADS-ADVANTAGE-PLUS-CREATIVE-PROMPT.md`.

Muc tieu cua prompt nay la **read/display only** tren detail/summary UI. Khong thay doi logic execute Graph API neu prompt 32 da implement.

## Boi canh ky thuat

- Prompt lien quan: `docs/meta-ads/32-META-ADS-ADVANTAGE-PLUS-CREATIVE-PROMPT.md`.
- TypeScript types Meta Ads nam o `frontend/types/meta-ads.ts`.
- Mapper form/detail nam o `frontend/lib/meta-ads/mappers.ts`, dac biet:
  - `detailDtoToFormState`
  - `adVariantDtoToVariantFormState`
- Man hinh tao/sua request nam o `frontend/components/meta-ads/create-request/create-request-content.tsx`.
- Section creative nam o `frontend/components/meta-ads/create-request/section-creative.tsx`.
- Can tim cac component detail/request detail hien tai trong `frontend/components/meta-ads/**` bang `rg`, vi ten file co the da thay doi theo thoi gian.
- Backend DTO request nam o `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs` neu can xac nhan shape cua detail response.

## Pham vi can implement

### 1. Tim dung man detail hien tai

Hay search trong frontend cac component hien thi Meta campaign request/campaign detail, vi repo co the dung ten khac nhau:

- `MetaCampaignRequestDetail`
- `CampaignDetail`
- `RequestDetail`
- `Creative Summary`
- `request detail`
- `ad variants`
- `creative payload`

Sau khi tim duoc component detail, them block hien thi Advantage+ Creative vao vi tri gan creative/ad variants summary nhat.

### 2. Hien thi Advantage+ Creative summary

Them mot card/section gon, de scan, vi du:

- Title: `Advantage+ Creative`
- Summary status:
  - `All optimizations: On` neu `advantagePlusCreative.enrollStatus === "OPT_IN"`.
  - `All optimizations: Off` neu `OPT_OUT` hoac missing.
- Feature rows:
  - `Add overlays` -> `addTextOverlay`
  - `Visual touch-ups` -> `imageTouchups`
  - `Add music` -> `musicGeneration`
  - `Text improvements` -> `textOptimizations`
  - `Add animation` -> `imageAnimation`
  - `Add details to ad layout` -> `inlineComment` neu prompt 32 da map field nay va API version support.

Trang thai moi feature:

- `On` khi `enrollStatus === "OPT_IN"`.
- `Off` khi `enrollStatus === "OPT_OUT"`.
- `Not configured` khi field missing/null.

Nen dung Badge/label mau nhe theo style san co:

- On: xanh la/xanh duong nhe.
- Off: slate/neutral.
- Not configured: muted.

### 3. Multi-variant behavior

Neu request co nhieu ad variants:

- Hien thi Advantage+ Creative theo tung variant neu detail UI dang list variants.
- Neu detail UI chi co summary chung, lay primary variant lam summary va them note ngan neu additional variants co config khac.
- Neu config duoc inherit shared across variants theo prompt 32, UI nen hien mot section chung va tranh lap lai qua nhieu variant neu khong can thiet.

Yeu cau khong lam hong flow cu:

- Request cu khong co `degreesOfFreedomSpec` phai hien `Not configured` hoac an section neu product UI hien tai thich gon.
- Khong crash khi field nested null/missing.

### 4. Flexible ad / inline creative

Neu detail UI co hien Flexible Ad asset/feed/inline creative:

- Neu payload co `degreesOfFreedomSpec` trong inline creative, hien thi tuong tu.
- Neu detail DTO chi expose creative-level config, hien thi creative-level config va ghi chu ngan: `Applied to creative payload when executed.`

### 5. Reuse helper/component

De tranh duplicate code, tao helper/component nho neu phu hop, vi du:

- `AdvantageCreativeSummary`
- `formatAdvantageCreativeFeatureStatus`
- `getAdvantageCreativeFeatureRows`

Component nen nhan input nullable:

```ts
degreesOfFreedomSpec?: MetaDegreesOfFreedomSpecDto | null
```

Va tu render fallback an toan.

Khong nen goi API moi chi de hien thi thong tin nay neu detail response da co payload/creative DTO.

## Yeu cau UX

- UI phai ro rang day la cau hinh da luu trong request, khong phai trang thai live duoc doc lai tu Meta.
- Neu chua configured, hien thong diep ngan:
  - `Advantage+ Creative was not configured for this request.`
- Neu co it nhat mot feature configured, hien danh sach feature rows.
- Neu co raw JSON/debug panel hien tai, van nen co summary doc duoc thay vi bat user doc JSON.

## Yeu cau mapping/detail DTO

Kiem tra detail response hien tai co tra ve `degreesOfFreedomSpec` trong creative/ad variants chua.

- Neu frontend detail da nhan duoc field nay: chi can render.
- Neu mapper dang drop field trong `detailDtoToFormState` hoac adapter detail: cap nhat mapper de giu field.
- Neu backend detail DTO chua include field: cap nhat DTO/mapper backend de serialize field tu request payload JSON.

Khong doi ten field da implement o prompt 32. Giu camelCase o frontend/internal DTO:

- `degreesOfFreedomSpec`
- `creativeFeaturesSpec`
- `advantagePlusCreative`
- `imageTouchups`
- `musicGeneration`
- `textOptimizations`
- `imageAnimation`
- `addTextOverlay`
- `inlineComment`
- `enrollStatus`

## Validation/compatibility

- Khong them hard validation moi trong detail UI.
- Khong mutate request payload khi chi xem detail.
- Khong gui `standard_enhancements`.
- Khong lam thay doi behavior create/edit/execute neu prompt 32 da hoan thanh.
- Request legacy khong co `degreesOfFreedomSpec` phai mo detail binh thuong.

## Testing/verification

Chay cac lenh phu hop voi repo sau khi implement:

- Frontend targeted lint/typecheck cho cac file detail/component moi sua.
- Backend build neu co sua DTO/backend:

```powershell
dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1
```

Neu co test san cho mapper/detail thi them focused tests cho:

- Detail/request co `degreesOfFreedomSpec` hien dung On/Off/Not configured.
- Detail/request khong co field khong crash.
- Multi-variant hien dung config cua variant hoac summary shared.

Manual smoke:

- Tao/sua mot Meta request co Advantage+ Creative toggle bat/tat.
- Mo detail request/campaign va xac nhan card `Advantage+ Creative` hien dung.
- Mo request cu khong co config va xac nhan UI khong crash.

## Acceptance criteria

- Campaign/request detail co section hien thi `Advantage+ Creative` o gan creative summary.
- Hien du cac feature da support: All optimizations, Add overlays, Visual touch-ups, Add music, Text improvements, Add animation, Add details to ad layout neu co field support.
- Trang thai feature map dung tu `degreesOfFreedomSpec.creativeFeaturesSpec.*.enrollStatus`.
- Request legacy/null payload khong crash va co fallback ro rang.
- Neu multi-variant, UI khong gay nham lan ve variant nao dang co config.
- Khong thay doi payload execute Graph API ngoai scope hien thi detail.

## Final response mong doi tu agent implement

Tom tat ngan bang tieng Viet:

- Da them section/component detail o file nao.
- Da map/giu field `degreesOfFreedomSpec` o dau neu co thay doi mapper/DTO.
- Da chay lint/build/test gi, ket qua ra sao.
- Neu chua hien mot feature vi API/detail DTO khong co field, noi ro feature nao va ly do.
