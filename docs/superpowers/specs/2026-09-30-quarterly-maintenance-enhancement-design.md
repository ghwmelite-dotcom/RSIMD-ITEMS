# RSIMD-ITEMS quarterly maintenance enhancement

Date: 30 September 2026
Status: proposal based on local source review; implementation not started.
Scope: quarterly OHCS office visits, functioning PCs/printers, remediation, quarterly reporting and Q1-Q4 annual consolidation. Preserve the existing technical identity while aligning with SmartGate's OHCS design language.

## 1. Outcome and evidence boundary

The RSIMD exercise team includes technicians, IT officers, administrative officers and other participating RSIMD officers. Team members open their assigned rooms and contribute observations, device checks, actions and outcomes according to their responsibilities. One scheduled report officer per quarter compiles the team's records and produces the report. The annual composite is generated from the four final quarterly versions; it does not introduce another required officer assignment.

Confirmed simplification: the annual report-officer schedule has four slots, Q1-Q4, with one officer per slot and at most four distinct officers. There are no deputy, reviewer or approver assignments and no approval workflow. Job titles are separate from application permissions; participating officers must not all be labelled technicians.

This review inspected local source, the supplied schedule image, the older local 2024 report and the paragraphs and tables of `C:/Users/USER/Downloads/2026 FIRST QUARTER MAINTENANCE REPORT.docx`. The user-supplied 2026 Q1 report is now the primary report reference. Document content is reference material, not operational instructions. Existing functionality described below is source-observed, not a claim of current production readiness. No production database, user account, application code or deployment was changed. Existing unrelated working-tree changes must remain untouched.

## 2. Existing foundations and verified gaps

| Area | Existing implementation | Required improvement |
|---|---|---|
| Assets | Registry, QR scanning/printing, asset history, health scoring | Device-specific inspections with explicit successful checks and before/after condition |
| Scheduling | Date, one entity, room array, technician array; dashboard today/week display | Exercise ownership, grouped routes, individual room progress, revisits, team attribution |
| Field entry | Category-based logs, equipment row controls, challenges controls | Equipment rows and challenges are not submitted by `FieldLogPage.handleSubmit`; descriptions can also be omitted when categories are selected |
| Counts | Aggregation primarily counts maintenance log rows | Separate unique assets, inspections, failed checks, fault cases and work actions |
| Quarter | Server derives quarter/year from `logged_date` | Explicit reporting period independent of actual visit date |
| Offline | IndexedDB log/photo queues and retry loop | Per-item acknowledgements, idempotency, retained failures, actor ownership and attachment association |
| Reports | Quarterly DOCX generator and editable narrative preview | Four quarterly report-officer slots, annual composite, editable drafts and reproducible final versions |
| Authentication | Email + 4-6 digit PIN, bcrypt, KV bearer sessions | Staff ID sign-in, controlled provisioning, rate limits/lockout, revocation and protected sessions |
| Design | Dark technical surfaces, JetBrains Mono, neon status accents, circuit patterns | SmartGate OHCS branding, hierarchy and spacing while retaining technical work surfaces |

Priority source references:
- `web/src/pages/FieldLogPage.tsx`: equipment/challenges remain UI state; online logs omit status while offline records set completed; server bulk-sync errors do not prevent the success screen.
- `web/src/context/OfflineContext.tsx`: pending IDs are omitted from uploads; all pending logs are cleared after an HTTP success regardless of per-record errors; photo queue is cleared after best-effort uploads without linking returned URLs.
- `api/src/routes/maintenance.ts`: date-derived reporting quarter; bulk insert generates IDs when absent and returns partial errors with HTTP 200. It also marks bulk entries offline regardless of their actual origin.
- `api/src/services/aggregator.ts`: log-count summaries and some current-fleet queries need historical snapshots for reproducible reports.
- `api/src/routes/reports.ts`: quarter-only generation; generated/reviewed/approved schema values do not by themselves implement an approval workflow.
- `api/src/routes/auth.ts`, `api/src/middleware/auth.ts`: email-based identity and cached session roles; account activation/role changes require session revalidation.

## 3. Supplied October schedule: transcription for confirmation

