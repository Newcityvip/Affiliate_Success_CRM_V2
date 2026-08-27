# Production edge and deployment security

Approved staff IP → Cloudflare custom hostname → static CRM frontend → Apps Script API

Cloudflare must enforce the approved source-IP list at the edge for the production hostname. Do not put allowlist logic in client-side JavaScript: it can be bypassed. An allowed IP is only the first gate; every user must still sign in, every API request must validate an unexpired session, and the backend must enforce roles and affiliate ownership.

The public GitHub Pages origin is useful for development and cannot be treated as the sole production security boundary. A user may reach the Pages origin or Apps Script URL directly. For strict production isolation, use a Cloudflare-fronted deployment whose origin access can be restricted and place an API proxy or access layer at the edge. The current free architecture mitigates direct API access with application authentication and authorization, but IP enforcement cannot be guaranteed at the Apps Script origin itself.

No Cloudflare credentials, Google credentials, spreadsheet IDs, passwords, session tokens, or final deployment URLs belong in this repository.

In repository Settings → Pages, set **Source** to **GitHub Actions**. The workflow builds `out/`; the app is configured for `/Affiliate_Success_CRM_V2`, including asset and navigation paths.
