# Prompt cho Vercel v0 - Waterfall Recommendation Rules Management

## Prompt ngắn gọn (Copy vào v0.dev)

```
Design a modern recommendation rules management page for "Mediation Pro" - an ad mediation management platform using Next.js 16, React 19, shadcn/ui (new-york style), and Tailwind CSS 4.

**Page Layout:**
- Full-width container with max-width, white background, slate-50 page background
- Spacing: space-y-6 between sections

**Header:**
- Title: "Waterfall Recommendation Rules" (text-3xl, font-bold, text-slate-900)
- Subtitle: "Manage recommendation configurations and rules for waterfall optimization" (text-sm, text-slate-500)
- Right: "Create Config" button (primary, blue-600) with Plus icon, "Create Rule" button (primary, blue-600) with Plus icon, "Refresh" button (ghost) with RefreshCw icon

**Tabs:**
- Tab 1: "App Configs" (Settings icon, active by default) - Badge: {configCount}
- Tab 2: "Rules" (ListChecks icon) - Badge: {activeRulesCount}/{totalRulesCount}

**Tab 1: App Configs**

**Stats Cards (3 columns, responsive 2 cols tablet, 1 col mobile):**
1. "Total Configs" - {totalConfigs} (text-2xl, bold, slate-900), Settings icon (slate-600), slate-50 bg
2. "App-Specific" - {appSpecificCount} (text-2xl, bold, blue-600), Smartphone icon (blue-600), blue-50 bg
3. "Global Config" - {globalConfigExists ? "1" : "0"} (text-2xl, bold, slate-600), Globe icon (slate-600), slate-50 bg

**Filters:**
- Left: Search input (w-64) with Search icon, "Type" select (w-32: All/App-Specific/Global)
- Right: "Export" button (outline) with Download icon

**Configs Table:**
- White card, border-slate-200, rounded-lg, shadow-sm
- Columns:
  1. App(s) (flex-1) - App names or "Global" badge, subtitle: App IDs, Smartphone/Globe icon
  2. Min/Max Recommendations (w-40) - "{min} - {max}" (text-sm, slate-700)
  3. Min Match Rate (w-32) - "{value}%" (text-sm, slate-700)
  4. Min SoW (w-32) - "{value}%" (text-sm, slate-700)
  5. Last Updated (w-40) - formatted date (text-sm, slate-500)
  6. Actions (w-20) - Dropdown: Edit, Duplicate, Delete

**Empty State:**
- Centered, Settings icon (w-16 h-16, slate-400), "No configurations found", "Create your first configuration to get started", "Create Config" button (primary, blue-600)

**Create/Edit Config Dialog:**
- Title: "Create Configuration" / "Edit Configuration"
- Fields:
  - Apps Selection (Multi-select with search, required) - "Select Apps", helper: "Select one or more apps. Leave empty for global config.", selected apps as badges, "Global (All Apps)" checkbox option
  - Min Recommendations (Input, number, required, default: 5, min: 1, max: 100)
  - Max Recommendations (Input, number, required, default: 20, min: 1, max: 100)
  - Min Match Rate % (Input, number, required, step: 0.1, default: 3.0, min: 0, max: 100, helper: "Minimum match rate percentage threshold")
  - Min SoW % (Input, number, required, step: 0.01, default: 0.9, min: 0, max: 100, helper: "Minimum Share of Wallet percentage threshold")
- Footer: Cancel (outline), Save (primary, blue-600), loading: "Saving..." with spinner

**Tab 2: Rules**

**Stats Cards (3 columns):**
1. "Total Rules" - {totalRules} (text-2xl, bold, slate-900), ListChecks icon (slate-600), slate-50 bg
2. "Active" - {activeRulesCount} (text-2xl, bold, green-600), CheckCircle icon (green-600), green-50 bg
3. "Inactive" - {inactiveRulesCount} (text-2xl, bold, slate-600), XCircle icon (slate-600), slate-50 bg

**Filters:**
- Left: Search input (w-64) with Search icon, "Status" select (w-32: All/Active/Inactive), "Priority" select (w-32: All/High/Medium/Low), "Action" select (w-40: All/REMOVE/KEEP/INCREASE 10%/INCREASE 20%/ADD LAYER/ADD HIGHER)
- Right: "Export" button (outline) with Download icon

**Rules Table:**
- White card, border-slate-200, rounded-lg, shadow-sm
- Columns:
  1. Order (w-16) - {displayOrder} (text-sm, font-mono, slate-500), GripVertical icon for drag handle
  2. Rule Name (flex-1) - {name} (font-medium, slate-900), subtitle: conditions summary (text-xs, slate-500), ListChecks icon left
  3. Status (w-24) - Badge: Active (bg-green-100 text-green-700 + green-500 dot) / Inactive (bg-slate-100 text-slate-600 + slate-400 dot)
  4. Conditions (w-64) - SoW: {min}% - {max}%, Match Rate: {min}% - {max}%, Special conditions (text-xs, slate-600, multiple lines), tooltip shows full
  5. Action (w-48) - Badge with color: REMOVE (red), KEEP (blue), INCREASE (green), ADD LAYER/HIGHER (purple), Multiplier: {multiplier}x if exists, {action} (text-sm, font-medium)
  6. Priority (w-32) - Badge: High (bg-red-100 text-red-700), Medium (bg-amber-100 text-amber-700), Low (bg-blue-100 text-blue-700), {priority} (capitalize)
  7. Actions (w-20) - Dropdown: Edit, Duplicate, Enable/Disable, Move Up (if not first), Move Down (if not last), Delete (destructive)

**Empty State:**
- Centered, ListChecks icon (w-16 h-16, slate-400), "No rules configured", "Create your first rule to get started", "Create Rule" button (primary, blue-600)

**Create/Edit Rule Dialog:**
- Title: "Create Rule" / "Edit Rule"
- Fields (sections):
  **Basic:**
  - Rule Name (Input, required) - placeholder: "e.g. Remove Low SoW"
  - Display Order (Input, number, required) - helper: "Lower number = evaluated first"
  - Active (Switch)
  - Priority (Select: low/medium/high)
  
  **Conditions:**
  - SoW Range (2 inputs side by side) - Min SoW % (number, step: 0.01, nullable), Max SoW % (number, step: 0.01, nullable), helper: "Leave empty to skip"
  - Match Rate Range (2 inputs side by side) - Min Match Rate % (number, step: 0.1, nullable), Max Match Rate % (number, step: 0.1, nullable)
  - Special Conditions (Checkboxes) - "Only when one instance left" (nullable), "Is highest floor" (Select: Yes/No/Any, nullable)
  
  **Action:**
  - Action Type (Select, required) - REMOVE/KEEP/TEST REDUCE/INCREASE 10%/INCREASE 20%/ADD LAYER/ADD HIGHER
  - Multiplier (Input, number, step: 0.01, nullable) - helper: "Required for INCREASE and ADD HIGHER", visible when action is INCREASE or ADD HIGHER
  - Use Midpoint (Switch) - helper: "Use midpoint formula for ADD LAYER", visible when action is ADD LAYER
  - Reason Template (Textarea, optional, max: 512) - placeholder: "e.g. SoW {sow}% is below threshold"
- Footer: Cancel (outline), Save (primary, blue-600), loading: "Saving..." with spinner

**Bulk Actions Bar (when selected):**
- bg-blue-50, border-b border-blue-100
- Left: "{count} rules selected" (text-sm, font-medium, blue-700)
- Right: "Enable Selected" (outline, green-600), "Disable Selected" (outline, slate-600), "Delete Selected" (outline, red-600), "Clear Selection" (ghost)

**Pagination:**
- Left: "Showing {start}-{end} of {total} items"
- Right: "Rows per page:" + Select (10/20/50), page numbers, ChevronLeft/ChevronRight buttons

**Loading State:**
- Centered Loader2 spinner (w-8 h-8, slate-400, animate-spin), "Loading..."

**Toasts:**
- Success: Green toast with CheckCircle icon
- Error: Red toast with AlertCircle icon
- Top-right, auto-dismiss 3s

**Responsive:**
- Mobile: Stack cards, table scrolls horizontal
- Tablet: 2-col stats grid
- Desktop: 3-col stats grid, full table

**Dark Mode:**
- Use shadcn/ui CSS variables
- dark:bg-slate-800, dark:text-slate-200, dark:border-slate-700

**Components:**
- shadcn/ui: Card, Table, Badge, Button, Switch, Select, Input, Dialog, Tooltip, Alert, Tabs, Checkbox
- Icons: lucide-react
- Tailwind CSS 4 utilities
- TypeScript types

**Example Data:**
- Config: Global (Min: 5, Max: 20, Min MR: 3%, Min SoW: 0.9%)
- Config: App "Bubble Pop" (Min: 8, Max: 25, Min MR: 3.5%, Min SoW: 1.0%)
- Rule: "Remove Low SoW" (Order: 1, Active, SoW < 1%, MR < 3%, Action: REMOVE, Priority: high)
- Rule: "Keep Medium SoW" (Order: 2, Active, SoW 1-3%, Action: KEEP, Priority: medium)
```

---

## Prompt chi tiết hơn (nếu cần)

Nếu v0.dev cần thêm chi tiết, sử dụng prompt trong file `mediation-pro-waterfall-recommendation-rules-prompt.md`.

