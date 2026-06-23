# Meta iOS 14+ / SKAdNetwork — Implementation Prompts

Bộ prompt tách nhỏ để **nhiều agent/session độc lập** thực thi tính năng iOS 14+ (SKAdNetwork) cho luồng tạo Meta campaign request. Mỗi file phase tự chứa context tối thiểu; file này là index + context dùng chung.

## Thứ tự thực thi

| Phase | File | Nội dung |
|---|---|---|
| 1 | [phase-1-dto-helper.md](phase-1-dto-helper.md) | DTO field + static helper (Core) |
| 2 | [phase-2-build-payload.md](phase-2-build-payload.md) | Set `is_skadnetwork_attribution` + user_os 14.5+ (Execution) |
| 3 | [phase-3-validation.md](phase-3-validation.md) | Validate giới hạn 5 ad set + đếm 9 campaign realtime qua Meta API |
| 4 | [phase-4-frontend.md](phase-4-frontend.md) | Toggle SKAN + UI (Next.js) |
| 5 | [phase-5-test-docs.md](phase-5-test-docs.md) | Unit test + cập nhật docs |
| 6 | [phase-6-detail-display.md](phase-6-detail-display.md) | Hiển thị nhãn iOS 14+ ở request detail & campaign detail |

Backend (1→2→3) phải build pass trước khi sang frontend (4). Làm tuần tự, build sau mỗi phase.

## Context nghiệp vụ dùng chung

Campaign **App Promotion** (`objective = OUTCOME_APP_PROMOTION`) cho app **iOS** phải bật cờ Meta **`is_skadnetwork_attribution = true`** (do Apple ATT/SKAdNetwork). Trên Marketing API đây là field cấp campaign.

Quy tắc Meta: app iOS install bao gồm user iOS 14.5+ → tối đa **9 campaign/ad account**, **5 ad set/campaign**. Ref: <https://www.facebook.com/business/help/651033805513936>

### ⚠️ Cấu trúc payload ĐÚNG cho iOS 14+ (đã verify qua Graph API + reverse-engineer Ads Manager)

Một campaign chỉ được Meta phân loại là "iOS 14+" khi **app (`promoted_object`) nằm ở CẤP CAMPAIGN** — KHÔNG chỉ ở ad set. Nếu thiếu, ad set báo `error_subcode 3955009 "non-iOS14+ campaign"`.

- **Campaign payload:** `is_skadnetwork_attribution: true` **+ `promoted_object: { application_id, object_store_url }`**.
- **Ad set payload:** `user_os: ["iOS_ver_14.0_and_above"]` (KHÔNG dùng `14.5` — Meta reject `Invalid user_os value 1487348`), `user_device: ["iPhone","iPad","iPod"]` (KHÔNG dùng `device_platforms`), và vẫn giữ `promoted_object`.
- **KHÔNG bắt buộc** `smart_promotion_type: GUIDED_CREATION` (đã test: campaign manual + promoted_object ở campaign là đủ).
- Lỗi phụ có thể gặp khi target một số nước (vd Singapore → `3858548` yêu cầu verify advertiser) — là compliance riêng, không liên quan SKAN.

### Quyết định đã chốt
1. **Toggle thủ công** — user tự bật, KHÔNG auto-detect theo platform.
2. **Đếm giới hạn 9 campaign qua Meta API realtime** — không đếm DB local.
3. **Lifetime budget: để Meta tự báo** — không enforce ở app.

## Hiện trạng codebase (đã triển khai)

Monorepo `.NET 8` Clean Architecture (backend) + Next.js 16 (frontend). Meta API version mặc định `v24.0` (config `MetaAds:ApiVersion`). Trả lời tiếng Việt.

> ⚠️ Định vị code bằng **tên class/method**, KHÔNG hardcode line number (số dòng trôi sau mỗi phase).

| Thành phần | File | Method/Class | Trạng thái |
|---|---|---|---|
| Campaign draft DTO | `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs` | `MetaCampaignDraftDto` | Đã thêm `IsSkadnetworkAttribution` |
| Helper SKAN | `backend/MediationPro.Infrastructure/Services/MetaAds/MetaIosSkadHelper.cs` | `MetaIosSkadHelper` | Đã thêm const/rule nhận diện SKAN |
| Build campaign payload | `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs` | `BuildCampaignPayload`, `BuildAppPromotedObject` | Gửi `is_skadnetwork_attribution=true` **+ `promoted_object` ở cấp campaign** khi SKAN |
| Build ad set payload | cùng file | `BuildAdSetPayloadAsync` | SKAN: ép `user_os=["iOS_ver_14.0_and_above"]` + `user_device=[iPhone,iPad,iPod]`, bỏ `device_platforms` |
| Helper SKAN | `.../MetaAds/MetaIosSkadHelper.cs` | `MetaIosSkadHelper` | `Ios14UserOs`, `IosUserDevices`, `MaxSkanCampaignsPerApp`, `MaxAdSetsPerSkanCampaign`, `IsSkanCampaign` |
| Validation | `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs` | `ValidateAsync`, `ValidateSkanRules` | Chặn >5 ad set + đếm realtime giới hạn 9 campaign qua Meta API (graceful fail). user_os do backend ép nên không validate |
| Graph API client (tham khảo) | `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsClient.cs` | — | Validation gọi Graph API trực tiếp bằng `IMetaAuthManager` + `RestClient`, graceful fail khi lỗi |
| Frontend form | `frontend/components/meta-ads/create-request/` + `frontend/types/meta-ads.ts` | — | Toggle manual, lock `userOs`=14.0, badge summary, gửi payload create/edit |

## Verify chung

```powershell
dotnet build backend/MediationPro.sln
dotnet test  backend/MediationPro.sln -c Release
cd frontend; pnpm lint; pnpm build; pnpm test
```
