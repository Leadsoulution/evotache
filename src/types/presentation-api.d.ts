/** Minimal ambient types for the W3C Presentation API — not included in
 * TypeScript's bundled DOM lib. Just enough for useTvCast.ts to launch
 * the browser's own "cast to a nearby display" device picker. Support is
 * Chromium-only (desktop Chrome/Edge over HTTPS), which is why every call
 * site feature-detects via `"PresentationRequest" in window` before
 * touching any of this. */

interface PresentationConnection extends EventTarget {
  readonly id: string;
  readonly url: string;
  readonly state: "connecting" | "connected" | "closed" | "terminated";
  close(): void;
  terminate(): void;
}

interface PresentationRequest {
  start(): Promise<PresentationConnection>;
}

declare const PresentationRequest: {
  prototype: PresentationRequest;
  new (urls: string | string[]): PresentationRequest;
};
