# Phase 5 — Test & Docs

> Context dùng chung: xem [README.md](README.md). Repo: Amobear.Mediation.Tools. Trả lời tiếng Việt.
> Tiền đề: Phase 1-4 đã xong.

## Prompt

```
Hoàn tất iOS 14+ / SKAdNetwork cho Meta campaign — Phase 5 (Test & Docs).

Việc cần làm:
1. Unit test backend (backend/MediationPro.Infrastructure.UnitTests/MetaAds/):
   - MetaCampaignExecutionServiceTests: BuildCampaignPayload có is_skadnetwork_attribution=true khi SKAN;
     user_os = iOS_ver_14.5_and_above khi SKAN; KHÔNG có cờ khi toggle off (campaign thường).
   - MetaCampaignValidationService: chặn khi > 5 variant; chặn khi đạt giới hạn 9 campaign (mock Meta API
     trả >=9 SKAN campaign active); KHÔNG chặn khi Meta API lỗi (graceful).
2. Cập nhật docs:
   - Trong docs/137-meta-ios14-skadnetwork/README.md: đánh dấu các mục trong bảng "Hiện trạng codebase" là
     đã triển khai.
   - Thêm 1 dòng vào bảng "Key Documentation" trong CLAUDE.md (repo root) trỏ tới
     docs/137-meta-ios14-skadnetwork/README.md.
3. Chạy test và BÁO CÁO kết quả trung thực (pass/fail + output):
   dotnet test backend/MediationPro.sln -c Release
   cd frontend && pnpm test
```

## Acceptance
- [ ] Test execution + validation cho SKAN pass.
- [ ] README.md (phase folder) cập nhật trạng thái; CLAUDE.md có link.
- [ ] Toàn bộ test suite pass (hoặc báo rõ phần fail).

## Verify
```powershell
dotnet test backend/MediationPro.sln -c Release
cd frontend; pnpm test
```
