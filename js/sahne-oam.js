/* ═══════════════════════════════════════════════════════════════════════════════════
   Charazay 2.0 — js/sahne-oam.js · FAZ 46 · OYUN AKIŞI MAKİNESİ (OAM)
   CANLI TOPUN YENİDEN YAZIMI

   Eski sahne: motorun olay listesini adım adım "oynayan" bir kukla katmanıydı — dizilim
   şablonu, kulvar ara noktası, takip, bekçi, markaj ve salınım aynı jetonun hedefini
   birbirinden habersiz yazıyor; paslar anlatımdaki oyuncuya topu ulaştırmak için atılıyor,
   boş adam görülmüyordu. Kullanıcı (FAZ 45): "geri pas, mantıksız pas, mantıksız dizilim,
   boş oyuncu şut atmak yerine top sektiriyor."

   OAM tek beyindir: canlı topta (sokma → geçiş → set → şut) her karede her oyuncuya TEK
   hedef yazar. Hücum: boşluk şablonu (SET_*) + oyun şeması (perde / kesme / post / açılma);
   topu tutan oyuncu BOŞ ve ÖNDEKİ takım arkadaşına pas atar, geri pas yalnız içeriden
   açılma ya da çevrede çevirme olarak vardır. Savunma: adam adama — adam ile pota arasında,
   topa uzaklığa göre yardım mesafesi, topu tutana yakın markaj, şutta kapama. Sokma çizgi
   DIŞINDAN, alıcı 5-6 m'de. Şutu KİMİN, NEREDEN, NE SONUÇLA attığı motorun kararıdır
   (kutu skor / hash değişmez); OAM oyunu o şutöre o noktada boş şut ürettirecek biçimde
   kurar (gerçek basketbolda set oyunu tam olarak budur). Zaman bütçesi yetmezse baskı
   altında şut: pas zorla şutöre, şut yine oradan.

   Ölü top törenleri (hava atışı · serbest atış · faul/ihlal sokması · mola · periyot)
   eski koreografide kalır; OAM yalnız şutlu pozisyonu (`animateShotPossession`) devralır.
   Hareket fiziği (hız merdiveni, ivme, dönüş, çarpışma, top fiziği) eski `_simTick`tedir;
   OAM ondan ÖNCE hedefleri yazar, eski hedef yazıcıları (canlıSet salınımı, defTrack,
   çıkış-pası kapısı, kulvar `_wp`) canlı top boyunca kapalıdır.

   Sahne kararları YALNIZ sahne PRNG'sinden (`_sr`/`_srand`) çekilir — maç akışı kaymaz.
   ═══════════════════════════════════════════════════════════════════════════════════ */

const OAM_ACIK=true;
const OAM_YERINDE=24;        /* px ≈ 0,8 m — "noktasında" */
const OAM_BOS=44;            /* px ≈ 1,5 m — en yakın savunmacı bundan uzaksa alıcı boş */
const OAM_GERI=60;           /* px ≈ 2 m — bundan fazla potadan uzaklaşan pas "geri" */
const OAM_KICKOUT=150;       /* px ≈ 5 m — içeriden dışarı açma serbest */
const OAM_CEVRE=90;          /* px — iki çevre oyuncusu arasındaki çevirme pası serbest */
const OAM_SET_SURE={pnr:3.0,handoff:2.8,cut:2.6,postup:2.8,spotup:2.4,iso:2.2,transition:1.5,diger:2.4};

