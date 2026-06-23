# Mediation Pro - UI Design Prompts (v2.1 - With Editable Optimization)

## Các màn hình cần thay đổi / thêm mới

Dựa trên yêu cầu:
1. **Waterfall Optimization**: Side-by-side view (Current vs Optimized) với OPTIMIZED có thể edit
2. **Editable Features**: Sửa eCPM floor, thêm/xóa sources trong phần Optimized
3. **A/B Testing**: Setup, monitor và apply kết quả test

### Danh sách thay đổi:

| # | Màn hình | Status | Mô tả |
|---|----------|--------|-------|
| 1 | Mediation Group Detail | **UPDATED** | Tab "Waterfall & Optimization" với editable Optimized section |
| 2 | A/B Test Detail | **NEW** | Trang chi tiết kết quả A/B test |
| 3 | Create A/B Test Modal | **NEW** | Modal wizard setup A/B test |
| 4 | Apply Variant Modal | **NEW** | Modal xác nhận apply changes |
| 5 | Add Ad Source Modal | **NEW** | Modal thêm ad source vào Optimized |
| 6 | Mediation Groups List | **MINOR UPDATE** | Thêm column A/B Test status |

### Color Reference (AdMob Style)

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Variant A (Current/Control) | Teal/Cyan | bg-teal-500, text-teal-600, border-teal-500 |
| Variant B (Optimized/Treatment) | Purple/Violet | bg-purple-500, text-purple-600, border-purple-500 |
| Winner indicator | Green | bg-green-500, text-green-600 |
| In Progress | Purple | bg-purple-100, text-purple-700 |
| Completed | Green | bg-green-100, text-green-700 |
| Changed values | Amber | bg-amber-100, text-amber-700 |
| Added items | Green | bg-green-100, text-green-700 |
| Removed items | Red | bg-red-100, text-red-700, line-through |
| Editable field focus | Blue | ring-2 ring-blue-500 |

---

## PROMPT 5: Mediation Group Detail (UPDATED - WITH EDITABLE OPTIMIZATION)

