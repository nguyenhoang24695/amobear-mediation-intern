# Phase 1 — Client update methods + currency helper (Infra/Core)

> Context dùng chung: xem [README.md](README.md). Tính năng: cập nhật Meta campaign (direct edit đồng bộ).
> Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.

## Prompt

```
Bổ sung Graph API client cho luồng UPDATE Meta campaign/adset/ad — Phase 1 (chưa đụng service/controller).

Bối cảnh: hệ thống đã có UpdateCampaignStatusAsync, UpdateCampaignNameAsync, UpdateAdSetAsync(name,status)
trong backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsClient.cs, theo pattern
ExecuteGraphPostAsync → ParseGraphError → MetaGraphApiCallException. Cần mở rộng để gửi được nhiều field
hơn (gồm targeting là object lồng).

Việc cần làm:
1. MetaAdsClient.cs: thêm overload
   ExecuteGraphPostAsync(string resourcePath, Dictionary<string,object?> payload, string accessToken, CancellationToken ct)
   dùng helper AddPayloadParameters (đã có trong file) để JSON-encode value object lồng (vd targeting),
   thay vì AddParameter chuỗi phẳng như overload Dictionary<string,string> hiện tại.

2. IMetaAdsClient.cs + MetaAdsClient.cs: thêm 3 method (đều trả MetaCampaignPauseResult, theo đúng khuôn
   error-handling của UpdateAdSetAsync hiện có — ParseGraphError, ném MetaGraphApiCallException khi lỗi,
   set HttpStatusCode/MetaErrorCode/Subcode/Type/TraceId):
   - UpdateCampaignAsync(Guid orgId, MetaCampaign campaign, Dictionary<string,object?> fields, CancellationToken ct)
     → POST /{campaign.ExternalCampaignId}, operationName "update_campaign".
   - UpdateAdSetFieldsAsync(Guid orgId, MetaAdSet adSet, Dictionary<string,object?> fields, CancellationToken ct)
     → POST /{adSet.ExternalAdSetId}, operationName "update_ad_set". GIỮ NGUYÊN UpdateAdSetAsync(name,status)
     cũ vì MetaAdSetDuplicateService đang dùng.
   - UpdateAdAsync(Guid orgId, MetaAd ad, string? name, string? status, CancellationToken ct)
     → POST /{ad.ExternalAdId}, operationName "update_ad". Chỉ set name/status nếu non-empty;
     status .ToUpperInvariant().
   Lấy access token qua GetAccessTokenAsync (overload nhận MetaAdAccount + externalId đã có). Với campaign
   dùng GetAccessTokenAsync(orgId, campaign, ct). Với adSet/ad: dùng entity.MetaAdAccount + externalId.

3. backend/MediationPro.Core/Services/MetaAds/MetaCurrencyHelper.cs: thêm hàm ngược
   ConvertMajorToMinorUnits(decimal? major, string? currencyCode): long? — nhân theo số chữ số thập phân
   của currency (đối xứng với ConvertMinorUnitsToMajorString). Currency 0-decimal (vd JPY) không nhân 100.
   Tái dùng đúng bảng/logic exponent mà ConvertMinorUnitsToMajorString đang dùng.

Ràng buộc: KHÔNG sửa service/controller/DTO ở phase này. Không đổi chữ ký method cũ.
```

## Acceptance
- [ ] `ExecuteGraphPostAsync` có overload nhận `Dictionary<string,object?>` dùng `AddPayloadParameters`.
- [ ] `IMetaAdsClient` khai báo `UpdateCampaignAsync`, `UpdateAdSetFieldsAsync`, `UpdateAdAsync`.
- [ ] `UpdateAdSetAsync(name,status)` cũ giữ nguyên chữ ký.
- [ ] `MetaCurrencyHelper.ConvertMajorToMinorUnits` tồn tại, đối xứng với chiều minor→major.
- [ ] `dotnet build backend/MediationPro.sln` pass.

## Verify
```powershell
dotnet build backend/MediationPro.sln
```
