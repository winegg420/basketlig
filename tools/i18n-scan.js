/* EN modunda arayüzü gezip ÇEVRİLMEMİŞ metin düğümlerini raporlar.
   Kullanım: node tools/i18n-scan.js  [--limit=N]
   Türkçeye özgü karakter (çğıöşü…) içeren ya da bilinen TR sözcük geçen metin düğümleri listelenir. */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LIMIT=Number((process.argv.find(a=>a.startsWith('--limit='))||'--limit=400').split('=')[1]);
const MAC_MS=Number((process.argv.find(a=>a.startsWith('--mac='))||'--mac=60000').split('=')[1]);
(async()=>{
  const server=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/charazay2.0.html';
    const fp=path.join(ROOT,path.normalize(u));
    fs.readFile(fp,(e,d)=>{if(e){r.writeHead(404);r.end('');return;}r.writeHead(200,{'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream'});r.end(d);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome'});
  const ctx=await browser.newContext({viewport:{width:1440,height:900},locale:'en-US'});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto(base+'/charazay2.0.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.setItem('charazay_lang','en'));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#loginPage',{state:'visible'});

  /* F8-7: ARAÇ KÖR NOKTASI. Eski sürüm yalnız Türkçe'ye ÖZGÜ harf (çğıöşü) veya dar bir
     sözcük listesi arıyordu; "Asist", "Faul", "Menajer", "Bakiye:", "Serbest Oyuncular"
     gibi SALT ASCII harfli Türkçe metinleri hiç göremiyordu. Araç "kalan Türkçe yalnız özel
     isim" raporlarken gerçek EN oturumunda 9 dize ekranda duruyordu. Sözcük listesi
     genişletildi, simge öneki soyulup gövdeye de bakılıyor ve kapsam (kaç düğüm tarandı)
     çıktıya yazılıyor — kapsam görünmezse kör nokta ölçülemez. */
  let taranan=0; const kapsam=[];
  const collect=async(etiket)=>{
    const res=await page.evaluate(()=>{
      const TR=/[çğıöşüÇĞİÖŞÜ]/;
      const HARF='A-Za-zÇĞİÖŞÜçğıöşü';
      /* Salt ASCII yazılabilen Türkçe arayüz sözcükleri de yakalanmalı.
         DİKKAT: İngilizce'de aynı yazılan sözcükler (arena, transfer, moral, tempo, draft,
         final, seri, plan, test, video, poz, stat) bu listeye GİRMEZ — yoksa çevrilmiş
         İngilizce metinler yanlış pozitif olarak "çevrilmemiş" raporlanır. */
      const WORDS=new RegExp('(^|[^'+HARF+'])('+[
        've','icin','için','ile','mac','maç','takim','takım','oyuncu','sezon','puan','kadro',
        'sira','sıra','gun','gün','hafta','yok','senin','kalan','toplam',
        'sec','seç','kaydet','geri','ileri','asist','faul','ribaund','blok','sayi','sayı',
        'menajer','bakiye','serbest','gelir','gider','antrenman','tahmini','oyuncular',
        'bireysel','bilet','koc','koç','izci','sakat','enerji',
        'kimya','potansiyel','sozlesme','sözleşme','maas','maaş','hucum','hücum','savunma',
        'odak','yedek','ceyrek','çeyrek','uzatma','galibiyet','maglubiyet',
        'mağlubiyet','beraberlik','sampiyon','şampiyon','gecmis','geçmiş','ayarlar',
        'basarim','başarım','haberler','duyuru','deplasman','altyapi','altyapı','bilanco',
        'bilanço','odul','ödül'
      ].join('|')+')([^'+HARF+']|$)','i');
      /* Simge/boşluk önekini soy — emoji'li dizeler de gövdesinden değerlendirilsin. */
      const soy=(t)=>{
        let i=0;
        while(i<t.length){
          const c=t[i], cc=t.codePointAt(i);
          if(c>='0'&&c<='9') break;
          if(c.toLowerCase()!==c.toUpperCase()) break;
          i+=(cc>0xFFFF?2:1);
        }
        return i?t.slice(i).trim():t;
      };
      const out=[];
      let sayac=0;
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
      let n;
      while((n=w.nextNode())){
        const p=n.parentNode;
        if(!p||p.nodeName==='SCRIPT'||p.nodeName==='STYLE') continue;
        const s=(n.nodeValue||'').trim();
        if(s.length<2) continue;
        sayac++;
        const gov=soy(s);
        if(TR.test(s)||WORDS.test(s)||TR.test(gov)||WORDS.test(gov)) out.push(s);
      }
      return {out,sayac};
    });
    taranan+=res.sayac;
    kapsam.push(etiket+':'+res.sayac);
    res.out.forEach(r=>bulunan.add(etiket+' :: '+r));
  };
  const bulunan=new Set();
  await collect('login');
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage',{state:'visible'});
  await collect('setup');
  await page.fill('#teamName','Ankara Eagles');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app',{state:'visible'});
  await sleep(500);
  await collect('tutorial');
  await page.evaluate(()=>{try{closeAppModal();}catch(e){}});
  await sleep(300);
  for(const p of ['dashboard','takim','kadro','mac','lig','market','altyapi','antrenman','arena','bilanco','analiz']){
    await page.evaluate(pp=>showPage(pp,document.querySelector('#sbNav button[data-page="'+pp+'"]')),p);
    await sleep(320);
    await collect('sayfa:'+p);
  }
  const modallar=[
    ['ayarlar','openSettingsModal()'],
    ['basarim','openAchievementsModal()'],
    ['taktik','(function(){const m=findNextUserSeasonMatch(); if(m) openMatchTactics(m.seasonMatchIx);})()'],
    ['ilk5','openLineupEditor()'],
    ['oyuncu','openPlayerModal((G.players[0]||{}).id)'],
    ['soyunma','(function(){const p=G.players[3];p.sit=4;p.mood=40;openLockerRoomModal(p.id);})()'],
    ['draft','(function(){G.scouts=[{id:"s1",ad:"Scout",bolge:"Europe",kalite:3,maas:100,atama:"youth"}];startDraft();})()']
  ];
  for(const [ad,js] of modallar){
    await page.evaluate(()=>{try{closeAppModal();}catch(e){}});
    await sleep(150);
    try{ await page.evaluate(js); }catch(e){}
    await sleep(700);
    await collect('modal:'+ad);
  }
  await page.evaluate(()=>{try{clearDraftTimer&&clearDraftTimer();closeAppModal();}catch(e){}});
  await sleep(200);
  // canlı maç
  await page.evaluate(()=>{try{showPage('mac',document.querySelector('#sbNav button[data-page="mac"]'));startMatch();}catch(e){}});
  await sleep(4000);
  await collect('canli-mac');

  /* ── B-1 (DENETIM-FAZ13): CANLI ANLATIM AKIŞI ────────────────────────────────────────
     Bu araç bugüne kadar SAYFALARI tarıyordu; canlı anlatım akışını taramıyordu. FAZ 13'te
     eklenen ribaund/faul kalıplarının İngilizcesi yazılmamıştı ve EN oyuncu maçın üçte
     birini Türkçe görüyordu — araç bunu göremedi. Anlatım satırları akıp gittiği için
     tek kare yetmez: 60 sn boyunca 300 ms'de bir toplanır, her satır BİR KEZ sayılır. */
  await page.evaluate(()=>{
    window.__anlatim=new Set();
    if(window.__anlatimTimer) clearInterval(window.__anlatimTimer);
    window.__anlatimTimer=setInterval(()=>{
      try{
        const d=document.getElementById('commentary'); if(!d) return;
        d.querySelectorAll('.ci').forEach(e=>{
          const s=(e.textContent||'').replace(/\s+/g,' ').trim();
          if(s) window.__anlatim.add(s);
        });
      }catch(e){}
    },300);
  });
  await sleep(MAC_MS);
  const anlatim=await page.evaluate(()=>{
    if(window.__anlatimTimer) clearInterval(window.__anlatimTimer);
    return Array.from(window.__anlatim||[]);
  });
  await page.evaluate(()=>{try{stopMatch();}catch(e){}});

  /* Satırın başındaki saat/çeyrek damgası (Q1 7:24) ve özel isimler ayıklanır: takım ve
     oyuncu adları çevrilmez, "Türkçe kalmış" sayılmamalı. */
  const TRH=/[çğıöşüÇĞİÖŞÜ]/;
  const TRW=new RegExp('(^|[^A-Za-z])('+['ve','ile','icin','için','mac','maç','sayi','sayı',
    'faul','ribaund','asist','blok','cember','çember','pota','top','sut','şut','kacirdi','kaçırdı',
    'attı','atti','aldi','aldı','verdi','geldi','girdi','yok','var','bu','bir','iki','uc','üç',
    'cizgi','çizgi','tutti','tuttu','kosuyor','koşuyor','oyuncu','takim','takım','ceyrek','çeyrek',
    'devre','sonra','once','önce','hucum','hücum','savunma','yine','bizde','sizde','altı','alti'
  ].join('|')+')([^A-Za-z]|$)','i');
  const trKalan=anlatim.filter(s=>{
    const govde=s.replace(/^(Q\d|OT\d|\d+P|U\d)\s*[\d:]*\s*/,'')            /* saat damgası */
                 .replace(/[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ'’-]*(\s[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ'’-]*)*/g,' ')
                 .replace(/\s+/g,' ').trim();                               /* özel isimler */
    return TRH.test(govde)||TRW.test(govde);
  });
  const oran=anlatim.length?(100*trKalan.length/anlatim.length):0;
  console.log('\nCANLI ANLATIM (EN): '+anlatim.length+' satır · Türkçe kalan '+trKalan.length+
    ' (%'+oran.toFixed(1)+') · hedef < %5');
  trKalan.slice(0,25).forEach(s=>console.log('   ✗ '+s));

  const arr=Array.from(bulunan).sort();
  fs.writeFileSync(path.join(__dirname,'_i18n-missing.txt'),arr.join('\n'),'utf8');
  console.log('KAPSAM: '+kapsam.length+' ekran · '+taranan+' metin düğümü tarandı');
  console.log('  '+kapsam.join(' · '));
  console.log('ÇEVRİLMEMİŞ (benzersiz metin düğümü):',arr.length);
  arr.slice(0,LIMIT).forEach(r=>console.log('  '+r));
  console.log('konsol hata:',errs.length,errs.slice(0,3));
  await browser.close();server.close();
  /* Sayfa listesi BİLGİDİR (kalanlar özel isim), canlı anlatım oranı ise KAPIDIR:
     B-1 gerilemesi tam olarak burada görünmüyordu. */
  if(oran>=5){
    console.error('\n✗ Canlı anlatımda Türkçe oranı %'+oran.toFixed(1)+' (hedef < %5)');
    process.exit(1);
  }
  console.log('\n✓ canlı anlatım EN oranı hedefte (Türkçe %'+oran.toFixed(1)+')');
})();
