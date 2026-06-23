# Mediation Pro - UI Design Prompts (v2 - Updated)

## Các màn hình cần thay đổi / thêm mới

Dựa trên yêu cầu:
1. **Waterfall Optimization**: Side-by-side view (Current vs Optimized) với khả năng Apply Direct hoặc A/B Test
2. **A/B Testing**: Setup, monitor và apply kết quả test

### Danh sách thay đổi:

| # | Màn hình | Status | Mô tả |
|---|----------|--------|-------|
| 1 | Mediation Group Detail | **UPDATED** | Thêm tab "Waterfall & Optimization" với side-by-side view |
| 2 | A/B Test Detail | **NEW** | Trang chi tiết kết quả A/B test |
| 3 | Create A/B Test Modal | **NEW** | Modal wizard setup A/B test |
| 4 | Apply Variant Modal | **NEW** | Modal xác nhận apply changes |
| 5 | Mediation Groups List | **MINOR UPDATE** | Thêm column A/B Test status |

### Color Reference (AdMob Style)

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Variant A (Current/Control) | Teal/Cyan | bg-teal-500, text-teal-600, border-teal-500 |
| Variant B (Optimized/Treatment) | Purple/Violet | bg-purple-500, text-purple-600, border-purple-500 |
| Winner indicator | Green | bg-green-500, text-green-600 |
| In Progress | Purple | bg-purple-100, text-purple-700 |
| Completed | Green | bg-green-100, text-green-700 |
| Changed values | Amber | bg-amber-100, text-amber-700 |

---

## PROMPT 5: Mediation Group Detail (UPDATED)

```
Design a comprehensive Mediation Group Detail page with waterfall optimization and A/B testing capabilities.

**Context:** This is the core page for ad mediation optimization. Users can view current waterfall configuration, see AI-optimized suggestions, and either apply changes directly or run A/B tests to validate improvements.

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

Note: "Waterfall & Optimization" should be visually prominent as the primary tab

---

**TAB: Overview**
(Keep same as v1 - basic info, targeting, performance summary cards)

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

---

**Section 2: Side-by-Side Waterfall Comparison**

**Header Row:**
- Title: "Waterfall Configuration"
- Controls: View dropdown (Side by Side), Show dropdown (All Sources), Expand All button, Collapse All button

**Two-Column Layout (50% each):**

LEFT COLUMN - Current Setup:
- Header bar: teal-500 background color (like AdMob Variant A)
- Title: "CURRENT SETUP"
- Subtitle: "Variant A • Active"
- Estimated Monthly: "$859"

RIGHT COLUMN - Optimized Suggested:
- Header bar: purple-500 background color (like AdMob Variant B)
- Title: "OPTIMIZED (Suggested)"
- Subtitle: "Variant B • Suggested"
- Estimated Monthly: "$954 (+11.1%)" with green text for improvement

**Content for EACH column:**

Bidding Section:
- Collapsible header: "Bidding (2 sources)" with chevron
- Card for each source showing:
  - Status icon (checkmark if active)
  - Network name (e.g., "AdMob Network")
  - Floor info: "No floor • Active"
  - Performance: "7D: $8.50 eCPM"

Waterfall Section:
- Collapsible header: "Waterfall (5 sources)" with chevron
- Numbered list of sources, each showing:
  - Position number (1, 2, 3...)
  - Source name (e.g., "Inter81.15")
  - eCPM Floor value (e.g., "$81.15")
  - Actual eCPM (e.g., "eCPM: $85.20")

**Visual Indicators for Changes (RIGHT column only):**
- Changed items: amber-100 background + "CHANGED" badge (amber)
- New items: green-100 background + "NEW" badge (green)
- Removed items: red-100 background + strikethrough text

**Footer for each column:**
- Left column: "Edit Current..." link
- Right column: "Apply Direct" button (secondary), "Run A/B Test" button (primary)

---

**Section 3: Difference Summary Card**

Card showing summary of changes:
- Title: "Changes Summary" with chart icon
- Bullet list:
  - "5 eCPM floors increased (avg +$52.40)"
  - "0 sources added"
  - "0 sources removed"
  - "Estimated impact: +$95/month (+11.1%)"
- Confidence Score: Progress bar at 87% with label "Based on 14 days data"

---

**Section 4: Sticky Bottom Action Bar**

When scrolling, show fixed bottom bar:
- Right side: "Apply Direct" button (secondary), "Run A/B Test" button (primary)

---

**TAB: A/B Tests**

**Header:**
- Title: "A/B Tests"
- "Create New Test" button (primary) - disabled with tooltip if test already running

**Test Cards List (vertical stack):**

Each test as a Card component:

CARD - In Progress Test:
- Left icon: flask (🧪)
- Title: "Waterfall Optimization Test #3"
- Status badge: "In Progress" (purple background)
- Info line: "Started: Jan 10, 2026 • Duration: 14 days • Traffic: 50/50"
- Progress: "Day 5 of 14" with progress bar (35%)
- Early Results section:
  - "Variant A (Current): $56.40 eCPM"
  - "Variant B (Optimized): $61.08 eCPM"
  - "Variant B leading by +8.3% 📈" (green text)
- Action: "View Details →" link

CARD - Completed Test:
- Left icon: checkmark (✅)
- Title: "Waterfall Optimization Test #2"
- Status badge: "Completed" (green background)
- Info line: "Oct 9, 2025 - Jan 7, 2026 • Traffic: 50/50"
- Result: "Variant B won with 99% confidence"
- Metrics: "Variant A: $56.40 eCPM • Variant B: $63.08 eCPM (+11.8%)"
- Action taken: "Applied Variant B on Jan 8, 2026"
- Action: "View Details →" link

CARD - Cancelled Test:
- Left icon: X circle (❌)
- Title: "Waterfall Optimization Test #1"
- Status badge: "Cancelled" (gray background)
- Info line: "Sep 1, 2025 - Sep 8, 2025 (stopped early) • Traffic: 50/50"
- Reason: "Manual cancellation by John Doe"
- Action: "View Details →" link

**Empty State:**
- Illustration: flask icon large
- Title: "No A/B Tests Yet"
- Description: "Run an A/B test to validate waterfall optimizations before applying them to your production traffic."
- Button: "Create First A/B Test" (primary)
```

