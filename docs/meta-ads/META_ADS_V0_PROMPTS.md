# V0 Prompts - Meta Ads V1 UI (Mediation Pro)

## 1. Main Prompt for v0: Create Meta Campaign Request

```text
You are designing a polished internal web app UI module for an existing product called "Mediation Pro".

Context:
This is not a direct "publish to Meta now" screen.
This screen creates an internal Meta campaign request first.
The real business flow is:
- save draft
- validate internally
- submit for approval
- later, from request detail, an approved user can execute the request
- when executed, backend creates Meta campaign -> ad set -> creative -> ad
- all Meta objects are created in PAUSED status by default

Integration constraints:
- This UI must be integrated into the existing Mediation Pro dashboard shell.
- Do not redesign or regenerate the global app shell.
- Reuse the existing left sidebar, top header, page container, spacing rhythm, and admin component patterns.
- Meta Ads is a new menu/module inside the existing Mediation sidebar, not a separate product.
- Generate only the page content that sits inside the existing dashboard layout.
- Match the current Mediation UI language: white sidebar, slate page background, white cards, blue active states, compact enterprise tables and forms.
- Assume the sidebar already exists and add a new parent menu item called "Meta Ads".
- Under "Meta Ads", assume these submenu items exist:
  - Requests
  - Integrations
  - Ad Accounts
  - App Mappings

Important product rules:
- Do not design a toggle like "Enable campaign on creation".
- Do not design a direct publish flow to Meta from this page.
- Do not assume success means "campaign is live".
- Success on this page means "request created" or "request submitted for approval".
- This phase does not include reporting dashboards or optimization automation UI.
- This phase does not include a full media library manager.

Primary screen name:
"Create Meta Campaign Request"

Design direction:
- Modern internal B2B dashboard page inside an existing enterprise app shell.
- Do not invent a brand new navigation pattern, auth shell, or landing-page aesthetic.
- Avoid generic SaaS purple gradients.
- Prefer the established product palette and hierarchy: slate surfaces, white cards, blue interaction states, restrained accent colors for validation and status.
- Dense but readable layout for performance marketers and operations users.
- Desktop-first but responsive on tablet/mobile.
- Use strong hierarchy, sticky side summary, compact cards, clear validation states.

Page structure:
1. Top bar
- This is the page-level header inside the existing dashboard content area, not a new global app header.
- Breadcrumb: "Meta Ads / Requests / Create"
- Title: "Create Meta Campaign Request"
- Subtitle: "Create an internal request. Meta objects will only be created after approval and execute."
- Right side actions:
  - "Discard" ghost button
  - "Save Draft" secondary button
  - "Validate" outline button
  - "Submit for Approval" primary button
- "Submit for Approval" is disabled until validation passes.

2. Main layout
- Two-column desktop layout.
- Left column: large request form, around 68-72% width.
- Right column: sticky summary / readiness / validation panel, around 28-32% width.

3. Header info banner
- Show a subtle but noticeable info banner under the top bar:
  - "This page creates an internal request, not a live Meta campaign. Approved requests are executed later and all Meta objects start in PAUSED state."

Left column sections:

A. Account & App Readiness
- "Meta Ad Account" searchable dropdown, required.
- Each option should show:
  - ad account id like "act_123456789"
  - account name
  - currency
  - timezone
  - active/inactive badge
- "App" searchable dropdown, required.
- Each app option should show:
  - app display name
  - platform badge (iOS / Android)
  - app id or bundle/package hint
- "App Mapping Status" compact status card that updates after app selection:
  - mapped / missing mapping
  - has Meta application id / missing
  - has object store URL or fallback store URL / missing
- "Integration Status" compact status card that updates after ad account selection:
  - integration enabled / disabled
  - token ready / token missing
- "Business Objective" as marketer-friendly preset chips that map to supported ODAX objectives:
  - App Promotion
  - Traffic
  - Awareness
  - Engagement
  - Leads
  - Sales

B. Campaign Settings
- "Campaign Name" required text input.
- Show a smart placeholder example like:
  - "{AppName}_{Country}_{Platform}_{Objective}_{YYYYMMDD}"
- "Buying Type" dropdown, default AUCTION.
- "Campaign Objective" dropdown, required.
- Only supported values:
  - OUTCOME_APP_PROMOTION
  - OUTCOME_TRAFFIC
  - OUTCOME_AWARENESS
  - OUTCOME_ENGAGEMENT
  - OUTCOME_LEADS
  - OUTCOME_SALES
- "Special Ad Categories" multi-select tags, optional.
- "Bid Strategy" dropdown, optional at campaign level.
- "Campaign Budget" inputs:
  - Daily Budget
  - Lifetime Budget
- Add helper copy explaining at least one budget must exist at campaign or ad set level.

C. Ad Set - Audience & Placement
- "Ad Set Name" required.
- "Countries" required multi-select with chips.
- "Age Range" dual input or slider.
- "Gender" segmented control:
  - All
  - Male
  - Female
- "Placement Mode" segmented control:
  - Automatic
  - Manual
- If Manual is selected, show grouped placement selectors:
  - Publisher Platforms
  - Facebook Positions
  - Instagram Positions
- Add compact note that manual placement values must map cleanly to backend payload fields.
- Optional placeholder field for "Custom Audience" as disabled or coming soon.

D. Ad Set - Budget, Bidding, Schedule
- "Ad Set Daily Budget"
- "Ad Set Lifetime Budget"
- Currency label pulled from selected ad account.
- "Billing Event" dropdown, default IMPRESSIONS.
- "Optimization Goal" dropdown, default APP_INSTALLS but editable.
- "Bid Amount" numeric input, optional.
- "Start Time" datetime picker.
- "End Time" datetime picker, optional.
- Show helper text when age range is invalid or when no countries are selected.

E. Creative
- Keep this phase intentionally simplified.
- Remove tabs like "Existing Post" or "Carousel".
- Use one card called "Single Creative".
- Fields:
  - Creative Name, required
  - Facebook Page ID, required
  - Instagram Actor ID, optional
  - Primary Text
  - Headline
  - Description
  - Call To Action dropdown
  - Image Hash
  - Image URL
  - Link URL
- Add helper text: at least one of Image Hash or Image URL is required.
- Add helper text: if Link URL is empty, backend may fall back to app mapping URLs.
- Include a lightweight phone preview card that shows headline, text, CTA, and image placeholder.
- Do not build a full upload manager; use text inputs and a simple placeholder media area only.

F. Ad
- "Ad Name" required.
- Hidden complexity should stay hidden.
- Optional advanced field in collapsible area:
  - Tracking Specs JSON
- By default show this as an advanced section, collapsed.

Right column:

1. Request Status card
- Show current local state badge:
  - Draft
  - Valid
  - Ready to Submit
- This is request state, not live campaign state.

2. Readiness Checklist card
- Account selected
- App selected
- Integration token ready
- App mapping ready
- Objective supported
- Budget provided
- Countries selected
- Creative minimum fields complete
- Ad name complete
- Each line should show success / warning / error status.

3. Live Summary card
- Campaign:
  - Name
  - Objective
  - Buying Type
  - Budget summary
- Ad Set:
  - Countries count and preview
  - Age range
  - Gender
  - Placement mode
  - Optimization goal
  - Schedule summary
- Creative:
  - Page ID
  - Headline
  - CTA
  - Link URL source
- Ad:
  - Name

4. Validation card
- Show inline grouped errors returned by backend validate endpoint.
- Use short human-readable messages, not raw technical dumps.
- Example groups:
  - Account readiness
  - App mapping
  - Campaign
  - Ad Set
  - Creative
  - Ad

Interactions:
- Save Draft:
  - always available after minimum account + app selection
  - saves internal request only
  - shows toast: "Draft saved"
- Validate:
  - calls backend validation
  - shows success state and clears old errors when valid
  - shows grouped inline errors when invalid
- Submit for Approval:
  - only enabled when validation passes
  - shows confirmation modal
  - on success, toast: "Request submitted for approval"
  - redirect to Request Detail page, not Campaign Detail
- Discard:
  - confirm before leaving if there are unsaved changes

Error handling:
- Distinguish between:
  - validation errors from backend
  - request save failures
  - submit failures
- Do not present this page as if Meta Marketing API is called directly here.
- Use inline banners and section-level field errors.

Non-goals:
- No reporting charts
- No automation rules UI
- No direct execute button on this create screen
- No full creative library management
- No raw JSON-first UX

Visual details:
- Use card sections with clear headers and small helper descriptions.
- Use sticky right rail.
- Use badges for statuses like Active, Disabled, Token Ready, Mapping Missing.
- Make validation states very visible but not visually noisy.
- The interface should feel operational and trustworthy, not promotional.
```

