# Work engine and bulk import

`UNASSIGNED → ASSIGNED → CONTACT_PENDING → CONTACTING`

- Success: `CONNECTED → TELEGRAM_ONBOARDING → TELEGRAM_CONNECTED → MANAGED`
- Retry: `RETRY / CALLBACK → CONTACTING`
- Exhausted: `CONTACT_EXHAUSTED → ARCHIVED → REPLACEMENT_REQUIRED`

Work statuses are `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `CANCELLED`, and `OVERDUE`. Skip/cancel requires supervisor-or-higher authorization. When Telegram connects, contact is exhausted, or a valid closure removes a prospect from a portfolio, the response flags `replacementRequired`; an admin assignment can fill the vacancy without changing history.

Bulk import accepts username, email, and phone plus a brand, staff member, and optional market. Validation reports: `NEW`, `EXISTING_AFFILIATE`, `DUPLICATE_USERNAME_IN_BATCH`, `EXISTING_PHONE`, `MISSING_OR_INVALID_CONTACT`, `PREVIOUSLY_ARCHIVED`, or `PREVIOUSLY_ARCHIVED_NEW_CONTACT`. The foundation only commits an all-`NEW` batch; review/reopen/update decisions remain explicit. Each commit gets an Import Batch ID and audit entry.
