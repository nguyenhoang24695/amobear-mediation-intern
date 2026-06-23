# Mediation Pro - Organization Management UI Design Prompts

## Overview

This document contains prompts for designing Organization Management screens using Vercel v0.
These screens are intended for **super_admin** users who can manage all organizations in the system.

### Screen List

| # | Screen | Priority | Description |
|---|--------|----------|-------------|
| 1 | Organization List | P0 | List all organizations with search, filter, pagination |
| 2 | Create Organization Modal | P0 | Create new organization |
| 3 | Organization Detail | P0 | View/edit organization details |
| 4 | Organization Users Tab | P0 | Manage users within organization |
| 5 | Add User to Organization Modal | P0 | Add existing or invite new user |
| 6 | Organization Settings Tab | P1 | Organization settings and danger zone |

### Color Reference

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary | Blue | bg-blue-600, text-blue-600 |
| Success/Active | Green | bg-green-500, text-green-600 |
| Warning | Amber | bg-amber-500, text-amber-600 |
| Error/Inactive | Red | bg-red-500, text-red-600 |
| super_admin role | Purple | bg-purple-100, text-purple-700 |
| admin role | Blue | bg-blue-100, text-blue-700 |
| editor role | Cyan | bg-cyan-100, text-cyan-700 |
| viewer role | Gray | bg-gray-100, text-gray-700 |

---

## PROMPT 1: Organization List Page

```
Design an organization management page for super administrators to manage all organizations in Mediation Pro platform.

**Page Layout:**
- Standard admin dashboard layout with sidebar and header
- Same layout structure as other Mediation Pro pages
- Only accessible to super_admin role

**Page Header:**
- Title: "Organizations" with count badge "(12 organizations)"
- Subtitle: "Manage all organizations in the platform"

**Action Bar:**
- Left side:
  - Search input: "Search by name or slug..."
  - Filter dropdown - Status: "All Status", "Active", "Inactive"
- Right side:
  - "Export" button (secondary, with download icon)
  - "Create Organization" button (primary, with plus icon)

**Stats Cards Row (4 small cards):**
- Total Organizations: 12
- Active: 10
- Inactive: 2
- Total Users: 156

**Main Table:**

Table columns:
1. Organization: Logo (48x48, rounded, with fallback initials) + Name (font-semibold) + Slug below (text-muted, text-sm, format: "slug.mediationpro.io")
2. Users: Number with user icon (e.g., "45 users")
3. Status: "Active" (green dot + text) or "Inactive" (red dot + text)
4. Created: Date format "Jan 15, 2025"
5. Last Activity: "2 hours ago" or "Never"
6. Actions: Three-dot menu

Actions dropdown options:
- View Details
- Edit Organization
- Divider
- Deactivate Organization / Activate Organization (toggle based on status)
- Divider
- Delete Organization (destructive, red text)

**Row Hover State:**
- Subtle background highlight (slate-50)
- Entire row clickable to open detail page

**Pagination:**
- "Showing 1-10 of 12 organizations"
- Page numbers with Previous/Next
- Page size selector: 10, 20, 50

**Empty States:**

No organizations found (with filters):
- Illustration: building with magnifying glass
- Title: "No organizations found"
- Text: "Try adjusting your search or filters"
- Link: "Clear all filters"

No organizations yet (initial state):
- Illustration: office building
- Title: "No organizations yet"
- Text: "Create your first organization to get started"
- Button: "Create Organization"
```

---

## PROMPT 2: Create Organization Modal

