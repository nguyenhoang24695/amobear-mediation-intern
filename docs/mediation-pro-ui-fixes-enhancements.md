# Mediation Pro - UI Fixes & Enhancements for v0

## Tổng quan

Tài liệu này mô tả các tính năng cần bổ sung/sửa để hoàn thiện mockup trên v0, đảm bảo navigation flow hoạt động đầy đủ.

---

## PHẦN 1: Các tính năng chung cần bổ sung

### 1.1 Notification Popup

```
Design a notification dropdown/popup that appears when clicking the notification bell icon in the header.

**Trigger:** Click on notification bell icon (with red badge showing unread count)

**Popup Properties:**
- Position: Anchored to bell icon, aligned right
- Width: 380px
- Max height: 480px with scroll
- Shadow: shadow-lg
- Border: border border-slate-200
- Background: white
- Border radius: rounded-lg

**Popup Header:**
- Title: "Notifications" (font-semibold)
- Right side: "Mark all as read" link (text-blue-600, text-sm)
- Divider below header

**Notification List:**

Each notification item contains:
- Left: Icon indicating type (color-coded circle)
  - Critical alert: red circle with exclamation
  - Warning alert: amber circle with warning icon
  - Info: blue circle with info icon
  - Success: green circle with checkmark
- Middle content:
  - Title: "Fill Rate Critical Drop" (font-medium, text-sm)
  - Description: "Weather Plus - Banner - US dropped below 50%" (text-muted, text-xs, max 2 lines)
  - Time: "2 hours ago" (text-muted, text-xs)
- Right: Unread indicator (blue dot) if unread
- Hover state: bg-slate-50

**Sample Notifications:**
1. Critical (red): "Fill Rate Critical Drop" - "Weather Plus - Banner - US dropped below 50%" - "2 hours ago" - Unread
2. Warning (amber): "eCPM Declining" - "Game Master - Interstitial showing -15% eCPM trend" - "5 hours ago" - Unread
3. Success (green): "A/B Test Completed" - "Waterfall Optimization Test #2 completed with winner" - "1 day ago" - Read
4. Info (blue): "New User Joined" - "jane.doe@company.com accepted invitation" - "2 days ago" - Read
5. Warning (amber): "Low Fill Rate Warning" - "3 ad units showing fill rate below 80%" - "3 days ago" - Read

**Popup Footer:**
- Full width link: "View All Notifications →" (text-center, text-blue-600, py-3, border-t)
- Clicking navigates to Alert Center page

**Empty State:**
- Icon: Bell with checkmark
- Text: "You're all caught up!"
- Subtext: "No new notifications"

**Interaction:**
- Clicking a notification navigates to relevant page (Alert Detail, A/B Test, User, etc.)
- Clicking marks notification as read
- Clicking outside popup closes it
- Escape key closes popup
```

---

### 1.2 User Avatar Dropdown Menu

```
Design a user dropdown menu that appears when clicking the user avatar in the top-right header.

**Trigger:** Click on user avatar

**Dropdown Properties:**
- Position: Anchored to avatar, aligned right
- Width: 240px
- Shadow: shadow-lg
- Border: border border-slate-200
- Background: white
- Border radius: rounded-lg

**Dropdown Header:**
- User avatar (40x40)
- User name: "John Doe" (font-medium)
- Email: "john.doe@company.com" (text-muted, text-sm, truncated)
- Role badge: "Admin" (small badge)
- Divider below

**Menu Items:**

Section 1 - Account:
- "My Profile" with User icon → navigates to /profile
- "Account Settings" with Settings icon → navigates to /settings/account

Section 2 - Organization (divider above):
- "Team Members" with Users icon → navigates to /users
- "Teams" with UsersRound icon → navigates to /teams

Section 3 - Preferences (divider above):
- "Appearance" with Moon/Sun icon → opens theme submenu (Light/Dark/System)
- "Notifications" with Bell icon → navigates to /settings/notifications

Section 4 - Support (divider above):
- "Help & Documentation" with HelpCircle icon → opens external docs
- "Keyboard Shortcuts" with Keyboard icon → opens shortcuts modal

Section 5 - Logout (divider above):
- "Log out" with LogOut icon (text-red-600) → opens logout confirmation modal

**Hover state:** bg-slate-50 for each menu item
**Active state:** bg-slate-100
```

---

### 1.3 Logout Confirmation Modal

