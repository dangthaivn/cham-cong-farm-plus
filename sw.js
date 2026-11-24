/* Service worker — Bảng chấm công Farm Plus (PWA).
 * Giao diện (app shell) chạy được offline; dữ liệu Sheets luôn lấy mới từ mạng,
 * khi mất mạng thì app dùng dữ liệu mẫu đã lưu trong app.js và báo rõ cho người dùng. */
const CACHE = "cham-cong-farmplus-v1";
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Dữ liệu Sheets (Apps Script): luôn thử mạng trước, không cache kết quả.
  if (url.hostname.includes("script.google.com") || url.hostname.includes("googleusercontent.com")) {
    event.respondWith(fetch(event.request));
    return;
  }
  // App shell: cache trước, mạng sau (cập nhật nền).
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
