# Prompt: Thêm Ad Transparency (Advertiser & Payer / Beneficiary & Payer) Cho Meta Campaign Request

## Summary
- Bổ sung khai báo **Advertiser (Beneficiary) & Payer** ("Ad transparency") cho luồng tạo/sửa/duplicate/execute Meta campaign request, ở **cấp ad set**.
- Map đúng sang 2 cơ chế của Meta Marketing API:
  - **APAC / regulated vùng** → `regional_regulation_identities` (map, **per-location**).
  - **EU (DSA)** → `dsa_beneficiary` / `dsa_payor` (string đơn).
- Field `regional_regulated_categories` (cờ vùng quản lý) **đã tồn tại** trong execution; phần còn thiếu là **identities** (ai là advertiser/payer) + **UI nhập** + **endpoint list identity đã verify**.
- Tên field mới rõ nghĩa: DTO `RegionalRegulationIdentities`, `DsaBeneficiary`, `DsaPayor` ở cấp ad set.

## Business Context
- Trong Meta Ads Manager (ad set level) có block **"Ad transparency"**:
  - Cảnh báo "Select the advertiser and payer" khi ad set chạm vùng bị quản lý.
  - Dropdown **Advertiser** + toggle **"The advertiser and payer are different"** → khi bật mới hiện thêm **Payer**.
  - UI tách theo **từng location group** (vd block "Singapore" riêng, "Other selected locations" riêng).
- Các vùng yêu cầu beneficiary/payer: **EU**, **Taiwan (TW)**, **Singapore (SG)**, **Australia (AU, chỉ finserv)**, **India (IN, securities/investments)**, **Brazil (BR)**, **Thailand (TH)**.
  - **SG và TW: beneficiary là bắt buộc** cho mọi ad targeting các vùng này.
- Nếu thiếu beneficiary/payer khi ad set chạm vùng bắt buộc → Meta từ chối publish (đúng cảnh báo trong UI).

### Contract Meta Marketing API (đã tra cứu, nguồn: Meta Business SDK chính thức)
**Ad set fields** (`POST /act_<id>/adsets` và `POST /<adset_id>`):

| Field | Kiểu | Dùng cho |
|-------|------|----------|
| `regional_regulated_categories` | `list<enum string>` — `SINGAPORE_UNIVERSAL`, `TAIWAN_UNIVERSAL`, `THAILAND_UNIVERSAL`, `BRAZIL_REGULATION`, `AUSTRALIA_FINSERV`, `INDIA_FINSERV`… | Cờ "ad set thuộc vùng quản lý nào" — **ĐÃ set sẵn** trong code |
| `regional_regulation_identities` | `map` (object) — xem dưới | Beneficiary/payer **per-location** cho APAC/regulated |
| `dsa_beneficiary` | `string` | EU DSA — beneficiary |
| `dsa_payor` | `string` | EU DSA — payer |

**Cấu trúc `regional_regulation_identities`** (mỗi value = **ID của identity đã verify**, là Page ID hoặc Business ID):
```jsonc
{
  "singapore_universal_beneficiary": "<id>",
  "singapore_universal_payer":       "<id>",
  "taiwan_universal_beneficiary":    "<id>",
  "taiwan_universal_payer":          "<id>",
  "taiwan_finserv_beneficiary":      "<id>",
  "taiwan_finserv_payer":            "<id>",
  "australia_finserv_beneficiary":   "<id>",
  "australia_finserv_payer":         "<id>",
  "india_finserv_beneficiary":       "<id>",
  "india_finserv_payer":             "<id>",
  "universal_beneficiary":           "<id>",   // worldwide / fallback
  "universal_payer":                 "<id>"
}
```
> **Điểm mấu chốt**: SG và TW có **key riêng** trong cùng 1 map → một ad set khai báo được cả hai cùng lúc. KHÔNG có chuyện "1 ad set chỉ gửi được 1 quốc gia".

