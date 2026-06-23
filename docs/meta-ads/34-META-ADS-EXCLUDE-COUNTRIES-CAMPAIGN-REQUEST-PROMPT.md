# Prompt 34: Thêm Exclude Countries Cho Meta Campaign Request

## Summary
- Thêm tính năng **Exclude Countries** trong luồng tạo/sửa Meta campaign request.
- Người dùng có thể chọn danh sách quốc gia cần loại trừ khỏi geo targeting hiện tại.
- Backend map danh sách này vào Meta targeting payload `excluded_geo_locations.countries`.
- Giữ nguyên behavior hiện tại của `GLOBAL`, `COUNTRY`, `REGION`, `COUNTRY_GROUP`, `CITY` nếu không chọn excluded countries.

## Business Context
- Hiện Meta request chỉ hỗ trợ include geo qua `geo_locations`:
  - `GLOBAL` => `geo_locations.country_groups = ["worldwide"]`
  - `COUNTRY` => `geo_locations.countries`
  - `REGION` => resolve region thành country codes
  - `COUNTRY_GROUP` => resolve custom group thành country codes
  - `CITY` => `geo_locations.cities`
- Cần thêm exclude country để phục vụ use case phổ biến:
  - Chạy global nhưng loại một số quốc gia.
  - Chạy country group/region nhưng loại country không phù hợp.
  - Reuse country group include nhưng exclude vài nước tùy campaign.

## Important Semantics
- `excluded_geo_locations` là bộ lọc loại trừ trên tập `geo_locations` đang include.
- Nếu muốn “tất cả quốc gia trừ X”, payload phải là:
  - `geo_locations.country_groups = ["worldwide"]`
  - `excluded_geo_locations.countries = ["X"]`
- Nếu include `US, CA, GB` và exclude `CA`, kết quả là `US, GB`, không target thêm quốc gia ngoài include list.
- Nếu exclude country không nằm trong include set, Meta thường không target country đó sẵn nên exclude gần như không ảnh hưởng.

## Key Changes

### 1. Backend DTO / Contract
- Thêm field vào `MetaAdSetDraftDto`:
  - `public List<string> ExcludedCountries { get; set; } = new();`
- Đảm bảo create/update request payload JSON serialize/deserialize backward compatible.
- Request cũ không có `excludedCountries` phải default về empty list.
- Frontend type `MetaAdSetDraft` / request form state thêm:
  - `excludedCountries: string[]`

### 2. Backend Mapper / Normalization
- Cập nhật `MetaAdsMapper` để normalize `ExcludedCountries`:
  - Trim.
  - Uppercase ISO country code.
  - Distinct case-insensitive.
  - Remove empty values.
- Không tự clear `ExcludedCountries` khi đổi `GeoMode`, trừ khi product quyết định clear rõ ràng ở frontend. Khuyến nghị giữ lại để user đổi `GLOBAL/COUNTRY_GROUP/REGION` không mất exclude list.
- Nếu có logic infer geo mode hiện tại, không để `ExcludedCountries` làm đổi `GeoMode`; exclude chỉ là modifier, không phải geo mode.

### 3. Backend Validation
- Cập nhật `MetaCampaignValidationService.ValidateGeoTargetingAsync` và `MetaAdSetDraftValidationService` nếu có validation draft riêng.
- Validate `ExcludedCountries`:
  - Mỗi country code phải là non-empty ISO-like code sau normalize.
  - Không cho duplicate sau normalize.
  - Nếu `GeoMode = COUNTRY`, không cho overlap giữa `Countries` và `ExcludedCountries`; hoặc ít nhất warning/error rõ: “Countries cannot be both included and excluded.”
  - Nếu `GeoMode = CITY`, nếu city country code nằm trong `ExcludedCountries`, báo lỗi hoặc warning mạnh vì targeting có thể conflict.
  - Với `GLOBAL`, `REGION`, `COUNTRY_GROUP`, cho phép exclude countries.
- Không bắt buộc chọn excluded countries; danh sách rỗng là hợp lệ.

### 4. Backend Execution Payload
- Cập nhật `MetaCampaignExecutionService` khi build targeting.
- Hiện đang set:
  - `targeting["geo_locations"] = geoLocations`
- Thêm helper build excluded geo:
  - `BuildExcludedGeoLocations(adSet)` hoặc tương tự.
- Nếu `ExcludedCountries` sau normalize có dữ liệu, thêm:

```csharp
targeting["excluded_geo_locations"] = new Dictionary<string, object?>
{
    ["countries"] = normalizedExcludedCountries
};
```

- Không thêm `excluded_geo_locations` nếu list rỗng.
- Đảm bảo payload Meta cuối cùng có dạng:

