import { readFileSync, writeFileSync } from 'node:fs';
const id=readFileSync('.next/BUILD_ID','utf8').trim();
const cases=JSON.parse(readFileSync('data/cases.json','utf8'));
const routes=['/','/wijzigingen','/inbox','/verhalen','/intake','/verify','/swarm','/survey','/bronnen','/offline',...cases.map(c=>`/change/${c.case_id}`),...Array.from({length:14},(_,i)=>`/story/S-${String(i+1).padStart(2,'0')}`),...Array.from({length:14},(_,i)=>`/story/S-${String(i+1).padStart(2,'0')}/summary`)];
const fonts=['inter-400','inter-500','inter-600','inter-700','plex-mono','source-serif'].map(f=>`/fonts/${f}.woff2`);
const source=`// Generated for build ${id}. All assets are same-origin.
const CACHE='overdracht-${id}';
const ROUTES=${JSON.stringify(routes)};
const FONTS=${JSON.stringify(fonts)};
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled([...ROUTES,...FONTS].map(async route=>{const response=await fetch(route,{cache:'reload'});if(!response.ok)return;await cache.put(route,response.clone());if(route.startsWith('/')&&!route.includes('/api/')&&response.headers.get('content-type')?.includes('text/html')){const html=await response.text();const assets=[...new Set(html.match(/\\/_next\\/static\\/[^\"'<>\\s]+?\\.(?:js|css)/g)||[])];await Promise.allSettled(assets.map(async asset=>{const r=await fetch(asset,{cache:'reload'});if(r.ok)await cache.put(asset,r);}));}}));await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('overdracht-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;const immutable=url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/fonts/');event.respondWith((async()=>{const cache=await caches.open(CACHE);if(immutable){const cached=await cache.match(req);if(cached)return cached;}try{const response=await fetch(req);if(response.ok&&response.type==='basic')await cache.put(req,response.clone());return response;}catch(error){const cached=await cache.match(req);if(cached)return cached;if(req.mode==='navigate'){const offline=await cache.match('/offline');if(offline)return offline;}return Response.json({error:{code:'E-OFFLINE-01',message:'Offline — deze actie vereist de lokale server.'}},{status:503});}})());});
`;
writeFileSync('public/sw.js',source);console.log(`Offline service worker generated for ${routes.length} routes, build ${id}.`);
