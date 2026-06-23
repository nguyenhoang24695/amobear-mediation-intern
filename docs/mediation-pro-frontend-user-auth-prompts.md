# Mediation Pro - User & Auth Module UI Design Prompts

## Tổng quan

Tài liệu này chứa các prompt để thiết kế giao diện cho module User & Authentication trên v0 (Vercel).

### Danh sách màn hình

| # | Màn hình | Priority | Mô tả |
|---|----------|----------|-------|
| 1 | Login Page | P0 | Trang đăng nhập |
| 2 | Forgot Password | P0 | Quên mật khẩu |
| 3 | Reset Password | P0 | Đặt lại mật khẩu |
| 4 | Accept Invitation | P0 | Chấp nhận lời mời |
| 5 | User Management | P0 | Quản lý người dùng |
| 6 | User Detail | P1 | Chi tiết người dùng |
| 7 | Invite User Modal | P0 | Modal mời người dùng |
| 8 | Team Management | P1 | Quản lý team |
| 9 | Team Detail | P1 | Chi tiết team |
| 10 | App Permissions | P0 | Phân quyền App |
| 11 | My Profile | P1 | Trang cá nhân |
| 12 | Change Password Modal | P1 | Đổi mật khẩu |

### Color Reference

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary | Blue | bg-blue-600, text-blue-600 |
| Success | Green | bg-green-500, text-green-600 |
| Warning | Amber | bg-amber-500, text-amber-600 |
| Error | Red | bg-red-500, text-red-600 |
| Admin role | Purple | bg-purple-100, text-purple-700 |
| Editor role | Blue | bg-blue-100, text-blue-700 |
| Viewer role | Gray | bg-gray-100, text-gray-700 |

---

## PROMPT 1: Login Page

```
Design a modern login page for "Mediation Pro" - an ad mediation management platform.

**Page Layout:**
- Centered card on a subtle gradient background (slate-50 to slate-100)
- Card width: max-w-md (448px)
- Card has white background, rounded-xl, shadow-lg

**Card Content:**

Header Section:
- Logo: "Mediation Pro" with a simple chart/layers icon (purple-600 color)
- Title: "Welcome back" (text-2xl, font-bold)
- Subtitle: "Sign in to your account" (text-muted, text-sm)

Form Section:

Field 1 - Organization:
- Label: "Organization"
- Input type: text
- Placeholder: "your-company"
- Suffix text: ".mediationpro.io" (text-muted inside input)
- Helper text: "Enter your organization identifier"

Field 2 - Email:
- Label: "Email address"
- Input type: email
- Placeholder: "you@company.com"
- Icon: Mail icon on left side of input

Field 3 - Password:
- Label: "Password"
- Input type: password with show/hide toggle
- Placeholder: "Enter your password"
- Icon: Lock icon on left side of input

Options Row:
- Left: Checkbox "Remember me"
- Right: Link "Forgot password?" (text-blue-600)

Submit Button:
- Full width primary button
- Text: "Sign in"
- Loading state: spinner + "Signing in..."

Divider:
- "Or continue with" text with lines on both sides

Social Login Row:
- Google button with icon (outline style)
- Microsoft button with icon (outline style)

Footer:
- Text: "Don't have an account?"
- Link: "Contact your administrator" (text-blue-600)

**Error States:**

Invalid credentials:
- Red alert box above form
- Icon: AlertCircle
- Text: "Invalid email or password. Please try again."

Account locked:
- Red alert box
- Text: "Your account has been locked due to multiple failed attempts. Please try again in 30 minutes or reset your password."

**Additional Elements:**
- Bottom of page: "© 2026 Mediation Pro. All rights reserved." (text-xs, text-muted)
- Language selector dropdown in top-right corner (optional)
```

---

## PROMPT 2: Forgot Password Page

