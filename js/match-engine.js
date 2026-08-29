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
function randShotXY(isLeft,is3,made,poz){
  const rim=isLeft?RIM_L:RIM_R;
  const dir=isLeft?1:-1;
  /* Pozisyona göre gerçekçi şut coğrafyası: pivot pota dibinden, PF boya/kısa mesafeden,
     dış oyuncular orta mesafeye kadar açılır — pivotun köşeden attığı "hayalet" şutlar bitti. */
  const r2=poz==='C'?(made?rand(14,72):rand(16,92))
        :poz==='PF'?(made?rand(15,96):rand(20,124))
        :(made?rand(16,104):rand(24,156));
  const r=is3
    /* kaçan üçlük en fazla yayın ~1.1m gerisinden — daha derini "orta sahadan şut" gibi görünüyordu */
    ? (made?rand(THREE_R+5,THREE_R+34):rand(THREE_R+4,THREE_R+38))
    : r2;
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
   CANLI SAHA SİMÜLASYONU v3 — "gerçek maç" sunumu (27. oturum tam revizyonu)
   ──────────────────────────────────────────────────────────────────────────
   Tasarım ilkeleri:

   1) POZİSYON = SAHNE. Her hücum sırayla üç fazdan geçer:
      (a) TOPU OYUNA SOKMA — sayı/faul sonrası bir oyuncu topu alır, dip ya da
          yan çizginin GERÇEKTEN DIŞINA çıkar, içeri pası o atar, sonra sahaya
          döner. (OOB izni yalnız o karede yalnız o oyuncudadır.)
      (b) GEÇİŞ — hücum ÜÇ KULVARDA koşar (top orta, iki kanat kenarlarda,
          büyükler arkadan), savunma ise adamını kovalamak yerine önce POTAYA
          döner. Eski sürümde iki takım yan yana orta sahadan geçtiği için
          10 jeton tek yumak oluyordu.
      (c) SET — role göre 4-out / horns / post dizilimi, perde (pick&roll),
          kesme, kilit pas ve şut.

   2) ROL = POZİSYON. Jetonlar PG/SG/SF/PF/C rolüne çapalanır (kadro sırasına
      değil): pivot daima içeride, guardlar dışarıda. Rakip 5'i "genel"e göre
      sıralı geldiğinden eskiden pivot köşede üçlük bekliyordu.

   3) TOP FİZİĞİ. Dribbling (yere sekerek), göğüs/yerden pas, parabolik şut,
      fileden düşüş, çemberden karambol, sürtünmeli serbest top + dönme.
      Top ASLA saha çizgilerinin dışına kaçmaz; serbest topun peşinden gerçekten
      koşulur ve yetişilince alınır (zamanlayıcıyla ışınlanmaz).

   4) SENKRON. Spikerin cümlesi olayın SAHADA gerçekleştiği kareye bağlanır:
      çalma → topun kapıldığı an, ribaund → topun alındığı an, faul → düdük,
      serbest atış → son atışın çemberden geçtiği an, saha şutu → topun çembere
      vardığı an. (paint geri çağrısı koreografiye gömülür.)

   5) HIZ. Tüm sahne sim-saniyesi cinsinden kurulur; `mState.rate` (izleme hızı)
      dt'yi ölçekler → 1×/1.5×/2×/3× seçenekleri hareketin doğallığını bozmaz.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── Saha çizgileri (iç viewBox 940×500) ── */
const CRT_X0=56.4, CRT_X1=883.6, CRT_Y0=30, CRT_Y1=470;
const CRT_IN=14;     /* jeton merkezi çizgiden bu kadar içeride tutulur */
const CRT_OUT=26;    /* topu sokan oyuncunun çizgi dışına adımı */

const _PL_MAXV=320;          /* px/sn — hız stat'ı yoksa yedek koşu hızı */
const _PL_ACC=13;            /* hedefe yaklaşma sertliği */
const _PL_R=40;              /* çarpışma yarıçapı — jetonlar bu mesafeden yakın durmaz */

/* Oyuncunun gerçek koşu hızı — GERÇEK ÖLÇEK: saha 940px = 28m (1px ≈ 0.03m).
   `hiz` stat'ı (0-99) → 130-210 px/sn ≈ 3.9-6.3 m/sn; sprint ×1.62. Düşük enerji
   %13'e kadar yavaşlatır. İzleme hızı (rate) bunun ÜSTÜNE çarpan olarak biner. */
function _tokBaseV(pl){
  const hiz=(pl&&pl.hiz!=null)?Number(pl.hiz):60;
  const en=(pl&&pl.enerji!=null)?Number(pl.enerji):100;
  const fat=1-0.13*Math.max(0,Math.min(1,(100-en)/100));
  return (130+Math.max(0,Math.min(99,hiz))/99*80)*fat;
}
function _tokShort(name){ const a=String(name||'').trim().split(/\s+/); return a[a.length-1]||String(name||''); }
function _tokSet(g,x,y,sc){
  if(!g) return;
  g.setAttribute('transform',(sc&&Math.abs(sc-1)>0.004)
    ? `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc.toFixed(3)})`
    : `translate(${x.toFixed(1)},${y.toFixed(1)})`);
}
function _mir(p){ return [940-p[0],p[1]]; }
function _rim(left){ return left?RIM_L.slice():RIM_R.slice(); }
function _jit(n,a){ return n+(Math.random()*2-1)*(a||10); }
/* Bir noktayı saha içinde tut (topu sokan hariç herkes için geçerli). */
function _inX(x){ return Math.max(CRT_X0+CRT_IN,Math.min(CRT_X1-CRT_IN,x)); }
function _inY(y){ return Math.max(CRT_Y0+CRT_IN,Math.min(CRT_Y1-CRT_IN,y)); }

function clearMatchPlayers(){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(S&&S.raf){ cancelAnimationFrame(S.raf); S.raf=null; }
  ['playersLayer','ballShadow','ballRing','courtFx'].forEach(id=>{ const e=document.getElementById(id); if(e) e.remove(); });
  if(typeof mState!=='undefined'&&mState){ mState._tokens=null; mState._sim=null; }
}

/** Rol ataması: dizilim kadro sırasına değil POZİSYONA bağlanır (0 PG…4 C). */
function _assignRoles(arr){
  const want=['PG','SG','SF','PF','C'];
  const pool=arr.slice(), out=new Array(5).fill(null);
  want.forEach((w,i)=>{
    const j=pool.findIndex(p=>p&&p.pl&&p.pl.poz===w);
    if(j>=0){ out[i]=pool[j]; pool.splice(j,1); }
  });
  for(let i=0;i<5;i++) if(!out[i]) out[i]=pool.shift()||null;
  out.forEach((p,i)=>{ if(p) p.role=i; });
  arr.forEach((p,i)=>{ if(p&&p.role==null) p.role=i; });
}
function _rolesOrder(list){ return list.slice().sort((a,b)=>(a.role||0)-(b.role||0)); }

function initMatchPlayers(lu,rakip,oppPlayers){
  try{
    const ball=document.getElementById('liveBall');
    const svg=ball&&ball.parentNode;
    if(!svg) return;
    clearMatchPlayers();
    /* zemin katmanı: top gölgesi + top sahibi halkası + efekt (file/çember) */
    const shadow=document.createElementNS('http://www.w3.org/2000/svg','ellipse');
    shadow.setAttribute('id','ballShadow');
    shadow.setAttribute('rx','9'); shadow.setAttribute('ry','3.6');
    shadow.setAttribute('fill','rgba(0,0,0,0.38)'); shadow.setAttribute('opacity','0');
    shadow.setAttribute('pointer-events','none');
    svg.insertBefore(shadow,ball);

    const fx=document.createElementNS('http://www.w3.org/2000/svg','circle');
    fx.setAttribute('id','courtFx'); fx.setAttribute('r','16');
    fx.setAttribute('fill','none'); fx.setAttribute('stroke','#fde68a');
    fx.setAttribute('stroke-width','3'); fx.setAttribute('opacity','0');
    fx.setAttribute('pointer-events','none');
    svg.insertBefore(fx,ball);

    /* Top kimde? — jetonun altındaki sarı halka izleyicinin gözünü topa bağlar. */
    const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
    ring.setAttribute('id','ballRing'); ring.setAttribute('r','23');
    ring.setAttribute('fill','none'); ring.setAttribute('stroke','#facc15');
    ring.setAttribute('stroke-width','3'); ring.setAttribute('opacity','0');
    ring.setAttribute('pointer-events','none');
    svg.insertBefore(ring,ball);

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
      /* İsim etiketi: EV takımı jetonun ALTINDA, deplasman ÜSTÜNDE — iki jeton yan yana
         geldiğinde etiketler üst üste binip okunmaz hâle gelmesin (takım ayrımı da netleşir). */
      nm.setAttribute('class','tok-name');   /* dar ekranda CSS ile gizlenir (okunmaz hâle gelmesin) */
      nm.setAttribute('text-anchor','middle'); nm.setAttribute('dy',fill===homeCol?'30':'-21');
      nm.setAttribute('font-size','12'); nm.setAttribute('font-weight','700');
      nm.setAttribute('fill','rgba(255,255,255,0.95)'); nm.setAttribute('stroke','rgba(0,0,0,0.55)');
      nm.setAttribute('stroke-width','0.9'); nm.setAttribute('paint-order','stroke');
      nm.setAttribute('pointer-events','none'); nm.textContent=label;
      g.appendChild(c); g.appendChild(t); g.appendChild(nm);
      layer.appendChild(g);
      return g;
    };
    const homeP=(lu&&lu.onCourt)?lu.onCourt.slice(0,5):[];
    const rk=(rakip&&rakip.isim)?_tokShort(rakip.isim):'Rakip';
    const mkP=(g,x,y,team,slot,pl)=>{
      const bv=_tokBaseV(pl);
      return {g,x,y,vx:0,vy:0,tx:x,ty:y,team,slot,pl:pl||null,baseV:bv,sprintV:bv*1.62,maxV:bv,
              ph:Math.random()*6.283,side:Math.random()<0.5?-1:1,role:null,pop:0,sc:1,_oob:false,_lock:0};
    };
    /* Hava atışı dizilimi: her takım KENDİ savunacağı yarı sahada; pivotlar dairede.
       Kullanıcı (home jetonları) userIsHome ise SOL potaya hücum eder → savunduğu yarı SAĞ. */
    const userAttacksLeft=(typeof mState!=='undefined'&&mState&&mState.userIsHome!==false);
    const ownHalfLeft=!userAttacksLeft;                     /* kullanıcının savunma yarısı solda mı */
    const spotsNear=[[428,250],[392,146],[392,354],[338,196],[338,304]];
    const spotsFar=spotsNear.map(_mir);
    const hs=ownHalfLeft?spotsNear:spotsFar;
    const as=ownHalfLeft?spotsFar:spotsNear;

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
    _assignRoles(home); _assignRoles(away);
    mState._tokens={home:home.map(p=>p.g),away:away.map(p=>p.g)};
    mState._sim={
      home,away,players:home.concat(away),
      shadow,ring,fx,
      ball:{mode:'idle',x:COURT_MID,y:250,h:0,vx:0,vy:0,vh:0,carrier:null,t:0,dur:1,arc:0,rot:0,
            from:[COURT_MID,250],to:[COURT_MID,250],onDone:null,noDrib:false,bounce:false},
      script:[],sIdx:0,sT:0,time:0,last:0,raf:null,idle:0,
      shooter:null,offSide:null,offP:null,defP:null,offIsUser:true,
      chase:null,fxT:0,fxX:0,fxY:0,
      inb:null,            /* bekleyen kenardan sokma: {side:'base'|'side',x,y} */
      setIx:0,flip:false,
      /* Rakip bot da maç bazında savunma kimliği taşır: çoğunlukla adam adama,
         ~%25 maçta 2-3 bölge — savunma çeşitliliği iki yönde de görülür. */
      botDef:Math.random()<0.25?'bolge':'adam',
      defTrack:false,defRim:null
    };
    mState._lastOff=null;
    home.concat(away).forEach(p=>_tokSet(p.g,p.x,p.y));
    const bEl=document.getElementById('liveBall');
    if(bEl){ bEl.style.transition='none'; bEl.style.opacity='0.98'; }
    _simStart();
  }catch(e){}
}

/** 5 faulle çıkan oyuncunun saha jetonunu yerine giren oyuncuya devret (görsel senkron). */
function swapCourtToken(outId,inPlayer){
  try{
    const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!S||!inPlayer||outId==null) return;
    const all=S.home.concat(S.away);
    const tok=all.find(p=>p.pl&&p.pl.id===outId);
    if(!tok) return;
    tok.pl=inPlayer;
    const bv=_tokBaseV(inPlayer);
    tok.baseV=bv; tok.sprintV=bv*1.62; tok.maxV=bv;
    const nm=tok.g&&tok.g.querySelector('text:last-child');
    if(nm) nm.textContent=_tokShort(inPlayer.isim);
    /* rol havuzunu yeni pozisyona göre tazele (pivot yerine guard girdiyse dizilim düzelsin) */
    _assignRoles(tok.team==='h'?S.home:S.away);
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
    const dtReal=Math.min(0.05,(ts-S.last)/1000);   /* sekme arkaplandayken sıçramasın */
    S.last=ts;
    /* maç bittikten ~3sn sonra döngüyü bırak (pil) */
    if(typeof mState!=='undefined'&&mState&&mState.running===false&&!mState.paused){
      S.idle+=dtReal; if(S.idle>3){ S.raf=null; return; }
    } else S.idle=0;
    try{ _simStep(dtReal); }catch(e){}
    S.raf=requestAnimationFrame(loop);
  };
  S.raf=requestAnimationFrame(loop);
}

/** İzleme hızı (rate) uygulanmış zamanı SABİT küçük adımlara böl — hızlı modda
    fizik bozulmasın (tünelleme/aşırı itme olmasın). */
function _simStep(dtReal){
  const S=mState._sim; if(!S) return;
  const rate=Math.max(0.5,Math.min(4,(typeof mState!=='undefined'&&mState&&mState.rate)||1));
  let rem=dtReal*rate;
  let guard=0;
  while(rem>0.0005&&guard++<12){
    const h=Math.min(0.0333,rem);
    _simTick(h);
    rem-=h;
  }
  _ballRender();
}

function _simTick(dt){
  const S=mState._sim; if(!S) return;
  S.time+=dt;
  /* 0) zamanlanmış koreografi adımları */
  if(S.script.length){
    S.sT+=dt;
    while(S.sIdx<S.script.length&&S.sT>=S.script[S.sIdx].at){
      const st=S.script[S.sIdx]; S.sIdx++;
      try{ st.fn(); }catch(e){}
    }
    if(S.sIdx>=S.script.length){ S.script=[]; S.sIdx=0; }
  }
  /* 1) SERBEST TOP TAKİBİ — top yerde/havadayken peşindeki oyuncu GERÇEKTEN koşar;
        yetişince alır (eski sürümde sabit zamanlayıcıyla top oyuncunun eline ışınlanıyordu). */
  if(S.chase){
    const c=S.chase, b=S.ball, t=c.tok;
    c.t=(c.t||0)+dt;
    if(!t||(b.mode!=='loose'&&b.mode!=='rim')){ if(b.mode==='held') S.chase=null; }
    else {
      t.tx=b.x; t.ty=b.y; t.maxV=t.sprintV; t._lock=S.time+0.1;
      const d=Math.hypot(t.x-b.x,t.y-b.y);
      if((d<(c.r||26)&&b.h<30)||c.t>(c.max||3.2)){
        _ballHold(t); t.pop=1; S.chase=null;
        if(typeof c.fn==='function'){ try{ c.fn(); }catch(e){} }
      }
    }
  }
  /* 2) SAVUNMA CANLI TAKİBİ — top-sen-adam ilkesi:
        • adam adama: topu tutanı yakın kapatır, topsuz adamın savunmacısı adam ile
          "top-pota orta noktası" arasında YARDIM pozisyonuna sarkar (mesafe topa
          uzaklıkla artar) → gerçek yardım savunması görüntüsü;
        • 2-3 bölge: herkes bölgesinde durur, blok topa doğru sınırlı kayar. */
  if(S.defTrack&&S.defP){
    const b=S.ball, rim=S.defRim||RIM_L;
    for(const p of S.defP){
      if(p._lock>S.time) continue;
      if(p._zone){
        if(p._zbx==null||Math.hypot(b.x-p._zbx,b.y-p._zby)>18){
          p._zbx=b.x; p._zby=b.y;
          const zx=b.x-p._zone[0], zy=b.y-p._zone[1];
          const zd=Math.hypot(zx,zy)||1;
          const k=Math.min(44,zd*0.22);
          p.tx=_inX(p._zone[0]+zx/zd*k); p.ty=_inY(p._zone[1]+zy/zd*k);
        }
      } else if(p._mark){
        const m=p._mark;
        const onBall=(b.carrier===m);
        /* DEADZONE: adam ya da top belirgin oynamadıkça hedef güncellenmez (jitter yok) */
        if(p._mkx==null||Math.hypot(m.x-p._mkx,m.y-p._mky)>12||Math.hypot(b.x-(p._bbx||0),b.y-(p._bby||0))>30){
          p._mkx=m.x; p._mky=m.y; p._bbx=b.x; p._bby=b.y;
          const hx=onBall?rim[0]:(rim[0]+b.x)/2, hy=onBall?rim[1]:(rim[1]+b.y)/2;
          const gap=onBall?(p._press?22:27):_defGap(Math.hypot(m.x-b.x,m.y-b.y));
          const dx=hx-m.x, dy=hy-m.y, d=Math.hypot(dx,dy)||1;
          p.tx=_inX(m.x+dx/d*gap); p.ty=_inY(m.y+dy/d*gap);
          p.maxV=onBall?p.baseV*1.25:p.baseV;
        }
      }
    }
  }
  const P=S.players;
  const carrier=S.ball.carrier;
  /* 3) hedefe doğru ivmeli koşu + boşta mikro salınım + varış freni */
  for(const p of P){
    const w=(p===carrier)?0:1;
    /* ARA NOKTA (waypoint): geçişte kanatlar önce KENARA açılır, sonra kulvarda öne koşar.
       Düz çizgi hedefiyle iki takım orta bantta iç içe koşuyordu; gerçek basketbolda
       kanat oyuncusu önce genişler ("run wide"), sonra ilerler. */
    let _tx=p.tx,_ty=p.ty;
    if(p._wp){
      if(Math.hypot(p.x-p._wp[0],p.y-p._wp[1])<30) p._wp=null;
      else { _tx=p._wp[0]; _ty=p._wp[1]; }
    }
    const gx=_tx+Math.sin(S.time*1.15+p.ph)*1.8*w;
    const gy=_ty+Math.cos(S.time*0.87+p.ph*1.7)*1.8*w;
    let dx=gx-p.x, dy=gy-p.y;
    const d=Math.hypot(dx,dy);
    if(d>0.01){
      /* VARIŞ FRENİ — hedefe <24px kalınca hız eşik altına çekilir; jeton noktasında DURUR. */
      const want=d<24?Math.min(p.maxV||_PL_MAXV,12):Math.min(p.maxV||_PL_MAXV,d*3.4);
      p.vx+=((dx/d)*want-p.vx)*_PL_ACC*dt;
      p.vy+=((dy/d)*want-p.vy)*_PL_ACC*dt;
    } else { p.vx*=0.85; p.vy*=0.85; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.pop>0) p.pop=Math.max(0,p.pop-dt*2.6);        /* sıçrama/şut "pop" sönümü */
    p.sc=1+p.pop*0.20;
  }
  /* 4) üst üste binmeyi çöz — itme kare başına SINIRLI; çizgi dışındaki sokucu itilmez. */
  const shooterTok=S.shooter;
  for(let i=0;i<P.length;i++){
    for(let j=i+1;j<P.length;j++){
      const a=P[i],b=P[j];
      if(a._oob&&b._oob) continue;
      let dx=b.x-a.x, dy=b.y-a.y;
      let d=Math.hypot(dx,dy);
      if(d<_PL_R&&d>0.001){
        const push=Math.min((_PL_R-d)/2,2.6)*(dt*60);
        dx/=d; dy/=d;
        /* Çizgi dışındaki sokucu itilmez ama İÇİNDEN de geçilmez — yalnız karşı taraf kayar. */
        if(a._oob){ b.x+=dx*push*2; b.y+=dy*push*2; }
        else if(b._oob){ a.x-=dx*push*2; a.y-=dy*push*2; }
        else if(a===shooterTok){ b.x+=dx*push*2; b.y+=dy*push*2; }
        else if(b===shooterTok){ a.x-=dx*push*2; a.y-=dy*push*2; }
        else { a.x-=dx*push; a.y-=dy*push; b.x+=dx*push; b.y+=dy*push; }
      }
    }
  }
  /* 5) SINIR — topu sokan dışında herkes ÇİZGİ İÇİNDE kalır (gerçek kural). */
  for(const p of P){
    if(p._oob){
      p.x=Math.max(CRT_X0-46,Math.min(CRT_X1+46,p.x));
      p.y=Math.max(CRT_Y0-38,Math.min(CRT_Y1+38,p.y));
    } else {
      p.x=_inX(p.x); p.y=_inY(p.y);
    }
    _tokSet(p.g,p.x,p.y,p.sc);
  }
  _ballStep(dt);
  _fxStep(dt);
}

