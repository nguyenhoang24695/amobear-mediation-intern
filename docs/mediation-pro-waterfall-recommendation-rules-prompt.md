# Mediation Pro - Waterfall Recommendation Rules Management UI Design Prompt

## Tổng quan

Prompt này dùng để thiết kế màn hình quản lý Rules cho Waterfall Recommendation trong "Mediation Pro" - nền tảng quản lý ad mediation. Màn hình cho phép quản lý configs theo từng app và quản lý rules động cho waterfall recommendation engine.

## Tech Stack & Theme

- **Framework**: Next.js 16 + React 19
- **UI Library**: shadcn/ui (style: "new-york")
- **Styling**: Tailwind CSS 4 với oklch color system
- **Icons**: Lucide React
- **Components**: Card, Table, Badge, Button, Switch, Select, Input, Dialog, Tooltip, Alert, Tabs, Checkbox

## Color Reference

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary | Blue | bg-blue-600, text-blue-600, hover:bg-blue-700 |
| Success | Green | bg-green-500, text-green-600 |
| Warning | Amber | bg-amber-500, text-amber-600 |
| Error | Red | bg-red-500, text-red-600 |
| Active Rule | Green | bg-green-100, text-green-700 |
| Inactive Rule | Gray | bg-slate-100, text-slate-600 |
| Priority High | Red | bg-red-100, text-red-700 |
| Priority Medium | Amber | bg-amber-100, text-amber-700 |
| Priority Low | Blue | bg-blue-100, text-blue-700 |

## Data Model

### WaterfallRecommendationConfig (theo app)
- `id`: int
- `appId`: int? (nullable - null = global config)
- `minRecommendations`: int (ví dụ: 5)
- `maxRecommendations`: int (ví dụ: 20)
- `minMatchRatePercent`: decimal (ví dụ: 3.0)
- `minSowPercent`: decimal (ví dụ: 0.9)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### WaterfallRecommendationRule (global, áp dụng cho tất cả apps)
- `id`: int
- `displayOrder`: int (thứ tự đánh giá, nhỏ = ưu tiên trước)
- `name`: string (tên rule, ví dụ: "Remove Low SoW")
- `isActive`: boolean
- `conditionSowMin`: decimal? (SoW % tối thiểu)
- `conditionSowMax`: decimal? (SoW % tối đa)
- `conditionMatchRateMin`: decimal? (Match Rate % tối thiểu)
- `conditionMatchRateMax`: decimal? (Match Rate % tối đa)
- `conditionOnlyOneInstance`: boolean? (chỉ khi MG còn 1 instance)
- `conditionIsHighestFloor`: boolean? (true = là floor cao nhất, false = không phải)
- `action`: string (REMOVE | KEEP | TEST REDUCE | INCREASE 10% | INCREASE 20% | ADD LAYER | ADD HIGHER)
- `actionMultiplier`: decimal? (hệ số nhân, ví dụ: 1.10, 1.20, 1.40)
- `actionUseMidpoint`: boolean (true = dùng midpoint cho ADD LAYER)
- `reasonTemplate`: string? (mô tả lý do)
- `priority`: string (low | medium | high)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## API Endpoints (giả định)

- `GET /api/v1/waterfall-recommendation/configs`: Lấy danh sách configs (có thể filter theo appId)
- `GET /api/v1/waterfall-recommendation/configs/{id}`: Lấy config theo ID
- `POST /api/v1/waterfall-recommendation/configs`: Tạo config mới (có thể cho nhiều apps)
- `PUT /api/v1/waterfall-recommendation/configs/{id}`: Cập nhật config
- `DELETE /api/v1/waterfall-recommendation/configs/{id}`: Xóa config
- `GET /api/v1/waterfall-recommendation/rules`: Lấy danh sách rules (ordered by displayOrder)
- `GET /api/v1/waterfall-recommendation/rules/{id}`: Lấy rule theo ID
- `POST /api/v1/waterfall-recommendation/rules`: Tạo rule mới
- `PUT /api/v1/waterfall-recommendation/rules/{id}`: Cập nhật rule
- `DELETE /api/v1/waterfall-recommendation/rules/{id}`: Xóa rule
- `PUT /api/v1/waterfall-recommendation/rules/reorder`: Cập nhật thứ tự rules
- `GET /api/v1/structure/apps`: Lấy danh sách apps để select

---

## PROMPT: Waterfall Recommendation Rules Management Page

