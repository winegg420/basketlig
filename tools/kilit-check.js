/**
 * FAZ 51 — KİLİTLİ SONUÇ (C1) ETİKET DENETÇİSİ
 *
 * Senaryo: maç başlatılır, izlenmeden sayfa yenilenir (G.pendingMatch kalır). Dönüşte:
 *   [1] Ana Panel kartındaki buton "⏩ Kilitli sonucu uygula" demeli (eskiden "▶ Maçı Başlat"
 *       diyordu; tıklanınca canlı maç açılmıyor, sonuç sessizce uygulanıyordu — kullanıcı
 *       "görüntü gelmiyor, hâlâ Başlat yazıyor" dedi).
 *   [2] Maçlar sayfasındaki startMatchBtn da aynı etiketi taşımalı (tek kaynak).
 *   [3] Tıklanınca bildirim skoru ve sıradaki adımı söylemeli; fikstürde maç oynanmış olmalı.
 *   [4] Uygulamadan sonra iki buton da "▶ Maçı Başlat"a dönmeli ve ikinci tıklama GERÇEK
 *       canlı maç başlatmalı (mState.running).
 *
 * Kullanım: node tools/kilit-check.js
 */
const {chromium}=require('playwright');
const path=require('path');
(async()=>{
  const url='file:///'+path.resolve(__dirname,'..','charazay2.0.html').split(path.sep).join('/')+'?test=1';
  const b=await chromium.launch({channel:'chrome',headless:true});
  const ctx=await b.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{localStorage.setItem('charazay_lang','tr')}catch(e){}});
  await p.goto(url); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const i=document.querySelector('#takimAdi,#teamName,input[id*=akim]'); if(i)i.value='Kilit FC'; createTeam(); });
  await p.waitForTimeout(800);
  const basla=await p.evaluate(async()=>{ showPage('mac'); await new Promise(r=>setTimeout(r,300)); startMatch(); await new Promise(r=>setTimeout(r,1500)); saveGameNow(false); await new Promise(r=>setTimeout(r,500)); return {running:mState.running,sig:G.pendingMatch&&G.pendingMatch.sig}; });
  if(!basla.running||!basla.sig) throw new Error('ön koşul: maç başlamadı / kilit yok '+JSON.stringify(basla));
  /* sayfa yenile → kayıttan devam */
  await p.goto(url); await p.waitForTimeout(1200);
  await p.evaluate(()=>resumeFromSavedGame()); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{
    const out={};
    out.pending=!!G.pendingMatch;
    out.kartEtiket=document.querySelector('#dashNextCard .dn-play')?.textContent.trim();
    showPage('mac'); await new Promise(r=>setTimeout(r,300));
    out.macEtiket=document.getElementById('startMatchBtn')?.textContent.trim();
    window.__n=[]; const _s=window.showNotif; window.showNotif=function(t,o){__n.push(String(t)); return _s.apply(this,arguments)};
    const m=findNextUserSeasonMatch(); out.ix=m&&m.seasonMatchIx;
    document.getElementById('startMatchBtn').click();
    await new Promise(r=>setTimeout(r,1200));
    out.notif=__n.find(x=>/kilitli sonuç uygulandı/i.test(x))||__n.join(' | ');
    out.oynandi=!!(G.season.matches.find(x=>x.seasonMatchIx===out.ix)||{}).played;
    out.runningSonra=mState.running;
    out.kartEtiket2=document.querySelector('#dashNextCard .dn-play')?.textContent.trim();
    out.macEtiket2=document.getElementById('startMatchBtn')?.textContent.trim();
    document.getElementById('startMatchBtn').click();
    await new Promise(r=>setTimeout(r,2500));
    out.ikinciRunning=mState.running;
    return out;
  });
  await b.close();
  const kapi=[
    ['[1] kart etiketi kilitli', r.pending&&r.kartEtiket==='⏩ Kilitli sonucu uygula', r.kartEtiket],
    ['[2] maç sayfası etiketi kilitli', r.macEtiket==='⏩ Kilitli sonucu uygula', r.macEtiket],
    ['[3] bildirim skor + adım', /\d+ - \d+/.test(r.notif||'')&&/Maçı Başlat/.test(r.notif||''), r.notif],
    ['[3b] fikstürde oynandı, canlı maç açılmadı', r.oynandi&&!r.runningSonra, JSON.stringify({oynandi:r.oynandi,running:r.runningSonra})],
    ['[4] etiketler Başlat’a döndü', r.kartEtiket2==='▶ Maçı Başlat'&&r.macEtiket2==='▶ Maçı Başlat', r.kartEtiket2+' / '+r.macEtiket2],
    ['[4b] ikinci tıklama gerçek maç', r.ikinciRunning===true, String(r.ikinciRunning)],
    ['konsol hatası 0', errs.length===0, errs.join('; ').slice(0,200)],
  ];
  let fail=0;
  for(const [ad,ok,det] of kapi){ console.log((ok?'  ✓ ':'  ✗ ')+ad+(ok?'':'  → '+det)); if(!ok)fail++; }
  console.log(fail?`\n✗ kilit-check: ${fail} kapı düştü`:'\n✓ kilit-check: tüm kapılar geçti');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