```
Design a forgot password page for password recovery flow.

**Page Layout:**
- Same centered card layout as login page
- Card width: max-w-md

**Card Content:**

Header Section:
- Back link: "← Back to login" (top-left, text-sm, text-blue-600)
- Icon: Large key icon in a circle (blue-100 background, blue-600 icon)
- Title: "Forgot your password?" (text-2xl, font-bold)
- Subtitle: "No worries, we'll send you reset instructions." (text-muted)

Form Section:

Field 1 - Email:
- Label: "Email address"
- Input type: email
- Placeholder: "Enter your email"
- Full width

Submit Button:
- Full width primary button
- Text: "Send reset link"
- Loading state: spinner + "Sending..."

**Success State (replace form):**
- Icon: Large checkmark in green circle
- Title: "Check your email"
- Text: "We've sent a password reset link to john@example.com"
- Subtext: "Didn't receive the email? Check your spam folder or"
- Link: "click here to resend"
- Button: "Back to login" (secondary)

**Error States:**

Email not found:
- Red text below input: "No account found with this email address."

Rate limited:
- Alert box: "Too many requests. Please wait 5 minutes before trying again."
```

---

## PROMPT 3: Reset Password Page

```
Design a reset password page where users set their new password.

**Page Layout:**
- Same centered card layout
- Card width: max-w-md

**Card Content:**

Header Section:
- Icon: Large lock icon in a circle (blue-100 background)
- Title: "Set new password" (text-2xl, font-bold)
- Subtitle: "Your new password must be different from previously used passwords." (text-muted)

Form Section:

Field 1 - New Password:
- Label: "New password"
- Input type: password with show/hide toggle
- Placeholder: "Enter new password"

Password Requirements Checklist (below input):
- Shows live validation as user types
- Each requirement with icon (checkmark if met, circle if not):
  - "At least 8 characters" 
  - "One uppercase letter"
  - "One lowercase letter"
  - "One number"
  - "One special character"
- Met requirements: green checkmark, green text
- Unmet requirements: gray circle, gray text

Field 2 - Confirm Password:
- Label: "Confirm new password"
- Input type: password with show/hide toggle
- Placeholder: "Confirm your password"
- Validation: Show error if doesn't match

Submit Button:
- Full width primary button
- Text: "Reset password"
- Disabled until all requirements met and passwords match

**Success State (replace form):**
- Icon: Large checkmark in green circle
- Title: "Password reset successful"
- Text: "Your password has been successfully reset."
- Button: "Continue to login" (primary)

**Error States:**

Token expired:
- Alert box: "This password reset link has expired. Please request a new one."
- Button: "Request new link"

Token invalid:
- Alert box: "This password reset link is invalid."
- Button: "Back to login"
```

---

## PROMPT 4: Accept Invitation Page

```
Design an invitation acceptance page for new users joining an organization.

**Page Layout:**
- Same centered card layout
- Card width: max-w-lg (slightly wider)

**Card Content:**

Header Section:
- Organization logo (placeholder circle with initials)
- Title: "You've been invited to join Amobear group" (text-xl, font-bold)
- Subtitle: "John Doe invited you to collaborate on Nexus platform" (text-muted)

Invitation Details Card:
- Background: slate-50
- Content:
  - Role: "Editor" badge
  - Teams: "Mobile Team, Analytics Team" 
  - App Access: "5 apps" with "View details" expandable link

Expanded App Access (when clicked):
- List of apps with permission levels:
  - "Weather Plus Pro" - Edit access
  - "Game Master" - View access
  - (etc.)

Form Section:

Field 1 - First Name:
- Label: "First name"
- Required

Field 2 - Last Name:
- Label: "Last name"
- Required

Field 3 - Password:
- Label: "Create password"
- Password input with requirements checklist (same as reset password)

Field 4 - Confirm Password:
- Label: "Confirm password"

Terms Checkbox:
- "I agree to the Terms of Service and Privacy Policy" (with links)

Submit Button:
- Full width primary button
- Text: "Accept invitation & create account"

**Already have account note:**
- Text: "Already have an account?"
- Link: "Sign in instead"

**Error States:**

Invitation expired:
- Full card replaced with error state
- Icon: Clock icon
- Title: "Invitation expired"
- Text: "This invitation has expired. Please contact John Doe to send a new invitation."
- Button: "Back to login"

Invitation already accepted:
- Title: "Invitation already used"
- Text: "This invitation has already been accepted."
- Button: "Sign in to your account"
```

---

## PROMPT 5: User Management Page

