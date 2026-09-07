/* ═══════════════════════════════════════════════════════════════════════════════════
   Charazay 2.0 — js/sahne-klip.js · FAZ 50 · GERÇEK POZİSYON KLİPLERİ

   Kullanıcı (FAZ 49 sonrası): "inanılmaz saçma tek paslar yapılıyor, gerçek basketbolda böyle
   bir şey yok … gerçek basketbol görüntüsünü maç kaydını nereden bulacaksan bul, radikal
   değişiklik yap." Elle yazılmış koreografi (OAM) altı fazda gerçek dağılımlara yaklaştırıldı
   ama basketbolun AKIŞI (kim ne zaman kime pas atar, kim nereye koşar) hâlâ kural listesiydi.

   Bu katman koreografiyi GERÇEK MAÇ KAYDIYLA değiştirir: `js/klip-data.js` içinde SportVU
   2015-16'dan çıkarılmış, şutla biten 696 gerçek pozisyon (10 oyuncu + top, 5 kare/sn) durur.
   Şut olayı gelince motorun kararı (şutör · şut noktası · sonuç) korunur; sahne o şuta en yakın
   gerçek pozisyonu seçer ve 10 jetonu + topu o kaydın yörüngesinde OYNATIR (kinematik):
     · oyuncu eşlemesi rol sırasıyla (PG,SG,SF,PF,C ↔ G,G,F,F,C), motorun şutörü klibin şutörüne
     · ilk 1 sn'de jetonlar bulundukları yerden klibin başlangıç konumuna harmanlanır (blend)
     · son 1,5 sn'de şutör + top motorun şut noktasına kaydırılır (küçük ofset; klip zaten yakın)
     · elden çıkış anında top eski sözleşmeye devredilir (`oamAtes`: ön parça/sonuç senkronu,
       blok, AND-1, ribaunt mücadelesi, sayı sonrası sokma) — motor sonucu değişmez
   Sahne kararları YALNIZ sahne PRNG'sinden (`_sr`/`_srand`): maç akışı kaymaz.
   `KLIP_ACIK=false` OAM'a döner. Klip bulunamazsa (putback, veri yok) OAM çalışır.
   ═══════════════════════════════════════════════════════════════════════════════════ */

const KLIP_ACIK=true;
const KLIP_HIZ=1.2;          /* klip oynatma hızı (gerçek zamanın katı); 1,3 ile ekran hızı ort 2,36 m/sn ↔ gerçek 1,72 */
const KLIP_BLEND=1.0;        /* sn — mevcut konumdan klip başlangıcına harman */
const KLIP_WARP=1.5;         /* sn — şut noktası ofseti bu pencerede biner */
const KLIP_FT=0.3048, KLIP_SAHA_X=94, KLIP_SAHA_Y=50;
const KLIP_TUTMA_FT=4.0;     /* top oyuncuya bu kadar yakınsa "elinde" */

