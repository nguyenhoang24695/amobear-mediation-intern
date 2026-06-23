# Mediation Pro - Hangfire Job Management UI Design Prompt

## Tổng quan

Prompt này dùng để thiết kế màn hình quản lý Job trên Hangfire cho "Mediation Pro" - nền tảng quản lý ad mediation. Màn hình cho phép xem, chỉnh sửa, bật/tắt và trigger các recurring job Hangfire.

## Tech Stack & Theme

- **Framework**: Next.js 16 + React 19
- **UI Library**: shadcn/ui (style: "new-york")
- **Styling**: Tailwind CSS 4 với oklch color system
- **Icons**: Lucide React
- **Components**: Card, Table, Badge, Button, Switch, Select, Input, Dialog, Tooltip, Alert

## Color Reference

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary | Blue | bg-blue-600, text-blue-600, hover:bg-blue-700 |
| Success | Green | bg-green-500, text-green-600 |
| Warning | Amber | bg-amber-500, text-amber-600 |
| Error | Red | bg-red-500, text-red-600 |
| Enabled Job | Green | bg-green-100, text-green-700 |
| Disabled Job | Gray | bg-slate-100, text-slate-600 |
| Info | Blue | bg-blue-100, text-blue-700 |

## Data Model

Mỗi job có các trường:
- `id`: int (ID trong DB)
- `jobId`: string (Hangfire recurring job ID, unique, ví dụ: "performance-sync-job")
- `displayName`: string (Tên hiển thị, ví dụ: "Performance Sync")
- `jobTypeName`: string (Full class name, ví dụ: "MediationPro.Jobs.PerformanceSyncJob, MediationPro.Jobs")
- `jobMethodName`: string (Method name, ví dụ: "SyncAllAccountsAsync")
- `cronExpression`: string (Cron expression, ví dụ: "0 */2 * * *")
- `timeZoneId`: string (Timezone, ví dụ: "UTC", "Asia/Ho_Chi_Minh")
- `enabled`: boolean (Bật/tắt job)
- `sortOrder`: int (Thứ tự hiển thị)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## API Endpoints

- `GET /api/v1/job-schedules`: Lấy danh sách tất cả job schedules
- `PUT /api/v1/job-schedules/{jobId}`: Cập nhật job (cron, timezone, enabled, displayName)
- `POST /api/v1/job-schedules/reload`: Áp dụng lại lịch từ DB lên Hangfire
- `POST /api/v1/jobs-test/{jobName}`: Trigger job test (chạy ngay, không qua Hangfire)

---

## PROMPT: Hangfire Job Management Page