```
Design a comprehensive Mediation Group Detail page with waterfall optimization and A/B testing capabilities. The OPTIMIZED section should be fully editable.

**Context:** This is the core page for ad mediation optimization. Users can view current waterfall configuration, see AI-optimized suggestions, EDIT the suggestions (change eCPM floors, add/remove sources), then either apply changes directly or run A/B tests.

**Page Header:**
- Back: "← Mediation Groups" link
- Group name: "Weather Plus - Rewarded Video - US Tier 1" (text-xl font-bold)
- Badge row: App name (link), Format badge (Rewarded with green background), Status badge (Active)
- A/B Test indicator: If test running, show "🧪 A/B Test Running" badge (purple) with "Day 5/14"
- Actions (right side):
  - "View in AdMob" button (secondary, external icon)
  - "Sync Now" button (secondary, refresh icon)
  - "Pause Group" button (secondary)
  - More dropdown: Duplicate, Export, Delete

**Tab Navigation:**
Overview | Waterfall & Optimization (star icon, PRIMARY) | A/B Tests (badge showing count) | Performance | Change History

---

**TAB: Waterfall & Optimization (PRIMARY - MOST IMPORTANT)**

**Section 1: Optimization Status Banner**

Design a full-width banner at top with three possible states:

STATE A - Has Optimization Available:
- Background: light blue (blue-50) with blue-500 left border (4px)
- Icon: lightbulb (💡)
- Title: "Optimization Available" (font-semibold)
- Description: "Our analysis suggests changes that could increase eCPM by ~12% ($0.54)"
- Subtext: "Based on last 14 days performance data • Confidence: 87%" (text-muted)
- Actions row: "View Changes" link, "Apply Direct" button (secondary), "Run A/B Test" button (primary)
- Dismiss button (X) on top-right

STATE B - A/B Test Running:
- Background: light purple (purple-50) with purple-500 left border
- Icon: flask (🧪)
- Title: "A/B Test In Progress"
- Description: "Testing optimized waterfall • Day 5 of 14 • Traffic split: 50/50"
- Subtext: "Early results: Variant B (Optimized) leading by +8.2% eCPM"
- Progress bar: 35% filled (purple)
- Action: "View Test Details" button on right

STATE C - No Optimization Needed:
- Background: light green (green-50) with green-500 left border
- Icon: checkmark (✅)
- Title: "Waterfall Optimized"
- Description: "Current configuration is performing optimally"
- Subtext: "Last analyzed: 2 hours ago"
- Action: "Re-analyze Now" link

STATE D - Has Unsaved Changes (NEW):
- Background: light amber (amber-50) with amber-500 left border
- Icon: pencil (✏️)
- Title: "Unsaved Changes"
- Description: "You have modified the optimized waterfall configuration"
- Subtext: "3 changes pending • Don't forget to apply or test"
- Actions: "Discard Changes" link (text-red), "Apply Direct" button (secondary), "Run A/B Test" button (primary)

---

**Section 2: Side-by-Side Waterfall Comparison**

**Header Row:**
- Title: "Waterfall Configuration"
- Controls: View dropdown (Side by Side), Show dropdown (All Sources), Expand All button, Collapse All button
- Right side: "Reset to AI Suggestion" link (only visible when user has made manual changes)

**Two-Column Layout (50% each):**

**LEFT COLUMN - Current Setup (READ-ONLY):**
- Header bar: teal-500 background color
- Title: "CURRENT SETUP"
- Subtitle: "Variant A • Active • Read-only"
- Estimated Monthly: "$859"
- Lock icon indicating read-only

**RIGHT COLUMN - Optimized Suggested (EDITABLE):**
- Header bar: purple-500 background color
- Title: "OPTIMIZED (Suggested)"
- Subtitle: "Variant B • Editable"
- Estimated Monthly: "$954 (+11.1%)" - this value should update dynamically when user makes changes
- Edit icon indicating editable
- "Unsaved changes" indicator badge (amber) when modified

---

**LEFT COLUMN Content (Current - Read-only):**

Bidding Section:
- Collapsible header: "Bidding (2 sources)" with chevron
- Card for each source showing:
  - Status icon (checkmark if active)
  - Network name (e.g., "AdMob Network")
  - Floor info: "No floor • Active"
  - Performance: "7D: $8.50 eCPM"
- No edit controls - display only

Waterfall Section:
- Collapsible header: "Waterfall (5 sources)" with chevron
- Numbered list of sources, each showing:
  - Position number (1, 2, 3...)
  - Source name (e.g., "Inter81.15")
  - eCPM Floor value (e.g., "$81.15") - plain text, not editable
  - Actual eCPM (e.g., "eCPM: $85.20")
- No edit controls - display only

---

**RIGHT COLUMN Content (Optimized - EDITABLE):**

Bidding Section:
- Collapsible header: "Bidding (2 sources)" with chevron
- Card for each source showing:
  - Status toggle (switch to enable/disable)
  - Network name
  - Floor info
  - Performance
  - Delete button (trash icon) on hover
- Footer: "+ Add Bidding Source" button

Waterfall Section:
- Collapsible header: "Waterfall (6 sources)" with chevron and count that updates dynamically
- EDITABLE list of sources with drag handles for reordering

Each waterfall row contains:
- Drag handle icon (6 dots) on far left for reordering
- Position number (auto-calculated: 1, 2, 3...)
- Source name dropdown (can change to different ad source)
- eCPM Floor: EDITABLE INPUT FIELD
  - Shows current value (e.g., "$191.42")
  - Click to edit - shows input with $ prefix
  - On blur or Enter: save value
  - Validation: must be positive number
  - If changed from original: amber-100 background + "Modified" badge
- Actual eCPM (read-only): "7D: $195.50"
- Status toggle (switch)
- Delete button (trash icon) - click shows confirmation tooltip "Remove this source?"

Footer: "+ Add Waterfall Source" button (opens Add Ad Source Modal)

**Visual States for Each Row:**

Original (unchanged):
- Normal white background
- No badge

Modified (eCPM changed):
- amber-100 background
- "MODIFIED" badge (amber)
- Show original value in tooltip or strikethrough: "Was: $81.15"

New (added by user):
- green-100 background
- "NEW" badge (green)

Removed (marked for deletion):
- red-100 background
- Strikethrough text
- "REMOVED" badge (red)
- "Undo" link instead of delete button

---

**Section 3: Changes Summary Card (DYNAMIC)**

This card updates in real-time as user makes changes:

Card with border:
- Title: "Changes Summary" with chart icon
- Dynamic bullet list based on actual changes:
  - "X eCPM floors modified" (show count, e.g., "5 eCPM floors modified (avg +$52.40)")
  - "X sources added" (e.g., "1 source added: Inter200.00")
  - "X sources removed" (e.g., "1 source removed: Inter30.43")
  - "Estimated impact: +$XX/month (+XX%)" - recalculated based on changes

- Confidence Score section:
  - If using AI suggestion unchanged: "Confidence: 87% (AI Optimized)"
  - If user modified: "Confidence: -- (Manual changes)" with info tooltip "Confidence score only available for AI-generated suggestions"

- Comparison mini-table:
  - Headers: Metric | Current | Optimized | Change
  - Row 1: Est. Monthly Revenue | $859 | $954 | +$95 (+11.1%)
  - Row 2: Waterfall Sources | 5 | 6 | +1
  - Row 3: Avg eCPM Floor | $53.68 | $116.90 | +$63.22

**Empty State (no changes):**
- Text: "No changes from current configuration"
- Subtext: "Modify the optimized waterfall or use AI suggestions"

---

**Section 4: Action Buttons**

Inline with Changes Summary (right side) or as Sticky Bottom Bar when scrolling:

If no changes made:
- "Apply Direct" button (disabled)
- "Run A/B Test" button (disabled)
- Helper text: "Make changes to enable actions"

If has changes:
- "Discard All Changes" link (text-red, left side)
- "Apply Direct" button (secondary)
- "Run A/B Test" button (primary)

---

**TAB: A/B Tests**

(Same as before - list of tests with status badges)

**Header:**
- Title: "A/B Tests"
- "Create New Test" button (primary) - disabled with tooltip if test already running

**Test Cards List:**
(Keep same design as v2 - cards for In Progress, Completed, Cancelled tests)

---

**Interaction Details:**

1. Editing eCPM Floor:
   - Click on value → transforms to input field
   - Input has $ prefix
   - Press Enter or click outside to save
   - Press Escape to cancel
   - Invalid value shows red border + error message

2. Drag to Reorder:
   - Grab drag handle
   - Visual indicator shows drop position
   - Release to reorder
   - Position numbers auto-update

3. Delete Source:
   - Click trash icon
   - Row changes to "removed" state (strikethrough, red background)
   - "Undo" link appears
   - Not actually removed until Apply

4. Add Source:
   - Click "+ Add Waterfall Source"
   - Opens Add Ad Source Modal
   - New source appears at bottom with "NEW" badge
   - Can reorder after adding

5. Real-time Updates:
   - Changes Summary updates instantly
   - Estimated Monthly Revenue recalculates
   - Source counts update
   - Banner changes to "Unsaved Changes" state
```