let _klipD=null;             /* çözülmüş veri: {fps, klip:[meta], v:Int16Array} */
function klipVeri(){
  if(_klipD) return _klipD;
  try{
    if(typeof KLIP_VERI==='undefined'||!KLIP_VERI||!KLIP_VERI.b64) return null;
    const bin=atob(KLIP_VERI.b64); const u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
    _klipD={fps:KLIP_VERI.fps||5,klip:KLIP_VERI.klip,v:new Int16Array(u8.buffer),son:[]};
  }catch(e){ try{ console.warn('KLIP veri',e); }catch(_){} _klipD=null; }
  return _klipD;
}
/* klip koordinatı (ft, hücum sola) → sahne px */
function klipPx(xf,yf,offLeft,flip){
  const W=CRT_X1-CRT_X0, H=CRT_Y1-CRT_Y0;
  const x=offLeft?(CRT_X0+xf/KLIP_SAHA_X*W):(CRT_X1-xf/KLIP_SAHA_X*W);
  const yy=flip?(KLIP_SAHA_Y-yf):yf;
  return [x,CRT_Y0+yy/KLIP_SAHA_Y*H];
}
/* sahne px → klip koordinatı (ft, hücum sola; flip uygulanmadan) */
function klipFt(x,y,offLeft){
  const W=CRT_X1-CRT_X0, H=CRT_Y1-CRT_Y0;
  const xf=offLeft?((x-CRT_X0)/W*KLIP_SAHA_X):((CRT_X1-x)/W*KLIP_SAHA_X);
  return [xf,(y-CRT_Y0)/H*KLIP_SAHA_Y];
}
const KLIP_SINIF=['G','G','F','F','C'];
/* Klip seçimi: başlangıç durumu + şut geometrisi + şutör sınıfı; en iyi 6 arasından sahne PRNG'siyle */
function klipSec(bas,shPx,offLeft,sutSinif,fb,topPx){
  const D=klipVeri(); if(!D||!D.klip.length) return null;
  const [ex,ey]=klipFt(shPx[0],shPx[1],offLeft);
  const topFt=topPx?klipFt(topPx[0],topPx[1],offLeft):null;
  const eDx=ex-5.25, eDy=ey-25; const eD=Math.hypot(eDx,eDy), eA=Math.atan2(eDy,eDx);
  const izin={sokma:['sokma','ribaund'],ribaund:['ribaund','sokma'],gecis:['gecis','ribaund'],onsaha:['onsaha']}[bas]||null;
  const aday=[];
  D.klip.forEach((k,i)=>{
    let c=0;
    if(izin&&izin.indexOf(k.b)<0) c+=1.4;
    if(fb){ if(k.s>7) c+=1.2; } else if(k.s<4&&k.b!=='onsaha') c+=0.6;
    c+=Math.max(0,k.s-13)*0.25;   /* uzun klip anlatımı susturur (realism: en uzun boşluk 21,7 sn ölçüldü) */
    const kDx=k.x-5.25; let en=1e9,fl=false;
    for(const f of [false,true]){ const kDy=f?(25-k.y):(k.y-25); const d=Math.hypot(kDx,kDy), a=Math.atan2(kDy,kDx); let da=Math.abs(a-eA); if(da>Math.PI) da=2*Math.PI-da; const cc=Math.abs(d-eD)/3+da/0.5; if(cc<en){ en=cc; fl=f; } }
    c+=en;
    /* topun ŞU ANKİ yeri klibin başlangıcına uzaksa harman ışınlama gibi görünür (ölçüldü: 396 sn'de
       top 1 sn'de 14 m "uçtu", 47 m/sn) — ilk karedeki top uzaklığı (ft) maliyete girer */
    if(topFt){ const bx=D.v[k.o]/10, by0=D.v[k.o+1]/10; const by=fl?(KLIP_SAHA_Y-by0):by0; c+=Math.hypot(bx-topFt[0],by-topFt[1])/9; }
    if(k.c!==sutSinif) c+=0.8;
    if(D.son.indexOf(i)>=0) c+=2.0;
    aday.push({i,c,fl});
  });
  aday.sort((a,b)=>a.c-b.c);
  const ust=aday.slice(0,6); const sec=ust[_srand(0,ust.length-1)];
  D.son.push(sec.i); if(D.son.length>10) D.son.shift();
  return {k:D.klip[sec.i],ix:sec.i,flip:sec.fl};
}
/* Klip karesi (ara değerli): dizi [bx,by,bz, o0..o4, d0..d4] (ft) */
function klipKare(D,k,tau){
  const fi=Math.max(0,Math.min(k.n-1,tau*D.fps)); const i0=Math.floor(fi), i1=Math.min(k.n-1,i0+1), w=fi-i0;
  const a=k.o+i0*23, b=k.o+i1*23; const out=new Array(23);
  for(let j=0;j<23;j++) out[j]=(D.v[a+j]*(1-w)+D.v[b+j]*w)/10;
  return out;
}

