/* T Messenger — service worker: پوستهٔ آفلاین + نوتیفیکیشن */
var VERSION = "t-sw-v2";
var SHELL = [
  "/",
  "/assets/index-Dk7welQn.js",
  "/assets/index-Nili4s7x.css",
  "/assets/icon-192.png",
  "/assets/chat-bg.webp"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return c.addAll(SHELL).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === VERSION ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* فقط فایل‌های ثابت کش می‌شوند؛ API هرگز کش نمی‌شود */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;

  if (url.pathname.indexOf("/assets/") === 0) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(function () { return caches.match("/"); })
    );
  }
});

/* نوتیفیکیشن: پوش بدون payload می‌آید، متن را از سرور می‌گیریم */
self.addEventListener("push", function (e) {
  e.waitUntil(
    fetch("/api/push/latest", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        var title = (d && d.title) || "T";
        var body = (d && d.body) || "پیام تازه";
        if (d && d.empty) { title = "T"; body = "پیام تازه"; }
        return self.registration.showNotification(title, {
          body: body,
          icon: "/assets/icon-192.png",
          badge: "/assets/icon-192.png",
          dir: "rtl",
          lang: "fa",
          tag: "t-msg",
          renotify: true,
          data: { url: d && d.convId ? "/c/" + d.convId : "/" }
        });
      })
  );
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(self.location.origin) === 0 && "focus" in list[i]) {
          list[i].navigate(target);
          return list[i].focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