---

## PROMPT 6: A/B Test Detail Page (NEW)

```
Design a detailed A/B Test results page showing comprehensive comparison between two waterfall variants. Reference AdMob's A/B test interface for visual style.

**Context:** This page shows after an A/B test is running or completed. It displays performance comparison between Variant A (Current) and Variant B (Optimized) with charts, metrics table, and waterfall configuration side-by-side.

**Page Header:**
- Back link: "← Weather Plus - Rewarded Video - US Tier 1" (link to parent mediation group)
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
- Legend at bottom: "Variant A (Current)" with teal square, "Variant B (Optimized)" with purple square
- Hover tooltip showing exact values

---

**Section 2: Metrics Comparison Table**

Table with columns: Variants | Scaled Monthly Earnings | Est. Earnings | eCPM ($ USD) | Match Rate

Row 1 - Variant A:
- Color indicator: teal square
- Name: "Variant A" with "Original" subtitle below
- Values: $859 | $1.39K | $56.40 | 99.12%
- Expandable chevron on right

Row 2 - Variant B:
- Color indicator: purple square
- Name: "Variant B"
- Values: $954 (+11.1% in green) | $1.54K (+10.8%) | $63.08 (+11.8%) | 99.03%
- Winning cells: subtle green background
- Expandable chevron on right

---

**Section 3: Side-by-Side Waterfall Configuration**

**Two Column Layout (50% each):**

COLUMN HEADER - Variant A:
- Background: teal-500
- Title: "Variant A (50%)"
- Subtitle: "Current • Original"

COLUMN HEADER - Variant B:
- Background: purple-500
- Title: "Variant B (50%)"
- Subtitle: "Optimized • Testing"

**Bidding Section (in each column):**

Section header: "Bidding" with help icon
- "Add ad source" link, "Change status" dropdown
- Tabs: "Bidding eCPM floor" (active), "Ad unit setting applied"

Table columns: Status | Ad source | Ad unit mapping | Partnership status

Rows:
1. Checkmark | "AdMob Network" with "PopupNativePage13..." subtext | "Not required" | "Active"
2. Checkmark | "Pangle" with "PopupNativePage13..." subtext | "View" link | "Active"

Pagination: "Show rows: 15" dropdown, "1-2 of 2" text, navigation arrows

**Waterfall Section (in each column):**

Section header: "Waterfall" with help icon
- "Add ad source" link, "Add custom event" link, "Change status" dropdown

Table columns: Status | Ad source | Order (by eCPM) | Ad unit mapping | Optimization status

Variant A rows:
1. Checkmark | "Inter81.15" | $81.15 | View | Not supported
2. Checkmark | "Inter65.93" | $65.93 | View | Not supported
3. Checkmark | "Inter50.72" | $50.72 | View | Not supported
4. Checkmark | "Inter40.57" | $40.57 | View | Not supported
5. Checkmark | "Inter30.43" | $30.43 | View | Not supported

Variant B rows (with changes highlighted):
1. Checkmark | "Inter191.42" | $191.42 | View | "Incomplete" (orange text) | Not supported
2. Checkmark | "Inter153.14" | $153.14 | View | "Incomplete" (orange text) | Not supported
3. Checkmark | "Inter122.5" | $122.50 | View | "Incomplete" (orange text) | Not supported
4. Checkmark | "Inter85.75" | $85.75 | View | "Incomplete" (orange text) | Not supported
5. Checkmark | "Inter47.16" | $47.16 | View | "Incomplete" (orange text) | Not supported

Pagination: "Show rows: 50" dropdown, "1-5 of 5" text, navigation arrows

---

**Section 4: Actions (Sticky Bottom Bar)**

For Running Tests:
- Left text: "Test running: Day 5 of 14"
- Right buttons: "Stop Test Early" (secondary, destructive), "Extend Duration" (secondary)

For Completed Tests:
- Left text: "Recommended: Apply Variant B"
- Right buttons: "Keep Variant A" (secondary), "Apply Variant B" (primary, green)
```