/* ── Yardımcılar ───────────────────────────────────────────────────────────────────── */
function oamS(){ return (typeof mState!=='undefined'&&mState)?mState._sim:null; }
function oamD(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
function oamDR(p,rim){ return Math.hypot(p.x-rim[0],p.y-rim[1]); }
function oamHedef(p,x,y,urg){
  if(!p) return;
  p.tx=_inX(x); p.ty=_inY(y); p._wp=null; p._sonHedefT=(oamS()||{}).time||0;
  const d=Math.hypot(p.x-p.tx,p.y-p.ty);
  _setUrg(p,(d<OAM_YERINDE&&urg<_URG.SPRINT&&!p._mark)?_URG.YURU:urg);
}
/** Noktasındaki oyuncu donmaz: hedef küçük bir dairede döner (r px, ω rad/sn). */
function oamCanli(p,sx,sy,r,ph){
  const S=oamS(); const t=(S?S.time:0)*2.1+ph;
  return [sx+Math.cos(t)*r,sy+Math.sin(t)*r*0.7];
}
/** En yakın savunmacı uzaklığı (px). */
function oamEnYakinSav(p,defP){ let m=1e9; (defP||[]).forEach(d=>{ if(d&&isFinite(d.x)){ const k=oamD(p,d); if(k<m) m=k; } }); return m; }
function oamBos(p,defP){ return oamEnYakinSav(p,defP)>OAM_BOS; }
/** Pas geriye mi? (potadan uzaklaşan; içeriden açma ve çevre çevirme serbest) */
function oamGeri(from,to,rim){
  const df=oamDR(from,rim), dt=oamDR(to,rim);
  if(dt<=df+OAM_GERI) return false;
  if(df<OAM_KICKOUT) return false;
  if(Math.abs(dt-df)<OAM_CEVRE&&df>THREE_R-30) return false;
  return true;
}
function oamPas(to,dur){
  const S=oamS(); if(!S||!to) return;
  const b=S.ball; const d=Math.hypot(to.x-b.x,to.y-b.y);
  const veren=b.carrier;
  _ballPass(to,dur||Math.max(0.36,Math.min(1.0,d/380)));   /* göğüs pası ≈ 13 m/sn (tavan 19,6; kare titreşimi 25 m/sn sayımına girmesin) */
  if(typeof sfx==='function') sfx('pass');
  const O=S.oam; if(O){
    O.holdT=0; O.sonPasT=O.t; O.pasN=(O.pasN|0)+1;
    /* pas-ve-hareket: çevredeki pasçı noktasını pota çevresinde ±25° kaydırır (şutör/perdeci hariç) */
    try{
      if(O.faz==='set'&&!O.donuk&&veren&&veren!==O.shooter&&veren!==O.screener&&veren!==O.cutter&&O.spots.has(veren)){
        const rim=O.rim, sp=O.spots.get(veren); const r=Math.hypot(sp[0]-rim[0],sp[1]-rim[1]);
        if(r>150){
          const a0=Math.atan2(sp[1]-rim[1],sp[0]-rim[0]); const a1=a0+(veren.y<250?1:-1)*0.42*(O.dir>0?-1:1)*(_sr()<0.5?1:-1);
          const nx=rim[0]+Math.cos(a1)*r, ny=rim[1]+Math.sin(a1)*r;
          const icerde=(nx>CRT_X0+30&&nx<CRT_X1-30&&ny>CRT_Y0+30&&ny<CRT_Y1-30);
          if(icerde&&!oamNoktaDolu(O,veren,nx,ny)) O.spots.set(veren,[nx,ny]);
        }
      }
    }catch(e){}
  }
}
/** Bir dizilim noktası başka bir oyuncunun noktasına 2,1 m'den yakın mı? */
function oamNoktaDolu(O,haric,x,y){
  let dolu=false; O.spots.forEach((c,p)=>{ if(p!==haric&&Math.hypot(c[0]-x,c[1]-y)<_PL_R_TAKIM) dolu=true; }); return dolu;
}
/** Pas mantıklı mı: geri değil, boya içinden geçmiyor (giriş pası hariç), 10 m'den uzun değil (açma hariç). */
function oamPasOlur(from,to,rim){
  if(oamGeri(from,to,rim)) return false;
  const df=oamDR(from,rim), dt=oamDR(to,rim);
  const d=oamD(from,to);
  if(d>300&&df>=OAM_KICKOUT&&dt>=OAM_KICKOUT) return false;
  if(df>=OAM_KICKOUT&&dt>=OAM_KICKOUT){
    /* pota-çizgi uzaklığı */
    const vx=to.x-from.x, vy=to.y-from.y, L=vx*vx+vy*vy||1;
    const u=Math.max(0,Math.min(1,((rim[0]-from.x)*vx+(rim[1]-from.y)*vy)/L));
    const px=from.x+u*vx, py=from.y+u*vy;
    if(Math.hypot(px-rim[0],py-rim[1])<70) return false;
  }
  return true;
}
/** Doğrudan pas olmuyorsa köprü oyuncu (yol toplamı en kısa, ilk pas mantıklı). */
function oamKopru(O,from,to){
  let en=null,ed=1e9;
  O.offP.forEach(c=>{ if(!c||c===from||c===to||c._oob) return; if(!oamPasOlur(from,c,O.rim)) return; const s=oamD(from,c)+oamD(c,to); if(s<ed){ ed=s; en=c; } });
  return en;
}
/** Dizilim noktaları: SET şablonu rol sırasına göre, aynalanmış. */
function oamSpotlar(S,offLeft,offR){
  const base=(SET_ALL[(S.setIx|0)%SET_ALL.length]||SET_SPREAD);
  const m=new Map();
  const rim=_rim(offLeft);
  offR.forEach((p,i)=>{ const c=_pt((base[i]||base[0]).slice(),offLeft,!!S.flip);
    /* şablon %7 içeri çekilir (ölçüldü: potaya ortalama uzaklık 8,2 m, hedef ≤ 7) */
    m.set(p,[rim[0]+(c[0]-rim[0])*0.93,rim[1]+(c[1]-rim[1])*0.93]); });
  return m;
}

/* ── Pozisyon kurulumu (animateShotPossession yerine) ───────────────────────────────── */
function oamSut(sh,onShoot,onResult){
  const S=oamS(); if(!S) return 0;
  const _res=()=>{ S.pendingPaint=null; try{ if(typeof onResult==='function') onResult(); }catch(e){} };
  try{ mState._gelen={shot:true,type:'shot'}; }catch(e){}
  clearBallTimers();
  S.pendingPaint=_res;
  const offLeft=S.offSide!=null?S.offSide:(sh.isHome===(mState.userIsHome!==false));
  const offP=S.offP||(sh.isHome?S.home:S.away);
  const defP=S.defP||(sh.isHome?S.away:S.home);
  const rim=_rim(offLeft);
  const b=S.ball;
  const offR=_rolesOrder(offP), defR=_rolesOrder(defP);
  const dir=offLeft?-1:1;                       /* ön saha yönü (x) */
  _clearOob((S.inb&&S.inb.tok)||((b.carrier&&b.carrier._oob&&offP.indexOf(b.carrier)>=0)?b.carrier:null));

  /* Şutör = anlatımdaki oyuncu */
  let shooter=null;
  if(sh.sid!=null) shooter=offP.find(p=>p.pl&&p.pl.id===sh.sid)||null;
  if(!shooter){ let bd=1e9; offP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;shooter=p;} }); }
  if(!shooter) shooter=offR[0];

  /* Topu getiren / çıkış pası (M9 sözleşmesi korunur) */
  let pg=(b.carrier&&offP.indexOf(b.carrier)>=0)?b.carrier:offR[0];
  let outletTok=null;
  if(!sh.pb&&pg&&pg.role===2&&_sr()<0.70){
    const g2=offR.find(p=>p!==pg&&p!==shooter&&(p.role===0||p.role===1))||offR.find(p=>p!==pg&&(p.role===0||p.role===1));
    if(g2){ outletTok=pg; pg=g2; }
  }
  if(!outletTok&&!sh.pb&&pg&&(pg.role===3||pg.role===4)){
    const guard=offR.find(p=>p!==pg&&p!==shooter&&(p.role===0||p.role===1))||offR.find(p=>p!==pg&&(p.role===0||p.role===1))||offR.find(p=>p!==pg&&p!==shooter)||offR.find(p=>p!==pg);
    if(guard){ outletTok=pg; pg=guard; }
  }
  if(pg===shooter&&!sh.pb) pg=offR.find(p=>p!==shooter&&p!==outletTok&&_tasiyabilir(p))||offR.find(p=>p!==shooter&&p!==outletTok)||offR.find(p=>p!==shooter)||offR[0];
  try{ S._dbgOutlet={tasiyiciRol:(b.carrier&&b.carrier.role!=null)?b.carrier.role:null,pb:!!sh.pb,outlet:!!outletTok,pgRol:pg?pg.role:null}; }catch(e){}
  const relay=offP.filter(p=>p!==shooter&&p!==pg);
  const tac=(typeof G!=='undefined'&&G&&G.tactics)||{};
  const userAtt=!!sh.isHome;
  let mid=relay.length?relay[_srand(0,relay.length-1)]:pg;
  if(userAtt&&tac.focusPlayerId){ const f=relay.find(p=>p.pl&&p.pl.id===tac.focusPlayerId); if(f) mid=f; }
  if(sh.pid!=null){ const pt=relay.find(p=>p.pl&&p.pl.id===sh.pid); if(pt) mid=pt; else if(pg.pl&&pg.pl.id===sh.pid) mid=pg; }

  const putback=!!sh.pb&&b.carrier&&offP.indexOf(b.carrier)>=0;
  const inbPending=!putback&&(!!S.inb||!!(b.carrier&&b.carrier._oob&&offP.indexOf(b.carrier)>=0));
  const afterTurnover=(S.prevType==='steal'||S.prevType==='reb');
  const rimDist=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
  const fastBreak=!putback&&!inbPending&&(!!sh.fb||(userAtt&&afterTurnover&&(tac.tempo==='hizli'||tac.odak==='hizli'))||(afterTurnover&&rimDist<=170&&_sr()<0.55));
  const iso=!!(userAtt&&tac.focusPlayerId&&shooter.pl&&shooter.pl.id===tac.focusPlayerId);
  const scheme=sh.scheme||null;
  try{ mState._semaAd=scheme||'diger'; }catch(e){}
  S._sema=null;
  const isPnr=(scheme==='pnr'||scheme==='handoff')&&!fastBreak&&!putback&&!iso;

  /* Dizilim: şutörün noktası ŞUT NOKTASIDIR; en yakın şablon noktası ona bırakılır */
  const spots=oamSpotlar(S,offLeft,offR);
  if(!putback){
    const sp=[_inX(sh.x),_inY(sh.y)];
    let enY=null,ed=1e9; offR.forEach(p=>{ if(p===shooter) return; const c=spots.get(p); const d=Math.hypot(c[0]-sp[0],c[1]-sp[1]); if(d<ed){ ed=d; enY=p; } });
    const eski=spots.get(shooter);
    spots.set(shooter,sp);
    if(enY&&ed<70) spots.set(enY,eski);
  } else spots.set(shooter,[_inX(sh.x),_inY(sh.y)]);
  /* Oyun kurucunun noktası: topu getiren, şutör değilse tepeye yakın kalsın (giriş noktası) */

  /* Pas zinciri: pg → (ara) → asist veren → şutör */
  const zincir=[];
  const ekle=(p)=>{ if(p&&zincir[zincir.length-1]!==p&&zincir.indexOf(p)<0) zincir.push(p); };
  ekle(pg);
  if(!fastBreak&&!putback&&!iso&&mid!==pg&&mid!==shooter&&_sr()<0.8){ const ara=relay.find(p=>p!==mid&&_tasiyabilir(p)&&p!==shooter); if(ara) ekle(ara); }   /* FAZ 48: gerçek 3,1 pas/poz */
  if(mid!==shooter) ekle(mid);
  ekle(shooter);

  /* Zincirdeki pasçılar köşede durmasın (köşeden köşeye boya içinden pas): köşe noktası, zincir dışı
     bir oyuncunun kanat/tepe noktasıyla takas edilir. */
  const koseMi=(c)=>(Math.min(Math.abs(c[0]-CRT_X0),Math.abs(c[0]-CRT_X1))<110&&Math.abs(c[1]-250)>150);
  zincir.forEach(p=>{
    if(p===shooter) return;
    const c=spots.get(p); if(!c||!koseMi(c)) return;
    const q=offR.find(o=>o!==shooter&&zincir.indexOf(o)<0&&!koseMi(spots.get(o)||[0,250]));
    if(q){ const cq=spots.get(q); spots.set(q,c); spots.set(p,cq); }
  });
  /* Boyada biri olsun: hiçbir nokta potaya 5 m'den yakın değilse zincir dışı en uzun oyuncu
     şutörün ZAYIF tarafındaki alçak posta iner (ölçüldü: 5-dış şablonlarda boyada hücumcu %51,
     potaya ortalama uzaklık 8,3 m). */
  if(!fastBreak&&!putback){
    let icerde=false; spots.forEach((c,p)=>{ if(Math.hypot(c[0]-rim[0],c[1]-rim[1])<150) icerde=true; });
    if(!icerde){
      const uzun=offR.filter(p=>p!==shooter&&zincir.indexOf(p)<0).sort((a,b2)=>(b2.role|0)-(a.role|0))[0];
      if(uzun){ const sy=spots.get(shooter)[1]; spots.set(uzun,[_inX(rim[0]+dir*44),_inY(250+(sy<250?54:-54))]); }
    }
  }
  /* zayıf taraf değişimi: zincir dışı iki çevre oyuncusu set başında yer değiştirir (hareket) */
  /* FAZ 48 (grafikte görüldü): sahayı boydan boya kat eden değişim yayları — yalnız KOMŞU noktalar
     (≤ 7 m) arasında değişim; uzunlar (rol 3-4) köşe noktasına gitmez, dirsek/post alır. */
  const serbest=offR.filter(o=>o!==shooter&&zincir.indexOf(o)<0);
  let degisim=null;
  if(serbest.length>=2&&_sr()<0.7){ const a=spots.get(serbest[0]), c2=spots.get(serbest[1]); if(a&&c2&&Math.hypot(a[0]-c2[0],a[1]-c2[1])<=207) degisim=[serbest[0],serbest[1]]; }
  offR.forEach(p=>{ if(p===shooter||(p.role|0)<3) return; const c=spots.get(p); if(c&&koseMi(c)){ spots.set(p,[_inX(rim[0]+dir*120),_inY(c[1]<250?170:330)]); } });

  /* Şema aktörleri */
  const bigs=offR.filter(p=>p!==shooter&&p!==pg&&(p.role===3||p.role===4));
  const screener=isPnr?(bigs.length?bigs.reduce((a,c)=>oamD(c,pg)<oamD(a,pg)?c:a):null):null;
  const doCut=(scheme==='cut')||(!isPnr&&!fastBreak&&!putback&&scheme!=='postup'&&scheme!=='spotup'&&_sr()<0.45);
  const cutter=doCut?((rimDist<150&&shooter!==pg)?shooter:(bigs.find(p=>p!==screener)||relay.find(p=>p!==mid)||null)):null;
  const postup=(scheme==='postup')&&!fastBreak&&!putback;

  /* Süre bütçesi (sahne sn) */
  let inb=null,spot=null;
  if(inbPending){
    inb=(S.inb&&S.inb.tok&&offP.indexOf(S.inb.tok)>=0)?S.inb.tok:((b.carrier&&b.carrier._oob)?b.carrier:null);
    if(S.inb) spot={x:S.inb.x,y:S.inb.y}; else if(inb) spot={x:inb.tx,y:inb.ty};
    if(!inb){ inb=offR.reduce((a,c)=>oamDR(c,_rim(!offLeft))<oamDR(a,_rim(!offLeft))?c:a); spot=_inboundSpot('base',offLeft,null,250+(_sr()<0.5?-1:1)*_srand(24,74)); inb._oob=true; }
  }
  const tInb=inbPending?Math.min(2.8,(inb?Math.hypot(inb.x-spot.x,inb.y-spot.y):0)/150+0.9):0;
  const pgSpot=spots.get(pg)||[rim[0]-dir*250,250];
  const getirMesafe=inbPending?Math.hypot(spot.x+dir*165-pgSpot[0],spot.y-pgSpot[1]):Math.hypot(pg.x-pgSpot[0],pg.y-pgSpot[1]);
  const tAdv=putback?0:Math.max(0.35,Math.min(3.2,getirMesafe/(fastBreak?250:205)+0.25));
  const setDur=putback?0.45:(fastBreak?1.0:((OAM_SET_SURE[scheme]||OAM_SET_SURE.diger)+Math.max(0,zincir.length-2)*0.35));
  const tFire=tInb+tAdv+setDur;

  const O={aktif:true,faz:inbPending?'sokma':(putback?'set':'bekle'),t:0,sh,shooter,pg,outletTok,mid,offP,defP,offR,defR,offLeft,dir,rim,
    spots,zincir,zi:0,holdT:0,holdMin:0.28+_sr()*0.3,scheme,fastBreak,putback,iso,isPnr,screener,cutter,postup,degisim,degisti:false,
    inb,spot,tFire,tInb,tAdv,setDur,tSet:null,tGecis:null,res:_res,onShoot,atildi:false,perdeEvre:0,esle:new Map(),ph:new Map(),
    zorla:false,sutT:null,_snapSeen:(S._snapN|0)};
  offR.forEach((p,i)=>{ O.esle.set(p,defR[i]||defR[0]); O.ph.set(p,i*1.3); });
  defR.forEach((p,i)=>{ O.ph.set(p,i*1.7+0.5); });
  S.oam=O;
  S.canliSet=false; S._setIstek=false; S.defTrack=false; S.cikisSonra=1e9; S.shooter=shooter;
  if(putback){ O.tSet=0; S._sema=scheme||'putback'; }
  try{ mState._animRez=1800; }catch(e){}
  return Math.round((tFire+1.4)*1000)+((sh.made&&sh.and1)?2100:0);
}
/** Set fazı başlar: şut anı gerçek set başlangıcına göre yeniden kurulur; zayıf taraf değişimi. */
function oamSetBasla(S,O,etiket){
  O.faz='set'; O.tSet=O.t; S._sema=etiket;
  O.tFire=Math.max(O.tFire,O.tSet+O.setDur);
  if(O.degisim&&!O.degisti){ const [a,b2]=O.degisim; const ca=O.spots.get(a), cb=O.spots.get(b2); if(ca&&cb){ O.spots.set(a,cb); O.spots.set(b2,ca); } O.degisti=true; }
}

