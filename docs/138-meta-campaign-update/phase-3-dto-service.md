# Phase 3 — Update DTOs + MetaCampaignUpdateService + validation (Core/Infra)

> Context dùng chung: xem [README.md](README.md). Tính năng: cập nhật Meta campaign (direct edit đồng bộ).
> Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.

## Prompt

```
Tạo DTO update + service điều phối update Meta campaign/adset/ad — Phase 3 (chưa đụng controller/frontend).
Yêu cầu Phase 1 + Phase 2 đã build pass.

Bối cảnh: chỉ update field mutable (xem ma trận trong docs/138-meta-campaign-update/README.md). Sau update
thành công phải re-sync object qua IMetaCampaignSyncService.SyncCampaignAsync. Tránh đua với MetaCampaignSyncJob
bằng MetaCampaignSyncLock (entity + repo đã có).

Việc cần làm:
1. DTOs trong backend/MediationPro.Core/DTOs/MetaAds/ (file MetaCampaignDtos.cs hoặc file mới
   MetaCampaignUpdateDtos.cs). CHỈ chứa field editable (KHÔNG tái dùng MetaCampaignDraftDto vì nó mang field
   immutable):
   - UpdateMetaCampaignConfigDto: Name?, DailyBudget? (major), LifetimeBudget? (major), BidStrategy?,
     SpendCap? (major), StartTime?, StopTime?, Status?.
   - UpdateMetaAdSetDto: Name?, DailyBudget?, LifetimeBudget?, BidAmount?, BidStrategy?, RoasAverageFloor?,
     OptimizationGoal?, StartTime?, EndTime?, Status?, + toàn bộ field targeting giống MetaAdSetDraftDto
     (GeoMode, Countries, RegionKeys, CountryGroupIds, CityTargets, AgeMin/Max, Genders, Locales,
     DevicePlatforms, UserOs, PublisherPlatforms, FacebookPositions, InstagramPositions, ExcludedCountries,
     AdvantageAudience). Mục đích: form gửi nguyên targeting (replace toàn bộ).
   - UpdateMetaAdDto: Name?, Status?.
   - MetaObjectUpdateResultDto: ExternalId, đối tượng, Message, List<string> Warnings, TraceId, UpdatedAt.

2. IMetaCampaignUpdateService (Core/Interfaces) + impl MetaCampaignUpdateService
   (Infrastructure/Services/MetaAds):
   - UpdateCampaignAsync(Guid orgId, Guid userId, int campaignId, UpdateMetaCampaignConfigDto dto, ct)
   - UpdateAdSetAsync(Guid orgId, Guid userId, int adSetId, UpdateMetaAdSetDto dto, ct)
   - UpdateAdAsync(Guid orgId, Guid userId, int adId, UpdateMetaAdDto dto, ct)
   Mỗi method:
     a. Load entity (qua repo); nếu null → ném KeyNotFoundException.
     b. Guard: nếu Status archived/deleted → ném InvalidOperationException ("không thể sửa campaign đã
        archived/deleted").
     c. Acquire MetaCampaignSyncLock cho campaign liên quan (adSet/ad lấy MetaCampaignId); nếu đang khoá →
        ném InvalidOperationException ("campaign đang đồng bộ, thử lại sau"). Release ở finally.
     d. Build payload Dictionary<string,object?> CHỈ field non-null:
        - Campaign budget: chỉ set daily/lifetime nếu campaign là CBO (đọc ConfigJson / campaign-level budget
          tồn tại); nếu ABO mà gửi budget campaign → ném InvalidOperationException.
        - AdSet budget: ngược lại — chỉ set khi ABO.
        - Budget/spend_cap/bid: convert major→minor qua MetaCurrencyHelper.ConvertMajorToMinorUnits theo
          currency của MetaAdAccount.
        - AdSet targeting: gọi MetaAdSetTargetingBuilder.BuildTargetingAsync. Nếu campaign là SKAN, giữ user_os
          khoá theo quy tắc SKAN.
        - bid_constraints (roas floor): theo đúng cách BuildAdSetPayloadAsync dựng.
     e. Gọi client (UpdateCampaignAsync / UpdateAdSetFieldsAsync / UpdateAdAsync từ Phase 1).
     f. Thành công → SyncCampaignAsync(orgId, campaignId, ct) để refresh ConfigJson; ghi MetaOperationLog.
     g. Sinh Warnings non-blocking: nếu đổi budget >20% so với giá trị cũ, hoặc đổi bid/optimization/targeting →
        thêm cảnh báo "thao tác này có thể reset learning phase".
   - Bắt MetaGraphApiCallException và để propagate (controller map 502).

Ràng buộc: KHÔNG đụng controller/frontend. Đăng ký service vào DI.
```

## Acceptance
- [ ] 3 update DTO + result DTO tồn tại, chỉ chứa field editable.
- [ ] `IMetaCampaignUpdateService` + impl với 3 method, có guard archived/deleted, sync-lock, CBO/ABO budget, convert major→minor, resync sau update.
- [ ] Warnings learning-phase trả về non-blocking.
- [ ] Service đăng ký DI; `dotnet build` pass.

## Verify
```powershell
dotnet build backend/MediationPro.sln
```
