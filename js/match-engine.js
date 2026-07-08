const AWAY_SHOT_COLOR='#22c55e';

function emptyBox(){
  return {twoMade:0,twoAtt:0,thrMade:0,thrAtt:0,ftMade:0,ftAtt:0,reb:0,ast:0,to:0,stl:0,blk:0,foul:0};
}
function cloneBox(b){return {...b};}
function cloneQx(o){return {...o};}

function randShotXY(isHome,is3,made){
  if(isHome){
    if(is3){
      return made
        ? {x:rand(125,455),y:rand(38,455)}
        : {x:rand(70,455),y:rand(42,458)};
    }
    return made
      ? {x:rand(95,340),y:rand(175,325)}
      : {x:rand(85,380),y:rand(120,385)};
  }
  if(is3){
    return made
      ? {x:rand(485,815),y:rand(38,455)}
      : {x:rand(485,870),y:rand(42,458)};
  }
  return made
    ? {x:rand(600,850),y:rand(175,325)}
    : {x:rand(560,855),y:rand(120,385)};
}

function clearMatchCourt(){
  const layer=document.getElementById('shotsLayer');
  if(layer) layer.innerHTML='';
  clearBallTimers();
  const b=document.getElementById('liveBall');
  if(b){ b.style.opacity='0'; b.style.transition='none'; b.setAttribute('transform','translate(470,250)'); }
  if(typeof mState!=='undefined'&&mState) mState._ballXY=[470,250];
  clearMatchPlayers();
}

/* ── Sahadaki 5v5 oyuncu jetonları (canlı hareket) ───────────────────────────
   İç saha SVG'sinde (viewBox 0 0 940 500) 10 jeton; her olayda ofans/defans
   şablonuna göre kayar. Ev sol potaya (~102,250), rakip sağ potaya (~837,250)
   hücum eder — gerçek basket gibi iki takım da aynı yarı sahada toplanır. */
function _tokShort(name){ const a=String(name||'').trim().split(/\s+/); return a[a.length-1]||String(name||''); }
function _tokSet(g,x,y){ if(g) g.setAttribute('transform',`translate(${x.toFixed(1)},${y.toFixed(1)})`); }
function clearMatchPlayers(){
  const l=document.getElementById('playersLayer');
  if(l) l.remove();
  if(typeof mState!=='undefined'&&mState) mState._tokens=null;
}
function initMatchPlayers(lu,rakip,oppNames){
  try{
    const ball=document.getElementById('liveBall');
    const svg=ball&&ball.parentNode;
    if(!svg) return;
    clearMatchPlayers();
    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
    layer.setAttribute('id','playersLayer');
    svg.insertBefore(layer,ball); /* top jetonların üstünde kalsın */
    const homeCol=(G.team&&G.team.renk)||'#f97316';
    const awayCol='#16a34a';
    const mk=(num,label,fill)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('class','court-token');
      g.style.transition='transform 0.7s cubic-bezier(.4,.05,.3,1)';
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('r','16'); c.setAttribute('fill',fill);
      c.setAttribute('stroke','rgba(0,0,0,0.6)'); c.setAttribute('stroke-width','2.5');
      const t=document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('text-anchor','middle'); t.setAttribute('dy','5.5');
      t.setAttribute('font-size','17'); t.setAttribute('font-weight','800');
      t.setAttribute('fill','#fff'); t.setAttribute('pointer-events','none'); t.textContent=num;
      const nm=document.createElementNS('http://www.w3.org/2000/svg','text');
      nm.setAttribute('text-anchor','middle'); nm.setAttribute('dy','31');
      nm.setAttribute('font-size','13'); nm.setAttribute('font-weight','700');
      nm.setAttribute('fill','rgba(255,255,255,0.95)'); nm.setAttribute('stroke','rgba(0,0,0,0.5)');
      nm.setAttribute('stroke-width','0.4'); nm.setAttribute('pointer-events','none'); nm.textContent=label;
      g.appendChild(c); g.appendChild(t); g.appendChild(nm);
      layer.appendChild(g);
      return g;
    };
    const homeP=(lu&&lu.onCourt)?lu.onCourt.slice(0,5):[];
    mState._tokens={home:[],away:[]};
    for(let i=0;i<5;i++){ const p=homeP[i]; mState._tokens.home.push(mk(String(i+1),p?_tokShort(p.isim):('Ev'+(i+1)),homeCol)); }
    const rk=(rakip&&rakip.isim)?_tokShort(rakip.isim):'Rakip';
    for(let i=0;i<5;i++){ const on=(oppNames&&oppNames[i])?_tokShort(oppNames[i]):rk; mState._tokens.away.push(mk(String(i+1),on,awayCol)); }
    mState._lastAttackHome=true;
    /* tip-off: orta sahada karşılıklı diz */
    const hs=[[430,150],[430,350],[405,250],[360,185],[360,315]];
    const as=[[510,150],[510,350],[535,250],[580,185],[580,315]];
    mState._tokens.home.forEach((g,i)=>_tokSet(g,hs[i][0],hs[i][1]));
    mState._tokens.away.forEach((g,i)=>_tokSet(g,as[i][0],as[i][1]));
  }catch(e){}
}
function movePlayersForEvent(ev){
  try{
    if(typeof mState==='undefined'||!mState||!mState._tokens) return;
    let attackHome=mState._lastAttackHome!==false;
    let shot=null;
    if(ev&&ev.shot){ attackHome=!!ev.shot.isHome; shot={x:ev.shot.x,y:ev.shot.y}; }
    else if(ev&&ev.isHome!=null){ attackHome=!!ev.isHome; }
    mState._lastAttackHome=attackHome;
    const jit=n=>n+(Math.random()*2-1)*14;
    const mir=([x,y])=>[940-x,y];
    /* sol yarı şablonu (sol potaya hücum) */
    const offL=[[shot?shot.x:185,shot?shot.y:250],[245,120],[245,380],[340,195],[340,305]];
    const defL=[[150,185],[150,315],[210,250],[118,150],[118,350]];
    let off,def;
    if(attackHome){ off=offL; def=defL; }
    else{
      off=offL.map((p,i)=> i===0 ? [shot?shot.x:755, shot?shot.y:250] : mir(p));
      def=defL.map(mir);
    }
    const offTok=attackHome?mState._tokens.home:mState._tokens.away;
    const defTok=attackHome?mState._tokens.away:mState._tokens.home;
    /* Uygulanan (jitter'lı) hücum konumlarını sakla — top bu GERÇEK noktalara paslanır. */
    const finalOff=offTok.map((g,i)=>{ const c=off[i]||off[0]; const x=(i===0?c[0]:jit(c[0])); const y=(i===0?c[1]:jit(c[1])); _tokSet(g,x,y); return [x,y]; });
    defTok.forEach((g,i)=>{ const c=def[i]||def[0]; _tokSet(g, jit(c[0]), jit(c[1])); });
    mState._offPos=finalOff;
    mState._attackHome=attackHome;
  }catch(e){}
}
/* ── Top hareketi (çok ayaklı, gerçekçi): topu getir → oyun kur → pas → şut ──
   Tek "ışınlanma" yerine top hücum boyunca ayak ayak akar; taraf değişince
   sahayı boydan boya geçer (ani geçiş yok). Anlatım/ses top vardığında tetiklenir. */
let _ballLegTimer=null,_ballArriveTimer=null,_ballFadeTimer=null;
function clearBallTimers(){
  [_ballLegTimer,_ballArriveTimer,_ballFadeTimer].forEach(t=>{ if(t) clearTimeout(t); });
  _ballLegTimer=_ballArriveTimer=_ballFadeTimer=null;
}
function _ballMove(x,y,ms){
  const b=document.getElementById('liveBall'); if(!b) return;
  b.style.transition='transform '+(ms/1000).toFixed(2)+'s cubic-bezier(.34,.02,.28,1),opacity 0.3s';
  b.setAttribute('transform','translate('+x.toFixed(1)+','+y.toFixed(1)+')');
  mState._ballXY=[x,y];
}
function _ballPath(legs){
  const b=document.getElementById('liveBall'); if(!b) return;
  if(_ballLegTimer){ clearTimeout(_ballLegTimer); _ballLegTimer=null; }
  b.style.opacity='0.98';
  let i=0;
  const run=()=>{ if(i>=legs.length) return; const w=legs[i]; i++; _ballMove(w.x,w.y,w.ms); _ballLegTimer=setTimeout(run,w.ms); };
  run();
}
/** Bir hücumu canlandır. sh:{x,y,isHome,made}. Top GERÇEK hücum oyuncularına paslanır,
    şutöre (şut noktası) gelir, sonra (girerse) potaya. onArrive şut anında (top şutöre varınca) çağrılır. */
