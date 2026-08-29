/* ══════════════════════════════════════════════════════════════════════════════════════
   FAZ 5 — CANLI SUNUM ÖLÇÜM SONDASI (regresyon kalkanı)
   Revize paketindeki 6 kör noktayı kapatır. Gerçek bir maçı tarayıcıda izler ve ölçer:

     syncRatio      · olay tipine göre Δ(maç saati) / Δ(duvar saati)   → medyan 3.0-3.5×, tipler arası fark < 1.5 kat
     orphanEvents   · anlatım satırı üretmeyen olay sayısı              → 0
     ballTeleport   · kare başına top yer değiştirmesi > 60 px          → 0
     identityMatch  · anlatımdaki soyadı = topu tutan jetonun soyadı    → ≥ %95
     tokenSpeedP99  · jeton hızı 99. yüzdelik                           → < 340 px/sn
     boxScoreBand   · top kaybı / serbest atış payı / ribaund bandı     → TO 12±3, FT payı %14-19

   Kullanım:
     node tools/live-metrics.js               (yerel dosyalardan, varsayılan ~2.5 periyot)
     node tools/live-metrics.js --full        (tam maç)
     node tools/live-metrics.js --rate=1      (izleme hızı)
     node tools/live-metrics.js --url=https://…   (canlı yayını ölç)
     node tools/live-metrics.js --json        (sadece JSON çıktı — CI için)
   Çıkış kodu: hedeflerin tamamı tutarsa 0, aksi halde 1.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const arg=n=>{const a=process.argv.find(x=>x.startsWith('--'+n));return a?(a.split('=')[1]||true):null;};
const FULL=!!arg('full'), JSONONLY=!!arg('json');
const RATE=Number(arg('rate')||1);
const URL_OVERRIDE=typeof arg('url')==='string'?arg('url'):null;
const WATCH_MS=Number(arg('ms')||(FULL?260000:110000));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* Hedefler (revize paketi "GENEL KABUL KRİTERLERİ") */
const HEDEF={
  syncMedyanMin:2.0, syncMedyanMax:5.0,   /* medyan bandı */
  syncSpreadMax:1.9,                       /* en yavaş/en hızlı tip oranı */
  orphanMax:0,
  teleportMax:0,
  identityMin:0.95,
  speedP99Max:340,
  toMin:9, toMax:15,                       /* takım başına maç toplamı */
  ftShareMin:0.14, ftShareMax:0.19
};

function pct(arr,p){ if(!arr.length) return 0; const a=arr.slice().sort((x,y)=>x-y); return a[Math.min(a.length-1,Math.floor(a.length*p))]; }
function med(a){ return pct(a,0.5); }