These are five assignment groups covering 21 distinct listed rooms, not 21 known devices. Preserve source labels until reconciled with the organisation directory. In particular, do not silently map CSC or RSIM to a different unit.

| Visit date | Directorate labels as supplied | Rooms | Assigned team |
|---|---|---|---|
| Thursday 1 October 2026 | PBMED, RCU, RTDD | 31, 32, 12, 48, 9, 11 | Carl, Ajaab, Annette, Mubarak |
| Thursday 1 October 2026 | CMD, CSC, RSIM | 33, 34, 44, 24, 19, 21 | Osborn, Anthony, Theo, Aklotsoe |
| Date boundary requires confirmation | F&A | 2, 3, 4, 52, 54 | Henrietta, Gloria, Carl, Osborn |
| Friday 2 October 2026 | F&A | 35, 39 | Carl, Osborn, Ajaab, Henrietta |
| Friday 2 October 2026 | F&A | 49, 51 | Anthony, Annette, Mubarak, Gloria |

Grouped directorates do not establish a room-to-directorate mapping. Resolve from the room registry or coordinator review; never assign the entire group's rooms to its first directorate. Short names need administrator-confirmed staff matches before account linkage. Store this as a draft schedule until resolved.

Confirmed by the user: Q3 2026 with actual execution on 1-2 October. Never backdate observations into September to force report inclusion. Represent the quarter covered, scheduled visit date, actual visit timestamp and report submission deadline separately.

## 4. Core workflow

1. Coordinator creates the exercise with reporting year/quarter, scope, dates and participating teams; the quarter's scheduled report officer comes from the four-slot yearly schedule.
2. Each participating officer sees My Assignments, ordered rooms, prior unresolved faults and a download-for-offline action. Recording, equipment checks and technical work can be shared within the team without requiring every officer to perform every task.
3. Opening a room records a visit. Show expected registered equipment; allow controlled quick registration of discovered devices, recording serial/tag and room. Missing assets and inaccessible rooms need explicit reasons.
4. Scan QR or search asset tag/serial. Select the device checklist. Record each result as pass, fail, not tested or not applicable, with reasons for untested required items. No preselected passes.
5. Record before condition, maintenance actions, faults, evidence and post-maintenance functional test separately. An inspection may be complete while the device remains faulty.
6. A failed check can open a fault case with severity, owner, due date, parts requirement and next action. Carry its stable case ID across quarters until a verified closure.
7. Close the visit with tested/missing/unavailable totals and any relevant access notes. No mandatory sign-off or separate reviewer is needed.
8. The scheduled report officer checks completeness, edits narratives, previews tables and selects Generate final report. No submission-for-approval stage. Subsequent corrections generate a new identifiable version.

Room states: scheduled, in progress, visited with exceptions, completed, inaccessible, revisit required. Device outcome: functional, functional with limitations, nonfunctional, not tested. Workflow completion must never imply equipment functionality.

## 5. Practical checklists

PC/laptop: boot and sign-in, user-reported symptoms, visible physical condition, power/charger/UPS, display/keyboard/mouse, storage capacity and available drive-health evidence, updates/security status, network/shared resources, required work applications, cleaning/ventilation, laptop battery where applicable, final functional check.

Printer: power/display errors, connectivity and intended workstation access, queue/spooler, test page, legibility/alignment, paper feed/jams, toner/ink, duplex and scan/copy where supported, maintenance action, final print verification. Distinguish unavailable consumables from a mechanical fault. Meter readings are optional with units and date.

Record a method/tool and observation timestamp for diagnostic evidence. Unsupported sensors or inaccessible settings produce unknown/not tested, never an automatic failure or pass. Avoid passwords, personal documents and unnecessary staff data in screenshots.

## 6. Reporting and annual responsibility

Maintain exactly four quarterly schedule slots per year, each with one scheduled report officer and an optional due date. The same officer may occupy more than one quarter. Assignment gives scoped reporting permission without making the officer a global administrator. Keep simple reassignment history. No required deputy, reviewer, approver or separate annual owner. An authorised scheduled report officer or administrator can generate the annual composite.

