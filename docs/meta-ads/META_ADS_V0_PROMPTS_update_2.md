You are refining an already-generated UI for "Create Meta Campaign Request" inside the existing Mediation Pro dashboard.

IMPORTANT:
- Do NOT redesign the page from scratch.
- Do NOT change the global layout, sidebar, or page structure.
- Do NOT replace the two-column layout.
- This is a refinement pass to improve business correctness and Meta API alignment.

Your goal:
Upgrade the existing UI to be production-ready and aligned with Meta Marketing API constraints.

-----------------------------------
1. Budget Logic (Critical Fix)
-----------------------------------

Improve the Campaign vs Ad Set budget logic:

- Introduce a clear toggle or segmented control:
  - "Campaign Budget (CBO)"
  - "Ad Set Budget (ABO)"

- Behavior:
  - If Campaign Budget is selected:
    - Enable Campaign Daily/Lifetime Budget inputs
    - Disable Ad Set Budget inputs
  - If Ad Set Budget is selected:
    - Enable Ad Set Budget inputs
    - Campaign Budget becomes optional or disabled

- Add helper text:
  "Meta does not allow conflicting budget strategies. Choose either campaign-level or ad set-level budget."

-----------------------------------
2. Promoted Object (App Mapping Fix)
-----------------------------------

Strengthen the App → Meta mapping:

- In Ad Set or Campaign section, add a visible "Promoted Object" summary card:

Display:
- Application ID
- Object Store URL (or fallback store URL)
- Platform (iOS / Android)

- If missing:
  - Show warning badge: "Missing Meta App Mapping"
  - Block validation

- Add helper text:
  "App campaigns require a valid promoted_object (application_id + store URL)."

-----------------------------------
3. Optimization Goal Constraint
-----------------------------------

Improve "Optimization Goal" behavior:

- Make Optimization Goal dependent on Campaign Objective

Example:
- If objective = OUTCOME_APP_PROMOTION:
  - Default: APP_INSTALLS
  - Other allowed: LINK_CLICKS, VALUE (if supported)

- Show inline note:
  "Optimization goal must be compatible with the selected objective."

-----------------------------------
4. Creative → Meta Payload Alignment
-----------------------------------

Refine Creative section to better match Meta structure:

- Add subtle label:
  "This will be transformed into Meta object_story_spec"

- Add validation rules:
  - Require at least:
    - Page ID
    - Primary Text
    - Headline
    - CTA
    - Image (hash or URL)

- Add helper note:
  "Incomplete creative fields may cause Meta API rejection during execution."

-----------------------------------
5. Integration & Token Error States
-----------------------------------

Enhance Integration Status card:

Add explicit states:
- Token Ready (green)
- Token Expired (red)
- Missing Permissions (red)
- Integration Disabled (grey)

- If token is expired or missing:
  - Show blocking error
  - Disable "Submit for Approval"

-----------------------------------
6. Execution Awareness (Important UX Fix)
-----------------------------------

Clarify that this is NOT execution:

- Add a stronger info banner:
  "This request will NOT create a live campaign. Meta objects will only be created after approval and execution."

- In right panel:
  Add new card:
  "Execution Preview"

Include:
- Campaign → will be created in PAUSED
- Ad Set → will be created in PAUSED
- Ad → will be created in PAUSED

-----------------------------------
7. Validation Improvements
-----------------------------------

Enhance Validation card:

Group errors into:
- Account & Integration
- App Mapping
- Campaign
- Ad Set
- Creative
- Ad

Add examples:
- "Ad account is inactive"
- "App mapping missing application_id"
- "No countries selected"
- "Creative missing image"

-----------------------------------
8. Readiness Checklist Upgrade
-----------------------------------

Improve checklist with stricter logic:

Add new items:
- Budget strategy selected (CBO or ABO)
- Promoted object valid
- Optimization goal compatible
- Integration token valid

Each item:
- success (green)
- warning (yellow)
- error (red)

-----------------------------------
9. Prevent Over-Simplification (Important)
-----------------------------------

Do NOT oversimplify Meta logic.

Ensure:
- UI reflects real constraints
- Do not hide critical dependencies
- Do not allow invalid combinations silently

-----------------------------------
10. Keep Existing Design Language
-----------------------------------

- Keep white cards, slate background, blue actions
- Keep compact enterprise layout
- Keep sticky right panel
- Do not introduce new design systems

-----------------------------------

Final goal:
Make this UI feel like a serious internal ads operations tool that:
- Prevents invalid Meta configurations
- Guides users with strong validation
- Reflects real Meta API constraints
- Is safe for production use

Do not regenerate everything. Only refine and enhance the current design.