/* ── Top: durum makinesi ─────────────────────────────────────────────────── */
function _ball(){ return mState._sim.ball; }
function _ballHold(p,noDrib){
  const b=_ball(); if(!p) return;
  const d=Math.hypot(b.x-p.x,b.y-p.y);
  if(d>30){ _ballPass(p,Math.max(0.12,Math.min(0.30,d/700))); return; }  /* ışınlanma yok */
  b.mode='held'; b.carrier=p; b.t=0; b.noDrib=!!noDrib; b.vx=b.vy=b.vh=0;
}
function _ballPass(to,dur,bounce){
  const b=_ball(); if(!to) return;
  const d=Math.hypot(to.x-b.x,to.y-b.y);
  b.mode='pass'; b.carrier=null; b.from=[b.x,b.y]; b.target=to; b.noDrib=false;
  /* Pas hızı ~16 m/sn (520 px/sn); uzun paslar 0.9 sn'ye kadar havada kalır. */
  b.t=0; b.dur=dur||Math.max(0.25,Math.min(0.90,d/520));
  b.bounce=!!bounce;
  b.arc=bounce?-1:(7+d*0.040);
}
function _ballShoot(to,dur,made,onDone){
  const b=_ball();
  const d=Math.hypot(to[0]-b.x,to[1]-b.y);
  b.mode='shot'; b.carrier=null; b.from=[b.x,b.y]; b.to=[to[0],to[1]]; b.noDrib=false;
  b.h0=Math.max(b.h,20);      /* top elden ~omuz/baş hizasından çıkar */
  /* Yay yüksekliği mesafeye bağlı: pota dibinden (turnike) ALÇAK ve hızlı, uzaktan yüksek parabol. */
  b.t=0; b.dur=dur||Math.max(0.42,Math.min(0.78,0.34+d/560));
  b.arc=d<90?(18+d*0.11):(54+d*0.13);
  if(d<90&&!dur) b.dur=Math.max(0.32,0.24+d/500);
  b.made=!!made; b.onDone=onDone||null;
}
function _ballLoose(vx,vy,vh){
  const b=_ball(); b.mode='loose'; b.carrier=null; b.noDrib=false;
  b.vx=vx; b.vy=vy; b.vh=vh!=null?vh:70;
}
function _ballStep(dt){
  const S=mState._sim, b=S.ball;
  const px=b.x, py=b.y;
  switch(b.mode){
    case 'held':{
      const p=b.carrier;
      if(!p){ b.mode='loose'; b.vx=b.vy=0; b.vh=0; break; }
      const sp=Math.hypot(p.vx,p.vy);
      const ux=sp>10?p.vx/sp:1, uy=sp>10?p.vy/sp:0;
      if(b.noDrib){
        /* ölü top / kenardan sokma: top göğüs-baş hizasında, sekmez */
        b.x=p.x+ux*4; b.y=p.y+uy*4; b.h=17;
      } else {
        /* topu gövdenin hafif önünde ve yan tarafında sürer */
        b.x=p.x+ux*10-uy*11*p.side;
        b.y=p.y+uy*10+ux*11*p.side;
        b.h=Math.abs(Math.sin(S.time*(8.2+sp*0.020)))*12;
      }
      break;
    }
    case 'pass':{
      b.t+=dt/b.dur;
      const t=Math.min(1,b.t);
      const tx=b.target?b.target.x:b.from[0], ty=b.target?b.target.y:b.from[1];
      b.x=b.from[0]+(tx-b.from[0])*t;
      b.y=b.from[1]+(ty-b.from[1])*t;
      /* göğüs pası: alçak yay | yerden pas: ortada zemine değip yükselir */
      b.h=b.bounce?(t<0.55?16*(1-t/0.55):14*((t-0.55)/0.45)):(Math.sin(Math.PI*t)*b.arc+11);
      if(b.t>=1){ const to=b.target; b.bounce=false; _ballHold(to,!!(to&&to.ghost)); }
      break;
    }
    case 'shot':{
      b.t+=dt/b.dur;
      const t=Math.min(1,b.t);
      b.x=b.from[0]+(b.to[0]-b.from[0])*t;
      b.y=b.from[1]+(b.to[1]-b.from[1])*t;
      b.h=(b.h0||20)*(1-t)+Math.sin(Math.PI*t)*b.arc+30*t;   /* çember yüksekliğinde biter */
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
      if(b.h<0){
        const impact=Math.abs(b.vh);   /* zemine çarpma hızı — sesin şiddetini bu belirler */
        b.h=0; b.vh=-b.vh*0.52; if(Math.abs(b.vh)<14) b.vh=0;
        if(impact>30&&typeof sfx==='function') sfx('bounce');
      }
      /* Top saha ÇİZGİLERİNİN dışına çıkmaz — kenara gelince hız söner (taç yok, akış kesilmez). */
      if(b.x<CRT_X0+8){ b.x=CRT_X0+8; b.vx=Math.abs(b.vx)*0.35; }
      if(b.x>CRT_X1-8){ b.x=CRT_X1-8; b.vx=-Math.abs(b.vx)*0.35; }
      if(b.y<CRT_Y0+8){ b.y=CRT_Y0+8; b.vy=Math.abs(b.vy)*0.35; }
      if(b.y>CRT_Y1-8){ b.y=CRT_Y1-8; b.vy=-Math.abs(b.vy)*0.35; }
      break;
    }
    default: break;
  }
  /* dönme (yuvarlanma/uçuş hissi) */
  const mv=Math.hypot(b.x-px,b.y-py);
  if(mv>0.01) b.rot=(b.rot+mv*2.2)%360;
}
function _ballRender(){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null; if(!S) return;
  const b=S.ball;
  const el=document.getElementById('liveBall');
  if(!el) return;
  const sc=1+b.h*0.0095;
  el.setAttribute('transform',`translate(${b.x.toFixed(1)},${(b.y-b.h*0.62).toFixed(1)}) rotate(${b.rot.toFixed(0)}) scale(${sc.toFixed(3)})`);
  if(S.shadow){
    const k=Math.max(0.30,1-b.h/95);
    S.shadow.setAttribute('cx',b.x.toFixed(1));
    S.shadow.setAttribute('cy',(b.y+4).toFixed(1));
    S.shadow.setAttribute('rx',(9*k).toFixed(2));
    S.shadow.setAttribute('ry',(3.6*k).toFixed(2));
    S.shadow.setAttribute('opacity',(0.36*k).toFixed(2));
  }
  if(S.ring){
    const c=b.carrier;
    if(c&&!c.ghost){
      S.ring.setAttribute('cx',c.x.toFixed(1));
      S.ring.setAttribute('cy',c.y.toFixed(1));
      S.ring.setAttribute('opacity','0.85');
    } else S.ring.setAttribute('opacity','0');
  }
  mState._ballXY=[b.x,b.y];
}
/** Çember/file efekti — isabette sarı halka çemberde parlar (görsel geri bildirim). */
function _rimFlash(x,y,made){
  const S=mState._sim; if(!S||!S.fx) return;
  S.fxT=made?0.55:0.32; S.fxX=x; S.fxY=y;
  S.fx.setAttribute('stroke',made?'#fde68a':'rgba(255,255,255,0.6)');
}
function _fxStep(dt){
  const S=mState._sim; if(!S||!S.fx) return;
  if(S.fxT>0){
    S.fxT=Math.max(0,S.fxT-dt);
    const k=S.fxT/0.55;
    S.fx.setAttribute('cx',S.fxX.toFixed(1));
    S.fx.setAttribute('cy',S.fxY.toFixed(1));
    S.fx.setAttribute('r',(14+(1-k)*22).toFixed(1));
    S.fx.setAttribute('opacity',(k*0.9).toFixed(2));
  } else S.fx.setAttribute('opacity','0');
}

/* ── Koreografi zamanlayıcısı (rAF tabanlı; setTimeout yok) ──────────────── */
function clearBallTimers(){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(S){ S.script=[]; S.sIdx=0; S.sT=0; S.ball.onDone=null; S.chase=null; }
}
function _script(steps){
  const S=mState._sim; if(!S) return 0;
  S.script=steps.slice().sort((a,b)=>a.at-b.at);
  S.sIdx=0; S.sT=0;
  return Math.round((S.script.length?S.script[S.script.length-1].at:0)*1000);
}
/** Topsuz savunmacının adamından sarkma mesafesi (yardım pozisyonu): topa uzak adamın
    savunmacısı boyaya doğru sarkar, ama TÜM savunma tek noktada yığılmasın diye üst
    sınır dar tutulur (~1.7m). Adamı topa yakınsa yakın markaja (deny) geçer. */
function _defGap(distManBall){ return Math.min(56,26+distManBall*0.14); }
/** Bir jetonun hedefini kısa süre "kilitle" — savunma takibi/dizilim üzerine yazmasın. */
function _lockTok(p,sec){ const S=mState._sim; if(p&&S) p._lock=S.time+(sec||0.6); }
/** Serbest topun peşine düş: yetişince topu alır ve fn() çalışır (anlatım senkronu). */
function _chase(tok,fn,maxSec){ const S=mState._sim; if(!S||!tok) return; S.chase={tok,fn:fn||null,t:0,max:maxSec||3.2,r:26}; }

/* ── Dizilimler ───────────────────────────────────────────────────────────
   Tüm noktalar SOL potaya hücum eden takım içindir; index = ROL (0 PG…4 C).
   Sağa hücumda aynalanır, güçlü taraf için y ekseninde çevrilebilir. */
const SET_SPREAD=[[336,250],[248,114],[248,386],[ 92,436],[126,304]];  /* 4-out 1-in */
const SET_HORNS =[[348,250],[ 92, 66],[ 92,434],[212,190],[212,310]];  /* iki büyük dirseklerde */
const SET_POST  =[[330,206],[254,110],[204,390],[238,338],[112,296]];  /* pivot düşük postta */
const SET_MOTION=[[320,158],[290,346],[ 96, 66],[176,398],[132,214]];  /* hareketli dizilim */
const SET_ALL=[SET_SPREAD,SET_HORNS,SET_POST,SET_MOTION,SET_SPREAD,SET_POST];
/* GEÇİŞ: hücum ÜÇ KULVAR — top ortadan sürülür, kanatlar KENAR çizgilerine yakın koşar,
   büyükler arkadan gelir. Kulvarlar geniş tutulur (y 58/442) ki iki takım orta bantta tek
   yumak hâlinde koşmasın; savunma ise ortadan potaya döner. */
const TRANS_OFF=[[404,250],[300, 58],[300,442],[440,116],[452,384]];
/* GEÇİŞ: savunma önce POTAYA döner (adamı orta sahada kovalamaz), kendi arasında da yayılır */
const TRANS_DEF=[[188,250],[140,178],[140,322],[252,200],[252,300]];
/* 2-3 bölge savunması bölge merkezleri: 2 guard yay dirseklerinde (geniş), 3 uzun
   boya hattında — köşe/kanat gerçekten kapatılsın (dar bölge "boyada yumak" gibi duruyordu). */
const ZONE_23=[[252,166],[252,334],[148,120],[148,380],[124,250]];
/* Serbest atış dizilimi: kulvarlarda savunma dipte, hücum üstte (gerçek sıra) */
const FT_LINE_X=234;
const FT_DEF_S=[[ 96,182],[ 96,318],[168,180],[168,320],[292,250]];
const FT_OFF_S=[[131,181],[131,319],[306,140],[306,360]];

function _pt(c,offLeft,flip){
  let p=[c[0],flip?500-c[1]:c[1]];
  if(!offLeft) p=_mir(p);
  return p;
}

/** Hücum + savunma hedeflerini kur.
    opts: {shot, phase:'trans'|'set', keepNear:bool} */