**Nguồn identity đã verify (cho dropdown):**
- `AdAccount.default_dsa_beneficiary`, `AdAccount.default_dsa_payor` — default cấp account.
- Edge `GET /act_<id>/dsa_recommendations` — danh sách beneficiary/payer được Meta gợi ý (đã verify).
- Graph API version dự án: **`MetaAds:ApiVersion`** (mặc định `v24.0`), base `MetaAds:GraphApiBaseUrl`.

> ⚠️ **Bắt buộc verify trước khi code execution**: phải kiểm chứng response thực tế của `dsa_recommendations` và format value của `regional_regulation_identities` trên **v24.0** bằng Graph API Explorer / Postman collection (`docs/meta-ads/META_ADS_POSTMAN_COLLECTION.json`). Field names lấy từ SDK `main` có thể lệch nhẹ theo version. Nếu chưa xác minh được nguồn list identity, vẫn cho **nhập tay ID** (manual entry) như fallback MVP — đúng như Ads Manager cho "Add Beneficiary Details" thủ công.

## Goals
- User nhập được **Advertiser (beneficiary)** và optional **Payer** khi tạo/edit Meta request, **theo từng regulated location** mà ad set đang target.
- Hỗ trợ toggle **"advertiser và payer khác nhau"**; mặc định payer = beneficiary.
- Request save/edit/duplicate giữ nguyên các identities đã khai.
- Khi execute, payload ad set gửi đúng `regional_regulation_identities` (APAC) và/hoặc `dsa_beneficiary`/`dsa_payor` (EU) — **chỉ điền key cho category mà `regional_regulated_categories` đang bật**.
- Validation chặn submit nếu ad set chạm SG/TW (hoặc vùng bắt buộc khác) mà thiếu beneficiary tương ứng.

## Non-Goals
- Không sửa TikTok.
- Không tự verify identity với Meta (verification là quy trình ngoài, do business thực hiện trên Meta).
- Không xử lý per-location UI phức tạp như Ads Manager nếu MVP chưa cần — có thể gom theo category enum (SG, TW, …) thay vì group "Other selected locations".
- Không tạo DB table riêng nếu payload request đang lưu JSON (giữ trong `payload_json`).
- Không đổi logic set `regional_regulated_categories` hiện tại (giữ nguyên mapping country→category).

## Key Changes

### 1. Backend DTO / Request Contract
File: `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
- Thêm vào `MetaAdSetDraftDto`:
  ```csharp
  public MetaRegionalRegulationIdentitiesDto? RegionalRegulationIdentities { get; set; }
  public string? DsaBeneficiary { get; set; }   // EU
  public string? DsaPayor { get; set; }          // EU
  ```
- Thêm DTO mới (đặt cùng file hoặc `MetaReferenceDtos.cs`):
  ```csharp
  public class MetaRegionalRegulationIdentitiesDto
  {
      public string? SingaporeUniversalBeneficiary { get; set; }
      public string? SingaporeUniversalPayer { get; set; }
      public string? TaiwanUniversalBeneficiary { get; set; }
      public string? TaiwanUniversalPayer { get; set; }
      public string? TaiwanFinservBeneficiary { get; set; }
      public string? TaiwanFinservPayer { get; set; }
      public string? AustraliaFinservBeneficiary { get; set; }
      public string? AustraliaFinservPayer { get; set; }
      public string? IndiaFinservBeneficiary { get; set; }
      public string? IndiaFinservPayer { get; set; }
      public string? UniversalBeneficiary { get; set; }
      public string? UniversalPayer { get; set; }
  }
  ```
- Tất cả nullable, optional. Serialize/deserialize trong `payload_json` (cơ chế lưu sẵn có). Duplicate/edit giữ nguyên các field.
- **Không cần DB migration** nếu request payload đang lưu JSON (đang vậy). Nếu có column riêng nào cần — tránh, ưu tiên JSON.

### 2. Backend Execution (gửi lên Meta)
File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`, method `BuildAdSetPayloadAsync` (~dòng 1409–1529).
- Block set `regional_regulated_categories` hiện ở ~dòng 1490–1506. **Ngay sau block đó**, build `regional_regulation_identities`:
  - Tạo `Dictionary<string, object?>` chỉ chứa key có value non-empty.
  - **Chỉ thêm key thuộc category đang bật** trong `regionalCategories`. Ví dụ: chỉ add `singapore_universal_*` khi `regionalCategories` chứa `SINGAPORE_UNIVERSAL`.
  - Quy ước payer mặc định = beneficiary nếu payer rỗng (mirror toggle "are different" tắt) — hoặc bỏ qua payer nếu Meta cho phép suy ra. Ưu tiên: nếu payer rỗng thì set payer = beneficiary để an toàn.
  - Nếu map rỗng → không thêm field.
  ```csharp
  var identities = new Dictionary<string, object?>();
  var ri = payload.AdSet.RegionalRegulationIdentities;
  if (ri != null)
  {
      void Put(string key, string? ben, string? payer, string category)
      {
          if (!regionalCategories.Contains(category)) return;
          if (!string.IsNullOrWhiteSpace(ben))
          {
              identities[$"{key}_beneficiary"] = ben.Trim();
              identities[$"{key}_payer"] = string.IsNullOrWhiteSpace(payer) ? ben.Trim() : payer!.Trim();
          }
      }
      Put("singapore_universal", ri.SingaporeUniversalBeneficiary, ri.SingaporeUniversalPayer, "SINGAPORE_UNIVERSAL");
      Put("taiwan_universal", ri.TaiwanUniversalBeneficiary, ri.TaiwanUniversalPayer, "TAIWAN_UNIVERSAL");
      // … AU/IN finserv, universal cho global tuỳ nhu cầu
  }
  if (identities.Count > 0)
      result["regional_regulation_identities"] = identities;
  ```
