#!/usr/bin/env node
/* FAZ 42 — DURDUR → (rAF kapanana kadar bekle) → DEVAM ET: sahne gerçekten canlanıyor mu?
   Kullanıcı raporu: "maçı durdur başlat yapınca görüntü takılıyor, maç izlenmiyor".
   Kök neden: `_simStart` döngüsü maç durdurulunca 3 sn sonra kendini kapatıyor (S.raf=null),
   `resumeMatch` ise yalnız OLAY kuyruğunu diriltiyordu. */
const http=require('http'), fs=require('fs'), path=require('path');
const { chromium }=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8',
  '.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function srv(){return new Promise(res=>{const s=http.createServer((q,r)=>{try{
  let u=decodeURIComponent(q.url.split('?')[0]); if(u==='/')u='/charazay2.0.html';
  const f=path.join(ROOT,path.normalize(u).replace(/^(\.\.[/\\])+/,''));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end('404');return;}
  r.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream'});
  fs.createReadStream(f).pipe(r);}catch(e){r.writeHead(500);r.end('500');}});s.listen(0,'127.0.0.1',()=>res(s));});}

(async()=>{
  const server=await srv(), base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true,
    args:['--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const hata=[];
  try{
    const ctx=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await ctx.newPage();
    page.on('console',m=>{ if(m.type()==='error') hata.push(m.text()); });
    page.on('pageerror',e=>hata.push('pageerror: '+e.message));
    await page.goto(base+'/charazay2.0.html?test=1',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#loginPage',{state:'visible',timeout:15000});
    await page.click('#loginPage button.btn-p');
    await page.waitForSelector('#setupPage',{state:'visible',timeout:8000});
    await page.fill('#teamName','Durdur Testi');
    await page.click('#setupPage button.btn-p');
    await page.waitForSelector('#app',{state:'visible',timeout:8000});
    await page.evaluate(()=>{ try{ closeAppModal(); }catch(e){} });
    await page.evaluate(()=>showPage('mac',document.querySelector('#sbNav button[data-page="mac"]')));
    await sleep(400);
    await page.evaluate(()=>{ setMatchRate(1); startMatch(); });
    await sleep(3000);
    await page.evaluate(()=>stopMatch());
    /* rAF döngüsünün kendini kapatması için 3 sn'lik boşta kalma süresinden fazla bekle */
    await sleep(4500);
    const once=await page.evaluate(()=>{
      const S=mState._sim;
      return {raf:!!(S&&S.raf), etiket:(document.getElementById('startMatchBtn')||{}).textContent||'',
              idx:mState.idx, kon:(S?S.players:[]).map(p=>[Math.round(p.x),Math.round(p.y)]),
              top:S?[Math.round(S.ball.x),Math.round(S.ball.y)]:null};
    });
    await page.evaluate(()=>{ startMatch(); });   /* butonun yaptığı şey */
    await sleep(2500);
    const sonra=await page.evaluate(()=>{
      const S=mState._sim;
      return {raf:!!(S&&S.raf), running:!!mState.running, idx:mState.idx,
              kon:(S?S.players:[]).map(p=>[Math.round(p.x),Math.round(p.y)]),
              top:S?[Math.round(S.ball.x),Math.round(S.ball.y)]:null};
    });
    const oynayan=once.kon.filter((c,i)=>Math.hypot(c[0]-sonra.kon[i][0],c[1]-sonra.kon[i][1])>4).length;
    const topYol=Math.hypot(once.top[0]-sonra.top[0],once.top[1]-sonra.top[1]);
    console.log('\n==== DURDUR → DEVAM ET ====');
    console.log('durdurulduktan 4,5 sn sonra: rAF döngüsü açık mı ='+once.raf+' · buton "'+once.etiket.trim()+'"');
    console.log('devam sonrası: rAF='+sonra.raf+' · running='+sonra.running+' · olay '+once.idx+' → '+sonra.idx);
    console.log('2,5 sn içinde yer değiştiren jeton: '+oynayan+'/10 · topun aldığı yol: '+Math.round(topYol)+' px');
    const gecti=(sonra.raf&&sonra.running&&oynayan>=6&&sonra.idx>once.idx&&!hata.length);
    console.log('konsol hatası: '+hata.length+(hata.length?(' → '+hata[0]):''));
    console.log(gecti?'✓ GEÇTİ — sahne devam ettirildiğinde gerçekten canlanıyor':'✗ DÜŞTÜ');
    process.exitCode=gecti?0:1;
  } finally { await browser.close(); server.close(); }
})();
