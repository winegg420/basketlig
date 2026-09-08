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
     · jetonlar bulundukları yerden klibin yörüngesine HIZ SINIRLI yetişir (FAZ 51: ofset ≤ 130 px/sn
       küçülür; eski 1 sn'lik zaman harmanı 6-9 m'yi tek saniyede kaydırıp ışınlanma gibi görünüyordu)
     · son 1,5 sn'de şutör + top motorun şut noktasına kaydırılır (küçük ofset; klip zaten yakın)
     · elden çıkış anında top eski sözleşmeye devredilir (`oamAtes`: ön parça/sonuç senkronu,
       blok, AND-1, ribaunt mücadelesi, sayı sonrası sokma) — motor sonucu değişmez
   Sahne kararları YALNIZ sahne PRNG'sinden (`_sr`/`_srand`): maç akışı kaymaz.
   `KLIP_ACIK=false` OAM'a döner. Klip bulunamazsa (putback, veri yok) OAM çalışır.
   ═══════════════════════════════════════════════════════════════════════════════════ */

const KLIP_ACIK=true;
/* FAZ 54 B2 (kullanıcı kararı — ekran gerçek hızda): 1,2 → 1,0. Ölçüldü (duvar ölçeği): ortalama oyuncu hızı
   2,38-2,77 m/sn ↔ gerçek 1,72; 0-1 m/sn bandı %20-27 ↔ gerçek %41,7. Klip gerçek zamanda akar; maç ~%15 uzun
   izlenir — izleme hızı düğmesi (setMatchRate) duruyor. */
const KLIP_HIZ=1.0;          /* klip oynatma hızı (gerçek zamanın katı) */
const KLIP_BLEND=1.0;        /* sn — (eski) zaman tabanlı harman; FAZ 51'den beri yalnız topun yedek yolu */
/* FAZ 51 (kullanıcı: "bi anda oyuncuların hızla yer değiştirmesi, ışınlanmalar"): harman ZAMANLA değil
   HIZLA kapanır. Eski smoothstep 1 sn'de 6-9 m kaydırıyordu (ölçüldü: 100 ms'de 2,6 m = 22 m/sn sahne,
   her şut olayının başında 40-48 kare). Şimdi her jetonun klip yörüngesine uzaklığı (ofset) en çok
   KLIP_HARMAN_V px/sn ile küçülür — jeton klibin hareketi + koşu hızıyla yörüngesine "yetişir". */
const KLIP_HARMAN_V=75;      /* px/sn ≈ 2,5 m/sn — ofset kapanışı (FAZ 54: 130 → 75; kapanış hızı klip hızının ÜSTÜNE bindiği için ortalamayı şişiriyordu) */
const KLIP_HARMAN_V_SUTOR=150;/* şutör daha çabuk yetişir (şut noktası bağlayıcı) — FAZ 54: 200 → 150 */
const KLIP_HARMAN_V_TOP=330; /* top ofseti tutanın ofsetine bu hızla yaklaşır (el değişiminde sıçramasın) */
const KLIP_TOP_VMAX=650;     /* px/sn ≈ 22 m/sn sahne — SportVU top izinde 40 m/sn'lik sıçramalar var (ölçüldü: 157 sn'de 47 m/sn), fazlası top ofsetine yazılır */
const KLIP_VMAX=265;         /* FAZ 54 B2: 380 → 265 px/sn ≈ 9,0 m/sn — sprint tavanı; SportVU izleme sıçramalarını da keser */
/* FAZ 54 B1: İVME SINIRI (duvar ölçeği, px/sn²). Ölçüldü (canlı site, 24.921 kare): oyuncu ivmesi
   2.592 olayda 26-47 m/sn², klip karelerinde p99 43,6 — 5 kare/sn'lik kaydın doğrusal ara değeri her
   düğümde hızı SIÇRATIYOR, jeton duruştan tam hıza tek karede çıkıyordu; ışınlanma hissinin asıl
   kaynağı buydu. İnsan sporcunun tepe ivmesi 6-8 m/sn²: hız değişimi kareye bu sınırla uygulanır,
   kalan yol ofsete yazılır (jeton yörüngeye ivmeyle yetişir). Fren daha sert (9 m/sn²). */
const KLIP_IVME=3.4*29.5429;   /* 100 px/sn² — ofset kapanışının hızlanması (FAZ 54: 7,0 → 3,4 m/sn²;
   ivme sınırı ofsete uygulanır ve klip yörüngesinin kendi ivmesiyle TOPLANIR — ölçüldü p99 11,8 ↔ gerçek 5,1) */
const KLIP_FREN=9.0*29.5429;   /* 266 px/sn² — yavaşlama */
const KLIP_BEKLE_V=175;         /* px/sn ≈ 5,9 m/sn — sahipsiz topa giden tutucu (koşu) */         /* px/sn ≈ 12,9 m/sn sahne — klibin gerçek sprintini geçer, yalnız SportVU izleme sıçramasını (>12,5 m/sn) keser; düşük tutmak yayılımı daraltıyordu */
const KLIP_WARP=2.2;         /* sn — şut noktası ofseti bu pencerede biner (FAZ 54: 1,5 → 2,2, ivme tepesi düşsün) */
const KLIP_FT=0.3048, KLIP_SAHA_X=94, KLIP_SAHA_Y=50;
const KLIP_TUTMA_FT=4.0;     /* top oyuncuya bu kadar yakınsa "elinde" */