```
Design a confirmation modal for logout action.

**Trigger:** Click "Log out" from user dropdown

**Modal Properties:**
- Size: max-w-sm (384px)
- Centered on screen
- Overlay: dark semi-transparent backdrop

**Modal Content:**

Icon:
- LogOut icon in a circle
- Circle background: red-100
- Icon color: red-600
- Size: 48x48

Title: "Log out of Mediation Pro?" (text-lg, font-semibold, text-center)

Description: "You will need to sign in again to access your account." (text-muted, text-sm, text-center)

Checkbox option:
- "Log out from all devices" (unchecked by default)
- Helper text: "This will end all your active sessions" (text-xs, text-muted)

**Modal Footer:**
- "Cancel" button (secondary, flex-1) → closes modal
- "Log out" button (destructive/red, flex-1) → performs logout, redirects to login

**Loading state:**
- "Log out" button shows spinner + "Logging out..."
- Disable both buttons during logout
```

---

### 1.4 Pagination Component (Standard)

```
Design a reusable pagination component for all table views.

**Component Layout:**

Left side:
- Text: "Showing 1-20 of 247 items" (text-sm, text-muted)

Right side:
- Page size selector: Dropdown showing "20" with options [10, 20, 50, 100]
- Label before dropdown: "Rows per page:" (text-sm, text-muted)

Navigation buttons (button group):
- "First" button (ChevronsLeft icon) - disabled if on first page
- "Previous" button (ChevronLeft icon) - disabled if on first page
- Page numbers: Show current context
  - If many pages: 1 ... 4 5 [6] 7 8 ... 13
  - Current page highlighted: bg-blue-600 text-white
  - Other pages: bg-white border hover:bg-slate-50
- "Next" button (ChevronRight icon) - disabled if on last page
- "Last" button (ChevronsRight icon) - disabled if on last page

**Interaction:**
- All buttons are clickable and trigger page change
- Page size change resets to page 1
- Show loading state on table when changing page
- Update URL query params (?page=2&pageSize=20)

**Responsive:**
- On mobile: Hide page numbers, show only Prev/Next
- On tablet: Show fewer page numbers (1 ... [6] ... 13)
```

---

## PHẦN 2: Sửa đổi theo từng trang

### 2.1 Login Page

```
Update the Login page with default credentials and proper navigation.

**Pre-filled Demo Credentials:**
- Organization field: Pre-fill with "demo"
- Email field: Pre-fill with "admin@demo.com"
- Password field: Pre-fill with "admin" (shown as dots)
- Show hint text below form: "Demo credentials: admin@demo.com / admin"

**Login Button Behavior:**
- On click: Show loading state "Signing in..."
- After 1 second delay (simulated): Navigate to /dashboard
- Store mock user session in localStorage

**Form Validation:**
- If fields empty: Show inline error "This field is required"
- If invalid email format: Show "Please enter a valid email"

**Additional Links:**
- "Forgot password?" → navigates to /forgot-password
- Google/Microsoft buttons → show toast "Social login coming soon"
```

---

### 2.2 Dashboard Page

```
Update the Dashboard page with proper navigation links.

**Alert Summary Bar:**
- Each severity count (Critical: 3, Warning: 8, Info: 2) should be clickable
- Clicking navigates to Alert Center with filter applied
- Add "View All Alerts →" link at the end → navigates to /alert-center

**Top Performing Apps Card:**
- Each app row should be clickable
- Clicking app name navigates to /apps/{appId}
- "View All 247 Apps →" footer link → navigates to /apps

**Recent Activities Card:**
- Activity items related to apps should link to app detail
- Activity items related to mediation should link to mediation detail
- Activity items related to alerts should link to alert detail

**Revenue by Ad Network Card:**
- Clicking network name → navigates to /reports/network-performance with filter

**Quick Actions (add if not present):**
- Add a "Quick Actions" card or floating action button
- Options: "Add New App", "View Alerts", "Generate Report"
```

---

### 2.3 Apps List Page

