// Gas Delivery — Service Worker for Web Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "توصيل الغاز", body: event.data.text() };
  }
  const options = {
    body: payload.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || "gas-delivery",
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(payload.title || "توصيل الغاز", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