- EU (DSA): nếu ad set target EU (cần xác định danh sách EU country codes; xem Implementation Notes) và có `DsaBeneficiary`:
  ```csharp
  if (!string.IsNullOrWhiteSpace(payload.AdSet.DsaBeneficiary))
  {
      result["dsa_beneficiary"] = payload.AdSet.DsaBeneficiary.Trim();
      result["dsa_payor"] = string.IsNullOrWhiteSpace(payload.AdSet.DsaPayor)
          ? payload.AdSet.DsaBeneficiary.Trim() : payload.AdSet.DsaPayor.Trim();
  }
  ```
- Cùng logic phải áp cho `MetaAdSetDraftValidationService.BuildAdSetPayloadAsync` (~dòng 226) nếu nó build payload riêng để validate — **giữ 2 nơi đồng bộ**.
- Nếu có duplicate/ad set copy path (`MetaAdSetDuplicateService` / `MetaCampaignDuplicateService`) build payload riêng → áp tương tự.

### 3. Backend Reference Endpoint (list identity đã verify)
Mục tiêu: cấp dropdown identity cho FE. **Mirror pattern Facebook pages hiện có.**
- Controller: `backend/MediationPro.Api/Controllers/MetaReferenceController.cs`
  - Thêm `GET ad-accounts/{id:int}/regulation-identities` (tham khảo action `GetAdAccountFacebookPages` ~dòng 136). Trả `IReadOnlyList<MetaRegulationIdentityDto>`.
- Service mới (mirror `MetaFacebookPageReferenceService`):
  - File mới `MetaRegulationIdentityReferenceService.cs` + interface `IMetaRegulationIdentityReferenceService`.
  - Resolve context (`MetaAdAccountExecutionContextResolver` + `MetaAuthManager`) như page service.
  - Gọi Graph `GET /act_<externalAccountId>/dsa_recommendations` (hoặc field `default_dsa_beneficiary`/`default_dsa_payor` trên ad account) bằng `RestClient` + `MetaAds:ApiVersion`. Map về DTO.
  - DI registration trong `Program.cs` (tìm nơi đăng ký `IMetaFacebookPageReferenceService` để add cạnh).
- DTO mới:
  ```csharp
  public class MetaRegulationIdentityDto
  {
      public string Id { get; set; } = string.Empty;       // page/business id để bỏ vào field
      public string Name { get; set; } = string.Empty;
      public string? Type { get; set; }                     // PAGE | BUSINESS …
      public string? VerificationStatus { get; set; }
      public List<string> EligibleCategories { get; set; } = new(); // vd ["SINGAPORE_UNIVERSAL"]
  }
  ```
