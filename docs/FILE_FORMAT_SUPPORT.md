# File Format Support

Compatibility status for CSV and XLSX in metadata extraction and dashboard generation.

Last updated: 2026-05-10 — based on E2E and unit tests against the development server.

---

## ✅ Works correctly

| Scenario | CSV | XLSX |
|----------|-----|------|
| Normal file with headers in row 1 | ✅ | ✅ |
| Multiple columns (correct count) | ✅ | ✅ |
| Empty rows in the middle of the dataset | — | ✅ |
| Trailing empty columns | — | ✅ |
| Dates stored as serial numbers | — | ✅ |
| Dates stored as native Date objects | — | ✅ |
| Boolean columns | — | ✅ |
| Multiple sheets (uses first sheet only) | — | ✅ |
| Headers in row 2 with title in row 1 | — | ✅ |
| Formulas with cached value | — | ✅ |
| Conversational dashboard from chatbot | ✅ | ✅ |
| Static dashboard generation | ✅ | ✅ |

---

---

## ⚠️ Known limitations (not implemented)

### Sheet selection in XLSX
- Only the first sheet of the workbook is analyzed. There is no UI for the user to choose a different sheet.
- If the relevant data is on sheet 2 or 3, the dashboard is generated with incorrect data and no warning is shown.

### Row count inaccurate when headers are not in row 1
- For XLSX files where data starts after a title row (headers in row 2+), `numberOfRows` counts from the beginning of the sheet range, not from the detected header row. A file with 1 title row + 1 header row + 6 data rows reports `numberOfRows: 7` instead of 6.
- Fixing this requires knowing the header row position at metadata time, which is only determined after the AI header detection step runs.

### Formulas without cached value
- Cells with formulas that have no pre-calculated value (`.v` absent) are treated as empty.
- No error is thrown, but the cell value is silently lost.

### Multiple tables in a single sheet
- There is no logic to detect or separate multiple tables within the same sheet.
- Only the first table detected by the headers AI is considered.

---

## Test coverage

- **Unit tests:** `src/lib/helpers/parseFiles/parseFiles.test.ts` — tests XLSX/CSV parsing logic without depending on Firebase or the Gemini API.
- **E2E tests:** `c:/tmp/test-xlsx-e2e.mjs` and `c:/tmp/test-xlsx-retry.mjs` — tests the full flow against the development server with real Firebase authentication.
