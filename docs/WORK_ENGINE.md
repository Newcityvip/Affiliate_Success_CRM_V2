# Work engine and bulk import

`UNASSIGNED → ASSIGNED → CONTACT_PENDING → CONTACTING`

- Success: `CONNECTED → TELEGRAM_ONBOARDING → TELEGRAM_CONNECTED → MANAGED`
- Retry: `RETRY / CALLBACK → CONTACTING`
- Exhausted: `CONTACT_EXHAUSTED → ARCHIVED → REPLACEMENT_REQUIRED`

Work statuses are `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `CANCELLED`, and `OVERDUE`. Skip/cancel requires supervisor-or-higher authorization. Automatic replacement, health rules, scoring, and performance intelligence are intentionally deferred; this phase only preserves the records and states those future engines will need.

## First Contact execution

The static `/affiliates?workId=...` workspace resolves the work item through the authenticated Apps Script API. The server requires the work, active assignment, affiliate, and authenticated staff identity to agree. Outcome submission completes the current work and appends a Contact Attempt. `CONNECTED`, `CALLBACK_REQUESTED`, and `OTHER` also append an Interaction. `NO_ANSWER` creates one pending retry work item; `CALLBACK_REQUESTED` creates one pending callback work item and linked Followup; connected without Telegram creates one Telegram onboarding work item. No outcome deletes or automatically archives an affiliate. Notes are capped and neutralized against spreadsheet-formula execution.

Bulk import accepts username, email, and phone plus a brand, staff member, and optional market. Validation reports: `NEW`, `EXISTING_AFFILIATE`, `DUPLICATE_USERNAME_IN_BATCH`, `EXISTING_PHONE`, `MISSING_OR_INVALID_CONTACT`, `PREVIOUSLY_ARCHIVED`, or `PREVIOUSLY_ARCHIVED_NEW_CONTACT`. The foundation only commits an all-`NEW` batch; review/reopen/update decisions remain explicit. Each commit gets an Import Batch ID and audit entry.
