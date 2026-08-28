# Exact Apps Script setup checklist

1. Open the dedicated CRM V2 Google Spreadsheet.
2. Choose **Extensions → Apps Script**. Use this spreadsheet-bound Apps Script project; do not connect the old CRM project.
3. Add these repository files to the Apps Script project: `Admin.gs`, `Api.gs`, `Auth.gs`, `Config.gs`, `Dashboard.gs`, `Directory.gs`, `Followups.gs`, `Import.gs`, `Interactions.gs`, `Schema.gs`, `Services.gs`, `Setup.gs`, `StaffDashboard.gs`, `Store.gs`, `Tasks.gs`, and `Workflow.gs`. In Project Settings, enable **Show "appsscript.json" manifest file in editor**, then replace it with `backend/appsscript.json`.
4. Open **Project Settings → Script properties → Add script property**. Set the property name to `SPREADSHEET_ID` and the value to the ID between `/d/` and `/edit` in the spreadsheet URL.
5. Select `setupSpreadsheet` in the function selector and click **Run**. It creates only allowed missing sheets/counters and preserves every existing row/header. Approve the requested spreadsheet authorization.
6. Run `validateSpreadsheetSchema`. Success is an object with `ok: true`, all 18 names in `okSheets`, and empty arrays for `missingSheets`, `headerMismatches`, `duplicateHeaders`, `missingRequiredColumns`, and `unexpectedColumns`.
7. In the editor only, run `createInitialSuperAdmin('username', 'a password of at least 12 characters', 'Display Name', 'email@example.com')`. Apps Script's function selector cannot supply parameters directly, so temporarily add a local wrapper that calls it, run the wrapper once, then delete the wrapper before deployment. The function refuses to run if an active Super Admin already exists. It returns only the new Staff ID and username; it never logs or returns the password. Confirm the `Staff_List` and `Audit_Log` rows.
8. Optionally run `addMissingSystemConfigDefaults()`. This inserts only absent supported keys and preserves every existing administrator value.
9. Choose **Deploy → New deployment**. Select type **Web app**.
10. Set **Execute as: Me** (the account that owns or can access the dedicated spreadsheet).
11. Set **Who has access: Anyone**. This is required for browser requests from the public GitHub Pages origin. CRM session authentication and server-side authorization—not this deployment setting—protect application data.
12. Click **Deploy**, authorize if prompted, and copy the final URL ending in `/exec`. Do not use the `/dev` test URL.
13. In GitHub, open `Newcityvip/Affiliate_Success_CRM_V2` → **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Name it `NEXT_PUBLIC_API_BASE_URL` and use the `/exec` URL as its value. A secret is preferred even though the built frontend necessarily contains this public endpoint.
14. Open **Actions → Deploy CRM to GitHub Pages → Run workflow** on `main`.
15. Open `https://newcityvip.github.io/Affiliate_Success_CRM_V2/` and test a valid login. Confirm an active hashed-token row in `Sessions` and a `LOGIN` entry in `Audit_Log`.
16. Test logout. Confirm the session has `Status=REVOKED` and `Revoked_At`. Temporarily lower `SESSION_HOURS` in `System_Config` for an expiry test, then restore the intended value.
17. Create two STAFF accounts and assignments. Confirm each can retrieve only their own work and assigned affiliates, and cannot retrieve the other's affiliate by ID.
18. Confirm an ADMIN can call staff/brand listing, import validation/commit, assignment, transfer, archive, and reopen operations. Confirm STAFF receives `FORBIDDEN` for those actions.
19. Review `Audit_Log` for bootstrap, login/logout, work changes, contacts, interactions, imports, assignments, transfers, archive, and reopen events.

## Browser/API compatibility

The frontend sends JSON as `text/plain;charset=utf-8`, making the POST a CORS-simple request that is compatible with Apps Script Web Apps and their redirect behavior. There is no client-origin allowlist presented as authentication: `Origin` can be spoofed outside a browser. Every protected action validates the session-token hash and derives user identity and role from the session and `Staff_List`.

Passwords are never stored in plaintext. They use a unique random salt and an iterated HMAC-SHA-256 derivation. Login returns the same error whether the username is absent, inactive, suspended, or the password is wrong. Only token hashes are stored. Expiry uses the administrator's active `SESSION_HOURS` value or the safe code default when absent.

## Tasks migration for an existing production sheet

1. Replace the changed `.gs` files and create `Tasks.gs` and `StaffDashboard.gs` in the existing Apps Script project.
2. Run `validateSpreadsheetSchema()`. A pre-migration production spreadsheet should report only `Tasks` as missing; any other problem requires manual review.
3. Run `setupSpreadsheet()` once. It creates the empty 18-column `Tasks` sheet and appends `Task | TSK | 0 | <timestamp>` only when absent. It does not alter historical sheets or rows.
4. Run `validateSpreadsheetSchema()` again and require `ok=true`, 18 `okSheets`, and empty problem arrays.
5. Edit the existing Web App deployment, select **New version**, and deploy without changing access settings. The `/exec` URL remains unchanged.

## Login timing logs

Successful and failed login executions write structured `login_timing` and `api_timing` entries to the Apps Script execution log. They contain only action name, request ID, success state, and elapsed milliseconds for configuration/rate limiting, staff lookup, password verification, session creation, audit writing, parsing, and total execution. They never include usernames, passwords, password hashes, tokens, or affiliate records. Cold-start time outside script execution may still add latency that these stage timings cannot eliminate.

## Existing 15-sheet database migration

1. Copy the changed backend files listed in the release report, including the new `Admin.gs`, into Apps Script and save.
2. Run `validateSpreadsheetSchema()`. It must be read-only and should report only `Team_List` in `missingSheets`; the existing 15 sheets must remain in `okSheets` with no header or duplicate errors.
3. Run `setupSpreadsheet()`. It may create only `Team_List` with the ten documented headers and append `Team | TEM | 0 | <timestamp>` to `ID_Counters` only when that counter is absent.
4. Run `validateSpreadsheetSchema()` again. Expected: `ok=true`, all 16 sheets in `okSheets`, and every problem array empty.
5. Choose **Deploy → Manage deployments**, edit the existing Web App, select **New version**, and deploy.
6. Preserve **Execute as: Me** and **Who has access: Anyone**.
7. Confirm the existing `/exec` URL is unchanged, then test Admin → Teams, Staff & Access, and Brands as the real `SUPER_ADMIN`.

## Affiliate Pool and importer migration

1. Copy the release report's changed backend files, including the new `Import.gs`, into the existing CRM V2 Apps Script project and save.
2. Run `validateSpreadsheetSchema()`. The production contract requires all 18 documented sheets, including `Tasks`.
3. If and only if `Affiliate_Pool` is missing, run `setupSpreadsheet()` once. It creates the five-column sheet without changing existing sheets or rows.
4. Run `validateSpreadsheetSchema()` again and require `ok=true`, 18 `okSheets`, and empty problem arrays.
5. Choose **Deploy → Manage deployments**, edit the existing Web App, select **New version**, and deploy with **Execute as: Me** and **Who has access: Anyone** unchanged.
6. Confirm the `/exec` URL is unchanged. Test validation first, then one small direct import and one pool import.

The importer accepts at most 500 pasted TSV/CSV rows. Validation is read-only. Commit revalidates under `LockService`, reserves each ID range with one counter write, and appends Affiliates, Assignments, Work Items, or pool entries in grouped writes. Pool `Brand` values are stable `Brand_Code` values. Direct imports create `PENDING` first-contact work because that is the existing work-engine status consumed by My Work.