function _setFormation(offLeft,offPlayers,defPlayers,shot,opts){
  const S=mState._sim;
  opts=opts||{};
  const phase=opts.phase||'set';
  const rim=_rim(offLeft);
  const tac=G.tactics||{};
  const offIsUser=S.offIsUser!==false;
  const offR=_rolesOrder(offPlayers), defR=_rolesOrder(defPlayers);

  if(phase==='trans'){
    /* Geçiş: hücum kulvarlarda öne koşar, savunma potaya döner. Markaj YOK.
       (Topu çizgi dışından sokan oyuncuya dizilim hedefi ATANMAZ.) */
    S.defTrack=false;
    offR.forEach((p,i)=>{
      if(!p||p._oob) return;
      const c=_pt(TRANS_OFF[i],offLeft,false);
      p.tx=_inX(_jit(c[0],10)); p.ty=_inY(_jit(c[1],8)); p.maxV=p.sprintV;
      /* kanatlar (rol 1-2) önce kendi hizasında KENARA açılır, sonra kulvarda öne koşar */
      p._wp=(i===1||i===2)?[_inX(p.x+(offLeft?-58:58)),_inY(c[1])]:null;
    });
    defR.forEach((p,i)=>{ if(!p||p._oob) return; const c=_pt(TRANS_DEF[i],offLeft,false); p.tx=_inX(_jit(c[0],8)); p.ty=_inY(_jit(c[1],8)); p.maxV=p.sprintV*0.96; p._wp=null; });
    S.shooter=null;
    return null;
  }

  /* ── SET: role göre dizilim (maç içinde çeşitlensin diye pozisyon başına şablon) ── */
  const base=(SET_ALL[S.setIx%SET_ALL.length]||SET_SPREAD).map(p=>p.slice());
  const flip=!!S.flip;
  /* Hücum odağı (kullanıcı hücumdaysa): dış şutta kanatlar yaydan açılır, içeri odakta uzunlar boyaya. */
  if(offIsUser){
    if(tac.odak==='dis'){ base[0][0]+=10; base[1][0]+=14; base[2][0]+=14; }
    else if(tac.odak==='ic'){ base[1][0]-=8; base[2][0]-=8; base[3][0]-=12; base[4][0]-=8; }
  }
  const B=base.map(c=>_pt(c,offLeft,flip));
  let shooter=null;
  if(shot){
    /* Şutör önce ANLATIMDAKİ oyuncu (shot.sid) — saha ile spiker aynı maçı anlatır. */
    let bi=-1;
    if(shot.sid!=null) bi=offR.findIndex(p=>p&&p.pl&&p.pl.id===shot.sid);
    if(bi<0){
      let bd=1e9;
      offR.forEach((p,i)=>{ if(!p) return; const d=Math.hypot(p.x-shot.x,p.y-shot.y); if(d<bd){bd=d;bi=i;} });
    }
    shooter=offR[bi];
    if(shooter) B[bi]=[shot.x,shot.y];
  }
  offR.forEach((p,i)=>{
    if(!p||p._oob) return;                    /* topu sokan çizgi dışında kalır */
    p._wp=null;                               /* set kurulunca geçiş ara noktası biter */
    const c=B[i];
    if(p===shooter){ p.tx=c[0]; p.ty=c[1]; p.maxV=p.sprintV; return; }
    /* Noktasına ZATEN yakınsa yeni hedef atanmaz (yerinde durur, mikro-salınım yapar). */
    const near=Math.hypot(p.x-c[0],p.y-c[1])<40;
    if(near&&opts.keepNear!==false){ p.tx=p.x; p.ty=p.y; p.maxV=p.baseV*0.55; }
    else { p.tx=_inX(_jit(c[0],9)); p.ty=_inY(_jit(c[1],9)); p.maxV=p.sprintV; }
  });

  /* ── Savunma ── kullanıcı savunuyorsa seçtiği stil, bot savunuyorsa maç kimliği. */
  const defIsUser=!offIsUser;
  const style=defIsUser?(tac.defensiveStyle||'adam'):(S.botDef||'adam');
  S.defRim=rim; S.defTrack=true;
  defR.forEach(p=>{ if(!p) return; p._mark=null; p._zone=null; p._gap=null; p._mkx=null; p._mky=null; p._zbx=null; p._zby=null; p._bbx=null; p._bby=null; p._press=false; });

  if(style==='bolge'){
    const zones=ZONE_23.map(c=>_pt(c,offLeft,flip));
    let closeIdx=-1;
    if(shooter){
      let bd=1e9;
      zones.forEach((z,i)=>{ const d=Math.hypot(z[0]-shooter.tx,z[1]-shooter.ty); if(d<bd){bd=d;closeIdx=i;} });
    }
    defR.forEach((p,i)=>{
      if(!p) return;
      const z=zones[i%zones.length];
      if(i===closeIdx&&shooter){
        p._mark=shooter; p._gap=26;
        p.tx=_inX(_jit(shooter.tx,5)); p.ty=_inY(_jit(shooter.ty,5));
        p.maxV=p.sprintV*0.92;
      } else {
        p._zone=z;
        p.tx=_inX(_jit(z[0],6)); p.ty=_inY(_jit(z[1],6));
        p.maxV=p.baseV;
      }
    });
    S.shooter=shooter;
    return shooter;
  }

  /* Adam adama / pres: savunmacı i, rol karşılığı hücumcuyu tutar (PG↔PG, C↔C).
     markStar: en iyi savunmacı rakip yıldızına (rol 0) yapışır. */
  const assign=[0,1,2,3,4];
  if(defIsUser&&tac.markStar){
    let bd=-1,bi=-1;
    defR.forEach((p,i)=>{ const sv=(p&&p.pl&&p.pl.savunma!=null)?p.pl.savunma:0; if(sv>bd){bd=sv;bi=i;} });
    if(bi>0){ const j=assign.indexOf(0); assign[j]=assign[bi]; assign[bi]=0; }
  }
  const press=(style==='pres');
  defR.forEach((p,i)=>{
    if(!p) return;
    const m=offR[assign[i]]||offR[0];
    if(!m) return;
    p._mark=m; p._press=press;
    const isBall=(S.ball.carrier===m)||(m===shooter);
    const hx=isBall?rim[0]:(rim[0]+S.ball.x)/2, hy=isBall?rim[1]:(rim[1]+S.ball.y)/2;
    const gap=isBall?(press?22:28):_defGap(Math.hypot(m.tx-S.ball.x,m.ty-S.ball.y));
    const dx=hx-m.tx, dy=hy-m.ty, d=Math.hypot(dx,dy)||1;
    p.tx=_inX(_jit(m.tx+dx/d*gap,press?4:6)); p.ty=_inY(_jit(m.ty+dy/d*gap,press?4:6));
    p.maxV=isBall?p.sprintV*0.92:(press?p.sprintV*0.9:p.baseV*1.4);
  });
  S.shooter=shooter;
  return shooter;
}

/** Serbest atış dizilimi (gerçek kural): şutör çizginin gerisinde; kulvar sırası
    dipten yukarı SAVUNMA→HÜCUM→SAVUNMA. Blok noktalarını uzunlar (C/PF) alır. */
function _setFtFormation(offLeft,offPlayers,defPlayers,shooter){
  const line=_pt([FT_LINE_X,250],offLeft,false);
  shooter.tx=line[0]; shooter.ty=line[1]; shooter.maxV=shooter.sprintV;
  const bigFirst=(arr)=>_rolesOrder(arr).slice().reverse();   /* C, PF, SF, SG, PG */
  const others=bigFirst(offPlayers.filter(p=>p!==shooter));
  others.forEach((p,i)=>{ const c=_pt(FT_OFF_S[i%FT_OFF_S.length],offLeft,false); p.tx=_inX(_jit(c[0],4)); p.ty=_inY(_jit(c[1],4)); p.maxV=p.baseV; });
  bigFirst(defPlayers).forEach((p,i)=>{ const c=_pt(FT_DEF_S[i%FT_DEF_S.length],offLeft,false); p.tx=_inX(_jit(c[0],4)); p.ty=_inY(_jit(c[1],4)); p.maxV=p.baseV; });
}

/** Bir olayın hücum sahibini çöz: true = kullanıcı takımı hücumda. */
function _eventOff(ev){
  if(!ev) return mState._lastOff!==false;
  if(ev.off!=null) return !!ev.off;
  if(ev.shot) return !!ev.shot.isHome;
  if(ev.shots&&ev.shots[0]) return !!ev.shots[0].isHome;
  return mState._lastOff!==false;
}
/** Sıradaki pozisyonun hücum sahibini olay listesinden okur. */
function _peekNextOff(){
  try{
    const evs=(typeof mState!=='undefined'&&mState&&mState.events)||[];
    const from=(mState.idx|0);
    for(let i=from;i<Math.min(evs.length,from+8);i++){
      if(evs[i]&&evs[i].off!==undefined) return !!evs[i].off;
    }
  }catch(e){}
  return Math.random()<0.5;
}
/** Bir sonraki olay nesnesi (ribaundun anlatılıp anlatılmayacağını bilmek için). */
function _peekNext(){
  try{
    const evs=(typeof mState!=='undefined'&&mState&&mState.events)||[];
    return evs[(mState.idx|0)]||null;
  }catch(e){ return null; }
}

/* ── Kenardan oyuna sokma ─────────────────────────────────────────────────
   Gerçek maç akışı: sayı/faul sonrası top KENDİ KENDİNE oyuna girmez — bir
   hücumcu topu alır, dip/yan çizginin DIŞINA çıkar (tek OOB izni onda), içeri
   pası O atar, sonra sahaya geri koşar. */
function _inboundSpot(kind,offLeft,x,y){
  if(kind==='base'){
    const bx=offLeft?(CRT_X1+CRT_OUT):(CRT_X0-CRT_OUT);   /* KENDİ savunma dip çizgisi (sayı yiyen taraf) */
    return {x:bx,y:Math.max(CRT_Y0+40,Math.min(CRT_Y1-40,y!=null?y:250+(Math.random()<0.5?-1:1)*rand(30,86)))};
  }
  const sy=(y!=null&&y<250)?(CRT_Y0-CRT_OUT):(CRT_Y1+CRT_OUT);
  return {x:Math.max(CRT_X0+40,Math.min(CRT_X1-40,x!=null?x:COURT_MID)),y:sy};
}
/** Pozisyon el değiştirdiği ANDA hücumu başlat: yeni hücum kulvarlara açılır, yeni
    savunma potaya döner. (Eskiden bu, bir sonraki olayın işlenmesine kadar beklerdi;
    ribaund/çalma sonrası 1-2 saniye herkes eski yarı sahada donup kalıyor, sonra
    topluca koşuya kalkıyordu — "yumak" görüntüsünün ana sebebi buydu.) */
function _startBreak(offIsUser){
  const S=mState._sim; if(!S) return;
  const offLeft=(offIsUser===(mState.userIsHome!==false));
  const offP=offIsUser?S.home:S.away;
  const defP=offIsUser?S.away:S.home;
  S.offSide=offLeft; S.offP=offP; S.defP=defP; S.offIsUser=offIsUser;
  S.setIx=rand(0,SET_ALL.length-1); S.flip=Math.random()<0.5;
  mState._lastOff=offIsUser;
  _setFormation(offLeft,offP,defP,null,{phase:'trans'});
}
/** Sayı sonrası: skoru yiyen takım topu KENDİ dip çizgisinin dışından sokar.
    Sokucu SAYI ANINDA belirlenir (topu potanın altından alıp çizgi dışına yürür),
    diğerleri geçişe açılır — böylece ölü zaman kalmaz. */
function _setupInbound(offIsUser,y){
  const S=mState._sim; if(!S) return null;
  _startBreak(offIsUser);
  const offLeft=S.offSide;
  const spot=_inboundSpot('base',offLeft,null,y);
  const inb=_inboundSetup(spot,S.offP,[]);
  _chase(inb,()=>{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; inb.maxV=inb.baseV*1.3; },2.2);
  S.inb={side:'base',x:spot.x,y:spot.y,tok:inb};
  return inb;
}
function _inboundSetup(spot,offP,exclude){
  let inb=null,bd=1e9;
  offP.forEach(p=>{
    if(exclude&&exclude.indexOf(p)>=0) return;
    const d=Math.hypot(p.x-spot.x,p.y-spot.y);
    if(d<bd){bd=d;inb=p;}
  });
  if(!inb){ inb=offP[offP.length-1]; bd=Math.hypot(inb.x-spot.x,inb.y-spot.y); }
  inb._retTx=inb.tx; inb._retTy=inb.ty;               /* formasyon hedefini sakla */
  inb._oob=true;                                       /* ÇİZGİ DIŞINA ÇIKMA İZNİ (yalnız o) */
  inb.maxV=inb.sprintV; inb.tx=spot.x; inb.ty=spot.y;
  inb._inbEta=Math.min(1.6,bd/Math.max(120,inb.sprintV||_PL_MAXV)+0.28);
  return inb;
}
/** Kalıntı çizgi-dışı izinlerini temizle (sokma yarıda kaldıysa oyuncu kalıcı OOB kalmasın).
    `except` = o an gerçekten topu sokmakla görevli oyuncu (izni korunur). */
function _clearOob(except){
  const S=mState._sim; if(!S) return;
  S.players.forEach(p=>{
    if(p===except||!p._oob) return;
    p._oob=false;
    if(p._retTx!=null){ p.tx=_inX(p._retTx); p.ty=_inY(p._retTy); }
    p._retTx=p._retTy=null;
  });
}
function _inboundPass(inb,to,dur){
  const S=mState._sim;
  /* Güvenlik: sokucu topa henüz yetişmediyse pas çizgi dışından atılmış gibi görünsün
     diye top ona verilir (birkaç px'lik düzeltme, görünmez). */
  if(S&&inb&&S.ball.carrier!==inb){ S.chase=null; S.ball.mode='held'; S.ball.carrier=inb; S.ball.noDrib=true; }
  _ballPass(to,dur||0.32);
  if(inb){                                            /* pası attı → sahaya geri dön */
    inb._oob=false;
    if(inb._retTx!=null){ inb.tx=_inX(inb._retTx); inb.ty=_inY(inb._retTy); }
    inb._retTx=inb._retTy=null;
    inb.maxV=inb.baseV*1.3;
  }
}

/* ── Anlatım senkronu ────────────────────────────────────────────────────
   movePlayersForEvent/animateShotPossession, spiker cümlesini (paint) sahnedeki
   DOĞRU kareye bağlar. Bağlayabildiyse mState._evH.paint=true olur; main.js o
   zaman cümleyi kendisi basmaz. Aynı şekilde serbest atış izleri (_evH.marks). */
function _evHandled(){ if(typeof mState!=='undefined'&&mState) mState._evH={paint:false,marks:false}; }
function _markPainted(){ if(typeof mState!=='undefined'&&mState&&mState._evH) mState._evH.paint=true; }
function _markMarks(){ if(typeof mState!=='undefined'&&mState&&mState._evH) mState._evH.marks=true; }
/** Serbest atış izini canlı haritaya işle (zamanı gelince, tek tek). */
function _liveMark(sh){
  try{
    if(!sh) return;
    mState.allShots.push(sh);
    if(shotPassesFilter(sh)) drawShotMark(sh);
  }catch(e){}
}

/** Olay geldiğinde oyuncuları yeniden konumla + şutsuz olayların top koreografisi.
    Dönüş: koreografinin süresi (sim-ms) — oynatım hızı (matchStep) buna uyum sağlar. */
