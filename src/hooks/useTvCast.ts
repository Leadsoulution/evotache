"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StartCastResult = { ok: true } | { ok: false; reason: "unsupported" | "cancelled" };

/** Casts a page to a nearby wireless display (Chromecast/Miracast-class
 * receiver) via the browser-native W3C Presentation API — no Google Cast
 * SDK to register, no external script, just the browser's own device
 * picker searching the local network for an available TV ("recherche par
 * tv qui disponible"). Support is Chromium-only (desktop Chrome/Edge,
 * secure context) — everywhere else `isSupported` stays false and the
 * caller should fall back to something else (e.g. "open in a new tab").
 * `url` is asked for at call time (not hook-creation time) so this stays
 * safe to call from a server-rendered "use client" component — nothing
 * here touches `window` before an actual click. */
export function useTvCast() {
  const [isSupported, setIsSupported] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const connectionRef = useRef<PresentationConnection | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(typeof window !== "undefined" && "PresentationRequest" in window && window.isSecureContext);
  }, []);

  useEffect(() => {
    return () => {
      connectionRef.current?.terminate();
    };
  }, []);

  const startCasting = useCallback(async (url: string): Promise<StartCastResult> => {
    if (!("PresentationRequest" in window) || !window.isSecureContext) return { ok: false, reason: "unsupported" };
    try {
      const request = new PresentationRequest(url);
      const connection = await request.start();
      connectionRef.current = connection;
      setIsCasting(true);
      const onStateChange = () => {
        if (connection.state !== "connected") {
          setIsCasting(false);
          connectionRef.current = null;
        }
      };
      connection.addEventListener("connect", onStateChange);
      connection.addEventListener("close", onStateChange);
      connection.addEventListener("terminate", onStateChange);
      return { ok: true };
    } catch {
      // The user closed the device picker without choosing a TV, or none
      // responded — not a real error, just "nothing happened".
      return { ok: false, reason: "cancelled" };
    }
  }, []);

  const stopCasting = useCallback(() => {
    connectionRef.current?.terminate();
    connectionRef.current = null;
    setIsCasting(false);
  }, []);

  return { isSupported, isCasting, startCasting, stopCasting };
}