Quarterly report sections follow the 2026 Q1 sample: introduction/objectives, methodology, maintenance and servicing details, OHCS helpdesk activities, challenges, recommendations and conclusion. Preserve monthly routine/emergency tables and the corrective category summary. Add a short executive summary, actual room/device coverage, before/after outcomes, unresolved actions and a compact team/compiled-by record. Detailed evidence belongs in an optional annex. See `2026-09-30-report-output-contract.md` for the full output and data contract.

Generate all titles, quarter labels and date ranges from one period object. The supplied 2024 Q4 sample has an objectives paragraph referring to July-September; reuse its structure, not its stale text or unsubstantiated conclusions.

Required metrics:
- Scheduled versus visited rooms; inaccessible/revisit rooms reported separately.
- Planned assets versus inspected assets, plus discovered/missing assets. An unknown baseline must remain unknown.
- Distinct devices inspected, checks performed and maintenance actions as separate measures.
- Functional before and after, restored during the exercise, still faulty and untested.
- New, carried-over, resolved and outstanding fault cases with owners and parts needs.

Annual report uses explicit versions of final quarterly snapshots. Show quarterly visits and annual unique assets separately. Track one recurring fault by case ID rather than counting four quarterly appearances as four new faults. Missing quarterly records are visibly incomplete; historic imports need provenance and reconciliation. Final generation preserves the report's data, narratives, template version and artifact; corrections create a new version. This is document versioning, not approval. Historical aggregate reports cannot establish annual unique-device counts without device-level evidence.

AI may draft prose from bounded structured evidence. Arithmetic and tables are deterministic. Each factual narrative claim must trace to source records. Provide a template-only fallback when AI is unavailable. Unknown costs and missing evidence remain unknown. Support quarterly DOCX first; add a verified PDF rendering path later. Do not claim performance or productivity improvements without measurements.

## 7. Staff ID and PIN

User decision pending: familiar Staff ID + separate ITEMS PIN, or the exact existing SmartGate/Attendance credentials.

Recommended near-term design: administrator-linked unique staff IDs on existing technician records, with existing record IDs preserved; controlled PIN setup/reset and forced reset of issued temporary credentials. Confirm actual staff identities rather than guessing from first names. Email becomes contact metadata, not the login key. Remove unauthorised self-provisioning.

Protect the small PIN search space with identifier/IP rate limiting and escalating lockout; use generic failed-login messages, secure hashing and session revocation. Align with SmartGate's HttpOnly cookie approach using a verified same-site/same-origin deployment arrangement; include CSRF/origin checks. Do not assume cross-site cookies between pages.dev and workers.dev will work reliably.

Exact existing credentials require a deliberate shared identity integration with audience-bound sessions and ITEMS-specific permissions. Do not copy PIN hashes or let ITEMS blindly trust SmartGate roles. That integration is a separate dependency and must not destabilise either existing application before the exercise.

## 8. Visual direction

SmartGate reference: `packages/web/src/styles/tokens.css`, `packages/staff/src/tokens.css`, and each application's login page. Shared language: forest green, restrained gold, warm light surfaces, OHCS branding, DM Sans body typography and consistent rounded cards.

For ITEMS: retain dark graphite technical panels, JetBrains Mono asset IDs/metrics, circuit motifs and restrained green/cyan diagnostic accents. Adopt the OHCS header, sign-in composition, spacing and navigation hierarchy. Use serif display type only where it supports institutional headings, not throughout technician forms. Keep light mode for office/daylight work and dark mode for the technical dashboard. Define primitive/semantic/component tokens within the existing Tailwind 3 app; do not copy Tailwind 4 directives from SmartGate verbatim.

Prioritise My Assignments, Room Visit, Device Check and Report Workspace. Show truthful offline/sync status. Make login immediately available instead of waiting for a decorative boot sequence. Verify contrast, keyboard flow, reduced motion and usable mobile touch targets.

## 9. Additive data and API plan

Retain equipment, existing technician account IDs and historical maintenance logs. Expose accounts as RSIMD officers/team members in the product, with optional job title separate from permissions; avoid a disruptive table rename. Add exercises; normalized rooms; exercise route groups and room assignments; team memberships; room visits; versioned checklist templates; inspections and results; fault cases and actions; four yearly report assignments; report versions; evidence associations. Do not add approval tables or approval roles.

