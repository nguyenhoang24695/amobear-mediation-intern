# Task: Thêm "Target Language" (Meta targeting `locales`) ngay dưới phần chọn quốc gia khi tạo request campaign

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` — .NET 8 backend + Next.js frontend.
Màn tạo request Meta: `/meta-ads/requests/create`, section **Ad Set – Audience**
(`frontend/components/meta-ads/create-request/section-adset-audience.tsx`).

Cần thêm 1 control **Target Languages** (đa chọn, có search) **ngay dưới phần chọn quốc gia**
(popover "Select countries", dòng ~353-367). Người dùng chọn 0..n ngôn ngữ → khi execute, gửi
vào Meta targeting field **`locales`**. Bỏ trống = Meta nhắm tất cả ngôn ngữ (mặc định), KHÔNG gửi field.

## Tài liệu Meta — cách lấy danh sách ngôn ngữ (đã xác minh)
Meta cung cấp danh sách ngôn ngữ qua **Targeting Search** với `type=adlocale`:
- Endpoint: `GET {graphBaseUrl}/{apiVersion}/search?type=adlocale&q=<query>&limit=<n>&access_token=<token>`
  (vd `https://graph.facebook.com/v24.0/search?type=adlocale&q=en&access_token=...`).
- Response: `{ "data": [ { "key": <int>, "name": "<tên ngôn ngữ>" }, ... ] }`
  — `key` là **số nguyên** (locale ID, vd `6` = "English (US)", `24` = "English (UK)"), `name` là chuỗi hiển thị.
- Dùng trong targeting spec: `targeting.locales = [6, 24, ...]` (mảng các `key` số nguyên).

Tham khảo:
- Targeting Search: https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search
- Basic Targeting (field `locales`): https://developers.facebook.com/docs/marketing-api/audiences/reference/basic-targeting/

> Đây là **đúng cùng cơ chế** với search thành phố đang có trong repo (`type=adgeolocation`).
> Mirror y hệt pattern đó, chỉ đổi `type=adlocale` và `key` parse thành **int**.

