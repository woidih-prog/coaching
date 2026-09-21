/* Garde la page sur l'appareil pour qu'elle s'ouvre sans réseau.
   YouTube et l'API ne sont jamais gardés : ils ont besoin d'internet. */
const CACHE = "coaching-v1";
const FICHIERS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith("coaching-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const u = new URL(e.request.url);

  // les polices : gardées une fois pour toutes, pour une page propre hors connexion
  if(u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com"){
    e.respondWith(caches.open(CACHE).then(async c => {
      const garde = await c.match(e.request);
      if(garde) return garde;
      try{ const r = await fetch(e.request); c.put(e.request, r.clone()); return r; }
      catch(err){ return Response.error(); }
    }));
    return;
  }

  // tout ce qui n'est pas cette page passe sans être touché
  if(u.origin !== self.location.origin) return;
  const base = new URL("./", self.location).pathname;
  if(!u.pathname.startsWith(base)) return;

  // la page : le réseau d'abord, pour recevoir les mises à jour ; sinon la copie gardée
  e.respondWith(
    fetch(e.request)
      .then(r => { if(r.ok){ const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); } return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