```
Design a modern job management page for "Mediation Pro" - an ad mediation management platform. This page allows administrators to view, configure, enable/disable, and manually trigger Hangfire background jobs.

**Page Layout:**
- Full-width container with max-width constraint
- White background with subtle slate-50 page background
- Spacing: space-y-6 between sections

**Page Header Section:**
- Title: "Job Management" (text-3xl, font-bold, text-slate-900)
- Subtitle: "Manage Hangfire recurring jobs and schedules" (text-sm, text-slate-500)
- Right side: Action buttons row
  - Button "Reload Schedules" (outline variant, blue-600 border)
    - Icon: RefreshCw (lucide-react)
    - Tooltip: "Apply schedule changes from database to Hangfire"
  - Button "Refresh" (ghost variant)
    - Icon: RefreshCw (lucide-react)

**Stats Cards Row:**
Grid 4 columns (responsive: 2 cols on tablet, 1 col on mobile):
- Card 1: "Total Jobs"
  - Value: {totalJobs} (text-2xl, font-bold, text-slate-900)
  - Icon: Briefcase (lucide-react, slate-600)
  - Background: slate-50
- Card 2: "Enabled"
  - Value: {enabledCount} (text-2xl, font-bold, text-green-600)
  - Icon: CheckCircle (lucide-react, green-600)
  - Background: green-50
- Card 3: "Disabled"
  - Value: {disabledCount} (text-2xl, font-bold, text-slate-600)
  - Icon: XCircle (lucide-react, slate-600)
  - Background: slate-50
- Card 4: "Last Reload"
  - Value: {lastReloadTime} (text-sm, text-slate-600)
  - Icon: Clock (lucide-react, slate-600)
  - Background: slate-50
  - Format: "2 minutes ago" hoặc "Never"

**Filters & Search Bar:**
- Left side:
  - Search input with Search icon (lucide-react) on left
    - Placeholder: "Search by job name or ID..."
    - Width: w-64
  - Select filter "Status" (w-32)
    - Options: "All", "Enabled", "Disabled"
  - Select filter "Sort By" (w-40)
    - Options: "Sort Order", "Name", "Last Updated"
- Right side:
  - Button "Export" (outline variant)
    - Icon: Download (lucide-react)

**Main Table Card:**
- White card with border-slate-200, rounded-lg, shadow-sm
- Table with striped rows (hover:bg-slate-50)

**Table Columns:**

1. **Checkbox Column** (w-12)
   - Checkbox for bulk selection
   - Header checkbox for select all

2. **Job Name** (flex-1)
   - Display: `displayName` hoặc `jobId` (fallback)
   - Font: font-medium, text-slate-900
   - Subtitle (text-xs, text-slate-500): `jobId`
   - Icon: Briefcase (lucide-react, w-4 h-4, text-slate-400) on left

3. **Status** (w-24)
   - Badge component
   - Enabled: "bg-green-100 text-green-700" + dot indicator (green-500)
   - Disabled: "bg-slate-100 text-slate-600" + dot indicator (slate-400)
   - Text: "Enabled" / "Disabled"

4. **Schedule** (w-48)
   - Cron expression: `cronExpression` (text-sm, font-mono, text-slate-700)
   - Timezone: `timeZoneId` (text-xs, text-slate-500)
   - Tooltip: "Next run: {calculated next run time}" (nếu có)

5. **Type** (w-64)
   - Job Type: `jobTypeName` (text-sm, text-slate-600, truncated with ellipsis)
   - Method: `jobMethodName` (text-xs, text-slate-500, font-mono)
   - Tooltip: Show full text on hover

6. **Last Updated** (w-40)
   - Date: `updatedAt` formatted (text-sm, text-slate-500)
   - Format: "Jan 15, 2025" hoặc "2 hours ago" (relative)

7. **Actions** (w-20)
   - Dropdown menu (MoreHorizontal icon)
   - Menu items:
     - "Edit Schedule" (Edit icon)
     - "Run Now" (Play icon) - trigger test job
     - "Enable/Disable" (Toggle icon)
     - Separator
     - "View Details" (Info icon)

**Table Row States:**
- Enabled job: Normal row
- Disabled job: opacity-60
- Hover: bg-slate-50

**Bulk Actions Bar** (appears when rows selected):
- Background: bg-blue-50, border-b border-blue-100
- Left: "{count} jobs selected" (text-sm, font-medium, text-blue-700)
- Right: Action buttons
  - "Enable Selected" (outline, green-600)
  - "Disable Selected" (outline, slate-600)
  - "Clear Selection" (ghost)

**Pagination** (bottom of table):
- Left: "Showing {start}-{end} of {total} jobs"
- Right:
  - "Rows per page:" + Select (10, 20, 50)
  - Page numbers with prev/next buttons
  - ChevronLeft/ChevronRight icons

**Empty State:**
- Centered content in card
- Icon: Briefcase (w-16 h-16, text-slate-400)
- Title: "No jobs found"
- Description: "Try adjusting your search or filters"
- Button: "Clear filters" (link variant)

**Loading State:**
- Centered spinner (Loader2, animate-spin, w-8 h-8, text-slate-400)
- Text: "Loading jobs..."

**Edit Job Dialog:**
- Title: "Edit Job Schedule"
- Form fields:
  - Display Name (Input, required)
  - Cron Expression (Input, required, font-mono)
    - Helper text: "Cron format: minute hour day month weekday"
    - Example: "0 */2 * * * (every 2 hours)"
  - Timezone (Select)
    - Options: "UTC", "Asia/Ho_Chi_Minh", "America/New_York", etc.
  - Enabled (Switch component)
- Footer:
  - Cancel button (outline)
  - Save button (primary, blue-600)
  - Loading state: "Saving..." with spinner

**Run Job Dialog (Confirmation):**
- Title: "Run Job Now?"
- Description: "This will trigger '{displayName}' immediately. The job will run outside of the scheduled time."
- Footer:
  - Cancel button
  - "Run Now" button (primary, blue-600)
  - Loading state: "Running..." with spinner

**Reload Schedules Dialog (Confirmation):**
- Title: "Reload Job Schedules?"
- Description: "This will apply all schedule changes from the database to Hangfire. This may take a few seconds."
- Footer:
  - Cancel button
  - "Reload" button (primary, blue-600)
  - Loading state: "Reloading..." with spinner

**Success/Error Toasts:**
- Success: Green toast with CheckCircle icon
- Error: Red toast with AlertCircle icon
- Position: Top-right
- Auto-dismiss after 3 seconds

**Responsive Design:**
- Mobile: Stack cards vertically, table scrolls horizontally
- Tablet: 2-column stats grid
- Desktop: Full 4-column stats grid, full table

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
- Use shadcn/ui components: Card, Table, Badge, Button, Switch, Select, Input, Dialog, Tooltip, Alert
- Icons from lucide-react
- Tailwind CSS 4 utility classes
- TypeScript types for all props and data

**Example Job Data:**
- Job 1: "Performance Sync" (enabled, cron: "0 */2 * * *", timezone: "UTC")
- Job 2: "Structure Sync" (enabled, cron: "0 0 * * *", timezone: "Asia/Ho_Chi_Minh")
- Job 3: "Dashboard Cache" (disabled, cron: "0 */6 * * *", timezone: "UTC")
```

---

## Additional Features (Optional)

### Job Execution History
- Thêm tab "Execution History" để xem lịch sử chạy job
- Hiển thị: Job name, Start time, End time, Duration, Status (Success/Failed), Error message (nếu có)
- Filter theo date range
- Link đến Hangfire dashboard (nếu có)

### Job Dependencies
- Hiển thị job dependencies (job nào phụ thuộc job nào)
- Visual graph hoặc tree view

### Cron Expression Builder
- Visual cron builder thay vì nhập text
- Dropdowns cho: minute, hour, day, month, weekday
- Preview: "Runs every 2 hours" hoặc "Runs daily at midnight"

---

## Notes

- Tất cả API calls sử dụng Bearer token authentication
- Loading states cho tất cả async operations
- Error handling với user-friendly messages
- Optimistic updates cho enable/disable actions
- Debounce search input (300ms)
- Cache job list data với React Query hoặc SWR

