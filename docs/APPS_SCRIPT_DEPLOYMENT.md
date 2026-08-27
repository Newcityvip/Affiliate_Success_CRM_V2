# Exact Apps Script setup checklist

1. Open the dedicated CRM V2 Google Spreadsheet that already contains the 15 sheets.
2. Choose **Extensions → Apps Script**. Use this spreadsheet-bound Apps Script project; do not connect the old CRM project.
3. Add these repository files to the Apps Script project: `Api.gs`, `Auth.gs`, `Config.gs`, `Schema.gs`, `Services.gs`, `Setup.gs`, and `Store.gs`. In Project Settings, enable **Show "appsscript.json" manifest file in editor**, then replace it with `backend/appsscript.json`.
4. Open **Project Settings → Script properties → Add script property**. Set the property name to `SPREADSHEET_ID` and the value to the ID between `/d/` and `/edit` in the spreadsheet URL.
5. Select `validateSpreadsheetSchema` in the function selector and click **Run**. Approve the requested spreadsheet authorization.
6. Inspect the execution result. Success is an object with `ok: true`, all 15 names in `okSheets`, and empty arrays for `missingSheets`, `headerMismatches`, `duplicateHeaders`, `missingRequiredColumns`, and `unexpectedColumns`. If it is not successful, fix the spreadsheet manually; do not run an automatic migration.
7. In the editor only, run `createInitialSuperAdmin('username', 'a password of at least 12 characters', 'Display Name', 'email@example.com')`. Apps Script's function selector cannot supply parameters directly, so temporarily add a local wrapper that calls it, run the wrapper once, then delete the wrapper before deployment. The function refuses to run if an active Super Admin already exists. It returns only the new Staff ID and username; it never logs or returns the password. Confirm the `Staff_List` and `Audit_Log` rows.
8. Optionally run `addMissingSystemConfigDefaults()`. This inserts only absent supported keys and preserves every existing administrator value.
9. Choose **Deploy → New deployment**. Select type **Web app**.
10. Set **Execute as: Me** (the account that owns or can access the dedicated spreadsheet).
11. Set **Who has access: Anyone**. This is required for browser requests from the public GitHub Pages origin. CRM session authentication and server-side authorization—not this deployment setting—protect application data.
12. Click **Deploy**, authorize if prompted, and copy the final URL ending in `/exec`. Do not use the `/dev` test URL.
13. In GitHub, open `Newcityvip/Affiliate_Success_CRM_V2` → **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Name it `NEXT_PUBLIC_API_BASE_URL` and use the `/exec` URL as its value. A secret is preferred even though the built frontend necessarily contains this public endpoint.
14. Open **Actions → Deploy CRM to GitHub Pages → Run workflow** on `main`.
15. Open `https://newcityvip.github.io/Affiliate_Success_CRM_V2/` and test a valid login. Confirm `Last_Login_At`, an active hashed-token row in `Sessions`, and a `LOGIN` entry in `Audit_Log`.
16. Test logout. Confirm the session has `Status=REVOKED` and `Revoked_At`. Temporarily lower `SESSION_HOURS` in `System_Config` for an expiry test, then restore the intended value.
17. Create two STAFF accounts and assignments. Confirm each can retrieve only their own work and assigned affiliates, and cannot retrieve the other's affiliate by ID.
18. Confirm an ADMIN can call staff/brand listing, import validation/commit, assignment, transfer, archive, and reopen operations. Confirm STAFF receives `FORBIDDEN` for those actions.
19. Review `Audit_Log` for bootstrap, login/logout, work changes, contacts, interactions, imports, assignments, transfers, archive, and reopen events.

## Browser/API compatibility

The frontend sends JSON as `text/plain;charset=utf-8`, making the POST a CORS-simple request that is compatible with Apps Script Web Apps and their redirect behavior. There is no client-origin allowlist presented as authentication: `Origin` can be spoofed outside a browser. Every protected action validates the session-token hash and derives user identity and role from the session and `Staff_List`.

Passwords are never stored in plaintext. They use a unique random salt and an iterated HMAC-SHA-256 derivation. Login returns the same error whether the username is absent, inactive, suspended, or the password is wrong. Only token hashes are stored. Expiry uses the administrator's active `SESSION_HOURS` value or the safe code default when absent.