```
Update the Apps List page with proper navigation and interactions.

**Table Row Click Behavior:**
- Clicking anywhere on the row (except actions) → navigates to /apps/{appId}
- Row should have cursor-pointer and hover:bg-slate-50

**App Name Column:**
- App name should be a clickable link (text-blue-600, hover:underline)
- Clicking → navigates to /apps/{appId}

**Ad Units Column:**
- Number should be a clickable link
- Clicking "12 units" → navigates to /apps/{appId}?tab=adunits

**Actions Dropdown:**
- "View Details" → navigates to /apps/{appId}
- "View in AdMob" → opens external link (show external icon)
- "Sync Now" → show loading toast, then success toast
- "Pause" / "Resume" → show confirmation modal, then update status
- "Delete" → show destructive confirmation modal

**Pagination:**
- Must be fully functional with clickable page numbers
- Show proper state: "Showing 1-20 of 247 apps"
- Page navigation updates URL: /apps?page=2

**Bulk Actions:**
- When selecting rows, show bulk action bar
- Actions: "Pause Selected", "Resume Selected", "Export"
```

---

### 2.4 App Detail Page

```
Update the App Detail page with proper tab navigation and links.

**Page Header Actions:**
- "View in AdMob" → opens external link
- "View in App Store" / "View in Play Store" → opens store link
- "Sync Now" → show loading state, then success toast

**Tab Navigation:**
- Tabs should update URL: /apps/{appId}?tab=overview
- Deep linking should work (opening URL goes to correct tab)

**Overview Tab:**

Ad Units Summary Card:
- "Manage Ad Units →" link → switches to Ad Units tab (updates URL)
- Each format row clickable → filters Ad Units tab by format

Mediation Groups Card:
- Each group name is clickable → navigates to /mediation-groups/{groupId}
- "View All Groups →" → switches to Mediation Groups tab

Active Alerts Card:
- Each alert clickable → navigates to /alert-center/{alertResultId}
- "View All Alerts →" → navigates to /alert-center (filter theo app trong UI neu co)

**Ad Units Tab:**
- Table with pagination
- Row click → could show ad unit detail modal or navigate
- Actions dropdown with Edit, Pause, View in AdMob options

**Mediation Groups Tab:**
- Table showing groups for this app
- Group name clickable → navigates to /mediation-groups/{groupId}
- "View Waterfall" button → navigates to /mediation-groups/{groupId}?tab=waterfall
- Actions dropdown:
  - "View Details" → navigates to /mediation-groups/{groupId}
  - "Edit Waterfall" → navigates to /mediation-groups/{groupId}?tab=waterfall
  - "View in AdMob" → external link
  - "Duplicate" → show modal
  - "Pause" / "Resume" → confirmation then action
```

---

### 2.5 Mediation Groups List Page

```
Update the Mediation Groups List page with navigation.

**Table Row Interactions:**
- Row click → navigates to /mediation-groups/{groupId}
- Row hover → bg-slate-50

**Group Name Column:**
- Name is clickable link → navigates to /mediation-groups/{groupId}
- Show app name below (smaller, text-muted) also clickable → /apps/{appId}

**A/B Test Column:**
- "🧪 Running" badge clickable → navigates to /mediation-groups/{groupId}/ab-tests/{testId}
- "✅ Completed" badge clickable → same navigation

**Actions Dropdown:**
- "View Details" → navigates to /mediation-groups/{groupId}
- "Edit Waterfall" → navigates to /mediation-groups/{groupId}?tab=waterfall
- "View A/B Tests" → navigates to /mediation-groups/{groupId}?tab=abtests
- "View in AdMob" → external link
- "Duplicate" → show duplicate modal
- "Pause" / "Resume" → confirmation modal

**Pagination:**
- Fully functional
- "Showing 1-20 of 384 groups"
```

---

### 2.6 Mediation Group Detail Page

```
Update the Mediation Group Detail page with full interactions.

**Page Header:**
- Back link "← Mediation Groups" → navigates to /mediation-groups
- App name badge clickable → navigates to /apps/{appId}
- "View in AdMob" → external link

**Tab Navigation:**
- URL updates: /mediation-groups/{groupId}?tab=waterfall
- Deep linking support

**Waterfall & Optimization Tab:**

Current Setup Column:
- Read-only display
- "View in AdMob" link at bottom → external link

Optimized Column:
- All edit interactions working:
  - Click eCPM value → inline edit
  - Drag to reorder
  - Delete button → marks as removed
  - "+ Add Source" → opens Add Source modal
- Changes Summary updates in real-time

Action Buttons:
- "Apply Direct" → opens Apply Confirmation modal
- "Run A/B Test" → opens Create A/B Test modal

**A/B Tests Tab:**
- Test cards clickable → navigates to /mediation-groups/{groupId}/ab-tests/{testId}
- "View Details →" link → same navigation
- "Create New Test" → opens Create A/B Test modal (disabled if test running)
```

