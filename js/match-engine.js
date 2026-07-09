const AWAY_SHOT_COLOR='#22c55e';

function emptyBox(){
  return {twoMade:0,twoAtt:0,thrMade:0,thrAtt:0,ftMade:0,ftAtt:0,reb:0,ast:0,to:0,stl:0,blk:0,foul:0};
}
function cloneBox(b){return {...b};}
function cloneQx(o){return {...o};}

/* ── Saha geometrisi (iç SVG viewBox 0 0 940 500) ──
   Çember merkezleri, orta çizgi, serbest atış çizgileri. Tüm görsel/şut
   koordinatları buradan türetilir ki harita ile parke birebir örtüşsün. */
const RIM_L=[102.6,250], RIM_R=[837.4,250];
const THREE_R=196;            /* 3 sayı yayı yarıçapı (çemberden) */
const COURT_MID=470;

/* Şut noktası çemberden mesafe+açı ile üretilir: 3'lükler yayın hemen dışında,
   saha içi şutlar boya/orta mesafede kalır. Eski sürüm 3'lükleri orta sahaya
   kadar dağıtıyordu (yay dışına taşan, gerçek dışı noktalar). */
function randShotXY(isLeft,is3,made){
  const rim=isLeft?RIM_L:RIM_R;
  const dir=isLeft?1:-1;
  const r=is3
    ? (made?rand(THREE_R+5,THREE_R+34):rand(THREE_R+4,THREE_R+62))
    : (made?rand(16,104):rand(24,156));
  const a=rand(-82,82)*Math.PI/180;
  let x=rim[0]+dir*Math.cos(a)*r;
  let y=rim[1]+Math.sin(a)*r;
  x=Math.max(66,Math.min(874,x));
  y=Math.max(40,Math.min(460,y));
  return {x,y};
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

/* ══════════════════════════════════════════════════════════════════════════
   CANLI SAHA SİMÜLASYONU — sürekli akan 5v5 + fizikli top
   ──────────────────────────────────────────────────────────────────────────
   Eski sürümde jetonlar her olayda CSS transition ile sabit bir şablona
   "ışınlanıyor", top da noktadan noktaya kayıyordu. Burada bunun yerine
   requestAnimationFrame ile dönen gerçek bir simülasyon var:

   • Oyuncular hedeflerine ivmelenerek koşar (yay-sönüm), birbirine girmez,
     boşta ufak salınım yapar — hiçbir kare donuk durmaz.
   • Savunma hücumcuyu adam adam markaja alır (hücumcu ile çember arasında).
   • Top bir durum makinesidir: elde (dribble, sekerek), pas (alçak yay),
     şut (yüksek parabol + çember yüksekliği), çemberden düşüş, serbest top
     (zıplayarak yuvarlanır). Yükseklik gölge + ölçek ile gösterilir.
   • Hücum yönü userIsHome'a göre belirlenir: kullanıcı takımı deplasmandaysa
     sağ potaya hücum eder (eskiden hep sola hücum ediyordu — şut noktaları
     sağda, oyuncular soldaydı).
   ═════════════════════════════════════════════════════════════════════════ */

const _PL_MAXV=320;          /* px/sn — hız stat'ı yoksa yedek koşu hızı */
const _PL_ACC=8.5;           /* hedefe yaklaşma sertliği */
const _PL_R=25;              /* çarpışma yarıçapı */

/* Oyuncunun gerçek koşu hızı — GERÇEK ÖLÇEK: saha 940px = 28m (1px ≈ 0.03m).
   `hiz` stat'ı (0-99) → 130-210 px/sn ≈ 3.9-6.3 m/sn (normal koşu); sprint ×1.5 →
   maks ~9.4 m/sn (insan üst sınırı). Eski değerler (260-400, sprint 620) 8-19 m/sn'ye
   denk geliyordu — oyuncular sahada ışınlanır gibi görünüyordu. Düşük enerji %13'e
   kadar yavaşlatır. */
function _tokBaseV(pl){
  const hiz=(pl&&pl.hiz!=null)?Number(pl.hiz):60;
  const en=(pl&&pl.enerji!=null)?Number(pl.enerji):100;
  const fat=1-0.13*Math.max(0,Math.min(1,(100-en)/100));
  return (130+Math.max(0,Math.min(99,hiz))/99*80)*fat;
}

function _tokShort(name){ const a=String(name||'').trim().split(/\s+/); return a[a.length-1]||String(name||''); }
function _tokSet(g,x,y){ if(g) g.setAttribute('transform',`translate(${x.toFixed(1)},${y.toFixed(1)})`); }
function _mir(p){ return [940-p[0],p[1]]; }

function clearMatchPlayers(){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(S&&S.raf){ cancelAnimationFrame(S.raf); S.raf=null; }
  const l=document.getElementById('playersLayer');
  if(l) l.remove();
  const sh=document.getElementById('ballShadow');
  if(sh) sh.remove();
  if(typeof mState!=='undefined'&&mState){ mState._tokens=null; mState._sim=null; }
}

function initMatchPlayers(lu,rakip,oppPlayers){
  try{
    const ball=document.getElementById('liveBall');
    const svg=ball&&ball.parentNode;
    if(!svg) return;
    clearMatchPlayers();
    /* top gölgesi jetonların da altında (zemin katmanı) */
    const shadow=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
    shadow.setAttribute('id','ballShadow');
    shadow.setAttribute('rx','9'); shadow.setAttribute('ry','3.6');
    shadow.setAttribute('fill','rgba(0,0,0,0.38)'); shadow.setAttribute('opacity','0');
    shadow.setAttribute('pointer-events','none');
    svg.insertBefore(shadow,ball);

    const layer=document.createElementNS('http://www.w3.org/2000/svg','g');
    layer.setAttribute('id','playersLayer');
    svg.insertBefore(layer,ball); /* top jetonların üstünde kalsın */
    const homeCol=(G.team&&G.team.renk)||'#f97316';
    const awayCol='#16a34a';
    const mk=(num,label,fill)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('class','court-token');
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
    const rk=(rakip&&rakip.isim)?_tokShort(rakip.isim):'Rakip';
    /* tip-off: orta yuvarlağın iki yanında karşılıklı diz */
    const hs=[[428,250],[400,150],[400,350],[352,196],[352,308]];
    const as=[[512,250],[540,150],[540,350],[588,196],[588,308]];
    const mkP=(g,x,y,team,slot,pl)=>{
      const bv=_tokBaseV(pl);
      return {g,x,y,vx:0,vy:0,tx:x,ty:y,team,slot,pl:pl||null,baseV:bv,sprintV:bv*1.5,maxV:bv,ph:Math.random()*6.283,side:Math.random()<0.5?-1:1};
    };

    const home=[],away=[];
    for(let i=0;i<5;i++){
      const p=homeP[i];
      home.push(mkP(mk(String(i+1),p?_tokShort(p.isim):('Ev'+(i+1)),homeCol),hs[i][0],hs[i][1],'h',i,p));
    }
    for(let i=0;i<5;i++){
      const op=(oppPlayers&&oppPlayers[i])||null;
      const on=op?_tokShort(op.isim||op):rk;   /* nesne ya da (eski çağrı) düz isim */
      away.push(mkP(mk(String(i+1),on,awayCol),as[i][0],as[i][1],'a',i,(op&&typeof op==='object')?op:null));
    }
    mState._tokens={home:home.map(p=>p.g),away:away.map(p=>p.g)};
    mState._sim={
      home,away,players:home.concat(away),
      shadow,
      ball:{mode:'idle',x:COURT_MID,y:250,h:0,vx:0,vy:0,vh:0,carrier:null,t:0,dur:1,arc:0,from:[COURT_MID,250],to:[COURT_MID,250],onDone:null},
      script:[],sIdx:0,sT:0,time:0,last:0,raf:null,idle:0,
      shooter:null,offSide:null
    };
    mState._lastOff=null;
    home.concat(away).forEach(p=>_tokSet(p.g,p.x,p.y));
    const bEl=document.getElementById('liveBall');
    if(bEl){ bEl.style.transition='none'; bEl.style.opacity='0.98'; }
    _simStart();
  }catch(e){}
}

/* ── Ana döngü ───────────────────────────────────────────────────────────── */
function _simStart(){
  const S=mState._sim; if(!S||S.raf) return;
  S.last=0;
  const loop=(ts)=>{
    const St=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!St||St!==S){ return; }
    if(!S.last) S.last=ts;
    const dt=Math.min(0.05,(ts-S.last)/1000);   /* sekme arkaplandayken sıçramasın */
    S.last=ts;
    S.time+=dt;
    /* maç bittikten ~3sn sonra döngüyü bırak (pil) */
    if(typeof mState!=='undefined'&&mState&&mState.running===false&&!mState.paused){
      S.idle+=dt; if(S.idle>3){ S.raf=null; return; }
    } else S.idle=0;
    try{ _simStep(dt); }catch(e){}
    S.raf=requestAnimationFrame(loop);
  };
  S.raf=requestAnimationFrame(loop);
}