---

## PROMPT 7: Create A/B Test Modal (NEW)

```
Design a modal dialog for setting up a new A/B test for waterfall optimization.

**Trigger:** Click "Run A/B Test" button from Mediation Group Detail page

**Modal Properties:**
- Size: Medium (max-w-2xl, approximately 672px width)
- Overlay: Dark semi-transparent backdrop
- Close: X button on top-right, click outside to close

**Modal Header:**
- Title: "Create A/B Test"
- Subtitle: "Test your optimized waterfall configuration"

**Modal Body:**

**Field 1: Test Name**
- Label: "Test Name"
- Input field with default value: "Waterfall Optimization Test #3"
- Full width input

**Divider line**

**Field 2: Variants (read-only display)**
- Label: "Variants"

Variant A Card:
- Left border: teal-500 (4px)
- Title: "Variant A (Control)" with teal square indicator
- Description: "Current waterfall configuration"
- Details: "5 waterfall sources • Est. $859/month"

Variant B Card:
- Left border: purple-500 (4px)
- Title: "Variant B (Treatment)" with purple square indicator
- Description: "Optimized waterfall configuration"
- Details: "5 waterfall sources • Est. $954/month (+11.1%)"
- Link: "View differences" (opens comparison view)

**Divider line**

**Field 3: Traffic Allocation**
- Label: "Traffic Allocation"
- Helper text: "How much traffic should each variant receive?"

Radio group options:
1. "50% / 50% (Recommended)" - with blue-50 background to highlight
   - Helper: "Equal split for fastest statistical significance"
2. "70% / 30%"
   - Helper: "More traffic to control, safer approach"
3. "90% / 10%"
   - Helper: "Minimal exposure to new variant"

**Divider line**

**Field 4: Test Duration**
- Label: "Test Duration"
- Helper text: "How long should the test run?"

Radio group options:
1. "7 days - Quick validation"
2. "14 days - Recommended for reliable results" (pre-selected, blue-50 background)
3. "30 days - Extended testing period"
4. "Custom:" with inline number input and "days" label

Calculated text below: "Estimated completion: January 24, 2026"

**Divider line**

**Warning Section:**
- Icon: warning triangle (⚠️)
- Title: "Important Notes:" (font-semibold)
- Bullet list:
  - "The test will be created in AdMob via API"
  - "You can stop the test early at any time"
  - "Results will be available in real-time"

**Modal Footer:**
- Left side: empty
- Right side: "Cancel" button (secondary), "Create & Start Test" button (primary)

---

**Loading State (after clicking Create):**

Replace modal body with:
- Title: "Creating A/B Test..."
- Progress list:
  - Spinner + "Setting up test in AdMob..."
  - Checkmark + "Variant A configured"
  - Spinner + "Configuring Variant B..."
  - Circle (pending) + "Starting traffic split"
- Footer text: "Please wait, this may take a few moments."
- No buttons during loading

**Success State:**

Replace modal body with:
- Icon: Large green checkmark
- Title: "A/B Test Created Successfully!"
- Description: "Your test is now running in AdMob."
- Subtext: "You'll be notified when results are statistically significant."
- Buttons: "View Test Details" (secondary), "Done" (primary)

**Error State:**

Replace modal body with:
- Icon: Large red X
- Title: "Failed to Create A/B Test"
- Description: "There was an error communicating with AdMob API."
- Error message in red box: specific error text
- Buttons: "Try Again" (primary), "Close" (secondary)
```

