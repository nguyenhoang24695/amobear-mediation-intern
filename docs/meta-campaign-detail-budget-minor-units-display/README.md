# Fix: Meta campaign detail hiển thị budget gấp 100 lần (minor-unit chưa quy đổi)

> **Vai trò agent thực hiện:** implement trực tiếp theo tài liệu này. Đây là bug hiển thị tiền tệ (money-correctness), cần cẩn trọng với edge case currency và double-convert.

## 1. Triệu chứng

Ở màn **Meta campaign detail**, `Daily Budget` / `Lifetime Budget` (và các field tiền khác) hiển thị gấp ~100 lần giá trị thật. Ví dụ trên Meta Ads Manager là `$20` thì UI hiện `2000`.

## 2. Root cause (đã điều tra, có bằng chứng)

Meta Marketing API trả tất cả giá trị tiền theo **đơn vị nhỏ nhất của currency** (minor units):
- Currency 2 chữ số thập phân (USD, EUR, …): `$20.00` → `2000`.
- Currency 0 chữ số (JPY, KRW, VND, …): `¥20` → `20` (offset = 1).
- Currency 3 chữ số (BHD, KWD, …): offset = 1000.

App đồng bộ campaign từ Meta và lưu **nguyên giá trị minor-unit** vào `ConfigJson`, rồi trả thẳng ra DTO. UI chỉ trim chuỗi (`formatRawValue`) nên hiển thị nguyên minor-unit.

**Bằng chứng:**
- `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs` → `ToDetailDto(...)` (≈ dòng 891):
  - Campaign: `DailyBudget = campaignConfig?.DailyBudget` (≈910), `LifetimeBudget` (≈911), `SpendCap` (≈912) — gán thẳng, không quy đổi.
  - Ad set summary: `DailyBudget = adSetConfig?.DailyBudget` (≈946), `LifetimeBudget` (≈947), `BudgetRemaining` (≈948), `BidAmount` (≈949) — gán thẳng.
  - Các giá trị này đến từ `CampaignConfigSnapshot` / `AdSetConfigSnapshot` (≈ dòng 1376 và 1409), tất cả kiểu `string?`, parse từ `ConfigJson` mà sync service ghi (chính là minor-unit Meta trả về).
- `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx`: `formatRawValue()` (dòng 134) chỉ `.trim()`, không chia. Dùng tại dòng 334-335 (bảng ad set), 338, 341, 1132-1134 (campaign detail).
- **Currency có sẵn ngay tại chỗ sửa:** trong cùng `ToDetailDto`, object `campaign.MetaAdAccount` đã được load (đang dùng cho `MetaAdAccountId`/`Name`/`BusinessId` ở dòng 919-922). `MetaAdAccount.Currency` là field hợp lệ (xem `MetaAdsMapper.cs:92` `Currency = entity.Currency`). → **không cần thêm query/Include.**
- App đã có logic currency-aware **đúng** cho chiều ngược lại (tạo campaign):
  - `MetaCampaignExecutionService.ConvertMoneyToMinorUnits(decimal, string?)` (dòng 1354) + `GetCurrencyFractionDigits(string?)` (dòng 1372), dùng 2 set `ZeroDecimalCurrencies` (dòng 49) và `ThreeDecimalCurrencies` (dòng 54).
  - **Logic này đang bị duplicate** y hệt trong `MetaAdSetDraftValidationService.cs` (`ZeroDecimalCurrencies` dòng 19, `ThreeDecimalCurrencies` dòng 24, `GetCurrencyFractionDigits` dòng ≈440).

## 3. Quyết định đã chốt với chủ dự án

- **Tầng sửa:** Backend convert ngay trong `ToDetailDto`, dùng `campaign.MetaAdAccount?.Currency`. Frontend **giữ nguyên** (DTO vẫn là `string?`, `formatRawValue` nhận sẵn giá trị đã quy đổi như `"20.00"`).
- **Phạm vi:** **tất cả** field tiền của campaign detail:
  - Campaign: `DailyBudget`, `LifetimeBudget`, `SpendCap`.
  - Ad set summary: `DailyBudget`, `LifetimeBudget`, `BudgetRemaining`, `BidAmount`.