---

## PROMPT 6: Add Ad Source Modal (NEW)

```
Design a modal for adding a new ad source to the Optimized waterfall.

**Trigger:** Click "+ Add Waterfall Source" or "+ Add Bidding Source" button

**Modal Properties:**
- Size: Medium (max-w-lg, approximately 512px width)
- Overlay: Dark semi-transparent backdrop

**Modal Header:**
- Title: "Add Ad Source"
- Subtitle: "Add a new source to your optimized waterfall"
- Close button (X) on top-right

**Modal Body:**

**Field 1: Source Type**
- Label: "Source Type"
- Radio group:
  - "Waterfall Source" - "Called in order by eCPM floor" (pre-selected if came from waterfall section)
  - "Bidding Source" - "Competes in real-time auction" (pre-selected if came from bidding section)

**Divider**

**Field 2: Ad Network**
- Label: "Ad Network"
- Searchable dropdown/combobox
- Placeholder: "Search or select ad network..."
- Options grouped by category:
  - Recently Used:
    - ironSource
    - Vungle
  - All Networks:
    - AdMob
    - AppLovin
    - Chartboost
    - Facebook Audience Network
    - InMobi
    - ironSource
    - Mintegral
    - Pangle
    - Unity Ads
    - Vungle
    - (more...)
- Each option shows network icon + name
- Search filters the list

**Field 3: Ad Unit Name (for Waterfall only)**
- Label: "Ad Unit Name"
- Input field
- Placeholder: "e.g., Inter200.00"
- Helper text: "This will be the display name in your waterfall"

**Field 4: eCPM Floor (for Waterfall only)**
- Label: "eCPM Floor"
- Input field with $ prefix
- Placeholder: "0.00"
- Helper text: "Minimum eCPM required to show ads from this source"
- Validation: Must be positive number

**Field 5: Initial Status**
- Label: "Status"
- Toggle switch: Active (default on)
- Helper text: "You can change this later"

**Preview Card:**
- Background: slate-50
- Title: "Preview"
- Shows how the source will appear:
  - Network icon + "Inter200.00"
  - "$200.00 floor"
  - "Active" badge

**Modal Footer:**
- "Cancel" button (secondary)
- "Add Source" button (primary) - disabled until required fields filled

**Validation:**
- Ad Network: Required
- Ad Unit Name: Required for waterfall
- eCPM Floor: Required for waterfall, must be > 0

**Success Behavior:**
- Modal closes
- New source appears in the Optimized column with "NEW" badge
- Changes Summary updates to show "+1 source added"
- Toast notification: "Source added. Don't forget to apply changes."
```