```
Design a modal for creating a new organization in Mediation Pro.

**Modal Properties:**
- Size: max-w-lg (512px)
- Title: "Create New Organization"
- Subtitle: "Add a new organization to the platform"

**Modal Body:**

**Section: Basic Information**

Field 1 - Organization Name:
- Label: "Organization Name" (required)
- Input type: text
- Placeholder: "Enter organization name"
- Helper text: "This will be displayed throughout the platform"
- Max length: 100 characters

Field 2 - Organization Slug:
- Label: "Organization Slug" (required)
- Input type: text with prefix display
- Prefix (inside input, text-muted): "https://"
- Suffix (inside input, text-muted): ".mediationpro.io"
- Placeholder: "your-org"
- Helper text: "URL-friendly identifier. Only lowercase letters, numbers, and hyphens."
- Auto-generate from name (but editable)
- Validation: 
  - Only a-z, 0-9, hyphen
  - Min 3, max 30 characters
  - Check uniqueness on blur (show spinner while checking)
- Error states: 
  - "Slug already taken" (with suggestion: "Try: your-org-1")
  - "Invalid characters"

Field 3 - Logo:
- Label: "Organization Logo" (optional)
- Upload component: Drag & drop zone or click to upload
- Accepted formats: PNG, JPG, SVG
- Max size: 2MB
- Preview: Show uploaded image with remove button
- Placeholder: Circle with upload icon

**Divider**

**Section: Initial Admin User (Optional)**

Toggle: "Create admin user for this organization"

When enabled, show:

Field 4 - Admin Email:
- Label: "Admin Email"
- Input type: email
- Placeholder: "admin@organization.com"

Field 5 - Admin First Name:
- Label: "First Name"
- Input type: text

Field 6 - Admin Last Name:
- Label: "Last Name"
- Input type: text

Field 7 - Temporary Password:
- Label: "Temporary Password"
- Input type: password with show/hide toggle
- "Generate Password" button next to input
- Helper text: "User will be required to change password on first login"

**Modal Footer:**
- Left: Empty
- Right: "Cancel" button (secondary), "Create Organization" button (primary)

**Loading State:**
- Button shows spinner + "Creating..."
- All inputs disabled

**Success State:**
- Replace content with success message
- Icon: Large checkmark in green circle
- Title: "Organization created!"
- Text: "Amobear has been created successfully."
- If admin user created: "An admin account has been created for john@Amobear.vn"
- Buttons: "Create Another" (secondary), "View Organization" (primary)

**Error States:**

Slug already exists:
- Red text below slug input: "This slug is already taken. Try: your-org-1"

Validation errors:
- Red border on invalid fields
- Error text below each field
```

---

## PROMPT 3: Organization Detail Page

```
Design an organization detail page showing comprehensive information and settings.

**Page Header:**
- Back link: "← Back to Organizations"
- Organization info row:
  - Large logo (80x80, rounded-xl) with fallback initials on colored background
  - Name: "Amobear group" (text-2xl, font-bold)
  - Slug: "nexus.amobear.vn" (text-muted) with copy button
  - Status badge: "Active" (green) or "Inactive" (red)
  - Created: "Created Jan 15, 2025"
- Actions (right side):
  - "Edit" button (secondary)
  - "More" dropdown: Deactivate/Activate, Delete Organization

**Tab Navigation:**
Overview | Users | Settings

---

**TAB: Overview**

**Two Column Layout:**

Left Column (60%):

Organization Information Card:
- Title: "Organization Information"
- Edit button (top-right, icon only)
- Fields displayed as label-value pairs:
  - Name: Amobear Group
  - Slug: Amobear
  - Status: Active (badge)
  - Created: January 15, 2025
  - Last Updated: January 20, 2025

Quick Stats Card:
- Title: "Statistics"
- 2x2 grid of metrics:
  - Total Users: 45
  - Active Users: 42
  - Teams: 8
  - Apps with Access: 24

Right Column (40%):

Activity Summary Card:
- Title: "Recent Activity"
- Timeline list (last 5 activities):
  - "John Doe was added to the organization" - 2 hours ago
  - "Organization settings updated" - Yesterday
  - "New team 'Mobile Team' created" - 3 days ago
- Link at bottom: "View all activity →"

User Distribution Card:
- Title: "Users by Role"
- Horizontal bar chart or pie chart showing:
  - Admins: 5
  - Editors: 15
  - Viewers: 25
```

---

## PROMPT 4: Organization Users Tab

