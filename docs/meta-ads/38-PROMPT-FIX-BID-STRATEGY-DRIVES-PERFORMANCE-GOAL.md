# Task: Fix — Đảo chiều phụ thuộc Bid Strategy ⇄ Performance Goal (Bid Strategy là driver chính)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` — Frontend Next.js.
Màn tạo request Meta: `/meta-ads/requests/create`.

### Triệu chứng
Trong section **Campaign Settings**, dropdown **Bid Strategy** đang **disable** option
**"Minimum ROAS"** (`LOWEST_COST_WITH_MIN_ROAS`) chừng nào **Performance Goal** (ở section
**Ad Set - Budget** bên dưới) **chưa** chọn "Maximize value of conversions" (`VALUE`).

→ Thiết kế **bị ngược**: Bid Strategy nằm **phía trên** Performance Goal trong UI
(`CampaignSettingsSection` render trước `AdSetBudgetSection` — xác nhận tại
`frontend/components/meta-ads/create-request/create-request-content.tsx` dòng ~1209 và ~1233),
nhưng lại bị **khóa theo** một select nằm dưới. Người dùng phải cuộn xuống set Performance Goal =
VALUE trước thì mới chọn được Minimum ROAS → vòng lặp con-gà-quả-trứng.

### Mong muốn (đúng)
**Bid Strategy luôn chọn được trước** (là driver chính). Sau khi chọn Bid Strategy, các select
**bên dưới** (Performance Goal) **tự thích nghi** theo Bid Strategy đã chọn:
- Chọn **Minimum ROAS** → Performance Goal tự chuyển sang **VALUE** (và hiện field ROAS Goal).
- Chọn **Cost cap / Bid cap / Target cost** trong khi Performance Goal đang là VALUE → tự chuyển
  Performance Goal về goal hợp lệ đầu tiên (APP_INSTALLS).
- Dropdown Performance Goal vẫn disable các goal không tương thích với Bid Strategy đang chọn
  (hành vi downstream — đã có sẵn, GIỮ NGUYÊN).

## Nguyên nhân (đã xác định)
Hiện đang gate **hai chiều** lẫn nhau nên kẹt:

1. **`frontend/components/meta-ads/create-request/section-campaign-settings.tsx`** — gate Bid Strategy
   THEO Performance Goal (chiều SAI cần bỏ):
   - Dòng ~54-64 `handleBidStrategyChange`: `if (getBidStrategyDisabledReason(value, form.performanceGoalType)) return` → chặn không cho chọn.
   - Dòng ~287-299: mỗi `SelectItem` có `disabled = !!getBidStrategyDisabledReason(strategy.key, form.performanceGoalType)`.
2. **`frontend/components/meta-ads/create-request/section-adset-budget.tsx`** — gate Performance Goal
   THEO Bid Strategy (chiều ĐÚNG, downstream): `getPerformanceGoalOptions(...)` dùng
   `getPerformanceGoalDisabledReasonForBidStrategy(key, bidStrategy)` (dòng ~113-130, ~226). **GIỮ NGUYÊN.**

Các hàm trong `frontend/components/meta-ads/create-request/constants.ts` (đã có sẵn, KHÔNG sửa file này):
- `getAllowedPerformanceGoalsForBidStrategy(bidStrategy)` → goal hợp lệ cho 1 bid strategy
  (`LOWEST_COST_WITH_MIN_ROAS → ["VALUE"]`; `COST_CAP/LOWEST_COST_WITH_BID_CAP/TARGET_COST → ["APP_INSTALLS","APP_EVENT"]`;
  `LOWEST_COST_WITHOUT_CAP → ["APP_INSTALLS","APP_EVENT","VALUE"]`).
- `getAllowedPerformanceGoalTypes(objective)` → goal hợp lệ theo objective (app promotion = cả 3).
- `isPerformanceGoalCompatibleWithBidStrategy(goalType, bidStrategy)` → bool.
- `resolveOptimizationGoal(goalType)` → optimization_goal tương ứng.
- `isBidStrategySupported(value)` → strategy có được hỗ trợ không (hiện luôn true; dùng cho disable thật sự).

## Yêu cầu implement (CHỈ sửa `section-campaign-settings.tsx`)

### 1) Bỏ disable Bid Strategy theo Performance Goal
Trong block render `SelectContent` của Bid Strategy (dòng ~287-299):
- Đổi điều kiện disable: chỉ disable khi strategy **thực sự không hỗ trợ** —
  `const disabled = !isBidStrategySupported(strategy.key)` (KHÔNG dùng `getBidStrategyDisabledReason`
  với `performanceGoalType` nữa).
- Bỏ dòng `reason` lấy từ `getBidStrategyDisabledReason(...)` (và phần render `reason` trong item),
  hoặc thay bằng `UNSUPPORTED_BID_STRATEGY_REASONS[strategy.key]` nếu muốn giữ chỗ hiển thị lý do
  cho strategy không hỗ trợ. Vì hiện không có strategy nào unsupported, tất cả option sẽ luôn chọn được.