```
Design a user management page for administrators to manage organization users.

**Page Layout:**
- Standard admin dashboard layout with sidebar and header
- Same layout structure as other Mediation Pro pages

**Page Header:**
- Title: "Team Members" with count badge "(45 users)"
- Subtitle: "Manage your organization's team members and their access"

**Action Bar:**
- Left side:
  - Search input: "Search by name or email..."
  - Filter dropdown - Role: "All Roles", "Admin", "Editor", "Viewer"
  - Filter dropdown - Status: "All Status", "Active", "Invited", "Inactive"
  - Filter dropdown - Team: "All Teams", list of teams
- Right side:
  - "Export" button (secondary, with download icon)
  - "Invite User" button (primary, with plus icon)

**Stats Cards Row (4 small cards):**
- Total Users: 45
- Active: 42
- Pending Invitations: 3
- Admins: 5

**Main Table:**

Table columns:
1. Checkbox (for bulk selection)
2. User: Avatar (with online indicator dot) + Full Name + Email below (text-muted, smaller)
3. Role: Badge - "Admin" (purple), "Editor" (blue), "Viewer" (gray)
4. Teams: Team badges or "No teams" (text-muted), max 2 visible + "+3 more"
5. App Access: "All Apps" or "12 Apps" with info icon tooltip showing list
6. Status: "Active" (green dot + text), "Invited" (yellow dot), "Inactive" (gray dot)
7. Last Active: "2 hours ago" or "Never" for invited users
8. Actions: Three-dot menu

Actions dropdown options:
- View Profile
- Edit User
- Manage Permissions
- Divider
- Resend Invitation (only for invited status)
- Deactivate User / Reactivate User
- Divider
- Remove from Organization (destructive, red text)

**Row States:**
- Invited users: Slightly muted text, italic email showing "Pending"
- Inactive users: Grayed out row

**Bulk Actions Bar (when users selected):**
- Appears at top of table
- "3 users selected"
- Buttons: "Change Role", "Add to Team", "Deactivate", "Clear selection"

**Pagination:**
- "Showing 1-20 of 45 users"
- Page numbers with Previous/Next
- Page size selector: 10, 20, 50

**Empty States:**

No users found (with filters):
- Illustration: magnifying glass
- Title: "No users found"
- Text: "Try adjusting your search or filters"
- Link: "Clear all filters"

No users yet (initial state):
- Illustration: people group
- Title: "No team members yet"
- Text: "Start by inviting your first team member"
- Button: "Invite User"
```

---

## PROMPT 6: User Detail Page

```
Design a user detail page showing comprehensive information about a single user.

**Page Header:**
- Back link: "← Back to Team Members"
- User info row:
  - Large avatar (64x64) with online status indicator
  - Name: "John Doe" (text-2xl, font-bold)
  - Email: "john.doe@company.com" (text-muted) with copy button
  - Role badge: "Admin" (purple)
  - Status badge: "Active" (green)
- Actions (right side):
  - "Edit User" button (secondary)
  - "More" dropdown: Reset Password, Deactivate, Remove

**Tab Navigation:**
Overview | Permissions | Activity | Sessions

---

**TAB: Overview**

**Two Column Layout:**

Left Column (60%):

Profile Information Card:
- Title: "Profile Information"
- Edit button (top-right)
- Grid of fields:
  - First Name: John
  - Last Name: Doe
  - Email: john.doe@company.com (verified badge)
  - Phone: +1 234 567 8900
  - Role: Admin (with change dropdown)
  - Created: January 1, 2025
  - Created By: System Admin

Teams Card:
- Title: "Teams" with count "(3)"
- "Add to Team" button (top-right)
- List of teams:
  - Each row: Team name + Role in team badge (Owner/Admin/Member) + Remove button
  - Example: "Mobile Team" - "Admin" - [X]
  - Example: "Analytics Team" - "Member" - [X]
- Empty state: "Not a member of any team" with "Add to Team" button

Right Column (40%):

Account Status Card:
- Title: "Account Status"
- Status: Active (green dot)
- Last Login: January 17, 2026 at 10:30 AM
- Last Login IP: 192.168.1.1
- Failed Login Attempts: 0
- Password Last Changed: December 15, 2025
- Must Change Password: No

Quick Stats Card:
- Apps with Access: 12
- Direct Permissions: 5
- Team-inherited: 7
- Link: "View all permissions"

---

**TAB: Permissions**

**Section: Direct App Permissions**
- Title: "Direct Permissions" with count
- "Grant Permission" button

Table:
- App (icon + name + package)
- Permission Level: dropdown (View/Edit/Manage/Owner)
- Granted By: User name
- Granted At: Date
- Expires: Date or "Never"
- Actions: Remove

**Section: Team-Inherited Permissions**
- Title: "Inherited from Teams" (read-only indicator)
- Info text: "These permissions are inherited from team memberships and cannot be modified directly."

Table:
- App (icon + name)
- Permission Level: Badge (read-only)
- Source Team: Team name (link)
- Team Role: Badge

**Effective Permissions Summary Card:**
- Shows merged view of all permissions
- Indicates highest permission level per app
- Shows source (Direct or Team name)

---

**TAB: Activity**

Activity feed with filters:
- Filter by action type: All, Login, Permission Changes, Profile Updates
- Date range picker

Timeline list:
- Each item shows:
  - Action icon (login, edit, permission, etc.)
  - Description: "Logged in from 192.168.1.1"
  - Timestamp: "2 hours ago" with full date on hover
  - Additional details expandable

---

**TAB: Sessions**

Active Sessions Card:
- Title: "Active Sessions"
- "Revoke All" button (destructive)

List of sessions:
- Each session:
  - Device icon (desktop/mobile)
  - Device info: "Chrome on Windows"
  - IP Address: 192.168.1.1
  - Location: "Ho Chi Minh City, Vietnam" (approximate)
  - Last Active: "2 minutes ago"
  - "Current session" badge if applicable
  - "Revoke" button
```

