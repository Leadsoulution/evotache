import type { MetadataRoute } from "next";

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
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