let _klipD=null;             /* çözülmüş veri: {fps, klip:[meta], v:Int16Array} */
function klipVeri(){
  if(_klipD) return _klipD;
  try{
    if(typeof KLIP_VERI==='undefined'||!KLIP_VERI||!KLIP_VERI.b64) return null;
    const bin=atob(KLIP_VERI.b64); const u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
    _klipD={fps:KLIP_VERI.fps||5,klip:KLIP_VERI.klip,v:new Int16Array(u8.buffer),son:[]};
    /* FAZ 53: taktik eşleşmesi için havuzun kendi MEDYANI (eşik sabiti yazılmaz).
       Bir kez, yükleme anında hesaplanır (~35 bin kare örneklemesi). */
    try{
      const sy=[],bp=[],pd=[],sr=[];
      _klipD.klip.forEach(k=>{ const im=klipImza(_klipD,k); sy.push(im.sy); bp.push(im.bp); pd.push(im.pd); sr.push(im.sr); });
      const yuzde=(a,q)=>{ a=a.slice().sort((x,y)=>x-y); return a.length?a[Math.max(0,Math.min(a.length-1,Math.floor(a.length*q)))]:0; };
      /* ⚠ HEDEF, MEDYAN DEĞİL ÇEYREKTİR. İlk sürüm "medyanın ÜSTÜNDE olanı cezalandır"
         diyordu; ama şut geometrisi zaten potaya yakın savunmalı klipleri öne alıyor ve
         aday havuzunun tamamı medyanın ALTINDA kalıyordu — ceza her adayda 0 çıkıp
         seçimi hiç değiştirmiyordu (ölçüldü: bölge 14,35 ↔ adam adama 14,28 ft).
         Artık hedefe UZAKLIK cezalandırılır (iki yönlü) ve hedef havuzun %25'lik dilimidir. */
      const med=a=>yuzde(a,0.5);
      _klipD.med={sy:med(sy),bp:med(bp),pd:med(pd),sr:med(sr),srDar:yuzde(sr,0.25),bpDar:yuzde(bp,0.25)};
    }catch(e){ _klipD.med={sy:16,bp:6,pd:0.1,sr:16,srDar:13,bpDar:4}; }
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
/* ── FAZ 53: TAKTİK ↔ KLİP EŞLEŞMESİ ─────────────────────────────────────────────────
   Kullanıcı: "taktiklerdeki oyun stilleri maça yansımalı, o taktikleri canlı maçta
   görüyor olmalıyız; botla oynarken bot takımı da bunu yapıyor olmalı — alan savunması,
   adam adama, screen'den sonra adam değiştirme, screen'in başarılı/başarısız olması,
   oyuncunun boş kalması, boş kalınca hemen şuta kalkması ya da potaya yüklenmesi."

   FAZ 50'den beri şutlu pozisyonlar GERÇEK maç kaydından oynuyor; klibin içindeki
   savunma dizilimi ve perde, kaydın kendisinden gelir — sonradan "adam adamaya çevir"
   diye eğilip bükülemez (eğilirse yine elle yazılmış koreografiye döneriz, kullanıcının
   FAZ 50'de reddettiği şey buydu). Yapılabilecek doğru şey SEÇİMDİR: 696 klibin her biri
   için savunma imzası bir kez ölçülür ve o pozisyonda sahada hangi savunma varsa ona
   BENZEYEN klip seçilir. Böylece 2-3 bölge kurulduğunda ekranda gerçekten paketlenmiş,
   boyayı kapatan bir savunma; tam saha preste topa yapışan bir savunma; ikili oyun
   şemasında gerçekten perde kurulan bir pozisyon oynar.

   Ölçülen imzalar (ft cinsinden, klip başına bir kez, `klipVeri()` içinde):
     sy = savunmanın yayılımı (5 savunmacının ikili mesafe ortalaması) — bölge DÜŞÜK
     bp = topa en yakın savunmacı mesafesi ortalaması            — pres DÜŞÜK
     pd = perde izi: topu tutanın 4 ft'ine giren takım arkadaşı karesi sayısı / kare */
function klipImza(D,k){
  if(k._im) return k._im;
  const n=k.n, adim=Math.max(1,Math.floor(n/24));   /* en çok 24 kare örnekle (yükleme ucuz kalsın) */
  let sySum=0,bpSum=0,pdSum=0,srSum=0,m=0;
  for(let i=0;i<n;i+=adim){
    const o=k.o+i*23;
    const bx=D.v[o]/10, by=D.v[o+1]/10;
    /* savunmacı yayılımı (slot 5..9) */
    let s=0,c=0;
    for(let a=0;a<5;a++) for(let b2=a+1;b2<5;b2++){
      const ax=D.v[o+13+a*2]/10, ay=D.v[o+14+a*2]/10;
      const bx2=D.v[o+13+b2*2]/10, by2=D.v[o+14+b2*2]/10;
      s+=Math.hypot(ax-bx2,ay-by2); c++;
    }
    sySum+=s/Math.max(1,c);
    /* topa en yakın savunmacı */
    let en=1e9;
    for(let a=0;a<5;a++){ const dx=D.v[o+13+a*2]/10-bx, dy=D.v[o+14+a*2]/10-by; const d=Math.hypot(dx,dy); if(d<en) en=d; }
    bpSum+=en;
    /* savunmanın POTAYA ortalama uzaklığı — 2-3 bölgenin asıl imzası budur (boyayı kapatır).
       İkili mesafe (sy) tek başına ayırt etmiyordu: ölçüldü, bölge 16,33 ↔ adam adama 16,23 ft. */
    let sr=0;
    for(let a=0;a<5;a++){ const dx=D.v[o+13+a*2]/10-5.25, dy=D.v[o+14+a*2]/10-25; sr+=Math.hypot(dx,dy); }
    srSum+=sr/5;
    /* perde izi: topu tutan hücumcuya 4 ft içinde BAŞKA bir hücumcu var mı */
    let ti=-1,td=1e9;
    for(let a=0;a<5;a++){ const dx=D.v[o+3+a*2]/10-bx, dy=D.v[o+4+a*2]/10-by; const d=Math.hypot(dx,dy); if(d<td){ td=d; ti=a; } }
    if(ti>=0&&td<=5){
      for(let a=0;a<5;a++){ if(a===ti) continue;
        const dx=D.v[o+3+a*2]/10-D.v[o+3+ti*2]/10, dy=D.v[o+4+a*2]/10-D.v[o+4+ti*2]/10;
        if(Math.hypot(dx,dy)<=4.5){ pdSum++; break; }
      }
    }
    m++;
  }
  m=Math.max(1,m);
  /* ASIL TAŞIYICI SLOTU: klip slotları sınıfa göre sıralı (G,G,F,F,C) olduğu için slot
     indeksi taşıyıcının sınıfını verir. 0-1 = guard. Seçim bunu tercih eder — yoksa
     taktik eşleşmesi (post-up ağırlıklı klipler) "4 numara top sürüyor" kusurunu geri
     getiriyordu (ölçüldü: eşleşme açılınca süren PF %17 → %43). */
  let hs=0,hb=-1;
  { const rN=(k.r!=null?k.r:(n-1)), ad2=Math.max(1,Math.floor(rN/18)), say=[0,0,0,0,0];
    for(let i=0;i<=rN;i+=ad2){ const o=k.o+i*23, bx=D.v[o]/10, by=D.v[o+1]/10;
      let ei=0,ed=1e9;
      for(let j=0;j<5;j++){ const dd=Math.hypot(D.v[o+3+j*2]/10-bx,D.v[o+4+j*2]/10-by); if(dd<ed){ ed=dd; ei=j; } }
      if(ed<=6) say[ei]++; }
    for(let j=0;j<5;j++) if(say[j]>hb){ hb=say[j]; hs=j; } }
  k._im={sy:sySum/m,bp:bpSum/m,pd:pdSum/m,sr:srSum/m,hs:hs};
  return k._im;
}
/** O anda SAVUNAN tarafın savunma stili ('adam' | 'bolge' | 'pres'). Kullanıcı savunuyorsa
    kendi seçimi, bot savunuyorsa botun koç profili — "bot takımı da bunu yapıyor olmalı". */
function klipSavunmaStili(offIsUser){
  try{
    if(!offIsUser){
      const t=(typeof G!=='undefined'&&G&&G.tactics)||{};
      return t.defSet||t.defensiveStyle||'adam';
    }
    const ad=(typeof mState!=='undefined'&&mState&&mState.rakipName)||'';
    const bc=(typeof botCoachProfile==='function')?botCoachProfile(ad):null;
    return (bc&&bc.def)||'adam';
  }catch(e){ return 'adam'; }
}
/** Taktik uyum maliyeti — küçük = bu klip o taktiğe benziyor. Eşikler klip havuzunun
    kendi dağılımından (medyan) gelir; sabit sayı yazılmaz. */
/** Taktik uyum maliyeti — kısa listenin İÇİNDE sıralamak için; küçük = daha benzer.
    ⚠ HEDEF DEĞERİ YOKTUR, SIRALAMA VARDIR. İki sürüm ölçülerek elendi: (a) maliyeti
    geometri maliyetine EKLEMEK (ilk altı hiç değişmedi), (b) havuzun yüzdelik dilimini
    HEDEF alıp ona uzaklığı cezalandırmak (kısa liste zaten hedefin ötesindeydi, ceza
    seçimi ters yöne itti — bölge 16,02 ft ↔ adam adama 14,10 ft). Doğrusu, kısa listeyi
    doğrudan o eksende sıralamaktır: bölge → potaya en yakın duran savunma, pres → topa
    en yakın savunmacı, ikili oyun → perde izi en yüksek, birebir → en düşük. */
function klipTaktikMaliyet(D,k,stil,scheme){
  try{
    const im=klipImza(D,k);
    let c=0;
    c+=(im.hs>=3?3.2:(im.hs===2?1.1:0));   /* topu asıl süren guard olsun (1-2 numara) */
    if(stil==='bolge')      c+=im.sr+im.sy*0.35-im.bp*0.30;   /* paketlenmiş, boyayı kapatan, topa yapışmayan */
    else if(stil==='pres')  c+=im.bp*1.60;                    /* topa yapışan */
    if(scheme==='pnr'||scheme==='handoff') c+=-im.pd*30;      /* gerçekten perde kurulan pozisyon */
    else if(scheme==='iso')                c+= im.pd*30;      /* birebir: perde yok */
    return c;
  }catch(e){ return 0; }
}
const KLIP_SINIF=['G','G','F','F','C'];
/* Klip seçimi: başlangıç durumu + şut geometrisi + şutör sınıfı; en iyi 6 arasından sahne PRNG'siyle */
function klipSec(bas,shPx,offLeft,sutSinif,fb,topPx,toksPx,stil,scheme){
  const D=klipVeri(); if(!D||!D.klip.length) return null;
  const [ex,ey]=klipFt(shPx[0],shPx[1],offLeft);
  const topFt=topPx?klipFt(topPx[0],topPx[1],offLeft):null;
  /* FAZ 51: jetonların ŞU ANKİ dizilimi klibin ilk karesine uzaksa harman uzun koşu üretir — 10 jetonun
     ortalama uzaklığı (ft) maliyete girer (10 ft ort = +1). Aynı klibin iki aynası ayrı değerlenir. */
  const toksFt=(toksPx&&toksPx.length===10)?toksPx.map(q=>klipFt(q[0],q[1],offLeft)):null;
  const eDx=ex-5.25, eDy=ey-25; const eD=Math.hypot(eDx,eDy), eA=Math.atan2(eDy,eDx);
  const izin={sokma:['sokma','ribaund'],ribaund:['ribaund','sokma'],gecis:['gecis','ribaund'],onsaha:['onsaha']}[bas]||null;
  const aday=[];
  D.klip.forEach((k,i)=>{
    let c=0;
    if(izin&&izin.indexOf(k.b)<0) c+=1.4;
    if(fb){ if(k.s>7) c+=1.2; } else if(k.s<4&&k.b!=='onsaha') c+=0.6;
    c+=Math.max(0,k.s-13)*0.25;   /* uzun klip anlatımı susturur (realism: en uzun boşluk 21,7 sn ölçüldü) */
    const kDx=k.x-5.25; let en=1e9,fl=false;
    for(const f of [false,true]){
      const kDy=f?(25-k.y):(k.y-25); const d=Math.hypot(kDx,kDy), a=Math.atan2(kDy,kDx); let da=Math.abs(a-eA); if(da>Math.PI) da=2*Math.PI-da; let cc=Math.abs(d-eD)/3+da/0.5;
      if(toksFt){ let s=0; for(let j=0;j<10;j++){ const px=D.v[k.o+3+j*2]/10, py0=D.v[k.o+4+j*2]/10; const py=f?(KLIP_SAHA_Y-py0):py0; s+=Math.hypot(px-toksFt[j][0],py-toksFt[j][1]); } cc+=s/170; }   /* FAZ 54: 220 → 170 (120 denendi: yayılım y L1 0,415 ile eşiği aştı — FAZ 51 uyarısı doğrulandı) — başlangıç ofseti küçülür (ivme/hız/dizilim) */   /* FAZ 51: dizilim benzerliği HAFİF (bölen büyük) — ağır olunca klip seçimi bozulup yayılım daralıyordu */
      if(cc<en){ en=cc; fl=f; }
    }
    c+=en;
    /* topun ŞU ANKİ yeri klibin başlangıcına uzaksa harman ışınlama gibi görünür (ölçüldü: 396 sn'de
       top 1 sn'de 14 m "uçtu", 47 m/sn) — ilk karedeki top uzaklığı (ft) maliyete girer */
    if(topFt){ const bx=D.v[k.o]/10, by0=D.v[k.o+1]/10; const by=fl?(KLIP_SAHA_Y-by0):by0; c+=Math.hypot(bx-topFt[0],by-topFt[1])/9; }
    if(k.c!==sutSinif) c+=0.8;
    if(D.son.indexOf(i)>=0) c+=2.0;
    { const im=klipImza(D,k); if(im.hs>=4) c+=3.4; else if(im.hs===3) c+=2.2; else if(im.hs===2) c+=0.6; }   /* FAZ 53/54 C3: pivotun taşıdığı klip neredeyse hiç seçilmez (orta çizgiyi C 3/20 geçiyordu) */

    aday.push({i,c,fl});
  });
  aday.sort((a,b)=>a.c-b.c);
  /* ── FAZ 53: TAKTİK SEÇİMİ İKİ AŞAMALIDIR ────────────────────────────────────────
     Taktik maliyetini geometri maliyetine EKLEMEK işe yaramadı (ölçüldü: bölge 15,09 ↔
     adam adama 14,93 ft — fark yok): geometri farkları taktik cezasından büyük olduğu
     için ilk altı aday hiç değişmiyordu. Doğru yapı elemedir — önce GEOMETRİ ile geniş
     bir kısa liste (24 klip; şut noktası ve dizilim yine tutarlı), sonra o listenin
     içinden TAKTİĞE en çok benzeyen altısı. Böylece 2-3 bölge kurulduğunda ekranda
     gerçekten boyayı kapatan, preste topa yapışan bir savunma oynar. */
  let ust=aday.slice(0,24);
  /* 'adam' NÖTRDÜR: adam adama savunmanın ayırt edici bir imzası yoktur (havuzun
     tamamı ağırlıklı adam adamadır) — yeniden sıralama yapılmaz, geometri kazanır.
     Bölge ve pres kendi imzalarını arar. */
  const _semaVar=(scheme==='pnr'||scheme==='handoff'||scheme==='iso');
  if((stil&&stil!=='adam')||_semaVar){
    ust=ust.map(x=>({x,tc:klipTaktikMaliyet(D,D.klip[x.i],stil,scheme)}))
           .sort((a,b)=>a.tc-b.tc).slice(0,6).map(o=>o.x);
  } else ust=ust.slice(0,6);
  const sec=ust[_srand(0,ust.length-1)];
  D.son.push(sec.i); if(D.son.length>10) D.son.shift();
  return {k:D.klip[sec.i],ix:sec.i,flip:sec.fl};
}
/* Klip karesi (ara değerli): dizi [bx,by,bz, o0..o4, d0..d4] (ft) */
function klipKare(D,k,tau){
  /* FAZ 54 B1b: Catmull-Rom — doğrusal ara değer her 0,2 sn'lik düğümde hızı sıçratıyordu
     (60 fps'de ölçülen ivme 26-47 m/sn²); kübik eğri düğümlerde hız sürekliliği verir. */
  const fi=Math.max(0,Math.min(k.n-1,tau*D.fps)); const i1=Math.floor(fi), w=fi-i1;
  const i0=Math.max(0,i1-1), i2=Math.min(k.n-1,i1+1), i3=Math.min(k.n-1,i1+2);
  /* düğüm yumuşatma (1-2-1): komşularıyla ağırlıklı ortalanmış düğüm — SportVU izleme gürültüsü
     kübik eğride ivme tepesine dönüşüyordu (ölçüldü: p99 12,6 ↔ gerçek 7,0 m/sn²). */
  const im1=Math.max(0,i0-1), ip2=Math.min(k.n-1,i3+1);
  const dg=(idx,pre,nxt,j)=>(D.v[k.o+pre*23+j]+2*D.v[k.o+idx*23+j]+D.v[k.o+nxt*23+j])*0.25;
  const out=new Array(23);
  const w2=w*w, w3=w2*w;
  for(let j=0;j<23;j++){
    const p0=dg(i0,im1,i1,j), p1=dg(i1,i0,i2,j), p2=dg(i2,i1,i3,j), p3=dg(i3,i2,ip2,j);
    out[j]=(0.5*((2*p1)+(-p0+p2)*w+(2*p0-5*p1+4*p2-p3)*w2+(-p0+3*p1-3*p2+p3)*w3))/10;
  }
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
  /* FAZ 53: sahadaki savunma stili (kullanıcı savunuyorsa kendi seçimi, bot savunuyorsa
     botun koç profili) ve motorun şeması klip seçimine girer — taktik EKRANDA görünür. */
  const _stil=klipSavunmaStili(sh.isHome!==false);   /* sh.isHome = hücumdaki taraf kullanıcı mı */
  const sec=klipSec(bas,[sh.x,sh.y],offLeft,sutSinif,!!sh.fb,[b.x,b.y],offR.slice(0,5).concat(defR.slice(0,5)).map(p=>[p.x,p.y]),_stil,sh.scheme||null);   /* FAZ 51: dizilim benzerliği maliyette */
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

  /* ── EŞLEME (FAZ 53'te DÜZELTİLDİ) ───────────────────────────────────────────────
     Klip slotları sınıfa göre sıralıdır (`KLIP_SINIF` = G,G,F,F,C; `klip-cikar.js`
     `RANK` ile sıralar), bu yüzden rol sırası (PG,SG,SF,PF,C) slotlara birebir oturur.
     ESKİ KOD şutörü klibin şutör slotuna KÖR TAKASLA koyuyordu: şutör PG ise ve klibin
     şutörü 4. slot (PF) ise takas sonucu 0. SLOTA — yani klibin topu getiren
     guard'ına — bizim PF'imiz düşüyordu. Ölçüldü (400 sn iz kaydı): topu SÜREN
     karelerin **%49'u PF**, yalnız %7,5'i PG (kullanıcı: "4 numara neden top sürüyor").
     Yeni eşleme iki noktayı birden çiviler:
       · klibin ŞUTÖR slotu  → motorun şutörü (şut noktası sözleşmesi),
       · klibin TOPU TUTAN slotu (ilk karede topa en yakın hücumcu) → gerçek taşıyıcımız,
         yoksa bir guard (rol 0/1) — "1 ve 2 numara topu alır, yarı sahayı onlar geçer".
     Kalan slotlar rol sırasını KORUYARAK doldurulur (uzun uzun slotuna düşer). */
  const si=k.i;
  const offSira=offR.slice(0,5);
  const offMap=new Array(5);
  { /* Klibin ASIL TAŞIYICISI: yalnız ilk kareye bakmak yetmiyordu (ölçüldü: topu süren
       karelerin %38,7'si hâlâ PF idi) — top pozisyon boyunca el değiştiriyor ve en çok
       süren slot başka olabiliyor. Elden çıkışa kadarki karelerde "topa en yakın hücumcu"
       sayacı tutulur, en çok önde olan slot taşıyıcı sayılır ve oraya bir GUARD konur. */
    const rN=(k.r!=null?k.r:(k.n-1));
    const say=[0,0,0,0,0];
    const adm=Math.max(1,Math.floor(rN/18));
    for(let i=0;i<=rN;i+=adm){
      const o=k.o+i*23, bx=D.v[o]/10, by=D.v[o+1]/10;
      let ei=0,ed=1e9;
      for(let j=0;j<5;j++){ const dd=Math.hypot(D.v[o+3+j*2]/10-bx,D.v[o+4+j*2]/10-by); if(dd<ed){ ed=dd; ei=j; } }
      if(ed<=6) say[ei]++;
    }
    let bi=0,bd=-1;
    for(let j=0;j<5;j++) if(say[j]>bd){ bd=say[j]; bi=j; }
    if(bd<=0){ const fb=klipKare(D,k,0); let e=1e9; for(let j=0;j<5;j++){ const dd=Math.hypot(fb[3+j*2]-fb[0],fb[4+j*2]-fb[1]); if(dd<e){ e=dd; bi=j; } } }
    offMap[si]=shooter;
    if(bi!==si){
      let h=(bizde&&b.carrier&&b.carrier!==shooter&&offSira.indexOf(b.carrier)>=0&&(typeof _tasiyabilir!=='function'||_tasiyabilir(b.carrier)))?b.carrier:null;
      /* FAZ 54 A1: top yerdeyse ve bir hücumcu ona ZATEN koşuyorsa (ribaund/çalma takibi) klibin
         tutucusu odur — ölçüldü: guard 10 m öteden çağrılınca top 4,18 sn sahipsiz kaldı. */
      if(!h&&S.chase&&S.chase.tok&&S.chase.tok!==shooter&&offSira.indexOf(S.chase.tok)>=0) h=S.chase.tok;
      if(!h) h=offSira.find(p=>p!==shooter&&(p.role===0||p.role===1));
      if(!h) h=offSira.find(p=>p!==shooter&&(typeof _tasiyabilir!=='function'||_tasiyabilir(p)));
      if(!h) h=offSira.find(p=>p!==shooter);
      offMap[bi]=h;
    }
    const kalan=offSira.filter(p=>offMap.indexOf(p)<0);
    for(let j=0;j<5;j++) if(!offMap[j]) offMap[j]=kalan.shift();
  }
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
  /* ── FAZ 54 A1: TOP SAHİPSİZSE KLİP BEKLER ───────────────────────────────────────────
     Ölçüldü (adım 1 sonrası): en uzun sahipsiz top epizotlarının %18-61'i klip karesiydi —
     klip başlarken top yerdeyse (ribaund takibi bitmeden sıradaki olay gelmişti) topun ofseti
     tutucunun ofsetine 330 px/sn ile yaklaşıyor, yani TOP OYUNCUYA UÇUYORDU (sahipsiz modda).
     Şimdi klip tutucu topa varana kadar başlangıç karesinde bekler; tutucunun hedefi klip
     noktası değil TOPUN KENDİSİDİR, 4 ft'e gelince topu alır ve klip akar. En çok 1,6 sn. */
  let _bekle=null;
  { const hj=(function(){ const fb=klipKare(D,k,tau0); let e=1e9,ei=0; for(let j=0;j<5;j++){ const dd=Math.hypot(fb[3+j*2]-fb[0],fb[4+j*2]-fb[1]); if(dd<e){ e=dd; ei=j; } } return ei; })();
    const tutucu=offMap[hj];
    if(tutucu&&b.carrier!==tutucu&&(b.mode!=='held'||!b.carrier)){ _bekle={j:hj,tok:tutucu,t:0}; } }
  S.klip={aktif:true,t:0,tau0,k,D,toks,offMap,defMap,offP,defP,offLeft,flip:sec.flip,rim,sh,shooter,bas0,ofs:bas0.map(v=>v.slice()),bOfs:bOfs.slice(),warp,T,TN,res:_res,onShoot,atildi:false,si,ix:sec.ix,bas,bekle:_bekle};
  if(_bekle){ const dd=Math.hypot(_bekle.tok.x-b.x,_bekle.tok.y-b.y); _bekle.tahmin=Math.min(2.6,dd/KLIP_BEKLE_V); }
  try{ mState._animRez=1800; }catch(e){}
  try{ S._dbgKlip={ix:sec.ix,bas,kb:k.b,sure:k.s,pas:k.p}; }catch(e){}
  const ms=Math.round(((T-tau0)/KLIP_HIZ+0.25+0.12+((_bekle&&_bekle.tahmin)||0))*1000)+1400+((sh.made&&sh.and1)?2100:0);   /* FAZ 54 A2: +0,12 sn şut öncesi tutma · A1: sahipsiz top beklemesi */
  return ms;
}

/* ── Her kare: jetonlar ve top klip yörüngesinde ───────────────────────────────────── */
function klipTick(dt){
  const S=oamS(); const K=S&&S.klip; if(!K||!K.aktif) return;
  const B=K.bekle;
  if(B){ B.t+=dt; const b0=S.ball; const dd=Math.hypot(B.tok.x-b0.x,B.tok.y-b0.y);
    if(dd<=KLIP_TUTMA_FT*((CRT_X1-CRT_X0)/KLIP_SAHA_X)||B.t>2.6){
      /* tutucu topa vardı: top ele, ofsetler klip referansına göre yeniden kurulur (sıçrama yok) */
      if(dd<=KLIP_TUTMA_FT*((CRT_X1-CRT_X0)/KLIP_SAHA_X)){ b0.carrier=B.tok; b0.mode='held'; b0.noDrib=false; b0._heldAt=S.time; }
      const f0=klipKare(K.D,K.k,K.tau0); const c=klipPx(f0[3+B.j*2],f0[4+B.j*2],K.offLeft,K.flip); K.ofs[B.j]=[B.tok.x-c[0],B.tok.y-c[1]];
      const cb=klipPx(f0[0],f0[1],K.offLeft,K.flip); K.bOfs=[b0.x-cb[0],b0.y-cb[1]];
      K.bekle=null;
    }
  }
  if(!K.bekle) K.t+=dt;
  const tau=Math.min(K.TN,K.tau0+K.t*KLIP_HIZ);
  const f=klipKare(K.D,K.k,tau);
  if(tau>=K.TN-1e-6){ klipBitir(); return; }
  const wW=Math.max(0,Math.min(1,(tau-(K.T-KLIP_WARP))/KLIP_WARP)); const ww=wW*wW*(3-2*wW);
  const b=S.ball;
  /* ofset en geç ELDEN ÇIKIŞTA sıfırlanmalı: kalan duvar süresi (klip KLIP_HIZ katıyla akar); kısa kliplerde
     (3-4 sn) eski (1-ww) sönümü 1,5 sn'ye yığılıp 2,3 m/100 ms patlama üretiyordu (ölçüldü) — sabit hız */
  const kalan=Math.max(0.25,(K.T-0.3-tau)/KLIP_HIZ);
  /* FAZ 51: harman HIZ SINIRLI — her jetonun ofseti en çok V·dt px küçülür (şutör daha hızlı); şut
     penceresinde kalan ofset ww ile de söner (şutör şut noktasına kesin varır). Eski zaman tabanlı
     smoothstep 1 sn'de 6-9 m kaydırıyordu — kullanıcının gördüğü "ışınlanma" buydu. */
  K.toks.forEach((p,j)=>{
    let c=klipPx(f[3+j*2],f[4+j*2],K.offLeft,K.flip);
    if(K.bekle&&j===K.bekle.j){ c=[S.ball.x,S.ball.y]; const o=K.ofs[j]; if(!K.bekle.kur){ K.bekle.kur=true; o[0]=p.x-c[0]; o[1]=p.y-c[1]; } }   /* FAZ 54 A1: tutucu TOPA yürür */
    const wk=(p===K.shooter)?1:0.35;
    const o=K.ofs[j]; const om=Math.hypot(o[0],o[1]);
    if(om>0){
      /* FAZ 54 B1b: kapanış hızı İVMEYLE artar (KLIP_IVME), varışta fren mesafesiyle (√(2·fren·om)) söner —
         eski sabit 130 px/sn kapanış her klip başında 10 jetona tek karede 4,4 m/sn hız veriyordu
         (ölçüldü: ivme p99 43,6 m/sn²). Bekleyen tutucu topa sprintle gider (KLIP_BEKLE_V). */
      const hedefV=(K.bekle&&j===K.bekle.j)?KLIP_BEKLE_V:((p===K.shooter)?KLIP_HARMAN_V_SUTOR:KLIP_HARMAN_V);
      const frenV=Math.sqrt(2*KLIP_FREN*om);
      p._hv=Math.min(hedefV,frenV,(p._hv||0)+KLIP_IVME*dt);
      const adim=p._hv*dt; if(om<=adim){ o[0]=0; o[1]=0; p._hv=Math.max(0,p._hv-KLIP_FREN*dt); } else { const k2=(om-adim)/om; o[0]*=k2; o[1]*=k2; } }
    else if(p._hv>0) p._hv=Math.max(0,p._hv-KLIP_FREN*dt);   /* FAZ 55: rampa ivme tavanıyla söner (ani kesme = 150 m/sn² sıçrama) */
    let nx=_inX(c[0]+o[0]+K.warp[0]*ww*wk), ny=_inY(c[1]+o[1]+K.warp[1]*ww*wk);   /* hedef saha içinde: çizgi dışındaki sokucu İÇERİ YÜRÜR (kırpma sıçratmaz — FAZ 40 dersi, ölçüldü 1,35 m tek kare) */
    /* FAZ 51: tek karede en çok KLIP_VMAX·dt yol — fazlası ofsete eklenir (jeton yörüngeye koşarak yetişir) */
    { const mx=KLIP_VMAX*dt, ddx=nx-p.x, ddy=ny-p.y, dd=Math.hypot(ddx,ddy); if(dd>mx&&dd>0.01){ const kx=p.x+ddx/dd*mx, ky=p.y+ddy/dd*mx; o[0]+=kx-nx; o[1]+=ky-ny; nx=kx; ny=ky; } }
    /* hız KIRPILMIŞ konumdan: klipte çizgi dışına taşan oyuncu (NBA verisi) kırpılınca kırpılmamış hedefle
       fark her karede sabit kalır ve hız 2500 px/sn'ye çıkar — ölçüldü, savunmacı sahadan uçtu */
    /* ⚠ FAZ 55: konum düşük-geçiren filtre (nx=0,34·önceki+0,66·yeni) DENENDİ ve ölçülerek
       ELENDİ — üçüncü başarısız A1 denemesi. Filtre jetonu yörüngenin gerisinde bıraktığı için
       fark bir sonraki karede kapanıyor: kare-kare tepe 845 → 1297, >8 payı %3,67 → %3,92,
       ortalama hız 1,97 → 2,06 m/sn (bandın dışı). Klip yörüngesinden SAPAN her yapı, sapmayı
       kapatırken kaydın kendisinden hızlı hareket etmek zorunda kalıyor. */
    const ox=p.x, oy=p.y;
    p.x=nx; p.y=ny; p._px=p.x; p._py=p.y;
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
  if(K.bekle) return;   /* FAZ 54 A1: sahipsiz top yerinde bekler — tutucu ona gelir */
  const c=klipPx(f[0],f[1],K.offLeft,K.flip);
  /* FAZ 51: top ofseti KLİPTE topu tutanın (klip koordinatında en yakın hücumcu) ofsetine yaklaşır —
     tutan kendi ofsetiyle koşarken top elinde kalır; el değişiminde ofset farkı sıçramaz, 420 px/sn ile kapanır */
  { let hj=0,hd=1e9; for(let j=0;j<5;j++){ const d=Math.hypot(f[3+j*2]-f[0],f[4+j*2]-f[1]); if(d<hd){ hd=d; hj=j; } }
    const ho=(hd<=KLIP_TUTMA_FT*1.5&&f[2]<7.5)?K.ofs[hj]:[0,0];
    const dx=ho[0]-K.bOfs[0], dy=ho[1]-K.bOfs[1], dm=Math.hypot(dx,dy), adim=KLIP_HARMAN_V_TOP*dt;
    if(dm<=adim){ K.bOfs[0]=ho[0]; K.bOfs[1]=ho[1]; } else { K.bOfs[0]+=dx/dm*adim; K.bOfs[1]+=dy/dm*adim; } }
  { let nx=c[0]+K.bOfs[0]+K.warp[0]*ww, ny=c[1]+K.bOfs[1]+K.warp[1]*ww;
    const mx=KLIP_TOP_VMAX*dt, ddx=nx-b.x, ddy=ny-b.y, dd=Math.hypot(ddx,ddy);
    if(dd>mx&&dd>0.01){ const kx=b.x+ddx/dd*mx, ky=b.y+ddy/dd*mx; K.bOfs[0]+=kx-nx; K.bOfs[1]+=ky-ny; nx=kx; ny=ky; }   /* FAZ 51: top da tek karede kelepçeli */
    /* FAZ 54 A4: SportVU topu çizgi dışına taşabilir (taç/sokma anları) — sahnede top çizgide durur */
    b.x=Math.max(CRT_X0+2,Math.min(CRT_X1-2,nx)); b.y=Math.max(CRT_Y0+2,Math.min(CRT_Y1-2,ny)); }
  b.h=Math.max(0,(f[2]-1.5)*KLIP_FT*9.84);   /* ft → px (çember 3,05 m ↔ 30 px); tutulan top ~1,5 ft'te */
  b.vx=0; b.vy=0; b.vh=0;
  /* tutan: en yakın hücumcu ≤ 4 ft ve top alçakta; yoksa uçuşta (pas) */
  let en=null,ed=1e9;
  K.offMap.forEach(p=>{ const d=Math.hypot(p.x-b.x,p.y-b.y); if(d<ed){ ed=d; en=p; } });
  const pxFt=(CRT_X1-CRT_X0)/KLIP_SAHA_X;
  /* ── FAZ 54 A1/A5: TOP DURUMU KLİPTE DE SÖZLEŞMEYE UYAR ─────────────────────────────
     (a) Taşıyıcı değişimi HİSTEREZİSLİ: eski taşıyıcı topa 5,6 ft'ten yakınken el değişmez —
         ölçüldü: C→C 0,6 m / 0,13 sn "pas"lar, 40 pasın ortalaması 3,4 m (gerçek 5-6 m).
     (b) Sahipsiz top (loose/rim/dead) ancak bir hücumcu 4 ft'e girince ELE geçer; doğrudan
         'pass' olmaz (`loose>pass` 13 → 0). 'pass' yalnız 'held'den açılır. */
  const tut=(en&&ed<=KLIP_TUTMA_FT*pxFt&&f[2]<7.5);
  if(tut){
    if(b.carrier!==en){
      const eskiD=(b.carrier&&isFinite(b.carrier.x))?Math.hypot(b.carrier.x-b.x,b.carrier.y-b.y):1e9;
      if(b.mode==='held'&&b.carrier&&eskiD<=KLIP_TUTMA_FT*1.4*pxFt){ /* eski taşıyıcı hâlâ topta */ }
      else { b.carrier=en; b.mode='held'; b.noDrib=false; b._heldAt=S.time; }
    } else if(b.mode!=='held'){ b.mode='held'; b._heldAt=S.time; }
  }
  else if(b.mode==='held'&&b.carrier&&Math.hypot(b.carrier.x-b.x,b.carrier.y-b.y)>KLIP_TUTMA_FT*1.6*pxFt){ b.carrier=null; b.mode='pass'; b.target=en; b.from=[b.x,b.y]; }   /* FAZ 54 A5: 4 → 6,4 ft — ölçüldü, 103 pasın 48'i 2 m altındaydı (sürme/ofset titremesi) */
  else if(b.mode==='pass'){ b.target=en; }
  /* loose / rim / dead: olduğu gibi kalır — hücumcu 4 ft'e girince 'held' */
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
  const b=S.ball;
  /* FAZ 54 A2: top şutörün eline ŞİMDİ geçiyorsa `_heldAt` şimdidir — `_ballShoot` koruması atışı
     `_TOP_TUT_SN` (0,10 sn) erteler; ekranda "topu aldı, çekti" okunur (ölçüldü: 14/26 pass>shot). */
  if(b.carrier!==K.shooter||b.mode!=='held') b._heldAt=S.time;
  b.carrier=K.shooter; b.mode='held'; b.h=Math.max(b.h||0,10);   /* top şutörün elinde — konumu klipten (ışınlama yok) */
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
