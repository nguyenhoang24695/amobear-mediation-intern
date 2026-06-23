# V0 PROMPTS - WATERFALL OPTIMIZER UI

## Hướng dẫn sử dụng

Các prompts dưới đây được thiết kế để paste vào **v0.dev** để generate UI components cho Waterfall Optimizer module. Mỗi prompt tạo 1 component riêng biệt. Sau khi generate, có thể combine hoặc customize thêm.

**Tech Stack:** React + TypeScript + TailwindCSS + shadcn/ui

---

## PROMPT 1: Filter Panel

```
Create a filter panel component for an Ad Mediation Waterfall Optimizer tool.

Requirements:
- Modern card design with subtle shadow and rounded corners
- Contains 5 filter inputs arranged vertically:
  1. "Select App" - Searchable dropdown with app icons (placeholder: "GPS Map Camera", "Email Pro", "Video Player")
  2. "Select Platform" - Toggle button group: "Android" | "iOS" (with platform icons)
  3. "Select Mediation Group" - Dropdown (disabled until app+platform selected, placeholder options: "interstitial_tier1", "rewarded_us", "banner_all")
  4. "Minimum Match Rate" - Number input with % suffix, default value 3, range 1-20
  5. "Minimum SoW" - Number input with % suffix, default value 0.9, range 0.1-5

- Below inputs: Primary "Analyze" button (blue, full width) with loading state
- Above inputs: Title "Waterfall Optimizer" with subtitle "Analyze and optimize your ad waterfall configuration"
- Include info tooltips (?) next to "Minimum Match Rate" and "Minimum SoW" explaining what they mean
- Use shadcn/ui components (Select, Input, Button, Tooltip)
- Show validation states (error borders, helper text)
- Responsive: Stack on mobile, side-by-side labels on desktop

Style: Clean, professional, data-tool aesthetic. Color accent: Blue (#3B82F6)
```

---

## PROMPT 2: Summary Cards

```
Create a summary statistics cards row for an Ad Mediation analytics dashboard.

Requirements:
- 4 cards in a row (responsive: 2x2 on tablet, 1x4 on mobile)
- Each card contains:
  - Small icon (top left)
  - Metric value (large, bold)
  - Metric label (small, muted)
  - Trend indicator (optional: up/down arrow with percentage)

Card data:
1. "Total Revenue" - Icon: DollarSign - Value: "$3,544.96" - Trend: "+12.5%"
2. "Impressions" - Icon: Eye - Value: "272,515" - Trend: "+8.2%"  
3. "Avg Match Rate" - Icon: Target - Value: "42.0%" - Trend: "-2.1%"
4. "Instances" - Icon: Layers - Value: "8" - No trend

- Cards should have subtle borders, white background
- Positive trends: green text with up arrow
- Negative trends: red text with down arrow
- Use Lucide icons
- Add subtle hover effect (slight lift shadow)

Style: Dashboard-style metrics cards. Compact but readable.
```

---

## PROMPT 3: Recommendation Card

```
Create a recommendation card component for an Ad Mediation Waterfall Optimizer.

Requirements:
- Card displays one recommendation for optimizing an ad waterfall instance
- Layout structure:
  - Header row: 
    - Left: Ad source name (bold) + Instance identifier (badge/chip)
    - Right: Priority badge (High=red, Medium=yellow, Low=green)
  
  - Metrics row (4 columns):
    - SoW: "44.7%" with label
    - Match Rate: "15.3%" with label
    - eCPM: "$34.55" with label
    - Revenue: "$1,585" with label
  
  - Action section:
    - Icon indicating action type (Plus for Add, TrendingUp for Increase, Trash for Remove, Check for Keep)
    - Action text: "Add a new floor 40% higher than current eCPM"
    - Recommended value badge: "$48.37" (highlighted)
  
  - Footer: Two buttons - "Approve" (primary) and "Reject" (outline/ghost)

- Card should be expandable to show more details (collapsible section)
- Different visual treatment based on priority:
  - High: Red left border accent
  - Medium: Yellow left border accent
  - Low: Blue left border accent

Style: Clean, actionable cards. Easy to scan multiple cards quickly.
```

---

## PROMPT 4: Recommendations List with Grouping

```
Create a recommendations list component that groups recommendations by action type.

Requirements:
- Collapsible sections for each group:
  1. "🔴 High Priority - Action Required" (count badge)
  2. "📈 Increase Floor" (count badge)  
  3. "✅ Keep As Is" (count badge)
  4. "⚪ Excluded (Bidding Sources)" (count badge, collapsed by default)

- Each section header:
  - Left: Icon + Title + Count badge
  - Right: Expand/Collapse chevron

- Inside each section: List of recommendation cards (use component from Prompt 3)

- Top bar:
  - Left: "X recommendations" text
  - Right: "Apply All Approved" button (disabled if none approved)
  
- Empty state: Friendly illustration with text "No recommendations match your current settings. Try adjusting the filters."

- Filter/sort options:
  - Sort by: Priority | Revenue Impact | SoW
  - Filter quick toggles: Show High Priority Only

Style: Organized, scannable list. Clear visual hierarchy between groups.
```

