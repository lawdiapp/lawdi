# Lawdi Case MVP Requirements

## 1. Purpose

This document defines the first secure Cases vertical slice for Lawdi. The goal is to let an authenticated advocate add a case with a client, confirm the information, and arrive at a useful case workspace without introducing the larger features planned for later releases.

The experience is designed for Indian advocates, solo lawyers, and small chambers. It must use plain language, remain comfortable for users with basic computer familiarity, and work well on phones as well as larger screens.

## 2. Product and Design Direction

The Case MVP follows the approved Lawdi direction:

- Calm, professional, and practical rather than visually dense.
- Lawdi branding and the subtitle “Simple practice management for advocates.”
- Mobile-first layouts using the existing Base Nova shadcn/ui components and theme tokens.
- Strong page titles, short guidance, visible labels, generous touch targets, and clear empty states.
- Server-rendered protected pages and server actions for mutations.
- One primary action per screen.
- Progressive disclosure: show only the fields needed for the current step.
- No horizontal scrolling at supported viewport sizes.

The case-creation experience should feel like a guided legal intake rather than a long database form.

## 3. MVP Scope

### Included

- A dashboard entry point for adding a case.
- A three-step Add Case flow:
  1. Case details.
  2. Client selection or inline client creation.
  3. Review and save.
- Secure case and optional inline-client creation.
- A Case Command Center after successful creation.
- Responsive desktop, tablet, and mobile behavior.
- Loading, validation, empty, success, and safe error states.

### Not included

The deferred features in section 12 must not be added to this slice.

## 4. User Workflow

### 4.1 Dashboard

1. The authenticated user opens `/dashboard`.
2. Lawdi validates the user and resolves their current practice membership.
3. The dashboard presents a visible “Add case” primary action.
4. The user selects “Add case” and is taken to `/cases/new`.

If the user is unauthenticated, redirect to `/login`. If the user has no practice, redirect to `/onboarding`.

### 4.2 Add Case — Case Details

1. The user sees step 1 of 3, “Case details.”
2. The user enters the required case information and any optional information.
3. Inline validation appears next to the relevant field.
4. Selecting “Continue” advances to client selection without saving a case.
5. A “Cancel” or “Back to dashboard” action returns to `/dashboard` without creating data.

### 4.3 Client Selection or Inline Client Creation

1. The user sees step 2 of 3, “Client.”
2. Existing clients belonging to the current practice are available for selection.
3. The user can choose “Create a new client” without leaving the case flow.
4. Inline client creation requires a client name; phone and email are optional.
5. A newly entered client is not written to the database until the final Save action.
6. Selecting “Continue” advances to review.
7. Selecting “Back” returns to case details with entered values preserved.

For the first MVP, a case must have either one selected existing client or one valid inline new client.

### 4.4 Review and Save

1. The user sees step 3 of 3, “Review.”
2. Lawdi displays a readable summary of case and client information.
3. The user can return to either previous step to correct information.
4. Selecting “Save case” submits one server-side operation.
5. The server revalidates authentication, membership, fields, and tenant ownership.
6. If an inline client was provided, the client and case are created atomically in the current practice.
7. If an existing client was selected, the server verifies that the client belongs to the current practice before associating it.
8. After success, redirect to `/cases/[caseId]`.
9. Repeated submissions must not create duplicate cases or clients while the first request is pending.

### 4.5 Case Command Center

1. The user lands on the newly created case’s Case Command Center.
2. The page shows the case identity, client, key dates, and current operational snapshot.
3. Empty modules explain what will appear later rather than presenting broken or inactive controls.
4. The user can return to the dashboard.

## 5. Navigation and Routes

| Route | Purpose | Access |
|---|---|---|
| `/dashboard` | Practice overview and Add Case entry point | Authenticated practice member |
| `/cases/new` | Guided Add Case flow | Authenticated practice member |
| `/cases/[caseId]` | Case Command Center | Authenticated member of the case’s practice |

