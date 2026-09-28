const CACHE_NAME = 'mns-avis-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  // Ajoutez ici vos vidéos si elles doivent être pré-chargées (attention à la taille !)
  // '/1.mp4', '/2.mp4', etc. -> Déconseillé car trop lourd pour un cache initial
];

// Installation : Mettre en cache les ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline page');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Removing old cache.', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Interception des requêtes : Stratégie "Network First, Falling back to Cache"
// On essaie toujours d'avoir la dernière version depuis le serveur (Supabase/Cloudflare),
// mais si ça échoue (hors ligne), on sert le cache local.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // Ne pas interférer avec les POST (Supabase)

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cloner la réponse pour pouvoir la mettre en cache ET la retourner
        const responseClone = response.clone();
        
        // Ajouter dynamiquement à la cache si c'est une ressource statique réussie
        if (response.status === 200 && response.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Si réseau KO, chercher dans le cache
        return caches.match(event.request);
      })
  );
});