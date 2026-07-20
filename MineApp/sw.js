// Incrémenter CACHE_VERSION à CHAQUE déploiement (même mineur).
// C'est CE numéro — pas le ?v= dans l'URL — qui force la mise à jour.
const CACHE_VERSION = 'v32';
const CACHE_NAME = `la-mine-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  './mine-joueur.html',
  './mine-mj.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './Sons/Generic Dungeon.mp3',
];

// Installation — mise en cache initiale, activation immédiate (pas d'attente de fermeture d'onglet)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        console.warn('Certains fichiers non mis en cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation — supprime TOUS les caches d'une version précédente
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — réseau en priorité (fraîcheur garantie si connecté),
// repli sur le cache uniquement si hors-ligne (mode LARP sans réseau)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