/* ── ÖLÜ TOP SOKMASI (FAZ 47b): faul / ihlal / çeyrek başı olayında eski dal sokucuyu ve noktayı
   kurar; OAM pası, dizilimi ve savunmayı devralır (şutsuz mod: şut olayı gelince `oamSut` her şeyi
   yeniden kurar). Eski dalın "set dizilimine yürüyen sütun"u ve kendi pası devre dışı. ──────── */
function oamOluTop(S){
  try{
    const b=S.ball; const offP=S.offP, defP=S.defP; if(!offP||!defP||!offP.length) return false;
    const inb=offP.find(p=>p&&p._oob); if(!inb||!isFinite(inb.tx)) return false;
    const spot={x:inb.tx,y:inb.ty};
    const offLeft=S.offSide; if(offLeft==null) return false;
    const rim=_rim(offLeft), dir=offLeft?-1:1;
    const offR=_rolesOrder(offP), defR=_rolesOrder(defP);
    const pg=offR.find(p=>p!==inb&&p.role===0)||offR.find(p=>p!==inb&&_tasiyabilir(p))||offR.find(p=>p!==inb); if(!pg) return false;
    const spots=oamSpotlar(S,offLeft,offR);
    let icerde=false; spots.forEach((c)=>{ if(Math.hypot(c[0]-rim[0],c[1]-rim[1])<150) icerde=true; });
    if(!icerde){ const uzun=offR.filter(p=>p!==pg).sort((a,b2)=>(b2.role|0)-(a.role|0))[0]; if(uzun) spots.set(uzun,[_inX(rim[0]+dir*44),_inY(250+(spot.y<250?54:-54))]); }
    S.script=[]; S.sIdx=0;                                  /* eski dalın pası OAM'a geçer */
    const spotOnde=offLeft?(spot.x<COURT_MID):(spot.x>COURT_MID);
    const O={aktif:true,sutsuz:true,spotOnde,faz:'sokma',t:0,sh:null,shooter:null,pg,outletTok:null,mid:null,offP,defP,offR,defR,offLeft,dir,rim,
      spots,zincir:[pg],zi:0,holdT:0,holdMin:0.6,scheme:null,fastBreak:false,putback:false,iso:false,isPnr:false,screener:null,cutter:null,postup:false,
      degisim:null,degisti:true,inb,spot,tFire:99,tInb:2,tAdv:2.5,setDur:99,tSet:null,tGecis:null,res:null,onShoot:null,atildi:false,perdeEvre:0,
      esle:new Map(),ph:new Map(),zorla:false,sutT:null,_snapSeen:(S._snapN|0)};
    offR.forEach((p,i)=>{ O.esle.set(p,defR[i]||defR[0]); O.ph.set(p,i*1.3); }); defR.forEach((p,i)=>{ O.ph.set(p,i*1.7+0.5); });
    S.oam=O; S.canliSet=false; S._setIstek=false; S.defTrack=false; S.cikisSonra=1e9; S.shooter=null;
    return true;
  }catch(e){ return false; }
}

/* ── Şut anı (eski `fire` sözleşmesi: ön parça elden çıkarken, sonuç çemberde) ──────── */
function oamAtes(){
  const S=oamS(); const O=S&&S.oam; if(!O||O.atildi) return;
  O.atildi=true; O.faz='sut'; O.sutT=O.t;
  const {sh,shooter,offP,defP,offLeft,rim}=O; const _res=O.res;
  try{ if(typeof O.onShoot==='function') O.onShoot(); }catch(e){}
  const _sTip=sh.sut||null;
  shooter.pop=(_sTip==='smac')?1.6:(_sTip==='tipin')?1.45:(_sTip==='kanca')?0.9:(_sTip==='turnike')?0.85:(_sTip==='floater')?1.15:1;
  shooter._sirtDonuk=false;
  _lockTok(shooter,_sTip==='smac'?1.0:0.8);
  const dfn=O.esle.get(shooter); if(dfn&&oamD(dfn,shooter)<70) dfn.pop=(sh.contest==='heavy')?0.9:0.55;   /* kapama */
  if(sh.blk){
    /* FAZ 47: blok noktası TOPUN gerçek konumundan (motorun şut noktasından değil) — bütçe dolup
       şutör noktasına varamadan atış zorlanınca top 12 m'yi 0,2 sn'de "uçuyordu" (683 m/sn). */
    const S0=oamS(); const b0=S0?S0.ball:null; const sx=(b0&&isFinite(b0.x))?b0.x:sh.x, sy=(b0&&isFinite(b0.y))?b0.y:sh.y;
    const bx=sx+(rim[0]-sx)*0.22+_srand(-16,16), by=sy+(rim[1]-sy)*0.22+_srand(-16,16);
    let bl=null,bd=1e9; defP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;bl=p;} });
    if(bl) bl.pop=1;
    _ballShoot([bx,by],0.20,false,()=>{
      _res();
      let a2=_sr()*6.283;
      try{ const nxB=_peekNext(); if(nxB&&nxB.type==='reb'&&nxB.rebId!=null){ const nm=offP.concat(defP).find(p=>p.pl&&p.pl.id===nxB.rebId); if(nm) a2=Math.atan2(nm.y-by,nm.x-bx)+(_sr()*2-1)*0.4; } }catch(e){}
      _ballLoose(Math.cos(a2)*150,Math.sin(a2)*140,63);
      oamRebScramble(S,offP,defP,rim,offLeft);
    });
    oamBitir(); return;
  }
  const rimD=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
  /* ribaunt bloğu: sıradaki ribaundcu + rakip uzun potanın iki yanına */
  try{
    const nx0=_peekNext();
    const hucRib=(nx0&&nx0.type==='reb'&&nx0.rebId!=null)?(offP.concat(defP).find(p=>p.pl&&p.pl.id===nx0.rebId)||null):null;
    const enUzun=(team,haric)=>{ let e=null,ed=1e9; _rolesOrder(team).slice(2).forEach(p=>{ if(!p||p===haric||p===shooter) return; const d=oamDR(p,rim); if(d<ed){ ed=d; e=p; } }); return e; };
    const r1=hucRib||enUzun(defP,null), r2=enUzun((r1&&defP.indexOf(r1)>=0)?offP:defP,r1);
    const yon=Math.atan2(sh.y-rim[1],sh.x-rim[0]);
    [[r1,0.55],[r2,-0.55]].forEach(([p,da])=>{ if(!p||p===shooter) return; const rr=_srand(36,54); const a=yon+da; p.tx=_inX(rim[0]+Math.cos(a)*rr); p.ty=_inY(rim[1]+Math.sin(a)*rr); p._wp=null; _setUrg(p,_URG.SPRINT); _lockTok(p,0.9); });
  }catch(e){}
  const _durSabit=(rimD<90||_sTip==='smac'||_sTip==='turnike'||_sTip==='floater'||_sTip==='kanca'||_sTip==='tipin')?0:0.58;
  _ballShoot(rim,_durSabit,sh.made,()=>{
    _rimFlash(rim[0],rim[1],sh.made);
    if(sh.made&&sh.and1){ _and1Sequence(sh,shooter,offP,defP,offLeft,rim,_res); return; }
    _res();
    if(sh.made){
      _setupInbound(!sh.isHome,250+(_sr()<0.5?-1:1)*_srand(24,74));
    } else {
      let away=Math.atan2(sh.y-rim[1],sh.x-rim[0])+(_sr()*2-1)*1.1;
      let sp=_srand(85,150);
      try{ const nxR=_peekNext(); if(nxR&&nxR.type==='reb'&&nxR.rebId!=null){
        const nm=offP.concat(defP).find(p=>p.pl&&p.pl.id===nxR.rebId);
        if(nm){ const dn=oamDR(nm,rim); if(dn>90){ away=Math.atan2(nm.y-rim[1],nm.x-rim[0])+(_sr()*2-1)*0.35; sp=_srand(120,165); } }
      } }catch(e){}
      _ballCarom(Math.cos(away)*sp,Math.sin(away)*sp,_srand(44,54));
      S.inb=null;
      oamRebScramble(S,offP,defP,rim,offLeft);
    }
  },_sTip);
  oamBitir();
}
function oamBitir(){ const S=oamS(); if(!S) return; if(S.oam){ S.oam.aktif=false; } S.cikisSonra=0; }

