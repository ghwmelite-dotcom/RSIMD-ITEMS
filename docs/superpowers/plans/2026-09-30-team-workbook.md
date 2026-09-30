# Team workbook export/import

Implement the user's offline team form request as an XLSX round trip. Scope is export, validated preview, atomic import, retained evidence and quarterly Word-report integration; broader authentication and annual-report changes remain separate.

1. Browser-generated workbook: Instructions (including a non-imported example), Team, Rooms and Devices. Prefill selected quarter, team and optional schedule rooms; include editable cells and directory reference codes. Preserve actual visit dates independently of reporting quarter. No macros or required formulas.
2. Parse only the known schema, reject formulas/links in input cells, cap file/row/text sizes and validate on the server. Provide errors and a data preview before a separate Save action.
3. Persist canonical workbook data in an additive D1 table with an identity derived from workbook ID plus team name and a SHA-256 content hash. Different teams may fill copies of a shared blank file. An identical replay is a no-op. Changed content under the same team-copy identity is rejected with an explicit conflict. Atomic unique indexes on child device/room observation keys prevent duplicate copies under new workbook IDs; no partial import.
4. All active participating accounts may export/import; record uploader separately from the named team/checker. Do not give these actions report approval semantics.
5. Keep inspections outside legacy activity/fault counts. Report aggregation reads these records by explicit year/quarter and Word reports include the dated room visits, device outcomes, work, challenges and recommendations as a separate evidence section. Imported records do not change live equipment status.
6. Tests: parsing/validation, cross-quarter dates, duplicate/revised reuploads, transaction rollback on duplicate observations, missing-table rollout compatibility, generated workbook round trip, Word evidence and mobile UI. Use local synthetic data only.
7. Deliver a blank Q3 workbook immediately usable offline plus deployment/migration instructions. No remote data mutation or deployment in this implementation turn.

Initial limits: 2 MB compressed XLSX, 1 MB normalised JSON, 100 device rows and 50 room rows per workbook. Use another exported workbook for larger teams. Schema version 1. Saved uploads are immutable; corrections require a future explicit amendment feature rather than silently overwriting evidence.
