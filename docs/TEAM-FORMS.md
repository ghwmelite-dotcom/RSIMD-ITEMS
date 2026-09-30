# Offline team maintenance forms

Implemented locally on 30 September 2026. Production activation requires the additive database migration and deployment; this document does not claim they have occurred.

## Use

1. Open **Maintenance > Team forms** (also in the desktop sidebar).
2. Select the reporting year/quarter, enter the team name and participating officers, and optionally select a schedule to prefill rooms and visit dates.
3. Download the Excel workbook. Complete the cream input cells on **Team**, **Rooms** and **Devices**. Use the directory codes on **Directory**. **Instructions** contains an example that is never imported. If distributing copies of one blank file, give each team a distinct team name; each named copy can be uploaded independently.
4. Keep Q3 2026 as the reporting period for the 1-2 October exercise. Keep actual October visit dates in the room/device rows.
5. Save the completed `.xlsx`, return to **Team forms**, and upload it for preview. Correct validation errors in the file and upload again. Review the complete evidence, then select **Save records**.
6. The quarterly Word report includes a dated team-exercise section and detailed evidence annex, separately from the existing monthly maintenance activity counts. Report preview shows how many team returns will be included.

This is for all participating RSIMD officers, not only technicians. It adds no deputy, reviewer or approver roles. Existing report-generation permissions remain unchanged in this increment.

## Recording rules

- One room row per room/date; one device row per asset/date. Include healthy PCs/printers, not just faults.
- Asset reference must be an actual unique asset tag or serial. A generic name such as PC 1 is insufficient. This release retains the supplied reference; it does not automatically register equipment or change its registry status.
- A device must match a visited/revisit room and actual date. An inaccessible room can be recorded with a reason and no devices.
- Record what was checked, work performed, condition before/after and final functional test. Explain untested/limited/nonfunctional outcomes.
- Challenges, recommendations and optional helpdesk observations are retained with the team return and appear in the annex.
- Printed forms may be used, but answers must be transcribed into the workbook. Images/scanned handwriting are not automatically interpreted.

## Integrity and limits

- 50 room rows and 100 device rows per workbook; 2 MB compressed/15 MB declared expanded XLSX and 1 MB submitted JSON.
- Plain text input only: no formulas, hyperlinks or macros in imported cells. Do not alter headers, sheet names or the workbook ID. Keep completed rows together.
- Preview performs no writes. Save validates again and is atomic. An identical saved workbook is a no-op, including after a lost response/retry.
- Changed saved content under the same workbook ID and team name is rejected. Overlapping room/date or device/date records in another workbook/team are also rejected, even if the reporting quarter was changed. This prevents silently recording the same visit twice.
- Saved returns are immutable in this increment. There is no amendment/deletion UI yet; reconcile discrepancies before saving. Do not change IDs or asset references to force a correction through.
- Uploader identity is stored separately from the participant/checker names in the file. Files do not establish that a named officer authenticated individually.
- No raw XLSX is sent to the server. The browser parses it; the server validates and stores the normalized evidence and digest. Keep the original workbook locally.

## Activation and verification

Apply `api/src/db/migration-004-team-forms.sql` to the intended database before enabling imports. Fresh local installs include it in `api/src/db/schema.sql`. No existing tables are rebuilt. When the migration is absent, uploads return a clear unavailable response; legacy reports still run without team returns.

Build and verify using:

```text
npm test --workspace=api
node node_modules/typescript/bin/tsc --noEmit -p api/tsconfig.json
npm run build:web
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config api/wrangler.toml
node scripts/export-team-form.mjs
```

`scripts/smoke-team-forms.mjs` runs a browser download/fill/preview/save/replay rehearsal against an in-memory SQLite database. It blocks outside browser requests and uses only synthetic accounts/equipment. Set `PLAYWRIGHT_MODULE` if Playwright is available through an external runtime; set `CHROME_PATH` if needed. Screenshots and temporary workbooks go under ignored `.wrangler/team-forms`.

The standalone blank Q3 file is `docs/forms/OHCS-Q3-2026-Team-Maintenance-Form.xlsx`. Its reference directory comes from the local seed, not verified live data. In-app exports use the current accessible directory. Run the export script again only if a new blank workbook with a new ID is needed.

ExcelJS loads on demand when downloading or reading a workbook. Its UUID dependency is overridden to the patched 11.x release; no test server is exposed. Existing Vite/Wrangler and other repository dependency advisories still need their own upgrade review.

## Local verification evidence

18 automated tests pass: validation, Q3/October attribution, inaccessible rooms, duplicate observations, shared blank files used by different teams, preview without writes, save/replay, immutable content, SQLite rollback, inactive/anonymous users, oversized inputs, missing migration, Excel round trip, formula rejection and generated DOCX evidence.

Frontend production build and both TypeScript checks pass. Worker dry-run bundles successfully. A Chrome rehearsal against in-memory SQLite passed download, workbook completion, preview, save and repeated upload at desktop/390px mobile sizes. The standalone workbook was also read with openpyxl (five sheets, no formulas, no example device records). Word output contents were checked in its XML; native Word pagination has not been visually verified. These are local checks, not production verification.