---

## PROMPT 7: A/B Test Detail Page (NEW)

```
Design a detailed A/B Test results page showing comprehensive comparison between two waterfall variants.

**Page Header:**
- Back link: "← Weather Plus - Rewarded Video - US Tier 1"
- Title: "A/B Test: Waterfall Optimization Test #3"
- Status badge: "In Progress" (purple) or "Completed" (green) or "Cancelled" (gray)

**Winner Recommendation Banner (show only when test completed with winner):**

Card with green left border (4px):
- Large "B" circle icon (green background, white text) on left
- Title: "Variant B will most likely increase future earnings" (green text, font-semibold)
- Subtitle: "99% (estimated) chance that B will perform better than A"
- Action buttons: "Apply Variant B" (primary, green), "Keep Variant A" (link style)
- Right side info:
  - Traffic allocation: "50%"
  - Status: "Completed"
  - Date range: "October 9, 2025 - January 7, 2026"
  - "View report" link with external icon

**Test Info Cards Row (4 cards, equal width):**

Card 1 - Duration:
- Label: "Duration"
- Value: "90 days" (large)
- Subtext: "Oct 9 - Jan 7"

Card 2 - Traffic Split:
- Label: "Traffic Split"
- Value: "50% / 50%" (large)
- Subtext: "A: 1.2M B: 1.2M"

Card 3 - Total Impressions:
- Label: "Total Impressions"
- Value: "2.4M" (large)

Card 4 - Confidence:
- Label: "Confidence"
- Value: "99%" (large)
- Subtext: "Very High"

---

**Section 1: Performance Comparison Chart**

**Tab Navigation (within section):**
Summary (active) | Scaled Revenue | eCPM | Match Rate | Scaled Impressions

**Chart Area:**
- Chart type: Grouped bar chart
- X-axis labels: Scaled Revenue, Scaled Impressions, Match Rate, eCPM
- Y-axis: Percentage scale (0 to 120+)
- Bar colors: Variant A = teal-500, Variant B = purple-500
- Legend at bottom

---

**Section 2: Metrics Comparison Table**

Table with columns: Variants | Scaled Monthly Earnings | Est. Earnings | eCPM ($ USD) | Match Rate

Row 1 - Variant A:
- Color indicator: teal square
- Name: "Variant A" with "Original" subtitle
- Values: $859 | $1.39K | $56.40 | 99.12%

Row 2 - Variant B:
- Color indicator: purple square
- Name: "Variant B"
- Values with improvements: $954 (+11.1%) | $1.54K (+10.8%) | $63.08 (+11.8%) | 99.03%
- Winning cells highlighted

---

**Section 3: Configuration Differences Summary**

Card showing what was different between variants:
- Title: "Configuration Differences"
- Content:
  - "Variant B had the following changes from Variant A:"
  - Bullet list:
    - "5 eCPM floors increased"
    - "1 source added: Inter200.00 at $200.00 floor"
    - "1 source removed: Inter30.43"
  - Link: "View full side-by-side comparison" (expands Section 4)

---

**Section 4: Side-by-Side Waterfall Configuration (Collapsible)**

Same layout as Mediation Group Detail but READ-ONLY for both columns:

COLUMN A - Variant A (teal header):
- Shows the original waterfall at time of test start
- All fields read-only

COLUMN B - Variant B (purple header):
- Shows the optimized waterfall that was tested
- All fields read-only
- Changed/Added/Removed indicators same as before

---

**Section 5: Actions (Sticky Bottom Bar)**

For Running Tests:
- Left text: "Test running: Day 5 of 14"
- Right buttons: "Stop Test Early" (secondary, destructive), "Extend Duration" (secondary)

For Completed Tests:
- Left text: "Recommended: Apply Variant B"
- Right buttons: "Keep Variant A" (secondary), "Apply Variant B" (primary, green)
```

