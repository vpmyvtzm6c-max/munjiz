const CACHE_NAME = "munjiz-static-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith("munjiz-static-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // لا تتدخل في الطلبات غير التابعة للموقع أو غير GET
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // لا تخزّن طلبات تسجيل الدخول أو الصفحات ذات المعاملات
  if (url.search || url.pathname.includes("/auth/")) {
    return;
  }

  // الملفات الثابتة فقط
  const isStaticFile =
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/icon.svg");

  const isAppPage =
    url.pathname.endsWith("/munjiz/") ||
    url.pathname.endsWith("/munjiz/index.html") ||
    url.pathname === "/munjiz/" ||
    url.pathname === "/munjiz/index.html";

  if (!isStaticFile && !isAppPage) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        throw error;
      }
    })()
  );
});