/* ── RİBAUND MÜCADELESİ (FAZ 48 d3): motorun `_rebScramble`i `animateShotPossession` içinde YEREL —
   OAM'dan çağrılınca ReferenceError fırlıyor ve `_ballShoot` geri çağrısı sessizce yutuyordu; FAZ 46'dan
   beri OAM şutlarında mücadele hiç kurulmuyordu (top 'reb' olayına dek 2-3,5 sn yerde). Aynı mantık +
   d2/d4: kazanan 'reb' olayını beklemeden takibe girer ve hücum hemen başlar; 'reb' olayı yalnız anlatır (`S._erkenReb`). */
function oamRebScramble(S,offA,defA,rimXY,left){
  try{
    const nx=_peekNext();
    let winTeam=null;
    if(nx&&nx.type==='reb'&&nx.rebIsUser!=null) winTeam=nx.rebIsUser?S.home:S.away;
    else if(nx&&nx.off!==undefined) winTeam=nx.off?S.home:S.away;
    if(!winTeam) winTeam=_sr()<0.72?defA:offA;
    const loseTeam=(winTeam===S.home)?S.away:S.home;
    const pick=(team)=>{
      const R=_rolesOrder(team);
      const cand=[R[4],R[3],R[2]].filter(Boolean);
      let best=cand[0],bd=1e9;
      cand.forEach(p=>{ const d=Math.hypot(p.x-rimXY[0],p.y-rimXY[1]); if(d<bd){bd=d;best=p;} });
      return best||team[0];
    };
    let w=pick(winTeam), l=pick(loseTeam);
    if(nx&&nx.type==='reb'&&nx.rebId!=null){ const nm=winTeam.find(p=>p.pl&&p.pl.id===nx.rebId); if(nm) w=nm; }
    if(l===w) l=pick(loseTeam===winTeam?defA:loseTeam);
    const bb=S.ball;
    const winIsUser=(winTeam===S.home);
    if(l&&l!==w){ const an=_sr()*6.283, rr=_srand(48,66); _setUrg(l,_URG.KOS); l.tx=_inX(bb.x+Math.cos(an)*rr); l.ty=_inY(bb.y+Math.sin(an)*rr); _lockTok(l,1.4); }
    if(w){
      w.pop=0.7;
      if(!(nx&&nx.type==='reb')) _chase(w,()=>{ _startBreak(winIsUser); },2.4);
      else _chase(w,()=>{ S._erkenReb=true; _startBreak(winIsUser); },3.0);   /* FAZ 48 d4: hücum hemen başlar, 'reb' olayı yalnız anlatır */
    }
  }catch(e){}
}

/* ── Kare beyni ─────────────────────────────────────────────────────────────────────── */
function oamTick(dt){
  const S=oamS(); const O=S&&S.oam; if(!O||!O.aktif) return;
  O.t+=dt; O.holdT+=dt;
  if(O.faz==='toren'){ oamTorenTick(S,O,dt); return; }
  const b=S.ball, {offP,defP,offR,rim,dir,shooter,pg,spots}=O;
  const carrier=b.carrier, bizde=!!(carrier&&offP.indexOf(carrier)>=0);
  const ucusta=(b.mode==='pass'||b.mode==='shot');
  const onSaha=(p)=>O.offLeft?(p.x<COURT_MID):(p.x>COURT_MID);

  /* ── faz geçişleri ── */
  if(O.faz==='bekle'){
    if(bizde){
      if(carrier!==pg&&!_tasiyabilir(carrier)&&!O.putback){ oamOutletTick(S,dt); }   /* uzun sürmez: PG gelir, çıkış pası */
      if(carrier===pg||_tasiyabilir(carrier)||O.holdT>0.6){ O.faz='gecis'; O.tGecis=O.t; }
    } else if(carrier&&!bizde){
      if(O.holdT>0.2){ _ballLoose(0,0,14); _chase(pg,null,2.2); O.holdT=0; }
    } else if(!ucusta&&!S.chase){
      let en=null,ed=1e9; offP.forEach(p=>{ if(!p||p._oob) return; const d=Math.hypot(p.x-b.x,p.y-b.y); if(d<ed){ ed=d; en=p; } });
      if(en) _chase(en,null,2.2);
    }
    if(O.t>2.8&&!bizde&&!ucusta){ _ballHold(pg); O.faz='gecis'; O.tGecis=O.t; }
  }
  else if(O.faz==='sokma'){
    const inb=O.inb, spot=O.spot;
    if(!inb||!spot){ O.faz='bekle'; }
    else {
      inb._oob=true;
      if(b.carrier!==inb&&!ucusta&&!(S.chase&&S.chase.tok===inb)){
        _chase(inb,()=>{ try{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; inb._wp=null; _setUrg(inb,_URG.KOS); }catch(e){} },2.4);
      }
      if(b.carrier===inb){ inb.tx=spot.x; inb.ty=spot.y; inb._wp=null; _setUrg(inb,_URG.KOS); S.ball.noDrib=true; }
      const hazir=(b.carrier===inb&&Math.hypot(inb.x-spot.x,inb.y-spot.y)<=16);
      if((hazir&&O.t>=0.25)||(b.carrier===inb&&O.t>3.4)){
        let alici=pg;
        if(Math.hypot(pg.x-inb.x,pg.y-inb.y)>_SOKMA_MAX_PX){ alici=_pasHedefSinirla(inb,pg,offP,_SOKMA_MAX_PX)||pg; }
        oamPas(alici);
        _oobKapat(inb); inb._wp=null; S.inb=null; S._sokmaBekle=null;
        O.faz='gecis'; O.tGecis=O.t;
      }
    }
  }
  else if(O.faz==='gecis'){
    if(bizde&&carrier!==pg&&!_tasiyabilir(carrier)&&!O.putback){ oamOutletTick(S,dt); }   /* uzun sürmez: PG gelir, çıkış pası */
    const bh=bizde?carrier:pg;
    const bhSpot=spots.get(bh)||[rim[0]-dir*220,250];
    const vardi=Math.hypot(bh.x-bhSpot[0],bh.y-bhSpot[1])<70;
    const onde=onSaha(bh)&&Math.abs(bh.x-COURT_MID)>90;
    if(O.fastBreak&&bizde&&onSaha(bh)){ oamSetBasla(S,O,O.scheme||'transition'); }
    else {
      /* set, hücumun en az dördü ön sahadayken kurulur (ölçüm: arkadan gelen uzunlar potaya
         ortalama uzaklığı şişiriyordu); zaman tavanı yine geçerli */
      let ondeN=0; offR.forEach(p=>{ if(p&&onSaha(p)) ondeN++; });
      if(bizde&&((vardi&&ondeN>=4)||(onde&&ondeN>=4&&O.t>=O.tGecis+1.0)||O.t>=O.tInb+O.tAdv+1.0)) oamSetBasla(S,O,O.scheme||'diger');
    }
    /* geçiş pası: hızlı hücumda öndeki boş kanada */
    if(O.fastBreak&&bizde&&O.holdT>0.5&&carrier!==shooter&&oamBos(shooter,defP)&&oamDR(shooter,rim)<oamDR(carrier,rim)-40){ oamPas(shooter); }
  }
  else if(O.faz==='set'){
    S.canliSet=true;
    if(O.sutsuz){
      /* şut olayı henüz gelmedi: dizilim korunur, uzun tutuyorsa çıkış pası; top hareketi yok */
      if(bizde&&carrier!==pg&&!_tasiyabilir(carrier)) oamOutletTick(S,dt);
      else if(!bizde&&!ucusta&&carrier){ if(O.holdT>0.2){ _ballLoose(0,0,14); _chase(pg,null,2.2); O.holdT=0; } }
      oamHedefler(S,O); return;
    }
    const ts=O.t-O.tSet;
    const kalan=O.tFire-O.t;
    /* şema aşamaları */
    if(O.isPnr&&O.screener){
      if(O.perdeEvre===0&&ts>=0.15){ O.perdeEvre=1; S._perde={evre:1,tok:O.screener,t:S.time}; }
      else if(O.perdeEvre===1&&ts>=0.95){ O.perdeEvre=2; S._perde={evre:2,tok:O.screener,t:S.time}; }
      else if(O.perdeEvre===2&&ts>=1.55){ O.perdeEvre=3; S._perde={evre:3,tok:O.screener,t:S.time,roll:(O.screener===shooter||_sr()<0.6)}; }
    }
    if(O.postup&&!shooter._sirtDonuk&&ts>=0.3){ shooter._sirtDonuk=true; S._postup={tok:shooter,t:S.time}; }
    /* top hareketi */
    if(bizde&&!ucusta){
      const zi=Math.max(0,O.zincir.indexOf(carrier));
      const sonraki=O.zincir[zi+1]||null;
      const sutorde=(carrier===shooter);
      const sutSpot=spots.get(shooter);
      const sutYerinde=Math.hypot(shooter.x-sutSpot[0],shooter.y-sutSpot[1])<=30;
      if(sutorde){
        /* şutör topta: noktasına gelince ve takım oturunca (≥3/4 noktasında, en çok +0,8 sn) şut;
           süre dolunca her hâlükârda */
        let oturan=0; offR.forEach(p=>{ if(p===shooter||p._oob) return; const c=spots.get(p); if(c&&Math.hypot(p.x-c[0],p.y-c[1])<=24) oturan++; });
        const oturdu=(oturan>=2)||(O.holdT>=0.9)||O.putback||O.fastBreak;   /* FAZ 48: gerçek veri */
        if((sutYerinde&&oturdu&&O.holdT>=0.3&&(ts>=O.setDur*0.55||O.putback||O.fastBreak))||kalan<=0.05||(O.holdT>2.4)){ oamAtes(); return; }
      } else {
        let alici=sonraki||shooter;
        const zor=(kalan<=0.9);                            /* bütçe: şutöre zorla */
        let hedef=zor?shooter:alici;
        /* mantıksız pas yoksa köprü: geri / boya içinden / 10 m+ pas yerine ara oyuncu */
        if(!oamPasOlur(carrier,hedef,rim)){
          const k=oamKopru(O,carrier,hedef);
          if(k&&!zor){ hedef=k; if(O.zincir.indexOf(k)<0) O.zincir.splice(zi+1,0,k); }
        }
        const hSpot=spots.get(hedef)||[hedef.x,hedef.y];
        const hYerinde=Math.hypot(hedef.x-hSpot[0],hedef.y-hSpot[1])<=36;
        const bos=oamBos(hedef,defP);
        if(zor){ if(O.holdT>=0.12) oamPas(hedef); }
        else if(O.holdT>=O.holdMin&&(hedef===shooter?sutYerinde:(hYerinde||O.holdT>=O.holdMin+0.5))&&(bos||O.holdT>=O.holdMin+0.4)){
          oamPas(hedef); O.holdMin=0.28+_sr()*0.3;
        }
      }
    } else if(!bizde&&!ucusta&&carrier){ if(O.holdT>0.2){ _ballLoose(0,0,14); _chase(pg,null,2.2); O.holdT=0; } }
    else if(!bizde&&!ucusta&&!S.chase){ let en=null,ed=1e9; offP.forEach(p=>{ if(!p||p._oob) return; const d=Math.hypot(p.x-b.x,p.y-b.y); if(d<ed){ ed=d; en=p; } }); if(en) _chase(en,null,2.0); }
    if(kalan<=-1.2&&!O.atildi){ _ballHold(shooter); oamAtes(); return; }   /* güvenlik: bütçe bitti */
  }

  oamHedefler(S,O);
}