---

## PROMPT 5: Waterfall Visualization (Before/After)

```
Create a waterfall comparison visualization showing current vs recommended state.

Requirements:
- Two-column layout: "Current Waterfall" | "Recommended Waterfall"
- Each waterfall is a vertical stack of floor cards, sorted by floor price DESC
- Each floor card shows:
  - Floor price (large): "$31.67"
  - SoW percentage (small): "44.7%"
  - Visual bar representing SoW (filled portion)

- Visual indicators:
  - NEW floors: Green dashed border + "NEW" badge
  - REMOVED floors: Red strikethrough + faded opacity
  - CHANGED floors: Yellow highlight + arrow showing old→new value
  - KEPT floors: Normal style

- Connecting lines between Current and Recommended showing what maps to what

- At bottom of Recommended: Summary text "Net change: +1 floor, -1 floor removed"

- Animation: Smooth transition when toggling between views

Layout options:
- Desktop: Side by side
- Mobile: Stacked with tabs "Current" | "Recommended"

Style: Clean visualization, easy to understand the changes at a glance.
```

---

## PROMPT 6: Full Page Layout

```
Create a full page layout for a Waterfall Optimizer tool combining all components.

Requirements:
- Page structure:
  1. Header: "Waterfall Optimizer" title + Breadcrumb (Home > Mediation > Waterfall Optimizer)
  
  2. Two-column layout (desktop):
     - Left sidebar (300px fixed): Filter Panel
     - Main content: Results area
  
  3. Main content area:
     - Loading state: Skeleton loaders
     - Empty state (before analysis): Illustration + "Select filters and click Analyze"
     - Results state:
       a. Summary Cards row
       b. Two-column below:
          - Left (60%): Recommendations List
          - Right (40%): Waterfall Visualization
  
  4. Sticky action bar at bottom:
     - Shows when recommendations are selected
     - "X selected" count
     - "Approve Selected" and "Reject Selected" buttons

- Mobile layout:
  - Filter panel in collapsible sheet (bottom sheet or slide-out)
  - Full width content
  - Tab navigation: "Recommendations" | "Waterfall View"

- Dark mode support

Style: Professional analytics tool. Similar to Google Ads or Facebook Ads Manager.
```

---

## PROMPT 7: Confirmation Modal

```
Create a confirmation modal for applying waterfall recommendations.

Requirements:
- Modal dialog (centered, with backdrop)
- Content:
  - Icon: Warning or Info icon
  - Title: "Apply Recommendations"
  - Description: "You are about to apply X recommendations to AdMob. This will update floor prices for the following mediation group:"
  
  - Summary box:
    - App: "GPS Map Camera"
    - Platform: "Android"  
    - Mediation Group: "interstitial_tier1"
  
  - Changes list:
    - "Add new floor: $48.37"
    - "Remove instance: $5.00"
    - "Update floor: $15.00 → $18.00"
  
  - Checkbox: "I understand these changes will be applied to AdMob immediately"

- Footer buttons:
  - "Cancel" (ghost)
  - "Apply Changes" (primary, disabled until checkbox checked)

- Loading state for Apply button
- Success state: Green checkmark animation + "Changes applied successfully"
- Error state: Red alert with retry option

Style: Clear, safe confirmation UX. No accidental applies.
```

---

## PROMPT 8: Mobile Filter Sheet

```
Create a mobile-friendly bottom sheet filter panel.

Requirements:
- Bottom sheet that slides up from bottom of screen
- Header:
  - Title: "Filters"
  - Close X button
  - "Reset" text button

- Content: Same filters as Prompt 1 but styled for mobile
  - Full width dropdowns
  - Larger touch targets
  - Number inputs with +/- stepper buttons

- Footer:
  - "Apply Filters" primary button (full width)
  - Shows count: "3 filters applied"

- Sheet behaviors:
  - Partial open: Shows only header (peek)
  - Full open: All filters visible
  - Swipe down to close
  - Backdrop click to close

- Maintains filter state even when closed

Style: Native mobile feel, smooth animations, easy to use with one hand.
```

---

## TIPS FOR USING THESE PROMPTS

1. **Start with Prompt 6** (Full Page Layout) để có structure tổng thể
2. **Refine individual components** bằng Prompts 1-5, 7-8
3. **Combine** các components vào layout
4. **Customize** colors, spacing theo brand guidelines
5. **Add data fetching** hooks sau khi có UI

**Recommended order:**
1. Prompt 1 (Filter Panel) - Core interaction
2. Prompt 3 (Recommendation Card) - Core component
3. Prompt 4 (Recommendations List) - Groups cards
4. Prompt 2 (Summary Cards) - Overview
5. Prompt 5 (Waterfall Viz) - Visual comparison
6. Prompt 6 (Full Layout) - Assembly
7. Prompt 7, 8 (Modals) - Polish

---

**END OF PROMPTS**