function _simStep(dt){
  const S=mState._sim; if(!S) return;
  /* zamanlanmış koreografi adımları */
  if(S.script.length){
    S.sT+=dt;
    while(S.sIdx<S.script.length&&S.sT>=S.script[S.sIdx].at){
      const st=S.script[S.sIdx]; S.sIdx++;
      try{ st.fn(); }catch(e){}
    }
    if(S.sIdx>=S.script.length){ S.script=[]; S.sIdx=0; }
  }
  const P=S.players;
  const carrier=S.ball.carrier;
  /* 1) hedefe doğru ivmeli koşu + boşta mikro salınım */
  for(const p of P){
    const w=(p===carrier)?0:1;
    const gx=p.tx+Math.sin(S.time*1.15+p.ph)*4.5*w;
    const gy=p.ty+Math.cos(S.time*0.87+p.ph*1.7)*4.5*w;
    let dx=gx-p.x, dy=gy-p.y;
    const d=Math.hypot(dx,dy);
    if(d>0.01){
      const want=Math.min(p.maxV||_PL_MAXV,d*3.4);
      p.vx+=((dx/d)*want-p.vx)*_PL_ACC*dt;
      p.vy+=((dy/d)*want-p.vy)*_PL_ACC*dt;
    } else { p.vx*=0.85; p.vy*=0.85; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
  }
  /* 2) üst üste binmeyi çöz — itme kare başına SINIRLI (maks ~1.3px ≈ 78px/sn), yoksa
     kalabalık anlarda (ribaund/FT dizilimi) jetonlar zıplayarak "ışınlanmış" görünür.
     Pozisyonuna koşan şutör itilMEZ (yalnız karşı taraf kayar) — şuta zamanında varır. */
  const shooterTok=S.shooter;
  for(let i=0;i<P.length;i++){
    for(let j=i+1;j<P.length;j++){
      const a=P[i],b=P[j];
      let dx=b.x-a.x, dy=b.y-a.y;
      let d=Math.hypot(dx,dy);
      if(d<_PL_R&&d>0.001){
        const push=Math.min((_PL_R-d)/2,1.3); dx/=d; dy/=d;
        if(a===shooterTok){ b.x+=dx*push*2; b.y+=dy*push*2; }
        else if(b===shooterTok){ a.x-=dx*push*2; a.y-=dy*push*2; }
        else { a.x-=dx*push; a.y-=dy*push; b.x+=dx*push; b.y+=dy*push; }
      }
    }
  }
  /* 3) sınırla + çiz */
  for(const p of P){
    p.x=Math.max(22,Math.min(918,p.x));
    p.y=Math.max(24,Math.min(476,p.y));
    _tokSet(p.g,p.x,p.y);
  }
  _ballStep(dt);
  _ballRender();
}

/* ── Top: durum makinesi ─────────────────────────────────────────────────── */
function _ball(){ return mState._sim.ball; }
function _ballHold(p){
  const b=_ball(); if(!p) return;
  /* top oyuncudan uzaktaysa ışınlanmasın — kısa sıçrayışla eline gelsin */
  const d=Math.hypot(b.x-p.x,b.y-p.y);
  if(d>26){ _ballPass(p,Math.max(0.12,Math.min(0.30,d/700))); return; }
  b.mode='held'; b.carrier=p; b.t=0;
}
function _ballPass(to,dur){
  const b=_ball(); if(!to) return;
  const d=Math.hypot(to.x-b.x,to.y-b.y);
  b.mode='pass'; b.carrier=null; b.from=[b.x,b.y]; b.target=to;
  /* Pas hızı ~16 m/sn (520 px/sn); uzun paslar 0.9 sn'ye kadar havada kalır. */
  b.t=0; b.dur=dur||Math.max(0.25,Math.min(0.90,d/520)); b.arc=8+d*0.045;
}
function _ballShoot(to,dur,made,onDone){
  const b=_ball();
  const d=Math.hypot(to[0]-b.x,to[1]-b.y);
  b.mode='shot'; b.carrier=null; b.from=[b.x,b.y]; b.to=[to[0],to[1]];
  /* Yay yüksekliği mesafeye bağlı: pota dibinden (turnike/smaç) ALÇAK ve hızlı,
     uzaktan yüksek parabol — eskiden turnike de üçlük gibi havalanıyordu. */
  b.t=0; b.dur=dur||Math.max(0.42,Math.min(0.75,0.34+d/560));
  b.arc=d<90?(16+d*0.10):(52+d*0.13);
  if(d<90&&!dur) b.dur=Math.max(0.30,0.22+d/500);
  b.made=!!made; b.onDone=onDone||null;
}
function _ballLoose(vx,vy,vh){
  const b=_ball(); b.mode='loose'; b.carrier=null;
  b.vx=vx; b.vy=vy; b.vh=vh!=null?vh:70;
}
function _ballStep(dt){
  const S=mState._sim, b=S.ball;
  switch(b.mode){
    case 'held':{
      const p=b.carrier;
      if(!p){ b.mode='loose'; b.vx=b.vy=0; b.vh=0; break; }
      const sp=Math.hypot(p.vx,p.vy);
      const ux=sp>10?p.vx/sp:1, uy=sp>10?p.vy/sp:0;
      /* topu gövdenin hafif önünde ve yan tarafında tut */
      b.x=p.x+ux*10-uy*11*p.side;
      b.y=p.y+uy*10+ux*11*p.side;
      b.h=Math.abs(Math.sin(S.time*(8.5+sp*0.022)))*12;   /* yere sekerek dribbling */
      break;
    }
    case 'pass':{
      b.t+=dt/b.dur;
      const t=Math.min(1,b.t);
      const tx=b.target?b.target.x:b.from[0], ty=b.target?b.target.y:b.from[1];
      b.x=b.from[0]+(tx-b.from[0])*t;
      b.y=b.from[1]+(ty-b.from[1])*t;
      b.h=Math.sin(Math.PI*t)*b.arc+10;
      if(b.t>=1) _ballHold(b.target);
      break;
    }
    case 'shot':{
      b.t+=dt/b.dur;
      const t=Math.min(1,b.t);
      b.x=b.from[0]+(b.to[0]-b.from[0])*t;
      b.y=b.from[1]+(b.to[1]-b.from[1])*t;
      b.h=Math.sin(Math.PI*t)*b.arc+30*t;                 /* çember yüksekliğinde biter */
      if(b.t>=1){
        const cb=b.onDone; b.onDone=null;
        b.mode='rim'; b.t=0; b.h=30;
        if(cb) cb();
      }
      break;
    }
    case 'rim':{      /* fileden geçiş / çemberden düşüş */
      b.t+=dt;
      b.h=Math.max(0,30-b.t*95);
      if(b.h<=0){ b.mode='loose'; b.vx=b.vy=0; b.vh=0; }
      break;
    }
    case 'loose':{
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      b.vx*=(1-2.2*dt); b.vy*=(1-2.2*dt);
      b.h+=b.vh*dt; b.vh-=460*dt;
      if(b.h<0){ b.h=0; b.vh=-b.vh*0.52; if(Math.abs(b.vh)<14) b.vh=0; }
      b.x=Math.max(30,Math.min(910,b.x)); b.y=Math.max(28,Math.min(472,b.y));
      break;
    }
    default: break;
  }
}
function _ballRender(){
  const S=mState._sim, b=S.ball;
  const el=document.getElementById('liveBall');
  if(!el) return;
  const sc=1+b.h*0.0095;
  el.setAttribute('transform',`translate(${b.x.toFixed(1)},${(b.y-b.h*0.62).toFixed(1)}) scale(${sc.toFixed(3)})`);
  if(S.shadow){
    const k=Math.max(0.30,1-b.h/95);
    S.shadow.setAttribute('cx',b.x.toFixed(1));
    S.shadow.setAttribute('cy',(b.y+4).toFixed(1));
    S.shadow.setAttribute('rx',(9*k).toFixed(2));
    S.shadow.setAttribute('ry',(3.6*k).toFixed(2));
    S.shadow.setAttribute('opacity',(0.36*k).toFixed(2));
  }
  mState._ballXY=[b.x,b.y];
}

/* ── Koreografi zamanlayıcısı (rAF tabanlı; setTimeout yok) ──────────────── */
function clearBallTimers(){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(S){ S.script=[]; S.sIdx=0; S.sT=0; S.ball.onDone=null; }
}
function _script(steps){
  const S=mState._sim; if(!S) return 0;
  S.script=steps.slice().sort((a,b)=>a.at-b.at);
  S.sIdx=0; S.sT=0;
  return Math.round((S.script.length?S.script[S.script.length-1].at:0)*1000);
}

/* ── Yerleşimler ─────────────────────────────────────────────────────────── */
/* Sol potaya hücum eden takımın 5 nokta şablonu: 0=top(PG, yay üstü), 1/2=kanat (yay dışı),
   3=forvet (orta mesafe/dirsek), 4=pivot (boya kenarı). Kanatlar çemberden >196px = 3 sayı yayı dışı. */
const OFF_BASE_L=[[312,250],[258,114],[258,386],[190,166],[160,320]];
/* Ribaund/serbest atış dizilimi (sol pota) */
const FT_OFF_L=[[176,178],[176,322],[286,196],[286,304]];
const FT_DEF_L=[[150,178],[150,322],[204,178],[204,322],[262,250]];

function _rim(left){ return left?RIM_L.slice():RIM_R.slice(); }
function _jit(n,a){ return n+(Math.random()*2-1)*(a||10); }

/* 2-3 bölge savunması bölge merkezleri (sol pota): 2 üstte yay dirseklerinde, 3 boya hattında. */
const ZONE_23_L=[[240,190],[240,310],[152,158],[152,342],[126,250]];

/** Hücum + savunma hedeflerini kur. shot verilirse şutör o noktaya gider.
    Taktikler (G.tactics) yalnız kullanıcı tarafına işlenir: hücumda `odak` dizilimi
    hafifçe şekillendirir; savunmada `defensiveStyle` (adam/bolge/pres) ve `markStar`. */
function _setFormation(offLeft,offPlayers,defPlayers,shot){
  const S=mState._sim;
  const rim=_rim(offLeft);
  const tac=G.tactics||{};
  const offIsUser=S.offIsUser!==false;
  const base=OFF_BASE_L.map(p=>p.slice());
  /* Hücum odağı (kullanıcı hücumdaysa): dış şutta kanatlar yaydan açılır,
     içeri odakta uzunlar boyaya sokulur. Ayna yansımasından ÖNCE uygulanır. */
  if(offIsUser){
    if(tac.odak==='dis'){ base[0][0]+=10; base[1][0]+=18; base[2][0]+=18; }
    else if(tac.odak==='ic'){ base[1][0]-=8; base[2][0]-=8; base[3][0]-=14; base[3][1]+=6; base[4][0]-=10; }
  }
  const B=base.map(p=>offLeft?p:_mir(p));
  let shooter=null;
  if(shot){
    /* Şutör = şut noktasına O AN en yakın hücumcu (şablon slotu değil) — gerçekçi
       koşu hızlarında (130-315 px/sn) noktaya zamanında varması için en kısa yol. */
    let bi=0,bd=1e9;
    offPlayers.forEach((p,i)=>{ const d=Math.hypot(p.x-shot.x,p.y-shot.y); if(d<bd){bd=d;bi=i;} });
    shooter=offPlayers[bi];
    B[bi]=[shot.x,shot.y];
  }
  /* Şutör noktasına yetişmek için sprint atar (top elden çıkarken orada olmalı). */
  offPlayers.forEach((p,i)=>{
    const c=B[i];
    p.tx=_jit(c[0],p===shooter?0:12); p.ty=_jit(c[1],p===shooter?0:12);
    p.maxV=(p===shooter)?p.sprintV:p.baseV;
  });
  /* ── Savunma ── kullanıcı savunuyorsa seçtiği stil, rakip savunuyorsa adam adama. */
  const defIsUser=!offIsUser;
  const style=defIsUser?(tac.defensiveStyle||'adam'):'adam';

  if(style==='bolge'){
    /* 2-3 bölge: herkes bölgesinde durur; bölgesine giren en yakın hücumcuya doğru
       kayar (%45), hücumcu çıkınca bölge merkezine döner. Şutörün bölgesindeki
       savunmacı şutörü yakın kapatır. */
    const zones=ZONE_23_L.map(p=>offLeft?p.slice():_mir(p));
    let closeIdx=-1;
    if(shooter){
      let bd=1e9;
      zones.forEach((z,i)=>{ const d=Math.hypot(z[0]-shooter.tx,z[1]-shooter.ty); if(d<bd){bd=d;closeIdx=i;} });
    }
    defPlayers.forEach((p,i)=>{
      const z=zones[i%zones.length];
      if(i===closeIdx&&shooter){
        const dx=rim[0]-shooter.tx, dy=rim[1]-shooter.ty, d=Math.hypot(dx,dy)||1;
        p.tx=_jit(shooter.tx+dx/d*26,5); p.ty=_jit(shooter.ty+dy/d*26,5);
        p.maxV=p.sprintV*0.92;
      } else {
        /* bölgeye en yakın hücumcu 80px içindeyse ona doğru kay */
        let nm=null,nd=80;
        offPlayers.forEach(o=>{ if(o===shooter)return; const d=Math.hypot(o.tx-z[0],o.ty-z[1]); if(d<nd){nd=d;nm=o;} });
        const gx=nm?z[0]+(nm.tx-z[0])*0.45:z[0];
        const gy=nm?z[1]+(nm.ty-z[1])*0.45:z[1];
        p.tx=_jit(gx,6); p.ty=_jit(gy,6);
        p.maxV=p.baseV;
      }
    });
    S.shooter=shooter;
    return shooter;
  }

  /* Adam adama / pres: savunmacı i adamı offPlayers[i]'yi çemberle arasında tutar.
     markStar: en iyi savunmacı rakip yıldızına (offPlayers[0], genel sıralı) yapışır. */
  const assign=[0,1,2,3,4];
  if(defIsUser&&tac.markStar){
    let bd=-1,bi=-1;
    defPlayers.forEach((p,i)=>{ const sv=(p.pl&&p.pl.savunma!=null)?p.pl.savunma:0; if(sv>bd){bd=sv;bi=i;} });
    if(bi>0){ const j=assign.indexOf(0); assign[j]=assign[bi]; assign[bi]=0; }
  }
  const press=(style==='pres');
  defPlayers.forEach((p,i)=>{
    const m=offPlayers[assign[i]]||offPlayers[0];
    const dx=rim[0]-m.tx, dy=rim[1]-m.ty;
    const d=Math.hypot(dx,dy)||1;
    /* jeton çapı 32 — pres basar (26), yıldız markajı yapışır (18+26), adam standart (40) */
    let gap=(m===shooter)?26:40;
    if(press) gap=(m===shooter)?22:26;
    if(defIsUser&&tac.markStar&&assign[i]===0&&m!==shooter) gap=26;
    p.tx=_jit(m.tx+dx/d*gap,press?4:6); p.ty=_jit(m.ty+dy/d*gap,press?4:6);
    p.maxV=(m===shooter)?p.sprintV*0.92:(press?p.baseV*1.12:p.baseV);
  });
  S.shooter=shooter;
  return shooter;
}

/** Serbest atış dizilimi: şutör çizgide, diğerleri boya kenarında. */
function _setFtFormation(offLeft,offPlayers,defPlayers,shooter){
  const line=offLeft?[214,250]:[726,250];
  shooter.tx=line[0]; shooter.ty=line[1];
  const others=offPlayers.filter(p=>p!==shooter);
  const of=FT_OFF_L.map(p=>offLeft?p.slice():_mir(p));
  const df=FT_DEF_L.map(p=>offLeft?p.slice():_mir(p));
  shooter.maxV=shooter.sprintV;
  others.forEach((p,i)=>{ const c=of[i%of.length]; p.tx=_jit(c[0],5); p.ty=_jit(c[1],5); p.maxV=p.baseV; });
  defPlayers.forEach((p,i)=>{ const c=df[i%df.length]; p.tx=_jit(c[0],5); p.ty=_jit(c[1],5); p.maxV=p.baseV; });
}

/** Bir olayın hücum sahibini çöz: true = kullanıcı takımı hücumda. */
function _eventOff(ev){
  if(!ev) return mState._lastOff!==false;
  if(ev.off!=null) return !!ev.off;
  if(ev.shot) return !!ev.shot.isHome;
  if(ev.shots&&ev.shots[0]) return !!ev.shots[0].isHome;
  return mState._lastOff!==false;
}

/** Olay geldiğinde oyuncuları yeniden konumla + şutsuz olayların top koreografisi. */
function movePlayersForEvent(ev){
  try{
    const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!S) return;
    const type=ev&&ev.type;

    /* Çeyrek başı/sonu ve maç başı: orta sahaya toplan, top havada */
    if(type==='start'||type==='quarter_start'||type==='quarter_end'||type==='end'){
      const hs=[[428,250],[400,150],[400,350],[352,196],[352,308]];
      const as=[[512,250],[540,150],[540,350],[588,196],[588,308]];
      S.home.forEach((p,i)=>{ p.tx=hs[i][0]; p.ty=hs[i][1]; });
      S.away.forEach((p,i)=>{ p.tx=as[i][0]; p.ty=as[i][1]; });
      clearBallTimers();
      const b=S.ball; b.mode='loose'; b.carrier=null; b.x=COURT_MID; b.y=250; b.vx=0; b.vy=0; b.h=60; b.vh=90;
      return;
    }

    const off=_eventOff(ev);
    mState._lastOff=off;
    /* Yön: kullanıcı takımı evse sola, deplasmansa sağa hücum eder. */
    const offLeft=(off===(mState.userIsHome!==false));
    const offP=off?S.home:S.away;
    const defP=off?S.away:S.home;
    S.offSide=offLeft;
    S.offP=offP; S.defP=defP;
    S.offIsUser=off;                      /* taktikler yalnız kullanıcı tarafına uygulanır */
    S.prevType=S.curType; S.curType=type; /* hücum türü seçimi (fast break) önceki olaya bakar */

    if(ev&&ev.shot){ _setFormation(offLeft,offP,defP,ev.shot); return; }   /* top: animateShotPossession */

    /* Serbest atış: dizil, şutörü çizgiye koy, atışları canlandır.
       Şutör çizgiye EN YAKIN hücumcu (faul zaten onun üstündeydi) — uzaktan
       seçilirse ilk atışa çizgiye yetişemiyor, top boş çizgiden fırlıyordu. */
    if(ev&&ev.shots&&ev.shots.length&&ev.shots[0].kind==='ft'){
      const line=offLeft?[214,250]:[726,250];
      let shooter=offP[0],sd=1e9;
      offP.forEach(p=>{ const d=Math.hypot(p.x-line[0],p.y-line[1]); if(d<sd){sd=d;shooter=p;} });
      _setFtFormation(offLeft,offP,defP,shooter);
      S.shooter=shooter;
      const rim=_rim(offLeft);
      clearBallTimers();
      const steps=[{at:0,fn:()=>_ballHold(shooter)}];
      const shots=ev.shots.slice(0,2);
      shots.forEach((sh,i)=>{
        const t0=0.55+i*0.58;
        steps.push({at:t0,fn:()=>_ballShoot(rim,0.46,sh.made,()=>{
          if(!sh.made){ const a=Math.random()*6.283; _ballLoose(Math.cos(a)*90,Math.sin(a)*90,95); }
        })});
        if(i<shots.length-1) steps.push({at:t0+0.52,fn:()=>{ const b=S.ball; b.mode='held'; b.carrier=shooter; }});
      });
      _script(steps);
      return;
    }

    _setFormation(offLeft,offP,defP,null);
    clearBallTimers();

    if(type==='steal'){
      /* Top kaybı: top elden çıkar, karşı takımdan biri üzerine koşar ve alır. */
      const thief=defP[rand(0,4)];
      const b=S.ball;
      const a=Math.random()*6.283;
      _ballLoose(Math.cos(a)*140,Math.sin(a)*140,55);
      thief.maxV=thief.sprintV; thief.tx=b.x; thief.ty=b.y;
      _script([{at:0.55,fn:()=>{ _ballHold(thief); }}]);
      return;
    }
    if(type==='reb'){
      const reb=(Math.random()<0.5?offP:defP)[rand(0,4)];
      _script([{at:0.15,fn:()=>_ballHold(reb)}]);
      return;
    }
    if(type==='foul'){
      /* Düdük: oyun durur, top yandan girer. */
      const p=offP[0];
      _script([{at:0.10,fn:()=>_ballHold(p)}]);
      return;
    }
    /* tactic / diğer: set oyunu — top çevrede paslaşır. */
    const b=S.ball;
    if(!b.carrier||offP.indexOf(b.carrier)<0) _ballHold(offP[0]);
    const a1=offP[rand(1,4)], a2=offP[rand(1,4)];
    _script([
      {at:0.30,fn:()=>_ballPass(a1)},
      {at:0.75,fn:()=>_ballPass(a2!==a1?a2:offP[0])}
    ]);
  }catch(e){}
}