/* ── Hedefler: her karede her oyuncuya TEK hedef ───────────────────────────────────── */
function oamHedefler(S,O){
  const b=S.ball, {offP,defP,offR,defR,rim,dir,shooter,pg,spots,offLeft}=O;
  const carrier=b.carrier, bizde=!!(carrier&&offP.indexOf(carrier)>=0);
  const topX=b.x, topY=b.y;
  const topArkaSaha=offLeft?(topX>COURT_MID):(topX<COURT_MID);
  const ts=(O.faz==='set'&&O.tSet!=null)?(O.t-O.tSet):0;
  /* şuttan 0,7 sn önce ya da top şutördeyken dizilim DONAR: kıpırdanma ve yer değiştirme yok */
  O.donuk=(O.faz==='set'&&((O.tFire-O.t)<0.6||carrier===shooter));   /* FAZ 48: gerçekte şut anında 4'te ~2,3 hareketli */

  /* ── HÜCUM ── */
  offR.forEach((p,i)=>{
    if(!p||p._oob||(S.chase&&S.chase.tok===p)) return;
    if(S._outlet&&(p===S._outlet.c||p===S._outlet.pg)) return;   /* çıkış pası modu hedefleri yazdı */
    const sp=spots.get(p)||[p.x,p.y];
    let tx=sp[0],ty=sp[1],urg=_URG.KOS;
    if(O.faz==='sokma'){
      const spot=O.spot; const ust=spot.y<250;
      if(O.spotOnde){
        /* ön sahada kenar sokması: oyun kurucu topa 5 m (kenara dik); en az iki takım arkadaşı daha
           sokucunun 10 m'sinde (FAZ 48 1b: her epizotta ≥ 3 yakın) — dizilim noktası 13 m'den uzaksa
           nokta ile sokma noktası arasında 9 m'ye çekilir; kalanlar dizilim noktasında */
        if(p===pg){ tx=spot.x+dir*40; ty=ust?spot.y+150:spot.y-150; }
        else {
          if(!O._yakinSec){ O._yakinSec=offR.filter(q=>q!==pg&&q!==O.inb&&!q._oob).map(q=>({q,d:(()=>{ const c=spots.get(q)||[q.x,q.y]; return Math.hypot(c[0]-spot.x,c[1]-spot.y); })()})).sort((a,b2)=>a.d-b2.d).slice(0,2).map(o=>o.q); }
          if(O._yakinSec.indexOf(p)>=0){ const d=Math.hypot(sp[0]-spot.x,sp[1]-spot.y); if(d>384){ const k=266/d; tx=spot.x+(sp[0]-spot.x)*k; ty=spot.y+(sp[1]-spot.y)*k; } }
        }
        urg=(p===pg)?_URG.KOS:_URG.JOG;
      } else {
        const T=[[spot.x+dir*165,(ust?spot.y+65:spot.y-65)],[spot.x+dir*250,(ust?380:120)],null,[spot.x+dir*120,(ust?330:170)],[spot.x+dir*290,(ust?spot.y+40:spot.y-40)]];
        const c=(p===pg)?T[0]:(T[Math.min(i,4)]||null);
        if(c){ tx=c[0]; ty=c[1]; }
        urg=(p===pg||p.role<=1)?_URG.KOS:_URG.JOG;
      }
    } else if(O.faz==='bekle'||O.faz==='gecis'){
      if(p===carrier){
        /* topu süren takımı beklemez ama tek başına da gitmez: üç takım arkadaşından 5 m+ öndeyse
           tempoyu düşürür (kullanıcı: "topu süren çok hızlı, diğerleri geride kalıyor") */
        let onde=0; offR.forEach(q=>{ if(q!==p&&(dir>0?(p.x-q.x):(q.x-p.x))>150) onde++; });
        urg=O.fastBreak?_URG.SPRINT:(onde>=3?_URG.JOG:_URG.KOS);
      }
      else if(p.role===1||p.role===2) urg=_URG.SPRINT;
      else urg=_URG.KOS;
      if(O.fastBreak&&p===shooter){ tx=O.sh.x; ty=O.sh.y; urg=_URG.SPRINT; }
    } else if(O.faz==='set'){
      urg=_URG.KOS;
      /* perde */
      if(O.isPnr&&O.screener&&p===O.screener&&O.perdeEvre>=1){
        const bh=bizde?carrier:pg; const dfn=O.esle.get(bh);
        if(O.perdeEvre<3&&dfn){ const ax=dfn.x-bh.x, ay=dfn.y-bh.y, an=Math.hypot(ax,ay)||1; tx=bh.x+ax/an*34+(-ay/an)*18*(O.screener.y<bh.y?-1:1); ty=bh.y+ay/an*34+(ax/an)*18*(O.screener.y<bh.y?-1:1); urg=_URG.KOS; }
        else { const roll=S._perde&&S._perde.roll; if(roll){ tx=rim[0]+(p===shooter?(O.sh.x-rim[0]):dir*-1*40); ty=rim[1]+(p===shooter?(O.sh.y-rim[1]):40); } else { tx=sp[0]; ty=sp[1]; } urg=_URG.SPRINT; }
      }
      /* topu tutan perdeyi kullanır */
      else if(O.isPnr&&O.screener&&p===carrier&&O.perdeEvre===2){
        const sc=O.screener; const dx=sc.x-p.x, dy=sc.y-p.y, dn=Math.hypot(dx,dy)||1;
        tx=sc.x+dx/dn*38; ty=sc.y+dy/dn*38; urg=_URG.KOS;
      }
      /* kesme */
      else if(O.cutter&&p===O.cutter&&ts>=0.6&&ts<2.2){
        tx=(p===shooter)?O.sh.x:(rim[0]+dir*-1*30); ty=(p===shooter)?O.sh.y:(rim[1]+(p.y<250?-26:26)); urg=_URG.SPRINT;
      }
      /* topu tutan: noktasına sürer, noktasındaysa hafif kıpırdar (şuttan önce donar) */
      else if(p===carrier){
        const d=Math.hypot(p.x-sp[0],p.y-sp[1]);
        if(d<OAM_YERINDE&&!O.donuk){ const c=oamCanli(p,sp[0],sp[1],11,O.ph.get(p)||0); tx=c[0]; ty=c[1]; }
        urg=(d>70)?_URG.KOS:_URG.JOG;
      }
      else {
        const d=Math.hypot(p.x-sp[0],p.y-sp[1]);
        if(d<OAM_YERINDE){ if(!O.donuk){ const c=oamCanli(p,sp[0],sp[1],9,O.ph.get(p)||0); tx=c[0]; ty=c[1]; } urg=_URG.JOG; }
        else urg=(d>70)?_URG.KOS:_URG.JOG;
      }
    }
    oamHedef(p,tx,ty,urg);
  });

  /* ── SAVUNMA: adam adama ── */
  const topTasiyan=bizde?carrier:null;
  defR.forEach((d,i)=>{
    if(!d||d._oob||(S.chase&&S.chase.tok===d)) return;
    const m=offR[i]||offR[0]; if(!m) return;
    let tx,ty,urg=_URG.KOS;
    const dm=oamDR(m,rim);
    if(O.faz==='sokma'&&!O.spotOnde){
      tx=(i<=1)?(COURT_MID+dir*90):(COURT_MID-dir*60); ty=TRANS_DEF[i][1]; urg=(i<=1)?_URG.KOS:_URG.JOG;
      /* FAZ 48 (gerçek: arka sahada savunmacı ort 5,1 m, 0,5-6 m'ye yayılı): alıcının (oyun
         kurucu) savunmacısı onu 3,4 m'den gölgeler, gerisi geri koşar */
      if(i===0&&O.pg&&!O.pg._oob){ const pm=O.pg, pd=oamDR(pm,rim)||1; const g0=Math.min(100,Math.max(0,pd-26)); tx=_inX(pm.x+(rim[0]-pm.x)/pd*g0); ty=_inY(pm.y+(rim[1]-pm.y)/pd*g0); urg=_URG.KOS; }
    } else if((O.faz==='bekle'||O.faz==='gecis')&&topArkaSaha&&m!==topTasiyan){
      /* geri koş: adam-pota hattında %55, potaya en az 90 px (topu tutanın savunmacısı hariç — baskı) */
      const g=Math.max(90,dm*0.45);
      tx=rim[0]+(m.x-rim[0])/(dm||1)*g; ty=rim[1]+(m.y-rim[1])/(dm||1)*g;
      urg=(i>=3)?(O.fastBreak?_URG.KOS:_URG.JOG):(O.fastBreak?_URG.SPRINT:_URG.KOS);   /* guardlar önce döner, uzunlar arkadan */
    } else {
      /* markaj: adam ile pota arasında */
      const onBall=(m===topTasiyan);
      const dmb=Math.hypot(m.x-topX,m.y-topY);
      let g;
      if(onBall){
        /* FAZ 48 (gerçek ön saha: %21'i 1 m altı, ort 2,0 m; arka saha ort 5,1 m): çemberin
           içinde 0,75 m, dışında 1,0 m; uzun çemberin dışındaysa gevşek 2 m; arka sahada
           orta çizgiden uzaklaştıkça 1,3 → 3,7 m */
        if(topArkaSaha) g=38+70*Math.min(1,Math.abs(m.x-COURT_MID)/220);
        else if((m.role|0)>=3&&dm>THREE_R-30) g=58;
        else g=(dm<THREE_R-10)?22:30;
      }
      else {
        g=_defGap(dmb);
        const topIcerde=Math.hypot(topX-rim[0],topY-rim[1])<THREE_R-40;
        if(topIcerde&&dmb>200) g=Math.min(dm-30,70);         /* yardım: boyaya sark */
      }
      g=Math.min(g,Math.max(0,dm-26));
      tx=m.x+(rim[0]-m.x)/(dm||1)*g; ty=m.y+(rim[1]-m.y)/(dm||1)*g;
      const dd=Math.hypot(d.x-tx,d.y-ty);
      urg=onBall?_URG.KOS:(dd>90?_URG.KOS:_URG.JOG);
      d._mark=m;
      /* kıpırdanma adam–pota hattı ÜZERİNDE (radyal): hattan çıkmaz, ball-you-man bozulmaz */
      if(dd<OAM_YERINDE&&!O.donuk){ const k=5*Math.sin(S.time*2.1+(O.ph.get(d)||0)); const ux=(rim[0]-m.x)/(dm||1), uy=(rim[1]-m.y)/(dm||1); tx+=ux*k; ty+=uy*k; }
    }
    oamHedef(d,tx,ty,urg);
  });
}