## 4. Việc cần làm

### 4.1. Tạo helper currency dùng chung (Core)

Logic offset currency đang duplicate 2 chỗ và sắp thành 3. Tạo **một** helper tĩnh ở `MediationPro.Core` (được cả `MediationPro.Api` và `MediationPro.Infrastructure` tham chiếu).

Đề xuất file: `backend/MediationPro.Core/Services/MetaAds/MetaCurrencyHelper.cs` (namespace phù hợp với convention hiện có trong Core).

API tối thiểu:

```csharp
public static class MetaCurrencyHelper
{
    // Trả số chữ số thập phân theo ISO currency: 0 (JPY/KRW/VND…), 3 (BHD/KWD…), mặc định 2.
    public static int GetCurrencyFractionDigits(string? currencyCode);

    // major -> minor (giữ hành vi giống ConvertMoneyToMinorUnits hiện tại).
    public static long ConvertMajorToMinorUnits(decimal amount, string? currencyCode);

    // minor (chuỗi thô từ Meta/ConfigJson) -> chuỗi major-unit để hiển thị.
    // - null/empty  -> trả null (UI hiển thị "-").
    // - không parse được decimal -> trả lại nguyên chuỗi gốc (defensive, không nuốt dữ liệu lạ).
    // - parse được  -> amount / multiplier, làm tròn theo fraction digits, ToString(InvariantCulture).
    public static string? ConvertMinorUnitsToMajorString(string? rawMinorUnits, string? currencyCode);
}
```

Yêu cầu nội dung:
- Copy chính xác 2 set `ZeroDecimalCurrencies` và `ThreeDecimalCurrencies` từ `MetaCampaignExecutionService.cs` (dòng 49-57) — **đối chiếu cho khớp 100%**, không tự bịa danh sách.
- `GetCurrencyFractionDigits`: currency null/empty → trả `2` (giữ đúng hành vi hiện tại tại `MetaCampaignExecutionService.cs:1375-1376`).
- `ConvertMajorToMinorUnits`: bê nguyên công thức `decimal.ToInt64(decimal.Round(amount * multiplier, 0, MidpointRounding.AwayFromZero))` với `multiplier = digits switch { 0 => 1m, 3 => 1000m, _ => 100m }`.
- `ConvertMinorUnitsToMajorString`:
  - `multiplier` như trên; `value = parsedDecimal / multiplier`;
  - `decimal.Round(value, digits, MidpointRounding.AwayFromZero)` rồi `.ToString(CultureInfo.InvariantCulture)`;
  - parse bằng `decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)`.

### 4.2. Dùng helper trong `ToDetailDto`

Trong `MetaCampaignsController.ToDetailDto`:
- Lấy `var currency = campaign.MetaAdAccount?.Currency;` một lần.
- Bọc 7 field tiền qua `MetaCurrencyHelper.ConvertMinorUnitsToMajorString(<raw>, currency)`:
  - Campaign `DailyBudget`, `LifetimeBudget`, `SpendCap`.
  - Ad set (trong `adSets.Select(...)`) `DailyBudget`, `LifetimeBudget`, `BudgetRemaining`, `BidAmount`.
- **Không** đụng các field không phải tiền (vd `RoasAverageFloor` có scale riêng `*10000`, để nguyên — xem `ConvertRoasAverageFloor` dòng 1367; không nằm trong phạm vi).

### 4.3. Khử duplicate (bắt buộc, low-risk)

Refactor 2 chỗ private hiện có để gọi helper mới, tránh tồn tại 3 bản:
- `MetaCampaignExecutionService.cs`: `GetCurrencyFractionDigits`/`ConvertMoneyToMinorUnits` → gọi `MetaCurrencyHelper`. Có thể giữ wrapper private mỏng để giảm thay đổi call-site, hoặc thay trực tiếp. Giữ **đúng hành vi** (đặc biệt `ConvertMoneyToMinorUnits` đang dùng khi tạo campaign — không được đổi kết quả).
- `MetaAdSetDraftValidationService.cs`: tương tự, bỏ 2 set + `GetCurrencyFractionDigits` cục bộ, chuyển sang helper.
- Xoá 2 set `ZeroDecimalCurrencies`/`ThreeDecimalCurrencies` ở các class sau khi đã chuyển.

