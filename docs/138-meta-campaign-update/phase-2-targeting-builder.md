# Phase 2 — Tách MetaAdSetTargetingBuilder dùng chung (refactor)

> Context dùng chung: xem [README.md](README.md). Tính năng: cập nhật Meta campaign (direct edit đồng bộ).
> Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.

## Prompt

```
Tách logic dựng targeting của ad set ra helper dùng chung cho cả CREATE và UPDATE — Phase 2 (refactor thuần,
không đổi hành vi create).

Bối cảnh: backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs hiện dựng
targeting bên trong BuildAdSetPayloadAsync, dùng các private method BuildGeoLocationsAsync,
BuildExcludedGeoLocations và logic age/gender/locales/device_platforms/publisher_platforms/
facebook_positions/instagram_positions/user_os/user_device/targeting_automation. Luồng update (phase 3)
cũng cần dựng targeting y hệt → phải dùng chung để tránh lệch.

Việc cần làm:
1. Tạo class MetaAdSetTargetingBuilder trong
   backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetTargetingBuilder.cs
   (namespace MediationPro.Infrastructure.Services.MetaAds), expose:
   BuildTargetingAsync(Guid orgId, MetaAdSetDraftDto adSet, bool isSkanCampaign, CancellationToken ct)
     : Task<Dictionary<string,object?>>
   chuyển toàn bộ logic geo + demographic + placement + user_os/user_device + targeting_automation
   (gồm BuildGeoLocationsAsync / BuildExcludedGeoLocations) vào đây. Giữ nguyên các quy tắc SKAN
   (user_os=["iOS_ver_14.0_and_above"], user_device=[iPhone,iPad,iPod], bỏ device_platforms) — tham chiếu
   docs/137-meta-ios14-skadnetwork.

2. Sửa MetaCampaignExecutionService.BuildAdSetPayloadAsync gọi MetaAdSetTargetingBuilder thay cho code inline.
   Inject builder qua DI (đăng ký trong Program.cs / module DI của Infrastructure, scoped).

3. Dependency của builder (vd repo country-group/region để resolve geo) phải được inject vào builder thay vì
   execution service nếu cần. Giữ nguyên hành vi: payload create KHÔNG được đổi.

Ràng buộc: refactor không đổi output JSON của luồng create. Chạy test create để xác nhận.
```

## Acceptance
- [ ] `MetaAdSetTargetingBuilder.BuildTargetingAsync` chứa toàn bộ logic targeting (geo + demo + placement + user_os).
- [ ] `BuildAdSetPayloadAsync` gọi builder, không còn code targeting inline trùng lặp.
- [ ] Builder đăng ký DI; quy tắc SKAN giữ nguyên.
- [ ] `dotnet build` + `dotnet test` (test create/SKAN) pass — output payload create không đổi.

## Verify
```powershell
dotnet build backend/MediationPro.sln
dotnet test  backend/MediationPro.sln -c Release
```
