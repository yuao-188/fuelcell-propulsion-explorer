const CACHE_NAME = "fuelcell-propulsion-v5-thermal-2";

async function discoverCoreAssets() {
  const response = await fetch("./index.html", { cache: "no-cache" });
  const html = await response.clone().text();
  const paths = ["./", "./index.html", "./manifest.webmanifest"];
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const path = match[1];
    if (path.startsWith("./")) paths.push(path);
  }
  return { response, paths: [...new Set(paths)] };
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const { response, paths } = await discoverCoreAssets();
    await cache.put("./index.html", response);
    await cache.addAll(paths.filter((path) => path !== "./index.html"));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    }
    catch {
      return (await caches.match("./index.html")) || Response.error();
    }
  })());
});
