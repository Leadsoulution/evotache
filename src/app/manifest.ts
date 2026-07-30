import type { MetadataRoute } from "next";

// Bump this whenever the icon files change — Android/desktop PWA installs
// cache the manifest aggressively, and a changed URL is the most reliable
// way to get them to notice the icon is different on their next check.
const ICON_VERSION = "2";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EvoTasks",
    short_name: "EvoTasks",
    description: "Organisez. Planifiez. Réussissez.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e2231a",
    icons: [
      { src: `/pwa-icon-192.png?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/pwa-icon-512.png?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