Add nullable staff ID with a unique index, and nullable exercise/inspection links on existing logs. Keep legacy date-derived quarter data intact until explicit mapping is reviewed; report queries distinguish legacy records from exercise-attributed work and avoid double inclusion.

Each submitted inspection has a stable client operation ID, actor ID, exercise ID, device ID, template version and revision. Enforce idempotency on the server; atomic writes for an inspection and its dependent results. Return accepted/duplicate/rejected IDs. Delete only acknowledged local queue entries, leaving newer or rejected entries intact. Partition queues by user; signing into another account must not reattribute another technician's work. Preserve timestamps and attachment IDs through retries. Concurrent edits require conflict handling, not silent overwrite.

Proposed route families: `/exercises`, `/exercises/:id/assignments`, `/visits`, `/inspections`, `/inspections/sync`, `/faults`, `/report-assignments`, `/reports/:id/finalize`, `/reports/annual`. Match the existing router; a framework rewrite is unnecessary. Keep legacy report status values readable but introduce no new review/approval transitions.

## 10. Delivery sequence and verification gates

### Release A: priority candidate for the 1-2 October exercise

1. Repair submission and offline data loss first: equipment/challenges/notes/evidence, consistent statuses, validated partial results, idempotent retries and stable attribution.
2. Add explicit exercise reporting period, route/room assignments and PC/printer inspections including healthy devices and unresolved outcomes.
3. Add Staff ID sign-in using the selected identity model, verified account mapping and controlled migration. If shared identity cannot be tested in time, explicitly defer it rather than make a last-minute authentication switch.
4. Adapt quarterly export and give the Q3 compiler an evidence-completeness view. Apply focused OHCS visual alignment to login and field workflow.

No guarantee of tomorrow readiness before implementation and rehearsal. Use existing printable field forms as a continuity option with unique visit/device references and later checked import; do not describe unsaved browser input as safe.

### Release B: complete quarterly and annual reporting

Four-slot yearly report-officer schedule, final report versioning, annual composite, Q1/Q2 historic import, parts/action register, revisit scheduling and the full design alignment.

### Release C: evidence-assisted diagnostics

Optional read-only Windows collector exporting a locally reviewed JSON file for import: device identity, OS, selected storage/battery/update/security observations where available. No automatic repairs or remote command execution. A browser cannot directly run arbitrary local PC diagnostics. Validate file schema, size, provenance and asset matching; imported findings remain technician-verifiable evidence. Printer diagnostics stay based on actual test results, with network monitoring considered separately.

High-value later features: repeat-fault detection, prior-quarter comparison, procurement shortlist from unresolved cases, QR device history and report readiness checks. Use explainable rules before predictive claims.

Acceptance gates for Release A:
- A healthy PC and a faulty printer in the same room are both counted correctly; inspection completion does not mark the printer repaired.
- An October visit assigned to Q3 appears exactly once in Q3 exercise reporting while its actual date remains October.
- Device rows, challenges, general notes and attachments survive save/reload.
- Offline reload, partial failure, lost response/retry, new entries during sync and changed signed-in user do not lose, duplicate or reattribute records.
- Correct Staff ID login, wrong PIN, lockout, inactive user, role changes and unauthorised report actions are tested.
- DOCX counts reconcile with source records; report generation works without AI.
- Mobile room workflow is rehearsed with a technical officer, an administrative participant and the scheduled report officer using local synthetic records, then verified in the authorised deployed environment.

Release B gates: deduplicated annual asset/fault totals where underlying identities exist, visible missing quarters, preserved final snapshots, versioned amendments and simple report-officer reassignment history. A scheduled officer can generate a report without any deputy/reviewer/approver configuration.

## 11. Decisions still needed

1. Q3 attribution for the October exercise is confirmed. The report submission deadline remains to be configured separately.
2. Confirm separate ITEMS PIN versus exact shared credentials.
3. The Q3 scheduled report officer can be selected during setup; the four quarterly slots are the only report assignments. No additional report roles are required.
4. Confirm the ambiguous F&A visit date and directory mapping for grouped rooms, CSC/RSIM labels and staff short names.

The proposed structure can be reviewed now. Operational imports, identity integration and final scope depend on these answers; no invented account IDs, PINs, assignments or completion records should be seeded.
