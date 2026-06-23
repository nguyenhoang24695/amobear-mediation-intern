# Prompt cho Vercel v0 - Hangfire Job Management

## Prompt ngắn gọn (Copy vào v0.dev)

```
Design a modern job management page for "Mediation Pro" - an ad mediation management platform using Next.js 16, React 19, shadcn/ui (new-york style), and Tailwind CSS 4.

**Page Layout:**
- Full-width container with max-width, white background, slate-50 page background
- Spacing: space-y-6 between sections

**Header:**
- Title: "Job Management" (text-3xl, font-bold, text-slate-900)
- Subtitle: "Manage Hangfire recurring jobs and schedules" (text-sm, text-slate-500)
- Right: "Reload Schedules" button (outline, blue-600) with RefreshCw icon, "Refresh" button (ghost) with RefreshCw icon

**Stats Cards (4 columns, responsive 2 cols tablet, 1 col mobile):**
1. "Total Jobs" - {totalJobs} (text-2xl, bold, slate-900), Briefcase icon (slate-600), slate-50 bg
2. "Enabled" - {enabledCount} (text-2xl, bold, green-600), CheckCircle icon (green-600), green-50 bg
3. "Disabled" - {disabledCount} (text-2xl, bold, slate-600), XCircle icon (slate-600), slate-50 bg
4. "Last Reload" - {lastReloadTime} (text-sm, slate-600), Clock icon (slate-600), slate-50 bg

**Filters & Search:**
- Left: Search input (w-64) with Search icon, "Status" select (w-32: All/Enabled/Disabled), "Sort By" select (w-40: Sort Order/Name/Last Updated)
- Right: "Export" button (outline) with Download icon

**Main Table Card:**
- White card, border-slate-200, rounded-lg, shadow-sm
- Table with hover:bg-slate-50 rows

**Table Columns:**
1. Checkbox (w-12) - bulk selection
2. Job Name (flex-1) - displayName or jobId, font-medium, subtitle shows jobId (text-xs, slate-500), Briefcase icon left
3. Status (w-24) - Badge: Enabled (bg-green-100 text-green-700 + green-500 dot), Disabled (bg-slate-100 text-slate-600 + slate-400 dot)
4. Schedule (w-48) - cronExpression (text-sm, font-mono, slate-700), timeZoneId (text-xs, slate-500), tooltip shows next run
5. Type (w-64) - jobTypeName (text-sm, slate-600, truncated), jobMethodName (text-xs, slate-500, font-mono), tooltip shows full text
6. Last Updated (w-40) - updatedAt formatted (text-sm, slate-500), relative time like "2 hours ago"
7. Actions (w-20) - Dropdown (MoreHorizontal icon): Edit Schedule (Edit), Run Now (Play), Enable/Disable (Toggle), View Details (Info)

**Row States:**
- Enabled: normal
- Disabled: opacity-60
- Hover: bg-slate-50

**Bulk Actions Bar (when selected):**
- bg-blue-50, border-b border-blue-100
- Left: "{count} jobs selected" (text-sm, font-medium, blue-700)
- Right: "Enable Selected" (outline, green-600), "Disable Selected" (outline, slate-600), "Clear Selection" (ghost)

**Pagination:**
- Left: "Showing {start}-{end} of {total} jobs"
- Right: "Rows per page:" + Select (10/20/50), page numbers, ChevronLeft/ChevronRight buttons

**Empty State:**
- Centered in card, Briefcase icon (w-16 h-16, slate-400), "No jobs found", "Try adjusting your search or filters", "Clear filters" button (link)

**Loading State:**
- Centered Loader2 spinner (w-8 h-8, slate-400, animate-spin), "Loading jobs..."

**Edit Job Dialog:**
- Title: "Edit Job Schedule"
- Fields: Display Name (Input, required), Cron Expression (Input, required, font-mono, helper: "Cron format: minute hour day month weekday", example: "0 */2 * * * (every 2 hours)"), Timezone (Select: UTC/Asia/Ho_Chi_Minh/America/New_York), Enabled (Switch)
- Footer: Cancel (outline), Save (primary, blue-600), loading: "Saving..." with spinner

**Run Job Dialog:**
- Title: "Run Job Now?"
- Description: "This will trigger '{displayName}' immediately. The job will run outside of the scheduled time."
- Footer: Cancel, "Run Now" (primary, blue-600), loading: "Running..." with spinner

**Reload Dialog:**
- Title: "Reload Job Schedules?"
- Description: "This will apply all schedule changes from the database to Hangfire. This may take a few seconds."
- Footer: Cancel, "Reload" (primary, blue-600), loading: "Reloading..." with spinner

**Toasts:**
- Success: Green toast with CheckCircle icon
- Error: Red toast with AlertCircle icon
- Top-right, auto-dismiss 3s

**Responsive:**
- Mobile: Stack cards, table scrolls horizontal
- Tablet: 2-col stats grid
- Desktop: 4-col stats grid, full table

**Dark Mode:**
- Use shadcn/ui CSS variables
- dark:bg-slate-800, dark:text-slate-200, dark:border-slate-700

**Components:**
- shadcn/ui: Card, Table, Badge, Button, Switch, Select, Input, Dialog, Tooltip, Alert
- Icons: lucide-react
- Tailwind CSS 4 utilities
- TypeScript types

**Example Data:**
- "Performance Sync" (enabled, cron: "0 */2 * * *", UTC)
- "Structure Sync" (enabled, cron: "0 0 * * *", Asia/Ho_Chi_Minh)
- "Dashboard Cache" (disabled, cron: "0 */6 * * *", UTC)
```

---

## Prompt chi tiết hơn (nếu cần)

Nếu v0.dev cần thêm chi tiết, sử dụng prompt trong file `mediation-pro-hangfire-job-management-prompt.md`.