```
Design a modern recommendation rules management page for "Mediation Pro" - an ad mediation management platform. This page allows administrators to manage waterfall recommendation configurations per app and manage dynamic rules for the recommendation engine.

**Page Layout:**
- Full-width container with max-width constraint
- White background with subtle slate-50 page background
- Spacing: space-y-6 between sections

**Page Header Section:**
- Title: "Waterfall Recommendation Rules" (text-3xl, font-bold, text-slate-900)
- Subtitle: "Manage recommendation configurations and rules for waterfall optimization" (text-sm, text-slate-500)
- Right side: Action buttons row
  - Button "Create Config" (primary, blue-600)
    - Icon: Plus (lucide-react)
  - Button "Create Rule" (primary, blue-600)
    - Icon: Plus (lucide-react)
  - Button "Refresh" (ghost variant)
    - Icon: RefreshCw (lucide-react)

**Tabs Navigation:**
- Tab 1: "App Configs" (active by default)
  - Icon: Settings (lucide-react)
  - Badge: {configCount} (nếu có)
- Tab 2: "Rules"
  - Icon: ListChecks (lucide-react)
  - Badge: {activeRulesCount}/{totalRulesCount}

**Tab 1: App Configs**

**Stats Cards Row:**
Grid 3 columns (responsive: 2 cols tablet, 1 col mobile):
- Card 1: "Total Configs"
  - Value: {totalConfigs} (text-2xl, font-bold, text-slate-900)
  - Icon: Settings (lucide-react, slate-600)
  - Background: slate-50
- Card 2: "App-Specific"
  - Value: {appSpecificCount} (text-2xl, font-bold, text-blue-600)
  - Icon: Smartphone (lucide-react, blue-600)
  - Background: blue-50
- Card 3: "Global Config"
  - Value: {globalConfigExists ? "1" : "0"} (text-2xl, font-bold, text-slate-600)
  - Icon: Globe (lucide-react, slate-600)
  - Background: slate-50

**Filters & Search Bar:**
- Left side:
  - Search input with Search icon (lucide-react) on left
    - Placeholder: "Search by app name..."
    - Width: w-64
  - Select filter "Type" (w-32)
    - Options: "All", "App-Specific", "Global"
- Right side:
  - Button "Export" (outline variant)
    - Icon: Download (lucide-react)

**Configs Table Card:**
- White card with border-slate-200, rounded-lg, shadow-sm
- Table with hover:bg-slate-50 rows

**Table Columns:**
1. **App(s)** (flex-1)
   - Display: App names (comma-separated) hoặc "Global" badge
   - Font: font-medium, text-slate-900
   - Subtitle: App IDs (text-xs, text-slate-500)
   - Icon: Smartphone (lucide-react, w-4 h-4, text-slate-400) hoặc Globe (lucide-react) cho global

2. **Min/Max Recommendations** (w-40)
   - Display: "{minRecommendations} - {maxRecommendations}"
   - Font: text-sm, text-slate-700

3. **Min Match Rate** (w-32)
   - Display: "{minMatchRatePercent}%"
   - Font: text-sm, text-slate-700

4. **Min SoW** (w-32)
   - Display: "{minSowPercent}%"
   - Font: text-sm, text-slate-700

5. **Last Updated** (w-40)
   - Date: `updatedAt` formatted (text-sm, text-slate-500)
   - Format: "Jan 15, 2025" hoặc "2 hours ago" (relative)

6. **Actions** (w-20)
   - Dropdown menu (MoreHorizontal icon)
   - Menu items:
     - "Edit" (Edit icon)
     - "Duplicate" (Copy icon)
     - "Delete" (Trash2 icon, destructive)

**Empty State:**
- Centered content in card
- Icon: Settings (w-16 h-16, text-slate-400)
- Title: "No configurations found"
- Description: "Create your first configuration to get started"
- Button: "Create Config" (primary, blue-600)

**Create/Edit Config Dialog:**
- Title: "Create Configuration" / "Edit Configuration"
- Form fields:
  - **Apps Selection** (Multi-select với search)
    - Label: "Select Apps" (required)
    - Helper text: "Select one or more apps. Leave empty for global config."
    - Component: Multi-select dropdown với search
    - Display: Selected apps as badges (có thể remove)
    - Option: "Global (All Apps)" checkbox
  - **Min Recommendations** (Input, number, required)
    - Default: 5
    - Min: 1, Max: 100
  - **Max Recommendations** (Input, number, required)
    - Default: 20
    - Min: 1, Max: 100
  - **Min Match Rate %** (Input, number, required, step: 0.1)
    - Default: 3.0
    - Min: 0, Max: 100
    - Helper text: "Minimum match rate percentage threshold"
  - **Min SoW %** (Input, number, required, step: 0.01)
    - Default: 0.9
    - Min: 0, Max: 100
    - Helper text: "Minimum Share of Wallet percentage threshold"
- Footer:
  - Cancel button (outline)
  - Save button (primary, blue-600)
  - Loading state: "Saving..." with spinner

**Tab 2: Rules**

**Stats Cards Row:**
Grid 3 columns:
- Card 1: "Total Rules"
  - Value: {totalRules} (text-2xl, font-bold, text-slate-900)
  - Icon: ListChecks (lucide-react, slate-600)
  - Background: slate-50
- Card 2: "Active"
  - Value: {activeRulesCount} (text-2xl, font-bold, text-green-600)
  - Icon: CheckCircle (lucide-react, green-600)
  - Background: green-50
- Card 3: "Inactive"
  - Value: {inactiveRulesCount} (text-2xl, font-bold, text-slate-600)
  - Icon: XCircle (lucide-react, slate-600)
  - Background: slate-50

**Filters & Search Bar:**
- Left side:
  - Search input with Search icon (lucide-react) on left
    - Placeholder: "Search rules..."
    - Width: w-64
  - Select filter "Status" (w-32)
    - Options: "All", "Active", "Inactive"
  - Select filter "Priority" (w-32)
    - Options: "All", "High", "Medium", "Low"
  - Select filter "Action" (w-40)
    - Options: "All", "REMOVE", "KEEP", "INCREASE 10%", "INCREASE 20%", "ADD LAYER", "ADD HIGHER"
- Right side:
  - Button "Export" (outline variant)
    - Icon: Download (lucide-react)

**Rules Table Card:**
- White card with border-slate-200, rounded-lg, shadow-sm
- Table with drag handles for reordering (optional)
- Table with hover:bg-slate-50 rows

**Table Columns:**
1. **Order** (w-16)
   - Display: {displayOrder} (text-sm, font-mono, text-slate-500)
   - Drag handle icon (GripVertical) for reordering

2. **Rule Name** (flex-1)
   - Display: `name` (font-medium, text-slate-900)
   - Subtitle: Conditions summary (text-xs, text-slate-500)
   - Icon: ListChecks (lucide-react, w-4 h-4, text-slate-400) on left

3. **Status** (w-24)
   - Badge component
   - Active: "bg-green-100 text-green-700" + dot indicator (green-500)
   - Inactive: "bg-slate-100 text-slate-600" + dot indicator (slate-400)
   - Text: "Active" / "Inactive"

4. **Conditions** (w-64)
   - SoW: {conditionSowMin}% - {conditionSowMax}% (nếu có)
   - Match Rate: {conditionMatchRateMin}% - {conditionMatchRateMax}% (nếu có)
   - Special: "Only one instance" / "Highest floor" (nếu có)
   - Format: text-xs, text-slate-600, multiple lines
   - Tooltip: Show full conditions

5. **Action** (w-48)
   - Badge với màu theo action:
     - REMOVE: red
     - KEEP: blue
     - INCREASE: green
     - ADD LAYER / ADD HIGHER: purple
   - Multiplier: {actionMultiplier}x (nếu có)
   - Text: {action} (text-sm, font-medium)

6. **Priority** (w-32)
   - Badge:
     - High: "bg-red-100 text-red-700"
     - Medium: "bg-amber-100 text-amber-700"
     - Low: "bg-blue-100 text-blue-700"
   - Text: {priority} (capitalize)

7. **Actions** (w-20)
   - Dropdown menu (MoreHorizontal icon)
   - Menu items:
     - "Edit" (Edit icon)
     - "Duplicate" (Copy icon)
     - "Enable/Disable" (Toggle icon)
     - Separator
     - "Move Up" (ArrowUp icon) - chỉ khi không phải đầu tiên
     - "Move Down" (ArrowDown icon) - chỉ khi không phải cuối cùng
     - Separator
     - "Delete" (Trash2 icon, destructive)

**Empty State:**
- Centered content in card
- Icon: ListChecks (w-16 h-16, text-slate-400)
- Title: "No rules configured"
- Description: "Create your first rule to get started"
- Button: "Create Rule" (primary, blue-600)

**Create/Edit Rule Dialog:**
- Title: "Create Rule" / "Edit Rule"
- Form fields (tabs hoặc sections):
  
  **Basic Information:**
  - **Rule Name** (Input, required)
    - Placeholder: "e.g. Remove Low SoW"
  - **Display Order** (Input, number, required)
    - Helper text: "Lower number = evaluated first"
  - **Active** (Switch component)
  - **Priority** (Select)
    - Options: "low", "medium", "high"

  **Conditions:**
  - **SoW Range** (2 inputs side by side)
    - Min SoW % (Input, number, step: 0.01, nullable)
    - Max SoW % (Input, number, step: 0.01, nullable)
    - Helper text: "Leave empty to skip this condition"
  - **Match Rate Range** (2 inputs side by side)
    - Min Match Rate % (Input, number, step: 0.1, nullable)
    - Max Match Rate % (Input, number, step: 0.1, nullable)
  - **Special Conditions** (Checkboxes)
    - "Only when one instance left" (Checkbox, nullable)
    - "Is highest floor" (Select: "Yes" | "No" | "Any", nullable)

  **Action:**
  - **Action Type** (Select, required)
    - Options: "REMOVE", "KEEP", "TEST REDUCE", "INCREASE 10%", "INCREASE 20%", "ADD LAYER", "ADD HIGHER"
  - **Multiplier** (Input, number, step: 0.01, nullable)
    - Helper text: "Required for INCREASE and ADD HIGHER actions"
    - Visible khi action là INCREASE hoặc ADD HIGHER
  - **Use Midpoint** (Switch)
    - Helper text: "Use midpoint formula for ADD LAYER"
    - Visible khi action là ADD LAYER
  - **Reason Template** (Textarea, optional)
    - Placeholder: "e.g. SoW {sow}% is below threshold"
    - Max length: 512

- Footer:
  - Cancel button (outline)
  - Save button (primary, blue-600)
  - Loading state: "Saving..." with spinner

**Bulk Actions Bar** (khi có rules selected):
- Background: bg-blue-50, border-b border-blue-100
- Left: "{count} rules selected" (text-sm, font-medium, text-blue-700)
- Right: Action buttons
  - "Enable Selected" (outline, green-600)
  - "Disable Selected" (outline, slate-600)
  - "Delete Selected" (outline, red-600)
  - "Clear Selection" (ghost)

**Pagination** (nếu cần):
- Left: "Showing {start}-{end} of {total} items"
- Right:
  - "Rows per page:" + Select (10, 20, 50)
  - Page numbers with prev/next buttons
  - ChevronLeft/ChevronRight icons

**Loading State:**
- Centered spinner (Loader2, animate-spin, w-8 h-8, text-slate-400)
- Text: "Loading..."

**Success/Error Toasts:**
- Success: Green toast with CheckCircle icon
- Error: Red toast with AlertCircle icon
- Position: Top-right
- Auto-dismiss after 3 seconds

**Responsive Design:**
- Mobile: Stack cards vertically, table scrolls horizontally
- Tablet: 2-column stats grid
- Desktop: Full 3-column stats grid, full table

**Dark Mode Support:**
- Use CSS variables from shadcn/ui theme
- Dark mode colors: slate-800 background, slate-200 text
- Cards: dark:bg-slate-800, dark:border-slate-700

**Accessibility:**
- Keyboard navigation for all interactive elements
- ARIA labels for icons and buttons
- Focus states visible (ring-2 ring-blue-500)
- Screen reader friendly table headers

**Component Structure:**
- Use shadcn/ui components: Card, Table, Badge, Button, Switch, Select, Input, Dialog, Tooltip, Alert, Tabs, Checkbox
- Icons from lucide-react
- Tailwind CSS 4 utility classes
- TypeScript types for all props and data

**Example Data:**

Configs:
- Global Config: Min: 5, Max: 20, Min MR: 3%, Min SoW: 0.9%
- App "Bubble Pop": Min: 8, Max: 25, Min MR: 3.5%, Min SoW: 1.0%
- Apps "Card Game, Puzzle Game": Min: 6, Max: 22, Min MR: 3%, Min SoW: 0.9%

Rules:
- Rule 1: "Remove Low SoW" (Order: 1, Active, SoW < 1%, MR < 3%, Action: REMOVE, Priority: high)
- Rule 2: "Keep Medium SoW" (Order: 2, Active, SoW 1-3%, Action: KEEP, Priority: medium)
- Rule 3: "Increase High SoW" (Order: 3, Active, SoW > 5%, Action: INCREASE 20%, Multiplier: 1.20, Priority: high)
```

---

## Additional Features (Optional)

### Rule Preview
- Thêm button "Preview" để xem rule sẽ match với điều kiện nào
- Hiển thị ví dụ scenarios

### Rule Testing
- Test rule với sample data
- Validate conditions và actions

### Import/Export
- Export configs và rules to JSON
- Import từ file JSON

---

## Notes

- Tất cả API calls sử dụng Bearer token authentication
- Loading states cho tất cả async operations
- Error handling với user-friendly messages
- Optimistic updates cho enable/disable actions
- Debounce search input (300ms)
- Cache data với React Query hoặc SWR
- Multi-select apps component có thể dùng Combobox hoặc custom component
- Drag-and-drop reordering cho rules (optional, có thể dùng buttons Move Up/Down)