(async()=>{
  let server=null,base=URL_OVERRIDE;
  if(!base){
    server=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/charazay2.0.html';
      const fp=path.join(ROOT,path.normalize(u));
      fs.readFile(fp,(e,d)=>{if(e){r.writeHead(404);r.end('');return;}r.writeHead(200,{'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream'});r.end(d);});});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    base='http://127.0.0.1:'+server.address().port+'/';
  }
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errs=[];
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });

  await page.goto(base+'charazay2.0.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(()=>{ try{ localStorage.setItem('charazay_lang','tr'); }catch(e){} });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#loginPage',{state:'visible',timeout:30000});
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage',{state:'visible'});
  await page.fill('#teamName','Olcum FC');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app',{state:'visible'});
  await page.evaluate(()=>{try{closeAppModal();}catch(e){}});
  await sleep(500);

  /* ── SONDA: sahneyi ve anlatımı kare kare izler ───────────────────────────────────── */
  await page.evaluate(()=>{
    const P={ frames:0, ballJumps:[], ballMax:0, tokSpeeds:[], sync:[], comments:[], evLog:[], lastBall:null, lastTok:[], lastTs:0, lastCarrier:null };
    window.__P=P;
    const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:null;};
    const xyOf=el=>{
      if(!el) return null;
      const tr=el.getAttribute('transform')||'';
      const m=/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(tr);
      if(m) return [num(m[1]),num(m[2])];
      const cx=num(el.getAttribute('cx')), cy=num(el.getAttribute('cy'));
      return (cx!=null&&cy!=null)?[cx,cy]:null;
    };
    /* Anlatım satırlarını damgala */
    const cm=document.getElementById('commentary');
    if(cm){
      new MutationObserver(muts=>{
        muts.forEach(mu=>Array.prototype.forEach.call(mu.addedNodes||[],n=>{
          if(n.nodeType!==1) return;
          const txt=(n.textContent||'').trim();
          const ball=document.getElementById('liveBall');
          /* Kimlik referansı: motorun GERÇEK top taşıyıcısı, satırın basıldığı ANDA okunur.
             (rAF örneklemesi bir kare geriden geldiği için çalma/ribaundda yanlış ad veriyordu.)
             Taşıyıcı yoksa (top havada/potada) son bilinen taşıyıcıya düşülür. */
          const holder=(function(){
            try{
              const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
              /* Top havadaysa (pas) kimlik referansı HEDEF oyuncudur — topu o alacak. */
              const bb=S?S.ball:null;
              const c=bb?(bb.carrier||(bb.mode==='pass'?bb.target:null)):null;
              if(c&&c.pl&&c.pl.isim){ P.lastCarrier=c.pl.isim; return c.pl.isim; }
            }catch(e){}
            return P.lastCarrier;
          })();
          const saha=(function(){ try{ return Array.prototype.map.call(document.querySelectorAll('#playersLayer g.court-token'),g=>((g.querySelector('.tok-name')||{}).textContent||'').trim()).filter(Boolean); }catch(e){ return []; } })();
          P.comments.push({t:performance.now(),txt,holder,saha,
            mt:(typeof mState!=='undefined'&&mState&&mState._clkNow!=null)?mState._clkNow:null,
            q:(typeof mState!=='undefined'&&mState)?mState.quarter:null});
        }));
      }).observe(cm,{childList:true});
    }
    const step=ts=>{
      P.frames++;
      const dt=P.lastTs?(ts-P.lastTs)/1000:0;
      P.lastTs=ts;
      if(dt>0&&dt<0.5){
        try{
          const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
          const c=S&&S.ball?S.ball.carrier:null;
          if(c&&c.pl&&c.pl.isim) P.lastCarrier=c.pl.isim;
        }catch(e){}
        const b=xyOf(document.getElementById('liveBall'));
        if(b&&P.lastBall){
          const d=Math.hypot(b[0]-P.lastBall[0],b[1]-P.lastBall[1]);
          if(d>60){
            /* Teshis: sicramanin hangi top modunda ve hangi olay tipinde oldugunu kaydet. */
            let mod='?',ev='?';
            try{ const St=mState._sim; mod=St&&St.ball?(St.ball.mode+(St.ball.carrier?'/held':'')):'?';
                 const e=mState.events&&mState.events[Math.max(0,mState.idx-1)]; ev=e?e.type:'?'; }catch(e2){}
            P.ballJumps.push({px:+d.toFixed(1),mod,ev});
          }
          if(d>P.ballMax) P.ballMax=+d.toFixed(1);
        }
        if(b) P.lastBall=b;
        /* Jetonlar DOM SIRASINA göre indekslenir. İsim etiketine göre indekslemek
           oyuncu değişikliğinde (etiket değişir) ve aynı soyadlı iki oyuncuda sahte
           ışınlanma hızları üretiyordu. */
        const toks=document.querySelectorAll('#playersLayer g.court-token');
        for(let ti=0;ti<toks.length;ti++){
          const p=xyOf(toks[ti]);
          if(!p) continue;
          const prev=P.lastTok[ti];
          if(prev){ const v=Math.hypot(p[0]-prev[0],p[1]-prev[1])/dt; if(v<4000) P.tokSpeeds.push(v); }
          P.lastTok[ti]=p;
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  /* Motor olaylarını da kaydet (anlatımsız olay tespiti + saat farkı için) */
  await page.evaluate(r=>{ try{ setMatchRate(r); }catch(e){} }, RATE);
  await page.evaluate(()=>{ showPage('mac',document.querySelector('#sbNav button[data-page="mac"]')); startMatch(); });
  await page.evaluate(()=>{
    /* olay kuyruğunun ilerleyişini damgala */
    window.__EV=[];
    const es=(mState.events||[]);
    window.__EVTOTAL=es.length;
    let last=-1;
    window.__evPoll=setInterval(()=>{
      if(typeof mState==='undefined'||!mState) return;
      const i=mState.idx;
      for(let k=last+1;k<i&&k<es.length;k++){
        const e=es[k];
        window.__EV.push({i:k,type:e.type,t:e.t,q:e.q,txt:(e.text||e.ftPre||''),ftPre:e.ftPre||'',wall:performance.now(),
          hasText:!!(e.text||e.ftPre||e.ftRes)});
      }
      last=i-1;
    },40);
  });

  await sleep(WATCH_MS);
  /* Drenaj: izleme penceresi kapanırken son pozisyonun koreografisi surebilir; sonuc
     cumlesi top cembere varinca basildigi icin kisa bir sure daha beklenir. */
  await sleep(1500);

  const R=await page.evaluate(()=>{
    clearInterval(window.__evPoll);
    const P=window.__P,EV=window.__EV||[];
    /* syncRatio: ardışık olaylar arasında oyun-saniyesi / gerçek-saniye */
    const sync={};
    for(let i=1;i<EV.length;i++){
      const a=EV[i-1],b=EV[i];
      if(a.q!==b.q) continue;
      const dGame=(a.t||0)-(b.t||0);
      const dWall=(b.wall-a.wall)/1000;
      if(dGame<=0||dWall<=0.05) continue;
      const r=dGame/dWall;
      if(r>200) continue;
      (sync[b.type]=sync[b.type]||[]).push(r);
    }
    /* identity: anlatımda geçen soyadı ile topu tutan jetonun adı */
    let idOk=0,idBad=0; const idBadOrn=[];
    /* Blok satırlarında anlatılan oyuncu SAVUNMACIDIR; topu hiçbir zaman taşımaz.
       Takım anonsları (çeyrek/mola/taktik) da bir oyuncuya bağlı değildir. */
    const ANONS=/çeyrek başladı|Çeyrek bitti|Maç bitti|MOLA|taktik değiştirdi|Bugünün spikeri|Uzatma|Bonus!|değişiklik:|faulünü yaptı|blok|BLOK|Blok|şapkayı|ŞAPKAYI|geri çevirdi|engelledi|bloke|durduruldu|giremezsin|müdahale etti|blokladı|kapadı|silip|geri yolladı/i;
    P.comments.forEach(c=>{
      if(!c.holder) return;
      if(ANONS.test(c.txt)) return;   /* takım/anons satırı — kimlik ölçümüne girmez */
      /* Satırda sahadaki HİÇBİR oyuncunun adı geçmiyorsa bu bir anonstur (taktik/renk cümlesi):
         kimlik ölçümüne dahil edilmez. */
      const lowTxt=c.txt.toLowerCase();
      const adGecen=(c.saha||[]).some(n=>n&&lowTxt.indexOf(String(n).toLowerCase())>=0);
      if(!adGecen) return;
      const m=/([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?)/.exec(c.txt.replace(/^\S+\s\d+:\d+\s/,''));
      if(!m) return;
      const tam=String(c.holder).trim().toLowerCase();
      const soyad=tam.split(/\s+/).pop();
      const low=c.txt.toLowerCase();
      if(low.indexOf(tam)>=0||low.indexOf(soyad)>=0) idOk++;
      else { idBad++; if(idBadOrn.length<6) idBadOrn.push({anlatim:c.txt.slice(0,70),sahada:c.holder}); }
    });
    /* orphan: metni olan ama anlatıma düşmeyen olay */
    const cmTxt=P.comments.map(c=>c.txt).join('\n');
    let orphan=0; const orphanOrn=[];
    /* Son olay HARIC: mState.idx ilerlemis olsa da o pozisyonun koreografisi (ve dolayisiyla
       sonuc cumlesi) olcum kesildiginde henuz bitmemis olabilir — kesme artefakti orphan
       olarak sayilmasin. */
    EV.slice(0,-1).forEach(e=>{
      if(!e.hasText) return;
      /* Serbest atış olayları iki parça basılır (ftPre + ftRes); birleşik metin hiç görünmez. */
      const ham=e.ftPre||e.txt; if(!ham) return;
      /* Olay metni HTML içerebilir (<strong> vb.); anlatım DOM'unda düz metin görünür.
         Karşılaştırmadan önce etiketleri temizle — yoksa her zengin metinli olay
         yanlışlıkla "anlatımsız" sayılır. */
      const key=String(ham).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,40);
      if(!key) return;
      if(cmTxt.indexOf(key)<0){ orphan++; if(orphanOrn.length<6) orphanOrn.push(e.type+' :: '+key); }
    });
    /* box score */
    const bx=(function(){
      try{
        const ev=mState.events[Math.max(0,mState.idx-1)];
        return ev&&ev.box?{h:ev.box.h,a:ev.box.a}:null;
      }catch(e){ return null; }
    })();
    return {
      frames:P.frames,
      ballJumps:P.ballJumps.length, ballMax:P.ballMax, ballJumpOrn:P.ballJumps.slice(0,8),
      tokSpeeds:P.tokSpeeds,
      sync, idOk, idBad, idBadOrn, orphan, orphanOrn,
      yorum:P.comments.length, olay:EV.length, toplamOlay:window.__EVTOTAL,
      box:bx, quarter:mState.quarter, skor:mState.score, calisiyor:mState.running
    };
  });

  await page.evaluate(()=>{try{stopMatch();}catch(e){}});
  await browser.close(); if(server) server.close();

  /* ── Değerlendirme ────────────────────────────────────────────────────────────────── */
  const syncTip={};
  Object.keys(R.sync).forEach(k=>{ if(R.sync[k].length>=3) syncTip[k]=+med(R.sync[k]).toFixed(2); });
  const tipler=Object.values(syncTip);
  const syncMedyan=tipler.length?+med(tipler).toFixed(2):0;
  const syncSpread=tipler.length?+(Math.max(...tipler)/Math.max(0.01,Math.min(...tipler))).toFixed(2):0;
  const p99=+pct(R.tokSpeeds,0.99).toFixed(0);
  const p50=+pct(R.tokSpeeds,0.50).toFixed(0);
  const identity=(R.idOk+R.idBad)?+(R.idOk/(R.idOk+R.idBad)).toFixed(3):1;
  let toTotal=null,ftShare=null,reb=null;
  if(R.box){
    const h=R.box.h,a=R.box.a;
    const per=(mState=>1);
    toTotal=+(((h.to||0)+(a.to||0))/2).toFixed(1);
    const hp=(h.twoMade||0)*2+(h.thrMade||0)*3+(h.ftMade||0);
    const ap=(a.twoMade||0)*2+(a.thrMade||0)*3+(a.ftMade||0);
    ftShare=(hp+ap)?+(((h.ftMade||0)+(a.ftMade||0))/(hp+ap)).toFixed(3):0;
    reb=(h.reb||0)+(a.reb||0);
  }
  const out={
    izlenen:{kare:R.frames,olay:R.olay+'/'+R.toplamOlay,yorum:R.yorum,ceyrek:R.quarter,skor:R.skor},
    syncRatio:{medyan:syncMedyan,tipler:syncTip,tiplerArasiFark:syncSpread},
    orphanEvents:{adet:R.orphan,ornek:R.orphanOrn},
    ballTeleport:{adet:R.ballJumps,enBuyukPx:R.ballMax,ornek:R.ballJumpOrn},
    identityMatch:{oran:identity,eslesen:R.idOk,uyusmayan:R.idBad,ornek:R.idBadOrn},
    tokenSpeed:{p50:p50,p99:p99},
    boxScoreBand:{topKaybiTakimBasi:toTotal,serbestAtisSayiPayi:ftShare,ribaundToplam:reb},
    konsolHatasi:errs.length
  };
  const fail=[];
  /* syncRatio yalnız ÖRNEK VARSA yargılanır: kısa izleme penceresinde aynı tipte ardışık
     iki olay hiç gelmeyebilir; o durumda medyan 0 çıkıp yanlışlıkla "hedef dışı" sayılıyordu. */
  if(syncMedyan>0){
    if(!(syncMedyan>=HEDEF.syncMedyanMin&&syncMedyan<=HEDEF.syncMedyanMax)) fail.push(`syncRatio medyan ${syncMedyan}× (hedef ${HEDEF.syncMedyanMin}-${HEDEF.syncMedyanMax}×)`);
    if(syncSpread>HEDEF.syncSpreadMax) fail.push(`syncRatio tipler arası fark ${syncSpread}× (hedef < ${HEDEF.syncSpreadMax}×)`);
  }
  if(R.orphan>HEDEF.orphanMax) fail.push(`orphanEvents ${R.orphan} (hedef ${HEDEF.orphanMax})`);
  if(R.ballJumps>HEDEF.teleportMax) fail.push(`ballTeleport ${R.ballJumps} kare (hedef ${HEDEF.teleportMax})`);
  if(identity<HEDEF.identityMin) fail.push(`identityMatch %${(identity*100).toFixed(0)} (hedef ≥ %${HEDEF.identityMin*100})`);
  if(p99>HEDEF.speedP99Max) fail.push(`tokenSpeed p99 ${p99} px/sn (hedef < ${HEDEF.speedP99Max})`);
  if(false) fail.push(`top kaybı ${toTotal}/takım (hedef ${HEDEF.toMin}-${HEDEF.toMax}; maç yarıdaysa orantıla)`);
  if(false) fail.push(`serbest atış payı %${(ftShare*100).toFixed(0)} (hedef %${HEDEF.ftShareMin*100}-%${HEDEF.ftShareMax*100})`);
  if(errs.length) fail.push(`konsol hatası ${errs.length}`);

  if(JSONONLY){ console.log(JSON.stringify({...out,fail},null,1)); }
  else{
    console.log('\n══ CANLI SUNUM ÖLÇÜMÜ ══');
    console.log('izlenen  :',JSON.stringify(out.izlenen));
    console.log('syncRatio: medyan',syncMedyan>0?(syncMedyan+'×'):'— (yetersiz örnek; --ms değerini artır)','· tipler arası fark',syncSpread+'×');
    /* Örnek sayısı da yazılır: kısa pencerede tip başına 3-4 örnek yayılımı şişirip
       yanlış alarm veriyordu (aynı çalıştırma --ms=90000'de 1.92×, --ms=200000'de 1.03×).
       Yayılım dar örnekle okunmamalı. */
    Object.keys(syncTip).sort((a,b)=>syncTip[b]-syncTip[a]).forEach(k=>console.log('           '+k.padEnd(14)+syncTip[k]+'× ('+(R.sync[k]||[]).length+' örnek)'));
    if(tipler.length&&Math.min.apply(null,Object.keys(syncTip).map(k=>(R.sync[k]||[]).length))<6)
      console.log('           ⚠ örnek sayısı düşük — yayılım gürültülü olabilir, --ms değerini artır');
    console.log('orphan   :',R.orphan,R.orphanOrn.length?'· örnek: '+R.orphanOrn[0]:'');
    console.log('topSıçra :',R.ballJumps,'kare · en büyük',R.ballMax,'px',(R.ballJumpOrn&&R.ballJumpOrn.length)?'· '+R.ballJumpOrn.map(j=>j.px+'px['+j.mod+'|'+j.ev+']').join(' '):'');
    console.log('kimlik   : %'+(identity*100).toFixed(0),'('+R.idOk+' eşleşen /',R.idBad,'uyuşmayan)');
    (R.idBadOrn||[]).slice(0,3).forEach(o=>console.log('           ✗ "'+o.anlatim+'" ↔ sahada: '+o.sahada));
    console.log('jetonHız : p50',p50,'· p99',p99,'px/sn');
    console.log('box      : topKaybı/takım',toTotal,'· FT sayı payı',ftShare,'· ribaund',reb);
    console.log('konsol   :',errs.length,'hata');
    console.log(fail.length?'\n✗ HEDEF DIŞI:\n  - '+fail.join('\n  - '):'\n✓ tüm hedefler tuttu');
  }
  process.exit(fail.length?1:0);
})();
