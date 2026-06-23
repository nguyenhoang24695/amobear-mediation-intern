# Phase 4 — Frontend toggle & UI

> Context dùng chung: xem [README.md](README.md). Repo: Amobear.Mediation.Tools, frontend (Next.js 16 +
> React 19 + shadcn/ui + Tailwind 4). Trả lời tiếng Việt.
> Tiền đề (Phase 1-3 đã xong): backend nhận `campaign.isSkadnetworkAttribution`.

## Prompt

```
Bổ sung iOS 14+ / SKAdNetwork cho Meta campaign — Phase 4 (Frontend).
Thư mục: frontend/components/meta-ads/create-request/
Types: frontend/types/meta-ads.ts | API: frontend/lib/api/meta-ads.ts | Mapper: frontend/lib/meta-ads/mappers.ts

Bối cảnh: campaign iOS 14+ (SKAdNetwork). USER TỰ BẬT toggle (manual), KHÔNG auto-bật. Chỉ áp dụng cho app
iOS + objective OUTCOME_APP_PROMOTION.

Việc cần làm:
1. Thêm field isSkadnetworkAttribution: boolean vào type form draft campaign trong types/meta-ads.ts
   (cạnh specialAdCategories / isAdSetBudgetSharingEnabled). Khởi tạo mặc định false trong
   create-request-content.tsx; include vào payload tạo mới + edit.
2. section-campaign-settings.tsx: thêm Switch "iOS 14+ campaign (SKAdNetwork)".
   - Manual, KHÔNG auto-bật.
   - Chỉ enable khi app mapping là iOS VÀ objective == OUTCOME_APP_PROMOTION; ngược lại disable + tooltip
     giải thích, và reset về false nếu điều kiện không còn thỏa.
   - onChange map vào isSkadnetworkAttribution.
3. section-adset-audience.tsx: khi toggle bật → khoá userOs về iOS 14.5+ và hiển thị cảnh báo
   "Giới hạn 9 campaign iOS 14+/ad account, tối đa 5 ad set/campaign".
4. summary-rail.tsx: badge "iOS 14+ / SKAN" khi bật.
5. Đảm bảo lib/api/meta-ads.ts + lib/meta-ads/mappers.ts gửi campaign.isSkadnetworkAttribution cho cả
   tạo mới và edit (kiểm tra cả app/meta-ads/requests/create + .../[id]/edit).
```

## Acceptance
- [ ] Toggle hiển thị/enable đúng điều kiện iOS + App Promotion; manual, không auto-bật.
- [ ] Bật toggle → userOs khoá 14.5+, hiện cảnh báo giới hạn; summary có badge.
- [ ] Payload create + edit include `isSkadnetworkAttribution`.
- [ ] `pnpm lint` + `pnpm build` pass.

## Verify
```powershell
cd frontend; pnpm lint; pnpm build
```
