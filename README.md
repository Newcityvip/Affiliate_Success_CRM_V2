# Affiliate Success CRM V2

Execution-first affiliate success CRM built independently from the existing production CRM.

## Proposed stack
- Next.js + TypeScript
- PostgreSQL via Supabase
- Supabase Auth / RLS
- Scheduled/background work generation

## Included in this starter
- Command Center shell
- My Work queue shell
- Affiliate 360 placeholder
- Admin Bulk Import/Assignment shell
- PostgreSQL/Supabase initial schema
- Lifecycle and work-priority domain types
- Master product blueprint

## Start locally
1. Copy `.env.example` to `.env.local`
2. Create a Supabase project
3. Apply `supabase/migrations/0001_initial_schema.sql`
4. `npm install`
5. `npm run dev`

## Build sequence
Phase 1: Auth, roles, staff/brand admin, affiliate bulk import and assignment
Phase 2: Contact queue, retry/callback, Telegram-connected transition, closure/replacement
Phase 3: Managed portfolio, follow-ups, interactions, Affiliate 360
Phase 4: Performance imports, health/risk/opportunity scoring
Phase 5: Manager command center, KPIs, audit, QA and rollout controls