---

### 2.7 A/B Test Detail Page

```
Update the A/B Test Detail page with navigation.

**Page Header:**
- Back link → navigates to /mediation-groups/{groupId}?tab=abtests
- "View Report" link → opens detailed report modal or page

**Winner Banner Actions:**
- "Apply Variant B" → opens Apply Confirmation modal, then redirect to mediation detail
- "Keep Variant A" → opens confirmation modal

**Bottom Action Bar:**
- For running tests:
  - "Stop Test Early" → confirmation modal with warning
  - "Extend Duration" → modal to select new duration
- For completed tests:
  - "Keep Variant A" → confirmation
  - "Apply Variant B" → Apply Confirmation modal
```

---

### 2.8 Alert Center Page

```
Update Alert Center with proper interactions.

**Open alerts list:**
- Click row hoặc "View Details" → điều hướng tới `/alert-center/{alertResultId}` (trang chi tiết full-page)

**Trang chi tiết:**
- Timeline / history, app & mediation links, acknowledge, resolve, snooze theo API thực tế

**Timeline card (v2):**
- Bộ lọc trong card (rule, app, khoảng thời gian) gắn với `GET /api/Alerts/center/timeline`

**Filters:**
- Ưu tiên state trong UI; nếu có query trên URL thì đồng bộ với bộ lọc khi product hỗ trợ
```

---

### 2.9 User Management Page

```
Update User Management with interactions.

**Table Interactions:**
- Row click → navigates to /users/{userId}
- User name/email clickable → navigates to /users/{userId}

**Actions Dropdown:**
- "View Profile" → navigates to /users/{userId}
- "Edit User" → navigates to /users/{userId}?edit=true or opens modal
- "Manage Permissions" → navigates to /users/{userId}?tab=permissions
- "Resend Invitation" (for invited) → loading then success toast
- "Deactivate" / "Reactivate" → confirmation modal
- "Remove from Organization" → destructive confirmation modal

**Invite User Button:**
- Opens Invite User modal
- On success → new user appears in table (or pending invitations section)

**Pagination:**
- Fully functional
```

---

### 2.10 Team Management Page

```
Update Team Management with interactions.

**Team Cards:**
- Card click → navigates to /teams/{teamId}
- "View Team" link → navigates to /teams/{teamId}
- Member avatars clickable → navigates to respective user profiles

**Actions Dropdown:**
- "Edit" → opens edit modal
- "Manage Members" → navigates to /teams/{teamId}?tab=members
- "Delete" → destructive confirmation modal

**Create Team Button:**
- Opens Create Team modal
- On success → new team card appears
```

---

## PHẦN 3: Navigation Flow Summary

