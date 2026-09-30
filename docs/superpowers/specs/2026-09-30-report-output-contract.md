# OHCS quarterly and annual maintenance report output contract

Date: 30 September 2026
Status: implementation specification, not a generated operational report.
Primary reference: user-supplied `2026 FIRST QUARTER MAINTENANCE REPORT.docx`.

## Confirmed operating model

The entire participating RSIMD team performs the exercise: technicians, IT officers, administrative officers and other assigned officers. Each year has four scheduled report-officer slots, one per quarter, with at most four distinct officers. The scheduled officer compiles the quarter's contributions and produces the report. No deputies, reviewers, approvers or approval chain. Report actions are draft, preview/edit and generate final; amendments create another version.

Reports are the primary outcome. Do not force staff through unnecessary workflow stages to get an accurate, complete document. Technical responsibility, data-entry attribution and quarterly report ownership remain distinguishable.

## What the Q1 reference establishes

- Cover: RSIMD, year/quarter, IT Equipment Maintenance and Servicing Report, publication month (April 2026 for Q1).
- 1.0 Introduction and 1.1 Objectives: directorate mandate and reporting period.
- 2.0 Methodology: condition-based, routine, corrective, emergency and predictive maintenance.
- 3.0 Details: subsections 3.1-3.5, routine monthly category table, corrective category quantities, a directorate breakdown section and emergency monthly table.
- 4.0 OHCS Helpdesk Activities: context for service requests and interruptions to the helpdesk channel.
- 5.0 Challenges; 6.0 Recommendations; 7.0 Conclusion.
- Scope can include CCTV and clock-in devices as well as PCs, printers, networks and accessories.

The sample's routine numeric entries sum to 118, corrective entries to 35 and emergency entries to 8. These are separate reported activity quantities, not demonstrated unique devices. Do not combine them into a device count or import them as new live records without an explicit historic-import action.

## Improved document structure

| Section | Generated output | Data source |
|---|---|---|
| Cover | OHCS/RSIMD branding, report title, quarter covered, exercise dates if different, issue date, compiled by, version | Reporting period, exercise, scheduled officer, report version |
| Executive summary | Concise coverage, device outcomes, major unresolved issues and management actions | Verified aggregate data and editable summary |
| 1.0 Introduction / 1.1 Objectives | Mandate, scope and accurately generated period labels | Controlled text plus actual scope |
| 2.0 Methodology | What was actually performed, on-site/remote/hybrid method, participating teams, limitations | Visits, action records, team roster |
| 3.1 Condition-based | Observed conditions, checks, limitations and resulting actions | Inspection evidence |
| 3.2 Routine | Category-by-month table plus separate quarterly exercise coverage and results | Recorded work quantities; exercise visits/inspections |
| 3.3 Corrective | Category/quantity summary, actual directorate/room breakdown, fixes and outstanding faults | Actions, room records, fault cases |
| 3.4 Emergency | Category-by-month counts and significant incidents/outcomes | Emergency records |
| 3.5 Predictive | Evidence-supported trends/measurements and planned action; state when not recorded | Repeated measurements or documented analysis |
| 4.0 Helpdesk | Requests by channel, resolution status, significant service interruptions | Entered/imported requests, source references and officer narrative |
| 5.0 Challenges | Evidence-linked constraints and operational impact | Structured challenges and unresolved records |
| 6.0 Recommendations | Priority, requested action/item, quantity when known, reason, outstanding need | Recorded parts needs, fault evidence, officer edits |
| 7.0 Conclusion | Actual outcomes, unresolved limitations and next steps | Report evidence and editable conclusion |
| Optional annex | Teams/schedule, asset-level results and selected evidence | Exercise and source records |

Use the sample's numbering for continuity. Keep the summary short and tables readable on A4, with repeated table headers, page numbers, restrained forest-green/gold branding and no dark application backgrounds in the printable document. Narratives remain editable. Export a real DOCX with consistent styles; PDF is a separate rendering deliverable requiring visual verification.

## Mandatory table contracts