```json
{
  "targeting": {
    "geo_locations": {
      "country_groups": ["worldwide"]
    },
    "excluded_geo_locations": {
      "countries": ["CN", "RU"]
    }
  }
}
```

### 5. Frontend Create/Edit Request UI
- Trong `frontend/components/meta-ads/create-request/section-adset-audience.tsx`, thêm section **Exclude Countries** dưới phần Geo Mode hiện tại.
- Dùng lại country picker/options hiện có để tránh duplicate UI logic.
- UX đề xuất:
  - Label: `Exclude countries`
  - Description: `Countries selected here will be removed from the selected geo targeting.`
  - Multi-select searchable country picker.
  - Hiển thị selected badges tương tự include countries.
  - Có nút remove từng country.
- Section này hiển thị cho mọi `GeoMode`, nhưng có help text theo mode:
  - `GLOBAL`: `Targets worldwide except selected countries.`
  - `COUNTRY`: `Excluded countries are removed from the selected country list.`
  - `REGION/COUNTRY_GROUP`: `Excluded countries are removed after resolving selected regions/groups.`
  - `CITY`: `Avoid excluding countries that contain selected cities.`
- Khi user chọn country đang nằm trong include `Countries`, frontend nên prevent hoặc hiển thị validation inline.

### 6. Frontend State / Payload
- Cập nhật initial form state trong `create-request-content.tsx`:
  - `excludedCountries: []`
- Cập nhật hydrate/normalize draft/request payload khi duplicate/edit/request detail nếu có mapper local.
- Cập nhật request submit payload để gửi `adSet.excludedCountries`.
- Cập nhật naming/summary nếu cần:
  - Không bắt buộc đưa exclude vào generated name ở MVP.
  - Summary rail/detail nên hiển thị `Excluded countries: CN, RU` nếu có.

### 7. Request Detail / Campaign Detail Display
- Cập nhật Meta request detail để hiển thị excluded countries trong audience/geo section.
- Nếu campaign detail đọc synced targeting raw JSON, hiển thị `targeting.excluded_geo_locations.countries` nếu có.
- Nếu campaign detail đọc payload request draft, hiển thị `adSet.excludedCountries` nếu có.
- Không làm crash với request/campaign cũ thiếu field.

### 8. Tests / Validation
- Backend unit tests hoặc targeted tests nếu project có sẵn:
  - `GLOBAL + excludedCountries` tạo payload có `geo_locations.country_groups = worldwide` và `excluded_geo_locations.countries`.
  - `COUNTRY + excludedCountries` không overlap thì payload đúng.
  - `COUNTRY + overlap` bị validation error.
  - Empty/null excluded countries không thêm `excluded_geo_locations`.
  - Normalize lowercase/duplicate: `cn`, `CN`, ` ru ` => `CN`, `RU`.
- Frontend smoke:
  - Chọn Geo Mode `GLOBAL`, chọn excluded countries, submit payload có `excludedCountries`.
  - Chọn `COUNTRY_GROUP`, chọn group và excluded countries, summary đúng.
  - Edit/duplicate request cũ không có excluded countries không crash.
- Build/check đề xuất:

```powershell
dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1
```

- Nếu frontend có lint/typecheck targeted, chạy cho các file liên quan; không sửa lỗi unrelated.

## Acceptance Criteria
- User có thể tạo Meta campaign request dạng `GLOBAL` và exclude một/nhiều countries.
- Payload execute lên Meta có `targeting.excluded_geo_locations.countries` đúng chuẩn.
- Existing geo modes vẫn hoạt động như trước nếu không chọn exclude.
- Validation chặn case include/exclude country trùng rõ ràng.
- Request detail/campaign detail hiển thị được excluded countries.
- Không thay đổi TikTok geo trong scope prompt này.

## Out of Scope
- Không common hóa exclude country sang TikTok trong phase này.
- Không thêm exclude city/region/DMA.
- Không thêm country group riêng cho exclude; dùng trực tiếp country codes trước.
- Không thay đổi cách resolve `REGION` hoặc `COUNTRY_GROUP` hiện tại.

## Files Likely To Change
- `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs`
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs`
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDraftValidationService.cs`
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
- `frontend/types/meta-ads.ts`
- `frontend/components/meta-ads/create-request/create-request-content.tsx`
- `frontend/components/meta-ads/create-request/section-adset-audience.tsx`
- `frontend/components/meta-ads/requests/request-detail-content.tsx`
- `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx`

## Notes For Implementing Agent
- Reuse existing country picker data in `section-adset-audience.tsx`; avoid introducing a new country source.
- Keep implementation minimal and backward compatible.
- Prefer helper functions for country normalization to avoid duplicating trim/uppercase/distinct logic.
- Do not create DB migration; this feature lives in request payload JSON and Meta targeting payload.