function movePlayersForEvent(ev,paint){
  _evHandled();
  const P=typeof paint==='function'?paint:null;
  try{
    const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!S) return 0;
    const type=ev&&ev.type;
    _clearOob((S.inb&&S.inb.tok)||null);   /* kalıntı çizgi-dışı izni kalmasın */

    /* ── HAVA ATIŞI (yalnız maç başı — gerçek FIBA kuralı) ── */
    if(type==='start'){
      clearBallTimers();
      S.defTrack=false;
      if(P){ P(); _markPainted(); }
      const hc=S.home.find(p=>p.role===4)||S.home[S.home.length-1];
      const ac=S.away.find(p=>p.role===4)||S.away[S.away.length-1];
      hc.tx=451; hc.ty=250; hc.maxV=hc.baseV;
      ac.tx=489; ac.ty=250; ac.maxV=ac.baseV;
      /* sıçramayan 8 oyuncu kendi yarı sahasında, orta bandın (x380-560) dışında */
      const userLeft=(mState.userIsHome!==false);   /* kullanıcı sola hücum ediyor → savunması sağda */
      const nearSpots=[[360,176],[360,324],[300,250],[212,250]];
      const farSpots=nearSpots.map(_mir);
      const hSpots=userLeft?farSpots:nearSpots;
      const aSpots=userLeft?nearSpots:farSpots;
      S.home.filter(p=>p!==hc).forEach((p,i)=>{ const s=hSpots[i%4]; p.tx=_jit(s[0],6); p.ty=_jit(s[1],6); p.maxV=p.baseV; });
      S.away.filter(p=>p!==ac).forEach((p,i)=>{ const s=aSpots[i%4]; p.tx=_jit(s[0],6); p.ty=_jit(s[1],6); p.maxV=p.baseV; });
      const b=S.ball; b.mode='idle'; b.carrier=null; b.x=COURT_MID; b.y=250; b.h=0; b.vx=0; b.vy=0; b.vh=0;
      const winOff=_peekNextOff();
      const winP=winOff?S.home:S.away;
      const winC=winOff?hc:ac;
      const recv=winP.find(p=>p!==winC&&p.role===0)||winP.find(p=>p!==winC)||winP[0];
      mState._lastOff=winOff;
      S.inb=null;
      return _script([
        {at:0.95,fn:()=>{ _ballLoose(0,0,210); hc.pop=1; ac.pop=1; if(typeof sfx==='function') sfx('whistle'); }},
        {at:1.42,fn:()=>{ _ballPass(recv,0.5); }}
      ])+900;
    }

    /* Çeyrek/maç sonu (ve MVP anonsu): oyuncular kendi yarı sahalarında toplanır. */
    if(type==='quarter_end'||type==='end'||type==='mvp'){
      if(P){ P(); _markPainted(); }
      const userLeft=(mState.userIsHome!==false);
      const nearSpots=[[428,250],[400,150],[400,350],[352,196],[352,308]];
      const farSpots=nearSpots.map(_mir);
      const hs=userLeft?farSpots:nearSpots, as=userLeft?nearSpots:farSpots;
      S.home.forEach((p,i)=>{ p.tx=hs[i][0]; p.ty=hs[i][1]; p.maxV=p.baseV; p._oob=false; });
      S.away.forEach((p,i)=>{ p.tx=as[i][0]; p.ty=as[i][1]; p.maxV=p.baseV; p._oob=false; });
      clearBallTimers();
      S.defTrack=false;
      const b=S.ball; b.mode='loose'; b.carrier=null; b.x=COURT_MID; b.y=250; b.vx=0; b.vy=0; b.h=20; b.vh=40;
      S.inb=null;
      return 0;
    }

    /* ── ÇEYREK BAŞI ── FIBA: hava atışı YOK — top orta çizgi hizasından KENARDAN sokulur. */
    if(type==='quarter_start'){
      if(P){ P(); _markPainted(); }
      if(ev.q===1) return 0;   /* hava atışının sonucu bozulmasın */
      clearBallTimers();
      const off=_peekNextOff();
      mState._lastOff=off;
      const offLeft=(off===(mState.userIsHome!==false));
      const offP=off?S.home:S.away;
      const defP=off?S.away:S.home;
      S.offSide=offLeft; S.offP=offP; S.defP=defP; S.offIsUser=off;
      S.prevType=S.curType; S.curType=type;
      S.setIx=rand(0,SET_ALL.length-1); S.flip=Math.random()<0.5;
      _setFormation(offLeft,offP,defP,null,{phase:'set'});
      const spot=_inboundSpot('side',offLeft,COURT_MID+(offLeft?24:-24),Math.random()<0.5?100:400);
      const recv=_rolesOrder(offP)[0];
      const inb=_inboundSetup(spot,offP,[recv]);
      _ballHold(inb,true);
      const t0=Math.max(0.8,inb._inbEta||0);
      S.inb=null;
      return _script([{at:t0,fn:()=>_inboundPass(inb,recv,0.34)}])+600;
    }

    const off=_eventOff(ev);
    mState._lastOff=off;
    /* Yön: kullanıcı takımı evse sola, deplasmansa sağa hücum eder. */
    const offLeft=(off===(mState.userIsHome!==false));
    const offP=off?S.home:S.away;
    const defP=off?S.away:S.home;
    const posChanged=(S.offP!==offP);
    S.offSide=offLeft;
    S.offP=offP; S.defP=defP;
    S.offIsUser=off;                      /* taktikler yalnız kullanıcı tarafına uygulanır */
    S.prevType=S.curType; S.curType=type;
    if(posChanged){ S.setIx=rand(0,SET_ALL.length-1); S.flip=Math.random()<0.5; }

    if(ev&&ev.shot) return 0;             /* top: animateShotPossession (diziliş de orada) */

    /* ── SERBEST ATIŞ ── düdük → çizgiye diziliş → top sürme → atışlar. */
    if(ev&&ev.shots&&ev.shots.length&&ev.shots[0].kind==='ft'){
      const line=_pt([FT_LINE_X,250],offLeft,false);
      let shooter=null;
      if(ev.sid!=null) shooter=offP.find(p=>p.pl&&p.pl.id===ev.sid)||null;
      if(!shooter){
        let sd=1e9; shooter=offP[0];
        offP.forEach(p=>{ const d=Math.hypot(p.x-line[0],p.y-line[1]); if(d<sd){sd=d;shooter=p;} });
      }
      offP.concat(defP).forEach(p=>{ p._oob=false; });
      _setFtFormation(offLeft,offP,defP,shooter);
      S.shooter=shooter;
      S.defTrack=false;   /* ölü top — savunma markaj değil, çizgi dizilişinde */
      const rim=_rim(offLeft);
      clearBallTimers();
      const eta=Math.hypot(shooter.x-line[0],shooter.y-line[1])/Math.max(120,shooter.sprintV||_PL_MAXV)+0.40;
      const tBase=Math.max(0.85,Math.min(2.2,eta));
      const shots=ev.shots.slice(0,3);   /* 3 atışlık fauller de tam canlandırılır */
      const steps=[];
      /* düdük anında spiker faul cümlesini söyler (sonuç DEĞİL) */
      if(P){
        steps.push({at:0.10,fn:()=>{ P('pre'); }});
        _markPainted();
      }
      steps.push({at:tBase-0.20,fn:()=>{ _ballHold(shooter); }});
      let last=tBase;
      shots.forEach((sh,i)=>{
        const t0=tBase+0.55+i*1.05;      /* gerçek serbest atış ritmi (~1 sn arayla) */
        last=t0;
        steps.push({at:t0,fn:()=>{
          shooter.pop=0.8;
          _ballShoot(rim,0.50,sh.made,()=>{
            _liveMark(sh);
            _rimFlash(rim[0],rim[1],sh.made);
            if(typeof sfx==='function'&&sh.made) sfx('score');
            if(i===shots.length-1&&P){ P('res'); }
            if(!sh.made&&i===shots.length-1){
              const a=Math.random()*6.283;
              _ballLoose(Math.cos(a)*110,Math.sin(a)*100,105);
              /* kaçan son atış → canlı ribaund: en yakın uzun topu toplar */
              const pool=Math.random()<0.72?defP:offP;
              const reb=_rolesOrder(pool)[4]||pool[0];
              _chase(reb,null,2.6);
            }
          });
        }});
        if(i<shots.length-1) steps.push({at:t0+0.80,fn:()=>{ const b=S.ball; b.mode='held'; b.carrier=shooter; b.noDrib=false; }});
      });
      _markMarks();
      /* son atış isabetliyse: rakip dip çizgiden sokacak */
      const lastMade=shots[shots.length-1]&&shots[shots.length-1].made;
      S.inb=lastMade?{side:'base'}:null;
      return _script(steps)+Math.round((last-tBase+1.0)*300)+650;
    }

    /* ── RİBAUND (anlatılan) ── önceki şutun devamı: top hâlâ serbestse
       anlatımdaki oyuncu topa KOŞAR ve alır; cümle tam o karede basılır. */
    if(type==='reb'){
      let reb=null;
      if(ev.rebId!=null){
        const pool=(ev.rebIsUser!=null)?(ev.rebIsUser?S.home:S.away):S.players;
        reb=pool.find(p=>p.pl&&p.pl.id===ev.rebId)||null;
      }
      if(!reb) reb=_rolesOrder((ev.rebIsUser===false)?defP:offP)[4]||offP[0];
      clearBallTimers();
      const rebIsUser=(ev.rebIsUser!=null)?!!ev.rebIsUser:(S.home.indexOf(reb)>=0);
      const b=S.ball;
      if(b.mode==='loose'){
        const d=Math.hypot(reb.x-b.x,reb.y-b.y);
        const eta=Math.min(1.5,d/Math.max(140,reb.sprintV)+0.25);
        /* Topu alan an: spiker cümlesi + yeni hücumun başlangıcı aynı karede. */
        _chase(reb,()=>{ if(P){ P(); } _startBreak(rebIsUser); },1.9);
        if(P) _markPainted();
        return Math.round(eta*1000)+420;
      }
      if(P){ P(); _markPainted(); }
      return _script([{at:0.15,fn:()=>{ _ballHold(reb); reb.pop=0.9; _startBreak(rebIsUser); }}])+380;
    }

    /* ── TOP ÇALMA ── top savunmacıya doğru fırlar, o da üstüne koşup alır.
       (Olayın `off` damgası topu KAYBEDEN takımdır; çalan taraf defP.) */
    if(type==='steal'){
      clearBallTimers();
      let thief=null;
      if(ev.stealId!=null){
        const pool=(ev.stealIsUser!=null)?(ev.stealIsUser?S.home:S.away):defP;
        thief=pool.find(p=>p.pl&&p.pl.id===ev.stealId)||null;
      }
      if(!thief) thief=defP[rand(0,4)];
      const thiefIsUser=(ev.stealIsUser!=null)?!!ev.stealIsUser:(S.home.indexOf(thief)>=0);
      const b=S.ball;
      const dx=thief.x-b.x, dy=thief.y-b.y, dd=Math.hypot(dx,dy)||1;
      _ballLoose(dx/dd*150+rand(-40,40),dy/dd*150+rand(-40,40),60);
      /* Top kapıldığı an: cümle + karşı yöne hücum aynı karede başlar. */
      _chase(thief,()=>{ if(P){ P(); } _startBreak(thiefIsUser); },2.2);
      if(P) _markPainted();
      S.inb=null;
      return 1250;
    }

    /* ── FAUL (şutsuz) ── düdük, oyun durur, top yan çizgiden sokulur. */
    if(type==='foul'){
      clearBallTimers();
      if(P){ P(); _markPainted(); }
      S.defTrack=false;   /* ölü top — düdükte savunma koşuşturmayı bırakır */
      const bl=S.ball;
      const spot=_inboundSpot('side',offLeft,bl.x,bl.y);
      const recv=_rolesOrder(offP)[0];
      _setFormation(offLeft,offP,defP,null,{phase:'set'});
      S.players.forEach(p=>{ p.maxV=p.baseV*0.55; });  /* ölü topta herkes yürür */
      const inb=_inboundSetup(spot,offP,[recv]);       /* dizilimden SONRA: dönüş hedefi doğru */
      _ballHold(inb,true);
      S.inb=null;
      return _script([{at:Math.max(0.75,inb._inbEta||0),fn:()=>_inboundPass(inb,recv,0.30)}])+520;
    }

    /* ── Diğer (taktik/mola) ── oyun aynı topla sürer: set kurulur, top çevrede döner. */
    if(P){ P(); _markPainted(); }
    clearBallTimers();
    const b=S.ball;
    const needBall=(!b.carrier||offP.indexOf(b.carrier)<0);
    const offR=_rolesOrder(offP);
    const pg=offR[0];
    if(needBall&&S.inb){
      /* bekleyen kenardan sokma (sayı sonrası) — topu alıp ÇİZGİ DIŞINA çıkar */
      const spot=_inboundSpot(S.inb.side||'base',offLeft,S.inb.x,S.inb.y);
      let inb=(S.inb.tok&&offP.indexOf(S.inb.tok)>=0)?S.inb.tok:null;
      S.inb=null;
      _setFormation(offLeft,offP,defP,null,{phase:'set'});
      if(inb){ inb._oob=true; if(!S.chase){ inb.tx=spot.x; inb.ty=spot.y; inb.maxV=inb.baseV*1.25; } }
      else {
        inb=_inboundSetup(spot,offP,[pg]);        /* dizilimden SONRA */
        _chase(inb,()=>{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; inb.maxV=inb.baseV*1.25; },1.8);
      }
      const t0=Math.max(0.9,inb._inbEta||0.6);
      return _script([
        {at:t0+0.55,fn:()=>_inboundPass(inb,pg,0.32)},
        {at:t0+1.35,fn:()=>{ _setFormation(offLeft,offP,defP,null,{phase:'set'}); }}
      ])+500;
    }
    if(needBall) _ballHold(pg);
    _setFormation(offLeft,offP,defP,null,{phase:'set'});
    const a1=offR[rand(1,4)]||pg, a2=offR[rand(1,4)]||pg;
    return _script([
      {at:0.35,fn:()=>_ballPass(a1,0.36)},
      {at:0.95,fn:()=>_ballPass(a2!==a1?a2:pg,0.36)}
    ])+520;
  }catch(e){}
  if(P&&mState._evH&&!mState._evH.paint){ try{ P(); _markPainted(); }catch(e){} }
  return 0;
}

/** Şutlu hücum — üç faz: (topu oyuna sok) → GEÇİŞ → SET → şut → sonuç.
    onShoot: top şutörün elinden çıktığı an (şut izi). onResult: top çembere vardığı an
    (skor + spiker cümlesi + ses) — anlatım sahadaki sonucu ASLA önceden söylemez. */