/** Şutlu hücum: topu getir → 2 pas → şut → çember/ribaund.
    onShoot: top şutörün elinden çıktığı an (şut izi). onResult: top çembere vardığı an (ses). */
function animateShotPossession(sh,onShoot,onResult){
  try{
    const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!S) return 0;
    clearBallTimers();
    const offLeft=S.offSide!=null?S.offSide:(sh.isHome===(mState.userIsHome!==false));
    const offP=S.offP||(sh.isHome?S.home:S.away);
    const defP=S.defP||(sh.isHome?S.away:S.home);
    const rim=_rim(offLeft);
    const shooter=S.shooter||offP[0];
    const b=S.ball;

    /* Topu getiren: hâlihazırda hücum takımından biri tutuyorsa o, değilse PG. */
    let pg=(b.carrier&&offP.indexOf(b.carrier)>=0)?b.carrier:offP[0];
    if(pg===shooter) pg=offP.find(p=>p!==shooter)||offP[0];
    const relay=offP.filter(p=>p!==shooter&&p!==pg);
    const tac=G.tactics||{};
    const userAtt=!!sh.isHome;
    /* Top yükleme: kullanıcı hücumunda ara pas mümkünse odak oyuncusuna uğrar. */
    let mid=relay.length?relay[rand(0,relay.length-1)]:pg;
    if(userAtt&&tac.focusPlayerId){
      const f=relay.find(p=>p.pl&&p.pl.id===tac.focusPlayerId);
      if(f) mid=f;
    }

    /* Şut anı: iz top elden çıkarken, ses/ribaund top çembere varınca. */
    const fire=()=>{
      try{ if(typeof onShoot==='function') onShoot(); }catch(e){}
      /* Top, izin çizildiği şut noktasından çıkar; büyük fark kalmışsa köprü adımı
         (aşağıdaki 'bridge' script adımı) zaten kapattı — kalan ufak farkı hizala. */
      b.x=sh.x; b.y=sh.y;
      const rimD=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
      _ballShoot(rim,rimD<90?0:0.58,sh.made,()=>{
        try{ if(typeof onResult==='function') onResult(); }catch(e){}
        if(!sh.made){
          /* çemberden seken top: ribaundcu üzerine koşar */
          const a=(Math.random()*2-1)*1.2+(offLeft?0:Math.PI);
          _ballLoose(Math.cos(a)*180,Math.sin(a)*170,110);
          const pool=Math.random()<0.72?defP:offP;
          const reb=pool[rand(3,4)];
          const bb=S.ball;
          reb.maxV=reb.sprintV;
          reb.tx=bb.x+Math.cos(a)*40; reb.ty=bb.y+Math.sin(a)*36;
        }
      });
    };

    /* ── Hücum türü: 3 dal ──
       1) Fast break: top çalma/ribaund sonrası + hızlı tempo/odak → tek uzun outlet
          pas öne koşan şutöre, erken şut. 2) İzolasyon: top yükleme oyuncusu şutörse
          tek pasla topu alır, diğerleri sahayı açar. 3) Set oyunu (varsayılan). */
    const afterTurnover=(S.prevType==='steal'||S.prevType==='reb');
    const fastBreak=userAtt&&afterTurnover&&(tac.tempo==='hizli'||tac.odak==='hizli');
    const iso=userAtt&&tac.focusPlayerId&&shooter.pl&&shooter.pl.id===tac.focusPlayerId;

    /* Top karşı takımdaysa veya serbestse önce çıkış pasıyla topu getirene ulaşır (ışınlanma yok). */
    const d0=Math.hypot(b.x-pg.x,b.y-pg.y);
    if(d0>55) _ballPass(pg,Math.min(0.46,0.16+d0/900)); else _ballHold(pg);

    /* Köprü adımı: şuttan hemen önce top şut noktasından hâlâ uzaksa (şutör yetişememiş,
       çarpışma engeli vb.) kısa bir sıçrayışla oraya taşınır — fire'daki hizalama artık
       "ışınlanma" gibi görünmez. */
    const bridge=()=>{
      const d=Math.hypot(b.x-sh.x,b.y-sh.y);
      /* statik hedef: pas bitişindeki _ballHold, taşıyıcı alanlarını (vx/vy/side) okur */
      if(d>36) _ballPass({x:sh.x,y:sh.y,vx:0,vy:0,side:1},Math.max(0.12,Math.min(0.22,d/700)));
    };
    /* Zamanlama gerçekçi koşu hızlarına göre (oyuncular 130-315 px/sn): hücum ~2.9 sn'de
       kurulur, şut ~2.3 sn'de çıkar (olay gecikmesi 3100 ms — bkz. matchStep delay). */
    let steps;
    if(fastBreak){
      /* Herkes sprintle öne — top uzun havadan pasla direkt şutöre fırlar. */
      offP.forEach(p=>{ p.maxV=p.sprintV; });
      steps=[
        {at:0.35,fn:()=>_ballPass(shooter,0.55)},
        {at:1.05,fn:bridge},
        {at:1.30,fn:fire}
      ];
    } else if(iso){
      /* Diğer hücumcular kenara çekilip alan açar; top tek pasla yıldıza. */
      offP.forEach(p=>{ if(p!==shooter&&p!==pg) p.ty+=(p.ty<250?-26:26); });
      steps=[
        {at:0.90,fn:()=>_ballPass(shooter,0.32)},
        {at:1.65,fn:bridge},
        {at:1.90,fn:fire}
      ];
    } else {
      steps=[
        {at:1.00,fn:()=>_ballPass(mid,0.30)},        /* topu getirdi, ilk pas */
        {at:1.60,fn:()=>_ballPass(shooter,0.32)},    /* şutöre son pas */
        {at:2.05,fn:bridge},
        {at:2.30,fn:fire}
      ];
    }
    _script(steps);
    return 2900;
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
/* Anlatım-geometri tutarlılığı: yakın mesafe (turnike/smaç/pota altı) kalıpları yalnız
   pota dibindeki şutlarda, orta mesafe kalıpları yalnız uzak şutlarda kullanılır. */
const _NEAR_WORDS=/turnike|pota altı|potaya asıldı|boyalı alan|dibe|smaç|pota ile anlaştı|potaya "merhaba"/i;
const _MID_WORDS=/orta mesafe|jump shot|uzaktan|kısa kaldı/i;
function spikerLine(spId,kind,v){
  const set=SPIKER_LINES[spId]||SPIKER_LINES.reha;
  let pool=set[kind]||SPIKER_LINES.reha[kind]||[''];
  v=v||{};
  /* Şut sınıfı verilmişse (score2/miss2) uyumsuz betimleri havuzdan ele. */
  if(v.cls&&(kind==='score2'||kind==='miss2')){
    const f=pool.filter(t=>v.cls==='yakin'?!_MID_WORDS.test(t):!_NEAR_WORDS.test(t));
    if(f.length) pool=f;
  }
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
  /* Paket 3 (14. oturum): pozisyon uyumu — oynadığı yuva doğal pozuysa tam performans,
     eğitimli İKİNCİL pozuysa küçük ceza (-%4), yabancı pozdaysa belirgin ceza (-%10).
     matchLineup önce doğal poza atadığından normal kadrolarda çarpan hep 1'dir (davranış değişmez). */
  const _playedPoz={};
  [['PG',pg],['SG',sg],['SF',sf],['PF',pf],['C',c]].forEach(([poz,p])=>{ if(p&&p.id) _playedPoz[p.id]=poz; });
  const pozFitMul=(p)=>{
    const played=p&&_playedPoz[p.id];
    if(!played||played===p.poz) return 1;
    return (p.ikincilPoz===played)?0.96:0.90;
  };
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
    return base*skillMul*enMul*psyMul*clutchMul*uMul*pozFitMul(shooter);
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
  /* C2: Her olay, oyuncu-bazlı anlık görüntüyü de taşır — manuel koçlukta kalan maç
     yeniden üretilirken (regenerateMatchRemainder) o ana kadarki oyuncu istatistikleri,
     faul sayaçları ve takım çeyrek faulleri resume ile korunur (ilk yarı kaybolmaz). */
  const _cloneStats=(o)=>{ const r={}; for(const k in o) r[k]={...o[k]}; return r; };
  const snap=()=>({h:cloneBox(hB),a:cloneBox(aB),
    ps:_cloneStats(pstats),os:_cloneStats(ostats),
    mf:Object.fromEntries((lu.avail||[]).filter(p=>p&&p.id).map(p=>[p.id,p.matchFouls||0])),
    fu:{...qFoulU},fo:{...qFoulO}});

  const rname=rakip&&rakip.isim||'Rakip';

  /* Serbest atış metni AÇIKÇA "serbest atış" der — saha şutuyla karışmasın. */
  const ftLine=(nMade,nAtt,who)=> nMade===nAtt?`${who} serbest atışlarda ${nMade}/${nAtt} — hepsi içeride.`
    : nMade===0?`${who} serbest atışlarda ${nMade}/${nAtt}; seyirci sustu.`
    : `${who} serbest atışlarda ${nMade}/${nAtt}.`;

  /* ── Tek pozisyon simülasyonu (gerçekçi FIBA temposu) ──
     Pozisyonların çoğu saha içi şutla biter; ribaund/asist/blok/faul kutuya ve anlatıma gömülür.
     userPos=true → kullanıcı takımı (kutu hB, skor homeScore); değilse rakip (aB, awayScore). */
  /* Canlı görselleştirme, hangi takımın hücumda olduğunu bilmek zorunda (yön + jetonlar).
     runPossession'ın ürettiği her olaya `off` (true = kullanıcı takımı hücumda) damgalanır. */
  let _lastOff=true;
  function runPossessionV(q,t){
    const s=events.length;
    runPossession(q,t);
    for(let i=s;i<events.length;i++) if(events[i].off===undefined) events[i].off=_lastOff;
  }
  function runPossession(q,t){
    const userPos=Math.random()<(userIsHome?0.53:0.47);
    _lastOff=userPos;
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
        const lineX=(userPos===userIsHome)?210:730;
        events.push({type:'free',text:`${shooter.isim} şut anında faul aldı — 2 serbest atış kullanacak. ${ftLine(nMade,2,shooter.isim)} ${sc()}`,q,t,home:homeScore,away:awayScore,
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
        const lineX=(userPos===userIsHome)?204:736;
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
      /* Anlatım-geometri tutarlılığı: şut noktasının çembere uzaklığından sınıf çıkar.
         ≤90px (~2.7m) = "yakin" (turnike/smaç dili serbest); üstü = "orta" (turnike dili YASAK). */
      const _rim=(userPos===userIsHome)?RIM_L:RIM_R;
      const _rd=Math.hypot(xy.x-_rim[0],xy.y-_rim[1]);
      const cls=is3?'uzak':(_rd<=90?'yakin':'orta');
      let txt;
      if(made){
        /* Kendi yaratımı (passız) isabetlerde ~%34 renkli hamle girişi serpiştir — sınıf uyumlu. */
        let mvPool=MOVE_LINES;
        if(cls==='orta') mvPool=MOVE_LINES.filter(l=>!/dibe indi/i.test(l));
        else if(cls==='yakin') mvPool=MOVE_LINES.filter(l=>!/step-back|Geriye çekilerek/i.test(l));
        const mv=(!passer&&Math.random()<0.34)?(ch(mvPool)+' '):'';
        if(is3){ const pasTxt=passer?`${passer.isim}'in pasında `:''; txt=mv+pasTxt+spikerLine(SP.id,'score3',{s:shooter.isim,sc:sc()}); }
        else if(and1){ txt=`${shooter.isim} faule rağmen ${cls==='yakin'?'turnikeyi bitirdi':'şutu soktu'} — ${and1Made?'AND-1 tamam!':'ek atış kaçtı.'} ${sc()}`; }
        else { const pasTxt=passer?`${passer.isim} buldu; `:''; txt=mv+pasTxt+spikerLine(SP.id,'score2',{s:shooter.isim,sc:sc(),cls}); }
      } else if(blocked){
        txt=spikerLine(SP.id,'block',{s:shooter.isim,b:blk.isim});
      } else {
        txt=spikerLine(SP.id,is3?'miss3':'miss2',{s:shooter.isim,cls});
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
      const lineX=(userPos===userIsHome)?210:730;
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
          const lineX=(userPos===userIsHome)?210:730;
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
      runPossessionV(q,t);
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
      runPossessionV(qq,t);
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
    if(typeof tickCup==='function') tickCup(); /* Paket 1: vadesi gelen kupa turlarını işlet */
    if(ctx.userIsHome){
      const bilet=homeTicketIncome();
      txn('Bilet geliri',bilet);
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">🎟️ Ev maçı bilet geliri: <strong>+${fmtn(bilet)} KR</strong> (${fmtn(G.arena.kap)} kapasite)</div>`);
    } else {
      /* Paket A: seyahat da sezonla pahalanır (gider enflasyonu). */
      const seyahat=Math.round(ecoRound(rand(300,700))*ecoInflationMul());
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
  } else if(ctx.isCup){
    /* Paket 1 (14. oturum): ULUSAL KUPA maçı — sonuç kupa ağacına işlenir. Yorgunluk,
       istatistik ve sakatlık normal işler; lig günü/ekonomi haftası İLERLEMEZ (kupa,
       lig takvimine sıkıştırılmış ekstra maçtır). Küçük maç günü geliri aşağıdaki
       ortak ödül bloğundan gelir. */
    const playedSet=new Set(ev.lineupIds||[]);
    (ev.subIds||[]).forEach(id=>playedSet.add(id));
    updateChronicFatigue(playedSet);
    applyMatchFatigueToRoster(playedSet.size?playedSet:undefined);
    mergeMatchPlayerStats(ev);
    clearResolvedInjuries();
    rollInjuriesAfterUserMatch();
    if(ctx.userIsHome){
      const bilet=Math.round(homeTicketIncome()*0.6); /* kupa gecesi: daha düşük doluluk */
      txn('Kupa maçı bilet geliri',bilet);
    }
    if(typeof recordUserCupResult==='function') recordUserCupResult(uPts,oPts,ctx.rakipName,ctx.userIsHome);
  } else {
    /* C3: Erişilmez dal — startMatch sezon/playoff/kupa şart koşar; buraya düşen bir maç
       bağlamsızdır ve tabloya işlenemez. Yalnız teşhis logu. */
    dbg('applyMatchResult','fikstür dışı maç sonucu (sezon pasif / bağlam yok): '+(ev.winner||'?'));
  }
  if(ev.winner==='home'){
    /* Paket A: ödül bandı kırpıldı (1500-3500→1000-2400) — galibiyet geliri tek başına
       tüm kulüp giderlerini ezmesin, uzun vadede kasa otomatik şişmesin (20 sezon ölçümüyle ayarlandı). */
    const priz=ecoRound(rand(1000,2400));
    txn('Maç ödülü (galibiyet)',priz);
    sfx('win');
    G.winStreak=(Number(G.winStreak)||0)+1;
    if(G.winStreak>=10) unlockAchievement('seri10');
    showNotif(`🏆 Galip geldin! +2 tablo puanı · +${fmtn(priz)} KR ödül${G.winStreak>=3?` · ${G.winStreak} maçlık seri!`:''}`);
  }
  else if(ev.winner==='away'){
    G.winStreak=0;
    const cons=ecoRound(rand(320,720)); /* Paket A: %20 kırpma (400-900→320-720) */
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
  /* Paket B: kariyer maç sayacı ("Yüz Maç Kulübü") + kariyer G/M (Kariyer Özeti). */
  G.careerMatches=(Number(G.careerMatches)||0)+1;
  if(ev.winner==='home') G.careerWins=(Number(G.careerWins)||0)+1;
  else if(ev.winner==='away') G.careerLosses=(Number(G.careerLosses)||0)+1;
  if(G.careerMatches>=100) unlockAchievement('yuzMac');
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

