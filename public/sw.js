// Service worker do Web Push — só isto, nada de cache/offline (a app é SSR
// contra um servidor a correr, ver capacitor/README.md; um SW "completo"
// com estratégia de cache é outra tarefa). Registado só na web (nunca na
// app nativa, ver src/lib/push-notifications.tsx) porque é isso que
// permite receber notificações com a aba/app fechada — sem SW, o Push API
// nem dá para subscrever.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Corpo não é JSON (não devia acontecer — o backend envia sempre JSON,
    // ver PushNotificationService) — mostra pelo menos o texto cru.
    payload = { title: "Luku", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Luku";
  const options = {
    body: payload.body || "",
    icon: "/notification-icon.png",
    badge: "/notification-icon.png",
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Toca na notificação -> foca uma aba já aberta nesse caminho, ou abre uma
// nova. `url` vem do backend (ver PushNotificationService::urlFor) — só ele
// sabe se esta notificação é a cópia do cliente ou a do restaurante.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetPath) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
      return undefined;
    }),
  );
});
