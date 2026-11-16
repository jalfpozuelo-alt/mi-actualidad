const CACHE='mi-actualidad-v6';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=e.request.url;
  if(url.includes('/data/news-feed.json')||url.includes('/data/on-this-day.json')||url.endsWith('/index.html')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||Response.error())));
});