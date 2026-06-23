# Phase 6 — Hiển thị nhãn "iOS 14+" ở Request detail & Campaign detail

> Context dùng chung: xem [README.md](README.md). Repo: Amobear.Mediation.Tools (.NET 8 + Next.js 16). Trả lời tiếng Việt.
> Tiền đề: tính năng iOS 14+/SKAdNetwork đã triển khai. Cờ SKAN của campaign = `is_skadnetwork_attribution`.
> - Ở **request**: payload đã có `campaign.isSkadnetworkAttribution` (DTO `MetaCampaignDraftDto`).
> - Ở **campaign**: giá trị nằm trong `campaign.ConfigJson` (do `BuildCampaignPayload` lưu khi tạo qua tool),
>   đọc qua `ParseCampaignConfig` trong `MetaCampaignsController`.

## Mục tiêu
Hiển thị rõ một request/campaign có phải **iOS 14+ (SKAdNetwork)** hay không, tại trang chi tiết request và chi tiết campaign.

## Prompt

```
Thêm hiển thị nhãn "iOS 14+ / SKAN" ở Meta request detail và campaign detail. Định vị code bằng tên class/method,
KHÔNG hardcode line number.

=== PHẦN A — REQUEST DETAIL (chỉ frontend) ===
File: frontend/components/meta-ads/requests/request-detail-content.tsx
- Payload chi tiết request (MetaCampaignRequestDetailDto.payload.campaign) đã có field isSkadnetworkAttribution
  (type frontend MetaCampaignDraftDto trong frontend/types/meta-ads.ts).
- Tại khu vực hiển thị thông tin Campaign trong request detail, thêm 1 badge/dòng "iOS 14+ / SKAN" khi
  payload.campaign.isSkadnetworkAttribution === true (ẩn khi false/null). Style giống các badge sẵn có
  (tham khảo summary-rail.tsx đã có badge tương tự: <Badge className="bg-blue-100 text-blue-700">iOS 14+ / SKAN</Badge>).

=== PHẦN B — CAMPAIGN DETAIL (backend + frontend) ===
Backend file: backend/MediationPro.Api/Controllers/MetaCampaignsController.cs
1. Class CampaignConfigSnapshot (private sealed, dùng để parse ConfigJson): thêm property
   [JsonPropertyName("is_skadnetwork_attribution")] public bool? IsSkadnetworkAttribution { get; set; }
2. Method build MetaCampaignDetailDto (chỗ `return new MetaCampaignDetailDto { ... BidStrategy = campaignConfig?.BidStrategy, ... }`):
   gán IsSkadnetworkAttribution = campaignConfig?.IsSkadnetworkAttribution ?? false.

Backend DTO file: backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignDtos.cs
3. Class MetaCampaignDetailDto: thêm `public bool IsSkadnetworkAttribution { get; set; }` (cạnh BidStrategy/SpecialAdCategories).

Frontend:
4. frontend/types/meta-ads.ts — interface MetaCampaignDetailDto: thêm `isSkadnetworkAttribution?: boolean | null`.
5. frontend/components/meta-ads/campaigns/campaign-detail-content.tsx — hiển thị badge/dòng "iOS 14+ / SKAN"
   khi campaign.isSkadnetworkAttribution === true, đặt cạnh Objective/Status hiện có.

BẮT BUỘC — sync ghi đè ConfigJson (đã verify):
 - MetaCampaignSyncService.CampaignFields đã fetch sẵn "is_skadnetwork_attribution" từ Meta.
 - NHƯNG class private `CampaignItem` (dùng deserialize rồi serialize lại vào ConfigJson) PHẢI có property:
     [JsonPropertyName("is_skadnetwork_attribution")] public bool? IsSkadnetworkAttribution { get; set; }
   Thiếu property này → field bị rớt khi round-trip → ConfigJson mất cờ → campaign detail luôn hiện false,
   và mỗi lần sync chạy sẽ GHI ĐÈ ConfigJson của campaign tạo qua tool (cũng mất cờ).
 - Sau khi sửa: rebuild + restart API, rồi re-sync campaign để ConfigJson được nạp lại cờ.

Kiểm tra: dotnet build backend/MediationPro.sln ; cd frontend && pnpm lint && pnpm build.
```

## Acceptance
- [ ] Request detail: badge "iOS 14+ / SKAN" hiện khi `payload.campaign.isSkadnetworkAttribution=true`, ẩn khi false.
- [ ] Campaign detail: `MetaCampaignDetailDto.IsSkadnetworkAttribution` được map từ ConfigJson; FE hiện badge tương ứng.
- [ ] Build backend + `pnpm build` frontend pass.

## Verify
```powershell
dotnet build backend/MediationPro.sln
cd frontend; pnpm lint; pnpm build
```
