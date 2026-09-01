// Client-safe (no server/db imports, unlike threeCxApi.ts/threeCxAuth.ts)
// — the 3CX web client's own documented deep-link format for pre-filling
// its dialer: https://<pbx>/webclient/#/call?phone=<number>. It still
// requires one manual click on the client's own "Call" button once it
// opens; there is no way to make it dial automatically without the
// (unavailable, Enterprise-only) Call Control API — see
// workshopCallAutomation.ts for that story.
export function threeCxWebClientCallUrl(pbxUrl: string, phone: string): string {
  return `${pbxUrl.replace(/\/+$/, "")}/webclient/#/call?phone=${encodeURIComponent(phone)}`;
}