/* ── FAZ 48 (c3): ARKA SAHADA BASKI — OAM aktif değilken (eski geçiş kodu: ribaund/çalma/sayı
   sonrası, sıradaki olay gelene dek) topu tutan hücumcunun rol karşılığı savunmacı onu takip
   eder: orta çizgide 1,3 m, kendi dip çizgisine doğru 3,7 m'ye açılır (gerçek SportVU arka saha
   ort 5,1 m, 0,5-6 m'ye yayılı; motorda 8,2 m — savunma kendi yarı sahasında bekliyordu).
   Ön saha OAM set fazına aittir, buraya girmez. ────────────────────────────────────── */
function oamBaskiTick(S,dt){
  try{
    const b=S.ball, c=b.carrier;
    if(!c||b.mode!=='held'||c._oob||S._ftAktif||(S._hakemTop&&S._hakemTop.aktif)) return;
    const offP=S.offP||[], defP=S.defP||[]; if(offP.indexOf(c)<0||defP.length<5) return;
    const t=(S.curType||''); if(t==='free'||t==='mola'||t==='quarter_end'||t==='end'||t==='start') return;
    const offLeft=S.offSide; if(offLeft==null) return;
    const rim=_rim(offLeft);
    const arka=offLeft?(c.x>COURT_MID):(c.x<COURT_MID); if(!arka) return;
    const offR=_rolesOrder(offP), defR=_rolesOrder(defP); const i=offR.indexOf(c); const d=defR[i]; if(!d||d._oob||(S.chase&&S.chase.tok===d)) return;
    const dm=oamDR(c,rim)||1; let g=38+70*Math.min(1,Math.abs(c.x-COURT_MID)/220); g=Math.min(g,Math.max(0,dm-26));
    d.tx=_inX(c.x+(rim[0]-c.x)/dm*g); d.ty=_inY(c.y+(rim[1]-c.y)/dm*g); d._wp=null; _setUrg(d,_URG.KOS); d._lock=S.time+0.1; d._mark=c;
  }catch(e){}
}

/* ── FAZ 48 (c4): SOKMA PASI OLAYI BEKLEMEZ — sayı/serbest atış sonrası sokucu çizgiye varıp
   0,7 sn geçince (oyun kurucu 14 m içindeyse) pası atar; eski kod pası sıradaki olayın betiğine
   bırakıyordu ve OAM o betiği yeniden kurduğu için sokucu çizgi dışında olay gelene dek (1-5,5 sn,
   savunmacı 10,6 m) topu tutuyordu. Pas atılınca `S._yavasCik` açılır: oyun kurucu topu orta
   çizgiye JOG ile getirir, orada sürerek olayı bekler (gerçekte "topu yürütmek"). ────────── */
function oamSokmaTick(S,dt){
  try{
    const I=S.inb, b=S.ball;
    if(!I||!I.tok||b.carrier!==I.tok||b.mode!=='held'||S._ftAktif||(S._hakemTop&&S._hakemTop.aktif)){ S._sokmaT=0; return; }
    const t=(S.curType||''); if(!(/^score/.test(t)||t==='free')) return;   /* yalnız sayı / serbest atış sonrası dip çizgi sokması */
    const inb=I.tok; if(Math.hypot(inb.x-I.x,inb.y-I.y)>16){ S._sokmaT=0; return; }
    S._sokmaT=(S._sokmaT||0)+dt; if(S._sokmaT<0.7) return;
    const offR=_rolesOrder(S.offP||[]);
    const pg=offR.find(p=>p!==inb&&p.role===0)||offR.find(p=>p!==inb&&p.role===1)||offR.find(p=>p!==inb&&_tasiyabilir(p)); if(!pg) return;
    if(Math.hypot(pg.x-inb.x,pg.y-inb.y)>_SOKMA_MAX_PX) return;
    S._sokmaT=0; S._yavasCik=true;
    _inboundPass(inb,pg,0.32);
    /* eski betiğin temizliği (yoksa OAM sıradaki olayda "sokma bekleniyor" sanıp sokucuyu topa koşturur) */
    _oobKapat(inb); inb._wp=null; S.inb=null; S._sokmaBekle=null;
  }catch(e){}
}
function oamYuruTick(S,dt){
  try{
    if(!S._yavasCik) return;
    const b=S.ball, c=b.carrier;
    if(!c||b.mode!=='held'||c._oob||S.inb){ return; }
    const offP=S.offP||[]; if(offP.indexOf(c)<0){ S._yavasCik=false; return; }
    const offLeft=S.offSide; if(offLeft==null) return; const dir=offLeft?-1:1;
    const arka=offLeft?(c.x>COURT_MID):(c.x<COURT_MID); if(!arka){ S._yavasCik=false; return; }
    if(!_tasiyabilir(c)) return;   /* uzun tutuyorsa çıkış pası (oamOutletTick) halleder */
    /* hedef: orta çizginin 2 m gerisi, kendi kenar tarafında hafifçe */
    const tx=_inX(COURT_MID-dir*60), ty=_inY(250+(c.y<250?-40:40));
    const d=Math.hypot(c.x-tx,c.y-ty);
    if(d>28){ c.tx=tx; c.ty=ty; _setUrg(c,_URG.JOG); } else { c.tx=c.x; c.ty=c.y; _setUrg(c,_URG.YURU); }
    c._wp=null; c._lock=S.time+0.1;
  }catch(e){}
}

/* ── HAKEMLER (FAZ 47, kullanıcı isteği): FIBA üçlü hakem — baş (dip çizgi), arka (oyunun
   gerisi), orta (serbest atış çizgisi hizası, karşı kenar). Jeton değildir: çarpışmaya, ölçüme,
   takibe girmez; her karede hedefe doğru yumuşak kayar. Serbest atışta topu BAŞ HAKEM getirir
   (oyuncu ribaunt alıp atıcıya pas vermez). ───────────────────────────────────────────── */
