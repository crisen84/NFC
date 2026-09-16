/* Service worker de "Buscar etiqueta NFC"
   Cambia VERSION cuando publiques una actualización: eso obliga a
   descargar de nuevo los archivos y borra la caché anterior. */

const VERSION = "buscar-nfc-v16";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => Promise.all(
        claves.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", evento => {
  const pet = evento.request;

  if (pet.method !== "GET") return;
  if (new URL(pet.url).origin !== self.location.origin) return;

  /* La página: primero red, para que una versión nueva llegue sola.
     Si no hay señal, se sirve la copia guardada. */
  if (pet.mode === "navigate") {
    evento.respondWith(
      fetch(pet)
        .then(res => {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(pet, copia)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(pet).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  /* El resto (iconos, manifiesto): primero caché, que no cambian. */
  evento.respondWith(
    caches.match(pet).then(guardado => {
      if (guardado) return guardado;
      return fetch(pet).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(pet, copia)).catch(() => {});
        }
        return res;
      });
    })
  );
});
