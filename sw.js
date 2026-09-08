const CACHE='pulpit-ultimate-v2.2.1';
const APP_SHELL=['./','./index.html','./styles.css','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./src/app.js','./src/db.js','./src/schema.js','./src/utils.js','./src/markdown.js','./src/mirror.js','./src/backup.js','./src/bible.js','./src/bible-selector.js','./src/producer-feedback.js','./src/prompt.js'];
const YOUVERSION_ORIGIN='https://api.youversion.com';

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function proxyYouVersion(request){
  try{
    const body=await request.json();
    const appKey=String(body?.appKey||'').trim();
    const path=String(body?.path||'');
    if(appKey.length<8) return Response.json({error:'App Key inválida.'},{status:400,headers:{'Cache-Control':'no-store'}});
    const target=new URL(path,YOUVERSION_ORIGIN);
    const allowedVersion=`/v1/bibles/129`;
    const allowed=target.origin===YOUVERSION_ORIGIN&&(target.pathname===allowedVersion||target.pathname.startsWith(`${allowedVersion}/passages/`));
    if(!allowed) return Response.json({error:'Rota YouVersion não permitida.'},{status:400,headers:{'Cache-Control':'no-store'}});
    const upstream=await fetch(target,{method:'GET',headers:{'X-YVP-App-Key':appKey,'Accept':'application/json'},cache:'no-store'});
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,statusText:upstream.statusText,headers:{'Content-Type':upstream.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});
  }catch(error){
    return Response.json({error:'Falha ao acessar a YouVersion API.',message:error.message},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(event.request.method==='POST'&&url.pathname.endsWith('/__youversion')){
    event.respondWith(proxyYouVersion(event.request));
    return;
  }

  if(event.request.method!=='GET') return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok){ const clone=response.clone(); caches.open(CACHE).then(cache=>cache.put('./index.html',clone)); }
          return response;
        })
        .catch(async()=>await caches.match('./index.html')||await caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        if(response.ok){ const clone=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,clone)); }
        return response;
      });
      if(cached){ event.waitUntil(network.catch(()=>undefined)); return cached; }
      return network;
    })
  );
});