1. Routine/emergency monthly table: category, each of the quarter's three month names, quarter total. Structured quantity and unit required; never infer quantities from free-text phrases or count one category log as multiple devices.
2. Room coverage: directorate/unit, room, visit date/mode, PCs checked, printers checked, other equipment checked, functional after maintenance, limited/nonfunctional, not tested, key outstanding issue. Define the columns' device populations consistently; do not conflate a room visit with an asset inspection.
3. Corrective summary: category, cases/actions count (explicit unit), resolved, unresolved. Retests do not become new fault cases.
4. Actions/recommendations: priority, issue, location/device when known, recommendation, quantity/unit if known, status/next step. Costs optional; unknown is not zero.
5. Helpdesk summary: channel (Smart Workplace, phone, in person, other), received, resolved, pending; only calculate where records exist. An unavailable source is labelled unavailable, not zero requests.

For supplied historic tables, a dash means unspecified until clarified. Preserve raw values and mark their interpretation instead of silently converting every dash to zero. Historical manual activity quantities and modern device-level inspections are different evidence granularities.

## Period attribution: Q3 exercise in October

Store reporting period, actual activity timestamp and publication date separately. Q3 means July-September; the confirmed exercise occurs 1-2 October. Show both facts prominently.

Separate ordinary quarter activity from the delayed exercise in report queries and presentation. July-September monthly columns must not place an October inspection under September. Include the October exercise as its own clearly dated table/subsection in the Q3 report. Calendar activity views can still show the actual October work, but Q4 report compilation must not count the same exercise again as a Q4 exercise. Annual consolidation must deduplicate by source IDs, not by summing overlapping report tables.

## Drafting quality controls

- Derive every quarter/month/date label from the period model. The Q1 sample contains a third-quarter reference in its predictive section; it must not propagate.
- The sample's directorate-breakdown section contains a generic remote-maintenance activities table. Replace that with actual room/directorate evidence, keeping methodology examples separate.
- Record remote/on-site/hybrid mode. Do not imply physical cleaning occurred during a purely remote visit. Physical observations may still be recorded with their actual source/date.
- Do not copy allegations about software licensing, causation of breakdowns or productivity gains as recurring boilerplate. Require supporting observations or clearly attribute them as officer-reported findings.
- Template mentions of software/tools are examples from a historical document, not instructions to run registry cleaners, change firmware or alter devices.
- Preserve a distinction between preventive actions and evidence of prediction. Keeping a template heading does not justify inventing predictive analysis.
- AI is optional assistance for prose, never the source of counts or completion status. The template-only generator must remain usable without AI.
- Show missing evidence to the scheduled officer. Allow clearly labelled provisional output rather than falsely certifying complete coverage.

## Annual composite

Generate from explicit final versions of Q1-Q4. Include annual overview, quarter comparison, maintenance categories, service outcomes, recurring unresolved needs, helpdesk summary and prioritised recommendations. Retain source-quarter/version references.

No new annual-owner role is required. A scheduled report officer or authorised administrator can generate it. Missing quarters are visible; do not silently call an incomplete year complete. Where historical reports provide only aggregate counts, report those as activity totals and leave annual unique-device metrics unavailable unless an identity-level source supports them.

## Implementation tasks and acceptance examples

1. Expand report input types: reporting period, actual exercise dates, compiler identity, participant names/job titles, source availability, visit mode, structured quantities/units, device outcomes and helpdesk inputs.
2. Adapt aggregation: separate work-action quantities from distinct assets; retain source IDs and delayed-exercise attribution; preserve unknowns.
3. Replace stale/static narratives with period-aware controlled defaults. Add helpdesk and actual coverage tables to `api/src/services/report-generator.ts` and preview inputs.
4. Add four quarterly report-officer assignments; enforce one per year/quarter and permit the same person in several slots. Keep existing account IDs and expose inclusive team-member labels.
5. Let the scheduled officer edit draft sections and generate final DOCX. Save a data/narrative snapshot and template version. No approval endpoints or required approval fields.
6. Extend annual export after quarterly reconciliation passes.

Acceptance: one PC with three actions is one inspected PC and three actions; a completed check on a broken printer stays nonfunctional; a Q3 October visit stays dated October; a missing helpdesk source is unavailable; a repeat export of a final version preserves its data; all four quarterly slots work without deputies/reviewers/approvers; Q1 reference figures are never silently seeded as current records.