---

## PROMPT 7: Invite User Modal

```
Design a modal for inviting new users to the organization.

**Modal Properties:**
- Size: max-w-2xl (672px)
- Title: "Invite Team Member"
- Subtitle: "Send an invitation to join your organization"

**Modal Body:**

**Step 1: Basic Information**

Field 1 - Email Addresses:
- Label: "Email addresses"
- Input type: Multi-email input (chips/tags style)
- Placeholder: "Enter email addresses..."
- Helper text: "Press Enter or comma to add multiple emails"
- Shows email chips that can be removed
- Validation: Valid email format required

Field 2 - Role:
- Label: "Role"
- Radio group with descriptions:
  - Admin: "Full access to all features including user management"
  - Editor: "Can view and edit apps, mediation groups, and reports"
  - Viewer: "Read-only access to assigned apps and reports"
- Default selection: Viewer

**Divider with section title: "Team Assignment (Optional)"**

Field 3 - Teams:
- Label: "Add to teams"
- Multi-select dropdown with search
- Shows selected teams as chips
- Placeholder: "Select teams..."

**Divider with section title: "App Permissions (Optional)"**

Field 4 - App Access:
- Label: "Grant access to specific apps"
- Toggle: "Give access to all apps" (default off for non-admin)
- If toggle off, show app selector:
  - Multi-select dropdown with app icons and names
  - For each selected app, show permission level dropdown (View/Edit/Manage)
  
Selected Apps List:
- Each row shows:
  - App icon + name
  - Permission level dropdown
  - Remove button (X)

**Divider**

Field 5 - Personal Message (Optional):
- Label: "Personal message"
- Textarea (3 rows)
- Placeholder: "Add a personal note to the invitation email..."
- Character count: "0/500"

**Preview Section:**
- Collapsible "Preview invitation email" link
- Shows formatted preview of the email that will be sent

**Modal Footer:**
- Left: "Invitations expire in 7 days" (text-sm, text-muted)
- Right: "Cancel" button (secondary), "Send Invitation" button (primary)

**Loading State:**
- Button shows spinner + "Sending invitations..."

**Success State:**
- Replace form with success message
- Icon: Large checkmark
- Title: "Invitations sent!"
- Text: "We've sent invitations to 3 email addresses."
- List of sent emails with status icons
- Button: "Invite More" (secondary), "Done" (primary)

**Error States:**

Email already exists:
- Red text below email input
- "john@example.com is already a member of this organization"

Partial success:
- Yellow alert
- "2 of 3 invitations sent. 1 failed:"
- Show failed email with reason
```

---

## PROMPT 8: Team Management Page