```
COMPLETE NAVIGATION MAP:

Login (/login)
  ├── [Login Success] → Dashboard
  ├── Forgot Password → /forgot-password
  └── [Demo] Pre-filled: admin@demo.com / admin

Dashboard (/)
  ├── Notification Bell → Notification Popup
  │   └── View All → /alert-center
  ├── User Avatar → User Dropdown
  │   ├── My Profile → /profile
  │   ├── Account Settings → /settings
  │   ├── Team Members → /users
  │   ├── Teams → /teams
  │   └── Log out → Logout Modal → /login
  ├── Alert Summary → /alert-center?severity={type}
  ├── Top Apps → /apps/{id}
  ├── View All Apps → /apps
  └── View All Alerts → /alert-center

Apps (/apps)
  ├── App Row Click → /apps/{id}
  ├── Ad Units Count → /apps/{id}?tab=adunits
  └── Actions → View Details → /apps/{id}

App Detail (/apps/{id})
  ├── Tab: Overview
  │   ├── Manage Ad Units → ?tab=adunits
  │   ├── Mediation Group → /mediation-groups/{id}
  │   └── View All Groups → ?tab=mediationgroups
  ├── Tab: Ad Units (?tab=adunits)
  ├── Tab: Mediation Groups (?tab=mediationgroups)
  │   └── Group Row → /mediation-groups/{id}
  └── Tab: Performance (?tab=performance)

Mediation Groups (/mediation-groups)
  ├── Group Row → /mediation-groups/{id}
  ├── A/B Test Badge → /mediation-groups/{id}/ab-tests/{testId}
  └── Actions → View Details → /mediation-groups/{id}

Mediation Group Detail (/mediation-groups/{id})
  ├── Tab: Overview
  ├── Tab: Waterfall & Optimization (?tab=waterfall)
  │   ├── Apply Direct → Modal → Success
  │   └── Run A/B Test → Modal → /mediation-groups/{id}/ab-tests/{testId}
  ├── Tab: A/B Tests (?tab=abtests)
  │   └── Test Card → /mediation-groups/{id}/ab-tests/{testId}
  └── Tab: History (?tab=history)

A/B Test Detail (/mediation-groups/{id}/ab-tests/{testId})
  ├── Back → /mediation-groups/{id}?tab=abtests
  ├── Apply Winner → Modal → /mediation-groups/{id}
  └── Keep Original → Modal → /mediation-groups/{id}

Alert Center (/alert-center)
  ├── Row / View Details → /alert-center/{alertResultId}
  └── Timeline v2 + filters (state / API timeline)

Users (/users)
  ├── User Row → /users/{id}
  ├── Invite User → Modal
  └── Actions → Various

User Detail (/users/{id})
  ├── Tab: Overview
  ├── Tab: Permissions (?tab=permissions)
  ├── Tab: Activity (?tab=activity)
  └── Tab: Sessions (?tab=sessions)

Teams (/teams)
  ├── Team Card → /teams/{id}
  └── Create Team → Modal

Team Detail (/teams/{id})
  ├── Tab: Members (?tab=members)
  ├── Tab: Permissions (?tab=permissions)
  └── Tab: Settings (?tab=settings)

Profile (/profile)
  └── Change Password → Modal

Settings (/settings)
  ├── General (?tab=general)
  ├── Notifications (?tab=notifications)
  ├── Integrations (?tab=integrations)
  └── Security (?tab=security)
```

---

## PHẦN 4: Component States Checklist

### All Tables Must Have:
- [ ] Clickable rows with hover state
- [ ] Working pagination with page numbers
- [ ] Page size selector (10, 20, 50, 100)
- [ ] "Showing X-Y of Z items" text
- [ ] Loading state when changing page
- [ ] Empty state when no data
- [ ] Sortable columns with indicators

### All Modals Must Have:
- [ ] Close button (X)
- [ ] Click outside to close
- [ ] Escape key to close
- [ ] Loading state for actions
- [ ] Success/Error feedback
- [ ] Proper focus management

### All Forms Must Have:
- [ ] Validation messages
- [ ] Required field indicators
- [ ] Loading state on submit
- [ ] Success feedback (toast or redirect)
- [ ] Error handling

### All Dropdowns Must Have:
- [ ] Hover states
- [ ] Click to select
- [ ] Click outside to close
- [ ] Keyboard navigation (optional but nice)

---

## PHẦN 5: Mock Data Requirements

### For Demo Flow to Work:

**Users (pre-seeded):**
- admin@demo.com (Admin, password: admin)
- editor@demo.com (Editor)
- viewer@demo.com (Viewer)

**Apps (at least 5):**
- Weather Plus Pro (iOS)
- Weather Plus Free (Android)
- Game Master (iOS)
- Puzzle King (Android)
- News Reader (Both)

**Mediation Groups (at least 10):**
- Mix of formats: Banner, Interstitial, Rewarded, Native
- Some with A/B tests running
- Some with optimization available

**Alerts (at least 10):**
- Mix of severities: Critical, Warning, Info
- Mix of types: Fill Rate, eCPM, Revenue
- Some read, some unread

**Notifications (at least 5):**
- Recent ones unread
- Older ones read
- Link to relevant resources
```

---

## Summary: Implementation Priority

| Priority | Item | Description |
|----------|------|-------------|
| P0 | Login with demo credentials | Entry point for demo |
| P0 | Navigation links on Dashboard | Core navigation |
| P0 | App list → App detail navigation | Core flow |
| P0 | Mediation list → detail navigation | Core flow |
| P0 | Notification popup | Common component |
| P0 | User avatar dropdown | Common component |
| P0 | Logout confirmation | UX requirement |
| P1 | Pagination on all tables | UX consistency |
| P1 | All action dropdowns working | Interactions |
| P1 | Tab navigation with URL | Deep linking |
| P2 | Keyboard shortcuts | Nice to have |
| P2 | Theme toggle | Nice to have |
