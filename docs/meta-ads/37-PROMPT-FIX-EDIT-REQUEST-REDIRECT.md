# Task: Fix — Màn edit request Meta không chuyển sang detail sau khi Save

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` — Frontend Next.js.

Tại màn **edit** request Meta (`/meta-ads/requests/{id}/edit`), sau khi bấm **Save**, trang
KHÔNG điều hướng về màn detail (`/meta-ads/requests/{id}`) — ở lại editor. Tái hiện với request
đã `approved` (vd request 52).

### Nguyên nhân (đã xác định)
File: `frontend/components/meta-ads/create-request/create-request-content.tsx`.
Handler `handleSaveDraft` (dòng ~1047-1060) chỉ điều hướng khi status sau khi save là
`pending_approval`:
```ts
const saved = await persistDraft()
if (isEditMode && saved.status === "pending_approval") {
  router.push(`/meta-ads/requests/${saved.id}`)
}
```
NHƯNG backend khi edit một request **non-draft** hợp lệ sẽ **auto-approve** (trả status
`approved`), KHÔNG phải `pending_approval` — xem
`backend/MediationPro.Api/Controllers/MetaCampaignRequestsController.cs` →
`ResetRequestLifecycleForEdit` (dòng ~544-574):
- invalid → `draft`
- previousStatus == `draft` → giữ `draft`
- còn lại (approved/pending/…) + valid → `approved` (auto-approve)

Vì BE trả `approved`, điều kiện FE (`=== "pending_approval"`) không khớp → không chuyển trang.
Điều kiện này viết theo lifecycle cũ, chưa cập nhật theo hành vi auto-approve hiện tại của BE.

## Yêu cầu implement
Sửa `handleSaveDraft` để điều hướng về detail khi save xong request **không còn là draft**:
```ts
if (isEditMode && saved.status !== "draft") {
  router.push(`/meta-ads/requests/${saved.id}`)
}
```
Hành vi kết quả:
- Edit **draft** → save → giữ nguyên editor (tiếp tục soạn).
- Edit **approved/pending/rejected** hợp lệ → save → BE trả non-draft → **chuyển về detail**.
- Edit làm hỏng validation → BE hạ về `draft` → ở lại editor để sửa (đúng mong muốn).

Chỉ sửa đúng điều kiện này. KHÔNG đổi `persistDraft`, `handleSubmit`, hay logic khác.
(Lưu ý kiểu `saved.status` là `MetaRequestStatus` — chuỗi `"draft" | "pending_approval" |
"approved" | ...`; so sánh `!== "draft"` hợp lệ về type.)

## Verify
```bash
cd frontend && pnpm typecheck && pnpm lint
```
Kiểm tra thủ công:
- Mở `/meta-ads/requests/52/edit` (request approved) → sửa gì đó → **Save** → phải nhảy về
  `/meta-ads/requests/52` (detail).
- Tạo/sửa một **draft** → Save → vẫn ở lại editor (không nhảy).
- Sửa một request hợp lệ thành thiếu field bắt buộc (làm invalid) → Save → ở lại editor.

## Phạm vi & ràng buộc
- Chỉ sửa `create-request-content.tsx` (1 điều kiện trong `handleSaveDraft`). KHÔNG đụng BE.
- Convention TS/React: camelCase.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
`pnpm typecheck` + `pnpm lint` xanh; edit request approved (vd 52) Save xong chuyển sang detail;
edit draft Save vẫn ở editor.
