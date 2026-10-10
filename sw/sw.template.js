// Offline-first service worker. public/sw.js is GENERATED from this file by scripts/build-sw.mjs
// (it stamps a new version on every build, so users are told when an update exists).
//
// Install: download the page AND every script, stylesheet and font it uses.
// Fetch:   cache-first. Hashed build files never change, so no revalidation is needed.
// Update:  a new version installs quietly in the background and WAITS. The app shows
//          "New version ready"; tapping Update sends SKIP_WAITING and the page reloads.
const VERSION = "healthmaths-__VERSION__";
const CORE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];
const ASSET = /\/_next\/static\/[^"'\\\s)<>]+/g;

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(CORE);
      const html = await (await cache.match("/")).text();
      const files = new Set(html.match(ASSET) || []);
      await Promise.all([...files].map((u) => cache.add(u).catch(() => {})));
      // Fonts are referenced inside the CSS files, so read those too.
      for (const u of [...files].filter((x) => x.endsWith(".css"))) {
        const css = await (await cache.match(u))?.text();
        const fonts = new Set((css || "").match(ASSET) || []);
        await Promise.all([...fonts].map((f) => cache.add(f).catch(() => {})));
      }
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== location.origin ||
    url.pathname.startsWith("/_vercel/")
  )
    return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, {
        ignoreSearch: req.mode === "navigate",
      });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return req.mode === "navigate"
          ? (await cache.match("/")) || Response.error()
          : Response.error();
      }
    })(),
  );
});
