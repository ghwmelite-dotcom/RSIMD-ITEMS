# Team maintenance forms: production release

Released 30 September 2026 to the OHCS Cloudflare account.

- Source commit: `68eed86` on `main`, pushed to GitHub.
- Website: https://rsimd-items.pages.dev/team-forms
- Pages deployment: https://33171642.rsimd-items.pages.dev
- API: https://rsimd-items-api.ohcsghana-main.workers.dev
- Worker version: `ed8f1642-2081-4884-9dad-41d4ce195f34`
- Service worker cache: `rsimd-items-v6-team-forms`

## Database and recovery

Applied `api/src/db/migration-004-team-forms.sql` before API/frontend deployment. Both new tables and indexes were verified. Existing counts remained technicians 3, maintenance_logs 0, reports 0. No synthetic production records were created.

Cloudflare D1 Time Travel bookmark immediately before migration:
`00000007-00000000-000050f6-60d3523f0f4ec492b7e2ac34887da7e8`

Post-migration bookmark:
`00000007-00000006-000050f6-086ac3122defd1207c6a909b3060805e`

A local full-database export was rejected by automatic approval review because it would copy potentially sensitive production data. It was not performed. Recovery protection uses Cloudflare's in-place Time Travel instead. Do not restore blindly after new maintenance returns are submitted: restoring an earlier database state would discard subsequent writes.

## Verification

- 18 automated tests passed; API and frontend TypeScript checks passed.
- Frontend production build passed with Tailwind styles (45.45 kB CSS); workbook code loads separately on demand.
- Local Chrome/SQLite rehearsal passed download, completion, preview without writes, save and duplicate replay on desktop and 390px mobile.
- Production API health returned 200 with status ok.
- Production team-forms page, main JS/CSS, lazy workbook chunk and updated service worker returned 200.
- Anonymous preview/import requests returned 401; frontend-origin preflight returned 204 with the correct allowed origin.
- A fresh Chrome session reached the production login screen from /team-forms with no JavaScript page errors.

Authenticated upload/report generation was exercised locally, not against a signed-in production account. Native Word pagination remains visually unverified. Existing build-size warnings and legacy dependency advisories remain separate follow-up work.

## Scope

This release delivers offline Excel collection, validated preview/import, duplicate protection, and quarterly report evidence/annex integration. Q3 attribution can retain actual October dates. It does not deliver the broader proposed SmartGate visual redesign, Staff ID/PIN migration, annual composite workflow or report-officer assignment redesign. Existing authentication and report permissions remain in use.

For teams: open Team forms, choose Q3 2026, download and complete the workbook, then upload, review and save. Give each team a distinct name when distributing copies of a single blank workbook. Saved returns are immutable in this release; check discrepancies before saving.
