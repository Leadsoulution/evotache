/** Shown in the Google Sheet settings panel for the user to copy into Extensions > Apps Script. Returns every row as a JSON object keyed by header text, so the app's column-mapping UI works regardless of the sheet's actual column names. */
export const APPS_SCRIPT_TEMPLATE = `// 1. Change SHEET_NAME to match your tab's name (bottom of the sheet).
// 2. (Recommended) set a SECRET_TOKEN and paste the same value in EVOTASKS.
// 3. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
// 4. Copy the Web app URL it gives you into EVOTASKS.

const SHEET_NAME = "Sheet1";
const SECRET_TOKEN = "";

function doGet(e) {
  if (SECRET_TOKEN && e.parameter.token !== SECRET_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const rows = values.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (header, i) {
      const cell = row[i];
      obj[header] = cell instanceof Date ? cell.toISOString() : String(cell);
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
