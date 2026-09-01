// Push + notificationclick only — deliberately no caching/fetch handling here,
// so this never risks serving stale content after a deploy.

self.addEventListener("push", (event) => {
  let payload = { title: "EvoTasks", body: "" };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "EvoTasks", body: event.data.text() };
    }
  }

  const options = {
    body: payload.body || "",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    data: { url: payload.url || "/" },
    // Stickier, alarm-style notifications (e.g. Atelier status pings) —
    // stays on screen until dismissed and vibrates in a distinct pattern,
    // instead of the default auto-clearing behavior used everywhere else.
    ...(payload.alarm ? { requireInteraction: true, vibrate: [300, 100, 300, 100, 300] } : {}),
  };

  event.waitUntil(self.registration.showNotification(payload.title || "EvoTasks", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