---

## PROMPT 8: Apply Variant Confirmation Modal (NEW)

```
Design a confirmation modal for applying a variant (direct apply or after A/B test winner).

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
- Content (bullet list):
  - "5 eCPM floors will be updated:"
    - Sub-list with each change:
    - "Inter81.15: $81.15 → $191.42"
    - "Inter65.93: $65.93 → $153.14"
    - "Inter50.72: $50.72 → $122.50"
    - "Inter40.57: $40.57 → $85.75"
    - "Inter30.43: $30.43 → $47.16"
  - "0 sources will be added"
  - "0 sources will be removed"

**Warning Section:**
- Icon: warning triangle (⚠️)
- Title: "This action will:"
- Bullet list:
  - "Update your AdMob mediation group immediately"
  - "Affect 100% of traffic for this ad unit"
  - "Changes will take effect within minutes"

**Additional Note (if A/B test running):**
- Yellow background box
- Text: "An A/B test is currently running. Applying these changes will stop the test and apply this variant."

**Modal Footer:**
- "Cancel" button (secondary)
- "Apply Changes" button (primary, blue)

---

**Loading State:**

Replace body with:
- Title: "Applying Changes to AdMob..."
- Progress list showing each source being updated:
  - Spinner + "Updating eCPM floors..."
  - Checkmark + "Inter81.15 updated"
  - Checkmark + "Inter65.93 updated"
  - Spinner + "Inter50.72 updating..."
  - Circle (pending) + "Inter40.57 pending"
  - Circle (pending) + "Inter30.43 pending"
- Warning text: "Please wait, do not close this window."
- No buttons during loading

**Success State:**

Replace body with:
- Icon: Large green checkmark
- Title: "Changes Applied Successfully!"
- Description: "Your waterfall has been updated in AdMob."
- Subtext: "Changes will take effect within a few minutes."
- Info: "Next sync scheduled: 5 minutes"
- Single button: "Done" (primary)

**Error State:**

Replace body with:
- Icon: Large red X
- Title: "Failed to Apply Changes"
- Description: "There was an error updating AdMob:"
- Error box (red border): "API rate limit exceeded. Please try again in 5 minutes."
- Partial success note: "3 of 5 changes were applied successfully."
- Buttons: "View Details" (secondary), "Retry" (secondary), "Close" (primary)
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
- Small indicator dot if action needed

If no test:
- Display: "-" or leave empty

**Updated Table Column Order:**
Checkbox | Group Name | App | Format | Ad Sources | Targeting | Status | A/B Test | eCPM (7D) | Last Modified | Actions

**Filter Addition:**

Add new filter dropdown in the filter bar:
- Label: "A/B Test"
- Options:
  - "All" (default)
  - "Running" with count badge
  - "Completed" with count badge
  - "No Test"

**Row Click Behavior:**
- Clicking "Running" or "Completed" badge navigates directly to A/B Test Detail page
- Clicking other parts of row navigates to Mediation Group Detail page

**Sort Enhancement:**
Add sort option for A/B Test column:
- Running tests first
- Then completed tests (needs action)
- Then no test
```

---

## Summary: User Flow Diagram

```
MEDIATION PRO - OPTIMIZATION FLOW

1. Mediation Groups List
   - Shows list with new "A/B Test" status column
   - Click row → Mediation Group Detail

2. Mediation Group Detail
   - Tab: "Waterfall & Optimization" (primary)
     - Banner shows optimization status
     - Side-by-side: Current vs Optimized waterfall
     - Actions: "Apply Direct" or "Run A/B Test"
   
   - Tab: "A/B Tests"
     - List of all tests for this group
     - Click test → A/B Test Detail page

3. Apply Direct Flow:
   Group Detail → Click "Apply Direct" → Apply Confirmation Modal → Loading → Success → Done

4. A/B Test Flow:
   Group Detail → Click "Run A/B Test" → Create A/B Test Modal → Loading → Success
   → Test runs for 7-14 days
   → A/B Test Detail page shows results
   → Click "Apply Winner" → Apply Confirmation Modal → Done
```

---

## Thứ tự ưu tiên Implementation

| Priority | Màn hình | Complexity | Notes |
|----------|----------|------------|-------|
| P0 | Mediation Group Detail (updated) | Very High | Core feature - side-by-side waterfall |
| P0 | A/B Test Detail Page | High | Full results page with charts |
| P0 | Create A/B Test Modal | Medium | Setup wizard |
| P1 | Apply Variant Modal | Low | Confirmation with loading states |
| P1 | Mediation Groups List (updated) | Low | Add A/B Test column |