Routes must never reveal whether a case or client exists in another practice. Unauthorized or cross-practice record requests should behave like unavailable records, using the application’s safe not-found or redirect behavior.

## 6. Screen Requirements

### 6.1 Dashboard

- Add a clearly visible “Add case” action above the fold.
- Keep the existing practice name, role, email, and logout behavior.
- The action must remain touch-friendly and visible without horizontal scrolling.
- Do not add case metrics or a full case list in this slice unless required to support navigation.

### 6.2 Add Case — Shared Structure

- Show Lawdi branding and a link back to the dashboard.
- Show a page title, one-sentence description, and “Step X of 3.”
- Use a clear three-step indicator: Case details, Client, Review.
- Preserve entered values when moving backward and forward within the flow.
- Display one primary action and one secondary/back action per step.
- Disable the primary action while processing.
- Show safe page-level errors above the action area and field errors beside fields.
- Do not show database codes, table names, stack traces, or raw Supabase messages.

### 6.3 Desktop — 1024px and Wider

- Use a centered content area with a comfortable maximum width.
- Present a two-column workspace:
  - Main form area for the current step.
  - Narrow sticky summary panel showing entered case title, case number, court, and selected client.
- Keep the step indicator visible near the page title.
- Group related fields into cards with clear section headings.
- Place actions at the bottom of the form, aligned for quick scanning.
- The Case Command Center uses a main summary column plus a compact operational sidebar where appropriate.

### 6.4 Tablet — 768px to 1023px

- Use a single primary column with generous side padding.
- Move the summary panel below the current form section or render it as a compact collapsible summary.
- Keep related two-field rows only where each field remains comfortably readable.
- Maintain 44px minimum touch targets.
- The Case Command Center may use a two-column card grid, but the case identity section spans the full width.

### 6.5 Mobile — 320px to 767px

- Use full-width cards with safe 16px outer padding.
- Stack every form field vertically.
- Use a compact horizontal step indicator or “Step X of 3” label that does not overflow.
- Keep primary and secondary actions full width; primary appears first visually.
- Avoid sticky elements that cover the on-screen keyboard or validation messages.
- Long case titles, court names, emails, and notes must wrap safely.
- The Case Command Center becomes a single-column stack ordered by immediate usefulness.
- No horizontal scrolling at 375px.

## 7. Required Case Fields and Validation

| Field | Required | Validation and behavior |
|---|---:|---|
| Case title | Yes | Trim whitespace; reject blank values; clear human-readable title. |
| Case number | Yes | Trim whitespace; reject blank values; preserve user-entered punctuation and court formatting. |
| Court name | Yes | Trim whitespace; reject blank values. |
| Case type | Yes | Trim whitespace; reject blank values. Use a simple text input or a short approved option list; do not introduce a complex taxonomy in MVP. |
| CNR number | No | Trim whitespace; store `null` when blank. Do not require or automatically validate against eCourts. |
| Filing date | No | Accept a valid calendar date; reject impossible or malformed dates; store `null` when omitted. |
| Notes | No | Trim whitespace; store `null` when blank; allow multiline plain text. |

Additional rules:

- Case status is not a user-entered field in this flow. The server assigns the MVP default status, `active`.
- The browser must not supply `practice_id`, `created_by`, timestamps, or ownership information.
- Server-side validation is authoritative even when equivalent browser validation exists.
- Validation messages must state how to correct the problem.

## 8. Client Behavior

### 8.1 Select Existing Client

- Load only clients visible to the authenticated user’s current practice.
- Show client name as the primary label, with phone or email as secondary context when available.
- Provide an explicit selected state.
- If no clients exist, show an empty state and emphasize inline creation.
- The selected client ID is untrusted input. On save, the server must verify that it belongs to the authenticated user’s practice.

### 8.2 Create Client Inline

Required field:

- Client name: required, trimmed, and non-blank.

Optional fields:

- Phone: trimmed; store `null` when blank.
- Email: trimmed and normalized appropriately; validate format when provided; store `null` when blank.

Behavior:

- Switching to inline creation must not accidentally retain an existing selected client.
- Switching back to an existing client must not submit inline client fields.
- Inline client data is reviewed with the case before saving.
- The server creates the client and case in one atomic operation so partial data is not left behind.
- The created client receives the same server-derived `practice_id` as the case.

## 9. Review Screen Requirements

The Review screen must display:

- Case title.
- Case number.
- Court name.
- Case type.
- CNR number or “Not provided.”
- Filing date or “Not provided.”
- Notes or “No notes added.”
- Existing client details or the proposed new client details.

Actions:

- “Back” returns to the Client step.
- “Edit case details” returns to step 1.
- “Save case” is the only mutation action.
- While saving, disable repeat submission and show a clear pending label.

## 10. Case Command Center

The Case Command Center is the single destination for understanding a case. In this slice it is primarily a secure, read-only overview.

### 10.1 Case Summary

- Case title as the page heading.
- Case number and case type.
- Court name.
- Status badge using the server-assigned status.
- CNR number when present.
- Filing date when present.
- Notes when present, otherwise a concise empty state.

### 10.2 Client Details

- Client name.
- Phone when present.
- Email when present.
- No edit action in this slice.

### 10.3 Next Hearing

- Show the earliest future hearing belonging to the case when one exists.
- Display date, time, court, and purpose when available.
- When none exists, show “No upcoming hearing scheduled.”
- Do not add hearing creation or a hearing timeline in this slice.

### 10.4 Documents Count

- Show a documents summary card with a count.
- Until document upload is implemented, show `0` with “No documents added yet.”
- Do not provide an upload control in this slice.

### 10.5 Tasks Count

- Show an open-tasks summary card with a count.
- Until task creation is implemented, show `0` with “No open tasks.”
- Do not provide task creation controls in this slice.

### 10.6 Recent Activity

- Show a small activity section ordered newest first.
- For the initial slice, include “Case created” derived from the case’s `created_at` timestamp.
- Do not create a general audit-log system solely for this screen.
- Future hearing, task, and document events can extend this section later.

### 10.7 Mobile Information Order

On mobile, sections appear in this order:

1. Case identity and status.
2. Next hearing.
3. Client details.
4. Documents and tasks counts.
5. Notes.
6. Recent activity.

## 11. Security Requirements

### 11.1 Authentication and Membership

- Use `supabase.auth.getClaims()` for server-side identity validation.
- Do not use `getSession()` for authorization.
- Resolve the current practice from the authenticated user’s `practice_members` row.
- Redirect unauthenticated users to `/login`.
- Redirect authenticated users without a practice to `/onboarding`.

### 11.2 Practice Scoping

- Every case and client read must be scoped to the resolved current practice.
- `practice_id` must never be accepted from a browser field, URL parameter, client state, or hidden input.
- The server action supplies `practice_id` from authenticated membership.
- Existing client selection must be checked against the same current practice before saving.
- Case detail queries must require both the requested case ID and the current practice ID.
- No error message may reveal the existence of another practice’s case or client.

### 11.3 Database Enforcement

- Row Level Security remains enabled on `cases`, `clients`, `hearings`, and all other public application tables.
- Authenticated users receive only the table privileges needed for this slice.
- RLS policies remain the tenant-isolation enforcement layer.
- Do not use a Supabase service-role or secret key in application code.
- Do not weaken, bypass, or replace existing membership policies.
- Inline client and case creation must be atomic. If a secure database function is used, it must be `SECURITY DEFINER`, have an empty `search_path`, fully qualify database objects, and be executable only by `authenticated`.

### 11.4 Mutation Safety

- Revalidate authentication, practice membership, and all fields inside the save action.
- Treat every ID received from the browser as untrusted.
- Return safe user-facing errors without raw database details.
- Disable duplicate submission while save is pending.
- Revalidate affected routes after a successful save.

## 12. Deferred Features

The following are explicitly outside this Case MVP slice:

- AI case brief.
- Voice notes.
- Assistant collaboration and invitations.
- Billing.
- Search.
- Document upload.
- Full hearing timeline.
- Notifications and reminders.
- Case edit and delete.
- Client edit and delete.
- Case list filtering, sorting, and pagination.
- eCourts or CNR lookup integrations.

