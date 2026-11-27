const CACHE='mi-actualidad-v7';
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin) return;
  if(url.pathname.includes('/data/news-feed.json')||url.pathname.includes('/data/on-this-day.json')||url.pathname.endsWith('/index.html')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
  }
});