## Mẫu tham chiếu sẵn có trong repo (BÁM SÁT)
- **Service search city**: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaGeoReferenceService.cs`
  → `SearchCitiesAsync` (dòng ~98-140): lấy ad account theo org, lấy token qua `_authManager`,
  gọi `/search?type=adgeolocation&q=...`, parse `{data:[{key,name,...}]}`, map DTO, xử lý lỗi Graph
  (`ParseGraphError`/`MapGraphError`). **Copy cấu trúc này cho `SearchAdLocalesAsync`.**
- **Interface**: `backend/MediationPro.Core/Interfaces/IMetaGeoReferenceService.cs` (đã có
  `GetRegionsAsync`, `SearchCitiesAsync`).
- **Controller endpoint city**: `backend/MediationPro.Api/Controllers/MetaReferenceController.cs`
  → `SearchGeoCities` (`[HttpGet("geo/cities")]`, dòng ~484-511): check `HasMetaRequestReadAccessAsync`
  + `HasMetaAdAccountAccessAsync`, gọi service, trả list. **Copy cho endpoint languages.**
- **FE api client**: `frontend/lib/api/meta-ads.ts` — `REFERENCE_PREFIX = "/api/v1/meta-reference"`;
  đã có hàm gọi `geo/regions`, `geo/cities`. Thêm hàm gọi `languages`.
- **FE UI multiselect + search**: trong `section-adset-audience.tsx` đã có popover chọn country
  và (xem trong file) phần search city theo `metaAdAccountId` — mirror cách search-as-you-type đó.

## Yêu cầu implement

### Slice A — BE: reference endpoint danh sách ngôn ngữ
1. **DTO** trong `backend/MediationPro.Core/DTOs/MetaAds/MetaReferenceDtos.cs`:
   ```csharp
   public class MetaAdLocaleReferenceDto
   {
       public int Key { get; set; }
       public string Name { get; set; } = string.Empty;
   }
   ```
2. **Interface** `IMetaGeoReferenceService`: thêm
   `Task<IReadOnlyList<MetaAdLocaleReferenceDto>> SearchAdLocalesAsync(Guid organizationId, int adAccountId, string query, CancellationToken cancellationToken = default);`
   (Cập nhật cả stub test `StubMetaGeoReferenceService` trong
   `backend/MediationPro.Infrastructure.UnitTests/MetaAds/MetaValueOptimizationEligibilityServiceTests.cs` để compile.)
3. **Impl** trong `MetaGeoReferenceService`: mirror `SearchCitiesAsync` nhưng:
   - `request.AddQueryParameter("type", "adlocale");` (KHÔNG có `location_types`).
   - `q` = query trim; cho phép `q` rỗng để list mặc định (đặt `limit` ~ "1000"); nếu muốn giữ
     ngưỡng như city thì cho phép `q.Length == 0` vẫn chạy (list phổ biến) — tối thiểu: khi `q` rỗng
     trả về danh sách (limit 1000) để FE hiển thị được khi mở popover.
   - Parse envelope `{data:[{key:int,name:string}]}`. **`key` là số** → dùng class item riêng với
     `int Key` (hoặc `JsonElement` rồi parse int). Map sang `MetaAdLocaleReferenceDto`,
     lọc bỏ name rỗng, distinct theo `Key`, order theo `Name`.
   - Tái dùng `ParseGraphError`/`MapGraphError` (đổi thông điệp lỗi cho "languages").
4. **Endpoint** trong `MetaReferenceController`:
   ```csharp
   [HttpGet("languages")]
   public async Task<ActionResult<IReadOnlyList<MetaAdLocaleReferenceDto>>> SearchAdLocales(
       [FromQuery] int metaAdAccountId, [FromQuery] string? q, CancellationToken cancellationToken)
   ```
   Mirror `SearchGeoCities`: check `userId`/`organizationId`, `HasMetaRequestReadAccessAsync`,
   `HasMetaAdAccountAccessAsync(metaAdAccountId)`, gọi `_geoReferenceService.SearchAdLocalesAsync(...)`.

### Slice B — BE: lưu lựa chọn + đẩy vào targeting
1. **DTO request**: thêm vào `MetaAdSetDraftDto`
   (`backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`, dòng ~57-86), cạnh `Genders`:
   ```csharp
   public List<int> Locales { get; set; } = new();
   ```
   (Đây là DTO được serialize vào `config_json` của request → round-trip draft/edit tự động.
   Bám đúng cách `Countries`/`Genders` đang được lưu & nạp lại — KHÔNG cần thêm cột DB.)
2. **Targeting builder**: `MetaCampaignExecutionService.BuildAdSetPayloadAsync`
   (`backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`, ~1335-1378).
   Sau khi set `genders` (~1378), thêm:
   ```csharp
   var localeKeys = payload.AdSet.Locales.Where(x => x > 0).Distinct().ToList();
   if (localeKeys.Count > 0)
       targeting["locales"] = localeKeys;
   ```
3. **Sync read-back (nếu có)**: nếu `MetaCampaignSyncService` đang map `targeting` từ Meta về để
   hiển thị/so khớp, thêm `locales` vào phần đọc (tùy kiến trúc hiện có). Nếu sync hiện KHÔNG đọc
   từng field targeting thì BỎ QUA mục này (đừng mở rộng phạm vi).

### Slice C — FE: types, api, form, UI
1. **Types** `frontend/types/meta-ads.ts`: thêm
   `export interface MetaAdLocaleReferenceDto { key: number; name: string }`.
2. **API client** `frontend/lib/api/meta-ads.ts`: thêm trong nhóm reference:
   ```ts
   searchLanguages(metaAdAccountId: number, q: string) {
     return apiClient.get<MetaAdLocaleReferenceDto[]>(
       `${REFERENCE_PREFIX}/languages?metaAdAccountId=${metaAdAccountId}&q=${encodeURIComponent(q)}`)
   }
   ```
   (Bám đúng cách hàm `searchCities`/`getGeoRegions` hiện có gọi.)
3. **Form state**: thêm field `localeKeys: number[]` vào form tạo request (mirror `countries`/`genders`):
   khai báo trong type form + giá trị khởi tạo `[]` + map vào payload `adSet.locales = form.localeKeys`
   khi build request (tìm chỗ build `countries`/`genders` → `MetaAdSetDraftDto` và làm tương tự, kể cả
   chiều nạp lại từ draft: `localeKeys: draft.adSet?.locales ?? []`).
4. **UI** trong `section-adset-audience.tsx`, **ngay dưới** popover chọn country (sau khối dòng ~353-367
   hiển thị danh sách country đã chọn), thêm khối "Target Languages":
   - Label "Target Languages" + mô tả ngắn: "Bỏ trống để nhắm mọi ngôn ngữ (mặc định của Meta)."
   - Multiselect dạng **searchable popover** (mirror city search): gõ ≥2 ký tự → gọi
     `metaReferenceApi.searchLanguages(metaAdAccountId, q)` (debounce ~250ms), hiển thị list `{key,name}`,
     click để toggle vào `form.localeKeys`. Chip/badge các ngôn ngữ đã chọn + nút bỏ chọn từng cái.
   - Disable/ẩn khi chưa chọn ad account (`metaAdAccountId` null) — giống điều kiện city search.
   - Lưu cả `name` để render chip không phải gọi lại API: có thể giữ map `localeLabels: Record<number,string>`
     ở state cục bộ của section (không cần đưa vào form/payload), hoặc đơn giản lưu danh sách object đã chọn
     ở form nếu thuận tiện — **ưu tiên** chỉ lưu `number[]` ở form (payload sạch) + cache label ở state UI.
   - Reuse component popover/command có sẵn trong file (giống country/city). Giữ accessibility cơ bản.
5. (Tùy chọn) `summary-rail.tsx`: nếu summary đang liệt kê targeting (countries/genders), thêm dòng
   "Languages: n selected" cho nhất quán. Không bắt buộc.

## KHÔNG làm
- KHÔNG thêm cột DB / migration (lưu trong `config_json` qua `MetaAdSetDraftDto`).
- KHÔNG đổi cơ chế country/region/city hiện có; chỉ **thêm** locales.
- KHÔNG sửa các section creative/budget/campaign-settings.

## Verify
1. BE build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   (API đang chạy khóa DLL → `-p:BaseOutputPath=obj\check\`. `TreatWarningsAsErrors=false`.)
2. BE test:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
   (Stub interface đã cập nhật → các test hiện có vẫn xanh. Nếu thêm unit test cho
   `BuildAdSetPayloadAsync` rằng `targeting["locales"]` = list int khi `AdSet.Locales` có giá trị thì càng tốt.)
3. FE:
   ```bash
   cd frontend && pnpm typecheck && pnpm lint
   ```
4. E2E thủ công `/meta-ads/requests/create`:
   - Chọn ad account + quốc gia → ngay dưới hiện **Target Languages**; gõ "en" → ra "English (US)",
     "English (UK)"… chọn được nhiều, hiện chip.
   - Lưu draft → mở lại (edit) → ngôn ngữ đã chọn còn nguyên (round-trip config_json).
   - Khi execute/preview payload ad set → `targeting.locales` = mảng số nguyên đúng các key đã chọn;
     bỏ trống → KHÔNG có field `locales`.

## Phạm vi & ràng buộc
- BE: `MetaReferenceDtos.cs`, `IMetaGeoReferenceService.cs`, `MetaGeoReferenceService.cs`,
  `MetaReferenceController.cs`, `MetaCampaignRequestDtos.cs`, `MetaCampaignExecutionService.cs`
  (+ stub test). FE: `types/meta-ads.ts`, `lib/api/meta-ads.ts`, `create-request-content.tsx`,
  `section-adset-audience.tsx` (+ tùy chọn `summary-rail.tsx`).
- Convention: C# PascalCase public/`_camelCase` private, JSON key snake_case (`locales`);
  TS/React camelCase. Bám sát pattern city/country sẵn có.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test BE xanh; `pnpm typecheck`+`pnpm lint` xanh; màn tạo request có ô **Target Languages**
ngay dưới country, search ngôn ngữ từ Meta (`type=adlocale`), lưu/nạp lại được, và payload ad set
gửi `targeting.locales` đúng mảng số nguyên (bỏ trống thì không gửi).
