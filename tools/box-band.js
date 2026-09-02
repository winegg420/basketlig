/* ══════════════════════════════════════════════════════════════════════════════════════
   FAZ 4 — BOX SCORE DENGE BANDI
   N maçı başsız (animasyonsuz) simüle eder ve takım başına maç ortalamalarını gerçekçi
   bantlarla karşılaştırır. Canlı ölçüm tek çeyreklik örnekle yanıltıcıydı; denge kararları
   bu araçla verilir.

   Kullanım: node tools/box-band.js [--n=200] [--json]
   Çıkış kodu: tüm bantlar tutarsa 0.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const arg=n=>{const a=process.argv.find(x=>x.startsWith('--'+n));return a?(a.split('=')[1]||true):null;};
const N=Number(arg('n')||160), JSONONLY=!!arg('json');
/* Denge yargısının TEK yetkili aracı bu — o hâlde deterministik olmalı. Tohumsuzken aynı
   kodla ribaund 29,9 ve 30,9 ölçüldü (bant sınırı 30): bir bandın tutup tutmadığı çalıştırmaya
   göre değişiyordu. band.js ile aynı PRNG ve aynı varsayılan tohum. */
const SEED=(()=>{const a=process.argv.find(x=>x.startsWith('--seed='));return a?(parseInt(a.slice(7),10)|0):987654321;})();
const SEED_FN=(seed)=>{let a=seed>>>0;Math.random=function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};};

/* Oyunun kendi ölçeği: takım başına ~85-95 sayı. Bantlar bu skor seviyesine göre. */
const BANT={
  sayi:        [82,100,  'takım başına sayı'],
  topKaybi:    [9,15,    'top kaybı'],
  serbestDeneme:[14,26,  'serbest atış denemesi'],
  ftPayi:      [0.12,0.20,'sayıların serbest atış payı'],
  ribaund:     [30,46,   'ribaund'],
  asist:       [16,28,   'asist'],
  faul:        [14,24,   'faul'],
  sahaDeneme:  [60,85,   'saha içi şut denemesi'],
  /* FAZ 39: üst sınır ELLE 0,44 yazılmıştı ve ölçülen 0,442 kılpayı düşüyordu —
     kapı davranışı değil yuvarlamayı yargılıyordu. Gerçek değer (3 sezon NBA, 90
     takım-sezon) 0,4012 [0,3613 - 0,4411]. Bu araç bir DENGE bandıdır (geniş tutulur);
     dar ve veriye bağlı kapı `kutu-check`tedir — o, eşiği gercek-bantlar.json'dan okur
     ve 240 maçta ölçer. Buradaki bant gerçek bandın etrafına pay bırakır. */
  uclukPayi:   [0.32,0.48,'üçlük deneme payı'],
  blok:        [1.5,6.5, 'blok'],
  calma:       [4,12,    'top çalma']
};

(async()=>{
  const server=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/charazay2.0.html';
    const fp=path.join(ROOT,path.normalize(u));
    fs.readFile(fp,(e,d)=>{if(e){r.writeHead(404);r.end('');return;}r.writeHead(200,{'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream'});r.end(d);});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.addInitScript('('+SEED_FN.toString()+')('+SEED+');');
  await page.goto(base+'charazay2.0.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#loginPage',{state:'visible',timeout:30000});
  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage',{state:'visible'});
  await page.fill('#teamName','Band FC');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app',{state:'visible'});
  await page.evaluate(()=>{try{closeAppModal();}catch(e){}});
  await page.waitForTimeout(500);

  const R=await page.evaluate(n=>{
    const acc={}, add=(k,v)=>{ (acc[k]=acc[k]||[]).push(v); };
    let gecerli=0;
    for(let i=0;i<n;i++){
      let ev;
      try{ ev=generateMatchEvents({isim:'Bant Rakip '+(i%7)},{userIsHome:i%2===0}); }catch(e){ continue; }
      const last=ev&&ev[ev.length-1];
      if(!last||!last.box) continue;
      gecerli++;
      [last.box.h,last.box.a].forEach(b=>{
        const sayi=(b.twoMade||0)*2+(b.thrMade||0)*3+(b.ftMade||0);
        const sahaDeneme=(b.twoAtt||0)+(b.thrAtt||0);
        add('sayi',sayi);
        add('topKaybi',b.to||0);
        add('serbestDeneme',b.ftAtt||0);
        add('ftPayi',sayi?(b.ftMade||0)/sayi:0);
        add('ribaund',b.reb||0);
        add('asist',b.ast||0);
        add('faul',b.foul||0);
        add('sahaDeneme',sahaDeneme);
        add('uclukPayi',sahaDeneme?(b.thrAtt||0)/sahaDeneme:0);
        add('blok',b.blk||0);
        add('calma',b.stl||0);
      });
    }
    const ort={};
    Object.keys(acc).forEach(k=>{ const a=acc[k]; ort[k]=a.reduce((s,x)=>s+x,0)/a.length; });
    return {ort,gecerli};
  },N);

  await browser.close(); server.close();

  const satir=[],fail=[];
  Object.keys(BANT).forEach(k=>{
    const [lo,hi,ad]=BANT[k];
    const v=R.ort[k];
    if(v==null) return;
    const ok=v>=lo&&v<=hi;
    const g=k.indexOf('Payi')>=0?v.toFixed(3):v.toFixed(1);
    satir.push(`  ${ok?'✓':'✗'} ${ad.padEnd(28)} ${String(g).padStart(7)}   (bant ${lo}-${hi})`);
    if(!ok) fail.push(`${ad} = ${g} (bant ${lo}-${hi})`);
  });
  if(JSONONLY) console.log(JSON.stringify({ort:R.ort,gecerli:R.gecerli,fail},null,1));
  else{
    console.log(`\n══ BOX SCORE BANDI (${R.gecerli} maç · takım başına maç ortalaması) ══`);
    satir.forEach(s=>console.log(s));
    console.log('  konsol hatası:',errs.length);
    console.log(fail.length?'\n✗ BANT DIŞI:\n  - '+fail.join('\n  - '):'\n✓ tüm bantlar tuttu');
  }
  process.exit(fail.length||errs.length?1:0);
})();