---

## PROMPT 8: Create A/B Test Modal (NEW)

```
Design a modal dialog for setting up a new A/B test for waterfall optimization.

**Trigger:** Click "Run A/B Test" button from Mediation Group Detail page

**Modal Properties:**
- Size: Medium (max-w-2xl, approximately 672px width)
- Overlay: Dark semi-transparent backdrop

**Modal Header:**
- Title: "Create A/B Test"
- Subtitle: "Test your optimized waterfall configuration"
- Close button (X) on top-right

**Modal Body:**

**Field 1: Test Name**
- Label: "Test Name"
- Input field with default value: "Waterfall Optimization Test #3"
- Full width input

**Divider**

**Field 2: Variants Summary**
- Label: "Variants"

Variant A Card:
- Left border: teal-500 (4px)
- Title: "Variant A (Control)" with teal indicator
- Description: "Current waterfall configuration"
- Details: "5 waterfall sources • Est. $859/month"

Variant B Card:
- Left border: purple-500 (4px)
- Title: "Variant B (Treatment)" with purple indicator
- Description: "Your optimized waterfall configuration"
- Details showing dynamic summary:
  - "6 waterfall sources • Est. $954/month (+11.1%)"
  - Changes summary: "5 floors modified, 1 added, 1 removed"
- Link: "View full comparison" (expands to show side-by-side preview)

**Divider**

**Field 3: Traffic Allocation**
- Label: "Traffic Allocation"
- Helper text: "How much traffic should each variant receive?"

Radio group options:
1. "50% / 50% (Recommended)" - highlighted with blue-50 background
   - Helper: "Equal split for fastest statistical significance"
2. "70% / 30%"
   - Helper: "More traffic to control, safer approach"
3. "90% / 10%"
   - Helper: "Minimal exposure to new variant"

**Divider**

**Field 4: Test Duration**
- Label: "Test Duration"
- Helper text: "How long should the test run?"

Radio group options:
1. "7 days - Quick validation"
2. "14 days - Recommended for reliable results" (pre-selected, blue-50 background)
3. "30 days - Extended testing period"
4. "Custom:" with inline number input and "days" label

Calculated text below: "Estimated completion: January 24, 2026"

**Divider**

**Warning Section:**
- Icon: warning triangle (⚠️)
- Title: "Important Notes:"
- Bullet list:
  - "The test will be created in AdMob via API"
  - "Your optimized configuration (Variant B) will be applied to the test group"
  - "You can stop the test early at any time"
  - "Results will be available in real-time"

**Modal Footer:**
- "Cancel" button (secondary)
- "Create & Start Test" button (primary)

---

**Loading State:**
- Title: "Creating A/B Test..."
- Progress list with status icons
- Footer: "Please wait, this may take a few moments."

**Success State:**
- Icon: Large green checkmark
- Title: "A/B Test Created Successfully!"
- Description: "Your test is now running in AdMob."
- Buttons: "View Test Details" (secondary), "Done" (primary)
```

---

## PROMPT 9: Apply Variant Confirmation Modal (UPDATED)