function animateShotPossession(sh,onArrive){
  const b=document.getElementById('liveBall'); if(!b) return;
  try{
    clearBallTimers();
    const home=!!sh.isHome;
    const start=mState._ballXY||[470,250];
    const off=(mState._offPos&&mState._offPos.length>=5)?mState._offPos:null;
    const rim=home?[112,250]:[828,250];
    const dist=(a,c)=>Math.hypot(a[0]-c[0],a[1]-c[1]);
    /* 1) Oyun kurucu topu kendi yarısından karşıya YAVAŞÇA getirir (mesafeye göre süre). */
    const bring=[home?430:510, 250+rand(-28,28)];
    const ms1=Math.min(900,Math.max(560,Math.round(dist(start,bring)*1.3)));
    const legs=[{x:bring[0],y:bring[1],ms:ms1}];
    /* 2) 2 gerçek hücum oyuncusuna pas (şutör hariç, off[1..4] token konumları). */
    let passers=[];
    if(off){
      const idxs=[1,2,3,4].filter(i=>off[i]);
      for(let k=idxs.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); const tmp=idxs[k]; idxs[k]=idxs[j]; idxs[j]=tmp; }
      passers=idxs.slice(0,2).map(i=>off[i]);
    } else {
      passers=[[home?300:640,250],[home?248:692,(sh.y<250?165:335)]];
    }
    passers.forEach(p=>legs.push({x:p[0],y:p[1],ms:400}));
    /* 3) Son pas şutöre = şut noktası. */
    legs.push({x:sh.x,y:sh.y,ms:400});
    _ballPath(legs);
    const arriveMs=legs.reduce((a,l)=>a+l.ms,0);
    _ballArriveTimer=setTimeout(()=>{
      try{ if(typeof onArrive==='function') onArrive(); }catch(e){}   /* şut izi + ses tam bu an */
      if(sh.made) _ballMove(rim[0],rim[1],320);                       /* file: potaya */
      _ballFadeTimer=setTimeout(()=>{ const bb=document.getElementById('liveBall'); if(bb) bb.style.opacity='0.30'; }, sh.made?900:680);
    },arriveMs);
    return arriveMs;
  }catch(e){ return 0; }
}

/** Şut izi: isabet "O", kaçan "X" — takım rengiyle. */
function drawShotMark(sh){
  const layer=document.getElementById('shotsLayer');
  if(!layer) return;
  const homeCol=(G.team&&G.team.renk)||'#f97316';
  const col=sh.isHome?homeCol:AWAY_SHOT_COLOR;
  const t=document.createElementNS('http://www.w3.org/2000/svg','text');
  t.setAttribute('x',sh.x); t.setAttribute('y',sh.y);
  t.setAttribute('text-anchor','middle'); t.setAttribute('dy','6.5');
  t.setAttribute('font-size', sh.made?'20':'18');
  t.setAttribute('font-weight','900');
  t.setAttribute('fill',col);
  t.setAttribute('stroke','rgba(0,0,0,0.5)'); t.setAttribute('stroke-width','0.6');
  t.setAttribute('pointer-events','none');
  t.textContent=sh.made?'O':'X';
  layer.appendChild(t);
}

/** Şut filtresi: 'live' = bu çeyrek (canlı, her çeyrek sıfırlanır), 'all' = tüm maç, '1'..'4' = çeyrek. */
function shotPassesFilter(sh){
  const f=mState.shotFilter||'live';
  if(f==='all') return true;
  if(f==='live') return String(sh.q)===String(mState.quarter);
  return String(sh.q)===String(f);
}
function redrawAllShots(){
  const layer=document.getElementById('shotsLayer');
  if(!layer) return;
  layer.innerHTML='';
  (mState.allShots||[]).forEach(sh=>{ if(shotPassesFilter(sh)) drawShotMark(sh); });
}
function setShotFilter(v){
  mState.shotFilter=v;
  redrawAllShots();
}

/** Parke merkez markası: arena adı + takım amblemi/adı. startMatch'te çağrılır. */
function updateCourtBranding(rakip){
  try{
    const set=(id,txt)=>{ const e=document.getElementById(id); if(e) e.textContent=txt; };
    set('courtArenaName', String((G.arena&&G.arena.isim)||'').toUpperCase());
    set('courtHomeName', String((G.team&&G.team.isim)||'').toUpperCase().slice(0,16));
    const logo=document.getElementById('courtLogo');
    const fb=document.getElementById('courtLogoFb');
    const fbT=document.getElementById('courtLogoFbT');
    const url=G.team&&G.team.logoUrl;
    if(logo&&url){
      logo.setAttributeNS('http://www.w3.org/1999/xlink','href',url);
      logo.setAttribute('href',url);
      logo.style.display=''; if(fb) fb.style.display='none';
    } else {
      if(logo) logo.style.display='none';
      if(fb) fb.style.display='';
      if(fbT) fbT.textContent=String((G.team&&G.team.isim)||'?').trim().charAt(0).toUpperCase();
    }
  }catch(e){}
}

