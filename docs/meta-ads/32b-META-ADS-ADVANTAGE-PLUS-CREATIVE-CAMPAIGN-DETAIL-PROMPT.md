# Prompt: Hien thi Advantage+ Creative tren Meta campaign detail

## Vai tro

Ban la coding agent lam viec doc lap trong repo `Amobear.Mediation.Tools`. Hay uu tien tra loi/tom tat bang tieng Viet. Doc `AGENTS.md` truoc khi lam. Khong commit secrets, khong bypass branch protection/CI.

## Muc tieu

Cap nhat **UI man hinh Meta campaign detail** de hien thi cau hinh **Advantage+ Creative** cua campaign/ad da duoc execute hoac da luu tu request, sau khi prompt `32a-META-ADS-ADVANTAGE-PLUS-CREATIVE-DETAIL-PROMPT.md` da hoan thanh cho Request Detail.

Prompt nay tap trung vao **Campaign Detail UI**, tuc man xem campaign sau khi campaign/request da duoc tao/chay, khong chi man Request Detail.

## Boi canh ky thuat

- Prompt goc them config: `docs/meta-ads/32-META-ADS-ADVANTAGE-PLUS-CREATIVE-PROMPT.md`.
- Prompt Request Detail da hoan thanh: `docs/meta-ads/32a-META-ADS-ADVANTAGE-PLUS-CREATIVE-DETAIL-PROMPT.md`.
- Can tim man Campaign Detail hien tai trong frontend bang `rg`, vi ten component co the khac nhau:
  - `CampaignDetail`
  - `MetaCampaignDetail`
  - `CampaignDetailContent`
  - `campaign detail`
  - `ads detail`
  - `ad detail`
  - `creative summary`
- TypeScript types Meta Ads nam o `frontend/types/meta-ads.ts`.
- API client Meta Ads nam trong `frontend/lib/**` hoac `frontend/lib/api/**` tuy cau truc hien tai.
- Backend DTO/detail response neu can kiem tra nam trong `backend/MediationPro.Core/DTOs/MetaAds/**` va controller/service Meta Ads tuong ung.

## Pham vi can implement

### 1. Xac dinh source data cho Campaign Detail

Kiem tra man Campaign Detail dang lay du lieu tu nguon nao:

- Campaign request payload da luu trong DB.
- Campaign/ad/ad creative snapshot trong DB sau execute.
- Meta Graph API live data.
- Ket hop request + execution result.

Sau khi xac dinh, hien thi Advantage+ Creative theo thu tu uu tien:

1. Creative/ad snapshot da execute neu co `degrees_of_freedom_spec` hoac field tuong duong.
2. Request creative DTO/payload neu campaign detail co link ve request.
3. Fallback: hien `Not configured` hoac `No Advantage+ Creative data available`.

Khong goi API Meta moi neu detail response hien tai da du du lieu. Chi them API/backend field neu detail response hien tai dang drop field da co trong DB.

### 2. Reuse component tu Request Detail neu da co

Neu prompt 32a da tao component/helper nhu:

- `AdvantageCreativeSummary`
- `MetaAdvantageCreativeSummary`
- `formatAdvantageCreativeFeatureStatus`
- `getAdvantageCreativeFeatureRows`

Hay reuse component/helper do cho Campaign Detail thay vi copy UI moi.

Neu component hien tai bi gan chat voi Request Detail, refactor nhe thanh shared component trong khu vuc phu hop, vi du:

- `frontend/components/meta-ads/shared/advantage-creative-summary.tsx`
- hoac path shared san co cua Meta Ads UI.

Component nen nhan input nullable:

```ts
degreesOfFreedomSpec?: MetaDegreesOfFreedomSpecDto | null
sourceLabel?: string
```

### 3. Hien thi trong Campaign Detail UI

Them section/card `Advantage+ Creative` gan khu vuc creative/ad information trong Campaign Detail.

Noi dung hien thi:

- `All optimizations`
- `Add overlays`
- `Visual touch-ups`
- `Add music`
- `Text improvements`
- `Add animation`
- `Add details to ad layout` neu data co field `inlineComment` hoac field da duoc support.

Trang thai:

- `On` neu `enrollStatus === "OPT_IN"` hoac raw Meta value la `OPT_IN`.
- `Off` neu `enrollStatus === "OPT_OUT"` hoac raw Meta value la `OPT_OUT`.
- `Not configured` neu missing/null.

