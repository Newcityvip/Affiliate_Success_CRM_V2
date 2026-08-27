# Affiliate Success CRM V2 — Master Blueprint

## Product objective
Build an execution-first Affiliate Success Operating System. The current CRM remains untouched while V2 is developed and tested independently.

## Core operating principle
A staff member should always know the next best action. Work is generated from affiliate lifecycle, SLA, relationship state, performance decline, opportunity and follow-up commitments.

## Primary engines
1. Prospect & Assignment Engine
2. Staff Work Engine
3. Managed Affiliate / Telegram Relationship Engine
4. Management & Intelligence Engine

## Prospect lifecycle
UNASSIGNED -> ASSIGNED -> CONTACT_PENDING -> CONTACTING

Then:
- CONNECTED -> TELEGRAM_ONBOARDING -> TELEGRAM_CONNECTED -> MANAGED
- RETRY/CALLBACK -> CONTACTING
- EXHAUSTED -> CLOSED/ARCHIVED -> replacement assignment

Closed affiliates are never hard-deleted. They can be reopened later if new valid data appears.

## Telegram-connected workflow
Routine calling stops after Telegram connection. Work becomes relationship management, proactive performance checks, at-risk intervention, growth support, follow-ups and reactivation. Phone calls are an escalation path when Telegram contact fails or a high-value affiliate needs intervention.

## Contact exhaustion
Admin-configurable attempt policy. Closure must record a structured reason. Sensitive/subjective closure reasons can require supervisor approval. Historical assignment and attempt records remain immutable.

## Automatic replacement
Staff can have a configured active prospect target. When a prospect becomes Telegram-connected or legitimately closed/exhausted, the assignment engine fills the vacant prospect slot from the eligible unassigned pool.

## Bulk import / assignment
Input columns: Affiliate Username, Email, Phone. Admin chooses Brand and either Staff or Unassigned Pool.

Validation before commit:
- duplicate username inside upload
- existing username in database
- duplicate phone/email
- prior closed affiliate
- existing active assignment
- invalid/missing contact data

Existing records are never silently duplicated. Admin may skip, update contact data, transfer assignment, or reopen a previously closed affiliate according to permissions.

## Work item accountability
Every work item contains: staff owner, affiliate, type, reason, priority, created time, due time, started time, completed time, outcome.

Staff cannot complete a call task without a valid contact outcome. Meaningful outcomes can require notes and/or next action.

## Daily pressure model
Pressure is created through visible workload, deadlines, overdue states, queue ordering and outcome-based KPIs—not mouse tracking or artificial call volume.

Example execution score:
- SLA / on-time completion: 40%
- follow-up discipline: 20%
- contact quality: 15%
- affiliate outcomes: 20%
- CRM discipline: 5%

Weights remain admin-configurable.

## Management dashboards
- open actions, overdue actions
- staff work/done/overdue/score
- time to first attempt
- successful contact rate
- Telegram conversion rate
- invalid / closure rate
- reactivation rate
- new affiliate activation
- at-risk recovery
- portfolio health and performance movement

## Security
- proper auth
- role-based access
- row-level security
- immutable audit trail for sensitive changes
- no hard delete for operational history
- server-side authorization for bulk import, assignment and transfer

## Data model philosophy
Keep permanent affiliate identity separate from assignment, work, interactions and performance. This preserves history when staff ownership changes.
