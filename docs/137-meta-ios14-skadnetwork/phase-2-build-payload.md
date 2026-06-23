# Phase 2 — Build payload: SKAN flag + user_os 14.5+ (Execution)

> Context dùng chung: xem [README.md](README.md). Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.
> Tiền đề (Phase 1 đã xong): có `MetaCampaignDraftDto.IsSkadnetworkAttribution` và static class
> `MetaIosSkadHelper` (`Ios145UserOs`, `IsSkanCampaign(...)`) trong `.../Services/MetaAds/`.

## Prompt

```
Bổ sung iOS 14+ / SKAdNetwork cho Meta campaign — Phase 2 (Execution payload).
File chính: backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs
Định vị bằng tên method, KHÔNG hardcode line number.

Bối cảnh: campaign SKAN (MetaIosSkadHelper.IsSkanCampaign(payload) == true) cần set
is_skadnetwork_attribution=true ở cấp campaign và target iOS 14.5+. Cờ do user bật thủ công.

Việc cần làm:
1. Method BuildCampaignPayload(CreateMetaCampaignRequestDto payload, string? currencyCode):
   nếu MetaIosSkadHelper.IsSkanCampaign(payload) == true thì thêm result["is_skadnetwork_attribution"] = true.
   CHỈ thêm khi true (bỏ qua khi false để Meta dùng default).
2. user_os iOS 14.5+: trong BuildAdSetPayloadAsync và/hoặc GetDefaultUserOs:
   - SKAN campaign + user KHÔNG truyền userOs → mặc định ["iOS_ver_14.5_and_above"] (MetaIosSkadHelper.Ios145UserOs)
     thay vì "iOS_ver_9.0_and_above".
   - SKAN campaign + user truyền userOs iOS thấp hơn 14.5 → ép lên 14.5.
   - KHÔNG đổi hành vi cho campaign thường (non-SKAN).
   Lưu ý: GetDefaultUserOs hiện chỉ nhận PaidMediaAppBinding mapping; cần truyền thêm cờ isSkan (hoặc payload)
   và cập nhật mọi call-site.

KHÔNG enforce lifetime budget (để Meta tự báo qua validate_only/create). Giữ nguyên ValidateAdSetCreateAsync
(execution_options=validate_only).
```

## Acceptance
- [ ] Campaign payload có `is_skadnetwork_attribution=true` khi SKAN, vắng mặt khi non-SKAN.
- [ ] user_os SKAN = `iOS_ver_14.5_and_above`; campaign thường giữ nguyên hành vi cũ.
- [ ] `dotnet build` pass; test execution hiện có không vỡ.

## Verify
```powershell
dotnet build backend/MediationPro.sln
dotnet test backend/MediationPro.sln -c Release --filter "MetaCampaignExecutionServiceTests"
```