## 2. Supporting Prompt for v0: Meta Request List + Request Detail

```text
Design two connected internal web app screens for "Mediation Pro":
1. Meta Campaign Request List
2. Meta Campaign Request Detail

Context:
This module manages internal Meta campaign requests, not live campaigns directly.
Request lifecycle:
- draft
- pending approval
- approved
- rejected
- executing
- completed
- failed

Integration constraints:
- These screens must plug into the existing Mediation Pro dashboard shell.
- Do not redesign the global sidebar or top header.
- Treat "Meta Ads" as a new parent menu in the existing left navigation.
- Under "Meta Ads", use submenu navigation for:
  - Requests
  - Integrations
  - Ad Accounts
  - App Mappings
- Generate only page content and page-level controls inside the existing shell.
- Reuse the same card, table, badge, filter bar, drawer, and empty-state patterns already used by the current Mediation admin UI.
- Match the current visual language: white sidebar, slate page background, white cards, blue primary actions, compact admin tables.

Screen 1: Request List
- Breadcrumb: "Meta Ads / Requests"
- Title: "Meta Campaign Requests"
- Toolbar filters:
  - status
  - app
  - ad account
  - requested by
  - created date range
  - search by campaign/request name
- Primary table columns:
  - Request ID
  - Campaign Name
  - Objective
  - App
  - Meta Ad Account
  - Status badge
  - Requested By
  - Approved By
  - Created At
  - Submitted At
  - Executed At
  - Failure Summary
- Row actions:
  - View Detail
  - Approve
  - Reject
  - Execute
  - Retry
- Use clear row color signals for failed, pending approval, approved.
- Add a prominent "Create Request" button.

Screen 2: Request Detail
- Header shows:
  - request id
  - campaign name
  - status badge
  - app
  - ad account
  - requested by
  - created at
- Top actions depend on state:
  - Approve
  - Reject
  - Execute
  - Retry
- Main layout:
  - left: request payload summary in business terms
  - right: lifecycle card and created object summary
- Add a section called "Operation Logs" with a vertical step timeline:
  - validation
  - campaign
  - ad set
  - creative
  - ad
- Each step shows status, attempt number, timestamps, error message if any.
- Add a card for "Created Meta Objects" with external IDs and local IDs.
- Failed requests should show a clear failure summary banner.
- Approved requests should show a strong execute CTA.
- Completed requests should show all created objects and a calm success state.

Style:
- Internal B2B operations dashboard page inside an existing app shell
- Dark text on light surfaces
- Keep the established Mediation look: white cards, slate canvas, blue primary actions, restrained status accents
- Dense, practical, highly scannable
```

