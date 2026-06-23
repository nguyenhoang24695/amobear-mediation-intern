# Phase 5 — Edit drawer campaign/adset/ad (Next.js)

> Context dùng chung: xem [README.md](README.md). Tính năng: cập nhật Meta campaign (direct edit đồng bộ).
> Repo: Amobear.Mediation.Tools — Next.js 16 + shadcn/ui. Trả lời tiếng Việt.

## Prompt

```
Thêm UI chỉnh sửa Meta campaign/adset/ad ở trang campaign detail — Phase 5. Yêu cầu backend Phase 4 đã chạy.

Bối cảnh: backend expose
  PATCH /api/v1/meta-campaigns/{id}             (UpdateMetaCampaignConfigDto)
  PATCH /api/v1/meta-campaigns/adsets/{adSetId} (UpdateMetaAdSetDto)
  PATCH /api/v1/meta-campaigns/ads/{adId}       (UpdateMetaAdDto)
Tái dùng field component sẵn có trong frontend/components/meta-ads/create-request/ (budget, bid, targeting,
schedule). Trang detail hiện hiển thị campaign + danh sách ad set + ad.

Việc cần làm:
1. frontend/types/meta-ads.ts: thêm type UpdateMetaCampaignConfig, UpdateMetaAdSet, UpdateMetaAd,
   MetaObjectUpdateResult (khớp DTO backend).
2. API client: thêm 3 hàm patch tương ứng.
3. Drawer/dialog "Edit" cho:
   - Campaign config: name, budget (CBO), bid_strategy, spend_cap, schedule, status.
   - Ad set: name, budget (ABO), bid, targeting, optimization, schedule, status.
   - Ad: name, status.
   Quy tắc UI:
   - **Pre-fill toàn bộ form từ detail hiện tại**, đặc biệt targeting (vì Meta replace toàn bộ — nếu để trống
     sẽ xoá targeting).
   - Field immutable hiển thị READ-ONLY/disabled: objective, buying_type, is_skadnetwork_attribution,
     billing_event. Với app SKAN, khoá user_os ở 14.0 (giống create).
   - Banner cảnh báo: "Sửa budget/bid/optimization/targeting có thể reset learning phase."
   - Budget nhập theo đơn vị major (hiển thị currency của ad account).
4. Sau PATCH thành công → toast + refetch campaign detail; hiển thị Warnings trả về từ backend nếu có.

Ràng buộc: chỉ scope campaign config + adset + ad name/status. KHÔNG làm swap creative.
```

## Acceptance
- [ ] 3 drawer Edit (campaign/adset/ad) pre-fill từ detail, gọi PATCH đúng.
- [ ] Field immutable read-only; targeting pre-fill đầy đủ; banner learning-phase hiển thị.
- [ ] Sau lưu → refetch + toast + show warnings.
- [ ] `pnpm lint && pnpm build` pass.

## Verify
```powershell
cd frontend; pnpm lint; pnpm build
```