function animateShotPossession(sh,onShoot,onResult){
  try{
    const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!S) return 0;
    clearBallTimers();
    const offLeft=S.offSide!=null?S.offSide:(sh.isHome===(mState.userIsHome!==false));
    const offP=S.offP||(sh.isHome?S.home:S.away);
    const defP=S.defP||(sh.isHome?S.away:S.home);
    const rim=_rim(offLeft);
    const b=S.ball;
    const offR=_rolesOrder(offP);
    /* Yeni pozisyon: kalıntı çizgi-dışı izinleri sıfırlanır — AMA bu pozisyonda topu
       sokacak oyuncunun (sayı anında görevlendirildi) izni korunur. */
    _clearOob((S.inb&&S.inb.tok)||null);

    /* Şutör = anlatımdaki oyuncu; yoksa şut noktasına en yakın hücumcu. */
    let shooter=null;
    if(sh.sid!=null) shooter=offP.find(p=>p.pl&&p.pl.id===sh.sid)||null;
    if(!shooter){ let bd=1e9; offP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;shooter=p;} }); }
    if(!shooter) shooter=offR[0];

    /* Topu getiren: hâlihazırda hücum takımından biri tutuyorsa o, değilse oyun kurucu. */
    let pg=(b.carrier&&offP.indexOf(b.carrier)>=0)?b.carrier:offR[0];
    if(pg===shooter) pg=offR.find(p=>p!==shooter)||offR[0];
    const relay=offP.filter(p=>p!==shooter&&p!==pg);
    const tac=G.tactics||{};
    const userAtt=!!sh.isHome;
    /* Ara pas hedefi: taktik odağı → anlatımdaki asistçi (sh.pid) önceliklidir. */
    let mid=relay.length?relay[rand(0,relay.length-1)]:pg;
    if(userAtt&&tac.focusPlayerId){
      const f=relay.find(p=>p.pl&&p.pl.id===tac.focusPlayerId);
      if(f) mid=f;
    }
    if(sh.pid!=null){
      const pt=relay.find(p=>p.pl&&p.pl.id===sh.pid);
      if(pt) mid=pt;
      else if(pg.pl&&pg.pl.id===sh.pid) mid=pg;
    }

    const putback=!!sh.pb&&b.carrier&&offP.indexOf(b.carrier)>=0;
    const needInbound=!putback&&!!S.inb;
    const fromLive=!needInbound&&!putback;              /* çalma/ribaund sonrası canlı top */
    const afterTurnover=(S.prevType==='steal'||S.prevType==='reb');
    const fastBreak=!putback&&!needInbound&&(!!sh.fb||(userAtt&&afterTurnover&&(tac.tempo==='hizli'||tac.odak==='hizli')));
    const iso=userAtt&&tac.focusPlayerId&&shooter.pl&&shooter.pl.id===tac.focusPlayerId;
    const scheme=sh.scheme||null;
    const mv=sh.move||null;
    const isPnr=(scheme==='pnr'||scheme==='handoff')&&!fastBreak&&!putback&&!iso;

    /* ── şut anı ── */
    const fire=()=>{
      try{ if(typeof onShoot==='function') onShoot(); }catch(e){}
      b.x=sh.x; b.y=sh.y;
      shooter.pop=1;                       /* şutör yükselir (sıçrama) */
      _lockTok(shooter,0.8);
      if(sh.blk){
        /* Blok: top çembere ULAŞMAZ — kısa yükselip çelinir, serbest kalır. */
        const bx=sh.x+(rim[0]-sh.x)*0.22+rand(-16,16), by=sh.y+(rim[1]-sh.y)*0.22+rand(-16,16);
        /* bloğu yapan en yakın savunmacı sıçrar */
        let bl=null,bd=1e9;
        defP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;bl=p;} });
        if(bl) bl.pop=1;
        _ballShoot([bx,by],0.20,false,()=>{
          try{ if(typeof onResult==='function') onResult(); }catch(e){}
          const a2=Math.random()*6.283;
          _ballLoose(Math.cos(a2)*150,Math.sin(a2)*140,95);
          _rebScramble(offP,defP,rim,offLeft);
        });
        return;
      }
      const rimD=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
      _ballShoot(rim,rimD<90?0:0.58,sh.made,()=>{
        try{ if(typeof onResult==='function') onResult(); }catch(e){}
        _rimFlash(rim[0],rim[1],sh.made);
        if(sh.made){
          /* Sayı: top fileden geçer, potanın altına düşer. Rakip HEMEN topu almaya gider,
             çizgi dışına çıkar; sayı atan takım savunmaya döner (ölü bekleme yok). */
          _setupInbound(!sh.isHome,250+(Math.random()<0.5?-1:1)*rand(24,74));
        } else {
          /* Kaçan şut: çemberden karambol — top potadan uzağa, GERÇEKÇİ mesafede seker
             (~2-3m), sonra ribaund mücadelesi başlar. */
          const away=Math.atan2(sh.y-rim[1],sh.x-rim[0])+(Math.random()*2-1)*1.1;
          const sp=rand(120,205);
          _ballLoose(Math.cos(away)*sp,Math.sin(away)*sp,105);
          S.inb=null;
          _rebScramble(offP,defP,rim,offLeft);
        }
      });
    };

    /* Ribaund mücadelesi: iki taraftan da uzunlar cama yüklenir; topu ALAN,
       sıradaki olay (reb / bir sonraki hücum) ile TUTARLI seçilir. */
    function _rebScramble(offA,defA,rimXY,left){
      const nx=_peekNext();
      let winTeam=null;
      if(nx&&nx.type==='reb'&&nx.rebIsUser!=null) winTeam=nx.rebIsUser?S.home:S.away;
      else if(nx&&nx.off!==undefined) winTeam=nx.off?S.home:S.away;
      if(!winTeam) winTeam=Math.random()<0.72?defA:offA;
      const loseTeam=(winTeam===S.home)?S.away:S.home;
      const pick=(team)=>{
        const R=_rolesOrder(team);
        const cand=[R[4],R[3],R[2]].filter(Boolean);
        let best=cand[0],bd=1e9;
        cand.forEach(p=>{ const d=Math.hypot(p.x-rimXY[0],p.y-rimXY[1]); if(d<bd){bd=d;best=p;} });
        return best||team[0];
      };
      const w=pick(winTeam), l=pick(loseTeam);
      const bb=S.ball;
      const winIsUser=(winTeam===S.home);
      /* Rakip ribaundcu topun ÜSTÜNE değil, box-out mesafesinde (≈1.5m) yüklenir —
         iki jeton iç içe geçmesin. */
      if(l&&l!==w){ const an=Math.random()*6.283, rr=rand(48,66); l.maxV=l.sprintV; l.tx=_inX(bb.x+Math.cos(an)*rr); l.ty=_inY(bb.y+Math.sin(an)*rr); _lockTok(l,1.4); }
      if(w){
        w.pop=0.7;
        /* Anlatımda ribaund cümlesi VARSA topu 'reb' olayı aldırır (senkron);
           yoksa mücadeleyi burada bitir ki top yerde kalmasın. Top alınır alınmaz
           yeni hücum BAŞLAR (gerçek basketbol: ribaund = geçişin başlangıcı). */
        if(!(nx&&nx.type==='reb')) _chase(w,()=>{ _startBreak(winIsUser); },2.4);
        else { w.maxV=w.sprintV; w.tx=bb.x; w.ty=bb.y; _lockTok(w,1.2); }
      }
    }

    /* Contest → kapama (closeout): en yakın savunmacı şutöre çıkıp önünü keser. */
    const closeout=()=>{
      try{
        if(!sh.contest||sh.contest==='open'||!defP||!defP.length) return;
        let dmin=1e9,dfn=null;
        for(const p of defP){ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<dmin){dmin=d;dfn=p;} }
        if(dfn){
          const dx=rim[0]-sh.x,dy=rim[1]-sh.y,dd=Math.hypot(dx,dy)||1;
          const g=sh.contest==='heavy'?30:40;
          dfn.tx=_inX(sh.x+dx/dd*g); dfn.ty=_inY(sh.y+dy/dd*g); dfn.maxV=dfn.sprintV;
          _lockTok(dfn,0.9);
          if(sh.contest==='heavy') dfn.pop=0.6;
        }
      }catch(e){}
    };
    /* Köprü adımı: şuttan hemen önce top şut noktasından hâlâ uzaksa kısa sıçrayışla taşınır. */
    const bridge=()=>{
      const d=Math.hypot(b.x-sh.x,b.y-sh.y);
      if(d>36) _ballPass({x:sh.x,y:sh.y,vx:0,vy:0,side:1,ghost:true},Math.max(0.12,Math.min(0.22,d/700)));
    };

    const etaTok=(p,x,y)=>p?Math.hypot(p.x-x,p.y-y)/Math.max(90,p.maxV||p.baseV||160)+0.18:0.3;
    const steps=[];
    let tOff=0;    /* hücumun (geçişin) fiilî başlangıcı */

    /* ── FAZ A: topu oyuna sokma (sayı sonrası) ── */
    let inb=null;
    if(needInbound){
      /* Sokucu genelde SAYI ANINDA seçilmiştir (_setupInbound) ve topu almış/alıyordur;
         yoksa burada seçilir. Yalnız kalan iş: çizgiye varınca içeri pas. */
      const spot=_inboundSpot(S.inb.side||'base',offLeft,S.inb.x,S.inb.y);
      inb=(S.inb.tok&&offP.indexOf(S.inb.tok)>=0)?S.inb.tok:null;
      S.inb=null;
      if(!inb){
        _setFormation(offLeft,offP,defP,null,{phase:'trans'});
        inb=_inboundSetup(spot,offP,[pg,shooter]);
        _chase(inb,()=>{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; inb.maxV=inb.baseV*1.3; },1.8);
      } else {
        inb._oob=true;                       /* çizgi dışı izni sürüyor */
        if(!S.chase){ inb.tx=spot.x; inb.ty=spot.y; }
      }
      if(pg===inb) pg=offR.find(p=>p!==inb&&p!==shooter)||offR.find(p=>p!==inb)||pg;
      const heldByInb=(b.carrier===inb);
      const dGrab=heldByInb?0:Math.hypot(inb.x-b.x,inb.y-b.y);
      const dSpot=Math.hypot((heldByInb?inb.x:b.x)-spot.x,(heldByInb?inb.y:b.y)-spot.y);
      const tWalk=Math.max(0.45,Math.min(2.2,(dGrab+dSpot)/Math.max(150,inb.sprintV)+0.45));
      steps.push({at:tWalk,fn:()=>{ _inboundPass(inb,pg,0.32); }});
      tOff=tWalk+0.35;
    } else if(putback){
      tOff=0;
    } else {
      /* canlı top: taşıyıcı hücum takımında değilse oyun kurucuya çıkış pası */
      const d0=Math.hypot(b.x-pg.x,b.y-pg.y);
      if(!b.carrier||offP.indexOf(b.carrier)<0){
        if(d0>55) steps.push({at:0.05,fn:()=>_ballPass(pg,Math.min(0.46,0.16+d0/900))});
        else steps.push({at:0.05,fn:()=>_ballHold(pg)});
        tOff=0.30;
      } else tOff=0.05;
    }

    /* ── FAZ B: GEÇİŞ + FAZ C: SET ── */
    if(putback){
      /* İkinci şans: top ribauntçuda, pota dibinden hemen tekrar. */
      _setFormation(offLeft,offP,defP,sh,{phase:'set',keepNear:false});
      steps.push({at:0.40,fn:bridge});
      steps.push({at:0.62,fn:fire});
      const ret=1500;
      _script(steps);
      return ret;
    }

    /* geçiş: hücum kulvarlarda öne, savunma potaya (yumak yok) */
    steps.push({at:tOff,fn:()=>{ _setFormation(offLeft,offP,defP,null,{phase:'trans'}); }});
    /* topu getiren gerçekten sürerek gelir */
    const bringT=fastBreak?0.85:Math.max(1.05,Math.min(2.2,etaTok(pg,_pt(TRANS_OFF[0],offLeft,false)[0],250)));
    const tSet=tOff+bringT;
    steps.push({at:tSet,fn:()=>{ _setFormation(offLeft,offP,defP,sh,{phase:'set',keepNear:false}); }});

    let tFire;
    if(fastBreak){
      /* Hızlı hücum: herkes sprintle öne, tek outlet pas, erken bitiriş. */
      const passerTok=(sh.pid!=null)?offP.find(p=>p!==shooter&&p.pl&&p.pl.id===sh.pid):null;
      tFire=tSet+(passerTok?1.15:0.95);
      steps.push({at:tOff+0.05,fn:()=>{ offP.forEach(p=>{ p.maxV=p.sprintV; }); }});
      if(passerTok){
        steps.push({at:tOff+0.35,fn:()=>_ballPass(passerTok,0.42)});
        steps.push({at:tFire-0.55,fn:()=>{ _ballPass(shooter,0.40); if(typeof sfx==='function') sfx('pass'); }});
      } else {
        steps.push({at:tSet-0.25,fn:()=>_ballPass(shooter,0.45)});
      }
    } else if(iso){
      /* İzolasyon: diğerleri kenara çekilir, yıldız topu alır ve kendisi çözer. */
      steps.push({at:tSet+0.05,fn:()=>{ offP.forEach(p=>{ if(p!==shooter&&p!==pg) p.ty=_inY(p.ty+(p.ty<250?-24:24)); }); }});
      const tPass=tSet+0.55;
      tFire=tPass+2.3;
      steps.push({at:tPass,fn:()=>_ballPass(shooter,0.32)});
    } else {
      /* SET OYUNU: perde (pnr), tek kesme, kilit pas. */
      const cutter=relay.find(p=>p!==mid&&p.pl&&(p.pl.poz==='C'||p.pl.poz==='PF'))||relay.find(p=>p!==mid)||null;
      const screener=isPnr?(relay.find(p=>p!==mid&&p!==cutter)||relay.find(p=>p!==mid)||null):null;
      const doMid=(mid!==pg)&&(sh.pid!=null);
      const tSwing=tSet+0.75;
      const tKey=tSwing+(doMid?0.85:0.35);
      tFire=tKey+0.75;
      if(screener){
        steps.push({at:tSet+0.25,fn:()=>{ screener.tx=_inX(pg.x+(offLeft?22:-22)); screener.ty=_inY(pg.y-16); screener.maxV=screener.baseV; _lockTok(screener,1.0); }});
        steps.push({at:tKey-0.10,fn:()=>{ screener.tx=_inX(rim[0]+(offLeft?1:-1)*rand(30,64)); screener.ty=_inY(250+rand(-30,30)); screener.maxV=screener.sprintV; _lockTok(screener,1.1); }});
      }
      if(cutter){
        steps.push({at:tSet+0.45,fn:()=>{
          /* Kesici BOŞ köşeye açılır — dolu köşeye giderse iki jeton üst üste biner
             (spacing bozulur). İki köşeden takım arkadaşlarına uzak olan seçilir. */
          const cx=offLeft?rand(76,106):rand(834,864);
          const free=(cy)=>Math.min.apply(null,offP.filter(p=>p!==cutter).map(p=>Math.hypot(p.tx-cx,p.ty-cy)));
          const cyA=rand(52,92), cyB=rand(408,448);
          const cy=free(cyA)>free(cyB)?cyA:cyB;
          cutter.tx=cx; cutter.ty=_inY(cy);
          cutter.maxV=cutter.sprintV; _lockTok(cutter,1.2);
        }});
      }
      if(doMid) steps.push({at:tSwing,fn:()=>_ballPass(mid,0.34)});
      steps.push({at:tKey,fn:()=>{ _ballPass(shooter,0.34,scheme==='postup'); if(sh.pid!=null&&typeof sfx==='function') sfx('pass'); }});
    }

    /* şutör hamlesi (crossover/step-back/spin/drive) — metinle birebir aynı hamle */
    if(shooter&&mv){
      if(mv==='stepback'){
        steps.push({at:Math.max(0.1,tFire-0.55),fn:()=>{ const dx=rim[0]-sh.x,dy=rim[1]-sh.y,dd=Math.hypot(dx,dy)||1; shooter.tx=_inX(sh.x+dx/dd*32); shooter.ty=_inY(sh.y+dy/dd*32); shooter.maxV=shooter.sprintV; _lockTok(shooter,0.5); }});
        steps.push({at:Math.max(0.12,tFire-0.16),fn:()=>{ shooter.tx=sh.x; shooter.ty=sh.y; _lockTok(shooter,0.4); }});
      } else if(mv==='spin'){
        steps.push({at:Math.max(0.1,tFire-0.42),fn:()=>{ shooter.tx=_inX(sh.x+(offLeft?-15:15)); shooter.ty=_inY(sh.y+13); _lockTok(shooter,0.4); }});
        steps.push({at:Math.max(0.12,tFire-0.14),fn:()=>{ shooter.tx=sh.x; shooter.ty=sh.y; _lockTok(shooter,0.3); }});
      } else if(mv==='drive'){
        steps.push({at:Math.max(0.1,tFire-0.5),fn:()=>{ shooter.maxV=shooter.sprintV; }});
      } else if(mv==='crossover'||mv==='hesitation'){
        steps.push({at:Math.max(0.1,tFire-0.44),fn:()=>{ shooter.tx=_inX(sh.x+(offLeft?18:-18)); shooter.ty=_inY(sh.y+(sh.y<250?12:-12)); shooter.maxV=shooter.sprintV; _lockTok(shooter,0.4); }});
        steps.push({at:Math.max(0.12,tFire-0.15),fn:()=>{ shooter.tx=sh.x; shooter.ty=sh.y; _lockTok(shooter,0.3); }});
      }
    }
    if(sh.contest&&sh.contest!=='open') steps.push({at:Math.max(0.05,tFire-0.24),fn:closeout});
    steps.push({at:tFire-0.22,fn:bridge});
    steps.push({at:tFire,fn:fire});

    _script(steps);
    return Math.round((tFire+0.85)*1000);
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
/* İŞ 4: havuzlar ~2 katına çıkarıldı (özellikle score2/miss2/score3/miss3) ve hamle/şema
   kelimeleri (step-back, çalım, spin, pick-and-roll, transition, "dibe indi") core'lardan
   TEMİZLENDİ — bu diller yalnız play.move/scheme dolduğunda MOVE_BY/ASSIST_PHRASES'ten gelir,
   böylece söz sahada gerçekten olanla çelişmez. Bölge filtreleri (_NEAR/_MID) için her
   score2/miss2 havuzunda yakın + orta + nötr kalıplar dengeli tutuldu. */
const SPIKER_LINES={
  cosku:{
    score2:['%S POTAYA ASILDI, İKİ SAYI! %SC','%S BOYALI ALANI YIKTI! %SC','%S turnikeyi PATLATTI! %SC','%S pota altında CANAVAR gibi, iki! %SC','%S ORTA MESAFEDEN VURDU, muhteşem! %SC','%S orta mesafeden soğukkanlı, iki! %SC','%S orta mesafe şutunu tutturdu! %SC','%S DURDURULAMIYOR, iki sayı! %SC','%S sayıyı yazdırdı, tribün ayakta! %SC','%S buz gibi bitirdi! %SC','%S coştu, iki daha geldi! %SC'],
    score3:['%S DERİNDEN BOMBAYI PATLATTI — ÜÇLÜK! %SC','%S ÜÇLÜĞÜ GÖMDÜ, tribün ayakta! %SC','%S köşeden NİŞANCI gibi, üç! %SC','%S UZAKTAN VURDU, inanılmaz! %SC','%S yaydan ATEŞ etti — SWISH! %SC','%S logodan denedi ve GİRDİ! %SC','%S kanattan bombayı bıraktı! %SC','%S tereddütsüz çekti, üç geldi! %SC','%S file sallandı, muhteşem üçlük! %SC','%S yay dışından acımadı! %SC','%S üçlükte ateş hattında! %SC'],
    miss2:['%S turnikede tökezledi!','%S POTA İZİN VERMEDİ, kaçtı!','%S yakındaydı ama SEKTİ!','%S orta mesafeden kaçırdı!','%S orta mesafe şutu kısa kaldı!','%S uzaktan denedi, olmadı!','%S çember reddetti!','%S bu sefer olmadı, yazık!','%S demire takıldı!','%S ıskaladı, seyirci sustu!'],
    miss3:['%S üçlüğü KAÇTI, çemberden döndü!','%S uzaktan ıskaladı, olmadı!','%S bombayı boşa harcadı!','%S yay dışından vuramadı!','%S köşe üçlüğü havada kaldı!','%S demir dedi, girmedi!','%S üçlük kısa düştü!','%S file yerine demiri buldu!','%S dış atış tutmadı!'],
    block:['%B MUAZZAM BLOK! %S geri döndü!','%B ŞAPKAYI TAKTI, inanılmaz savunma!','%B topu SİLİP ATTI!','%B duvar gibi, %S durduruldu!','%B kapağı kapadı, %S şaşkın!','%B uzun topu geri çevirdi!','%B savunmada devleşti!'],
    steal:['%C TOPU KAPTI, koşuyoo!','%C pas arasını OKUDU, çaldı!','%C elini uzattı ve ALDI!','%C müthiş bir top çalma!','%C çizgiyi okudu, top bizde!','%C hücumu ters çevirdi!','%C aktif eller, çaldı gitti!'],
    tactic:['Ritim değişiyor — tempo yükseliyoo!','Savunma kilitlendi, enerji tavanda!','Baskı artıyor, tribün ayakta!','Hücumda yeni varyasyon geliyoo!','Koç kenardan bağırıyor, tempo!']
  },
  bilge:{
    score2:['%S doğru okumayla pota altında bitirdi. %SC','%S boyalı alanda yüksek yüzdeli bitiriş. %SC','%S turnikeyi sakin tamamladı. %SC','%S pota altı pozisyonunu iyi kullandı. %SC','%S orta mesafe şutu, mekanik kusursuz. %SC','%S orta mesafeden yüksek yüzde. %SC','%S uzaktan dengeli bir jumper, iki. %SC','%S savunmanın açığını görüp bitirdi. %SC','%S sabırlı hücum, temiz iki. %SC','%S pozisyonu iyi okudu, iki. %SC','%S soğukkanlı bir bitiriş. %SC'],
    score3:['%S ayakları hazır, ritimli üçlük. %SC','%S spacing mükemmeldi, açık üç. %SC','%S kusursuz mekanikle üç. %SC','%S savunmayı yaydı ve cezalandırdı. %SC','%S yüksek yüzdeli konumdan üç. %SC','%S dengeli çıkış, temiz üçlük. %SC','%S köşe üçlüğünü değerlendirdi. %SC','%S kanattan isabetli üç. %SC','%S sabırlı organizasyon, açık üçlük. %SC','%S doğru karar, yay dışından üç. %SC','%S ritmini buldu, üç sayı. %SC'],
    miss2:['%S zorlama şut seçti, isabetsiz.','%S dengesi bozuktu, kaçtı.','%S savunma baskısında yüzde düştü.','%S bitiriş açısı kapalıydı.','%S acele etti, olmadı.','%S orta mesafeden kısa kaldı.','%S turnikede denge kaybı, kaçtı.','%S seçim hatalıydı, isabet yok.','%S ritim bozuldu, ıskaladı.','%S kontrolsüz şut, girmedi.'],
    miss3:['%S ayakları hazır değildi, kısa.','%S kontestli üçlük, düşük yüzde.','%S ritim tutmadı, ıskaladı.','%S seçim tartışılır, kaçtı.','%S dengesiz çıkış, isabet yok.','%S zorlama üçlük, girmedi.','%S yay dışından yüzde düşük, kaçtı.','%S erken şut, demire geldi.','%S kapalı pozisyondan zorladı, olmadı.'],
    block:['%B iyi zamanlama, temiz blok — %S durdu.','%B rotasyonu erken geldi, blokladı.','%B dikey savunma, kurallı blok.','%B okuma harika, %S engellendi.','%B yardım geldi ve blokladı.','%B pozisyonu tuttu, temiz blok.','%B disiplinli savunma, %S durduruldu.'],
    steal:['%C pas hattını kesti, kontrol onda.','%C okuması üst düzey, çaldı.','%C ellerini aktif kullandı, top kaybı.','%C savunma disiplini, topu aldı.','%C pasör hatasını cezalandırdı.','%C boşluğu okudu, top bizde.','%C erken rotasyonla topu kaptı.'],
    tactic:['Set oyunu düzenleniyor, sabırlı hücum.','Savunma rotasyonu yeniden ayarlanıyor.','Tempo kontrolü — doğru karar.','Spacing yeniden kuruluyor, akıllı oyun.','Hücum organizasyonu netleşiyor.']
  },
  cem:{
    score2:['%S potaya "merhaba" dedi, iki sayı! %SC','%S turnikede savunmayı seyirci bıraktı! %SC','%S pota ile anlaştı, iki! %SC','%S boyalı alanı ziyaret etti, iki! %SC','%S orta mesafeden "bu benden" dedi! %SC','%S orta mesafe şutunu fileye ısmarladı! %SC','%S uzaktan göz kırptı, iki! %SC','%S öyle bitirdi ki savunma özür diledi. %SC','%S savunma dönmeden yazdırdı! %SC','%S savunmaya "pardon" demedi! %SC','%S file ile tokalaştı, iki! %SC'],
    score3:['%S yayın gerisinden fileyi dalgalandırdı — üç! %SC','%S neredeyse tribünden attı — üçlük! %SC','%S yayı gördü, "neden olmasın" dedi! %SC','%S bombayı bıraktı, file "şşşt" dedi! %SC','%S üçlükte usta, file yandı! %SC','%S köşeden selam gönderdi — üç! %SC','%S logodan "niye olmasın" dedi, girdi! %SC','%S yay dışından fileye davetiye! %SC','%S üçlüğü postaladı, adrese teslim! %SC','%S kanattan bombayı gömdü! %SC','%S file ağladı, üçlük! %SC'],
    miss2:['%S kaçırdı, pota bugün nazlı!','%S ıskaladı, olur böyle şeyler!','%S turnike geri geldi, "hayır" dedi!','%S bu sefer file küstü!','%S top çemberi turladı ve çıktı!','%S orta mesafeden selam gitti, karşılıksız!','%S pota kapıyı yüzüne kapadı!','%S demir "olmaz" dedi!','%S şut çemberde tur attı, çıktı!','%S bugün file uykuda!'],
    miss3:['%S üçlük denedi, fileye bile uğramadı — hava topu!','%S ıskaladı, yay bugün sağır!','%S bombayı ateşledi, demir geri yolladı!','%S çember bugün kimseyi içeri almıyor!','%S köşe üçlüğü tribünü selamladı!','%S yay dışından mektup kayıp!','%S demir "yanlış numara" dedi!','%S üçlük havada asılı kaldı!','%S file bugün kapıyı açmıyor!'],
    block:['%B "buraya giremezsin" dedi — blok!','%B topu geldiği yere geri yolladı!','%B şapkayı taktı, %S şok!','%B boyalı alanın kapısını kapadı!','%B "iade" damgası bastı — blok!','%B topa "dur" dedi, %S kaldı!','%B kapıcılık yaptı, blok!'],
    steal:['%C pası havada okudu — top artık onun!','%C elini araya soktu, hücum ters döndü!','%C pası dinledi, çaldı gitti!','%C eli değdi, top el değiştirdi!','%C pas hattına daldı, top bizde!','%C hücumu cebe attı — çalma!','%C topu kibarca ödünç aldı, geri vermez!'],
    tactic:['Koç tahtaya bir şeyler karalıyor!','Taktik değişti, yedek kulübesi ayaklandı!','Yeni varyasyon — umarım işe yarar!','Hücumda plan B devreye giriyor!','Koç zaman istedi, beyaz tahta doldu!']
  },
  reha:{
    score2:['%S pota altında tamamladı. %SC','%S turnikeyi tamamladı. %SC','%S boyalı alandan iki sayı. %SC','%S pota dibinden bitirdi. %SC','%S orta mesafeden isabet kaydetti. %SC','%S orta mesafe şutunu geçti. %SC','%S uzaktan iki sayı buldu. %SC','%S iki sayıyı buldu. %SC','%S basket, iki sayı hanesine. %SC','%S sağduyulu bir bitiriş. %SC','%S skora iki ekledi. %SC'],
    score3:['%S üç sayılık isabet kaydetti. %SC','%S dış atıştan başarılı. %SC','%S üçlük çizgisinden buldu. %SC','%S uzak mesafeden isabet. %SC','%S üç sayı, skora katkı. %SC','%S yay dışından tamamladı. %SC','%S köşeden üç sayı. %SC','%S kanattan isabetli üçlük. %SC','%S dış atışta net isabet. %SC','%S üç sayılık şutu geçti. %SC','%S yay ötesinden skora üç. %SC'],
    miss2:['%S isabet bulamadı.','%S şutu kısa kaldı.','%S turnikede başarısız.','%S sayı üretemedi.','%S bu denemede isabetsiz.','%S orta mesafeden kaçırdı.','%S pota altında tamamlayamadı.','%S şutu çemberden döndü.','%S iki sayı denemesi boşa.','%S isabetsiz bir deneme.'],
    miss3:['%S üçlükte isabet yok.','%S dış atış tuttu değil.','%S uzaktan kaçırdı.','%S üç sayı denemesi boşa.','%S köşe üçlüğü isabetsiz.','%S yay dışından kaçırdı.','%S üçlük çemberden döndü.','%S dış atışta başarısız.','%S üç sayı bulamadı.'],
    block:['%B bloke etti; %S durduruldu.','%B temiz bir blok gerçekleştirdi.','%B savunmada blok kaydetti.','%B şutu engelledi.','%B bloğu tamamladı, %S durdu.','%B savunmada müdahale etti.','%B şutu geri çevirdi.'],
    steal:['%C topu ele geçirdi.','%C top çalma kaydetti.','%C pası kesti.','%C savunmada topu aldı.','%C pas hattına müdahale etti.','%C topu kazandı.','%C hücumu kesti, top onda.'],
    tactic:['Taktik düzenleme yapılıyor.','Oyun temposu ayarlanıyor.','Savunma organizasyonu gözden geçiriliyor.','Set oyun kuruluyor.','Hücum düzeni yeniden kuruluyor.']
  }
};
/* İŞ 4: her spikerin şut havuzlarına ORTAK NÖTR (bölge-bağımsız, _NEAR/_MID içermez) ek
   kalıplar — yapısal çeşitliliği artırıp tek maçtaki tekrarı düşürür (patternReuse↓). */
