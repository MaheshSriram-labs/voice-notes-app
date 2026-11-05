const CACHE = 'voice-notes-v19';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))));
  return self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('.css') || e.request.mode === 'navigate';
  if(isCode){
    e.respondWith(fetch(e.request, {cache:'no-store'}).catch(()=>caches.match('./index.html')));
  } else {
    e.respondWith(caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res=>{
        const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return res;
      }).catch(()=>caches.match('./index.html'))
    ));
  }
});