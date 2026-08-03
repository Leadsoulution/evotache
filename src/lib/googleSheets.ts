import { getValidAccessToken } from "@/lib/googleAuth";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsFetch(url: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getValidAccessToken();
  const response = await fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Google Sheets API request failed (${response.status}): ${await response.text()}`);
  return response;
}

export async function getSpreadsheetTitle(spreadsheetId: string): Promise<string> {
  const response = await sheetsFetch(`${SHEETS_BASE}/${spreadsheetId}?fields=properties.title`);
  const data = (await response.json()) as { properties?: { title?: string } };
  return data.properties?.title ?? spreadsheetId;
}

export async function clearSheetValues(spreadsheetId: string, tabName: string): Promise<void> {
  await sheetsFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(tabName)}:clear`, { method: "POST" });
}

export async function updateSheetValues(spreadsheetId: string, tabName: string, values: string[][]): Promise<void> {
  if (values.length === 0) return;
  const range = `${encodeURIComponent(tabName)}!A1`;
  await sheetsFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

export async function getSheetValues(spreadsheetId: string, tabName: string): Promise<string[][]> {
  const response = await sheetsFetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(tabName)}`);
  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? [];
}
