# Phase 4 — PATCH endpoints + activity log (Api)

> Context dùng chung: xem [README.md](README.md). Tính năng: cập nhật Meta campaign (direct edit đồng bộ).
> Repo: Amobear.Mediation.Tools (.NET 8). Trả lời tiếng Việt.

## Prompt

```
Expose 3 endpoint PATCH cập nhật Meta campaign/adset/ad — Phase 4. Yêu cầu Phase 3 đã build pass.

Bối cảnh: MetaCampaignsController (backend/MediationPro.Api/Controllers/MetaCampaignsController.cs) đã có
pattern auth + access guard (TryGetContext, HasScreenFunctionAsync(ScreenMetaCampaigns, FnEdit),
HasCampaignAccess, GetAccessibleAppRowIdsAsync, GetAccessibleMetaAdAccountIdsAsync) và LogCampaignActivityAsync.
Tham chiếu method PauseCampaign/UpdateCampaignStatus để bắt chước cấu trúc + cách map MetaGraphApiCallException
→ StatusCode(502).

Việc cần làm:
1. Inject IMetaCampaignUpdateService vào MetaCampaignsController.

2. Thêm 3 endpoint (permission FnEdit, kiểm tra access như UpdateCampaignStatus):
   - [HttpPatch("{id:int}")] UpdateCampaign(int id, UpdateMetaCampaignConfigDto dto, ct)
   - [HttpPatch("adsets/{adSetId:int}")] UpdateAdSet(int adSetId, UpdateMetaAdSetDto dto, ct)
     (load adSet, check accessibleMetaAdAccountIds + appRowId như endpoint DuplicateAdSet đang làm)
   - [HttpPatch("ads/{adId:int}")] UpdateAd(int adId, UpdateMetaAdDto dto, ct)
   Mỗi endpoint:
     - gọi service tương ứng;
     - thành công → LogCampaignActivityAsync với eventType mới + trả Ok(result);
     - bắt KeyNotFoundException → NotFound; InvalidOperationException → BadRequest;
       MetaGraphApiCallException → StatusCode(502, { message, MetaErrorCode, MetaErrorSubcode, MetaErrorType,
       TraceId }) + log status Failed/severity Error (đối chiếu catch trong UpdateCampaignStatus).

3. Thêm constants vào ActivityLogEventTypes: MetaCampaignUpdated, MetaAdSetUpdated, MetaAdUpdated.

Ràng buộc: KHÔNG đụng frontend. Giữ nguyên các endpoint cũ.
```

## Acceptance
- [ ] 3 endpoint PATCH hoạt động, có FnEdit + access guard giống endpoint hiện có.
- [ ] Map lỗi: NotFound / BadRequest / 502 đúng loại exception, có ActivityLog.
- [ ] `ActivityLogEventTypes` có 3 event mới.
- [ ] `dotnet build` pass; test thủ công 1 PATCH campaign đổi name/budget thành công + resync.

## Verify
```powershell
dotnet build backend/MediationPro.sln
# Thủ công: PATCH /api/v1/meta-campaigns/{id} body { "name": "..." } → 200 + campaign detail phản ánh giá trị mới
```