> Nếu `dsa_recommendations` không trả đủ/không khả dụng trên v24.0: endpoint vẫn giữ, trả empty list, FE fallback nhập tay ID. **Không block** feature vì thiếu list.

### 4. Frontend Types / Form State
File: `frontend/types/meta-ads.ts`
- Thêm vào `MetaAdSetDraftDto` (~dòng 767):
  ```ts
  regionalRegulationIdentities?: MetaRegionalRegulationIdentitiesDto | null
  dsaBeneficiary?: string | null
  dsaPayor?: string | null
  ```
- Thêm interface `MetaRegionalRegulationIdentitiesDto` (camelCase mirror DTO backend) và `MetaRegulationIdentityDto` cho dropdown.
- Init default `null`. Submit gửi giá trị đã trim hoặc `null`. Edit/duplicate load lại.

### 5. Frontend API client
File: `frontend/lib/api/meta-ads.ts`
- Thêm hàm `getRegulationIdentities(adAccountId, integrationId?)` gọi `GET ad-accounts/{id}/regulation-identities` (mirror hàm load facebook pages đã có).

### 6. Frontend UI
- Vị trí: section ad set, file `frontend/components/meta-ads/create-request/section-adset-audience.tsx` (nơi có geo/countries) — đặt block **"Ad transparency"** sau phần targeting location, vì điều kiện hiển thị phụ thuộc countries.
- Hành vi:
  - Tính **regulated categories đang áp dụng** từ `countries`/`geoMode` bằng cùng mapping với backend (TW→TAIWAN_UNIVERSAL, SG→SINGAPORE_UNIVERSAL, TH→THAILAND_UNIVERSAL, BR→BRAZIL_REGULATION; GLOBAL→tất cả). Tách helper dùng chung nếu được.
  - Chỉ render block khi có ít nhất 1 regulated category áp dụng (hoặc EU/global).
  - Với mỗi category: 1 dropdown **Advertiser (beneficiary)** (load từ `getRegulationIdentities`, cho phép nhập tay), 1 toggle **"The advertiser and payer are different"**; bật mới hiện dropdown **Payer**.
  - SG/TW: đánh dấu **required** (asterisk) + chặn submit nếu trống.
- Summary rail (`summary-rail.tsx`): hiển thị ngắn gọn khi có, vd `Advertiser (SG): <name/id>`.

### 7. Request / Campaign Detail UI
- Request detail (`frontend/components/meta-ads/requests/request-detail-content.tsx` nếu có) hiển thị advertiser/payer theo category nếu payload có.
- Edit request load lại đầy đủ; duplicate giữ nguyên.

### 8. Validation
File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDraftValidationService.cs` (và/hoặc `MetaCampaignValidationService.cs`)
- Nếu ad set target **SG** mà thiếu `SingaporeUniversalBeneficiary` → error: `Singapore requires an advertiser (beneficiary). Select or enter one in Ad transparency.`
- Tương tự **TW** với `TaiwanUniversalBeneficiary`.
- AU/IN chỉ bắt buộc khi finserv (nếu dự án chưa phân biệt finserv thì để optional + warning).
- EU: nếu target EU mà thiếu `DsaBeneficiary` → error tương ứng (nếu dự án quyết định hỗ trợ EU trong phase này).
- Identity value: trim; độ dài hợp lý (vd ≤ 100). Không validate tồn tại qua API ở phase MVP (verification ngoài luồng).

## Suggested Files To Inspect / Update
- Backend DTO: `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`, `MetaReferenceDtos.cs`
- Backend execution/validation:
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs` (`BuildAdSetPayloadAsync`)
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDraftValidationService.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDuplicateService.cs`, `MetaCampaignDuplicateService.cs` (nếu build payload riêng)
- Backend reference (mirror để tạo mới):
  - `backend/MediationPro.Api/Controllers/MetaReferenceController.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaFacebookPageReferenceService.cs` (pattern Graph GET)
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsClient.cs` (Graph version/base URL)
  - `backend/MediationPro.Api/Program.cs` (DI)
  - `backend/MediationPro.Core/Interfaces/` (interface mới)