```
Design the Users tab within Organization Detail page for managing organization members.

**Context:** This is a tab within the Organization Detail page, accessible only to super_admin.

**Tab Header:**
- Title: "Organization Users" with count "(45)"
- Subtitle: "Manage users in this organization"

**Action Bar:**
- Left side:
  - Search input: "Search by name or email..."
  - Filter dropdown - Role: "All Roles", "Admin", "Editor", "Viewer"
  - Filter dropdown - Status: "All Status", "Active", "Invited", "Inactive"
- Right side:
  - "Add User" button (primary, with plus icon)

**Stats Row (4 small inline stats):**
- Total: 45 | Active: 42 | Invited: 2 | Inactive: 1

**Users Table:**

Table columns:
1. Checkbox (for bulk selection)
2. User: Avatar (40x40) + Full Name + Email below (text-muted, text-sm)
3. Role: Dropdown selector (Admin/Editor/Viewer) - inline editable
4. Status: "Active" (green), "Invited" (yellow), "Inactive" (gray)
5. Joined: Date or "Pending" for invited
6. Last Active: "2 hours ago" or "Never"
7. Actions: Three-dot menu

Actions dropdown options:
- View Profile
- Edit User
- Change Role (submenu: Admin, Editor, Viewer)
- Divider
- Resend Invitation (only for invited)
- Reset Password
- Divider
- Deactivate User / Activate User
- Remove from Organization (destructive, red)

**Bulk Actions Bar (when users selected):**
- Sticky bar at top of table
- "3 users selected"
- Buttons: 
  - "Change Role" (dropdown)
  - "Deactivate" 
  - "Remove from Organization" (destructive)
  - "Clear selection"

**Inline Role Change:**
- When clicking role badge, show dropdown
- Options: Admin, Editor, Viewer
- Confirmation toast after change: "Role updated to Editor"

**Remove User Confirmation Modal:**
- Title: "Remove User from Organization"
- Warning icon (amber)
- Text: "Are you sure you want to remove John Doe from Amobear?"
- Subtext: "This user will lose access to all organization resources. This action cannot be undone."
- Buttons: "Cancel", "Remove User" (destructive, red)

**Empty State:**
- Illustration: people with plus icon
- Title: "No users in this organization"
- Text: "Add your first user to get started"
- Button: "Add User"
```

---

## PROMPT 5: Add User to Organization Modal

```
Design a modal for adding users to an organization. Support both adding existing platform users and inviting new users.

**Modal Properties:**
- Size: max-w-2xl (672px)
- Title: "Add User to Organization"
- Subtitle: "Add an existing user or invite someone new to Amobear group"

**Modal Body:**

**Tab Toggle at Top:**
Two options: "Invite New User" (default) | "Add Existing User"

---

**TAB: Invite New User**

Field 1 - Email Addresses:
- Label: "Email addresses"
- Input type: Multi-email input (chips/tags style)
- Placeholder: "Enter email addresses..."
- Helper text: "Press Enter or comma to add multiple emails"
- Shows email chips with remove button (X)
- Validation: Valid email format, not already in organization

Field 2 - Role:
- Label: "Role"
- Radio group with descriptions:
  - Admin: "Full access to organization settings and user management"
  - Editor: "Can view and edit apps, reports, and mediation settings"
  - Viewer: "Read-only access to assigned apps and reports"
- Default: Viewer

Field 3 - Teams (Optional):
- Label: "Add to teams"
- Multi-select dropdown with search
- Shows selected teams as chips
- Placeholder: "Select teams..."

Field 4 - Personal Message (Optional):
- Label: "Personal message"
- Textarea (2 rows)
- Placeholder: "Add a note to the invitation email..."
- Character count: "0/300"

**Invitation Preview (Collapsible):**
- Link: "Preview invitation email"
- Shows formatted email preview

---

**TAB: Add Existing User**

Field 1 - Search User:
- Label: "Search for user"
- Input with search icon
- Placeholder: "Search by name or email..."
- Autocomplete dropdown showing matching users:
  - Each result: Avatar + Name + Email + Current organization badge
  - Exclude users already in this organization
  - Show "(Already in organization)" for existing members (disabled)

Field 2 - Selected Users:
- Shows list of selected users as cards:
  - Avatar + Name + Email
  - Role dropdown (Admin/Editor/Viewer)
  - Remove button (X)

Field 3 - Teams (Optional):
- Same as invite tab

**Modal Footer:**
- Left: "Users will receive a notification email"
- Right: "Cancel" button (secondary), "Add Users" / "Send Invitations" button (primary)

**Loading State:**
- Button shows spinner
- Text: "Adding users..." or "Sending invitations..."

**Success State:**
- Icon: Large checkmark
- Title: "Users added!" or "Invitations sent!"
- Text: "3 users have been added to Amobear group"
- List of added/invited users with status icons
- Buttons: "Add More" (secondary), "Done" (primary)

**Error States:**

Email already in organization:
- Red text below email input
- "john@example.com is already a member of this organization"

Partial success:
- Yellow alert
- "2 of 3 users added. 1 failed:"
- Show failed user with reason
```