(function(){
  const extra={
    score2:['%S skora iki yazdırdı. %SC','%S sakin bir bitirişle iki. %SC','%S iki sayıyı ekledi. %SC','%S net bir bitiriş, iki sayı. %SC','%S skoru büyüttü, iki. %SC'],
    miss2:['%S bu kez isabet yok.','%S şansını değerlendiremedi.','%S bitiremedi, top dışarı.','%S iki sayıyı bulamadı.','%S denemesi boşa gitti.'],
    score3:['%S üç sayıyı buldu. %SC','%S dıştan isabetli, üç. %SC','%S skora üç ekledi. %SC','%S dış şutu geçti, üç. %SC'],
    miss3:['%S dıştan isabet yok.','%S üç sayıyı bulamadı.','%S dış şut girmedi.','%S dıştan şansı yaver gitmedi.']
  };
  try{ for(const k in SPIKER_LINES){ for(const t in extra){ if(SPIKER_LINES[k][t]) SPIKER_LINES[k][t]=SPIKER_LINES[k][t].concat(extra[t]); } } }catch(e){}
})();
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
  '%R topu adeta tavandan indirdi, ekstra hücum!',
  '%R kaçan topu boyada avladı — ikinci şans!',
  '%R pota altında hükmetti, hücum ribaundu!',
  '%R sıçradı ve topu ikinci kez kazandı!',
  '%R rakibi arkasında bıraktı, top yine bizde!'
];
const REB_DEF_LINES=[
  '%R savunma ribaundunu güçlü aldı, cam tertemiz!',
  'Sağlam box-out; %R ribaundu topladı.',
  '%R yükseldi ve defansif camı kapattı.',
  '%R ribaundu çekti, hızlı geçişe çıkıyor!',
  '%R camı süpürdü, top güvende.',
  '%R pozisyonu tuttu ve ribaundu aldı.',
  '%R rakibi bloklayıp topu topladı.',
  '%R defansif ribaundu kaptı, hücuma dönüyor.'
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

/* ══ Faz 1-3 (23. oturum): tek "play" tanımlayıcısı + bağlam + anti-tekrar anlatım ══
   Amaç: spikerin söylediği sahada birebir yaşansın, cümleler tekrara düşmesin, bağlam
   (seri/fark/sıcaklık/kritik an) anlatıma yansısın. SUNUM KATMANIDIR — maç sonucu
   matematiği DEĞİŞMEZ: tüm anlatım/senaryo rastgeleliği ayrı, deterministik bir üreteçten
   (`pr`, generateMatchEvents içinde) beslenir; sonuç randomu global Math.random'da kalır. */
function _mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Şut bölgesi GERÇEK şut noktasından (çember uzaklığı+açı) türetilir → metin, iz ve
   animasyon aynı yeri gösterir. 3'lük: köşe/kanat/tepe; 2'lik: pota dibi/boya/orta mesafe. */
function classifyZone(xy,rimIsLeft,is3){
  const rim=rimIsLeft?RIM_L:RIM_R;
  const dx=Math.abs(xy.x-rim[0]), dy=Math.abs(xy.y-rim[1]);
  const d=Math.hypot(dx,dy);
  if(is3){ const ang=Math.atan2(dy,Math.max(1,dx))*180/Math.PI; return ang>=52?'corner3':ang>=26?'wing3':'top3'; }
  if(d<=44) return 'rim';
  if(d<=112) return 'paint';
  return 'midrange';
}

/* Hamle (self-create) ibareleri — hamle türüne göre; sahada gerçekten olan eyleme uygun
   olanı seçilir. Şut cümlesi oyuncu adıyla başladığından bunlar AD İÇERMEZ, tireyle bağlanır. */
const MOVE_BY={
  crossover:['Art arda çalım (crossover) savunmayı çözdü —','Çaprazdan sert bir çalım attı, savunma dağıldı —','Çift krosover sonrası rakibini adeta pazara yolladı —'],
  stepback:['Geriye çekilerek (step-back) alanı açtı —','Bir adım geri çekildi, savunmayla arasına mesafe koydu —'],
  spin:['Dönerek (spin move) savunmadan sıyrıldı —'],
  hesitation:['Beklet-yükle ile savunmayı ters ayak yakaladı —','Hesitasyon (bekletme) çalımıyla geçti —'],
  drive:['Yıldırım gibi ilk adımla dibe indi —','Sert bir hücumla boyalı alana daldı —'],
  postup:['Sırtı dönük pivot oyunuyla pozisyon aldı —','Düşük postta savunmacısını sırtlayıp döndü —']
};

/* Anti-tekrar seçici: bir havuzdan SON ~8 kalıbı (havuz küçükse daha az) tekrar seçmez.
   memo[key] = son seçilenlerin kuyruğu; kapasite havuz boyutunun altında tutulur ki hep taze
   bir seçenek kalsın. Böylece tek maçta aynı kalıbın üst üste dönmesi belirgin azalır. */
function pickLine(pool,pr,memo,key){
  if(!pool||!pool.length) return '';
  if(pool.length<2) return pool[0];
  const recent=(memo&&memo[key])||[];
  let pick=pool[Math.floor(pr()*pool.length)];
  for(let tries=0;tries<7&&recent.indexOf(pick)>=0;tries++){ pick=pool[Math.floor(pr()*pool.length)]; }
  if(memo){
    recent.push(pick);
    const cap=Math.min(8,pool.length-1);
    while(recent.length>cap) recent.shift();
    memo[key]=recent;
  }
  return pick;
}
/* İŞ 4: asist ibareleri şemayla uyumlu ve ÇEŞİTLİ (eski monoton "X buldu; Y…" bitti). */
const ASSIST_PHRASES={
  spotup:['%A dış çevrede boşta bıraktı; ','%A servisini yaptı, ','%A kenara aktardı, ','%A pas trafiğini çözüp gördü; '],
  pnr:['%A pick&roll sonrası servis etti; ','%A ikili oyunla ortağını kullandı, ','%A perde arkasından buldu; ','%A blok sonrası dağıttı, '],
  cut:['%A kes-geç pasıyla buldu; ','%A boşalan adamı gördü; ','%A savunma arasından geçirdi, ','%A zamanlı pasla ulaştırdı; '],
  postup:['%A posttan dışarı çıkardı; ','%A çift savunmayı bölüp gördü; '],
  transition:['%A hızlı çıkışta koşan adama attı, ','%A geçiş hücumunda gördü; '],
  def:['%A buldu; ','%A drive edip dağıttı, ','%A servisinde ','%A boşta bıraktı; ']
};
function assistPhrase(name,scheme,pr,memo){
  const pool=(ASSIST_PHRASES[scheme]||[]).concat(ASSIST_PHRASES.def);
  return pickLine(pool,pr,memo,'ast'+(scheme||'')).replace('%A',name);
}

/* spikerLine'ın deterministik-üreteç + anti-tekrar sürümü (sonuç randomunu kirletmez). */
function spikerLinePR(spId,kind,v,pr,memo){
  const set=SPIKER_LINES[spId]||SPIKER_LINES.reha;
  let pool=set[kind]||SPIKER_LINES.reha[kind]||[''];
  v=v||{};
  if(v.cls&&(kind==='score2'||kind==='miss2')){
    const f=pool.filter(t=>v.cls==='yakin'?!_MID_WORDS.test(t):!_NEAR_WORDS.test(t));
    if(f.length) pool=f;
  }
  const line=pickLine(pool,pr,memo,spId+kind);
  return line.replace(/%SC/g,v.sc||'').replace(/%S/g,v.s||'').replace(/%B/g,v.b||'').replace(/%C/g,v.c||'');
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
  /* ── FAZ B: PLAYBOOK — seçilen hücum seti odak/tempo katmanının ÜSTÜNE biner. ──
     Set etkileri (is3/acc/ast/to/fbMul/roleW) motorun mevcut düğmelerine eklenir; 'dengeli'
     (Serbest Akış) seçiliyken tüm ekler 0 olduğu için eski davranış birebir korunur.
     pbFit: setin sahadaki 5'e uyumu — uymayan sette isabet düşer (şutörsüz köşe üçlüğü tutmaz). */
  const pb=(typeof playbookOf==='function')?playbookOf(tac.playbook):{is3:0,acc2:0,acc3:0,ast:0,to:0,fbMul:1,roleW:{}};
  const dset=(typeof defSetOf==='function')?defSetOf(tac.defSet||tac.defensiveStyle):{opp2:1,opp3:1,stealKeep:1,pressTO:0,foul:1};
  const pbFit=(typeof playbookFit==='function')?playbookFit(pb,[pg,sg,sf,pf,c].filter(Boolean)):1;
  const pbAccAdd=(pbFit-1)*0.09;   /* uyum ±%10 → isabete ±0.009 (küçük ama hissedilir) */
  const userIs3Oran=Math.max(0.05,Math.min(0.66,(odak==='dis'?0.42:odak==='ic'?0.18:odak==='hizli'?0.26:odak==='set'?0.30:0.30)+(pb.is3||0)));
  const acc2=(odak==='ic'?0.03:odak==='set'?0.02:odak==='hizli'?-0.02:0)+tempoAcc+(pb.acc2||0)+pbAccAdd;
  const acc3=(odak==='dis'?-0.01:odak==='set'?0.01:odak==='hizli'?-0.02:0)+tempoAcc+(pb.acc3||0)+pbAccAdd;
  const offAstBonus=(odak==='set'?0.10:odak==='hizli'?-0.05:0)+(pb.ast||0);  /* set oyun asist ↑, hızlı hücum ↓ (+ playbook) */
  /* Top kaybı — VARSAYILANI (dengeli/adam) tam korumak için: azaltma çarpanla (set/bölge, keep<1),
     artırma additive pre-blokla (hızlı hücum/pres). Nötr seçimlerde keep=1 → eski davranış birebir. */
  const offStealKeep=odak==='set'?0.70:1.0;   /* set oyun: kullanıcı top kaybı azalır */
  const offRushTO=Math.max(0,(odak==='hizli'?0.05:0)+(pb.to||0));  /* hızlı hücum + playbook risk */
  /* Savunma stili → RAKİP isabeti + top kaybı (kullanıcı savunurken, userPos=false).
     adam: nötr; bölge: 2'lik ↓ / 3'lük ↑ / çalma ↓; pres: çalma ↑ / isabet hafif ↑ (risk-ödül). */
  const defOppAcc2Mul=(dset.opp2!=null?dset.opp2:(defStyle==='bolge'?0.94:defStyle==='pres'?1.03:1.0));
  const defOppAcc3Mul=(dset.opp3!=null?dset.opp3:(defStyle==='bolge'?1.05:defStyle==='pres'?1.02:1.0));
  const defStealKeep=(dset.stealKeep!=null?dset.stealKeep:(defStyle==='bolge'?0.78:1.0));
  const defPressTO=(dset.pressTO!=null?dset.pressTO:(defStyle==='pres'?0.06:0));
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
  /* ── FAZ A: rol/eğilim tabanlı ağırlıklı seçim ──────────────────────────────────────
     Eskiden şutör/asist/ribaund/blok/faul sahadaki 5 kişiden DÜZ rastgele seçiliyordu; bu yüzden
     pivot da oyun kurucu kadar top kullanıyordu. Artık her seçim oyuncunun eğilim+statına göre
     ağırlıklı. Takım TOPLAMLARI (üçlük payı, ribaund oranı, faul sayısı) değişmez — yalnız
     dağılım gerçekçileşir. */
  const wPick=(list,wf)=>{
    const arr=(list||[]).filter(Boolean);
    if(!arr.length) return null;
    if(arr.length===1) return arr[0];
    const w=arr.map(p=>{ const v=Number(wf(p)); return Number.isFinite(v)&&v>0?v:0.01; });
    let tot=0; for(let i=0;i<w.length;i++) tot+=w[i];
    if(!(tot>0)) return ch(arr);
    let r=Math.random()*tot;
    for(let i=0;i<arr.length;i++){ r-=w[i]; if(r<=0) return arr[i]; }
    return arr[arr.length-1];
  };
  const _eg=(p,k)=>{ try{ return egOf(p,k); }catch(e){ return 50; } };
  /* Top kullanım payı (usage): skorer/şutör rolleri ve hücum statı yükü çeker. */
  const usageW=(p)=>{
    if(!p) return 1;
    const rol=p.rol||'cokYonlu';
    /* Gerçek basketbolda kullanım payı (usage) ~%15-32 bandındadır: yıldız ile pivot arası fark
       yaklaşık 2 kat, 10 kat değil. Çarpanlar bilinçli olarak dar tutuldu. */
    const rolMul=rol==='skorer'?1.34:rol==='sutor'?1.20:rol==='slasher'?1.14:rol==='oyunKurucu'?1.02:
                 rol==='kilit'?0.86:rol==='karartici'?0.86:rol==='ribaundcu'?0.88:1.0;
    const sk=(statN(p,'hucum')*0.6+statN(p,'sutIsabeti')*0.4);
    return Math.max(0.20,rolMul*(0.62+sk/150));
  };
  /* FAZ B: seçilen hücum seti bazı ROLLERİ besler (Pick&Roll → kurucu+pivot, Dip Köşe → şutör).
     Yalnız KULLANICI takımına uygulanır; rakip kendi setini FAZ C'de seçecek. */
  const _pbRoleW=(pb&&pb.roleW)||{};
  const usageWU=(p)=>usageW(p)*(_pbRoleW[(p&&p.rol)||'']||1);
  const astW=(p)=>Math.max(0.12,(_eg(p,'pas')/100)*1.5+statN(p,'pas')/140+(p&&p.rol==='oyunKurucu'?0.55:0));
  const rebW=(p)=>Math.max(0.12,statN(p,'ribaund')/70+((Number(p&&p.boy)||200)-198)/40+(p&&p.rol==='ribaundcu'?0.8:0));
  const blkW=(p)=>Math.max(0.08,statN(p,'blok')/60+(p&&p.rol==='karartici'?1.1:0));
  const stlW=(p)=>Math.max(0.10,statN(p,'topCalma')/65+(p&&p.rol==='kilit'?0.9:0));
  /* Faul disiplini düşük olan oyuncu faulleri toplar (gerçek hayatta pivotlar). */
  const foulW=(p)=>Math.max(0.15,(100-_eg(p,'disiplin'))/45);
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
    if(clutch){
      /* FAZ A: SOĞUKKANLILIK — düşük eğilimli oyuncunun son dakikada eli titrer (×0.86'ya kadar),
         yüksek olan ısınır (×1.12). Zekâ katkısı korunur ama artık tek belirleyici değil. */
      const _cl=_eg(shooter,'clutch');
      clutchMul=Math.max(0.86,Math.min(1.12,1+(statN(shooter,'zeka')-70)/100*0.06+(_cl-50)/100*0.18));
    }
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
    return userCourt.length?(wPick(userCourt,usageWU)||ch(userCourt)):(pg||sg||sf||pf||c);
  };
  const uAny=()=>userCourt.length?ch(userCourt):(pg||sg||sf||pf||c);
  const benchNext=()=>{ while(benchQueue.length){ const nx=benchQueue.shift(); if(nx&&(nx.matchFouls||0)<foulLimit) return nx; } return null; };
  /* A1: Rakip sahada kalıcı 5 + yedek. En iyi 5 başlar; sakatlar dışlanır (yoksa tam kadroya düş). */
  const oppHealthy=oppFull.filter(p=>!(p&&p.injReturnDay!=null&&(G.gameDay||1)<p.injReturnDay));
  const oppPool=(oppHealthy.length>=5?oppHealthy:oppFull).slice().sort((a,b)=>(Number(b.genel)||0)-(Number(a.genel)||0));
  oppPool.forEach(p=>{ if(p) p.matchFouls=0; });
  let oppCourt=oppPool.slice(0,5);
  const oppBench=oppPool.slice(5);
  /* ── FAZ C: rakip koç ── Bot artık kendi setini seçer, mola alır, rotasyon yapar. */
  const botC=(typeof botCoachProfile==='function')?botCoachProfile(oppName):{pb:'dengeli',def:'adam',toRun:8,switchGap:10,depth:8,restEvery:20,panicPb:'transition'};
  let botPb=(typeof playbookOf==='function')?playbookOf(botC.pb):{is3:0,acc2:0,acc3:0,ast:0,to:0,roleW:{}};
  const botState={run:0,to:5,posCount:0,switched:false,dampen:0,restCd:0};
  const _botRoleW=()=>((botPb&&botPb.roleW)||{});
  const oFallback={isim:oppName+' oyuncusu'};
  const usageWO=(p)=>usageW(p)*(_botRoleW()[(p&&p.rol)||'']||1);
  const oShooter=()=>oppCourt.length?(wPick(oppCourt,usageWO)||ch(oppCourt)):(oppPool[0]||oFallback);
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
    /* Rakip bot havuzu G.players'ta yok — id yerine oyuncu nesnesi taşınır (saha jetonu değişimi için). */
    events.push({type:'foul',text:`⚠️ ${rname} — ${p.isim} 5. faulüne ulaştı ve oyundan atıldı${sub?` — yerine ${sub.isim} girdi.`:' — rakibin yedeği kalmadı, eksik oynuyor.'} (${homeScore} - ${awayScore})`,q,t:t||0,home:homeScore,away:awayScore,subOutObj:p,subInObj:sub||null,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
  }
  /* Savunma faulü kaydı — defenderIsUser=!userPos. Faul yapan takımın somut oyuncusuna yüklenir. */
  function recordFoul(defenderIsUser,q,t){
    if(defenderIsUser){
      qFoulU[q]=(qFoulU[q]||0)+1;
      const cand=userCourt.filter(p=>p&&(p.matchFouls||0)<foulLimit);
      const p=cand.length?(wPick(cand,foulW)||ch(cand)):userCourt[0];   /* FAZ A: faul disiplini */
      if(p){ p.matchFouls=(p.matchFouls||0)+1; if(p.matchFouls>=foulLimit) userFoulsOut(p,q,t); }
    } else {
      qFoulO[q]=(qFoulO[q]||0)+1;
      const cand=oppCourt.filter(p=>p&&(p.matchFouls||0)<foulLimit);
      const p=cand.length?(wPick(cand,foulW)||ch(cand)):oppCourt[0];   /* FAZ A: faul disiplini */
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

  /* Faz 1-3: sunum (anlatım/senaryo) rastgeleliği için AYRI deterministik üreteç.
     Böylece bağlam/hamle/anti-tekrar seçimleri global Math.random akışını (maç sonucu)
     kirletmez. Seed maça özgü ama deterministik → resume tutarlı üretir. */
  const _seedBase=(Math.abs((G.wins||0)*131+(G.losses||0)*17)+(oppName?oppName.length*7:0)+(userIsHome?3:1))>>>0;
  const pr=_mulberry32(_seedBase||0x9E3779B9);
  const prCh=a=>a[Math.floor(pr()*a.length)];
  const prChance=x=>pr()<x;
  /* Bağlam durumu: seri (cevapsız sayı), oyuncu sıcaklığı (art arda isabet), öneki throttle. */
  const narr={runOff:null,run:0,heat:{},recent:{},ctxCd:0};

  /* Serbest atış metni AÇIKÇA "serbest atış" der — saha şutuyla karışmasın. */
  /* Serbest atış metni İKİYE ayrılır: `ftPre` düdük anında, `ftRes` (sonuç) son atış
     çemberden geçtiğinde basılır — spiker artık atış yapılmadan sonucunu söylemez.
     `text` eski birleşik hâliyle birebir aynı kalır (kayıt/özet uyumu). */
  const ftSplit=(pre,res)=>({text:pre+' '+res,ftPre:pre,ftRes:res});
  const ftLine=(nMade,nAtt,who)=> nMade===nAtt?`${who} serbest atışlarda ${nMade}/${nAtt} — hepsi içeride.`
    : nMade===0?`${who} serbest atışlarda ${nMade}/${nAtt}; seyirci sustu.`
    : `${who} serbest atışlarda ${nMade}/${nAtt}.`;

  /* ── Tek pozisyon simülasyonu (gerçekçi FIBA temposu) ──
     Pozisyonların çoğu saha içi şutla biter; ribaund/asist/blok/faul kutuya ve anlatıma gömülür.
     userPos=true → kullanıcı takımı (kutu hB, skor homeScore); değilse rakip (aB, awayScore). */
  /* Canlı görselleştirme, hangi takımın hücumda olduğunu bilmek zorunda (yön + jetonlar).
     runPossession'ın ürettiği her olaya `off` (true = kullanıcı takımı hücumda) damgalanır. */
  let _lastOff=true;
  /* ── Pozisyon akışı (gerçek basketbol): sayıdan sonra top RAKİBE geçer; kaçan şutta
     ribaundu alan takım hücuma devam eder; top çalmada çalan takım hücuma çıkar; şutsuz
     faul ve mola pozisyonu değiştirmez. posNext=null → rastgele (maç başı hava atışı).
     Eski %53/%47 ev sahibi pozisyon payı kaldırıldı — ev avantajı isabet çarpanına taşındı. */
  let posNext=null;
  let shooterHint=null;   /* hücum ribaundu sonrası aynı oyuncunun tekrar vuruşu (putback) */
  let fastNext=null;      /* 'steal' | 'reb' — sonraki hücum hızlı hücuma dönüşebilir */
  /* ── FAZ C: rakip koçun pozisyon-sonu kararları ──
     userGain: bu pozisyonda kullanıcının aldığı sayı · oppGain: rakibin aldığı sayı.
     Kararlar olay akışına gerçek olaylar olarak yazılır; kullanıcı canlı anlatımda görür. */
  function botCoachTick(q,t,userGain,oppGain){
    botState.posCount++;
    if(botState.dampen>0) botState.dampen--;
    if(oppGain>0) botState.run=0; else botState.run+=userGain;
    /* (a) MOLA — kullanıcı seri yaptıysa rakip koç oyunu keser. */
    if(botState.run>=botC.toRun && botState.to>0 && q>=1 && t>20){
      botState.to--; botState.run=0; botState.dampen=3;
      events.push({type:'tactic',off:false,
        text:`⏸ ${rname} MOLA aldı — ${G.team.isim} serisini kesmek istiyor. (Rakip mola hakkı: ${botState.to}) (${homeScore} - ${awayScore})`,
        q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* (b) SET DEĞİŞİMİ — belirgin geriye düştüyse (2. çeyrek sonrası) agresif sete geçer. */
    if(!botState.switched && q>=3 && (homeScore-awayScore)>=botC.switchGap){
      botState.switched=true;
      botPb=(typeof playbookOf==='function')?playbookOf(botC.panicPb):botPb;
      events.push({type:'tactic',off:false,
        text:`🔁 ${rname} taktik değiştirdi — ${botPb.ikon||'📋'} ${botPb.ad||'yeni set'} setine geçiyor, farkı kapatmak istiyor. (${homeScore} - ${awayScore})`,
        q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* (c) ROTASYON — yorulan ya da faul yüklenen oyuncusunu dinlendirir (kullanıcıyla simetrik). */
    if(botState.restCd>0){ botState.restCd--; return; }
    if(botState.posCount>=8 && oppBench.length && oppCourt.length>=5){
      const tired=oppCourt.filter(p=>p&&((p.matchFouls||0)>=3||(botState.posCount%botC.restEvery===0)));
      if(tired.length){
        const out=tired.sort((a,b)=>((b.matchFouls||0)-(a.matchFouls||0))||((a.genel||0)-(b.genel||0)))[0];
        const inP=oBenchNext();
        if(out&&inP){
          const ix=oppCourt.indexOf(out);
          if(ix>=0) oppCourt[ix]=inP;
          oppBench.push(out);              /* dinlenen oyuncu yedeğe döner (rotasyon derinliği) */
          botState.restCd=6;
          const why=(out.matchFouls||0)>=3?`${out.matchFouls} faulle`:'dinlenmek için';
          events.push({type:'sub',off:false,
            text:`🔄 ${rname} değişiklik: ${out.isim} ${why} kenara, yerine ${inP.isim} girdi. (${homeScore} - ${awayScore})`,
            q,t,home:homeScore,away:awayScore,subOutObj:out,subInObj:inP,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      }
    }
  }
  function runPossessionV(q,t){
    const s=events.length;
    runPossession(q,t);
    for(let i=s;i<events.length;i++) if(events[i].off===undefined) events[i].off=_lastOff;
  }
  function runPossession(q,t){
    const userPos=(posNext===null)?(Math.random()<0.5):posNext;
    posNext=!userPos;                    /* varsayılan: pozisyon sonunda top rakibe geçer */
    const fromTrans=fastNext; fastNext=null;
    _lastOff=userPos;
    const roll=Math.random();
    const B=userPos?hB:aB, D=userPos?aB:hB;
    const defenderIsUser=!userPos;
    let shooter=null,putback=false;
    if(shooterHint&&((userPos?userCourt:oppCourt).indexOf(shooterHint)>=0)){ shooter=shooterHint; putback=true; }
    shooterHint=null;
    if(!shooter) shooter=userPos?uShooter():oShooter();
    const sc=()=>`(${homeScore} - ${awayScore})`;
    const addU=(n)=>{ homeScore+=n; qh[q]+=n; };
    const addO=(n)=>{ awayScore+=n; qa[q]+=n; };
    const addPts=(n)=>{ if(userPos) addU(n); else addO(n); };

    /* Faz 3 — Pres savunması: rakip pozisyonunda akış dışı ekstra top kaybı (kullanıcı çalar). */
    if(!userPos && defPressTO>0 && Math.random()<defPressTO){
      const stealer=wPick(userCourt,stlW)||uAny();   /* FAZ A: kilit savunmacı çalar */
      B.to++; D.stl++;
      fastNext='steal';
      events.push({type:'steal',text:`🔥 Pres tuttu — ${stealer.isim} topu çaldı! ${sc()}`,q,t,home:homeScore,away:awayScore,stealId:stealer.id,stealIsUser:true,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* Faz 3 — Hızlı hücum: acele şutta kullanıcı pozisyonunda ekstra top kaybı riski. */
    if(userPos && offRushTO>0 && Math.random()<offRushTO){
      const stealer=wPick(oppCourt,stlW)||oAny();    /* FAZ A: kilit savunmacı çalar */
      B.to++; D.stl++;
      fastNext='steal';
      events.push({type:'steal',text:`⚡ Erken hücumda hata — ${stealer.isim} topu kaptı. ${sc()}`,q,t,home:homeScore,away:awayScore,stealId:stealer.id,stealIsUser:false,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }

    if(roll<0.80){
      /* Saha içi şut denemesi. Hızlı hücum: çalma/savunma ribaundu sonrası her iki takım
         için doğal olarak tetiklenir; kullanıcının hızlı tempo/odak seçimi ihtimali artırır. */
      /* Hızlı hücum GERÇEK basketboldaki gibi seyrek: çoğu top çalma/savunma ribaundu
         SAKİN yarı saha hücumuna döner. Eski oranlar (0.55/0.25) "sürekli hızlı hücum"
         hissi veriyordu; düşürüldü (çalma sonrası ~0.32, ribaund sonrası ~0.12). */
      let fbCh=fromTrans==='steal'?0.32:fromTrans==='reb'?0.12:0;
      if(fbCh&&userPos&&(tempo==='hizli'||odak==='hizli')) fbCh=Math.min(0.75,fbCh*1.7);
      if(fbCh&&userPos&&tempo==='yavas') fbCh*=0.5;
      if(fbCh&&userPos&&pb.fbMul) fbCh=Math.min(0.85,fbCh*pb.fbMul);   /* FAZ B: Erken Hücum seti */
      const fb=!putback&&Math.random()<fbCh;
      /* FAZ A: üçlük denemesi artık ŞUTÖRÜN eğilimine bağlı. Sahadaki 5'in ortalamasına
         normalize edildiği için TAKIMIN üçlük payı (userIs3Oran / 0.32) korunur; değişen,
         o denemeyi kimin yaptığı — şutör rolü dışarıdan, pivot boyalı alandan oynar. */
      const _court3=userPos?userCourt:oppCourt;
      let _is3p=userPos?userIs3Oran:Math.max(0.08,Math.min(0.62,(0.32+(botPb.is3||0))*(dset.opp3Rate!=null?dset.opp3Rate:1)));
      if(!putback&&_court3.length){
        const _avgUc=_court3.reduce((q,p)=>q+_eg(p,'uc'),0)/_court3.length;
        if(_avgUc>0) _is3p=Math.max(0.03,Math.min(0.74,_is3p*(_eg(shooter,'uc')/_avgUc)));
      }
      const is3=putback?false:Math.random()<_is3p;
      const clutch=(q>=4 && t<=120);
      /* Gerçek basketbol şut dağılımı: üçlük denemesi uzun oyuncuya (C/PF) düştüyse
         çoğunlukla dış oyuncuya (PG/SG/SF) devredilir — takım üçlük ORANI değişmez,
         yalnız KİMİN attığı gerçekçileşir (pivotun logo üçlüğü bitti). */
      if(is3&&!putback){
        const court=userPos?userCourt:oppCourt;
        const isFocus=userPos&&focusPlayerId&&shooter.id===focusPlayerId;
        if(!isFocus&&(shooter.poz==='C'||shooter.poz==='PF')&&Math.random()<(shooter.poz==='C'?0.85:0.55)){
          const per=court.filter(p=>p&&p!==shooter&&(p.poz==='PG'||p.poz==='SG'||p.poz==='SF'));
          if(per.length) shooter=ch(per);
        }
      }
      /* Faz 3 — rakip isabeti savunma stiline ve yıldız eşleştirmesine göre ayarlanır.
         Eşleştirmede rakip yıldızının isabeti belirgin düşer (o oyuncu için ×0.82). */
      const markMul=(markStar&&oppPool.length&&shooter===oppPool[0])?0.82:1;
      /* FAZ C: rakip koçun seti kendi isabetini de etkiler (kullanıcınınkiyle simetrik). */
      const oppAcc=(is3?(0.35+(botPb.acc3||0))*defOppAcc3Mul:(0.495+(botPb.acc2||0))*defOppAcc2Mul)*oMul*markMul;
      const acc=userPos?shooterAcc(shooter,is3,is3?0.355+acc3:0.505+acc2,clutch):oppAcc;
      /* Ev avantajı (eski %53 pozisyon payının yerine, isabete taşındı) + hızlı hücumda kolay sayı. */
      let accF=acc*((userPos===userIsHome)?1.03:0.97);
      if(userPos&&botState.dampen>0) accF*=0.93;   /* FAZ C: rakip molası kullanıcının serisini keser */
      if(fb&&!is3) accF+=0.07;
      const made=Math.random()<Math.max(0.14,Math.min(0.72,accF));
      /* Putback: pota dibinden ikinci şans — şut noktası çembere yapışık. */
      let xy;
      if(putback){
        const rm=(userPos===userIsHome)?RIM_L:RIM_R, dr=(userPos===userIsHome)?1:-1;
        const an=rand(-75,75)*Math.PI/180, rr=rand(14,58);
        xy={x:rm[0]+dr*Math.cos(an)*rr,y:rm[1]+Math.sin(an)*rr};
      } else xy=randShotXY(userIsHome===userPos,is3,made,shooter.poz);
      const pts=is3?3:2;
      let passer=null;
      if(made){
        if(userPos){ const pp=userCourt.filter(p=>p&&p.id!==shooter.id); if(pp.length&&Math.random()<(0.60+offAstBonus)) passer=wPick(pp,astW)||ch(pp);   /* FAZ A: asist oyun kurucudan */ }
        else { const op=oppCourt.filter(p=>p&&p.id!==shooter.id); if(op.length&&Math.random()<Math.max(0.25,Math.min(0.85,0.55+(botPb.ast||0)))) passer=wPick(op,astW)||ch(op); }
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
      const _dFoulMul=defenderIsUser?(dset.foul!=null?dset.foul:1):1;   /* FAZ B: pres faul riski ↑, pack ↓ */
      if(made&&!is3&&Math.random()<0.12*_dFoulMul){
        and1=true; B.ftAtt++; D.foul++; recordFoul(defenderIsUser,q,t);
        and1Made=userPos?ftMake(shooter):(Math.random()<0.74);
        if(and1Made){ B.ftMade++; addPts(1); if(userPos) bumpP(shooter,'pts',1); else bumpO(shooter,'pts',1); }
      }
      /* Kaçan turnikede savunma faulü → 2 serbest atış */
      if(!made&&!is3&&Math.random()<0.15*_dFoulMul){
        let nMade=0;
        if(userPos){ if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++; }
        else { if(Math.random()<0.74)nMade++; if(Math.random()<0.74)nMade++; }
        B.ftAtt+=2; B.ftMade+=nMade; D.foul++; recordFoul(defenderIsUser,q,t);
        addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
        const lineX=(userPos===userIsHome)?210:730;
        events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(pickLine([`${shooter.isim} şut anında faul aldı — 2 serbest atış kullanacak.`,`${shooter.isim} şuttayken faul çaldı, çizgiye gidiyor.`,`Şut faulü — ${shooter.isim} 2 atış kullanacak.`,`${shooter.isim} bindirmede faul kazandı, 2 atış.`],pr,narr.recent,'ftsf'),`${ftLine(nMade,2,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
          shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
          box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        return;
      }
      /* Madde 20: kaçan 3 sayı denemesinde savunma faulü → 3 serbest atış */
      if(!made&&is3&&Math.random()<0.08*_dFoulMul){
        let nMade=0;
        for(let k=0;k<3;k++){ if(userPos?ftMake(shooter):(Math.random()<0.74)) nMade++; }
        B.ftAtt+=3; B.ftMade+=nMade; D.foul++; recordFoul(defenderIsUser,q,t);
        addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
        const lineX=(userPos===userIsHome)?204:736;
        events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(`${shooter.isim} üç sayı denerken faul aldı — 3 atış:`,`${ftLine(nMade,3,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
          shots:[{x:lineX+rand(-8,8),y:236,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-8,8),y:250,made:nMade>=2,isHome:userPos,kind:'ft',q},{x:lineX+rand(-8,8),y:264,made:nMade>=3,isHome:userPos,kind:'ft',q}],
          box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        return;
      }
      /* Blok / ribaund (kaçan şutlarda) */
      let blocked=false, blk=null;
      if(!made&&Math.random()<0.10){ blocked=true; blk=(userPos?(wPick(oppCourt,blkW)||oAny()):(wPick(userCourt,blkW)||uAny())); D.blk++; }  /* FAZ A: pota altı karartıcı bloklar */
      let rebounder=null, rebOff=false;
      if(!made){
        rebOff=Math.random()<0.26;
        /* Ribaund kutuya ve doğru takımın somut oyuncusuna yazılır (kullanıcı + rakip simetrik). */
        /* FAZ A: ribaundu cam süpürücü/uzun oyuncu alır (takım ribaund ORANI değişmez). */
        const _rebCourt=rebOff?(userPos?userCourt:oppCourt):(userPos?oppCourt:userCourt);
        rebounder=wPick(_rebCourt,rebW)||(rebOff?(userPos?uAny():oAny()):(userPos?oAny():uAny()));
        if(rebOff){ B.reb++; if(userPos) bumpP(rebounder,'reb',1); else bumpO(rebounder,'reb',1); }
        else { D.reb++; if(userPos) bumpO(rebounder,'reb',1); else bumpP(rebounder,'reb',1); }
        posNext=rebOff?userPos:!userPos;   /* ribaundu alan takım hücuma devam eder */
        if(!rebOff) fastNext='reb';
      }
      /* Anlatım-geometri tutarlılığı: şut noktasının çembere uzaklığından sınıf çıkar.
         ≤90px (~2.7m) = "yakin" (turnike/smaç dili serbest); üstü = "orta" (turnike dili YASAK). */
      const rimIsLeft=(userPos===userIsHome);
      const _rim=rimIsLeft?RIM_L:RIM_R;
      const _rd=Math.hypot(xy.x-_rim[0],xy.y-_rim[1]);
      /* Faz 1: bölge gerçek şut noktasından; cls (yakın/orta/uzak) buradan türetilir. */
      const zone=putback?'rim':classifyZone(xy,rimIsLeft,is3);
      const cls=is3?'uzak':(zone==='midrange'?'orta':'yakin');
      /* İŞ 2: GERÇEKÇİ şema dağılımı (SUNUM etiketi — sonucu/isabeti DEĞİŞTİRMEZ, pr'den seçilir).
         iso yalnız top yükleme/yıldız veya süre azken; çoğunluk spot-up + pick&roll + kesme +
         post. Böylece "her pozisyon izolasyon" görüntüsü biter. */
      const bigInside=(shooter.poz==='C'||shooter.poz==='PF')&&(zone==='rim'||zone==='paint');
      const focusStar=userPos&&focusPlayerId&&shooter.id===focusPlayerId;
      let scheme;
      if(putback) scheme='putback';
      else if(fb) scheme='transition';
      else {
        const r=pr();
        if(focusStar&&r<0.62) scheme='iso';
        else if(clutch&&r<0.34) scheme='iso';
        else if(bigInside&&r<0.50) scheme='postup';
        else if(passer) scheme=(r<0.60?'spotup':r<0.85?'pnr':'cut');
        else scheme=(r<0.42?'spotup':r<0.64?'pnr':r<0.85?'cut':(!is3&&bigInside?'postup':'iso'));
      }
      /* postup yalnız içeri 2'lik olabilir — üçlükte asla (yoksa "dibe indi" gibi hamle 3'lüğe düşer). */
      if(is3&&scheme==='postup') scheme='spotup';
      /* İŞ 3: play.move DOLDURULUR (on-ball şemalarda) — AYNI karar hem metne hem animasyona
         gider (shot.move'a kopyalanır). move bölgeyle uyumlu: step-back orta/üçlük, drive dibe,
         spin/drive post-forvet. spot-up/transition/putback = catch&shoot, self-create yok. */
      let move=null;
      if(!putback&&scheme!=='transition'&&scheme!=='spotup'){
        if(is3||zone==='midrange') move=prCh(['stepback','crossover','hesitation']);   /* is3 ÖNCE — asla drive/spin */
        else if(scheme==='postup') move=prChance(0.6)?'spin':'drive';
        else move=prCh(['drive','crossover','hesitation']);
      }
      const contest=blocked?'heavy':(made?(prChance(0.42)?'contested':'open'):(prChance(0.5)?'contested':'heavy'));
      const play={scheme,zone,is3:!!is3,shooterId:shooter.id!=null?shooter.id:undefined,passerId:(passer&&passer.id!=null)?passer.id:undefined,move,contest,result:blocked?'block':and1?'and1':made?'make':'miss'};
      /* Faz 3: bağlam öneki (seri/fark/sıcaklık/kritik) — seçili ve throttled (spam değil). */
      let ctxPre='';
      if(made){
        narr.ctxCd=(narr.ctxCd||0)-1;
        const mg=Math.abs(homeScore-awayScore), hh=narr.heat[shooter.id]||0, cand=[];
        if(narr.run>=8) cand.push(`🔥 ${narr.run}-0'lık seri!`);
        else if(mg>=18) cand.push(`Fark açıldı — ${mg} sayı.`);
        if(hh>=3) cand.push(`${shooter.isim} kızıştı — üst üste ${hh}. isabet!`);
        if(clutch&&mg<=4) cand.push('Kritik anlar, başa baş!');
        if(cand.length&&narr.ctxCd<=0){ ctxPre=prCh(cand)+' '; narr.ctxCd=rand(3,6); }
      }
      /* Hamle ibaresi yalnız gerçekten yapılan (play.move) hamleye uygun; move dolu değilse
         asla move ibaresi çıkmaz (söz/görüntü tutarlı). */
      const movePhrase=(move&&MOVE_BY[move]&&prChance(0.5))?(pickLine(MOVE_BY[move],pr,narr.recent,'mv')+' '):'';
      let txt;
      if(made){
        if(is3){ const pasTxt=passer?assistPhrase(passer.isim,scheme,pr,narr.recent):''; txt=movePhrase+pasTxt+spikerLinePR(SP.id,'score3',{s:shooter.isim,sc:sc(),zone},pr,narr.recent); }
        else if(and1){ txt=`${shooter.isim} faule rağmen ${cls==='yakin'?'turnikeyi bitirdi':'şutu soktu'} — ${and1Made?'AND-1 tamam!':'ek atış kaçtı.'} ${sc()}`; }
        else { const pasTxt=passer?assistPhrase(passer.isim,scheme,pr,narr.recent):''; txt=movePhrase+pasTxt+spikerLinePR(SP.id,'score2',{s:shooter.isim,sc:sc(),cls,zone},pr,narr.recent); }
      } else if(blocked){
        txt=spikerLinePR(SP.id,'block',{s:shooter.isim,b:blk.isim},pr,narr.recent);
      } else {
        txt=spikerLinePR(SP.id,is3?'miss3':'miss2',{s:shooter.isim,cls},pr,narr.recent);
      }
      txt=ctxPre+txt;
      if(fb) txt='⚡ Hızlı hücum! '+txt;
      else if(putback) txt='İkinci şans! '+txt;
      /* Faz 3: seri + sıcaklık takibi (yalnız karşılaştırma/sayaç — sonuç randomu değişmez). */
      if(made){
        if(narr.runOff!==userPos){ narr.runOff=userPos; narr.run=pts; } else narr.run+=pts;
        narr.heat[shooter.id]=(narr.heat[shooter.id]||0)+1;
      } else { narr.heat[shooter.id]=0; }
      events.push({type:made?(is3?'score3':'score2'):(is3?'miss3':'miss2'),text:txt,play,shot:{x:xy.x,y:xy.y,made,isHome:userPos,kind:is3?'3':'2',q,fb:fb||undefined,pb:putback||undefined,blk:blocked||undefined,scheme,zone,move:move||undefined,contest,sid:shooter.id!=null?shooter.id:undefined,pid:(passer&&passer.id!=null)?passer.id:undefined},q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      /* Kaçan şutlarda ~%22 renkli ribaund anlatımı (hücum/savunma). */
      if(!made&&rebounder&&Math.random()<0.22){
        const rl=pickLine(rebOff?REB_OFF_LINES:REB_DEF_LINES,pr,narr.recent,rebOff?'rebO':'rebD').replace('%R',rebounder.isim);
        /* Sahnedeki jeton anlatımdaki oyuncuyla eşleşsin: kimlik + taraf event'e yazılır. */
        const rebIsUser=rebOff?userPos:!userPos;
        events.push({type:'reb',text:rl,q,t,home:homeScore,away:awayScore,rebId:rebounder.id,rebIsUser,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        /* Hücum ribaundu + anlatım basıldıysa: ~%55 aynı oyuncu pota dibinden tekrar dener (putback). */
        if(rebOff&&rebounder.id!=null&&Math.random()<0.55) shooterHint=rebounder;
      }

    } else if(roll<0.90){
      /* Şut faulü — çizgide 2 serbest atış */
      let nMade=0;
      if(userPos){ if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++; }
      else { if(Math.random()<0.72)nMade++; if(Math.random()<0.72)nMade++; }
      B.ftAtt+=2; B.ftMade+=nMade; D.foul++; recordFoul(defenderIsUser,q,t);
      addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
      const lineX=(userPos===userIsHome)?210:730;
      events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(pickLine(['Faul düdüğü — %S çizgide.','Faul var; %S serbest atış çizgisinde.','Savunma faulü — %S çizgiye gidiyor.','%S faul kazandı, çizgide.','Düdük çaldı; %S çizgide.'],pr,narr.recent,'ftpx').replace('%S',shooter.isim),`${ftLine(nMade,2,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
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
          events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(`🎯 Bonus! ${foulingTeamName(defenderIsUser)} çeyrek faul cezasında — ${shooter.isim} çizgide.`,`${ftLine(nMade,2,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
            shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
            box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        } else {
          const cnt=defenderIsUser?(qFoulU[q]||0):(qFoulO[q]||0);
          posNext=userPos;   /* şutsuz faul: top hücum eden takımda kalır (yandan devam) */
          events.push({type:'foul',text:`Faul — ${foulingTeamName(defenderIsUser)} bu çeyrek ${cnt}. faulünü yaptı (5'te bonus başlar). Top yandan.`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      } else {
        /* Top kaybı / top çalma — sayı yok. Faz 3: yalnız AZALTMA çarpanı (set oyun / bölge savunması);
           nötr seçimlerde keep=1 → her zaman top kaybı (eski davranış birebir). */
        const keep=userPos?offStealKeep:defStealKeep;
        if(keep>=1||Math.random()<keep){
          const stealer=userPos?(wPick(oppCourt,stlW)||oAny()):(wPick(userCourt,stlW)||uAny());
          B.to++; D.stl++;
          fastNext='steal';
          events.push({type:'steal',text:spikerLinePR(SP.id,'steal',{c:stealer.isim},pr,narr.recent),q,t,home:homeScore,away:awayScore,stealId:stealer.id,stealIsUser:!userPos,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        } else {
          /* Top kaybı savuşturuldu — sabırlı/kontrollü pozisyon, top el değiştirmedi (sayı yok). */
          posNext=userPos;
          events.push({type:'tactic',text:spikerLinePR(SP.id,'tactic',{},pr,narr.recent)+(userPos&&offStealKeep<1?' — sabırlı set oyunu.':''),q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      }

    } else {
      /* Renk — mola/taktik vurgusu (pozisyon değişmez, oyun aynı topla sürer) */
      posNext=userPos;
      events.push({type:'tactic',text:spikerLinePR(SP.id,'tactic',{},pr,narr.recent)+` (${prCh(['pick-and-roll','el presi','2-3 bölge','erken tempo','yayılma hücumu','çift perde'])})`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
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
        /* FAZ B: çeyrek başında hangi setle oynandığı anlatıma girer (koçun kararı görünür olsun). */
        text:`🔔 ${q}. çeyrek başladı — ${G.team.isim} ${homeScore} - ${awayScore} ${rname}.${pb&&pb.key!=='dengeli'?` ${G.team.isim} ${pb.ikon} ${pb.ad} setiyle çıkıyor.`:''}`,
        q,t:MATCH_CLOCK_SEC,home:homeScore,away:awayScore,
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
      });
    }

    let t=isResumeQ?Math.max(0,Number(resume.tStart)||MATCH_CLOCK_SEC):MATCH_CLOCK_SEC;
    let plays=0;
    while(t>0&&plays<playsMax){
      plays++;
      t=Math.max(0,t-rand(decLo,decHi));
      const _bh=homeScore,_ba=awayScore;
      runPossessionV(q,t);
      botCoachTick(q,t,homeScore-_bh,awayScore-_ba);   /* FAZ C: rakip koç kararı */
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
      const _bh2=homeScore,_ba2=awayScore;
      runPossessionV(qq,t);
      botCoachTick(qq,t,homeScore-_bh2,awayScore-_ba2);
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
    /* FAZ D: süre huzursuzluğu + verilen sözlerin denetimi (kimya bunlardan besleniyor). */
    if(typeof checkPromises==='function') checkPromises(playedSet);
    if(typeof processPlayingTime==='function') processPlayingTime(playedSet);
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
      /* Paket A: seyahat da sezonla pahalanır (gider enflasyonu).
         Madde 2: ecoRound kaldırıldı — maç günü nakit akışı (bilet/ödül/seyahat) artık tek
         ölçekte (KR-yerel); önceden seyahat 6.2K-14.6K ile kapı hasılatını (~4K) eziyordu. */
      const seyahat=Math.round(rand(300,700)*ecoInflationMul());
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
       tüm kulüp giderlerini ezmesin, uzun vadede kasa otomatik şişmesin (20 sezon ölçümüyle ayarlandı).
       Madde 2 (29. oturum): band ecoRound() ile ×ECO_MUL (≈20.8) ölçekleniyordu → gerçekte
       20.833-50.000 KR/galibiyet. Bilet geliri (~4-5K/maç) ve haftalık maaş (~5K) KR-yerel
       ölçekte olduğu için tek galibiyet bir haftalık tüm ekonomiyi eziyordu. Artık ödül de
       KR-yerel: bir iç saha kapı hasılatının yaklaşık yarısı kadar. */
    const priz=rand(1400,2600);
    txn('Maç ödülü (galibiyet)',priz);
    sfx('win');
    G.winStreak=(Number(G.winStreak)||0)+1;
    if(G.winStreak>=10) unlockAchievement('seri10');
    showNotif(`🏆 Galip geldin! +2 tablo puanı · +${fmtn(priz)} KR ödül${G.winStreak>=3?` · ${G.winStreak} maçlık seri!`:''}`);
  }
  else if(ev.winner==='away'){
    G.winStreak=0;
    const cons=rand(420,900); /* Madde 2: ecoRound kaldırıldı (6.7K-15K → 420-900 KR, KR-yerel ölçek) */
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
  /* FAZ D: kimya artık moral ortalaması + liderlik + huzursuzlar + rol çakışmasından hesaplanan
     HEDEFE kademeli yaklaşır (maç başına en fazla ±3). Eski liderlik dürtmesi bunun içinde. */
  if(typeof driftChemistry==='function') driftChemistry();
  else { const lead=teamLeadership(); const chemNudge=lead>=85?3:lead>=75?2:lead>=65?1:0; if(chemNudge) G.chemistry=Math.min(100,G.chemistry+chemNudge); }
  updateChemistry();
  /* Maç sonrası soyunma odası krizi (süre alamayan yıldız) — kullanıcı karar verir. */
  if(typeof maybeLockerRoomCrisis==='function') setTimeout(()=>{ try{ maybeLockerRoomCrisis(); }catch(e){} },1400);
  updateStats();
  renderLig();
  renderFixture();
  renderDashboardNextMatch();
  renderRoster();
  if(document.getElementById('page-dashboard')&&document.getElementById('page-dashboard').classList.contains('active')) renderDashboardNews();
  G.pendingMatch=null; /* C1: sonuç işlendi, kilit kalktı */
  scheduleGameSave();
}

