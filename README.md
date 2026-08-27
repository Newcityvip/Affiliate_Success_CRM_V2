# Affiliate Success CRM V2

An independent, zero-license-cost CRM foundation for affiliate operations.

## Architecture

- Static Next.js + TypeScript frontend on GitHub Pages
- Google Apps Script Web App API in `backend/`
- Google Sheets database with stable IDs and append-only history
- Cloudflare custom-domain IP policy for the production edge

Development URL: `https://newcityvip.github.io/Affiliate_Success_CRM_V2/`

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_BASE_URL` to an Apps Script `/exec` deployment URL.
3. Run `npm install` and `npm run dev`.

`npm run build` writes the deployable static site to `out/`. No credentials or final API URL belong in Git.

See [database schema](docs/DATABASE.md), [Apps Script deployment](docs/APPS_SCRIPT_DEPLOYMENT.md), [production security](docs/SECURITY_AND_DEPLOYMENT.md), and [workflow rules](docs/WORK_ENGINE.md).