function renderBoxScore(bh,ba,homeName,awayName){
  const pct=(m,a)=>!a?'0.0':((m/a)*100).toFixed(1);
  const rows=[
    ['2 Sayı',`${bh.twoMade}/${bh.twoAtt} (${pct(bh.twoMade,bh.twoAtt)}%)`,`${ba.twoMade}/${ba.twoAtt} (${pct(ba.twoMade,ba.twoAtt)}%)`],
    ['3 Sayı',`${bh.thrMade}/${bh.thrAtt} (${pct(bh.thrMade,bh.thrAtt)}%)`,`${ba.thrMade}/${ba.thrAtt} (${pct(ba.thrMade,ba.thrAtt)}%)`],
    ['Serbest Atış',`${bh.ftMade}/${bh.ftAtt} (${pct(bh.ftMade,bh.ftAtt)}%)`,`${ba.ftMade}/${ba.ftAtt} (${pct(ba.ftMade,ba.ftAtt)}%)`],
    ['Ribaund',String(bh.reb),String(ba.reb)],
    ['Asist',String(bh.ast),String(ba.ast)],
    ['Top Kaybı',String(bh.to),String(ba.to)],
    ['Top Çalma',String(bh.stl),String(ba.stl)],
    ['Blok',String(bh.blk),String(ba.blk)],
    ['Faul',String(bh.foul),String(ba.foul)]
  ];
  const html=rows.map(([a,b,c])=>`<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('');
  [['boxScoreBody','bsHomeName','bsAwayName'],['boxScoreBodymac','bsHomeNamemac','bsAwayNamemac']].forEach(([bid,hid,aid])=>{
    const body=document.getElementById(bid);
    if(!body) return;
    const hn=document.getElementById(hid);
    const an=document.getElementById(aid);
    if(hn) hn.textContent=homeName||'Ev';
    if(an) an.textContent=awayName||'Dep';
    body.innerHTML=html;
  });
}

function updateQuarterBoard(qh,qa,totH,totA){
  const box=document.getElementById('quarterScores');
  if(box){
    const kz=Object.keys(qh||{}).map(Number).filter(k=>k>0).sort((a,b)=>a-b);
    const parts=[];
    for(const k of kz){
      if(k<=4) parts.push(`<span>Ç${k}: <b>${qh[k]||0}-${qa[k]||0}</b></span>`);
      else parts.push(`<span>U${k-4}: <b>${qh[k]||0}-${qa[k]||0}</b></span>`);
    }
    parts.push(`<span>Toplam: <b>${totH}-${totA}</b></span>`);
    box.innerHTML=parts.join('');
  }
}

/* ── 4 spiker sistemi (Madde 11) + zengin anlatım havuzu (Madde 10) ──
   Her maçın başında bir spiker atanır; her spikerin kendi tonu ve cümle havuzu var.
   %S=atan, %B=blok yapan, %C=çalan, %SC=skor. */
const SPIKERS=[
  {id:'cosku',ad:'Coşkun Bağrışan',stil:'Heyecanlı',emoji:'🔥'},
  {id:'bilge',ad:'Bilge Hoca',stil:'Analitik',emoji:'🧠'},
  {id:'cem',ad:'Esprili Cem',stil:'Esprili',emoji:'😄'},
  {id:'reha',ad:'Klasik Reha',stil:'Resmî',emoji:'🎙️'}
];
const SPIKER_LINES={
  cosku:{
    score2:['%S POTAYA ASILDI, İKİ SAYI! %SC','%S BOYALI ALANI YIKTI! %SC','%S DURDURULAMIYOR, kolay iki! %SC','%S ORTA MESAFEDEN VURDU, muhteşem! %SC','%S pota altında CANAVAR gibi! %SC','%S turnikeyi PATLATTI! %SC'],
    score3:['%S DERİNDEN BOMBAYI PATLATTI — ÜÇLÜK! %SC','%S ÜÇLÜĞÜ GÖMDÜ, tribün ayakta! %SC','%S köşeden NİŞANCI gibi, üç! %SC','%S UZAKTAN VURDU, inanılmaz! %SC','%S yaydan ATEŞ etti — SWISH! %SC','%S logodan denedi ve GİRDİ! %SC'],
    miss2:['%S kaçırdı, POTA İZİN VERMEDİ!','%S turnikede tökezledi!','%S bu sefer olmadı, çember reddetti!','%S yakındaydı ama SEKTİ!','%S iki sayıyı kaçırdı, yazık!'],
    miss3:['%S üçlüğü KAÇTI, çemberden döndü!','%S uzaktan ıskaladı, olmadı!','%S bombayı boşa harcadı!','%S yay dışından vuramadı!'],
    block:['%B MUAZZAM BLOK! %S geri döndü!','%B ŞAPKAYI TAKTI! İnanılmaz savunma!','%B topu SİLİP ATTI, ne blok ama!','%B duvar gibi, %S durduruldu!'],
    steal:['%C TOPU KAPTI, hızlı hücum geliyoo!','%C pas arasını OKUDU, çaldı!','%C elini uzattı ve ALDI!','%C müthiş bir top çalma, koşuyor!'],
    tactic:['Ritim değişiyor — tempo yükseliyoo!','Savunma kilitlendi, enerji tavanda!','Baskı artıyor, tribün ayakta!','Hücumda yeni varyasyon geliyoo!']
  },
  bilge:{
    score2:['%S doğru okumayla iki sayı buldu. %SC','%S pick-and-roll sonrası temiz bitiriş. %SC','%S ayak oyunuyla pozisyon aldı, iki. %SC','%S orta mesafe jump shot, mekanik kusursuz. %SC','%S savunmanın açığını görüp bitirdi. %SC','%S sabırlı hücum, yüksek yüzdeli şut. %SC'],
    score3:['%S ayakları hazır, ritimli üçlük. %SC','%S spacing mükemmeldi, açık üç. %SC','%S catch-and-shoot, ders gibi. %SC','%S savunmayı yaydı ve cezalandırdı. %SC','%S transition üçlüğü, doğru karar. %SC','%S step-back ile alan yarattı, üç. %SC'],
    miss2:['%S zorlama şut seçti, isabetsiz.','%S dengesi bozuktu, kaçtı.','%S savunma baskısında yüzde düştü.','%S bitiriş açısı kapalıydı.','%S acele etti, olmadı.'],
    miss3:['%S ayakları hazır değildi, kısa.','%S kontestli üçlük, düşük yüzde.','%S ritim tutmadı, ıskaladı.','%S seçim tartışılır, kaçtı.'],
    block:['%B iyi zamanlama, temiz blok — %S durdu.','%B rotasyonu erken geldi, blokladı.','%B dikey savunma, kurallı blok.','%B okuma harika, %S engellendi.'],
    steal:['%C pas hattını kesti, kontrol onda.','%C anticipation üst düzey, çaldı.','%C ellerini aktif kullandı, top kaybı.','%C savunma disiplini, topu aldı.'],
    tactic:['Set oyunu düzenleniyor, sabırlı hücum.','Savunma rotasyonu yeniden ayarlanıyor.','Tempo kontrolü — doğru karar.','Spacing yeniden kuruluyor, akıllı oyun.']
  },
  cem:{
    score2:['%S potaya "merhaba" dedi, iki sayı! %SC','%S öyle bir bitirdi ki savunma özür diledi. %SC','%S turnikeyi servis etti, afiyet olsun! %SC','%S iki sayıyı cebe attı, kolay para! %SC','%S pota ile anlaştı, iki! %SC','%S savunmaya "pardon" bile demedi! %SC'],
    score3:['%S üçlüğü fırına verdi, kıptı! %SC','%S o kadar uzaktı ki bilet kesildi — üç! %SC','%S yayı gördü, "neden olmasın" dedi! %SC','%S bombayı bıraktı, GPS bile şaşırdı! %SC','%S üçlükte usta, file yandı! %SC','%S köşeden selam gönderdi — üç! %SC'],
    miss2:['%S kaçırdı, pota bugün nazlı!','%S ıskaladı, olur böyle şeyler!','%S turnike geri geldi, "hayır" dedi!','%S bu sefer file küstü!','%S kaçırdı, kahve molası lazım!'],
    miss3:['%S üçlüğü uzaya gönderdi!','%S ıskaladı, yay bugün sağır!','%S bombayı ekti, filiz vermedi!','%S kaçtı, çember diyet yapıyor!'],
    block:['%B "buraya giremezsin" dedi — blok!','%B topu iade etti, kargo bedava!','%B şapkayı taktı, %S şok!','%B kapıyı yüzüne kapadı!'],
    steal:['%C topu "ödünç" aldı, geri vermez!','%C cebe attı, hırsız değil ama!','%C pası dinledi, çaldı gitti!','%C eli değdi, top el değiştirdi!'],
    tactic:['Koç tahtaya bir şeyler karalıyor!','Taktik değişti, çaycı bile merak etti!','Yeni varyasyon — umarım işe yarar!','Hücumda plan B devreye giriyor!']
  },
  reha:{
    score2:['%S iki sayıyı buldu. %SC','%S pota altında tamamladı. %SC','%S orta mesafeden isabet kaydetti. %SC','%S basket, iki sayı hanesine. %SC','%S turnikeyi tamamladı. %SC','%S sağduyulu bir bitiriş. %SC'],
    score3:['%S üç sayılık isabet kaydetti. %SC','%S dış atıştan başarılı. %SC','%S üçlük çizgisinden buldu. %SC','%S uzak mesafeden isabet. %SC','%S üç sayı, skora katkı. %SC','%S yay dışından tamamladı. %SC'],
    miss2:['%S isabet bulamadı.','%S şutu kısa kaldı.','%S turnikede başarısız.','%S sayı üretemedi.','%S bu denemede isabetsiz.'],
    miss3:['%S üçlükte isabet yok.','%S dış atış tuttu değil.','%S uzaktan kaçırdı.','%S üç sayı denemesi boşa.'],
    block:['%B bloke etti; %S durduruldu.','%B temiz bir blok gerçekleştirdi.','%B savunmada blok kaydetti.','%B şutu engelledi.'],
    steal:['%C topu ele geçirdi.','%C top çalma kaydetti.','%C pası kesti.','%C savunmada topu aldı.'],
    tactic:['Taktik düzenleme yapılıyor.','Oyun temposu ayarlanıyor.','Savunma organizasyonu gözden geçiriliyor.','Set oyun kuruluyor.']
  }
};
/* Renkli hamle betimleri — isabetli (kendi yaratımı) şutlardan ÖNCE serpiştirilir.
   Şut cümlesi oyuncu adıyla başladığından bu girişler AD İÇERMEZ; tireyle şut metnine bağlanır. */
const MOVE_LINES=[
  'Tereyağından kıl çeker gibi rakibini uyuttu —',
  'Art arda çalım (crossover) savunmayı çözdü —',
  'İnanılmaz güzel bir sahte çalım (fake), savunmacı dondu —',
  'Geriye çekilerek (step-back) alanı açtı —',
  'Dönerek (spin move) savunmadan sıyrıldı —',
  'Çift krosover sonrası rakibini adeta pazara yolladı —',
  'Yıldırım gibi ilk adımla dibe indi —',
  'Beklet-yükle ile savunmayı ters ayak yakaladı —',
  'Hesitasyon (bekletme) çalımıyla geçti —',
  'Çaprazdan sert bir çalım attı, savunma dağıldı —'
];
const REB_OFF_LINES=[
  '%R hücum ribaundunu çok yükseklerden çekti — ikinci şans bizde!',
  'Muhteşem box-out; %R rakibini pazara yolladı, top yeniden bizde!',
  '%R camlara asıldı ve hücum ribaundunu kaptı!',
  '%R topu adeta tavandan indirdi, ekstra hücum!'
];
const REB_DEF_LINES=[
  '%R savunma ribaundunu güçlü aldı, cam tertemiz!',
  'Sağlam box-out; %R ribaundu topladı.',
  '%R yükseldi ve defansif camı kapattı.',
  '%R ribaundu çekti, hızlı geçişe çıkıyor!'
];
function spikerLine(spId,kind,v){
  const set=SPIKER_LINES[spId]||SPIKER_LINES.reha;
  const pool=set[kind]||SPIKER_LINES.reha[kind]||[''];
  v=v||{};
  /* %SC (skor) önce değiştirilmeli; yoksa %S onun içindeki "%S"i yiyip skoru "AdC"ye çevirir. */
  return ch(pool).replace(/%SC/g,v.sc||'').replace(/%S/g,v.s||'').replace(/%B/g,v.b||'').replace(/%C/g,v.c||'');
}

function generateMatchEvents(rakip, opts){
  opts=opts||{};
  const userIsHome=opts.userIsHome!==undefined?!!opts.userIsHome:true;
  const resume=opts.resume||null;   /* Madde 12: manuel değişiklik sonrası kalan maçı yeniden üret */
  /* Maç başına spiker ata (rotasyonlu — sezon maç sayısına göre + rastgele öğe). */
  const spikerIx=(Math.abs((G.wins||0)+(G.losses||0))+rand(0,3))%SPIKERS.length;
  const SP=(resume&&resume.spId)?(SPIKERS.find(s=>s.id===resume.spId)||SPIKERS[spikerIx]):SPIKERS[spikerIx];
  const lu=matchLineup();
  if(!lu||!lu.pg){
    const emptyQ={1:0,2:0,3:0,4:0};
    return [{
      type:'end',
      text:'Sağlıklı oyuncu kalmadı — maç oynanamıyor.',
      q:1,t:0,home:0,away:0,winner:'draw',
      box:{h:emptyBox(),a:emptyBox()},qh:cloneQx(emptyQ),qa:cloneQx(emptyQ)
    }];
  }
  const {pg,sg,sf,pf,c}=lu;
  /* Takım gücü etkisi: kadro OFR/DEF ↔ rakip sanal gücü → şut isabet çarpanı (±%16 sınırlı).
     Böylece güçlü kadro kurmanın maç sonucuna gerçek etkisi olur; rastgelelik korunur. */
  const rrStr=computeRosterOfrDef();
  const ligKey=G.team&&G.team.tblKey?G.team.tblKey:'tbl';
  const oppName=(rakip&&rakip.isim)||'Rakip';
  const oppStr=pseudoTeamStrength(oppName,ligKey)+((G.season&&G.season.drift&&G.season.drift[oppName])||0);
  const uq=Math.max(0,Math.min(1,((rrStr.ofr+rrStr.def)/2-190)/130));
  const oq=Math.max(0,Math.min(1,(oppStr-58)/42));
  const strengthEdge=Math.max(-0.16,Math.min(0.16,(uq-oq)*0.22));
  /* Madde 8/9: koç skoru + menajer itibarı küçük ek çarpan olarak kullanıcı lehine (maks ~+%5.5). */
  const uMul=(1+strengthEdge)*teamBonusFactor(), oMul=1-strengthEdge;
  /* Taktik etkisi (Faz 3: derinleştirildi): tempo·hücum odağı·savunma stili·top yükleme·yıldız eşleştirme.
     VARSAYILANLAR (tempo=normal, odak=dengeli, savunma=adam, yükleme yok, eşleştirme kapalı) tam olarak
     eski davranışı üretir — skor bandı (~86-90) korunur; yalnız kullanıcı seçimleri dengeyi kaydırır. */
  const tac=G.tactics||{};
  const tempo=tac.tempo||'normal';
  const odak=tac.odak||'dengeli';
  const defStyle=tac.defensiveStyle||'adam';        /* adam / bolge / pres */
  const markStar=!!tac.markStar;                     /* rakibe özel eşleştirme (en iyi savunmacı ↔ rakip yıldızı) */
  const focusPlayerId=tac.focusPlayerId||null;       /* belirli oyuncuya top yükleme */
  /* Pozisyon süresi (sn) — 10 dk (600 sn) çeyrekte gerçekçi pozisyon sayısı üretir.
     Hızlı tempo daha çok pozisyon → daha yüksek skor; yavaş tempo kontrollü/az pozisyon. */
  const decLo=tempo==='hizli'?9:tempo==='yavas'?12:10;
  const decHi=tempo==='hizli'?17:tempo==='yavas'?24:20;
  const playsMax=tempo==='hizli'?56:tempo==='yavas'?40:48;
  const tempoAcc=(tempo==='yavas'?0.02:tempo==='hizli'?-0.01:0);
  /* Hücum odağı: içeri / dış şut / hızlı hücum / set oyun (+ eski "dengeli" varsayılanı). */
  const userIs3Oran=odak==='dis'?0.42:odak==='ic'?0.18:odak==='hizli'?0.26:odak==='set'?0.30:0.30;
  const acc2=(odak==='ic'?0.03:odak==='set'?0.02:odak==='hizli'?-0.02:0)+tempoAcc;
  const acc3=(odak==='dis'?-0.01:odak==='set'?0.01:odak==='hizli'?-0.02:0)+tempoAcc;
  const offAstBonus=odak==='set'?0.10:odak==='hizli'?-0.05:0;  /* set oyun asist ↑, hızlı hücum ↓ */
  /* Top kaybı — VARSAYILANI (dengeli/adam) tam korumak için: azaltma çarpanla (set/bölge, keep<1),
     artırma additive pre-blokla (hızlı hücum/pres). Nötr seçimlerde keep=1 → eski davranış birebir. */
  const offStealKeep=odak==='set'?0.70:1.0;   /* set oyun: kullanıcı top kaybı azalır */
  const offRushTO=odak==='hizli'?0.05:0;       /* hızlı hücum: kullanıcı ekstra top kaybı riski */
  /* Savunma stili → RAKİP isabeti + top kaybı (kullanıcı savunurken, userPos=false).
     adam: nötr; bölge: 2'lik ↓ / 3'lük ↑ / çalma ↓; pres: çalma ↑ / isabet hafif ↑ (risk-ödül). */
  const defOppAcc2Mul=defStyle==='bolge'?0.94:defStyle==='pres'?1.03:1.0;
  const defOppAcc3Mul=defStyle==='bolge'?1.05:defStyle==='pres'?1.02:1.0;
  const defStealKeep=defStyle==='bolge'?0.78:1.0;  /* bölge: rakip top kaybı yaptırma azalır */
  const defPressTO=defStyle==='pres'?0.06:0;         /* pres: rakip pozisyonunda ekstra top kaybı riski */
  /* A1: Rakip takım artık "soyut" değil. Kalıcı (localStorage önbelleğindeki) gerçek kadrodan
     sabit bir 5 + yedek kurulur; kullanıcı takımıyla AYNI derinlikte maç istatistiği, faul sayacı
     ve oyundan atılma işler. Sakat rakip oyuncular sahaya çıkmaz (kalıcı sakatlık takibi). */
  let oppFull=[];
  try{ oppFull=(getBotClubProfile(oppName,ligKey).roster||[]).slice(); }catch(e){ oppFull=[]; }
  /* ── Madde 2/3/4: kullanıcı şutörünün kendi statı + enerjisi + moral/kimya isabeti belirler ──
     Takım gücü (uMul) ikincil çarpan olarak kalır; genel skor bandı (~85-95) korunur. */
  const teamChem=Math.max(0,Math.min(100,Number(G.chemistry!=null?G.chemistry:75)));
  const shooterAcc=(shooter,is3,base,clutch)=>{
    const s2=statN(shooter,'hucum')*0.5+statN(shooter,'sutIsabeti')*0.5;
    const s3=statN(shooter,'sutIsabeti')*0.7+statN(shooter,'hucum')*0.3;
    const skill=is3?s3:s2;
    const skillMul=1+(skill-70)/100*0.6;                 /* ~0.91..1.13 (avg 70 → 1.0) */
    const en=Math.max(0,Math.min(100,Number(shooter.enerji!=null?shooter.enerji:100)));
    const enMul=0.85+en/100*0.17;                        /* 0.85..1.02 — bireysel yorgunluk */
    const mood=Number(shooter.mood!=null?shooter.mood:70);
    const psyMul=Math.max(0.95,Math.min(1.05,1+((mood-60)/40)*0.04+((teamChem-70)/30)*0.03));
    /* Madde 36: kritik anlarda (son 2 dk / uzatma) zekâsı yüksek oyuncu daha iyi karar verir. */
    let clutchMul=1;
    if(clutch){ clutchMul=Math.max(0.94,Math.min(1.08,1+(statN(shooter,'zeka')-70)/100*0.10)); }
    return base*skillMul*enMul*psyMul*clutchMul*uMul;
  };
  const ftMake=(shooter)=>{
    const sb=statN(shooter,'serbest');
    return Math.random()<Math.max(0.45,Math.min(0.95,0.55+sb/100*0.30));
  };
  /* ── Faul sistemi (Madde 16/17/20) ──
     Her kullanıcı oyuncusunun kendi faulü (p.matchFouls) tutulur; 5. faulde oyundan atılır ve
     yedek sırasından (benchQueue) değiştirilir. Çeyrek bazında takım faulü sayılır; 5. takım
     faulünden sonra ortak (şutsuz) fauller otomatik 2 serbest atışa (bonus) döner. */
  const foulLimit=5;
  const qFoulU=resume&&resume.qFoulU?Object.assign({},resume.qFoulU):{};
  const qFoulO=resume&&resume.qFoulO?Object.assign({},resume.qFoulO):{};
  const byPid=id=>(G.players||[]).find(p=>p.id===id);
  let userCourt=(resume&&Array.isArray(resume.onCourtIds))?resume.onCourtIds.map(byPid).filter(Boolean):[pg,sg,sf,pf,c].filter(Boolean);
  const benchQueue=(resume&&Array.isArray(resume.benchIds))?resume.benchIds.map(byPid).filter(Boolean):(lu.bench||[]).slice();
  const subbedIds=new Set(resume&&Array.isArray(resume.subbedIds)?resume.subbedIds:[]);
  if(resume&&resume.matchFouls){ (lu.avail||[]).forEach(p=>{ if(p) p.matchFouls=Number(resume.matchFouls[p.id])||0; }); }
  else (lu.avail||[]).forEach(p=>{ if(p) p.matchFouls=0; });
  /* Faz 3: top yükleme — seçili oyuncu sahadaysa daha sık şut/pas alır (yorgunluk maliyeti maç sonu artar). */
  const uShooter=()=>{
    if(focusPlayerId){ const fp=userCourt.find(p=>p&&p.id===focusPlayerId); if(fp&&Math.random()<0.42) return fp; }
    return userCourt.length?ch(userCourt):(pg||sg||sf||pf||c);
  };
  const uAny=()=>userCourt.length?ch(userCourt):(pg||sg||sf||pf||c);
  const benchNext=()=>{ while(benchQueue.length){ const nx=benchQueue.shift(); if(nx&&(nx.matchFouls||0)<foulLimit) return nx; } return null; };
  /* A1: Rakip sahada kalıcı 5 + yedek. En iyi 5 başlar; sakatlar dışlanır (yoksa tam kadroya düş). */
  const oppHealthy=oppFull.filter(p=>!(p&&p.injReturnDay!=null&&(G.gameDay||1)<p.injReturnDay));
  const oppPool=(oppHealthy.length>=5?oppHealthy:oppFull).slice().sort((a,b)=>(Number(b.genel)||0)-(Number(a.genel)||0));
  oppPool.forEach(p=>{ if(p) p.matchFouls=0; });
  let oppCourt=oppPool.slice(0,5);
  const oppBench=oppPool.slice(5);
  const oFallback={isim:oppName+' oyuncusu'};
  const oShooter=()=>oppCourt.length?ch(oppCourt):(oppPool[0]||oFallback);
  const oAny=()=>oppCourt.length?ch(oppCourt):(oppPool[0]||oFallback);
  const oBenchNext=()=>{ while(oppBench.length){ const nx=oppBench.shift(); if(nx&&(nx.matchFouls||0)<foulLimit) return nx; } return null; };
  const foulingTeamName=(defenderIsUser)=>defenderIsUser?G.team.isim:rname;
  function userFoulsOut(p,q,t){
    const sub=benchNext();
    const ix=userCourt.indexOf(p);
    if(sub){ if(ix>=0) userCourt[ix]=sub; else userCourt.push(sub); subbedIds.add(sub.id); }
    else if(ix>=0) userCourt.splice(ix,1);
    events.push({type:'foul',text:`⚠️ ${p.isim} 5. faulüne ulaştı ve oyundan atıldı${sub?` — yerine ${sub.isim} girdi.`:' — yedek kalmadı, eksik oynanıyor.'} (${homeScore} - ${awayScore})`,q,t:t||0,home:homeScore,away:awayScore,subOut:p.id,subIn:sub?sub.id:null,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
  }
  /* A3: Rakip oyuncu da 5. faulde oyundan atılır ve yedeğiyle değişir (kullanıcıyla simetrik). */
  function oppFoulsOut(p,q,t){
    const sub=oBenchNext();
    const ix=oppCourt.indexOf(p);
    if(sub){ if(ix>=0) oppCourt[ix]=sub; else oppCourt.push(sub); }
    else if(ix>=0) oppCourt.splice(ix,1);
    events.push({type:'foul',text:`⚠️ ${rname} — ${p.isim} 5. faulüne ulaştı ve oyundan atıldı${sub?` — yerine ${sub.isim} girdi.`:' — rakibin yedeği kalmadı, eksik oynuyor.'} (${homeScore} - ${awayScore})`,q,t:t||0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
  }
  /* Savunma faulü kaydı — defenderIsUser=!userPos. Faul yapan takımın somut oyuncusuna yüklenir. */
  function recordFoul(defenderIsUser,q,t){
    if(defenderIsUser){
      qFoulU[q]=(qFoulU[q]||0)+1;
      const cand=userCourt.filter(p=>p&&(p.matchFouls||0)<foulLimit);
      const p=cand.length?ch(cand):userCourt[0];
      if(p){ p.matchFouls=(p.matchFouls||0)+1; if(p.matchFouls>=foulLimit) userFoulsOut(p,q,t); }
    } else {
      qFoulO[q]=(qFoulO[q]||0)+1;
      const cand=oppCourt.filter(p=>p&&(p.matchFouls||0)<foulLimit);
      const p=cand.length?ch(cand):oppCourt[0];
      if(p){ p.matchFouls=(p.matchFouls||0)+1; if(p.matchFouls>=foulLimit) oppFoulsOut(p,q,t); }
    }
  }
  const inBonus=(defenderIsUser,q)=>(defenderIsUser?(qFoulU[q]||0):(qFoulO[q]||0))>=5;
  /* Kullanıcı oyuncularının sezon istatistikleri bu maç için burada toplanır. */
  const pstats=resume&&resume.pstats?resume.pstats:{};
  const bumpP=(pl,k,v)=>{ if(!pl||!pl.id) return; const o=pstats[pl.id]||(pstats[pl.id]={pts:0,ast:0,reb:0}); o[k]+=v; };
  /* A1/A2: Rakip oyuncuların maç istatistiği (MVP iki takımdan çıkabilsin diye). */
  const ostats=resume&&resume.ostats?resume.ostats:{};
  const bumpO=(pl,k,v)=>{ if(!pl||!pl.id) return; const o=ostats[pl.id]||(ostats[pl.id]={pts:0,ast:0,reb:0,isim:pl.isim}); o[k]+=v; };
  const events=[];
  const hB=resume&&resume.hB?Object.assign(emptyBox(),resume.hB):emptyBox();
  const aB=resume&&resume.aB?Object.assign(emptyBox(),resume.aB):emptyBox();
  const qh=resume&&resume.qh?Object.assign({1:0,2:0,3:0,4:0},resume.qh):{1:0,2:0,3:0,4:0};
  const qa=resume&&resume.qa?Object.assign({1:0,2:0,3:0,4:0},resume.qa):{1:0,2:0,3:0,4:0};
  let homeScore=resume?Number(resume.homeScore)||0:0,awayScore=resume?Number(resume.awayScore)||0:0;
  const snap=()=>({h:cloneBox(hB),a:cloneBox(aB)});

  const rname=rakip&&rakip.isim||'Rakip';

  const ftLine=(nMade,nAtt,who)=> nMade===nAtt?`${who} çizgiden ${nAtt}'de ${nMade} — kusursuz.`
    : nMade===0?`${who} serbest atışlarda ${nAtt}'de 0; seyirci sustu.`
    : `${who} çizgiden ${nAtt}'de ${nMade}.`;

  /* ── Tek pozisyon simülasyonu (gerçekçi FIBA temposu) ──
     Pozisyonların çoğu saha içi şutla biter; ribaund/asist/blok/faul kutuya ve anlatıma gömülür.
     userPos=true → kullanıcı takımı (kutu hB, skor homeScore); değilse rakip (aB, awayScore). */
  function runPossession(q,t){
    const userPos=Math.random()<(userIsHome?0.53:0.47);
    const roll=Math.random();
    const B=userPos?hB:aB, D=userPos?aB:hB;
    const defenderIsUser=!userPos;
    const shooter=userPos?uShooter():oShooter();
    const sc=()=>`(${homeScore} - ${awayScore})`;
    const addU=(n)=>{ homeScore+=n; qh[q]+=n; };
    const addO=(n)=>{ awayScore+=n; qa[q]+=n; };
    const addPts=(n)=>{ if(userPos) addU(n); else addO(n); };

    /* Faz 3 — Pres savunması: rakip pozisyonunda akış dışı ekstra top kaybı (kullanıcı çalar). */
    if(!userPos && defPressTO>0 && Math.random()<defPressTO){
      const stealer=uAny();
      B.to++; D.stl++;
      events.push({type:'steal',text:`🔥 Pres tuttu — ${stealer.isim} topu çaldı! ${sc()}`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* Faz 3 — Hızlı hücum: acele şutta kullanıcı pozisyonunda ekstra top kaybı riski. */
    if(userPos && offRushTO>0 && Math.random()<offRushTO){
      const stealer=oAny();
      B.to++; D.stl++;
      events.push({type:'steal',text:`⚡ Erken hücumda hata — ${stealer.isim} topu kaptı. ${sc()}`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }

    if(roll<0.80){
      /* Saha içi şut denemesi */
      const is3=Math.random()<(userPos?userIs3Oran:0.32);
      const clutch=(q>=4 && t<=120);
      /* Faz 3 — rakip isabeti savunma stiline ve yıldız eşleştirmesine göre ayarlanır.
         Eşleştirmede rakip yıldızının isabeti belirgin düşer (o oyuncu için ×0.82). */
      const markMul=(markStar&&oppPool.length&&shooter===oppPool[0])?0.82:1;
      const oppAcc=(is3?0.35*defOppAcc3Mul:0.495*defOppAcc2Mul)*oMul*markMul;
      const acc=userPos?shooterAcc(shooter,is3,is3?0.355+acc3:0.505+acc2,clutch):oppAcc;
      const made=Math.random()<Math.max(0.14,Math.min(0.72,acc));
      const xy=randShotXY(userIsHome===userPos,is3,made);
      const pts=is3?3:2;
      let passer=null;
      if(made){
        if(userPos){ const pp=userCourt.filter(p=>p&&p.id!==shooter.id); if(pp.length&&Math.random()<(0.60+offAstBonus)) passer=ch(pp); }
        else { const op=oppCourt.filter(p=>p&&p.id!==shooter.id); if(op.length&&Math.random()<0.55) passer=ch(op); }
        if(passer&&passer.isim===shooter.isim) passer=null;
      }
      if(is3){ B.thrAtt++; if(made) B.thrMade++; } else { B.twoAtt++; if(made) B.twoMade++; }
      if(made){
        addPts(pts);
        if(userPos){ bumpP(shooter,'pts',pts); if(passer){ B.ast++; bumpP(passer,'ast',1); } }
        else { bumpO(shooter,'pts',pts); if(passer){ B.ast++; bumpO(passer,'ast',1); } }
      }
      /* And-1 (yalnızca isabetli 2 sayıda) */
      let and1=false, and1Made=false;
      if(made&&!is3&&Math.random()<0.12){
        and1=true; B.ftAtt++; D.foul++; recordFoul(defenderIsUser,q,t);
        and1Made=userPos?ftMake(shooter):(Math.random()<0.74);
        if(and1Made){ B.ftMade++; addPts(1); if(userPos) bumpP(shooter,'pts',1); else bumpO(shooter,'pts',1); }
      }
      /* Kaçan turnikede savunma faulü → 2 serbest atış */
      if(!made&&!is3&&Math.random()<0.15){
        let nMade=0;
        if(userPos){ if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++; }
        else { if(Math.random()<0.74)nMade++; if(Math.random()<0.74)nMade++; }
        B.ftAtt+=2; B.ftMade+=nMade; D.foul++; recordFoul(defenderIsUser,q,t);
        addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
        const lineX=userPos?208:732;
        events.push({type:'free',text:`${shooter.isim} şut çekerken faul aldı — ${ftLine(nMade,2,shooter.isim)} ${sc()}`,q,t,home:homeScore,away:awayScore,
          shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
          box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        return;
      }
      /* Madde 20: kaçan 3 sayı denemesinde savunma faulü → 3 serbest atış */
      if(!made&&is3&&Math.random()<0.08){
        let nMade=0;
        for(let k=0;k<3;k++){ if(userPos?ftMake(shooter):(Math.random()<0.74)) nMade++; }
        B.ftAtt+=3; B.ftMade+=nMade; D.foul++; recordFoul(defenderIsUser,q,t);
        addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
        const lineX=userPos?200:740;
        events.push({type:'free',text:`${shooter.isim} üç sayı denerken faul aldı — 3 atış: ${ftLine(nMade,3,shooter.isim)} ${sc()}`,q,t,home:homeScore,away:awayScore,
          shots:[{x:lineX+rand(-8,8),y:236,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-8,8),y:250,made:nMade>=2,isHome:userPos,kind:'ft',q},{x:lineX+rand(-8,8),y:264,made:nMade>=3,isHome:userPos,kind:'ft',q}],
          box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        return;
      }
      /* Blok / ribaund (kaçan şutlarda) */
      let blocked=false, blk=null;
      if(!made&&Math.random()<0.10){ blocked=true; blk=userPos?oAny():uAny(); D.blk++; }
      let rebounder=null, rebOff=false;
      if(!made){
        rebOff=Math.random()<0.26;
        /* Ribaund kutuya ve doğru takımın somut oyuncusuna yazılır (kullanıcı + rakip simetrik). */
        rebounder=rebOff?(userPos?uAny():oAny()):(userPos?oAny():uAny());
        if(rebOff){ B.reb++; if(userPos) bumpP(rebounder,'reb',1); else bumpO(rebounder,'reb',1); }
        else { D.reb++; if(userPos) bumpO(rebounder,'reb',1); else bumpP(rebounder,'reb',1); }
      }
      let txt;
      if(made){
        /* Kendi yaratımı (passız) isabetlerde ~%34 renkli hamle girişi serpiştir. */
        const mv=(!passer&&Math.random()<0.34)?(ch(MOVE_LINES)+' '):'';
        if(is3){ const pasTxt=passer?`${passer.isim}'in pasında `:''; txt=mv+pasTxt+spikerLine(SP.id,'score3',{s:shooter.isim,sc:sc()}); }
        else if(and1){ txt=`${shooter.isim} faule rağmen turnikeyi bitirdi — ${and1Made?'AND-1 tamam!':'ek atış kaçtı.'} ${sc()}`; }
        else { const pasTxt=passer?`${passer.isim} buldu; `:''; txt=mv+pasTxt+spikerLine(SP.id,'score2',{s:shooter.isim,sc:sc()}); }
      } else if(blocked){
        txt=spikerLine(SP.id,'block',{s:shooter.isim,b:blk.isim});
      } else {
        txt=spikerLine(SP.id,is3?'miss3':'miss2',{s:shooter.isim});
      }
      events.push({type:made?(is3?'score3':'score2'):(is3?'miss3':'miss2'),text:txt,shot:{x:xy.x,y:xy.y,made,isHome:userPos,kind:is3?'3':'2',q},q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      /* Kaçan şutlarda ~%22 renkli ribaund anlatımı (hücum/savunma). */
      if(!made&&rebounder&&Math.random()<0.22){
        const rl=(rebOff?ch(REB_OFF_LINES):ch(REB_DEF_LINES)).replace('%R',rebounder.isim);
        events.push({type:'reb',text:rl,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      }

    } else if(roll<0.90){
      /* Şut faulü — çizgide 2 serbest atış */
      let nMade=0;
      if(userPos){ if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++; }
      else { if(Math.random()<0.72)nMade++; if(Math.random()<0.72)nMade++; }
      B.ftAtt+=2; B.ftMade+=nMade; D.foul++; recordFoul(defenderIsUser,q,t);
      addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
      const lineX=userPos?208:732;
      events.push({type:'free',text:`Faul düdüğü — ${shooter.isim} çizgide. ${ftLine(nMade,2,shooter.isim)} ${sc()}`,q,t,home:homeScore,away:awayScore,
        shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});

    } else if(roll<0.96){
      if(Math.random()<0.32){
        /* Şutsuz ortak faul — Madde 17: takım çeyrek faulü 5'i geçtiyse bonus (2 serbest atış). */
        D.foul++; recordFoul(defenderIsUser,q,t);
        if(inBonus(defenderIsUser,q)){
          let nMade=0;
          if(userPos){ if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++; }
          else { if(Math.random()<0.72)nMade++; if(Math.random()<0.72)nMade++; }
          B.ftAtt+=2; B.ftMade+=nMade;
          addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
          const lineX=userPos?208:732;
          events.push({type:'free',text:`🎯 Bonus! ${foulingTeamName(defenderIsUser)} çeyrek faul cezasında — ${shooter.isim} çizgide. ${ftLine(nMade,2,shooter.isim)} ${sc()}`,q,t,home:homeScore,away:awayScore,
            shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
            box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        } else {
          const cnt=defenderIsUser?(qFoulU[q]||0):(qFoulO[q]||0);
          events.push({type:'foul',text:`Faul — ${foulingTeamName(defenderIsUser)} bu çeyrek ${cnt}. faulünü yaptı (5'te bonus başlar). Top yandan.`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      } else {
        /* Top kaybı / top çalma — sayı yok. Faz 3: yalnız AZALTMA çarpanı (set oyun / bölge savunması);
           nötr seçimlerde keep=1 → her zaman top kaybı (eski davranış birebir). */
        const keep=userPos?offStealKeep:defStealKeep;
        if(keep>=1||Math.random()<keep){
          const stealer=userPos?oAny():uAny();
          B.to++; D.stl++;
          events.push({type:'steal',text:spikerLine(SP.id,'steal',{c:stealer.isim}),q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        } else {
          /* Top kaybı savuşturuldu — sabırlı/kontrollü pozisyon, top el değiştirmedi (sayı yok). */
          events.push({type:'tactic',text:spikerLine(SP.id,'tactic',{})+(userPos&&offStealKeep<1?' — sabırlı set oyunu.':''),q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      }

    } else {
      /* Renk — mola/taktik vurgusu */
      events.push({type:'tactic',text:spikerLine(SP.id,'tactic',{})+` (${ch(['pick-and-roll','el presi','2-3 bölge','erken tempo'])})`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    }
  }

  if(!resume){
    events.push({
      type:'start',spId:SP.id,
      text:`${SP.emoji} Bugünün spikeri: <strong>${SP.ad}</strong> (${SP.stil}). Maç hava atışıyla başlıyor. ${G.team.isim} ${userIsHome?'ev sahibi':'deplasman takımı olarak'}; ${c.isim} dairede, ${pg.isim} ilk hücumu kuruyor. Tribünler dolu.`,
      q:1,t:MATCH_CLOCK_SEC,home:0,away:0,
      box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
    });
  }

  let lastPeriod=resume?resume.q:4;
  const startQ=resume?resume.q:1;

  for(let q=startQ;q<=4;q++){
    lastPeriod=q;
    const isResumeQ=resume&&resume.mid&&q===resume.q;
    if(!isResumeQ){
      events.push({
        type:'quarter_start',
        text:`🔔 ${q}. çeyrek başladı — ${G.team.isim} ${homeScore} - ${awayScore} ${rname}.`,
        q,t:MATCH_CLOCK_SEC,home:homeScore,away:awayScore,
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
      });
    }

    let t=isResumeQ?Math.max(0,Number(resume.tStart)||MATCH_CLOCK_SEC):MATCH_CLOCK_SEC;
    let plays=0;
    while(t>0&&plays<playsMax){
      plays++;
      t=Math.max(0,t-rand(decLo,decHi));
      runPossession(q,t);
      if(t===0) break;
    }

    if(q<4){
      events.push({
        type:'quarter_end',
        text:`Çeyrek bitti: ${G.team.isim} ${homeScore} - ${awayScore} ${rname}. Taktik masasına dönülüyor.`,
        q,t:0,home:homeScore,away:awayScore,
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
      });
    }
  }

  /* Uzatma — gerçek FIBA kuralı: tam 5 dk periyot oynanır, süre sonunda hâlâ beraberse yeni uzatma. */
  const otDecLo=tempo==='hizli'?9:tempo==='yavas'?11:10;
  const otDecHi=tempo==='hizli'?17:tempo==='yavas'?22:19;
  let otRound=0;
  while(homeScore===awayScore){
    otRound++;
    const qq=4+otRound;
    lastPeriod=qq;
    qh[qq]=0; qa[qq]=0;
    events.push({type:'quarter_start',text:`🔔 Uzatma ${otRound} başladı — 5:00. Skor ${homeScore}-${awayScore}. Gerginlik tavan!`,q:qq,t:OT_CLOCK_SEC,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    let t=OT_CLOCK_SEC;
    let step=0;
    while(t>0 && step<40){
      step++;
      t=Math.max(0,t-rand(otDecLo,otDecHi));
      runPossession(qq,t);
      if(t===0) break;
    }
    events.push({type:'quarter_end',text:`Uzatma ${otRound} bitti: ${G.team.isim} ${homeScore} - ${awayScore} ${rname}${homeScore===awayScore?' — hâlâ berabere, bir uzatma daha!':'.'}`,q:qq,t:0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    /* Güvenlik: aşırı uzarsa (çok nadir) bir sonraki uzatmada kesin sonuç için küçük eşik. */
    if(otRound>=8 && homeScore===awayScore){
      if(Math.random()<0.5){ homeScore++; qh[qq]++; hB.ftMade++; hB.ftAtt++; } else { awayScore++; qa[qq]++; aB.ftMade++; aB.ftAtt++; }
      events.push({type:'free',text:`Son saniye serbest atışı sonucu belirledi — ${G.team.isim} ${homeScore} - ${awayScore} ${rname}.`,q:qq,t:0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      break;
    }
  }

  let winner='draw';
  if(homeScore>awayScore) winner='home';
  else if(awayScore>homeScore) winner='away';

  /* A2: MVP anonsu — artık HER İKİ takımın oyuncuları arasından en yüksek katkı seçilir
     (sayı + asist×1.5 + ribaund×1.2). Rakip daha iyi oynadıysa MVP rakipten çıkabilir. */
  let mvp=null,mvpScore=-1,mvpStat=null,mvpTeam='';
  const scoreOf=s=>(s.pts||0)+(s.ast||0)*1.5+(s.reb||0)*1.2;
  Object.keys(pstats).forEach(id=>{
    const s=pstats[id], sc0=scoreOf(s);
    if(sc0>mvpScore){ mvpScore=sc0; mvp=(G.players||[]).find(p=>p.id===id); mvpStat=s; mvpTeam=G.team.isim; }
  });
  Object.keys(ostats).forEach(id=>{
    const s=ostats[id], sc0=scoreOf(s);
    if(sc0>mvpScore){ mvpScore=sc0; mvp=(oppPool.find(p=>p.id===id)||{isim:s.isim||(rname+' oyuncusu')}); mvpStat=s; mvpTeam=rname; }
  });
  if(mvp&&mvpStat){
    events.push({type:'mvp',text:`${SP.emoji} <strong>Maçın yıldızı (MVP):</strong> ${mvp.isim} <span style="opacity:.8">(${mvpTeam})</span> — ${mvpStat.pts||0} sayı, ${mvpStat.ast||0} asist, ${mvpStat.reb||0} ribaund.`,q:lastPeriod,t:0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa),mvpId:(mvp&&mvp.id)||null});
  }
  const uw=homeScore>awayScore, ow=awayScore>homeScore;
  let endNote='Beraberlik ile sona erdi.';
  if(uw) endNote=userIsHome?'Ev sahasında galibiyet!':'Deplasmanda galibiyet!';
  if(ow) endNote=userIsHome?'Ev sahasında mağlubiyet.':'Deplasmanda mağlubiyet.';
  events.push({
    type:'end',
    text:`Maç bitti! ${G.team.isim} ${homeScore} - ${awayScore} ${rname}. ${endNote}`,
    q:lastPeriod,t:0,home:homeScore,away:awayScore,winner,spId:SP.id,
    players:pstats,
    lineupIds:[pg,sg,sf,pf,c].filter(Boolean).map(x=>x.id),
    subIds:[...subbedIds],
    box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
  });

  return events;
}

/** Maç bitince toplanan sayı/asist/ribaundları oyuncuların sezon istatistiklerine ekler. */
function mergeMatchPlayerStats(ev){
  try{
    const map=(ev&&ev.players)||{};
    const ids=new Set(ev&&ev.lineupIds||[]);
    Object.keys(map).forEach(id=>ids.add(id));
    ids.forEach(id=>{
      const p=G.players.find(x=>x.id===id);
      if(!p) return;
      p.sezon=p.sezon||{mac:0,pts:0,ast:0,reb:0};
      p.sezon.mac++;
      const st=map[id];
      if(st){ p.sezon.pts+=st.pts||0; p.sezon.ast+=st.ast||0; p.sezon.reb+=st.reb||0; }
    });
  }catch(e){ dbg('stats merge',e); }
}

let matchEventTimer=null;
let mState={running:false,events:[],idx:0,score:[0,0],quarter:1,time:MATCH_CLOCK_SEC,allShots:[],shotFilter:'live',rakipName:'',seasonMatchIx:-1,seasonRound:0,userIsHome:true};

function clearMatchEventTimer(){
  if(matchEventTimer){ clearTimeout(matchEventTimer); matchEventTimer=null; }
}

/* Maç sonucunu işleyen çekirdek — hem canlı bitişte hem de C1 "kilitli sonuç" yolunda kullanılır.
   ctx: {seasonMatchIx,isPlayoff,playoffMatch,rakipName,userIsHome}. */
function applyMatchResult(ev,ctx){
  ctx=ctx||{};
  const uPts=ev.home, oPts=ev.away;
  const ligKey=(G.team&&G.team.tblKey)||'tbl';
  const sm=G.season&&G.season.matches&&ctx.seasonMatchIx>=0?G.season.matches[ctx.seasonMatchIx]:null;
  if(sm&&G.season.active){
    const u=G.team.isim;
    if(sm.home===u){ sm.hs=uPts; sm.as=oPts; }
    else { sm.hs=oPts; sm.as=uPts; }
    sm.played=true;
    updateStandingsFromResult(sm.home,sm.away,sm.hs,sm.as);
    const playedSet=new Set(ev.lineupIds||[]);
    (ev.subIds||[]).forEach(id=>playedSet.add(id));
    updateChronicFatigue(playedSet); /* Faz 1.2: yorgunluk düşmeden önce sayacı güncelle */
    applyMatchFatigueToRoster(playedSet.size?playedSet:undefined);
    const prevDay=G.gameDay||1;
    const roundDays=G.season.matches.filter(x=>x.round===sm.round).map(x=>x.day);
    G.gameDay=Math.max(...roundDays,G.gameDay||1);
    advanceTrainingDays(G.gameDay-prevDay);
    processEconomyWeeks();
    processLoanReturns();
    tickClubTransferMarket(G.gameDay-prevDay);
    if(typeof maybeIncomingOffers==='function') maybeIncomingOffers(); /* Faz 4.1: kullanıcı oyuncularına teklif */
    mergeMatchPlayerStats(ev);
    clearResolvedInjuries();
    rollInjuriesAfterUserMatch();
    rollInjuriesForBotClub(ctx.rakipName,ligKey); /* A1: rakip kadrosunda da sakatlık işlenir */
    simulateRoundCpuMatches(sm.round);
    regenerateSeasonFixtures();
    syncUserRecordFromStandings();
    if(typeof recordMatchAnalytics==='function') recordMatchAnalytics(sm,uPts,oPts); /* Faz 5.2: analiz verisi */
    if(ctx.userIsHome){
      const bilet=homeTicketIncome();
      txn('Bilet geliri',bilet);
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">🎟️ Ev maçı bilet geliri: <strong>+${fmtn(bilet)} KR</strong> (${fmtn(G.arena.kap)} kapasite)</div>`);
    } else {
      const seyahat=ecoRound(rand(300,700));
      txn('Deplasman seyahat masrafı',-seyahat);
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">✈️ Deplasman seyahat masrafı: <strong>-${fmtn(seyahat)} KR</strong></div>`);
    }
    if(G.wins>=1) unlockAchievement('ilkGalibiyet');
    if(G.wins>=5) unlockAchievement('seri5');
    if(G.wins>=10) unlockAchievement('g10');
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid ${ev.winner==='home'?'var(--green)':ev.winner==='draw'?'var(--gold)':'var(--red)'};">🏀 <strong>${G.team.isim}</strong> ${uPts}-${oPts} <strong>${ctx.rakipName}</strong> · Gün ${sm.day} · Tur ${sm.round}/${totalRounds()}</div>`);
    endLeagueSeasonIfDone();
  } else if(ctx.isPlayoff && ctx.playoffMatch){
    /* Faz 2.1: playoff artık seri — bu maç bir seri maçıdır; sonucu seriye işle. */
    const gd=ctx.playoffMatch;
    const s=gd.series;
    const winnerTeam=(uPts>oPts)?G.team.isim:(uPts<oPts?ctx.rakipName:G.team.isim);
    const host=gd.home; /* bu maçın ev sahibi */
    const hostPts=(host===G.team.isim)?uPts:oPts;
    const otherPts=(host===G.team.isim)?oPts:uPts;
    const playedSet=new Set(ev.lineupIds||[]);
    (ev.subIds||[]).forEach(id=>playedSet.add(id));
    updateChronicFatigue(playedSet); /* Faz 1.2 */
    applyMatchFatigueToRoster(playedSet.size?playedSet:undefined);
    const prevDay=G.gameDay||1;
    G.gameDay=(G.gameDay||1)+2;
    advanceTrainingDays(G.gameDay-prevDay);
    processEconomyWeeks();
    processLoanReturns();
    tickClubTransferMarket(G.gameDay-prevDay);
    mergeMatchPlayerStats(ev);
    accumulatePlayoffFinalStats(ev); /* Faz 2.1: final serisi MVP verisi */
    clearResolvedInjuries();
    rollInjuriesAfterUserMatch();
    rollInjuriesForBotClub(ctx.rakipName,ligKey); /* A1 */
    if(ctx.userIsHome){
      const bilet=homeTicketIncome();
      txn('Playoff bilet geliri',bilet);
    }
    const total=(currentPlayoffRound()||[]).length;
    if(s) recordSeriesGame(s,{gameNo:gd.gameNo,host,hs:hostPts,as:otherPts,winner:winnerTeam});
    const uSeriesW=s?(s.home===G.team.isim?s.wins[0]:s.wins[1]):0;
    const oSeriesW=s?(s.home===G.team.isim?s.wins[1]:s.wins[0]):0;
    const serDone=s&&s.done;
    const seriesTxt=serDone
      ? (s.winner===G.team.isim?`seriyi ${uSeriesW}-${oSeriesW} kazandın — tur atlandı!`:`seriyi ${oSeriesW}-${uSeriesW} kaybettin — elendin.`)
      : `seri ${uSeriesW}-${oSeriesW}`;
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid ${uPts>oPts?'var(--green)':'var(--red)'};">🏆 Playoff (${playoffRoundLabel(0,total)}) ${gd.gameNo}. maç: <strong>${G.team.isim}</strong> ${uPts}-${oPts} <strong>${ctx.rakipName}</strong> — ${seriesTxt}</div>`);
    maybeAdvancePlayoff();
  } else {
    if(ev.winner==='home'){ G.wins++; G.points+=2; }
    else if(ev.winner==='away') G.losses++;
  }
  if(ev.winner==='home'){
    const priz=ecoRound(rand(1500,3500));
    txn('Maç ödülü (galibiyet)',priz);
    sfx('win');
    G.winStreak=(Number(G.winStreak)||0)+1;
    if(G.winStreak>=10) unlockAchievement('seri10');
    showNotif(`🏆 Galip geldin! +2 tablo puanı · +${fmtn(priz)} KR ödül${G.winStreak>=3?` · ${G.winStreak} maçlık seri!`:''}`);
  }
  else if(ev.winner==='away'){
    G.winStreak=0;
    const cons=ecoRound(rand(400,900));
    txn('Maç günü geliri',cons);
    sfx('lose');
    showNotif(`😔 Mağlup — +${fmtn(cons)} KR maç günü geliri.`);
  }
  else showNotif('Maç berabere.');
  updateCoins();
  G.players.forEach(p=>{
    const d=ev.winner==='home'?rand(2,8):ev.winner==='away'?rand(-8,-2):0;
    p.mood=Math.min(100,Math.max(0,p.mood+d));
  });
  const lead=teamLeadership();
  const chemNudge=lead>=85?3:lead>=75?2:lead>=65?1:0;
  if(chemNudge) G.chemistry=Math.min(100,G.chemistry+chemNudge);
  updateChemistry();
  updateStats();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
  renderRoster();
  if(document.getElementById('page-dashboard')&&document.getElementById('page-dashboard').classList.contains('active')) renderDashboardNews();
  G.pendingMatch=null; /* C1: sonuç işlendi, kilit kalktı */
  scheduleGameSave();
}

