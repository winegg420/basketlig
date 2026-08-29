/* CANLI SÜRÜM DENETİMİ — https://winegg420.github.io/basketlig/
   Gerçek yayındaki oyunu açar: kariyer kur → maç oyna → sayfaları gez → dil değiştir.
   Konsol hatası, kırık istek (404) ve akış hatası raporlar. Kullanım: node tools/live-check.js */
const path=require('path');
const {chromium}=require('playwright');
const BASE=process.env.LIVE_URL||'https://winegg420.github.io/basketlig/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch({channel:'chrome'});
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage();
  const errs=[],bad=[];
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  page.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  page.on('response',r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url()); });

  console.log('açılıyor:',BASE+'charazay2.0.html');
  await page.goto(BASE+'charazay2.0.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#loginPage',{state:'visible',timeout:30000});
  console.log('  giriş ekranı ✓');

  await page.click('#loginPage button.btn-p');
  await page.waitForSelector('#setupPage',{state:'visible',timeout:15000});
  await page.fill('#teamName','Canlı Test');
  await page.click('#setupPage button.btn-p');
  await page.waitForSelector('#app',{state:'visible',timeout:20000});
  await page.evaluate(()=>{try{closeAppModal();}catch(e){}});
  await sleep(600);
  const kadro=await page.evaluate(()=>({oyuncu:(G.players||[]).length,kasa:G.coins,rol:(G.players[0]||{}).rol}));
  console.log('  kariyer kuruldu ✓ — oyuncu:',kadro.oyuncu,'· kasa:',kadro.kasa,'· ilk oyuncunun rolü:',kadro.rol);

  for(const p of ['dashboard','takim','kadro','mac','lig','market','altyapi','antrenman','arena','bilanco','analiz']){
    await page.evaluate(pp=>showPage(pp,document.querySelector('#sbNav button[data-page="'+pp+'"]')),p);
    await sleep(250);
  }
  console.log('  11 sayfa gezildi ✓');

  await page.evaluate(()=>{const m=findNextUserSeasonMatch(); if(m) openMatchTactics(m.seasonMatchIx);});
  await sleep(600);
  const pb=await page.evaluate(()=>document.querySelectorAll('#pbOffGrid .pb-card').length);
  await page.evaluate(()=>{try{closeAppModal();}catch(e){}});
  console.log('  playbook kartı:',pb,pb>=10?'✓':'✗');

  await page.evaluate(()=>{showPage('mac',document.querySelector('#sbNav button[data-page="mac"]'));startMatch();});
  await sleep(9000);
  const mac=await page.evaluate(()=>({
    calisiyor:mState.running, skor:mState.score,
    anlatim:document.querySelectorAll('#commentary > *').length,
    btnKilit:document.getElementById('startMatchBtn').disabled
  }));
  console.log('  canlı maç ✓ — anlatım satırı:',mac.anlatim,'· skor:',JSON.stringify(mac.skor),'· buton kilidi:',mac.btnKilit);
  await page.evaluate(()=>{try{stopMatch();}catch(e){}});
  await page.screenshot({path:path.join(__dirname,'visual-check-output','live-tr.png')});

  // dil değişimi
  await page.evaluate(()=>localStorage.setItem('charazay_lang','en'));
  await page.reload({waitUntil:'domcontentloaded'});
  await sleep(1500);
  const en=await page.evaluate(()=>({
    lang:typeof getLang==='function'?getLang():'?',
    menu:Array.from(document.querySelectorAll('#sbNav button.ni')).map(b=>b.textContent.trim()).slice(0,4),
    rol:typeof ROLLER!=='undefined'?ROLLER.karartici.ad:'?'
  }));
  console.log('  EN modu ✓ — dil:',en.lang,'· menü:',en.menu.join(' | '),'· rol:',en.rol);
  await page.screenshot({path:path.join(__dirname,'visual-check-output','live-en.png')});

  console.log('\nKONSOL HATASI:',errs.length); errs.slice(0,6).forEach(e=>console.log('   '+e));
  const bad404=bad.filter(b=>!/favicon/i.test(b));
  console.log('KIRIK İSTEK:',bad404.length); bad404.slice(0,8).forEach(b=>console.log('   '+b));
  await browser.close();
  process.exit(errs.length||bad404.length?1:0);
})();
