# Task: Fix — Ad flexible bỏ sót Advantage+ Creative (degrees_of_freedom_spec)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend).

Khi tạo request Meta loại **Flexible** có bật **Advantage+ Creative**, payload tạo ad gửi lên Meta
**KHÔNG** chứa `degrees_of_freedom_spec` → các tùy chọn Advantage+ bị bỏ qua. (Các loại creative
khác — single image/video, carousel — vẫn áp dụng đúng.)

### Nguyên nhân (đã xác định)
File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`.
- Single image/video & carousel đều gọi `ApplyDegreesOfFreedomSpec(result, creative)`
  (dòng ~1632, ~1667, ~1707) → có `degrees_of_freedom_spec` bên trong `creative`.
- **`BuildFlexibleAdPayloadAsync`** (dòng ~1721-1748) dựng `inlineCreative` (name + object_story_spec)
  nhưng **KHÔNG** gọi `ApplyDegreesOfFreedomSpec`. → thiếu hẳn.
- Hàm `ApplyDegreesOfFreedomSpec` (dòng ~2117) vẫn nguyên vẹn, đọc `creative.DegreesOfFreedomSpec`
  (advantage_plus_creative, image_touchups, music_generation, text_optimizations, image_animation,
  add_text_overlay, inline_comment) và set key `degrees_of_freedom_spec` vào dict được truyền.

Đây là di chứng của bước revert trước (đã cố ý bỏ `ApplyDegreesOfFreedomSpec` khỏi flexible để
giảm biến số debug render, rồi quên thêm lại).

## Yêu cầu implement
Trong `BuildFlexibleAdPayloadAsync`, sau khi khởi tạo `inlineCreative` (dòng ~1727-1731), thêm:
```csharp
ApplyDegreesOfFreedomSpec(inlineCreative, creative);
```
LƯU Ý: áp lên **`inlineCreative`** (không phải `result`), vì `degrees_of_freedom_spec` phải nằm
**bên trong** object `creative` — đúng như single/carousel.

KHÔNG đổi gì khác (giữ nguyên object_story_spec page-only + creative_asset_groups_spec đã hoạt động).

## Test
File: `backend/MediationPro.Infrastructure.UnitTests/MetaAds/MetaCampaignExecutionServiceTests.cs`
Thêm 1 test cho `BuildFlexibleAdPayloadAsync`: khi
`payload.Creative.DegreesOfFreedomSpec.CreativeFeaturesSpec.AdvantagePlusCreative.EnrollStatus = "OPT_IN"`
(và vài feature khác), assert:
- `payload["creative"]` (chính là inlineCreative) chứa key `degrees_of_freedom_spec`;
- trong đó `creative_features_spec["advantage_plus_creative"]["enroll_status"] == "OPT_IN"`.
Tham khảo cách build DTO của các test flexible sẵn có trong cùng file (dòng ~273+).

## Verify
1. Build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   (API đang chạy khóa DLL → `-p:BaseOutputPath=obj\check\`. `TreatWarningsAsErrors=false`.)
2. Test:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
   Các test flexible hiện có vẫn phải xanh; test mới xanh.
3. E2E: tạo request Flexible có bật Advantage+ Creative → payload tạo ad (xem qua log/preview
   request) phải có `creative.degrees_of_freedom_spec.creative_features_spec` với các enroll_status
   đúng theo toggle đã chọn.

## Phạm vi & ràng buộc
- Chỉ sửa `MetaCampaignExecutionService.cs` (+ test). KHÔNG đụng sync/detail/FE.
- Convention C#: PascalCase public, `_camelCase` private; key JSON snake_case.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test pass; payload tạo ad flexible khi bật Advantage+ Creative chứa
`creative.degrees_of_freedom_spec` đúng các feature enroll_status; có unit test bao trường hợp này.