```
Design a team management page for organizing users into teams.

**Page Header:**
- Title: "Teams" with count badge "(8 teams)"
- Subtitle: "Organize your team members into groups"

**Action Bar:**
- Left: Search input "Search teams..."
- Right: "Create Team" button (primary, with plus icon)

**Teams Grid (2-3 columns):**

Each team as a Card:

Card Header:
- Team name: "Mobile Team" (font-semibold)
- Member count: "8 members"
- Actions dropdown (three dots): Edit, Manage Members, Delete

Card Body:
- Description: "Team responsible for mobile app development" (text-muted, 2 lines max)
- Member Avatars: Stack of up to 5 avatars with "+3" indicator
- App Access: "12 apps" or "All apps"

Card Footer:
- Created: "Jan 1, 2025"
- "View Team" link

**Create Team Modal:**

Modal title: "Create New Team"

Fields:
1. Team Name (required)
2. Description (optional, textarea)
3. Add Members (multi-select user dropdown)
4. App Permissions (similar to invite modal - select apps with permission levels)

Buttons: Cancel, Create Team

**Empty State:**
- Illustration: people in group
- Title: "No teams yet"
- Text: "Create teams to organize your users and manage app permissions efficiently"
- Button: "Create First Team"
```

---

## PROMPT 9: Team Detail Page

```
Design a team detail page showing team information and members.

**Page Header:**
- Back link: "← Back to Teams"
- Team name: "Mobile Team" (text-2xl, font-bold)
- Member count badge: "8 members"
- Actions: "Edit Team" (secondary), "Delete Team" (destructive, in dropdown)

**Tab Navigation:**
Members | App Permissions | Settings

---

**TAB: Members**

**Action Bar:**
- Search: "Search members..."
- "Add Members" button (primary)

**Members Table:**

Columns:
1. User: Avatar + Name + Email
2. Role in Team: Badge dropdown (Owner/Admin/Member)
3. Joined: Date
4. Added By: User name
5. Actions: Remove from team

**Add Members Modal:**
- Multi-select user dropdown
- Default role selector
- Preview list before adding
- Buttons: Cancel, Add Members

---

**TAB: App Permissions**

**Info Banner:**
- "Permissions granted here apply to all team members. Individual users can have additional direct permissions."

**Action Bar:**
- "Grant App Access" button

**Permissions Table:**

Columns:
1. App: Icon + Name + Package
2. Permission Level: Dropdown (View/Edit/Manage/Owner)
3. Granted By: User name
4. Granted At: Date
5. Actions: Remove

**Grant Permission Modal:**
- App selector (multi-select with search)
- Permission level for selected apps
- Buttons: Cancel, Grant Access

---

**TAB: Settings**

Team Information Card:
- Team Name: Editable input
- Description: Editable textarea
- Save Changes button

Danger Zone Card:
- Title: "Danger Zone"
- Delete Team: Warning text + "Delete Team" button (red)
- Confirmation modal required
```

---

## PROMPT 10: App Permissions Page (per App)

```
Design a permissions management page for a specific app.

**Context:** This page is accessed from App Detail page, showing who has access to this app.

**Page Header:**
- Back link: "← Back to Weather Plus Pro"
- Title: "Permissions"
- Subtitle: "Manage who can access this app"
- App info: Icon + "Weather Plus Pro" (smaller, with app badge)

**Summary Cards Row (3 cards):**
- Total with Access: 15 users
- Direct Permissions: 8
- Via Teams: 7 (from 3 teams)

**Tab Navigation:**
All Access | Users | Teams

---

**TAB: All Access (Default)**

Shows merged view of all users with access:

Table columns:
1. User: Avatar + Name + Email
2. Permission Level: Badge (highest level)
3. Source: "Direct" badge or Team name link
4. Actions: "Manage" button (opens appropriate edit)

Sorting: By permission level (Owner first), then alphabetically

---

**TAB: Users (Direct Permissions)**

**Action Bar:**
- Search users
- "Grant Access" button

**Table:**
1. User: Avatar + Name + Email
2. Permission Level: Dropdown (View/Edit/Manage/Owner) - editable inline
3. Granted By: User name
4. Granted At: Date
5. Expires: Date or "Never" (editable)
6. Actions: Remove

**Grant Access Modal:**
- User selector (shows users without current access)
- Permission level dropdown
- Expiration date (optional)
- Buttons: Cancel, Grant Access

---

**TAB: Teams**

Shows teams with access to this app:

**Action Bar:**
- "Grant Team Access" button

**Team Cards:**

Each team card shows:
- Team name + member count
- Permission level dropdown (editable)
- Members preview (avatars)
- "View Team" link
- Remove button

**Grant Team Access Modal:**
- Team selector
- Permission level
- Buttons: Cancel, Grant Access
```

