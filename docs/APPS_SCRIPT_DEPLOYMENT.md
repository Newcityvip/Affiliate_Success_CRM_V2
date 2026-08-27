# Apps Script deployment

1. Create a new Google Spreadsheet dedicated to CRM V2. Do not reuse the production CRM spreadsheet.
2. Create a standalone Apps Script project and add every file from `backend/` (the manifest is `appsscript.json`).
3. In **Project Settings → Script properties**, add `SPREADSHEET_ID` with the new spreadsheet ID. Keep all future secrets here, never in frontend code or Git.
4. Run `setupSpreadsheet()` once and authorize access.
5. Run `generatePasswordHashForSetup('a-long-temporary-password')` manually. Add the returned hash—not the password—to a `Staff_List` row with role `SUPER_ADMIN` and status `ACTIVE`.
6. Deploy → New deployment → Web app. Execute as the deploying account; allow access to anyone. API authentication and authorization are enforced by the application. Copy the `/exec` URL.
7. Set the GitHub Actions repository secret `NEXT_PUBLIC_API_BASE_URL` to that `/exec` URL. Redeploy Pages.
8. After backend changes, create a new Web App version while retaining the deployment URL, then test login, session expiry, staff ownership, and admin role rejection.

Passwords use a unique random salt and an iterated PBKDF2-style HMAC-SHA-256 derivation built from Apps Script cryptographic primitives. Session tokens are random; only their digests are stored, and sessions expire after eight hours. Tune the iteration count upward after measuring login duration within Apps Script execution quotas.
