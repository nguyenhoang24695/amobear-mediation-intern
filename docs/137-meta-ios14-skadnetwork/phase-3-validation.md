# Phase 3 — Validation + đếm campaign realtime qua Meta API

> Context dùng chung: xem [README.md](README.md). Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.
> Tiền đề (Phase 1-2 đã xong): có `MetaCampaignDraftDto.IsSkadnetworkAttribution`, `MetaIosSkadHelper`,
> payload đã set `is_skadnetwork_attribution`.

## Prompt

```
Bổ sung iOS 14+ / SKAdNetwork cho Meta campaign — Phase 3 (Validation, chặn sớm trước khi tốn quota Meta).
File chính: backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs
Tham khảo gọi Graph API + token: backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsClient.cs
(IMetaAuthManager.GetAccessTokenAsync, _apiVersion, base url https://graph.facebook.com).

Bối cảnh: campaign iOS 14+ bị Meta giới hạn 9 campaign SKAN/ad account, 5 ad set/campaign, target iOS 14.5+.

Việc cần làm — trong ValidateAsync, thêm nhánh khi MetaIosSkadHelper.IsSkanCampaign(request) == true:
1. request.AdVariants?.Count <= MetaIosSkadHelper.MaxAdSetsPerSkanCampaign (5); vượt → errors.Add
   ("...tối đa 5 ad set cho campaign iOS 14+...").
2. user_os: nếu user truyền userOs iOS thấp hơn 14.5 → errors.Add (chỉ chặn, không tự nâng ở validation).
3. ĐẾM REALTIME qua Meta Graph API — campaign SKAN đang active của ad account đang chọn:
   GET /{apiVersion}/act_{externalAdAccountId}/campaigns
       ?fields=id,name,effective_status,is_skadnetwork_attribution
       &filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","IN_PROCESS","WITH_ISSUES","PENDING_REVIEW"]}]
       &limit=...   (paginate nếu cần)
   Đếm campaign có is_skadnetwork_attribution == true. Nếu >= MetaIosSkadHelper.MaxSkanCampaignsPerApp (9)
   → errors.Add("Đã đạt giới hạn 9 campaign iOS 14+ cho ad account này.").
   - Lấy token qua IMetaAuthManager (DI vào service nếu chưa có).
   - GRACEFUL FAIL: gọi Meta API lỗi (network/timeout/permission) → log warning và KHÔNG chặn (để Meta tự
     báo khi create). Tránh false-block do lỗi tạm thời.

Phạm vi v1: đếm theo ad account đang chọn. Ghi // TODO: mở rộng đếm cross-account theo app (9 campaign thực
tế là theo app qua tối đa 9 ad account).
```

## Acceptance
- [ ] > 5 variant → báo lỗi; user_os iOS < 14.5 với SKAN → báo lỗi.
- [ ] Đếm SKAN campaign qua Meta API; >= 9 → báo lỗi.
- [ ] Meta API lỗi → log warning, KHÔNG chặn request.
- [ ] `dotnet build` pass; test mới (mock Meta API) pass.

## Verify
```powershell
dotnet build backend/MediationPro.sln
dotnet test backend/MediationPro.sln -c Release --filter "MetaCampaignValidation"
```