---

## PROMPT 11: My Profile Page

```
Design a profile page for users to manage their own account.

**Page Header:**
- Title: "My Profile"
- Subtitle: "Manage your account settings"

**Two Column Layout:**

**Left Column (65%):**

Profile Card:
- Large avatar (96x96) with "Change Photo" overlay on hover
- Name: "John Doe"
- Email: "john.doe@company.com" with verified badge
- Role: "Admin" badge
- Member since: "January 1, 2025"

Personal Information Card:
- Title: "Personal Information"
- "Edit" button
- Fields (read mode):
  - First Name: John
  - Last Name: Doe
  - Phone: +1 234 567 8900
  - Timezone: (UTC+7) Asia/Ho_Chi_Minh

Edit mode (in-place or modal):
- All fields become editable
- Save/Cancel buttons

**Right Column (35%):**

Security Card:
- Title: "Security"
- Password section:
  - Last changed: "30 days ago"
  - "Change Password" button
- Two-Factor Authentication:
  - Status: "Not enabled"
  - "Enable 2FA" button

Active Sessions Card:
- Title: "Active Sessions"
- "View All" link
- Shows current session info
- "Sign out all other devices" link

Notification Preferences Card:
- Title: "Notifications"
- Toggle switches:
  - Email notifications for alerts
  - Weekly summary report
  - Team activity updates

**Full Width Section:**

My Permissions Card:
- Title: "My Access"
- Collapsible sections:
  - Apps I can access (list with permission levels)
  - Teams I belong to (list with roles)
```

---

## PROMPT 12: Change Password Modal

```
Design a modal for users to change their password.

**Modal Properties:**
- Size: max-w-md
- Title: "Change Password"

**Modal Body:**

Field 1 - Current Password:
- Label: "Current password"
- Input type: password with toggle
- Required

Field 2 - New Password:
- Label: "New password"
- Input type: password with toggle
- Password requirements checklist (same as reset password):
  - At least 8 characters
  - One uppercase letter
  - One lowercase letter
  - One number
  - One special character

Field 3 - Confirm New Password:
- Label: "Confirm new password"
- Validation: Must match new password

**Modal Footer:**
- "Cancel" button (secondary)
- "Change Password" button (primary)
- Disabled until all validations pass

**Error States:**

Wrong current password:
- Red text below first field: "Current password is incorrect"

Password recently used:
- Red alert: "This password was used recently. Please choose a different password."

**Success State:**
- Replace form with success message
- Icon: Checkmark
- Title: "Password changed"
- Text: "Your password has been updated successfully."
- Note: "You may need to sign in again on other devices."
- Button: "Done"
```

---

## Summary: Screen Flow

```
Authentication Flow:
Login → [Success] → Dashboard
Login → Forgot Password → Reset Password → Login
Invitation Email → Accept Invitation → Dashboard

User Management Flow:
Team Members List → Invite User Modal
Team Members List → User Detail → Edit User / Manage Permissions
Team Members List → User Detail → Activity / Sessions

Team Management Flow:
Teams List → Create Team Modal
Teams List → Team Detail → Members / Permissions / Settings

Permission Flow:
App Detail → Permissions Tab → App Permissions Page
User Detail → Permissions Tab
Team Detail → App Permissions Tab
```

---

## Thứ tự ưu tiên Implementation

| Priority | Màn hình | Complexity | Notes |
|----------|----------|------------|-------|
| P0 | Login Page | Low | Entry point |
| P0 | User Management | Medium | Core feature |
| P0 | Invite User Modal | Medium | User onboarding |
| P0 | App Permissions | Medium | Core authorization |
| P0 | Accept Invitation | Low | User onboarding |
| P1 | User Detail | Medium | User management |
| P1 | Forgot/Reset Password | Low | Auth flow |
| P1 | Team Management | Medium | Organization |
| P1 | Team Detail | Medium | Organization |
| P1 | My Profile | Low | Self-service |
| P1 | Change Password Modal | Low | Security |
