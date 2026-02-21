# INTERNAL_TICKETS.md

## Purpose
This document defines the canonical process to open and track internal tickets in this repository.
Internal tickets are for problem capture first (context + evidence), even when no clear solution exists yet.

## Why this exists
- Preserve findings discovered during local runs, log analysis, and test outputs.
- Keep backlog items auditable in git.
- Avoid losing context between diagnosis and future implementation.

## When to open a ticket
Open a ticket when at least one condition is true:
- Quality regression or warning pattern repeats across runs (same class of failure).
- A finding can block rollout, acceptance, or confidence in flow quality.
- A finding has user, business, or operational impact (even if partial).
- A finding requires follow-up work that will not be fixed in the current change.
- A test/run reveals behavior mismatch between observed and expected output.

## When not to open a ticket
Do not open a ticket for:
- One-off local mistakes already fixed immediately in the same change.
- Purely informational notes with no action need.
- Duplicate reports with no new evidence.

If unsure, open a ticket and mark low severity.

## Ticket lifecycle
Ticket files live under `tickets/`:
- `tickets/open/`: active backlog (`open`, `in-progress`, `blocked`).
- `tickets/closed/`: closed tickets (resolved, invalid, duplicate, wont-fix, or split-follow-up with reason).
- `tickets/templates/`: ticket template(s).

Status values:
- `open`: created and awaiting triage.
- `in-progress`: owner actively implementing.
- `blocked`: depends on external decision/input.
- `closed`: finished with closure reason.

Closure/commit rule:
- If a commit/push includes the implementation that resolves an `open` ticket, that same commit must move the ticket file to `tickets/closed/`.
- The closure metadata must be completed in the same commit (`Status: closed`, `Closed at (UTC)`, `Closure reason`, and `Related PR/commit/execplan`).
- `Closure reason: split-follow-up` is allowed when the current ticket must be closed for traceability while remaining pending work is moved to a new ticket.
- In `split-follow-up`, the same commit must include:
  - closure of the current ticket in `tickets/closed/`;
  - creation of the new follow-up ticket in `tickets/open/`;
  - explicit linkage between parent and follow-up (ticket path/name, related execplan, and commit context).

## Priority and severity
- Priority (`P0`, `P1`, `P2`):
  - `P0`: blocks release or has high operational risk.
  - `P1`: important, should be addressed in the next planned cycle.
  - `P2`: useful improvement, can wait without immediate risk.
- Queue consumption rule (`/run-all`):
  - Open tickets are consumed by priority order: `P0` before `P1`, and `P1` before `P2`.
  - For ties in the same priority, order is not a functional requirement; deterministic fallback by file name is acceptable.
- Severity (`S1`, `S2`, `S3`):
  - `S1`: high impact.
  - `S2`: medium impact.
  - `S3`: low impact.

## Objective matrix for critical refactoring backlog
- Scope:
  - Mandatory for tickets created from non-functional check-up findings that represent technical debt/refactoring.
  - Optional for other ticket types.
- Source of truth:
  - `docs/checkups/checkup-nao-funcional.md` defines dimensions, examples, and traceability expectations.
- Dimensions (`1` to `5` each):
  - `severidade`
  - `frequencia`
  - `custo_de_atraso`
  - `risco_operacional`
- Weighted score formula:
  - `score = (severidade * 3) + (frequencia * 2) + (custo_de_atraso * 3) + (risco_operacional * 2)`
  - score range: `10..50`.
- Priority mapping:
  - `P0`: `score >= 40`.
  - `P1`: `score` between `26` and `39`.
  - `P2`: `score` between `10` and `25`.
  - Guardrail: force `P0` when `severidade = 5` and (`custo_de_atraso >= 4` or `risco_operacional >= 4`).
- Tie-break for same-level candidates during triage:
  - higher `custo_de_atraso`;
  - then higher `severidade`;
  - then deterministic fallback by ticket file name.
- Traceability requirements when matrix applies:
  - record the four dimension values;
  - record the final `score`;
  - record resulting `Priority`;
  - add objective rationale with evidence links.
- Compatibility note:
  - This matrix defines how `Priority` is assigned before queueing.
  - Runtime queue behavior remains unchanged in `src/integrations/ticket-queue.ts` (`P0 -> P1 -> P2`, tie fallback by name).

## Required fields (minimum quality bar)
Every ticket must include:
- Problem summary (what happened).
- Context (where in pipeline/workflow).
- Observed vs expected behavior.
- Reproduction steps (if possible).
- Evidence links (`requestId`, log file, response artifact, test output).
- Impact assessment (scope + risk).

Proposed solution is optional by design.

## Naming convention
Use file name:
- `YYYY-MM-DD-<slug>.md`

Examples:
- `2026-02-14-telegram-status-reporting-gap.md`
- `2026-02-14-execplan-generation-missing-context.md`

## Triage SLA
- First triage target: up to 2 business days after ticket creation.
- During triage, define:
  - owner;
  - priority/severity confirmation;
  - next decision (`implement now`, `plan in ExecPlan`, `close`).

## Relationship with ExecPlan
- Ticket captures the problem.
- ExecPlan defines implementation when scope/risk requires structured execution.
- A ticket can remain open until the related ExecPlan is delivered and validated.

## Sensitive data policy
Never include secrets or raw sensitive payloads in ticket files.
- Allowed: IDs, redacted snippets, and non-sensitive artifact paths.
- Not allowed: API keys, tokens, credentials, full sensitive payloads.