- Frontend:
  - `frontend/types/meta-ads.ts`
  - `frontend/lib/api/meta-ads.ts`
  - `frontend/components/meta-ads/create-request/section-adset-audience.tsx`
  - `frontend/components/meta-ads/create-request/create-request-content.tsx`
  - `frontend/components/meta-ads/create-request/summary-rail.tsx`
  - `frontend/components/meta-ads/requests/request-detail-content.tsx` (nếu có)
- Postman/verify: `docs/meta-ads/META_ADS_POSTMAN_COLLECTION.json`

## Acceptance Criteria
- Ad set target SG và/hoặc TW → block "Ad transparency" hiện, cho chọn/nhập Advertiser (+ optional Payer).
- Toggle "advertiser và payer khác nhau" hoạt động; tắt thì payer = beneficiary.
- Một ad set target **đồng thời SG + TW** lưu và gửi được **cả hai cặp** identity (SG dùng `singapore_universal_*`, TW dùng `taiwan_universal_*`) trong cùng `regional_regulation_identities` — TW **không** bị bỏ qua/lỗi.
- Execute payload chỉ chứa key của category đang bật; không gửi field thừa.
- Thiếu beneficiary cho SG/TW → validation chặn submit với message rõ ràng.
- Save/edit/duplicate request giữ nguyên identities.
- Request cũ (không có identities) execute y như trước.

## Test Plan
- Backend build: `dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1`
- Unit/manual cho `BuildAdSetPayloadAsync`:
  - countries=[SG] + beneficiary → payload có `regional_regulation_identities.singapore_universal_beneficiary` + `_payer` (=beneficiary khi payer rỗng), KHÔNG có key taiwan.
  - countries=[SG,TW] + 2 beneficiary → payload có cả `singapore_universal_*` và `taiwan_universal_*`.
  - payer khác beneficiary → payer giữ đúng giá trị nhập.
  - không nhập gì + countries thường (vd US) → không có field `regional_regulation_identities`.
- Validation:
  - countries=[SG], beneficiary trống → block với message Singapore.
  - countries=[TW], beneficiary trống → block với message Taiwan.
- Reference endpoint: `GET ad-accounts/{id}/regulation-identities` trả list (hoặc empty + FE fallback nhập tay), không 500.
- Frontend:
  - SG/TW selected → block hiện, required hoạt động.
  - Non-regulated country → block ẩn.
  - Edit/duplicate → field repopulate.
- Execution smoke: inspect outgoing Meta payload, confirm đúng key map + không field lạ.

## Implementation Notes
- **Bắt buộc verify trước khi finalize execution**: dùng Graph API Explorer / Postman trên **v24.0** xác minh:
  1. Format chính xác value của `regional_regulation_identities` (Page ID hay Business ID hay identity object id).
  2. Response của `GET /act_<id>/dsa_recommendations` (field id/name/type/eligible categories).
  3. EU `dsa_beneficiary`/`dsa_payor` nhận free-text name hay phải là verified ID trên version này.
  Nếu lệch so với SDK `main`, cập nhật mapping cho khớp version dự án và ghi chú trong code/test.
- EU detection: cần danh sách EU country codes (+ associated territories). Nếu dự án chưa có hằng số này, tạo helper `MetaRegulatedRegions` gom mapping country→category dùng chung cho cả FE/BE (tránh lệch logic giữa `BuildAdSetPayloadAsync` và UI).
- Giữ terminology nhất quán: **Advertiser = Beneficiary**, **Payer = Payer**. UI dùng "Advertiser/Payer" (giống Ads Manager), code/API dùng `beneficiary`/`payer`.
- Phase MVP có thể chỉ làm SG + TW + universal (đúng nhu cầu hiện tại), để AU/IN finserv + EU sau — nhưng DTO nên đủ field để khỏi đổi contract về sau.
- Không double-build payload lệch nhau: nếu refactor được, tách hàm `AppendRegionalRegulationIdentities(result, payload, regionalCategories)` dùng chung cho execution + validation + duplicate.
