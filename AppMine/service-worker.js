// ══════════════════════════════════════════════
// Service Worker — Mine de Kaskinen (Kalevala GN)
// Stratégie : cache-first pour tout, pensé pour usage 100% hors-ligne.
// ══════════════════════════════════════════════

const CACHE_VERSION = 'kaskinen-v1'; // ↑ incrémenter (v2, v3...) à chaque mise à jour des fichiers

// Fichiers de l'app — DOIVENT tous être listés ici, sinon ils ne seront
// pas disponibles hors-ligne.
const PRECACHE_URLS = [
  './',
  './mine-joueur.html',
  './mine-mj.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  encodeURI('./Sons/Generic Dungeon.mp3'),
];

// ── Installation : on précharge tout ──
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // On ajoute chaque fichier individuellement : si un seul échoue,
      // les autres restent quand même en cache (au lieu de tout annuler).
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url))
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error('[SW] Échec de mise en cache :', PRECACHE_URLS[i], r.reason);
        }
      });
    })
  );
});

// ── Activation : on supprime les anciennes versions de cache ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : cache-first pour tout (app + polices Google Fonts) ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isGoogleFonts =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // On met en cache les polices Google Fonts au fur et à mesure
          // qu'elles sont chargées (utile seulement lors de la première
          // visite en ligne — ensuite elles seront servies du cache).
          if (isGoogleFonts && response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Hors-ligne et rien en cache : on ne peut rien faire de plus.
          // (Ne devrait jamais arriver si le test hors-ligne avant l'événement a été fait.)
          return new Response('Ressource indisponible hors-ligne.', {
            status: 503,
            statusText: 'Offline',
          });
        });
    })
  );
});