/* ── Pozisyon kurulumu (animateShotPossession yerine; klip yoksa OAM) ───────────────── */
function klipSut(sh,onShoot,onResult){
  const S=oamS(); if(!S) return 0;
  const D=klipVeri(); if(!D||sh.pb) return oamSut(sh,onShoot,onResult);
  const b=S.ball;
  const offLeft=S.offSide!=null?S.offSide:(sh.isHome===(mState.userIsHome!==false));
  const offP=S.offP||(sh.isHome?S.home:S.away);
  const defP=S.defP||(sh.isHome?S.away:S.home);
  if(!offP||!defP||offP.length<5||defP.length<5) return oamSut(sh,onShoot,onResult);
  const rim=_rim(offLeft), ownRim=_rim(!offLeft);
  const offR=_rolesOrder(offP), defR=_rolesOrder(defP);
  let shooter=null;
  if(sh.sid!=null) shooter=offP.find(p=>p.pl&&p.pl.id===sh.sid)||null;
  if(!shooter){ let bd=1e9; offP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;shooter=p;} }); }
  if(!shooter) shooter=offR[0];
  /* başlangıç durumu: top nerede, kim tutuyor */
  const inbPending=!!S.inb||!!(b.carrier&&b.carrier._oob&&offP.indexOf(b.carrier)>=0);
  const bizde=!!(b.carrier&&offP.indexOf(b.carrier)>=0);
  const dOwn=Math.hypot(b.x-ownRim[0],b.y-ownRim[1]), dRim=Math.hypot(b.x-rim[0],b.y-rim[1]);
  const onSahada=offLeft?(b.x<COURT_MID):(b.x>COURT_MID);
  let bas='gecis';
  if(inbPending) bas='sokma';
  else if(dOwn<260) bas='ribaund';
  else if(onSahada&&dRim<330) bas='onsaha';
  const sutSinif=(shooter.role|0)<=1?'G':((shooter.role|0)>=4?'C':'F');
  const sec=klipSec(bas,[sh.x,sh.y],offLeft,sutSinif,!!sh.fb,[b.x,b.y]);
  if(!sec) return oamSut(sh,onShoot,onResult);
  const k=sec.k;

  const _res=()=>{ S.pendingPaint=null; try{ if(typeof onResult==='function') onResult(); }catch(e){} };
  try{ mState._gelen={shot:true,type:'shot'}; }catch(e){}
  clearBallTimers();
  S.pendingPaint=_res;
  _clearOob(null); S.inb=null; S._sokmaBekle=null; S.chase=null; S._outlet=null; S._yavasCik=false; S._erkenReb=false;
  if(S.oam){ S.oam.aktif=false; }
  S.canliSet=false; S._setIstek=false; S.defTrack=false; S.cikisSonra=1e9; S.shooter=shooter;
  try{ mState._semaAd=sh.scheme||'klip'; S._sema=null; }catch(e){}

  /* eşleme: hücum rol sırası ↔ klip hücum sırası; şutör ↔ klibin şutörü (yer değiştirme) */
  const offMap=offR.slice(0,5); const r=offMap.indexOf(shooter); const si=k.i;
  if(r>=0&&r!==si){ const t=offMap[si]; offMap[si]=offMap[r]; offMap[r]=t; }
  const defMap=defR.slice(0,5);
  const toks=offMap.concat(defMap);
  const T=(k.r!=null?k.r:(k.n-1))/D.fps;         /* elden çıkış anı (gerçek sn); klip sonrası ~1 sn şut sonrası hareket */
  /* başlangıç karesi: klibin ilk %35'inde topun mevcut top konumuna en yakın olduğu kare (≥ 3 m kazanç varsa) */
  let tau0=0; { const rN=(k.r!=null?k.r:(k.n-1)); let en=1e9,ei=0,d0=0; for(let i=0;i<=Math.floor(rN*0.35);i++){ const c=klipPx(D.v[k.o+i*23]/10,D.v[k.o+i*23+1]/10,offLeft,sec.flip); const d=Math.hypot(c[0]-b.x,c[1]-b.y); if(i===0) d0=d; if(d<en){ en=d; ei=i; } } if(d0-en>90) tau0=ei/D.fps; }
  const f0=klipKare(D,k,tau0);
  const TN=(k.n-1)/D.fps;
  const bas0=toks.map((p,j)=>{ const c=klipPx(f0[3+j*2],f0[4+j*2],offLeft,sec.flip); return [p.x-c[0],p.y-c[1]]; });
  const b0=klipPx(f0[0],f0[1],offLeft,sec.flip); const bOfs=[b.x-b0[0],b.y-b0[1]];
  /* şut noktası ofseti: klibin şutörü son karede nerede, motor nerede istiyor */
  const fT=klipKare(D,k,T); const sTok=klipPx(fT[3+si*2],fT[4+si*2],offLeft,sec.flip);
  const warp=[sh.x-sTok[0],sh.y-sTok[1]];
  /* ara tutucu listesi (top kimde) — pas modu için sonraki alıcı */
  toks.forEach(p=>{ p._klip=true; p._oob=false; p._wp=null; p._lock=0; p._mark=null; });
  S._klipTop=true;
  S.klip={aktif:true,t:0,tau0,k,D,toks,offMap,defMap,offP,defP,offLeft,flip:sec.flip,rim,sh,shooter,bas0,bOfs,warp,T,TN,res:_res,onShoot,atildi:false,si,ix:sec.ix,bas};
  try{ mState._animRez=1800; }catch(e){}
  try{ S._dbgKlip={ix:sec.ix,bas,kb:k.b,sure:k.s,pas:k.p}; }catch(e){}
  const ms=Math.round(((T-tau0)/KLIP_HIZ+0.25)*1000)+1400+((sh.made&&sh.and1)?2100:0);
  return ms;
}

