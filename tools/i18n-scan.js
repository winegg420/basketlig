/* EN modunda arayüzü gezip ÇEVRİLMEMİŞ metin düğümlerini raporlar.
   Kullanım: node tools/i18n-scan.js  [--limit=N]
   Türkçeye özgü karakter (çğıöşü…) içeren ya da bilinen TR sözcük geçen metin düğümleri listelenir. */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LIMIT=Number((process.argv.find(a=>a.startsWith('--limit='))||'--limit=400').split('=')[1]);
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

  const collect=async(etiket)=>{
    const rows=await page.evaluate(()=>{
      const TR=/[çğıöşüÇĞİÖŞÜ]/;
      const WORDS=/\b(ve|için|ile|maç|takım|oyuncu|sezon|puan|kadro|sıra|gün|hafta|yok|var|bir|bu|senin|kalan|toplam|seç|kaydet|geri|ileri)\b/i;
      const out=[];
      const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
      let n;
      while((n=w.nextNode())){
        const p=n.parentNode;
        if(!p||p.nodeName==='SCRIPT'||p.nodeName==='STYLE') continue;
        const s=(n.nodeValue||'').trim();
        if(s.length<2) continue;
        if(TR.test(s)||WORDS.test(s)) out.push(s);
      }
      return out;
    });
    rows.forEach(r=>bulunan.add(etiket+' :: '+r));
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
  await page.evaluate(()=>{try{stopMatch();}catch(e){}});

  const arr=Array.from(bulunan).sort();
  fs.writeFileSync(path.join(__dirname,'_i18n-missing.txt'),arr.join('\n'),'utf8');
  console.log('ÇEVRİLMEMİŞ (benzersiz metin düğümü):',arr.length);
  arr.slice(0,LIMIT).forEach(r=>console.log('  '+r));
  console.log('konsol hata:',errs.length,errs.slice(0,3));
  await browser.close();server.close();
})();