> Nếu việc refactor 4.3 phát sinh rủi ro ngoài dự kiến, tối thiểu vẫn phải hoàn thành 4.1 + 4.2; nhưng ưu tiên làm cả 4.3 vì đây chính là nguồn gốc khiến chiều hiển thị bị bỏ sót.

## 5. KHÔNG được làm (tránh hồi quy)

- **Không** đổi luồng tạo request/khi gửi lên Meta. Form create-request nhập theo major-unit và `ConvertMoneyToMinorUnits` đã đúng — chỉ được refactor về helper với **kết quả y hệt**, không đổi ngữ nghĩa.
- **Không** convert ở frontend, **không** đổi kiểu field DTO (`string?` giữ nguyên).
- **Không** double-convert: giá trị trong `ConfigJson` luôn là minor-unit từ sync; chỉ convert đúng 1 lần ở `ToDetailDto`.

## 6. Acceptance criteria

1. Campaign detail với ad account USD: budget Meta `$20` (Meta trả `2000`) hiển thị `20` hoặc `20.00`, không còn `2000`. Áp dụng cho cả 7 field ở mục 4.2.
2. Ad account JPY (0 thập phân): giá trị `2000` minor-unit hiển thị `2000` (không bị chia 100). Ad account currency 3 thập phân (vd KWD): chia 1000.
3. Field rỗng/null → UI hiển thị `-` (helper trả null).
4. Tạo campaign mới (CBO/ABO) qua app: budget gửi lên Meta **không đổi** so với trước refactor (verify `ConvertMoneyToMinorUnits` cho ra cùng số).
5. Chỉ còn **một** định nghĩa `ZeroDecimalCurrencies`/`ThreeDecimalCurrencies`/`GetCurrencyFractionDigits` trong toàn solution (trong `MetaCurrencyHelper`).
6. `dotnet build` toàn solution: 0 error. Unit test hiện có cho Meta vẫn pass.

## 7. Test đề xuất

Thêm unit test cho `MetaCurrencyHelper` (project test phù hợp, vd `MediationPro.Infrastructure.UnitTests` hoặc test project của Core):
- `ConvertMinorUnitsToMajorString("2000", "USD") == "20"` (hoặc `"20.00"` tùy format chốt — chốt 1 dạng và assert nhất quán).
- `("2000", "JPY") == "2000"`.
- `("20000", "KWD") == "20"` (offset 1000).
- `(null, "USD") == null`, `("", "USD") == null`.
- `("abc", "USD") == "abc"` (defensive passthrough).
- `ConvertMajorToMinorUnits(20m, "USD") == 2000`, `(20m,"JPY")==20`, `(20m,"KWD")==20000` — để khoá hành vi không đổi sau refactor.

## 8. File liên quan (tóm tắt)

| File | Vai trò | Hành động |
|---|---|---|
| `backend/MediationPro.Core/Services/MetaAds/MetaCurrencyHelper.cs` | Helper currency dùng chung | **Tạo mới** |
| `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs` | `ToDetailDto` (≈891), snapshot class (≈1376, 1409) | Bọc 7 field tiền qua helper |
| `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs` | Có `ConvertMoneyToMinorUnits`/`GetCurrencyFractionDigits` + 2 set (49-57, 1354-1382) | Refactor gọi helper |
| `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDraftValidationService.cs` | Duplicate cùng logic (19-25, ≈440) | Refactor gọi helper |
| `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx` | UI hiển thị | **Không đổi** (chỉ để tham chiếu) |

## 9. Ghi chú điều tra thêm (ngoài phạm vi, nên flag)

- Cần kiểm tra xem **campaigns list view** và các nơi khác (vd request detail, summary-rail) có hiển thị budget từ giá trị synced minor-unit không — nếu có thì cùng bug. Phạm vi lần này chỉ là **campaign detail**; nếu phát hiện chỗ khác, báo lại để mở scope riêng, đừng tự ý mở rộng.
