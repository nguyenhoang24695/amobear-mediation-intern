# Phase 1 — DTO field + static helper (Core)

> Context dùng chung: xem [README.md](README.md). Tính năng: iOS 14+ / SKAdNetwork cho Meta campaign.
> Toggle do USER tự bật (manual), KHÔNG auto-detect. Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.

## Prompt

```
Bổ sung hỗ trợ iOS 14+ / SKAdNetwork cho Meta campaign — Phase 1 (Core, chưa đụng logic execution/validation).

Bối cảnh: campaign App Promotion (objective = OUTCOME_APP_PROMOTION) cho app iOS cần bật cờ Meta
is_skadnetwork_attribution. Cờ do user tự bật.

Việc cần làm:
1. Thêm field `public bool IsSkadnetworkAttribution { get; set; }` vào class MetaCampaignDraftDto trong
   backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs (đặt cạnh IsAdSetBudgetSharingEnabled).
   Mặc định false để backward-compat khi đọc payload_json cũ (System.Text.Json tự gán false nếu thiếu key).
2. Tạo static class MetaIosSkadHelper trong
   backend/MediationPro.Infrastructure/Services/MetaAds/MetaIosSkadHelper.cs
   (namespace MediationPro.Infrastructure.Services.MetaAds) với:
   - public const string Ios145UserOs = "iOS_ver_14.5_and_above";
   - public const int MaxSkanCampaignsPerApp = 9;
   - public const int MaxAdSetsPerSkanCampaign = 5;
   - public static bool IsSkanCampaign(CreateMetaCampaignRequestDto payload): trả true khi
     payload.Campaign.IsSkadnetworkAttribution == true VÀ payload.Campaign.Objective (trim) ==
     "OUTCOME_APP_PROMOTION" (StringComparison.OrdinalIgnoreCase). Guard null payload/Campaign/Objective.

Ràng buộc: KHÔNG sửa execution/validation ở phase này.
```

## Acceptance
- [ ] `MetaCampaignDraftDto.IsSkadnetworkAttribution` tồn tại, mặc định false.
- [ ] `MetaIosSkadHelper` có đủ 3 const + method `IsSkanCampaign`.
- [ ] `dotnet build backend/MediationPro.sln` pass.

## Verify
```powershell
dotnet build backend/MediationPro.sln
```
