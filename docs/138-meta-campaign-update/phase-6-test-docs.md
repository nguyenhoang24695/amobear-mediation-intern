# Phase 6 — Unit test + cập nhật docs

> Context dùng chung: xem [README.md](README.md). Tính năng: cập nhật Meta campaign (direct edit đồng bộ).
> Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.

## Prompt

```
Viết test + chốt docs cho tính năng update Meta campaign — Phase 6. Yêu cầu Phase 1→5 đã xong.

Việc cần làm:
1. Unit test (backend/MediationPro.Infrastructure.UnitTests/MetaAds/):
   - MetaCurrencyHelperTests: bổ sung case ConvertMajorToMinorUnits (currency 2-decimal vd USD, 0-decimal vd
     JPY) — đối xứng với chiều minor→major.
   - MetaCampaignUpdateServiceTests: mock IMetaAdsClient + IMetaCampaignSyncService + repo + sync-lock.
     Cover:
     * Campaign CBO: gửi daily_budget → payload có daily_budget (minor); ABO mà gửi budget campaign → ném
       InvalidOperationException.
     * AdSet ABO: gửi budget → payload đúng; targeting build qua MetaAdSetTargetingBuilder.
     * Campaign archived/deleted → ném InvalidOperationException, KHÔNG gọi client.
     * Update thành công → có gọi SyncCampaignAsync; Warnings learning-phase xuất hiện khi đổi budget >20%.
     * SKAN campaign: user_os giữ khoá 14.0 trong payload adset.
2. Cập nhật docs:
   - docs/138-meta-campaign-update/README.md: tick trạng thái "đã triển khai" ở bảng hiện trạng.
   - Nếu có docs tổng quan Meta (vd docs/99 hoặc mục Meta integration), thêm 1 dòng trỏ tới tính năng update.

Ràng buộc: test phải xanh; không sửa logic ngoài việc cần để test pass.
```

## Acceptance
- [ ] `MetaCurrencyHelperTests` cover chiều major→minor (2-decimal + 0-decimal).
- [ ] `MetaCampaignUpdateServiceTests` cover CBO/ABO, archived guard, resync, warnings, SKAN user_os lock.
- [ ] Docs cập nhật trạng thái triển khai.
- [ ] `dotnet test backend/MediationPro.sln -c Release` pass.

## Verify
```powershell
dotnet test backend/MediationPro.sln -c Release
```