function oamHakemKur(S){
  try{
    if(S.hakem||typeof document==='undefined') return;
    const layer=document.getElementById('playersLayer'); if(!layer) return;
    const mk=(etiket)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('class','court-token court-ref');
      const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('r','11'); c.setAttribute('fill','#4b5563'); c.setAttribute('stroke','rgba(255,255,255,0.75)'); c.setAttribute('stroke-width','2');
      const s=document.createElementNS('http://www.w3.org/2000/svg','path');
      s.setAttribute('d','M-11 0 H11'); s.setAttribute('stroke','rgba(255,255,255,0.55)'); s.setAttribute('stroke-width','3');
      const t=document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('text-anchor','middle'); t.setAttribute('dy','4'); t.setAttribute('font-size','11'); t.setAttribute('font-weight','800');
      t.setAttribute('fill','#fff'); t.setAttribute('pointer-events','none'); t.textContent=etiket;
      g.appendChild(c); g.appendChild(s); g.appendChild(t);
      layer.insertBefore(g,layer.firstChild);   /* oyuncuların altında çizilir */
      return g;
    };
    /* maç başı: orta hakem çemberde (hava atışını o atar), diğer ikisi dip çizgi dışında */
    S.hakem=[{ad:'bas',g:mk('H'),x:CRT_X0-16,y:250,tx:CRT_X0-16,ty:250},
             {ad:'arka',g:mk('H'),x:CRT_X1+16,y:250,tx:CRT_X1+16,ty:250},
             {ad:'orta',g:mk('H'),x:COURT_MID,y:250,tx:COURT_MID,ty:250}];
    S.hakem.forEach(h=>_tokSet(h.g,h.x,h.y,1));
  }catch(e){}
}
function oamHakemTick(S,dt){
  try{
    if(!S.hakem) oamHakemKur(S); if(!S.hakem) return;
    const b=S.ball; const offLeft=(S.offSide!=null)?S.offSide:(b.x<COURT_MID);
    const rim=_rim(offLeft); const dir=offLeft?-1:1;
    const [bas,arka,orta]=S.hakem;
    const topUst=(b.y<250);
    /* Hakemler ÇİZGİNİN DIŞINDA durur (FAZ 47 ilk sürümde işaret hatası: 14 px İÇERİDE — kullanıcı
       "hakemler oyuncu gibi sahanın içinde dolaşıyor"). Dip çizgi: x = çizgi ∓ 16; kenar: y = çizgi ± 16. */
    const dipX=offLeft?(CRT_X0-16):(CRT_X1+16);        /* hücum edilen dip çizginin dışı */
    const ustY=CRT_Y0-16, altY=CRT_Y1+16;              /* kenar çizgilerinin dışı */
    const havaAtisi=(!S.curType||S.curType==='start')&&S.time<3.5&&(mState.idx|0)<=2;
    if(havaAtisi){
      /* hava atışı: orta hakem çemberde topu atar (top oradan yükselir), diğer ikisi kenarda */
      orta.tx=COURT_MID; orta.ty=250;
      bas.tx=CRT_X0-16; bas.ty=250; arka.tx=CRT_X1+16; arka.ty=250;
    } else if(S._hakemTop&&S._hakemTop.aktif){
      bas.tx=b.x; bas.ty=b.y;                                                      /* baş hakem topu almaya gider */
    } else if(S._ftAktif){
      bas.tx=dipX; bas.ty=250-46;                                                  /* dip çizgi dışı, potanın yanı */
      arka.tx=_inX(rim[0]-dir*(THREE_R+60)); arka.ty=altY;
      orta.tx=_inX(rim[0]-dir*150); orta.ty=ustY;
    } else {
      /* baş: hücum edilen dip çizginin dışı, top tarafı · arka: topun 5 m gerisi, karşı kenar dışı · orta: SA çizgisi hizası, top tarafı kenar dışı */
      bas.tx=dipX; bas.ty=topUst?170:330;
      const geriX=b.x-dir*170; arka.tx=Math.max(CRT_X0+20,Math.min(CRT_X1-20,geriX)); arka.ty=topUst?altY:ustY;
      orta.tx=_inX(rim[0]-dir*165); orta.ty=topUst?ustY:altY;
    }
    S.hakem.forEach(h=>{
      const dx=h.tx-h.x, dy=h.ty-h.y, d=Math.hypot(dx,dy);
      const v=(S._hakemTop&&S._hakemTop.aktif&&h===bas)?190:125;
      const adim=Math.min(d,v*dt);
      if(d>0.5){ h.x+=dx/d*adim; h.y+=dy/d*adim; }
      _tokSet(h.g,h.x,h.y,1);
    });
    /* serbest atış: baş hakem topa varınca topu atıcıya verir */
    const HT=S._hakemTop;
    if(HT&&HT.aktif){
      HT.t=(HT.t||0)+dt;
      S._sahipsizT=0;                                            /* bekçi oyuncu yollamasın */
      const d=Math.hypot(bas.x-b.x,bas.y-b.y);
      if(!b.carrier&&(d<=16||HT.t>2.2)){
        const sh=HT.shooter; HT.aktif=false;
        if(sh&&isFinite(sh.x)){ const dd=Math.hypot(sh.x-b.x,sh.y-b.y); b.h=Math.max(b.h||0,14); _ballPass(sh,Math.max(0.35,Math.min(0.9,dd/330))); }
      } else if(b.carrier){ HT.aktif=false; }
    }
  }catch(e){}
}
/** Serbest atış arası: top oyuncuya değil HAKEME — eski `_ftToplayici` sarmalanır. */
function oamFtToplayici(shooter,offP,defP,rim,made){
  try{
    const S=oamS(); if(!S||!shooter) return;
    const b=S.ball;
    if(!made){ const a=_sr()*6.283; _ballCarom(Math.cos(a)*40,Math.sin(a)*36,_srand(30,38)); }   /* kısa düşüş, oyuncu almaz */
    S.chase=null;
    S._hakemTop={aktif:true,shooter,t:0};
  }catch(e){}
}

/* ── ÇIKIŞ PASI MODU (OAM dışı anlar — ribaund/çalma sonrası): uzun topu SÜRMEZ, yerinde döner;
   oyun kurucu çıkış noktasına gelir (uzunun 5 m önü, yakın kenar tarafı), 14 m'ye girince pas.
   Kullanıcı: "ribaund alınınca 1 numara topu almaya gelsin — 4-5 numaralar top sürüyor". ── */
function oamOutletTick(S,dt){
  try{
    const b=S.ball; const c=b.carrier;
    if(!c||b.mode!=='held'||c._oob||S._ftAktif||S.inb||(S._hakemTop&&S._hakemTop.aktif)) { S._outlet=null; return; }
    const offP=S.offP||[]; if(offP.indexOf(c)<0||_tasiyabilir(c)) { S._outlet=null; return; }
    const offLeft=S.offSide; if(offLeft==null) return;
    const rim=_rim(offLeft), dir=offLeft?-1:1;
    if(oamDR(c,rim)<=_POTA_YAKIN_PX) { S._outlet=null; return; }   /* pota dibinde: kendi bitirir */
    const t=(S.curType||''); if(t==='free'||t==='foul'||t==='mola'||t==='quarter_end'||t==='end'||t==='start'||t==='quarter_start') return;
    const offR=_rolesOrder(offP);
    let pg=offR.find(p=>p!==c&&p.role===0)||offR.find(p=>p!==c&&p.role===1)||offR.find(p=>p!==c&&_tasiyabilir(p)); if(!pg) return;
    if(!S._outlet||S._outlet.c!==c){ S._outlet={c,pg,t:0}; }
    const O2=S._outlet; O2.t+=dt;
    /* uzun yerinde döner (topu sürmez) */
    c.tx=c.x; c.ty=c.y; c._wp=null; _setUrg(c,_URG.YURU);
    /* oyun kurucu çıkış noktasına: uzunun 5 m önü, yakın kenar tarafı */
    const ox=_inX(c.x+dir*150), oy=_inY(c.y<250?Math.max(CRT_Y0+40,c.y-70):Math.min(CRT_Y1-40,c.y+70));
    pg.tx=ox; pg.ty=oy; pg._wp=null; _setUrg(pg,_URG.SPRINT);
    const d=Math.hypot(pg.x-c.x,pg.y-c.y);
    /* çıkış pası HER ZAMAN guard'a (M9): PG 14 m'ye girince; gelmiyorsa 3 sn'ye kadar uzun
       yerinde bekler (pivot), sonra yine PG'ye uzun pas — uzuna/SF'ye çıkış yok. */
    /* FAZ 48: guard uzunun ÖNÜNDE olmalı (dir yönünde) — geride kalan guard'a çıkış "geri pas"tır */
    const onde=(dir*(pg.x-c.x)>-20);
    if((d<=_SOKMA_MAX_PX&&onde&&O2.t>=0.25)||O2.t>=3.0){
      const g2=(d<=_SOKMA_MAX_PX)?pg:(offR.find(p=>p!==c&&(p.role===0||p.role===1)&&Math.hypot(p.x-c.x,p.y-c.y)<=_SOKMA_MAX_PX)||pg);
      if(g2&&g2!==c){ _ballPass(g2,Math.max(0.36,Math.min(1.1,Math.hypot(g2.x-c.x,g2.y-c.y)/380))); if(typeof sfx==='function') sfx('pass'); }
      S._outlet=null;
    }
  }catch(e){}
}

/* ── TÖRENLER (FAZ 48 · 1c): hava atışı · periyot/maç sonu · serbest atış · mola — hedefler OAM'dan.
   Eski dallar top koreografisini (toss, atış dizisi, mola betiği) sürdürür; oyuncu HEDEFLERİNİ
   yalnız OAM yazar: `_hedefAta` tören boyunca kapalıdır (sarmalayıcı), noktalar burada üretilir.
   ─────────────────────────────────────────────────────────────────────────────────────── */