/* ── Her kare: jetonlar ve top klip yörüngesinde ───────────────────────────────────── */
function klipTick(dt){
  const S=oamS(); const K=S&&S.klip; if(!K||!K.aktif) return;
  K.t+=dt;
  const tau=Math.min(K.TN,K.tau0+K.t*KLIP_HIZ);
  const f=klipKare(K.D,K.k,tau);
  if(tau>=K.TN-1e-6){ klipBitir(); return; }
  const wB=Math.min(1,K.t/KLIP_BLEND); const wb=wB*wB*(3-2*wB);           /* harman: smoothstep */
  const wW=Math.max(0,Math.min(1,(tau-(K.T-KLIP_WARP))/KLIP_WARP)); const ww=wW*wW*(3-2*wW);
  const b=S.ball;
  K.toks.forEach((p,j)=>{
    const c=klipPx(f[3+j*2],f[4+j*2],K.offLeft,K.flip);
    const wk=(p===K.shooter)?1:0.35;
    const nx=c[0]+K.bas0[j][0]*(1-wb)+K.warp[0]*ww*wk, ny=c[1]+K.bas0[j][1]*(1-wb)+K.warp[1]*ww*wk;
    /* hız KIRPILMIŞ konumdan: klipte çizgi dışına taşan oyuncu (NBA verisi) kırpılınca kırpılmamış hedefle
       fark her karede sabit kalır ve hız 2500 px/sn'ye çıkar — ölçüldü, savunmacı sahadan uçtu */
    const ox=p.x, oy=p.y;
    p.x=_inX(nx); p.y=_inY(ny); p._px=p.x; p._py=p.y;
    if(!K.atildi){ p.tx=p.x; p.ty=p.y; }   /* şuttan sonra hedefler koreografinindir (ribaunt, serbest atış dizilişi) */
    if(dt>0){ p.vx=Math.max(-400,Math.min(400,(p.x-ox)/dt)); p.vy=Math.max(-400,Math.min(400,(p.y-oy)/dt)); }
    try{ _yonGuncelle(p,dt); }catch(e){}
    if(p.pop>0) p.pop=Math.max(0,p.pop-dt*2.6); p.sc=1+p.pop*0.20;
    try{ _tokSet(p.g,p.x,p.y,p.sc); }catch(e){}
  });
  /* elden çıkış: top motora devredilir, oyuncular klibin sonuna kadar gerçek yörüngede kalır */
  if(tau>=K.T-1e-6&&!K.atildi){ klipAtes(); return; }
  if(K.atildi) return;
  /* top */
  const c=klipPx(f[0],f[1],K.offLeft,K.flip);
  b.x=c[0]+K.bOfs[0]*(1-wb)+K.warp[0]*ww; b.y=c[1]+K.bOfs[1]*(1-wb)+K.warp[1]*ww;
  b.h=Math.max(0,(f[2]-1.5)*KLIP_FT*9.84);   /* ft → px (çember 3,05 m ↔ 30 px); tutulan top ~1,5 ft'te */
  b.vx=0; b.vy=0; b.vh=0;
  /* tutan: en yakın hücumcu ≤ 4 ft ve top alçakta; yoksa uçuşta (pas) */
  let en=null,ed=1e9;
  K.offMap.forEach(p=>{ const d=Math.hypot(p.x-b.x,p.y-b.y); if(d<ed){ ed=d; en=p; } });
  const pxFt=(CRT_X1-CRT_X0)/KLIP_SAHA_X;
  if(en&&ed<=KLIP_TUTMA_FT*pxFt&&f[2]<7.5){ if(b.carrier!==en){ b.carrier=en; b.mode='held'; b.noDrib=false; } }
  else if(b.carrier||b.mode!=='pass'){ b.carrier=null; b.mode='pass'; b.target=en; b.from=[b.x,b.y]; }
  b.rot=(b.rot||0)+dt*(b.mode==='pass'?720:180);
}
/** Klip bitti: jetonlar fiziğe geri verilir (şut sonrası koreografi — ribaunt, sokma — devam eder). */
function klipBitir(){
  const S=oamS(); const K=S&&S.klip; if(!K) return;
  if(!K.atildi) klipAtes();
  K.aktif=false; S._klipTop=false;
  K.toks.forEach(p=>{ p._klip=false; p.vx=0; p.vy=0; });   /* hedeflere dokunma: şut sonrası koreografi (and-1 dizilişi, ribaunt) onları yazdı */
}

