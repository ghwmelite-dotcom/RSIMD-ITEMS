# Offline team maintenance forms (Word and Excel)

Deployed to production on 30 September 2026, including the additive database migration, API and website. Open [Team forms](https://rsimd-items.pages.dev/team-forms). See [release evidence](releases/2026-09-30-team-forms.md) for verification and remaining limits.

## Use

### Word form — recommended for mixed teams

Enter the team name and participating officers, choose the number of device pages, then select **Download Word form**. The cover and visit pages show the entered team details. Read the separate filled example first, type in the cream answer boxes, and keep the questions/table headings intact. Use everyday answers such as **Working**, **Working with a problem**, **Not working**, or **Not checked**. Equipment types and office codes are explained in the document.

Complete one room table per visit and one device table per device. Copy a whole table for more entries. Blank device tables (including location-only prefills) are ignored, but partially completed device answers are retained for validation. The example is never imported. Team observations have their own table. Only answers inside the form tables are imported; the preview shows the extracted evidence before saving.

Upload the completed `.docx` under **Completed Word or Excel form**, review the preview and save. It uses the same server validation, duplicate protection and report integration as Excel. Keep actual October dates when reporting the Q3 exercise. Printed handwriting must be transcribed; scanned forms are not automatically interpreted. Accept tracked changes before upload. Use the generated form, not an unrelated Word document.

### Excel alternative

1. Open **Maintenance > Team forms** (also in the desktop sidebar).
2. Select the reporting year/quarter, enter the team name and participating officers, and optionally select a schedule to prefill rooms and visit dates.
3. Download the Excel workbook. It opens on **Team**, with the entered team name and members in place; these are also repeated on **Instructions** and print headers. Complete the cream input cells on **Team**, **Rooms** and **Devices**. Use the directory codes on **Directory**. **Instructions** contains an example that is never imported. If distributing copies of one blank file, give each team a distinct team name; each named copy can be uploaded independently.
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
- No raw XLSX or DOCX is sent to the server. The browser parses it; the server validates and stores normalized evidence and a digest. Keep the original file locally. Both formats are limited to 2 MB compressed/15 MB declared expanded size.

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

Word/prefill update: 25 application tests pass, including seven new Word/prefill checks (team metadata, plain-language conversion, split Word text runs, unused/example exclusion, copied/partial tables and invalid documents). The browser rehearsal now covers both Excel and Word download, entered team names, completion, preview without writes, save and duplicate replay at desktop/mobile sizes. A DOCX browser renderer was used to inspect the cover, filled example and device page; native Microsoft Word pagination is not verified. A blank Word copy is included beside the Excel form in `docs/forms`; in-app exports use the live directory and entered team details.

18 automated tests pass: validation, Q3/October attribution, inaccessible rooms, duplicate observations, shared blank files used by different teams, preview without writes, save/replay, immutable content, SQLite rollback, inactive/anonymous users, oversized inputs, missing migration, Excel round trip, formula rejection and generated DOCX evidence.

Frontend production build and both TypeScript checks pass. Worker dry-run bundles successfully. A Chrome rehearsal against in-memory SQLite passed download, workbook completion, preview, save and repeated upload at desktop/390px mobile sizes. The standalone workbook was also read with openpyxl (five sheets, no formulas, no example device records). Word output contents were checked in its XML; native Word pagination has not been visually verified. These are local checks, not production verification.