Neu data source la raw Graph API snake_case, normalize ve DTO/view model camelCase truoc khi render:

- `degrees_of_freedom_spec` -> `degreesOfFreedomSpec`
- `creative_features_spec` -> `creativeFeaturesSpec`
- `advantage_plus_creative` -> `advantagePlusCreative`
- `image_touchups` -> `imageTouchups`
- `music_generation` -> `musicGeneration`
- `text_optimizations` -> `textOptimizations`
- `image_animation` -> `imageAnimation`
- `add_text_overlay` -> `addTextOverlay`
- `inline_comment` -> `inlineComment`
- `enroll_status` -> `enrollStatus`

### 4. Multi-ad / multi-creative behavior

Neu Campaign Detail co nhieu ad/ad creatives:

- Hien theo tung ad creative neu UI dang co danh sach ads/creatives.
- Neu UI chi co campaign-level summary, hien summary grouped:
  - Neu tat ca creatives cung config: hien mot card chung.
  - Neu config khac nhau: hien thong diep `Advantage+ Creative settings vary by ad creative` va list tung creative/ad.

Khong gay nham lan campaign-level va ad-level:

- Advantage+ Creative la creative/ad-level setting, khong phai campaign-level setting.
- Neu dat card trong campaign summary, can ghi chu ngan: `Creative-level settings`.

### 5. Backend/API neu can

Chi sua backend khi Campaign Detail response hien tai khong tra ve du lieu can thiet.

Neu can sua backend:

- Expose `degreesOfFreedomSpec` tu request creative payload hoac creative snapshot.
- Neu DB luu raw Meta payload snake_case, map ve DTO camelCase cho frontend.
- Khong thay doi execute payload.
- Khong mutate request/campaign data khi chi xem detail.

Neu campaign detail dang chi co external IDs ma khong co creative payload:

- Uu tien dung request payload linked voi campaign request neu co.
- Neu khong co data, hien fallback ro rang thay vi fail.

## Yeu cau UX

- UI phai noi ro day la thong tin cua creative/ad:
  - `Advantage+ Creative`
  - subtitle: `Creative-level settings saved for this campaign/request.`
- Neu lay tu request payload, co the hien source nho:
  - `Source: request payload`
- Neu lay tu executed creative snapshot:
  - `Source: executed creative snapshot`
- Neu khong co data:
  - `No Advantage+ Creative settings were captured for this campaign.`
- Khong bat user doc raw JSON/debug panel.

## Compatibility

- Campaign cu khong co `degreesOfFreedomSpec` khong crash.
- Request/campaign chua execute van hien duoc config neu Campaign Detail co linked request payload.
- Khong anh huong Request Detail da lam o prompt 32a.
- Khong anh huong create/edit request flow.
- Khong gui/tao `standard_enhancements`.

## Testing/verification

Chay lenh phu hop sau khi implement:

- Frontend targeted lint/typecheck cho component Campaign Detail va shared component vua sua.
- Backend build neu co sua API/DTO/backend:

```powershell
dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1
```

Manual smoke:

- Mo campaign detail cua campaign/request co Advantage+ Creative config va xac nhan hien dung On/Off.
- Mo campaign detail cua campaign cu khong co config va xac nhan khong crash.
- Neu campaign co nhieu creatives, xac nhan UI khong hien sai thanh campaign-level setting duy nhat khi configs khac nhau.

Neu co test san:

- Test normalizer raw snake_case -> camelCase DTO/view model.
- Test component render `OPT_IN`, `OPT_OUT`, missing/null.

## Acceptance criteria

- Campaign Detail UI co section/card `Advantage+ Creative`.
- Section hien dung cac feature da support va trang thai On/Off/Not configured.
- Data source duoc lay tu creative snapshot hoac linked request payload theo thu tu uu tien hop ly.
- Multi-ad/multi-creative khong bi gom sai neu config khac nhau.
- Campaign legacy/null data khong crash.
- Reuse component/helper tu Request Detail neu co the.
- Khong thay doi behavior execute/create/edit ngoai scope hien thi.

## Final response mong doi tu agent implement

Tom tat ngan bang tieng Viet:

- Da them Campaign Detail UI o file nao.
- Da reuse/refactor component Advantage+ Creative nao.
- Data source dang lay tu request payload hay executed creative snapshot.
- Da chay lint/build/test gi, ket qua ra sao.
- Neu co fallback/khong co data live tu Meta, noi ro han che.
