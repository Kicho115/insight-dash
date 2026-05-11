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
| Conversational dashboard from chatbot | ❌ | ❌ |
| Static dashboard generation | ✅ | ✅ |

---

## ❌ Confirmed bugs

### Row count off-by-one
- **Formats:** CSV and XLSX
- **Description:** `numberOfRows` includes the header row in the count. A file with 1 header + 10 data rows reports `numberOfRows: 11`.
- **Code:** `getCsvMetadata` in `src/lib/helpers/parseFiles/index.ts:14` — `rows.split("\n").length` includes the header. `getExcelMetadata` in the same file — `range.e.r - range.s.r + 1` includes row 0 (header).
- **Impact:** Cosmetic — the number shown in the UI does not reflect the actual data rows.

### Single-column CSV: AI treats all values as headers
- **Formats:** CSV
- **Description:** When a CSV has a single column with similar text values, `getHeadersFlow` cannot distinguish the header row from data rows and returns all rows as headers. Example: a CSV `country\nMexico\nColombia\nPeru` returns `headers: ["country","Mexico","Colombia","Peru"]` instead of `["country"]`.
- **Code:** `src/services/genkit/flows/getHeaders.ts` — the AI lacks enough context to differentiate when there is only one text column.
- **Impact:** Functional — the dashboard is generated with incorrect columns.

### Conversational dashboard returns empty charts and KPIs
- **Formats:** CSV and XLSX
- **Description:** The `/api/files/[fileId]/chat-dashboard` endpoint responds 200 but returns `kpis: [], charts: []`. The `<generate-dashboard/>` token is emitted correctly for specific requests (e.g. "Show me the sales trend by month in a line chart"), but the final JSON has no content.
- **Possible cause:** The E2B sandbox runs the generation code but does not return the output correctly, or there is a parsing issue with the sandbox result.
- **Impact:** Functional — the user sees a blank dashboard even when the dataset has data and the request is specific enough.

---

## ⚠️ Known limitations (not implemented)

### Sheet selection in XLSX
- Only the first sheet of the workbook is analyzed. There is no UI for the user to choose a different sheet.
- If the relevant data is on sheet 2 or 3, the dashboard is generated with incorrect data and no warning is shown.

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