### 2) `handleBidStrategyChange`: bỏ chặn + tự thích nghi Performance Goal
Thay thân hàm (dòng ~54-64):
- **Bỏ** `if (getBidStrategyDisabledReason(...)) return`.
- Tính goal kế tiếp: nếu Performance Goal hiện tại đã tương thích với bid strategy mới thì giữ;
  ngược lại chọn goal hợp lệ đầu tiên (giao của "hợp lệ theo strategy" và "hợp lệ theo objective"):
  ```ts
  const handleBidStrategyChange = (value: string) => {
    const allowedByStrategy = getAllowedPerformanceGoalsForBidStrategy(value)
    const allowedByObjective = getAllowedPerformanceGoalTypes(form.campaignObjective)
    const nextGoalType = isPerformanceGoalCompatibleWithBidStrategy(form.performanceGoalType, value)
      ? form.performanceGoalType
      : (allowedByStrategy.find((goal) => allowedByObjective.includes(goal))
          ?? allowedByStrategy[0]
          ?? form.performanceGoalType)

    onChange({
      bidStrategy: value,
      performanceGoalType: nextGoalType,
      optimizationGoal: resolveOptimizationGoal(nextGoalType),
      bidAmount: bidStrategyRequiresBidAmount(value) ? form.bidAmount : "",
      roasAverageFloor: bidStrategyRequiresRoasGoal(value) ? form.roasAverageFloor : "",
    })
  }
  ```
  (Giữ nguyên logic reset `bidAmount`/`roasAverageFloor` theo strategy như cũ.)

### 3) Import bổ sung
Thêm vào dòng import từ `"./constants"` (dòng ~13):
`getAllowedPerformanceGoalsForBidStrategy`, `getAllowedPerformanceGoalTypes`,
`isPerformanceGoalCompatibleWithBidStrategy`, `resolveOptimizationGoal`.
Có thể bỏ `getBidStrategyDisabledReason` khỏi import **nếu không còn dùng** (xem mục 4).

### 4) Box thông tin / cảnh báo phía dưới (dòng ~325-345) — tùy chỉnh nhẹ
- Vì Performance Goal nay tự thích nghi, `selectedBidStrategyCompatible` thường luôn true →
  box cảnh báo hiếm khi bật. GIỮ NGUYÊN cũng được.
- Nếu sau khi bỏ `getBidStrategyDisabledReason` ở mục 1-2 mà dòng ~329 còn tham chiếu hàm này
  (`getBidStrategyDisabledReason(selectedBidStrategy.key, form.performanceGoalType)`), có 2 lựa chọn:
  giữ import + để nguyên dòng đó (an toàn nhất), HOẶC thay bằng chuỗi mô tả tĩnh. **Ưu tiên giữ
  nguyên dòng cảnh báo này** để không phình phạm vi — chỉ cần đảm bảo còn import nếu vẫn dùng.

## KHÔNG đụng
- KHÔNG sửa `constants.ts`, `section-adset-budget.tsx`, hay bất kỳ section nào khác.
- KHÔNG đổi data model `form`, validation submit, hay BE.
- Giữ gating Performance Goal-theo-Bid-Strategy ở `section-adset-budget.tsx` (đó là downstream đúng).

## Verify
```bash
cd frontend && pnpm typecheck && pnpm lint
```
Kiểm tra thủ công tại `/meta-ads/requests/create` (objective app promotion):
1. **Mở mới** → Bid Strategy chọn được **mọi** option ngay, kể cả Minimum ROAS, không cần chạm
   Performance Goal trước.
2. Chọn **Minimum ROAS** → Performance Goal tự thành "Maximize value of conversions" (VALUE) +
   field **ROAS Goal** hiện ra + field **Value event** hiện ở section Ad Set.
3. Đang ở VALUE, đổi Bid Strategy sang **Cost cap** → Performance Goal tự về **App installs**;
   field ROAS Goal biến mất; Bid Amount thành bắt buộc.
4. Dropdown Performance Goal vẫn disable các goal không hợp với bid strategy hiện tại (vd với
   Minimum ROAS thì App installs/App event bị disable) — đúng hành vi downstream.
5. Lowest cost without cap → cả 3 Performance Goal đều chọn được.

## Phạm vi & ràng buộc
- Chỉ sửa `frontend/components/meta-ads/create-request/section-campaign-settings.tsx`.
- Convention TS/React: camelCase.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
`pnpm typecheck` + `pnpm lint` xanh; Bid Strategy luôn chọn được trước (không bị khóa bởi
Performance Goal); chọn Bid Strategy xong Performance Goal tự thích nghi (Minimum ROAS→VALUE,
cost/bid cap→App installs); dropdown Performance Goal vẫn disable goal không tương thích.