---

## PROMPT 6: Organization Settings Tab

```
Design the Settings tab within Organization Detail page.

**Context:** This is a tab within Organization Detail page, accessible only to super_admin.

**Tab Content:**

**Section 1: Organization Profile**

Card with title: "Organization Profile"
- Edit mode toggle or "Edit" button top-right

Fields (editable inline or in edit mode):
- Organization Name: Text input
- Organization Slug: Text input with live preview of URL
- Logo: Upload component with current logo preview and "Change" / "Remove" buttons

"Save Changes" button (appears when changes made)

---

**Section 2: Organization Settings**

Card with title: "Settings"

Setting 1 - Default User Role:
- Label: "Default role for new users"
- Dropdown: Viewer (default), Editor, Admin
- Helper text: "Role assigned to users when invited without specifying a role"

Setting 2 - Allow User Self-Registration:
- Toggle switch
- Label: "Allow users to request access"
- Helper text: "When enabled, users can request to join this organization"

Setting 3 - Session Timeout:
- Dropdown: "30 minutes", "1 hour", "4 hours", "8 hours", "24 hours", "Never"
- Helper text: "Automatically log out users after period of inactivity"

"Save Settings" button

---

**Section 3: Danger Zone**

Card with title: "Danger Zone"
- Red/destructive styling (red border-left or red background-subtle)

Action 1 - Deactivate Organization:
- Title: "Deactivate Organization"
- Description: "Temporarily disable this organization. Users will not be able to log in."
- Button: "Deactivate Organization" (outline, red)
- If already inactive, show "Activate Organization" instead

Action 2 - Delete Organization:
- Title: "Delete Organization"
- Description: "Permanently delete this organization and all its data. This action cannot be undone."
- Button: "Delete Organization" (solid, red)

**Deactivate Confirmation Modal:**
- Title: "Deactivate Organization"
- Icon: Warning (amber)
- Text: "Are you sure you want to deactivate Amobear?"
- Subtext: "All 45 users will be logged out and unable to access the platform until the organization is reactivated."
- Input: "Type 'DEACTIVATE' to confirm"
- Buttons: "Cancel", "Deactivate" (destructive, disabled until typed correctly)

**Delete Confirmation Modal:**
- Title: "Delete Organization Permanently"
- Icon: Danger (red)
- Text: "This action is permanent and cannot be undone."
- Warning list:
  - "45 users will be removed"
  - "8 teams will be deleted"
  - "All organization data will be permanently lost"
- Input: "Type 'amobear' (organization slug) to confirm"
- Buttons: "Cancel", "Delete Organization" (destructive, disabled until typed correctly)
```

---

## Design System Notes

### Consistent Patterns

1. **Page Headers**: Title + count badge + subtitle
2. **Action Bars**: Search left, primary actions right
3. **Tables**: Checkbox, main info, key columns, actions menu
4. **Modals**: Max-width, title + subtitle, sections with dividers, footer with cancel + primary
5. **Confirmations**: Icon + title + description + optional input + buttons

### Status Colors

| Status | Dot | Text | Badge BG |
|--------|-----|------|----------|
| Active | green-500 | green-700 | green-100 |
| Inactive | red-500 | red-700 | red-100 |
| Invited/Pending | amber-500 | amber-700 | amber-100 |

### Role Badges

| Role | Text Color | BG Color |
|------|------------|----------|
| super_admin | purple-700 | purple-100 |
| admin | blue-700 | blue-100 |
| editor | cyan-700 | cyan-100 |
| viewer | gray-700 | gray-100 |