## 3. Supporting Prompt for v0: Meta Integrations + Ad Accounts + App Mappings

```text
Design an internal admin/operations UI module for "Mediation Pro" to manage Meta Ads setup.
This module should include three related screens:
1. Meta Integrations
2. Meta Ad Accounts
3. Meta App Mappings

Integration constraints:
- This is part of the existing Mediation Pro dashboard, not a standalone admin product.
- Reuse the current left sidebar, shared top header, page width, spacing, and form/table styles.
- Add "Meta Ads" as a parent menu in the existing sidebar.
- Under "Meta Ads", add submenu items:
  - Requests
  - Integrations
  - Ad Accounts
  - App Mappings
- Generate only module screens that fit into the current dashboard content area.
- Match the current visual language: white sidebar, slate background, white cards, blue active states, compact admin controls.

Screen 1: Meta Integrations
- Table with:
  - display name
  - auth mode
  - Meta business id
  - Meta app id
  - token status
  - scopes summary
  - default yes/no
  - enabled yes/no
  - last validated at
  - updated at
- Top actions:
  - Create Integration
  - Refresh Token
  - Open OAuth Flow
- Row actions:
  - Edit
  - Enable
  - Disable
  - Sync Ad Accounts
- In create/edit drawer, include fields:
  - display name
  - auth mode
  - Meta business id
  - Meta app id
  - app secret
  - access token
  - refresh token
  - token type
  - token expires at
  - scopes
  - is default
  - is enabled
- Secret fields should look masked and secure.

Screen 2: Meta Ad Accounts
- Table with:
  - ad account id
  - name
  - integration
  - currency
  - timezone
  - business name
  - status
  - active yes/no
  - last synced at
- Include a strong "Sync from Integration" action.
- Allow manual upsert/edit for operational fixes.

Screen 3: Meta App Mappings
- Table with:
  - app display name
  - platform
  - Meta application id
  - object store url
  - deep link override
  - store url override
  - active yes/no
  - updated at
- Create/edit drawer fields:
  - internal app
  - Meta application id
  - object store url
  - package name override
  - bundle id override
  - deep link override
  - store url override
  - active yes/no
- Show mapping health status:
  - mapping ready
  - missing Meta application id
  - missing fallback URL

Style:
- Operations console inside an existing enterprise dashboard
- Clean grid, compact forms, status badges, clear empty states
- Reuse existing admin UI patterns instead of inventing a new shell
```

## 4. Usage Notes

- Paste one prompt at a time into v0. Start with prompt 1 if you only need the main campaign-request screen.
- If you want a near-complete V1 module, use prompt 3 first, then prompt 1, then prompt 2.
- If v0 starts generating a separate product shell, repeat the integration constraints explicitly and tell it to reuse the current Mediation dashboard layout with the existing sidebar and header.
- For the current phase, map the backend routes like this:
  - Request create: `POST /api/v1/meta-campaign-requests`
  - Request validate: `POST /api/v1/meta-campaign-requests/{id}/validate`
  - Request submit: `POST /api/v1/meta-campaign-requests/{id}/submit`
  - Request approve: `POST /api/v1/meta-campaign-requests/{id}/approve`
  - Request reject: `POST /api/v1/meta-campaign-requests/{id}/reject`
  - Request execute: `POST /api/v1/meta-campaign-requests/{id}/execute`
  - Request retry: `POST /api/v1/meta-campaign-requests/{id}/retry`
  - Integrations: `GET/POST/PUT /api/v1/meta-accounts/integrations`
  - Ad accounts: `GET/POST/PUT /api/v1/meta-accounts/ad-accounts`
  - App mappings: `GET/POST/PUT /api/v1/meta-accounts/app-mappings`
  - Reference data: `GET /api/v1/meta-reference/create-campaign`
- Do not use the old direct Meta flow like `POST /act_{ad_account_id}/campaigns` anymore, because it no longer matches the current phase.