The UI must not show active controls for deferred features. The Case Command Center may show clearly labeled zero-count or empty-state summaries only where required by section 10.

## 13. Loading, Empty, Error, and Accessibility Requirements

- Use semantic headings in a logical hierarchy.
- Every field has a persistent visible label.
- Required and optional fields are clearly identified.
- Validation messages are associated with their fields and announced accessibly.
- Touch targets are at least 44px high where practical.
- Keyboard users can complete the entire workflow in order.
- Focus moves to the first invalid field or the page-level error summary after failed submission.
- Pending states use text, not motion alone.
- Empty states explain the next available action.
- Errors never expose stack traces, SQL, internal IDs, or Supabase messages.
- Color is not the only indicator of status, selection, or error.

## 14. Acceptance Criteria

### 14.1 Dashboard

- An authenticated practice member sees a visible “Add case” action.
- Activating it opens `/cases/new`.
- An unauthenticated visitor is redirected to `/login`.
- A user without a practice is redirected to `/onboarding`.
- Existing dashboard identity, practice, role, and logout behavior remains intact.
- The layout works without horizontal scrolling on phone, tablet, and desktop widths.

### 14.2 Add Case — Case Details

- The screen identifies itself as step 1 of 3.
- Case title, case number, court name, and case type are required.
- CNR number, filing date, and notes are optional.
- Blank required fields produce visible, specific validation messages.
- Optional blank fields are stored as `null`, not meaningless empty strings.
- Continue does not write a case to the database.
- Values remain present after moving forward and back.

### 14.3 Add Case — Client

- The screen identifies itself as step 2 of 3.
- Only clients from the current practice are listed.
- A user can select one existing client.
- A user can instead create a client inline.
- Inline client name is required; phone and email are optional.
- An invalid optional email produces a visible validation message.
- A client from another practice cannot be selected successfully even if its ID is manually submitted.
- No client row is created before final Save.

### 14.4 Add Case — Review and Save

- The screen identifies itself as step 3 of 3.
- All case details and client details are shown in readable form.
- Missing optional values have clear fallback labels.
- The user can return to previous steps without losing data.
- Save is disabled while processing.
- The server derives the practice from authenticated membership.
- Existing client ownership is rechecked server-side.
- Inline client and case creation either both succeed or both fail.
- Successful save creates exactly one case and redirects to its Case Command Center.
- Safe errors are shown without exposing internal details.

### 14.5 Case Command Center

- An authenticated member of the case’s practice can open `/cases/[caseId]`.
- The case summary displays title, number, court, type, and status.
- Optional CNR number, filing date, and notes display correctly when present.
- Client name and available contact details are displayed.
- The next-hearing module shows the earliest future hearing or a clear empty state.
- Documents and tasks cards display counts, using zero-state copy until those features exist.
- Recent activity includes the case-created event.
- A navigation action returns to the dashboard.
- A Practice A user cannot read a Practice B case or infer that it exists.
- The page is usable without horizontal scrolling at 375px, 768px, and 1280px widths.

### 14.6 Security and Isolation

- No form or request payload contains `practice_id` supplied by the browser.
- A Practice A user cannot list, read, create, or associate records in Practice B.
- Direct requests using another practice’s client or case ID fail safely.
- All application tables used by the slice retain RLS.
- No service-role or secret key is present in browser or ordinary server application code.
- Authorization uses `getClaims()` and authenticated membership for every protected page and mutation.

## 15. Definition of Done

The Case MVP slice is complete when:

- All acceptance criteria above pass.
- Database migrations are reviewed, repeatable, and preserve RLS.
- Cross-practice read and write tests pass using two distinct test users and practices.
- The complete flow passes manual testing at 375px, 768px, and 1280px.
- Keyboard navigation and visible validation have been manually checked.
- `npm run lint` passes.
- `npm run build` passes.
- No deferred feature has been introduced.