function oamTorenSpotlari(S,tip,ev){
  const m=new Map();
  const userLeft=(mState.userIsHome!==false);
  if(tip==='start'){
    const hc=S.home.find(p=>p.role===4)||S.home[S.home.length-1];
    const ac=S.away.find(p=>p.role===4)||S.away[S.away.length-1];
    m.set(hc,[userLeft?489:451,250]); m.set(ac,[userLeft?451:489,250]);
    const near=[[360,176],[360,324],[300,250],[212,250]], far=near.map(_mir);
    const hS=userLeft?far:near, aS=userLeft?near:far;
    S.home.filter(p=>p!==hc).forEach((p,i)=>m.set(p,[_jit(hS[i%4][0],6),_jit(hS[i%4][1],6)]));
    S.away.filter(p=>p!==ac).forEach((p,i)=>m.set(p,[_jit(aS[i%4][0],6),_jit(aS[i%4][1],6)]));
    return m;
  }
  if(tip==='quarter_end'||tip==='end'||tip==='mvp'){
    const near=[[428,250],[400,150],[400,350],[352,196],[352,308]], far=near.map(_mir);
    const hs=userLeft?far:near, as=userLeft?near:far;
    S.home.forEach((p,i)=>m.set(p,hs[i%5])); S.away.forEach((p,i)=>m.set(p,as[i%5]));
    return m;
  }
  if(tip==='free'){
    const off=_eventOff(ev); const offP=off?S.home:S.away, defP=off?S.away:S.home;
    const offLeft=offLeftAtQ(off,(ev&&ev.q)||mState.quarter||1);
    const line=_pt([FT_LINE_X,250],offLeft,false);
    let shooter=(ev.sid!=null)?offP.find(p=>p.pl&&p.pl.id===ev.sid):null;
    if(!shooter){ let sd=1e9; shooter=offP[0]; offP.forEach(p=>{ const d=Math.hypot(p.x-line[0],p.y-line[1]); if(d<sd){sd=d;shooter=p;} }); }
    const bigFirst=(arr)=>_rolesOrder(arr).slice().reverse();
    m.set(shooter,[line[0],line[1]]);
    bigFirst(offP).filter(p=>p!==shooter).forEach((p,i)=>{ const c=_pt(FT_OFF_S[i%FT_OFF_S.length],offLeft,false); m.set(p,[_jit(c[0],2),_jit(c[1],2)]); });
    bigFirst(defP).forEach((p,i)=>{ const c=_pt(FT_DEF_S[i%FT_DEF_S.length],offLeft,false); m.set(p,[_jit(c[0],2),_jit(c[1],2)]); });
    m._shooter=shooter; m._offP=offP; m._defP=defP; m._offLeft=offLeft;
    return m;
  }
  if(tip==='mola'){
    const bY=CRT_Y1-52; const hold=(S.inb&&S.inb.tok)||null;
    const huddle=(takim,cx)=>{ takim.filter(p=>p!==hold).forEach((p,i)=>{ const a=-Math.PI/2+(i-2)*0.42; m.set(p,[_inX(cx+Math.cos(a)*40),_inY(bY+Math.sin(a)*22+16)]); }); };
    huddle(S.home,COURT_MID-176); huddle(S.away,COURT_MID+176);
    if(hold&&S.inb) m.set(hold,[S.inb.x,S.inb.y]);
    return m;
  }
  return m;
}
function oamTorenKur(S,tip,ev){
  try{
    const spots=oamTorenSpotlari(S,tip,ev); if(!spots||!spots.size) return false;
    S.script=S.script||[];
    const O={aktif:true,sutsuz:true,torenSahibi:true,faz:'toren',torenTip:tip,t:0,sh:null,shooter:spots._shooter||null,pg:null,
      offP:spots._offP||S.offP||S.home,defP:spots._defP||S.defP||S.away,offR:[],defR:[],offLeft:(spots._offLeft!=null?spots._offLeft:S.offSide),dir:1,rim:[0,0],
      spots,zincir:[],zi:0,holdT:0,holdMin:0.6,scheme:null,fastBreak:false,putback:false,iso:false,isPnr:false,screener:null,cutter:null,postup:false,
      degisim:null,degisti:true,inb:null,spot:null,tFire:99,tInb:0,tAdv:0,setDur:99,tSet:null,tGecis:null,res:null,onShoot:null,atildi:false,perdeEvre:0,
      esle:new Map(),ph:new Map(),zorla:false,sutT:null,_snapSeen:(S._snapN|0),atisN:0,atisToplam:(tip==='free'&&ev&&ev.shots)?Math.min(3,ev.shots.length):0,sonMod:null};
    (S.players||[]).forEach((p,i)=>O.ph.set(p,i*1.3));
    S.oam=O; S.canliSet=false; S._setIstek=false; S.defTrack=false; S.cikisSonra=1e9;
    /* hedefler HEMEN yazılır: eski dalın bekleme tahmini (`_ftWaitSec`) ve `_ftHazir` kapısı `p.tx`
       okur — tören OAM'a geçince ilk karede eski hedefler kalıyor, serbest atış erken patlıyordu
       (F14-7 9,8 → 6,7/10, en uzak 7,3 m). */
    O.spots.forEach((c,p)=>{ if(p&&!p._oob){ const d=Math.hypot(p.x-c[0],p.y-c[1]); oamHedef(p,c[0],c[1],d>110?_URG.KOS:_URG.JOG); } });
    return true;
  }catch(e){ return false; }
}
/** Tören bitti → şutsuz geçiş/set (hava atışı ve mola sonrası): hücum takımı S'ten okunur. */
function oamSutsuzGecis(S,O,faz){
  try{
    const offP=S.offP, defP=S.defP; if(!offP||!defP||S.offSide==null) return false;
    const offLeft=S.offSide, rim=_rim(offLeft), dir=offLeft?-1:1;
    const offR=_rolesOrder(offP), defR=_rolesOrder(defP);
    const pg=(S.ball.carrier&&offP.indexOf(S.ball.carrier)>=0&&_tasiyabilir(S.ball.carrier))?S.ball.carrier:(offR.find(p=>p.role===0)||offR.find(p=>_tasiyabilir(p))||offR[0]);
    const spots=oamSpotlar(S,offLeft,offR);
    let icerde=false; spots.forEach((c)=>{ if(Math.hypot(c[0]-rim[0],c[1]-rim[1])<150) icerde=true; });
    if(!icerde){ const uzun=offR.filter(p=>p!==pg).sort((a,b2)=>(b2.role|0)-(a.role|0))[0]; if(uzun) spots.set(uzun,[_inX(rim[0]+dir*44),_inY(250+(_sr()<0.5?54:-54))]); }
    Object.assign(O,{torenSahibi:false,faz,offP,defP,offR,defR,offLeft,dir,rim,pg,spots,zincir:[pg],tGecis:O.t,tSet:(faz==='set')?O.t:null,esle:new Map()});
    offR.forEach((p,i)=>{ O.esle.set(p,defR[i]||defR[0]); });
    return true;
  }catch(e){ return false; }
}
/** Tören karesi: hedefler + geçiş kararları. */
function oamTorenTick(S,O,dt){
  const b=S.ball;
  if(O.torenTip==='start'&&O.t>=2.05&&S.offP&&S.offSide!=null){ oamSutsuzGecis(S,O,'gecis'); return; }
  if(O.torenTip==='mola'&&O.t>=1.3&&S.offP){ oamSutsuzGecis(S,O,'set'); return; }
  if(O.torenTip==='free'){
    if(b.mode==='shot'&&O.sonMod!=='shot') O.atisN++;
    O.sonMod=b.mode;
    if(O.atisToplam&&O.atisN>=O.atisToplam){ oamBitir(); return; }   /* son atış elden çıktı: ribaund/sokma eski koda */
  }
  /* hedefler: tören noktaları (çizgi dışı izinli ve takipteki jeton hariç) */
  (S.players||[]).forEach(p=>{
    if(!p||p._oob||(S.chase&&S.chase.tok===p)) return;
    const c=O.spots.get(p); if(!c) return;
    const d=Math.hypot(p.x-c[0],p.y-c[1]);
    oamHedef(p,c[0],c[1],d>110?_URG.KOS:_URG.JOG);
  });
}

/* ── Bağlama (eski fonksiyonlar sarmalanır; `OAM_ACIK=false` ile eski yol geri gelir) ── */
(function oamBagla(){
  if(typeof animateShotPossession!=='function'||typeof _simTick!=='function'||typeof movePlayersForEvent!=='function') return;
  const _eskiSut=animateShotPossession;
  animateShotPossession=function(sh,onShoot,onResult){
    if(!OAM_ACIK) return _eskiSut(sh,onShoot,onResult);
    try{ return oamSut(sh,onShoot,onResult); }catch(e){ try{ console.warn('OAM',e); }catch(_){} return _eskiSut(sh,onShoot,onResult); }
  };
  const _eskiTick=_simTick;
  _simTick=function(dt){
    const S=oamS(); const O=S&&S.oam; const aktif=!!(O&&O.aktif);
    if(aktif){
      try{ oamTick(dt); }catch(e){ try{ console.warn('OAM tick',e); }catch(_){} }
    }
    if(!aktif&&S){ try{ oamSokmaTick(S,dt); }catch(e){} try{ oamYuruTick(S,dt); }catch(e){} try{ oamOutletTick(S,dt); }catch(e){} try{ oamBaskiTick(S,dt); }catch(e){} }
    else if(S){ S._yavasCik=false; S._sokmaT=0; }
    /* F11-1: arka plandan dönüşte `_simCatchUp` jetonları ESKİ hedeflerine ışınlar ve aynı karede
       OAM / çıkış pası modu YENİ hedef yazar; jetonlar yeniden yola çıkmasın diye yeni hedefe de
       oturtulur — OAM aktif olsun olmasın (`S._snapN` sayacı bu karede değiştiyse). */
    try{
      if(S&&(S._snapN|0)!==(S._oamSnapSeen|0)){
        S._oamSnapSeen=S._snapN|0;
        (S.players||[]).forEach(p=>{ if(!p||p._oob||!isFinite(p.tx)) return; p.x=_inX(p.tx); p.y=_inY(p.ty); p.vx=0; p.vy=0; try{ _tokSet(p.g,p.x,p.y,p.sc); }catch(_){} });
        if(S.ball&&S.ball.carrier){ S.ball.x=S.ball.carrier.x; S.ball.y=S.ball.carrier.y; }
      }
    }catch(e){}
    if(aktif&&S){ const cs=S.canliSet; S.canliSet=false; S.defTrack=false; _eskiTick(dt); S.canliSet=cs;
      /* FAZ 48: ölçüm araçları (spacing-check) set fazını `S.defTrack`ten okur — tick sonrası
         damga; eski tick içinde hep false kalır (eski yazıcılar kapalı) */
      S.defTrack=(S.oam.faz==='set'); }
    else _eskiTick(dt);
    if(S){ try{ oamHakemTick(S,dt); }catch(e){} }
  };
  if(typeof _ftToplayici==='function'){ _ftToplayici=oamFtToplayici; }
  const _eskiMove=movePlayersForEvent;
  const OLU_TOP=['foul','sakatlikMac','tac','ihlal','hucumFaulu','ihlal24','quarter_start'];
  const TOREN_ON=['start','quarter_end','end','mvp'];          /* eski daldan ÖNCE OAM sahiplenir */
  movePlayersForEvent=function(ev,paint){
    try{ const S=oamS(); if(S&&S.oam&&S.oam.aktif){ S.oam.aktif=false; S.cikisSonra=0; } }catch(e){}
    const t=ev&&ev.type;
    const ftMi=!!(ev&&ev.shots&&ev.shots.length&&ev.shots[0].kind==='ft');
    try{ const S=oamS(); if(OAM_ACIK&&S&&S.players&&S.players.length>=10){ if(TOREN_ON.indexOf(t)>=0) oamTorenKur(S,t,ev); else if(ftMi) oamTorenKur(S,'free',ev); } }catch(e){}
    const r=_eskiMove(ev,paint);
    try{ const S=oamS(); if(S) S._erkenReb=false; }catch(e){}   /* FAZ 48 d4: bayrak yalnız o olaya aittir */
    try{
      const S=oamS();
      if(OAM_ACIK&&S){
        if(OLU_TOP.indexOf(t)>=0&&!(t==='quarter_start'&&ev.q===1)) oamOluTop(S);
        else if(t==='mola') oamTorenKur(S,'mola',ev);
      }
    }catch(e){}
    return r;
  };
  /* Tören boyunca eski koreografinin hedef yazıcısı KAPALI (tek hedef yazıcı: OAM). */
  if(typeof _hedefAta==='function'){
    const _eskiHedefAta=_hedefAta;
    _hedefAta=function(p,tx,ty,urg){ try{ const S=oamS(); if(OAM_ACIK&&S&&S.oam&&S.oam.aktif&&S.oam.torenSahibi) return; }catch(e){} return _eskiHedefAta(p,tx,ty,urg); };
  }
})();