```
Design a confirmation modal for applying waterfall changes (direct apply or after A/B test winner).

**Trigger:** Click "Apply Direct" or "Apply Variant B" button

**Modal Properties:**
- Size: Medium (max-w-lg, approximately 512px width)
- Overlay: Dark semi-transparent backdrop

**Modal Header:**
- Title: "Apply Optimized Waterfall?"
- Close button (X) on top-right

**Modal Body:**

**Introduction text:**
"You are about to apply the following changes to AdMob:"

**Changes Summary Card:**
- Background: slate-50
- Title: "Changes Summary"
- Dynamic content based on actual changes:

If eCPM floors modified:
- "X eCPM floors will be updated:"
- Indented list showing each change:
  - "Inter81.15: $81.15 → $191.42"
  - "Inter65.93: $65.93 → $153.14"
  - (etc.)

If sources added:
- "X sources will be added:"
- Indented list:
  - "Inter200.00 at $200.00 floor"

If sources removed:
- "X sources will be removed:"
- Indented list:
  - "Inter30.43 ($30.43 floor)"

**Impact Summary:**
- "Net change: X sources (was Y, will be Z)"
- "Estimated monthly impact: +$XX (+XX%)"

**Warning Section:**
- Icon: warning triangle (⚠️)
- Title: "This action will:"
- Bullet list:
  - "Update your AdMob mediation group immediately"
  - "Affect 100% of traffic for this ad unit"
  - "Changes will take effect within minutes"

**Additional Note (if A/B test running):**
- Yellow background box
- Text: "An A/B test is currently running. Applying these changes will stop the test."

**Modal Footer:**
- "Cancel" button (secondary)
- "Apply Changes" button (primary, blue)

---

**Loading State:**

Shows progress for each change type:
- "Applying Changes to AdMob..."
- Progress section for eCPM updates:
  - Checkmark + "Updated 3 of 5 eCPM floors"
- Progress section for additions:
  - Spinner + "Adding Inter200.00..."
- Progress section for removals:
  - Pending + "Removing Inter30.43..."
- Warning: "Please wait, do not close this window."

**Success State:**
- Icon: Large green checkmark
- Title: "Changes Applied Successfully!"
- Summary: "Applied X updates, added Y sources, removed Z sources"
- Subtext: "Changes will take effect within a few minutes."
- Button: "Done" (primary)

**Partial Success State:**
- Icon: Yellow warning
- Title: "Partially Applied"
- Description: "Some changes could not be applied:"
- List of failed items with error reasons
- Buttons: "Retry Failed" (secondary), "Close" (primary)

**Error State:**
- Icon: Large red X
- Title: "Failed to Apply Changes"
- Error details in red box
- Buttons: "Try Again" (primary), "Close" (secondary)
```

---

## PROMPT 4 (MINOR UPDATE): Mediation Groups List

```
Update the existing Mediation Groups List table to include A/B Test status column.

**New Column: "A/B Test"**

Position: After "Status" column, before "eCPM (7D)" column

**Column Content Options:**

If A/B test running:
- Badge: "🧪 Running" with purple background
- Subtext: "Day 5/14" in smaller text below

If test completed (pending action):
- Badge: "✅ Completed" with green background
- Small dot indicator if action needed

If has pending optimization (not yet applied or tested):
- Badge: "💡 Ready" with blue background
- Tooltip: "Optimization available"

If no test and no optimization:
- Display: "-" or leave empty

**Updated Table Column Order:**
Checkbox | Group Name | App | Format | Ad Sources | Targeting | Status | A/B Test | eCPM (7D) | Last Modified | Actions

**Filter Addition:**
Add new filter dropdown: "A/B Test Status"
Options: All, Running, Completed, Ready, No Test
```

---

## Summary: Complete User Flow

```
1. USER ENTERS MEDIATION GROUP DETAIL
   ↓
2. SEES OPTIMIZATION BANNER
   "Optimization Available - could increase eCPM by ~12%"
   ↓
3. REVIEWS SIDE-BY-SIDE COMPARISON
   Left: Current (read-only) | Right: Optimized (editable)
   ↓
4. OPTIONALLY MODIFIES OPTIMIZED VERSION
   - Edit eCPM floors inline
   - Add new sources via modal
   - Remove sources (mark for deletion)
   - Reorder via drag-drop
   ↓
5. CHANGES SUMMARY UPDATES IN REAL-TIME
   "5 floors modified, 1 added, 1 removed"
   "Estimated impact: +$95/month"
   ↓
6. CHOOSES ACTION:
   
   Option A: APPLY DIRECT
   → Confirmation modal shows all changes
   → Loading state with progress
   → Success: Changes live in AdMob
   
   Option B: RUN A/B TEST
   → Setup modal (name, traffic split, duration)
   → Creates test in AdMob
   → Redirects to A/B Test Detail page
   → After 7-14 days: Results available
   → Apply winner or keep original
```

---

## Thứ tự ưu tiên Implementation

| Priority | Màn hình | Complexity | Notes |
|----------|----------|------------|-------|
| P0 | Mediation Group Detail (with editable optimization) | Very High | Core feature |
| P0 | Add Ad Source Modal | Medium | Needed for adding sources |
| P0 | A/B Test Detail Page | High | Results page |
| P0 | Create A/B Test Modal | Medium | Setup wizard |
| P1 | Apply Variant Modal | Medium | Confirmation with dynamic changes |
| P1 | Mediation Groups List (updated) | Low | Add column |
