/* ══ Charazay 2.0 — SERVICE WORKER (F10-7) ═════════════════════════════════════════════
   Amaç: (1) her açılışta ~260 KB'ın ağdan inmemesi, (2) ağ yokken oyunun açılabilmesi,
   (3) telefona "uygulama gibi" eklenebilmesi (manifest.json ile birlikte).

   Strateji:
     • HTML (gezinme)  → ÖNCE AĞ, olmazsa önbellek. Yeni sürüm anında görünür.
     • js/ · font · ikon · portre → ÖNCE ÖNBELLEK. Script URL'leri `?v=` ile sürümlendiği
       için bayat JS servis edilmesi mümkün değil: sürüm artınca URL değişir, yeni indirilir.
     • Yalnız aynı köken (same-origin) ve yalnız GET.

   SCRIPT_V, charazay2.0.html'deki `<script src="js/...?v=NN">` etiketiyle AYNI olmalıdır —
   yayın öncesi sürüm artırılırken burası da güncellenir (tools/faz10-check.js sınar).

   Kayıt yalnızca yayın sunucusunda yapılır (js/main.js → registerServiceWorker); yerelde
   ve test araçlarında devre dışıdır, bu yüzden ölçümler önbellekten etkilenmez. */
const SCRIPT_V = '59';
const CACHE = 'charazay-v' + SCRIPT_V;

const JS_FILES = ['i18n', 'i18n-dict', 'i18n-commentary', 'names', 'state', 'economy', 'persistence',
  'portraits', 'roster-gen', 'league', 'match-prep', 'render', 'turkce-ek', 'match-engine', 'main'];

const SHELL = ['./', 'charazay2.0.html', 'manifest.json',
  'assets/icon-192.png', 'assets/icon-512.png',
  'assets/fonts/bebas-neue-latin.woff2', 'assets/fonts/bebas-neue-latin-ext.woff2',
  'assets/fonts/inter-latin.woff2', 'assets/fonts/inter-latin-ext.woff2']
  .concat(JS_FILES.map(f => 'js/' + f + '.js?v=' + SCRIPT_V));

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* Tek tek ekle: bir dosya eksikse (ör. font adı değişmiş) kurulumun tamamı düşmesin. */
    await Promise.all(SHELL.map(u => c.add(u).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const adlar = await caches.keys();
    await Promise.all(adlar.filter(a => a !== CACHE && a.indexOf('charazay-') === 0)
      .map(a => caches.delete(a)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  const htmlIstegi = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') >= 0;

  if (htmlIstegi) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, net.clone()).catch(() => null);
        return net;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || caches.match('charazay2.0.html') ||
          new Response('Çevrimdışısın ve bu sayfa önbellekte yok.',
            { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const net = await fetch(req);
    /* Yalnız başarılı, aynı köken yanıtları saklanır (opak yanıt önbelleği şişirir). */
    if (net && net.status === 200 && net.type === 'basic') {
      const c = await caches.open(CACHE);
      c.put(req, net.clone()).catch(() => null);
    }
    return net;
  })());
});
