const CACHE='masterbinder-v13';
const ASSETS=['./','./index.html','./manifest.json'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Always network-first for TCG API calls
  if(url.hostname==='api.pokemontcg.io'){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  // Cache-first for app shell
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
    if(resp&&resp.status===200&&resp.type==='basic'){
      const clone=resp.clone();
      caches.open(CACHE).then(c=>c.put(e.request,clone));
    }
    return resp;
  })));
});