/* ── Şut: top eski sözleşmeye (oamAtes) devredilir ─────────────────────────────────── */
function klipAtes(){
  const S=oamS(); const K=S&&S.klip; if(!K||K.atildi) return;
  K.atildi=true;
  S._klipTop=false;   /* top motora; oyuncular klip bitene dek gerçek yörüngede (`_klip` açık kalır) */
  K.toks.forEach(p=>{ p.tx=p.x; p.ty=p.y; p._lock=0; try{ _setUrg(p,_URG.YURU); }catch(e){} });
  const b=S.ball; b.carrier=K.shooter; b.mode='held'; b.h=Math.max(b.h||0,10);   /* top şutörün elinde — konumu klipten (ışınlama yok) */
  /* savunma eşlemesi: şutörün savunmacısı = ona en yakın rakip */
  const esle=new Map(); K.offMap.forEach((p,i)=>{ esle.set(p,K.defMap[i]||K.defMap[0]); });
  let dn=null,dd=1e9; K.defMap.forEach(d=>{ const x=Math.hypot(d.x-K.shooter.x,d.y-K.shooter.y); if(x<dd){ dd=x; dn=d; } }); if(dn) esle.set(K.shooter,dn);
  const O={aktif:true,faz:'set',t:K.t,sh:K.sh,shooter:K.shooter,pg:K.offMap[0],offP:K.offP,defP:K.defP,offR:K.offMap,defR:K.defMap,offLeft:K.offLeft,dir:K.offLeft?-1:1,rim:K.rim,
    esle,ph:new Map(),res:K.res,onShoot:K.onShoot,atildi:false,putback:false,fastBreak:!!K.sh.fb,klip:true};
  S.oam=O;
  try{ oamAtes(); }catch(e){ try{ console.warn('KLIP ateş',e); }catch(_){} try{ K.res(); }catch(_){} }
}

/* ── Bağlama ──────────────────────────────────────────────────────────────────────── */
(function klipBagla(){
  if(typeof animateShotPossession!=='function'||typeof _simTick!=='function'||typeof movePlayersForEvent!=='function') return;
  const _oamYol=animateShotPossession;
  animateShotPossession=function(sh,onShoot,onResult){
    if(!KLIP_ACIK) return _oamYol(sh,onShoot,onResult);
    try{ return klipSut(sh,onShoot,onResult); }catch(e){ try{ console.warn('KLIP',e); }catch(_){} return _oamYol(sh,onShoot,onResult); }
  };
  const _oamTick=_simTick;
  _simTick=function(dt){
    const S=oamS(); const K=S&&S.klip;
    if(K&&K.aktif){
      try{ klipTick(dt); }catch(e){ try{ console.warn('KLIP tick',e); }catch(_){} try{ klipAtes(); }catch(_){} }
      if(K.aktif){
        /* eski tick çalışır (saat, efekt, hakem); klip jetonları ve top orada atlanır */
        if(S.oam) S.oam.aktif=false;
        _oamTick(dt);
        return;
      }
    }
    return _oamTick(dt);
  };
  const _oamMove=movePlayersForEvent;
  movePlayersForEvent=function(ev,paint){
    try{ const S=oamS(); const K=S&&S.klip; if(K&&K.aktif) klipBitir(); }catch(e){}
    return _oamMove(ev,paint);
  };
})();
