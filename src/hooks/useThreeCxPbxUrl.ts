"use client";

import useSWR from "swr";
import { fetchThreeCxPbxUrl } from "@/services/workshopApi";

/** The connected PBX's own hostname, needed to build "open the 3CX web
 * client with this number pre-filled" links — null if 3CX isn't
 * connected at all. Rarely changes, so a long refresh interval is fine. */
export function useThreeCxPbxUrl(): string | null {
  const { data } = useSWR<string | null>("workshop-threecx-pbx-url", fetchThreeCxPbxUrl, { refreshInterval: 5 * 60_000 });
  return data ?? null;
}
