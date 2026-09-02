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
/* F14-1: 6,75 m × 29,5429 px/m. Eski 196 px SAHADAKİ ÇİZGİYE UYMUYORDU — çizilen yay
   potaya değil dip çizgiye merkezliydi (SVG kirişten küçük yarıçapı sessizce büyütür), yani
   "yayın 5 px dışı" diye üretilen üçlükler gerçekte yayın içinden atılıyordu. Sabiti
   değiştirmek şut koordinatlarını da kaydırır → band.js hash'i değişir (beklenen). */
const THREE_R=199.41;         /* 3 sayı yayı yarıçapı (çemberden) — SVG ile aynı */
const COURT_MID=470;

/* Şut noktası çemberden mesafe+açı ile üretilir: 3'lükler yayın hemen dışında,
   saha içi şutlar boya/orta mesafede kalır. Eski sürüm 3'lükleri orta sahaya
   kadar dağıtıyordu (yay dışına taşan, gerçek dışı noktalar). */
function randShotXY(isLeft,is3,made,poz){
  const rim=isLeft?RIM_L:RIM_R;
  const dir=isLeft?1:-1;
  /* ── FAZ 37 §6: ŞUT COĞRAFYASI ────────────────────────────────────────────────────
     Ölçüm: boya (rim dışı) %42,7 · orta mesafe %6,1 · rim+boya %64,7. Yani her şey
     çemberin dibinden geliyor, ORTA MESAFE ŞUTU (pull-up jumper) neredeyse hiç yok —
     gerçek basketbolun en tanıdık görüntüsü eksikti. Yarıçap bantları pozisyona göre
     yeniden çizildi: pivot hâlâ dipte, PF boya + kısa orta mesafe, dış oyuncular
     boyadan orta mesafeye kadar YAYILIR.
     ⚠ Bu bir SUNUM kararıdır: `made` bu noktada ZATEN belli, `rand()` çağrı SAYISI
     değişmiyor (üç dal da tek çağrı) — dolayısıyla rastgelelik akışı ve skor korunur.
     Değişen yalnız şutun nereden atıldığı (bölge → şut tipi → anlatım dili).
     Bölge eşikleri: d≤44 rim · d≤112 boya · üstü orta mesafe. */
  /* Tek düzgün bant (rand(a,b)) bölge paylarını AYARLAYAMAZ: aralığı genişletmek orta
     mesafeyi açarken çemberi de boşaltıyor (ölçüm: rim %23,3 → %18,6, boya hâlâ %34,8).
     Gerçek şut coğrafyası ÜÇ TEPELİDİR — çember, boya, orta mesafe. Çözüm: TEK rand()
     çağrısını ters-birikimli dağılımla üç banda paylaştırmak. Çağrı SAYISI değişmediği
     için rastgelelik akışı ve skor korunur (§1 kırmızı çizgi).
     Bölge eşikleri: d≤44 rim · 44<d≤112 boya · d>112 orta mesafe. */
  const _rBant=(u,pRim,pPaint)=>{
    if(u<pRim) return 10+Math.floor(u/pRim*33);                            /* 10-43  çember */
    if(u<pRim+pPaint) return 46+Math.floor((u-pRim)/pPaint*64);            /* 46-110 boya */
    const k=Math.max(1e-6,1-pRim-pPaint);
    return 116+Math.floor((u-pRim-pPaint)/k*72);                           /* 116-188 orta mesafe */
  };
  const _u=rand(0,10000)/10000;
  /* İsabetli şut biraz daha yakından gelir (gerçek yüzde coğrafyası). */
  const r2=poz==='C' ?_rBant(_u,made?0.65:0.55,made?0.31:0.34)
        :poz==='PF'  ?_rBant(_u,made?0.50:0.43,made?0.34:0.34)
        :             _rBant(_u,made?0.38:0.31,made?0.33:0.32);
  const r=is3
    /* kaçan üçlük en fazla yayın ~1.1m gerisinden — daha derini "orta sahadan şut" gibi görünüyordu */
    ? (made?rand(THREE_R+5,THREE_R+34):rand(THREE_R+4,THREE_R+38))
    : r2;
  /* §6: üçlük açısı ±82° iken köşe payı %39, kanat %31 çıkıyordu (gerçek: köşe ~%25,
     kanat ~%40). Açı bandı daraltılınca dağılım kanat/tepe lehine döner; iki sayılık
     şutlarda bant korunur (boya geometrisi değişmesin). */
  /* §6b: DÜZGÜN DAĞILIM KANADI TEPEDEN BÜYÜK YAPAMAZ. Bölge sınırları açıdadır
     (|a|<26° tepe · 26-52° kanat · >52° köşe); düzgün çekilişte tepe ile kanat
     bandı EŞİT genişliktedir, dolayısıyla payları da hep eşit çıkar — ölçüldü,
     ikisi de %13,7. Gerçek dağılımda kanat tepenin belirgin üstündedir. Açı
     çekilişi bu yüzden dışa doğru büzülür (üs < 1): rand ÇAĞRI SAYISI değişmez,
     yalnız dağılımın şekli değişir — sonuç matematiği (isabet zaten önce
     kararlaştırılmıştır) etkilenmez. */
  let a;
  if(is3){ const _u3=rand(-1000,1000)/1000; a=Math.sign(_u3)*68*Math.pow(Math.abs(_u3),0.87)*Math.PI/180; }
  else a=rand(-82,82)*Math.PI/180;
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
/* F14-6: kenar çizgileri 30/470 iken dikey ölçek 29,33 px/m idi (yatay 29,54) — saha %0,7
   yatay gerginti ve px'te dairesel çizilen her yay metrede elips oluyordu. Yükseklik
   443,14 px = 15 m yapılarak iki eksenin ölçeği eşitlendi. */
/* ── B-5: SAHNE PRNG'si ───────────────────────────────────────────────────────────────
   Canlı sahne kararları (kimin topu kaptığı animasyonu, kenardan sokma noktası, dizilim
   seçimi, serbest topun saçılma açısı…) `Math.random`/`rand()` kullanıyordu — yani MAÇIN
   rastgele akışını tüketiyorlardı. Sonuç: aynı tohumla iki koşu farklı sonuç veriyordu,
   çünkü animasyon karesi sayısı gerçek zamana bağlı. `season-loop` K2'nin kararsızlığı
   (2,8× / 2,7× · 1,09× / 1,24×) tam olarak buydu. Sahne artık KENDİ akışını kullanır.
   Kural (F13-3 ile aynı): canlı sahne katmanında `Math.random`/`rand()` YOK — `_sr`/`_srand`. */
let _scPr=null;
function _scSeed(s){
  let a=(s>>>0)||1;
  _scPr=function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
}
function _sr(){ if(!_scPr) _scSeed(0x9E3779B9); return _scPr(); }
function _srand(a,b){ return a+Math.floor(_sr()*(b-a+1)); }

const CRT_X0=56.4, CRT_X1=883.6, CRT_Y0=28.43, CRT_Y1=471.57;
const CRT_IN=14;     /* jeton merkezi çizgiden bu kadar içeride tutulur */
const CRT_OUT=26;    /* topu sokan oyuncunun çizgi dışına adımı */

/* F15-1: 320 px/sn = 10,8 m/sn idi — bu, oyunun ölçeğinde (29,54 px = 1 m) bir insanın
   sprint sınırının üstü. Yedek değer artık gerçek "koşu" hızıdır: 150 px/sn = 5,1 m/sn. */
const _PL_MAXV=150;          /* px/sn — hız stat'ı yoksa yedek koşu hızı */
const _PL_ACC=13;            /* hedefe yaklaşma sertliği */
const _PL_R=40;              /* çarpışma yarıçapı — jetonlar bu mesafeden yakın durmaz */
/* F16-C: AYNI TAKIM oyuncuları için daha geniş yarıçap. Ölçüm (hareket-check): karelerin
   %25,5'inde aynı takımdan iki oyuncu 2 m'nin içindeydi — izleyicinin gördüğü "isim
   etiketleri üst üste binmiş 6-8 oyuncu" tam olarak buydu. Rakip için yarıçap 40 px
   (1,35 m) kalmalı: savunmacı adamını 1,8 m'den yakın kapatır (spacing-check ŞART koşuyor),
   ama takım arkadaşları birbirinden 2 m'den uzak durur — gerçek açıklık ilkesi. */
/* 54 px (1,83 m) denendi: iki takım arkadaşı 1,83-2,0 m arasında durabildiği için yığılma
   ölçüsü %20'de kalıyordu. 62 px = 2,10 m, eşiğin üstünde. */
const _PL_R_TAKIM=62;        /* px ≈ 2,10 m */

/* ── F15-1: HAREKET KADEMELERİ ────────────────────────────────────────────────────────
   Ölçüm (tools/hareket-check.js, kalibrasyon öncesi): ortalama hız 2,86 m/sn, zamanın
   %21,9'u SPRINT (>7 m/sn), en yüksek anlık hız 13,68 m/sn — yani 49 km/sa. Gerçek
   basketbolda (sensör ölçümü) oyuncu ortalaması 1,54-1,60 m/sn ve sprint payı %0,3-8,5'tir.
   Sorun animasyon kalitesi değil HIZ ÖLÇEĞİYDİ: tek bir `maxV` vardı ve neredeyse her
   atama `sprintV`ye eşitliyordu; jeton ya duruyor ya tam gaz koşuyordu (ölçüm de tam
   olarak bunu gösterdi: %59 durma + %22 sprint, arada neredeyse hiç "jog" yok).
   Artık dört kademe var ve `maxV` DAİMA kademeden türetilir (`_setUrg`).
   baseV = JOG'dur; kademeler onun katıdır. Ortalama oyuncu (hız=60, baseV=85 px/sn):
     yürü 36 px/sn = 1,21 m/sn · jog 85 = 2,88 · koş 157 = 5,32 · sprint 234 = 7,91 */
const _V_TIER=[0.42,1.00,1.35,1.62];
const _URG={YURU:0,JOG:1,KOS:2,SPRINT:3};
/** F15-1: jetona acele kademesi ata; maxV kademeden türetilir. */
function _setUrg(p,urg){
  if(!p) return;
  const u=Math.max(0,Math.min(3,urg|0));
  p.urg=u;
  p.maxV=(p.baseV||_PL_MAXV/2)*_V_TIER[u];
}
/* F15-2: yeni dizilim noktası mevcut konuma yakınsa oyuncu YERİNDE KALIR. Gerçek
   basketbolda set hücumunda çevredeki oyuncular her pozisyonda yer değiştirmez; oyunun
   eski hâlinde `_setFormation` her çağrıldığında 10 jetona yeni hedef veriyordu.
   Şutör/kesici/perdeci ve geçiş hücumu KOS/SPRINT ile çağrıldığı için kapı onlara açılmaz. */
/* Eşik 34 px (1,15 m) denendi: oyuncular noktalarına oturmayıp çevresinde kalıyor ve
   hücumun kapladığı alan 57,5 → 39,5 m²'ye düşüyordu. 26 px (0,88 m) hem "her pozisyonda
   yer değiştirme" davranışını bitiriyor hem dizilimi bozmuyor. */
const _YERINDE_ESIK=20;      /* px ≈ 0,68 m */
function _hedefAta(p,tx,ty,urg){
  if(!p||p._oob) return;
  const d=Math.hypot(p.x-tx,p.y-ty);
  /* F16-A: eski koşul `urg<=JOG` idi; mevcut çağrıların yarısı KOŞ geçtiği için o
     çağrılarda yürüme dalı MATEMATİKSEL OLARAK imkânsızdı ve YÜRÜ kademesi canlı ölçümde
     %0,0 çıkıyordu. SPRINT muaf: hızlı hücumda/serbest topta yerinde kalma olmaz. */
  /* HEDEF HER ZAMAN KORUNUR, yalnız KADEME düşer. Eski hâli hedefi jetonun BULUNDUĞU
     noktaya sabitliyordu (`p.tx=p.x`); markajdaki savunmacı böylece pota tarafına düzeltilmiş
     hedefini hiç almıyor ve zamanla hattan kayıyordu — "ball-you-man" %86 → %83'e düştü.
     Yakınsa yürür: aynı "yerinde kalma" etkisi, geometri kaybı olmadan. */
  p.tx=_inX(tx); p.ty=_inY(ty);
  /* MARKAJDAKİ savunmacı kademe düşürmez: adamı her an hızlanabilir, yürüyerek başlayan
     savunmacı pota tarafını kaybediyor ("ball-you-man" ölçüsü bunu görüyor). */
  _setUrg(p,(d<_YERINDE_ESIK&&urg<_URG.SPRINT&&!p._mark)?_URG.YURU:urg);
}

/* Oyuncunun gerçek koşu hızı — GERÇEK ÖLÇEK: saha 940px = 28m (1px ≈ 0.03m).
   `hiz` stat'ı (0-99) → 130-210 px/sn ≈ 3.9-6.3 m/sn; sprint ×1.62. Düşük enerji
   %13'e kadar yavaşlatır. İzleme hızı (rate) bunun ÜSTÜNE çarpan olarak biner. */
function _tokBaseV(pl){
  const hiz=(pl&&pl.hiz!=null)?Number(pl.hiz):60;
  const en=(pl&&pl.enerji!=null)?Number(pl.enerji):100;
  const fat=1-0.13*Math.max(0,Math.min(1,(100-en)/100));
  /* F15-1: baseV artık KOŞU değil HAFİF KOŞU (jog) hızıdır — koşu ve sprint `_V_TIER`
     çarpanlarıyla türetilir. Eski taban 130 px/sn = 4,40 m/sn idi; bu, gerçek basketbolun
     "koşu" bölgesinin üst yarısıdır ve oyunun EN YAVAŞ jetonuydu.
     ⚠ HIZLAR SAHNE SANİYESİNDEDİR. Sahne maç saatini ~2× sıkıştırır (ölçüldü: 1 sahne sn
       = 1,98 maç sn), yani gerçek basketbolla kıyaslanacak değer bunun YARISIDIR:
       hız=0 → 130 px/sn = 4,40 m/sn sahne = 2,22 m/sn maç
       hız=60 → 178 px/sn = 6,04 sahne = 3,05 maç · hız=99 → 210 = 7,11 sahne = 3,59 maç
     Kademeler bunun katıdır; JOG bandının üstünde durmasının sebebi zaman sıkıştırmasıdır. */
  return (130+Math.max(0,Math.min(99,hiz))/99*80)*fat;
}
function _tokShort(name){ const a=String(name||'').trim().split(/\s+/); return a[a.length-1]||String(name||''); }
/* ── FAZ 33 §7: ANLATIMDA ÇOK KISA SOYAD TAM ADLA GEÇER ────────────────────────────
   İsim havuzlarında 100 kadar iki harfli soyad var (Senegal: Sy · Ba · Ka · Lo ·
   Kanada: Ho · Li · Ng · Wu · Türkiye: Öz). Bunlar gerçek soyadlardır, hata değil —
   ama anlatımda tek başına geçince cümle kopuk okunuyor: "Sa pota altında hükmetti",
   "Sa pasıyla Graham Morin…". Sahadaki JETON ETİKETİ kısa kalmalı (yer yok), anlatım
   ise tam adı kullanır. Ayrım bilinçli: _tokShort jeton içindir, _anlatimAdi anlatım.
   Eşik 3 harf — "Öz" ve "Ng" tam adla, "Kaya" tek adla geçer. */
const _ANLATIM_MIN_SOYAD=3;
/* ── FAZ 36 §B6: PARÇACIKLI SOYADLAR BÖLÜNMEZ ──────────────────────────────────────
   "Guillaume Van Hooren" kısaltılırken yalnız son kelime alınıyor ve anlatımda
   "Hooren topu yukarı taşıdı" çıkıyordu — soyad "Van Hooren"dir, "Hooren" değil.
   Aynı sınıf: "De Vries", "Von Scholz", "De la Cruz", "Dos Santos", "Di Marco",
   "Le Roux", "Van der Berg". Parçacık soyadın PARÇASIDIR; ek çekimi de (turkEk)
   tam soyad üzerinden yapılır çünkü okunuş son heceden gelir.
   ⚠ Yalnız SON kelimeden geriye doğru yürünür ve ilk kelime asla yenmez — "De" bir
   ön ad olsaydı (a[0]) soyad boş kalırdı. */
const _AD_PARCACIK=/^(van|von|de|del|della|di|da|das|dos|du|der|den|le|la|el|ter|ten|bin|ibn|mac|mc|af|av)$/i;
function _soyadTam(a){
  let i=a.length-1;
  while(i>0&&_AD_PARCACIK.test(a[i-1])) i--;
  return a.slice(i).join(' ');
}
function _anlatimAdi(name){
  const tam=String(name||'').trim();
  if(!tam) return tam;
  const a=tam.split(/\s+/);
  if(a.length<2) return tam;                 /* tek kelimelik adda yapacak bir şey yok */
  const son=_soyadTam(a)||tam;
  return (son.replace(/\s+/g,'').length<_ANLATIM_MIN_SOYAD)?tam:son;
}
function _tokSet(g,x,y,sc){
  if(!g) return;
  g.setAttribute('transform',(sc&&Math.abs(sc-1)>0.004)
    ? `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc.toFixed(3)})`
    : `translate(${x.toFixed(1)},${y.toFixed(1)})`);
}
function _mir(p){ return [940-p[0],p[1]]; }
function _rim(left){ return left?RIM_L.slice():RIM_R.slice(); }
function _jit(n,a){ return n+(_sr()*2-1)*(a||10); }
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
      /* §6.1: YÖNELİM göstergesi ÇİZİLMEZ (kullanıcı kararı, FAZ 25 sonrası canlı test).
         Jetonun kenarındaki küçük beyaz nokta sahayı okumayı kolaylaştırmadı, aksine
         "bu ne?" sorusu üretti. Yön HESABI (`p.yon` / `_sirtDonuk`) yerinde duruyor —
         post oyununu ve F25-6a kapısını besliyor —, yalnız görsel katman kaldırıldı.
         Parkede yalnız oyuncular, numaralar, adlar ve top vardır (37. oturumdaki
         "canlı sahada O/X şut izi yok" kararının devamı). Geri EKLENMEMELİ. */
      g.appendChild(c); g.appendChild(t); g.appendChild(nm);
      layer.appendChild(g);
      g._face=null;
      return g;
    };
    const homeP=(lu&&lu.onCourt)?lu.onCourt.slice(0,5):[];
    const rk=(rakip&&rakip.isim)?_tokShort(rakip.isim):'Rakip';
    const mkP=(g,x,y,team,slot,pl)=>{
      const bv=_tokBaseV(pl);
      return {g,x,y,vx:0,vy:0,tx:x,ty:y,team,slot,pl:pl||null,baseV:bv,sprintV:bv*_V_TIER[3],maxV:bv,urg:_URG.JOG,
              ph:_sr()*6.283,side:_sr()<0.5?-1:1,role:null,pop:0,sc:1,_oob:false,_lock:0,
              /* §6.1: yönelim (radyan) + sırtı dönük bayrağı (post-up) */
              yon:0,_sirtDonuk:false};
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
    _scSeed(0x5CE4E5 ^ ((mState.events&&mState.events.length)||0));   /* B-5: sahne PRNG'si */
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
      botDef:_sr()<0.25?'bolge':'adam',
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
    tok.baseV=bv; tok.sprintV=bv*_V_TIER[3]; _setUrg(tok,_URG.JOG);
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
    const raw=(ts-S.last)/1000;
    const dtReal=Math.min(0.05,raw);   /* tek karede fizik sıçramasın */
    S.last=ts;
    /* maç bittikten ~3sn sonra döngüyü bırak (pil) */
    if(typeof mState!=='undefined'&&mState&&mState.running===false&&!mState.paused){
      S.idle+=dtReal; if(S.idle>3){ S.raf=null; return; }
    } else S.idle=0;
    /* F11-1 (FAZ 11): KARE KAYBINDA YETİŞ.
       Sim saati requestAnimationFrame'e, olay zamanlayıcısı ise setTimeout'a bağlı. Sekme arka
       plana alınınca (ya da cihaz ağırlaşınca) rAF saniyede ~1 kareye düşer, dtReal 0,05'e
       kırpıldığı için sim saati gerçek zamanın ~1/13'ü kadar ilerler — ama olaylar akmaya devam
       eder. Ölçüm: 10 sn arka planda sim yalnız 0,77 sn ilerledi, 2 olay geçti. Sonuç: jetonlar
       geçiş dizilimine takılı kalıyor, set dizilimine HİÇ ulaşamıyor (FAZ 11 belgesinin
       "oyuncular orta sahada duruyor, boya boş" ölçümünün kaynağı budur).
       Çözüm: boşluk büyükse animasyonu simüle etmek yerine sahneyi güncel olaya eşitle. */
    if(raw>0.35) { try{ _simCatchUp(); }catch(e){} }
    else { try{ _simStep(dtReal); }catch(e){} }
    S.raf=requestAnimationFrame(loop);
  };
  S.raf=requestAnimationFrame(loop);
}

/** F11-1: Kare kaybı sonrası sahneyi anlatımın bulunduğu ana eşitle.
    Kayıp karelerde "yavaş yürüyüş" simüle etmenin karşılığı yok: oyuncu zaten gitmiş olmalıydı.
    Sırayla (1) bekleyen koreografi adımları, (2) bekleyen anlatım/top işleri, (3) jetonlar
    hedeflerine, (4) top taşıyıcıya, (5) tek tick ile savunma takibi + sınır düzeltmesi. */
function _simCatchUp(){
  const S=mState._sim; if(!S) return;
  S.cuCount=(S.cuCount||0)+1;   /* teşhis sayacı: ön planda 0'a yakın olmalı (araçlar okur) */
  if(S.script&&S.script.length){
    S.sT=S.script[S.script.length-1].at;
    while(S.sIdx<S.script.length){ const st=S.script[S.sIdx++]; try{ st.fn(); }catch(e){} }
    S.script=[]; S.sIdx=0;
  }
  _flushPending(S);
  S._snapN=(S._snapN||0)+1;   /* F15-3: yetişme ışınlaması damgası (hareket-check okur) */
  const P=S.players||[];
  for(const p of P){
    if(!p) continue;
    /* Topu sokan oyuncunun çizgi dışı izni sürer — onu sahaya kırpma. */
    if(p.tx!=null) p.x=p._oob?p.tx:_inX(p.tx);
    if(p.ty!=null) p.y=p._oob?p.ty:_inY(p.ty);
    p.vx=0; p.vy=0; p._wp=null;
    _tokSet(p.g,p.x,p.y,p.sc);
  }
  const b=S.ball;
  if(b&&b.carrier){ b.x=b.carrier.x; b.y=b.carrier.y; b.h=0; }
  try{ _simTick(0.033); }catch(e){}
  _ballRender();
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

/* ── FAZ 37 §9.2: SAHİPSİZ TOP WATCHDOG'U ────────────────────────────────────────────
   §9.1 bilinen kök nedeni kapatır; bu sayaç kök neden NE OLURSA OLSUN "top boşlukta
   duruyor" görüntüsünü yapısal olarak imkânsız kılar. Ölçüt: top UÇMUYORKEN (şut/rim
   dışında) en yakın oyuncu 2 m'den (59 px) uzaksa sahipsiz sayılır; 1,2 sn üst üste
   sahipsizse kurtarma çalışır.
   ⚠ Şut ve çemberden düşüş muaf — top orada tasarım gereği kimsenin elinde değildir.
   ⚠ Yalnız SAHNE katmanı; maç matematiğine dokunmaz, rastgelelik tüketmez. */
const _SAHIPSIZ_PX=59;        /* ≈ 2 m (29,5429 px/m) */
const _SAHIPSIZ_SN=0.6;   /* FAZ 37: 1,2 sn kuyruğu ölçümde %2,3 sahipsiz kare bırakıyordu */
function _sahipsizTopTick(S,dt){
  try{
    const b=S.ball;
    if(!b||b.mode==='shot'||b.mode==='rim'||b.carrier){ S._sahipsizT=0; return; }
    let ed=1e9;
    for(const p of (S.players||[])){
      if(!p||!isFinite(p.x)) continue;
      const d=Math.hypot(p.x-b.x,p.y-b.y);
      if(d<ed) ed=d;
    }
    /* Peşinde koşan biri varsa süre işlemez — o zaten topa gidiyor. */
    if(ed<=_SAHIPSIZ_PX||S.chase){ S._sahipsizT=0; return; }
    S._sahipsizT=(S._sahipsizT||0)+dt;
    if(S._sahipsizT>=_SAHIPSIZ_SN){ S._sahipsizT=0; _ballKurtar(); }
  }catch(e){}
}
function _simTick(dt){
  const S=mState._sim; if(!S) return;
  S.time+=dt;
  _sahipsizTopTick(S,dt);
  /* 0) zamanlanmış koreografi adımları */
  if(S.script.length){
    S.sT+=dt;
    while(S.sIdx<S.script.length&&S.sT>=S.script[S.sIdx].at){
      const st=S.script[S.sIdx];
      /* FAZ 37 §8.3: KOŞULLU BEKLEME. Adımda 'bekle' varsa koşul sağlanana kadar (en
         fazla 'max' sahne saniyesi) bu adım VE sonrakiler ertelenir; böylece serbest
         atış ritmi (atışlar ~1 sn arayla) korunur, yalnız başlangıç kayar. */
      if(typeof st.bekle==='function'){
        st._w=(st._w||0);
        if(st._w<(st.max||2.5)&&!st.bekle()){
          st._w+=dt;
          for(let i=S.sIdx;i<S.script.length;i++) S.script[i].at+=dt;
          break;
        }
      }
      S.sIdx++;
      try{ st.fn(); }catch(e){}
    }
    if(S.sIdx>=S.script.length){ S.script=[]; S.sIdx=0; }
  }
  /* 1) SERBEST TOP TAKİBİ — top yerde/havadayken peşindeki oyuncu GERÇEKTEN koşar;
        yetişince alır (eski sürümde sabit zamanlayıcıyla top oyuncunun eline ışınlanıyordu). */
  if(S.chase){
    const c=S.chase, b=S.ball, t=c.tok;
    c.t=(c.t||0)+dt;
    /* Zaman aşımı HER modda geçerli — mod uyuşmasa bile geri çağrı düşmesin. */
    if(c.t>(c.max||3.2)){
      S.chase=null;
      /* Takip zaman aşımına uğrasa da top TAKİPÇİYE verilir: takip zaten "bu oyuncu topu
         alacak" demektir; vermezsek anlatımda adı geçen oyuncu ile sahadaki taşıyıcı ayrışır. */
      if(t){ _ballHold(t); t.pop=1; }
      if(typeof c.fn==='function'){ try{ c.fn(); }catch(e){} }
    }
    else if(!t||(b.mode!=='loose'&&b.mode!=='rim')){
      /* Top başkasına geçti/tutuldu: takibi bitir ama geri çağrıyı ÇALIŞTIR. */
      if(b.mode!=='pass'&&b.mode!=='shot'){
        S.chase=null;
        if(typeof c.fn==='function'){ try{ c.fn(); }catch(e){} }
      }
    }
    else {
      t.tx=b.x; t.ty=b.y; _setUrg(t,_URG.SPRINT); t._lock=S.time+0.1;
      const d=Math.hypot(t.x-b.x,t.y-b.y);
      if(d<(c.r||26)&&b.h<30){
        _ballHold(t); t.pop=1; S.chase=null;
        if(typeof c.fn==='function'){ try{ c.fn(); }catch(e){} }
      }
    }
  }
  /* 1a) §1: TOPU KARŞI SAHAYA UZUN TAŞIMAZ — genel kapı.
     Çıkış pası ribaund / çalma / sokma yollarında ayrı ayrı kuruldu, ama top pozisyon
     içinde el değiştirip bir uzunda kalabiliyor ve orta sahayı o geçiyordu (ölçüm:
     taşımaların %83,9'u 1/2/3, hedef ≥%85). Burada tek bir yerde: uzun, ORTA SAHAYA
     yaklaşırken hâlâ topu sürüyorsa en yakın guard'a çıkarır.
     Pota 4 m yakınsa (_cikisHedefi kuralı) pas aranmaz — uzun kendi bitirir. */
  if(S.offP&&S.ball&&S.ball.mode==='held'){
    const c=S.ball.carrier;
    /* ⚠ Koreografi kesilmez: bu kapı sahne katmanının KENDİ pasıdır, anlatımda karşılığı
       yoktur. Senaryolu şutörden topu alırsa anlatım ile sahne ayrışır ("mantıksız pas")
       ve şut noktası boşta kalır. Aktif takip sırasında da devreye girmez. */
    if(c&&!_tasiyabilir(c)&&S.time>=(S.cikisSonra||0)&&c!==S.shooter&&!S.chase){
      /* Orta saha şeridi: taşıyıcı kendi yarısından çıkmak üzere. */
      /* FAZ 37 §7.1: şerit 150 → 250 px (orta çizgiye 8,5 m kala). Uzun oyuncu topu
         orta sahaya VARMADAN çıkarır; eski dar şeritte pas ancak çizginin dibinde
         atılıyor, ölçümde taşıma o uzuna yazılıyordu. */
      const ortaya=Math.abs(c.x-COURT_MID)<250;
      /* §7.1: uzun topu aldıktan 1,2 sn sonra her hâlükârda çıkarır — kendi yarı
         sahasında sürmeye devam edemez. Zaman damgası topu aldığı anda kurulur. */
      if(c._topAldi==null) c._topAldi=S.time;
      const gecikti=(S.time-c._topAldi)>=1.2;
      if(ortaya||gecikti){
        const hedef=_cikisHedefi(c,S.offP,_rim(S.offSide));
        if(hedef){ S.cikisSonra=S.time+1.2; c._topAldi=null; _ballPass(hedef); }
      }
    }
  }
  /* 1b) §2: SET HÜCUMUNDA DONMA YOK.
     Sorun: top taşıyan üçlük yayına gelince duruyor ve koreografinin bir sonraki adımı
     (tSwing / tKey) gelene kadar HERKES kıpırdamadan bekliyordu — 1,5-2 sn'lik ölü kareler.
     Gerçek basketbolda kimse durmaz: topçu tepede sürmeye devam eder, topsuzlar
     yerlerinde ufak düzeltmeler yapar.
     Çözüm koreografiyi DEĞİŞTİRMEZ: dizilim noktasının ÇEVRESİNDE küçük (≤22 px ≈ 0,75 m)
     yeni hedefler verilir. Ortalama konum korunduğu için FAZ 11 aralık ölçümleri kaymaz.
     ⚠ Sahne PRNG'si (`_sr`) kullanılır — maçın rastgele akışı tüketilmez (B-5). */
  if(S.canliSet&&S.offP){
    const b=S.ball;
    for(const p of S.offP){
      if(!p||p._oob) continue;
      /* KİLİT ("_lock") koreografinin "bu oyuncuyu yeniden yönlendirme" işaretidir —
         "kıpırdamasın" değil. Kilitli oyuncular (şutörün bekleyişi 1,9 sn'ye kadar,
         kesici 1,2 sn, perdeci 1,1 sn) tamamen atlanınca ekranda taş gibi duruyorlardı
         (ölçüm: 48 donma, en uzun 1,52 sn). Kilitliye YALNIZ yerinde ağırlık aktarması
         verilir: 5 px (≈0,17 m), kademe değişmez, dizilim ölçümü etkilenmez. */
      const kilitli=(p._lock>S.time);
      /* Hedefi 1,15 sn'den uzun süredir değişmemiş olana yeni bir nokta ver.
         ⚠ Eşik kapının (1,5 sn) ALTINDA kalmalı ve araya ek bir "tur aralığı" GİRMEMELİ:
         ilk sürümde 1,42 sn eşik + 0,85 sn tur aralığı vardı, en kötü durumda 2,27 sn
         ediyordu. Churn'ü oyuncu başına eşik zaten sınırlıyor.
         ⚠⚠ Eşik SAHNE saatinde (`S.time`) değil GERÇEK saatte ölçülür. Ölçüm gösterdi:
         donma anında S.time farkı yalnız 0,67 sn iken kullanıcının gördüğü süre 1,50 sn
         idi — sahne saati duvar saatinin ~0,45 katı akıyor. "Donmuş görünmek" bir SEYİRCİ
         algısıdır, bu yüzden ölçüt de seyircinin saati olmalı (F15 "sahne saati ≠ maç
         saati" dersinin bu maddeye düşen karşılığı). */
      if(_rtNow()-(p._sonHedefRt||0)<340) continue;
      /* ⚠⚠ GERİLEME DÜZELTMESİ (FAZ 25 sonrası canlı test): salınım, hedefine DOĞRU
         YÜRÜYEN jetonun hedefini de eziyordu. Sonuç sahada şuydu:
           • serbest top takipçisi (`_chase`, her karede `t.tx=b.x` yazar ve `_lock` verir)
             topa koşmayı bırakıyor, 3,2 sn sonra zaman aşımı topu ona UZAKTAN gönderiyordu
             → "ribaund sahada olmayan oyuncuya gidiyor";
           • koreografinin şut noktasına yolladığı şutör yolda kalıyor, `bridge()` topu boş
             noktaya ghost pasla taşıyıp oradan attırıyordu → "boşluktan şut".
         DONMA bir SEYİRCİ algısıdır ve yalnız YERİNE VARMIŞ jeton için anlamlıdır; yolda
         olan jeton zaten hareket hâlindedir. Bu yüzden salınım artık yalnız hedefine
         varmış (< _YERINDE_ESIK) jetona verilir ve aktif takipçiye hiç dokunulmaz. */
      if(S.chase&&S.chase.tok===p) continue;
      if(Math.hypot(p.x-p.tx,p.y-p.ty)>_YERINDE_ESIK){ p._sonHedefRt=_rtNow(); continue; }
      const merkez=p._setTx!=null?[p._setTx,p._setTy]:[p.tx,p.ty];
      const topta=(b&&b.carrier===p);
      /* Topu tutan tepede daha geniş salınır (canlı dribbling); topsuzlar ufak düzeltme.
         ⚠ Salınım YÖNÜ rastgele DEĞİL, potaya doğru/potadan uzağa (radyal). Serbest yönlü
         salınım savunmacıyı adam-pota doğrultusundan çıkarıyordu: ball-you-man ölçümü
         %82,9'dan %79,7'ye düştü. Radyal hareket sıralamayı bozmaz ve basketbolun kendi
         hareketidir (topa flaş / geri açılma). */
      const rim=S.defRim||_rim(S.offSide);
      const dx=rim[0]-merkez[0], dy=rim[1]-merkez[1], d=Math.hypot(dx,dy)||1;
      /* Topçunun salınımı KÜÇÜK: top zaten sekiyor, jetonu fazla oynatmak savunmacısını
         kopartıyor ve markaj ölçümünü bozuyor. */
      /* ⚠⚠ F25-2 KÖK NEDENİ (ölçülerek bulundu). Yön HER ADIMDA çevriliyordu: hedef
         +7 px, ardından −7 px, ardından +7 px… Jeton varış freni yüzünden (hedefe 24 px
         kalınca üst hız 10 px/sn) hedefe VARAMADAN yön değişiyor, salınım merkez etrafında
         simetrik kalıyor ve 1,5 sn'deki NET yer değiştirme sıfıra yakın çıkıyordu — kapı
         haklı olarak "yerinde çakılı" diyordu (26 donma; teşhis: kilitli 1, topta 0,
         hedefi uzakta 2 → hepsi dizilim noktasında duran topsuz oyuncular).
         Çözüm genliği büyütmek DEĞİL, salınımı TEK YÖNLÜ SÜRÜKLENMEYE çevirmektir:
         oyuncu radyal eksende bir yöne doğru adım adım kayar, ±_NUDGE_BAND sınırına
         gelince yön çevirir. Ortalama konum yine dizilim noktasıdır (FAZ 11 aralık
         ölçümleri kaymaz) ama hareket birkaç adım boyunca AYNI yönde sürdüğü için
         ekranda gerçek bir yer değiştirme olur — basketbolun kendi "topa flaş / geri
         açılma" hareketi de zaten budur, ileri-geri titreme değil. */
      /* Adım KÜÇÜK, bant GENİŞ olmalı: yön ne kadar seyrek çevrilirse sürüklenme o kadar
         uzun süre tek yönlü kalır. ±15 px bantta yön ~1 sn'de bir dönüyordu ve dönüş
         anlarında jeton yine merkeze yapışık görünüyordu (12 donma, hepsi hızı 12-21 px/sn
         olan HAREKETLİ jetonlar). ±22 px (0,74 m) bantta yarım tur ~2,7 sn sürer; her
         1,5 sn'lik pencerede sürüklenme tek yönlüdür. Ortalama konum yine dizilim
         noktasıdır — FAZ 11 aralık ölçümleri bunu görmez. */
      /* ⚠ TOPÇUNUN BANDINI GENİŞLETMEK DENENDİ VE GERİ ALINDI (F25-2, ölçüldü).
         Sorun gerçek: donan jeton her koşuda topu TUTAN oyuncu (topta=true ·
         hedefUzak=0 · nudge=5 · hız 1,4-2,2 px/sn) ve bandı 15 px olduğu için
         sürüklenme varış freninin (24 px) tamamen içinde kalıyor. Ama bandı 21 px /
         adımı 6-9 px yapmak jetonu hızlandırmak yerine SAHAYI YAVAŞLATTI: topçu
         daha çok gezinince takım arkadaşı ayırma döngüsü (_PL_R_TAKIM) ötekilerin
         salınım uçlarını kapatıyor ve onlar duruyor. Ölçüldü — ortalama hız 1,34 →
         1,21 m/sn · YÜRÜ payı %43,7 → %45,6 · hafif koşu %12,8 → %11,2; üç
         hareket-check kapısı birden düştü. Tek jetonun 1,5 sn'lik donması bundan
         küçük bir kusur; doğru çözüm bandı büyütmek değil, topçuya ayırma
         döngüsünden bağımsız bir sürüş hareketi vermek — ayrı bir iş. */
      const _tmax=kilitli?5:(topta?6:7), _tmin=kilitli?3:4;
      const _band=kilitli?9:(topta?15:22);          /* px — sürüklenmenin sınırı (≤0,74 m) */
      const mx=kilitli?p.x:merkez[0], my=kilitli?p.y:merkez[1];
      /* ⚠ BANT SAHA İÇİNE OTURTULUR. Radyal eksenin DIŞA bakan ucu köşe slotlarında
         (SET_SPREAD x=56, y=38/462) saha sınırının dışına düşüyor ve `_inX`/`_inY`
         onu kırpıyordu. Kırpılan uçta sürüklenme her adımda geri dönüyor, jeton
         merkeze yapışık kalıyordu — ölçümde donmaların 13/30'u rol 2 (köşe), 10/30'u
         rol 3'tü. Bant artık ölçülerek daraltılır: hangi uç kırpılıyorsa o uç 0'a
         çekilir ve sürüklenme TEK YÖNLÜ olarak sahanın içine doğru yapılır. İki uç da
         kapalıysa eksen dike çevrilir (dip çizgi boyunca kayma). */
      /* ⚠⚠⚠ F25-2'nin ASIL kalıntısı: TAKIM ARKADAŞI ÇARPIŞMASI (`_PL_R_TAKIM`=62 px
         ≈ 2,10 m). Salınım hedefi bir takım arkadaşının 2,10 m'sine girdiğinde ayırma
         döngüsü jetonu geri itiyor, hedef çekimi tekrar içeri çekiyor ve jeton yerinden
         GİTMEDEN 20 px/sn hızla titriyordu. Ölçüm bunu açıkça gösterdi: donan jetonlar
         hedefindeydi (hedefUzak ≈ 1) ama hızları 18-21 px/sn idi ve donmalar İKİŞER
         İKİŞER, aynı saniyede geliyordu (rol 2 + rol 3) — yani birbirine yaslanan iki
         oyuncu. Bir uç, saha dışına düşüyorsa VEYA bir takım arkadaşını 2,10 m'nin içine
         sokuyorsa artık kapalı sayılır; sürüklenme daima açık uca doğru yapılır. Bu aynı
         zamanda aralığı (spacing) İYİLEŞTİRİR: boşta duran oyuncu kalabalıktan uzağa
         kayar, üstüne değil. */
      const _minTm=(x,y)=>{ let m=1e9;
        for(const q of S.offP){ if(!q||q===p||q._oob) continue;
          const dd=Math.hypot(q.x-x,q.y-y); if(dd<m) m=dd; }
        return m; };
      const _simdiki=_minTm(mx,my);
      let _ax=dx/d, _ay=dy/d;
      /* Uç puanı: kırpılıyorsa kapalı; değilse en yakın takım arkadaşına uzaklık. */
      const _uc=(ux,uy,rr)=>{ const hx=mx+ux*rr, hy=my+uy*rr;
        if(Math.abs(_inX(hx)-hx)>0.5||Math.abs(_inY(hy)-hy)>0.5) return -1;
        return _minTm(hx,hy); };
      /* Eşik: normalde 2,10 m; oyuncu ZATEN sıkışıksa "bulunduğundan kötü olmasın" yeter. */
      const _esik=Math.min(_PL_R_TAKIM,_simdiki+1);
      const _eksen=(ux,uy)=>{ const a=_uc(ux,uy,_band), b2=_uc(ux,uy,-_band);
        return { hi:a>=_esik?_band:0, lo:b2>=_esik?-_band:0, iyi:Math.max(a,b2) }; };
      let _e=_eksen(_ax,_ay);
      if(_e.hi-_e.lo<12){                          /* radyal eksen tıkalı → dik eksen */
        const _e2=_eksen(-_ay,_ax);
        if(_e2.hi-_e2.lo>_e.hi-_e.lo){ const _t=_ax; _ax=-_ay; _ay=_t; _e=_e2; }
      }
      const _hi=_e.hi, _lo=_e.lo;
      if(p._nudgeYon!==1&&p._nudgeYon!==-1) p._nudgeYon=(_sr()<0.5?-1:1);
      if(p._nudgeOfs==null) p._nudgeOfs=0;
      p._nudgeOfs=Math.max(_lo,Math.min(_hi,p._nudgeOfs));
      /* Tek uç açıksa sürüklenme o uca doğrudur — kapalı uca vurup beklemez. */
      if(_hi===0&&_lo<0) p._nudgeYon=-1;
      else if(_lo===0&&_hi>0) p._nudgeYon=1;
      const _adim=_tmin+(_tmax-_tmin)*_sr();
      let _ofs=p._nudgeOfs+p._nudgeYon*_adim;
      if(_ofs>_hi||_ofs<_lo){ p._nudgeYon=-p._nudgeYon; _ofs=p._nudgeOfs+p._nudgeYon*_adim; }
      _ofs=Math.max(_lo,Math.min(_hi,_ofs));
      p._nudgeOfs=_ofs;
      const r=_ofs;
      /* ⚠ `_hedefAta` KULLANILMAZ: nokta 26 px'ten yakınsa hedefi DEĞİŞTİRMEZ (F15-1,
         "her pozisyonda yer değiştirme" kuralı) ve salınım ≤9 px olduğu için hedef hep
         aynı kalıyordu — sayaç sıfırlanıyor ama jeton donuk duruyordu (ölçüm: 51 donma,
         en uzun 1,52 sn). Burada kastedilen yer değiştirme değil, YERİNDE kıpırdanmadır;
         hedef doğrudan yazılır ve kademe yürüyüş/jog'da kalır. */
      /* Kilitli oyuncunun merkezi dizilim noktası değil, BULUNDUĞU yerdir (`mx`/`my`
         yukarıda öyle kuruldu) — koreografinin götürdüğü noktadan geri çekilmesin. */
      p.tx=_inX(mx+_ax*r); p.ty=_inY(my+_ay*r);
      /* Kademe JOG: YÜRÜ verilince canlı salınım YÜRÜ payını %47,5'ten %52,8'e
         çıkarıyor ve hareket-check kapısını düşürüyordu (hedef %20-45). Salınım küçük
         bir mesafedir, kademe yalnız ÜST HIZI belirler — jeton yine yerinde kıpırdanır. */
      if(!kilitli) _setUrg(p,_URG.JOG);
      p._sonHedefT=S.time; p._sonHedefRt=_rtNow();
      p._swayT=S.time+0.60;        /* salınım penceresi: fren tavanı bu süre boyunca gevşer */
      p._nudgeN=(p._nudgeN||0)+1;   /* teşhis sayacı — sunum-check okur, davranışa dokunmaz */
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
        /* F16-A: ölü bölge 12/30 px idi; savunmacının hedefi o kadar bayat kalabildiği için
           adamı hareket edince kısa süre pota tarafını kaybediyordu. 8/20 px'e çekildi —
           jitter koruması sürüyor, gecikme azalıyor. */
        /* FAZ 36 §A3: ölü bölge 8/20 → 6/14 px. Ball-you-man kaybının kalan payı TAKİP
           GECİKMESİDİR; hedef ne kadar bayat kalırsa savunmacı o kadar uzun süre yanlış
           tarafta durur. Jitter koruması (deadzone fikri) sürüyor, gecikme kısalıyor. */
        if(p._mkx==null||Math.hypot(m.x-p._mkx,m.y-p._mky)>6||Math.hypot(b.x-(p._bbx||0),b.y-(p._bby||0))>14){
          p._mkx=m.x; p._mky=m.y; p._bbx=b.x; p._bby=b.y;
          const hx=onBall?rim[0]:(rim[0]+b.x)/2, hy=onBall?rim[1]:(rim[1]+b.y)/2;
          /* ⚠ ARALIK DARALTMASI DENENDİ VE GERİ ALINDI (27 → 21 px): savunmacı adamına
             yaklaşınca _defBehind'in adam-pota doğrultusuna oturması için yer kalmıyor,
             savunmacı ARASINA değil YANINA geçiyor — ölçüldü, ball-you-man %83,8-85,6'dan
             %78,7-81,7'ye düştü, markaj mesafesi ise kayda değer düzelmedi. Ölçülen
             mesafe (1,85 m) hedefin (0,91 m) çok üstünde çünkü fark TAKİP GECİKMESİDİR;
             hedefi kısmak gecikmeyi kısmıyor. */
          const gap=onBall?(p._press?20:24):_defGap(Math.hypot(m.x-b.x,m.y-b.y));
          const dx=hx-m.x, dy=hy-m.y, d=Math.hypot(dx,dy)||1;
          { const bh=_defBehind(m.x+dx/d*gap,m.y+dy/d*gap,m,rim,onBall?gap:46); p.tx=_inX(bh[0]); p.ty=_inY(bh[1]); }
          /* F11-4: topsuz savunmacı yalnız baseV ile takip ediyordu; hücum sprintle yer
             değiştirince (kesme, geç şutör koşusu) adamından 5-7 m geride kalıyordu.
             Hücumun sprint hızının (baseV*1,62) altında ama takip edebilecek kadar hızlı. */
          /* F15-1: kalan mesafe kısa ise savunmacı KOŞMAZ, adımlayarak yerini ayarlar —
             topsuz savunmacının maç boyunca jog etmesi ortalama hızı gerçek dışı yapıyordu. */
          const _kd=Math.hypot(p.x-p.tx,p.y-p.ty);
          const _mu=(m.urg!=null?m.urg:_URG.JOG);
          /* F15-1: savunmacı adamının POTA TARAFINDA değilse (ball-you-man bozuk) toparlanma
             KOŞUDUR — jog ile kurtarmaya çalışınca oran %87'den %74'e düşüyordu (ölçüm). */
          const _rimSide=Math.hypot(p.x-rim[0],p.y-rim[1])<=Math.hypot(m.x-rim[0],m.y-rim[1]);
          /* ── FAZ 34 eki: TOPARLANMA SPRİNTTİR ────────────────────────────────────
             FAZ 34 özel yetenek sistemi `hiz` bandını 55-92'den 20-99'a genişletti;
             taban hız stattan türediği için (`_tokBaseV`) yavaş savunmacı ile hızlı
             hücumcu arasındaki fark %17'den %44'e çıktı. Kademe eşitlemesi (F15-1)
             tek başına yetmiyor: aynı kademede bile savunmacı geride kalıyor ve
             ölçüldü — ball-you-man %85'in altına (%81,8), topu tutana markaj mesafesi
             1,81 m'den 1,90 m'ye çıktı. Pozisyonunu KAYBETMİŞ savunmacı (adamının pota
             tarafında değil) ya da topu tutana uzak düşmüş savunmacı artık SPRINT ile
             toparlanır — gerçek basketbolda da toparlanma koşusu sprinttir.
             ⚠ Yalnız SAHNE katmanı; maç matematiğine dokunmaz. */
          /* ⚠ EŞİK DARALTILMASI DENENDİ VE GERİ ALINDI: 0,8× ile topu tutanın
             savunmacısı sürekli sprinte geçiyor, 24 px'lik varış freniyle birlikte
             hedefini AŞIYOR ve salınıyor — ölçüldü, markaj 1,92 → 2,00 m'ye, ball-you-man
             %85,8 → %84,6'ya geriledi. Sprint yalnız GERÇEKTEN uzak düşünce anlamlı. */
          const _uzakOnBall=onBall&&_kd>_YERINDE_ESIK*1.5;
          const _taban=(!_rimSide||_uzakOnBall)?_URG.SPRINT
            :(onBall?_URG.KOS:_URG.JOG);   /* FAZ 36 §A2: topsuz savunmacı da savunma duruşunda kayar (YÜRÜ değil) */
          _setUrg(p,Math.max(_taban,_mu));
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
    /* F16-A: HEDEFİNE VARAN JETON KADEMESİNİ DÜŞÜRÜR. Kademe yalnız atama anında
       veriliyordu; yerine varmış oyuncu pozisyon boyunca koşu kademesini taşımaya devam
       ediyor ve YÜRÜ payı ölçümde %3,7'de kalıyordu. Davranış neredeyse değişmez (varış
       freni zaten hızı sınırlıyor), ama kademe artık gerçeği söyler. SPRINT ve koreografi
       kilidi altındaki jeton muaftır. */
    /* FAZ 36 §A2: SAVUNMACI YÜRÜMEZ. Yerine varan jetonu YÜRÜ'ye düşüren bu kural,
       markajdaki savunmacıyı da kapsıyordu ve ölçümde zamanın %47'si YÜRÜ kademesinde
       geçiyordu (hedef %20-45) — sahayı 'ağır çekim' gösteren asıl etken buydu. Gerçek
       basketbolda savunmacı adamının yanında dururken de savunma duruşunda kayar.
       Hücumda ve ölü topta kural aynen sürer. */
    const _savunmada=!!(S.defTrack&&S.defP&&S.defP.indexOf(p)>=0&&p._mark);
    /* FAZ 37: GEÇİŞTE KİMSE DURMAZ. Hızlı hücum payı %6’dan %15’e çıkınca geçiş
       koreografisi daha sık oynanıyor; hedefine varan jeton YÜRÜ’ye düşünce yürüme payı
       %40’tan %47’ye çıktı, hafif koşu bandı boşaldı. Geçiş fazında (savunma markaja
       geçmemişken) oyuncular kulvarlarını doldurmaya devam eder. */
    /* Muafiyet penceresi: top hâlâ kendi yarı sahasındayken YA DA jeton kulvar ara
       noktasını (`_wp`) hâlâ koşuyorken. İkincisi olmadan kanat oyuncusu orta çizgiyi
       geçer geçmez YÜRÜ'ye düşüyor ve yürüme payı %46'ya çıkıyordu. */
    const _gecisFazi=(S.defTrack===false&&(!!p._wp||(S.ball&&
      (S.offSide?(S.ball.x>COURT_MID):(S.ball.x<COURT_MID)))));
    if(!_savunmada&&!_gecisFazi&&p.urg!=null&&p.urg!==_URG.SPRINT&&p.urg!==_URG.YURU&&(p._lock||0)<=S.time&&
       Math.hypot(p.x-p.tx,p.y-p.ty)<_YERINDE_ESIK){
      /* Markajdaki savunmacı da yürür: "ball-you-man" kaybının sebebi bu değil, savunmanın
         ölü bölgesiydi (yukarıda 12/30 → 8/20 px'e çekildi ve ölçü %85,6'ya döndü). */
      _setUrg(p,_URG.YURU);
    }
    const gx=_tx+Math.sin(S.time*1.15+p.ph)*1.8*w;
    const gy=_ty+Math.cos(S.time*0.87+p.ph*1.7)*1.8*w;
    let dx=gx-p.x, dy=gy-p.y;
    const d=Math.hypot(dx,dy);
    if(d>0.01){
      /* VARIŞ FRENİ — hedefe <24px kalınca hız eşik altına çekilir; jeton noktasında DURUR. */
      /* F15-1: hedef hız artık jetonun ACELE KADEMESİNDEN gelir. `d*3.4` 52 px'ten uzak
         her hedefte tam gaz demekti; katsayı düşürüldü ki yakın hedefe yürüyerek gidilsin. */
      const _tv=(p.maxV!=null?p.maxV:_PL_MAXV);
      /* ⚠ F25-2'nin SON kök nedeni (ölçüldü): varış freni idi. Hedefe 24 px kalınca üst
         hız 10 px/sn'ye (0,34 m/sn) düşer; canlı set salınımının hedefi HER ZAMAN bu
         24 px'lik fren yarıçapının İÇİNDEDİR. Yani salınım doğru çalışsa bile (ölçüm:
         donma penceresinde 4-5 kez yeni hedef yazıldı, jeton 6-11 px/sn ile hareket
         hâlindeydi) jetonun 1,5 sn'de merkezden NET sapması 5 px'i aritmetik olarak
         geçemiyordu. Frene takılan yerinde kıpırdanma "çakılı" görünür.
         Çözüm: salınım hâlindeki jeton için fren tavanı 0,34 m/sn yerine 0,75 m/sn —
         duran bir oyuncunun ayak değiştirme/adım atma hızı. KONUM değişmez, yalnız aynı
         kısa yolu gerçekten kat eder. Bayrak yalnız salınım bloğunda basılır; koreografi,
         savunma takibi ve serbest atış yerleşimi eski frenle çalışmaya devam eder. */
      const _sway=((p._swayT||0)>S.time)?22:10;
      const want=d<24?Math.min(_tv,_sway):Math.min(_tv,d*2.1);
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
      const _R=(a.team===b.team)?_PL_R_TAKIM:_PL_R;
      if(d<_R&&d>0.001){
        const push=Math.min((_R-d)/2,2.6)*Math.min(1.5,dt*60);
        dx/=d; dy/=d;
        /* Çizgi dışındaki sokucu itilmez ama İÇİNDEN de geçilmez — yalnız karşı taraf kayar. */
        if(a._oob){ b.x+=dx*push*1.7; b.y+=dy*push*1.7; }
        else if(b._oob){ a.x-=dx*push*1.7; a.y-=dy*push*1.7; }
        else if(a===shooterTok){ b.x+=dx*push*1.7; b.y+=dy*push*1.7; }
        else if(b===shooterTok){ a.x-=dx*push*1.7; a.y-=dy*push*1.7; }
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
    _yonGuncelle(p,dt);
    _tokSet(p.g,p.x,p.y,p.sc);
  }
  _ballStep(dt);
  _fxStep(dt);
}

/* ── §6.1: JETON YÖNELİMİ ────────────────────────────────────────────────────────────
   Jetonda yön bilgisi yoktu; post-up'ta hücumcunun sırtını potaya dönmesi ekranda
   görünmüyordu. Kural sırası:
     1) `_sirtDonuk` (post-up) → yüz POTADAN UZAĞA, savunmacı arkada kalır
     2) topu tutuyorsa → yüz saldırdığı potaya
     3) hızlı hareket ediyorsa → yüz gidiş yönüne
     4) aksi hâlde → yüz topa (oyuncular hep topu izler)
   Yön yumuşak döner (ani sıçrama olmasın); gösterge çember kenarındaki küçük işarettir. */
/** Gerçek (duvar) saat, ms. Sahne saati kullanıcı algısıyla aynı hızda akmıyor. */
function _rtNow(){ try{ return (typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); }catch(e){ return Date.now(); } }
const _YON_HIZ=9.0;                 /* rad/sn — dönüş yumuşatma katsayısı */
function _yonGuncelle(p,dt){
  try{
    const S=mState._sim; if(!S||!p) return;
    const b=S.ball;
    const hucumda=(S.offP&&S.offP.indexOf(p)>=0);
    const rim=hucumda?_rim(S.offSide):(S.defRim||_rim(S.offSide));
    let hx,hy;
    if(p._sirtDonuk&&rim){ hx=p.x-rim[0]; hy=p.y-rim[1]; }
    else if(b&&b.carrier===p&&rim){ hx=rim[0]-p.x; hy=rim[1]-p.y; }
    else if(Math.hypot(p.vx,p.vy)>28){ hx=p.vx; hy=p.vy; }
    else if(b){ hx=b.x-p.x; hy=b.y-p.y; }
    else return;
    const hedef=Math.atan2(hy,hx);
    let d=hedef-(p.yon||0);
    while(d>Math.PI) d-=2*Math.PI;
    while(d<-Math.PI) d+=2*Math.PI;
    p.yon=(p.yon||0)+d*Math.min(1,_YON_HIZ*(dt||0.016));
    const f=p.g&&p.g._face;
    if(f){ f.setAttribute('cx',(Math.cos(p.yon)*11).toFixed(1)); f.setAttribute('cy',(Math.sin(p.yon)*11).toFixed(1)); }
  }catch(e){}
}

/* ── Top: durum makinesi ─────────────────────────────────────────────────── */
function _ball(){ return mState._sim.ball; }
/** §4: serbest atış rutini — atıcı 1-3 kez sektirir, sonra topu tutar.
    Sektirme periyodu `_ballStep`'teki 'held' dalından gelir: ω≈8,2 rad/sn ve |sin|
    kullanıldığı için bir sekme ≈ 0,383 sn. Sayı SAHNE PRNG'sinden (`_srand`) çekilir —
    `Math.random`/`rand` kullanılırsa maçın rastgele akışı kayar (B-5 dersi). */
const _FT_SEKME_SN=0.383;
function _ftSektir(shooter){
  try{
    const S=mState._sim; if(!S||!shooter) return 0;
    const b=_ball();
    const adet=_srand(1,3);
    b.noDrib=false;
    b.dribBitis=S.time+adet*_FT_SEKME_SN;
    S._ftDrib={adet,bitis:b.dribBitis};      /* sunum-check okur; davranışı etkilemez */
    return adet*_FT_SEKME_SN;
  }catch(e){ return 0; }
}
/* ── FAZ 37 §9.1: TOP HİÇBİR KOŞULDA BOŞLUKTA KİLİTLENMEZ ─────────────────────────────
   `_ballHold` ilk satırında `if(!p) return;` yapıyordu — yani hedef geçersizse MOD
   DEĞİŞMEDEN sessizce dönüyordu. `_ballStep` `case 'pass'` bitişinde `_ballHold(b.target)`
   çağırıyor; hedef bu arada geçersizleşmişse (oyuncu değişikliğiyle jeton düştü, `offP/defP`
   yenilendi, hedef null) top `mode:'pass'`, hız 0, sahipsiz olarak SONSUZA KADAR havada
   kalıyordu. Canlı ölçümde tam bu durum yakalandı (`mode:"pass", t:0, x:194 sabit,
   carrier:null`) ve karelerin %12-17'sinde topa en yakın oyuncu 2 m'den uzaktı.
   Kurtarma: top serbest bırakılır ve en yakın oyuncu peşine gönderilir. */
function _ballKurtar(){
  try{
    const S=mState._sim; if(!S) return;
    const b=S.ball;
    if(!isFinite(b.x)||!isFinite(b.y)){ b.x=COURT_MID; b.y=250; }
    b.mode='loose'; b.carrier=null; b.noDrib=false; b.t=0;
    b.vx=b.vy=0; b.vh=0; b.h=Math.max(0,Math.min(30,b.h||0));
    b.onDone=null; b.target=null;
    let en=null,ed=1e9;
    for(const p of (S.players||[])){
      if(!p||p._oob||!isFinite(p.x)) continue;
      const d=Math.hypot(p.x-b.x,p.y-b.y);
      if(d<ed){ ed=d; en=p; }
    }
    if(en){ _setUrg(en,_URG.SPRINT); _chase(en,null,1.5); }
    S._kurtarN=(S._kurtarN|0)+1;   /* teşhis sayacı — ölçüm araçları okur */
  }catch(e){}
}
function _ballHold(p,noDrib){
  const b=_ball();
  if(!p||!isFinite(p.x)||!isFinite(p.y)){ _ballKurtar(); return; }
  const d=Math.hypot(b.x-p.x,b.y-p.y);
  /* M6: üst sınır 0,30 sn iken 400 px lik mesafe ~40 m/sn hızla "pas" oluyordu (ışınlanma).
     Süre artık _ballPass in doğal hesabına bırakıldı: d/520, en çok 0,90 sn. */
  if(d>30){ _ballPass(p,Math.max(0.12,Math.min(0.90,d/520))); return; }
  if(b.carrier!==p) p._topAldi=null;   /* §7.1: topu YENİ alan oyuncunun 1,2 sn sayacı sıfırlanır */
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
/** @param tip FAZ 26 §1: 'smac' | 'turnike' | 'floater' | 'jumper' | 'uc' | null (ör. serbest atış) */
function _ballShoot(to,dur,made,onDone,tip){
  const b=_ball();
  const d=Math.hypot(to[0]-b.x,to[1]-b.y);
  b.mode='shot'; b.carrier=null; b.from=[b.x,b.y]; b.to=[to[0],to[1]]; b.noDrib=false;
  b.h0=Math.max(b.h,20);      /* top elden ~omuz/baş hizasından çıkar */
  /* Yay yüksekliği mesafeye bağlı: pota dibinden (turnike) ALÇAK ve hızlı, uzaktan yüksek parabol. */
  b.t=0; b.dur=dur||Math.max(0.42,Math.min(0.78,0.34+d/560));
  b.arc=d<90?(18+d*0.11):(54+d*0.13);
  if(d<90&&!dur) b.dur=Math.max(0.32,0.24+d/500);
  /* ── FAZ 26 §1: YAY ARTIK ŞUT TİPİNDEN GELİR ──
     Eskiden yay YALNIZ mesafeye bağlıydı; pota dibindeki smaç, turnike ve floater ekranda
     birebir aynı yörüngeyi çiziyordu — üçünün ayrımı yalnız metinde kalıyordu. Gerçek
     basketbolda fark tam olarak yörüngededir:
       smaç    — top yukarıdan aşağı gider, yay YOK denecek kadar alçak, hızlı ve sert
       turnike — camdan/çemberden yumuşak, alçak ama smaçtan belirgin yüksek
       floater — KISA mesafede YÜKSEK parabol (uzunların uzanamayacağı kavis) — imza tipi
       jumper  — orta mesafe, dengeli kavis
       üçlük   — en uzun ve en yüksek parabol
     `dur` açıkça verildiyse (serbest atış, blok) ona dokunulmaz. */
  if(tip){
    const _serbest=(dur==null||dur===0);
    if(tip==='smac'){       b.arc=Math.min(b.arc,9);          if(_serbest) b.dur=Math.max(0.24,0.18+d/900); }
    else if(tip==='turnike'){ b.arc=Math.max(16,Math.min(b.arc,30)); if(_serbest) b.dur=Math.max(0.34,0.26+d/620); }
    else if(tip==='floater'){ b.arc=Math.max(b.arc,62)+d*0.05;       if(_serbest) b.dur=Math.max(0.52,0.44+d/620); }
    /* FAZ 28 §2: kanca postta omuz üstünden yüksek kavisle gider (savunmacı arkada,
       top onun uzanamayacağı yerden geçer); tip-in çemberin dibinde tek dokunuştur —
       yay yok denecek kadar alçak ve en kısa uçuş. */
    else if(tip==='kanca'){   b.arc=Math.max(b.arc,70)+d*0.04; if(_serbest) b.dur=Math.max(0.46,0.38+d/640); }
    else if(tip==='tipin'){   b.arc=Math.min(b.arc,13);        if(_serbest) b.dur=Math.max(0.20,0.15+d/900); }
    else if(tip==='jumper'){  b.arc=Math.max(b.arc,48); }
    else if(tip==='uc'){      b.arc=Math.max(b.arc,64); }
  }
  b.tip=tip||null;
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
      /* §4: serbest atışta atıcı SÜREKLİ sektiriyordu (dribbling varsayılan açık ve
         `noDrib` hiç verilmiyordu). Gerçekte 1-3 kez sektirir, sonra topu tutar ve atar.
         `dribBitis` sahne saatidir; süre dolunca top ele alınır ve öyle kalır. */
      if(b.dribBitis!=null&&S.time>=b.dribBitis){ b.noDrib=true; b.dribBitis=null; }
      if(b.noDrib){
        /* ölü top / kenardan sokma / serbest atış öncesi: top göğüs hizasında, sekmez */
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
/** M3: silinmeden önce bekleyen geri çağrıları boşalt — hiçbir olay anlatımsız kalmasın. */
function _flushPending(S){
  if(!S) return;
  try{
    const pp=S.pendingPaint;
    if(typeof pp==='function'){ S.pendingPaint=null; pp(); }
  }catch(e){}
  try{
    const od=S.ball?S.ball.onDone:null;
    if(typeof od==='function'){ S.ball.onDone=null; od(); }
  }catch(e){}
  try{
    const c=S.chase;
    if(c){
      S.chase=null;
      /* Takip yarıda kesiliyorsa top yine de TAKİPÇİYE verilir — yoksa anlatımda adı geçen
         oyuncu (çalan/ribaund alan) ile sahadaki taşıyıcı ayrışır. */
      if(c.tok){ try{ _ballHold(c.tok); c.tok.pop=1; }catch(e){} }
      if(typeof c.fn==='function') c.fn();
    }
  }catch(e){}
}
function clearBallTimers(){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(S){
    _flushPending(S);
    S.script=[]; S.sIdx=0; S.sT=0; S.ball.onDone=null; S.chase=null;
  }
}
function _script(steps){
  const S=mState._sim; if(!S) return 0;
  S.script=steps.slice().sort((a,b)=>a.at-b.at);
  S.sIdx=0; S.sT=0;
  /* FAZ 37 §8.3: koşullu bekleyen adım varsa en kötü hâlde 'max' kadar gecikir; bu süre
     olay bütçesine REZERV olarak eklenir, aksi hâlde sıradaki olay animasyonu keser. */
  const rez=S.script.reduce((m,x)=>Math.max(m,(typeof x.bekle==='function')?(x.max||2.5):0),0);
  return Math.round(((S.script.length?S.script[S.script.length-1].at:0)+rez)*1000);
}
/** Topsuz savunmacının adamından sarkma mesafesi (yardım pozisyonu): topa uzak adamın
    savunmacısı boyaya doğru sarkar, ama TÜM savunma tek noktada yığılmasın diye üst
    sınır dar tutulur (~1.7m). Adamı topa yakınsa yakın markaja (deny) geçer. */
function _defGap(distManBall){ return Math.min(34,17+distManBall*0.09); }
/** F11-5 (ball-you-man): savunmacının hedefi HER ZAMAN adamının pota tarafında kalsın.
    Yardım pozisyonu top ile pota arasına bakar; adamı potaya çok yakınken (post) kural
    uygulanmaz — orada iki jetonu ayıran zaten üst üste binme çözücüsüdür. */
function _defBehind(tx,ty,m,rim,pay){
  const dm=Math.hypot(m.x-rim[0],m.y-rim[1]);
  if(dm<34) return [tx,ty];
  const dd=Math.hypot(tx-rim[0],ty-rim[1]);
  /* F15-1: pay 8 px idi — savunmacı adamının pota tarafında ANCAK 0,27 m kalıyordu ve
     hareket gecikmesi bu farkı kolayca yiyordu ("ball-you-man" ölçüsü %87 → %78).
     Pay 22 px (0,74 m): savunmacı belirgin biçimde pota tarafında durur. */
  /* FAZ 36 §A3: pay artık ÇAĞIRANDAN gelir. Tek bir 38 px'lik pay topsuz savunmacı için
     doğru (ball-you-man %81 → %88) ama TOPU TUTANIN savunmacısını da 38 px'e itiyordu:
     hedef zaten adam-pota doğrultusunda 27 px'te kurulduğu için projeksiyon onu geriye
     çekiyor ve markaj mesafesi 1,80 → 1,86 m'ye çıkıyordu. Top savunmacısında pay = aralık. */
  const _pay=(pay!=null?pay:46);
  if(dd<=dm-_pay) return [tx,ty];
  const k=(dm-_pay)/(dd||1);
  return [rim[0]+(tx-rim[0])*k, rim[1]+(ty-rim[1])*k];
}
/** Bir jetonun hedefini kısa süre "kilitle" — savunma takibi/dizilim üzerine yazmasın. */
function _lockTok(p,sec){ const S=mState._sim; if(p&&S) p._lock=S.time+(sec||0.6); }
/** Serbest topun peşine düş: yetişince topu alır ve fn() çalışır (anlatım senkronu). */
function _chase(tok,fn,maxSec){ const S=mState._sim; if(!S||!tok) return; S.chase={tok,fn:fn||null,t:0,max:maxSec||3.2,r:26}; }

/* ── Dizilimler ───────────────────────────────────────────────────────────
   Tüm noktalar SOL potaya hücum eden takım içindir; index = ROL (0 PG…4 C).
   Sağa hücumda aynalanır, güçlü taraf için y ekseninde çevrilebilir. */
/* FAZ 11 (F11-2/F11-3): eski dizilimler ÖLÇÜLDÜĞÜNDE dar çıkıyordu — en yakın ikili
   SET_POST'ta 1,85 m (15 feet = 4,57 m kuralının çok altında), kaplanan alan yarı sahanın
   %12-20'si, boyada çoğu zaman kimse yok. Yeni koordinatlar gerçek basketbol ilkelerine göre
   yeniden çizildi ve `tools/spacing-check.js` ölçütleriyle sayısal olarak doğrulandı:
     dizilim        en yakın ikili   kaplanan alan   boyada
     5-OUT              4,47 m           %35,6         0
     SPREAD (4-out1in)  4,86 m           %33,7         1
     HORNS              3,99 m           %22,2         2
     POST               4,88 m           %31,7         1
     MOTION             4,68 m           %30,6         1
   Köşeler dip çizgiye (x≈56), kanatlar/slotlar yay dışına (x≈276-300), pivot bloğa (x≈146). */
const SET_SPREAD=[[296,132],[296,368],[ 56,462],[ 56, 38],[146,196]];  /* 4-out 1-in: guardlar slotta, pivot blokta */
/* Dirsek noktaları boyanın KÖŞESİDİR: SVG'de boya y ∈ [177,62 · 322,38] (F14 öncesi
   179,6/320,4 idi; boya FIBA 4,90 m'ye genişletildi). y=176/324 bandın bir
   tık dışında kalıyor ve "boyada oyuncu" ölçüsüne girmiyordu (FAZ 13 madde 0 sonrası fark
   edildi) — 186/314 hem gerçek dirsek hem boyanın içi. */
const SET_HORNS =[[302,250],[ 56, 38],[ 56,462],[186,186],[186,314]];  /* iki büyük dirseklerde, guardlar köşede */
const SET_POST  =[[292,342],[284,118],[ 56, 38],[ 58,458],[146,206]];  /* pivot düşük postta, top kanattan */
const SET_MOTION=[[300,150],[288,352],[ 58, 46],[ 60,456],[172,246]];  /* kesme/blok trafiği, geniş */
const SET_5OUT  =[[310,250],[276,104],[276,396],[ 56, 38],[ 56,462]];  /* beşi de yay dışında, boya boş */
const SET_ALL=[SET_SPREAD,SET_HORNS,SET_POST,SET_MOTION,SET_5OUT,SET_SPREAD];
/* GEÇİŞ: hücum ÜÇ KULVAR — top ortadan sürülür, kanatlar KENAR çizgilerine yakın koşar,
   büyükler arkadan gelir. Kulvarlar geniş tutulur (y 58/442) ki iki takım orta bantta tek
   yumak hâlinde koşmasın; savunma ise ortadan potaya döner. */
const TRANS_OFF=[[306,250],[160, 50],[160,450],[262,132],[298,368]];   /* FAZ 36 §A3: hedefler ön sahaya taşındı (orta üçte bir boşalsın) */
/* GEÇİŞ: savunma önce POTAYA döner (adamı orta sahada kovalamaz), kendi arasında da yayılır */
const TRANS_DEF=[[188,250],[140,178],[140,322],[252,200],[252,300]];
/* 2-3 bölge savunması bölge merkezleri: 2 guard yay dirseklerinde (geniş), 3 uzun
   boya hattında — köşe/kanat gerçekten kapatılsın (dar bölge "boyada yumak" gibi duruyordu). */
const ZONE_23=[[252,166],[252,334],[148,120],[148,380],[124,250]];
/* Serbest atış dizilimi: kulvarlarda savunma dipte, hücum üstte (gerçek sıra) */
const FT_LINE_X=238;   /* şutör çizginin (x=227,75) ~0,35 m gerisinde durur — F14 ile kaydı */
/* F14-7: kulvar noktaları 35-37 px aralıklıydı, oysa çarpışma yarıçapı `_PL_R`=40 —
   üç jeton birbirini sürekli itiyor, hiçbiri hedefine oturamıyordu (ölçüm: atış anında
   yerinde 8,7/10, en uzak 1,35 m; kimse koşmuyor ama kimse de durmuyordu). Aralık 44 px'e
   açıldı. Gerçek kulvar aralığı 0,85 m = 25 px'tir; jeton yarıçapı buna izin vermiyor —
   sıra ve dizilim doğru, aralık jetona göre esnetildi. */
const FT_DEF_S=[[108,177],[108,323],[196,177],[196,323],[292,250]];
const FT_OFF_S=[[152,177],[152,323],[306,140],[306,360]];

/** F11-2: perdeyi POTAYA EN YAKIN uzun oyuncu kurar — gerçek basketbolda top perdesine
    posttaki/dirsekteki büyük çıkar. Eskiden dizideki ilk uygun oyuncu seçiliyordu; köşedeki
    ya da kanattaki şutör topa çağrılınca dizilimin bir KÖŞESİ boşalıyor, hücumun kapladığı
    alan çöküyordu (ölçüm: dizilim %34 → sahada %20). İçerideki oyuncu zaten dizilimin
    çevresinde değil, ortasındadır; perdeye o çıkınca aralık bozulmaz. */
/* ── §1: TOP TAŞIMA ROLLERİ ──────────────────────────────────────────────────────────
   Sorun: topu sahada kim tutuyorsa o sürüyordu; pivot yarı sahadan yarı sahaya top
   sürüyordu. Gerçek basketbolda topu 1-2-3 numara taşır; 4 ve 5 ribaundu alır ve
   ÇIKIŞ (outlet) PASI verir. Bu kural ribaund sonrası zaten vardı (M9, animateShotPossession);
   burada top kaybı / çalma / kenardan sokma yolları için ortak hâle getirilir. */
const _TASIYICI_ROL=[0,1,2];          /* PG · SG · SF — topu karşı sahaya bunlar taşır */
const _POTA_YAKIN_PX=118;             /* ≈ 4 m (29,5429 px/m) — bu mesafede uzun kendi bitirir */
/** Oyuncu topu karşı sahaya taşıyabilir mi? */
function _tasiyabilir(p){ return !!p && _TASIYICI_ROL.indexOf(p.role)>=0; }
/** Uzun oyuncu topu aldıysa çıkış pası verilecek en yakın guard'ı bulur.
    Dönüş null ise pas gerekmiyor (taşıyıcı zaten guard, ya da pota 4 m'den yakın). */
function _cikisHedefi(tasiyici,offP,rim){
  try{
    if(!tasiyici||!offP||!offP.length) return null;
    if(_tasiyabilir(tasiyici)) return null;                       /* zaten 1/2/3 */
    /* İstisna: uzun potaya 4 m'den yakınsa kendi bitirir, pas aramaz. */
    if(rim&&Math.hypot(tasiyici.x-rim[0],tasiyici.y-rim[1])<=_POTA_YAKIN_PX) return null;
    /* Öncelik GERÇEK guard'da (rol 0/1); yoksa SF (rol 2). M9 kapısı çıkış pasının
       hedefinin guard olmasını şart koşuyor — sıralama yapılmadığında en yakın oyuncu
       SF olabiliyor ve M9 %100'den %75'e düşüyordu. */
    const sec=(roller)=>{
      let en=null,ed=1e9;
      offP.forEach(p=>{
        if(p===tasiyici||roller.indexOf(p.role)<0) return;
        const d=Math.hypot(p.x-tasiyici.x,p.y-tasiyici.y);
        if(d<ed){ ed=d; en=p; }
      });
      return en;
    };
    return sec([0,1])||sec([2]);
  }catch(e){ return null; }
}
function _pickScreener(relay,mid,cutter,pg,rim){
  const uygun=(relay||[]).filter(p=>p&&p!==mid&&p!==cutter);
  if(!uygun.length) return (relay||[]).find(p=>p!==mid)||null;
  const r=rim||[102.6,250];
  const puan=p=>Math.hypot(p.tx-r[0],p.ty-r[1])+((p.pl&&(p.pl.poz==='C'||p.pl.poz==='PF'))?0:200);
  return uygun.slice().sort((a,b)=>puan(a)-puan(b))[0];
}

/* F11-2: kesme (cut) varış noktaları — köşe, kısa köşe (dunker), zayıf taraf 45'i.
   Eskiden yalnız İKİ KÖŞE adaydı; 4-out dizilimde iki köşe de zaten doluyken kesici
   bir takım arkadaşının üstüne gidiyordu (ölçüm: en yakın ikili 1,19 m). Artık aday
   noktalar arasından takım arkadaşlarının HEDEFLERİNE en uzak olan seçilir. */
const CUT_SPOTS=[[72,52],[72,448],[96,168],[96,332],[232,120],[232,380],[150,250]];
function _pickCutSpot(offP,cutter,offLeft){
  const digerleri=(offP||[]).filter(p=>p&&p!==cutter);
  let best=null,bestD=-1;
  CUT_SPOTS.forEach(c=>{
    const p=_pt([c[0]+_srand(-10,10),c[1]+_srand(-10,10)],offLeft,false);
    let mn=1e9;
    digerleri.forEach(q=>{ mn=Math.min(mn,Math.hypot(q.tx-p[0],q.ty-p[1])); });
    if(mn>bestD){ bestD=mn; best=p; }
  });
  return best||[cutter.tx,cutter.ty];
}

/** Nokta boyanın (key) içinde mi? Dip çizgiden 5,8 m, 4,9 m genişlik. */
function _inPaint(x,y,offLeft){
  if(Math.abs(y-250)>82) return false;
  return offLeft?(x<=195):(x>=745);
}

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
    S.canliSet=false;                          /* geçişte zaten herkes koşuyor */
    offR.forEach((p,i)=>{
      if(!p||p._oob) return;
      const c=_pt(TRANS_OFF[i],offLeft,false);
      p._setTx=p._setTy=null; p._sonHedefT=S.time;
      /* §5.3: kulvarlarda üç oyuncu sprint (rol 0/1/2), iki uzun trailer olarak koşu kademesinde. */
      _hedefAta(p,_jit(c[0],10),_jit(c[1],8),_URG.SPRINT);
      /* kanatlar (rol 1-2) önce kendi hizasında KENARA açılır, sonra kulvarda öne koşar */
      p._wp=(i===1||i===2)?[_inX(p.x+(offLeft?-58:58)),_inY(c[1])]:null;
    });
    defR.forEach((p,i)=>{ if(!p||p._oob) return; const c=_pt(TRANS_DEF[i],offLeft,false); _hedefAta(p,_jit(c[0],8),_jit(c[1],8),_URG.KOS); p._wp=null; });
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

  /* ── FILL (F11-1/F11-2): topsuz dört oyuncu, top gelmeden yerlerine açılır ──────────
     Eskiden hücumun tamamı geçiş kulvarlarında (x≈300-450) topun gelmesini bekliyor, set
     dizilimi ancak tSet'te veriliyordu; oyuncular pozisyonun geri kalanını yol alarak
     geçirdiği için ölçümde saha ortasında yumak görünüyorlardı (hedeften ortalama sapma
     85 px). Gerçek basketbolda kanatlar ve uzunlar top yukarı çıkarken ZATEN yerlerini alır.
     Savunma bu fazda hâlâ potaya dönüyor (defTrack'e dokunulmaz). */
  if(phase==='fill'){
    offR.forEach((p,i)=>{
      if(!p||p._oob||p===opts.ballTok) return;
      if((p._lock||0)>S.time) return;        /* perde/kesme kilidi varsa bozma */
      p._wp=null;
      _hedefAta(p,_jit(B[i][0],6),_jit(B[i][1],6),_URG.KOS);
    });
    /* F11-4/F11-5: savunma da geçişte EŞLEŞİR — adamının gideceği noktanın pota tarafına
       yerleşir. Eskiden savunma TRANS_DEF şablonuna oturuyordu; hücum yerine yerleştiğinde
       savunmacılar 5-7 m geriden yetişmeye çalışıyor, iki takım birbirini aynalayan iki
       sütun gibi görünüyordu. Bu faz markaj DEĞİL yalnız erken eşleşmedir (defTrack kapalı). */
    defR.forEach((p,i)=>{
      if(!p||p._oob) return;
      if((p._lock||0)>S.time) return;
      const m=B[i]||B[0];
      const dx=rim[0]-m[0], dy=rim[1]-m[1], d=Math.hypot(dx,dy)||1;
      p._wp=null;
      _hedefAta(p,m[0]+dx/d*46,m[1]+dy/d*46,_URG.KOS);
    });
    return null;
  }

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
    /* F11-2/F11-3: şutör, dizilim kurulur kurulmaz şut noktasına oturuyordu; boya içi
       bitirişlerde bu, oyuncunun pota altında 4 saniye beklemesi (3 saniye ihlali) ve
       hücumun bir köşesinin boşalması demekti. Boya içi şutlarda şutör dizilimdeki yerinde
       kalır, şut noktasına pozisyonun sonunda (tRelease) koşar. */
    if(shooter&&!(opts.lateShooter&&_inPaint(shot.x,shot.y,offLeft))){
      /* F11-2: şut noktası, şutörün ROL yuvasının yerine geçiyordu. Köşedeki oyuncu yay
         tepesinden şut atacaksa köşe boşalıyor, iki oyuncu üst üste biniyor ve hücumun
         kapladığı alan çöküyordu (ölçüm: hedeflerin alanı %34 → %24). Doğrusu: şut noktası
         KENDİNE EN YAKIN yuvanın yerine geçer, o yuvanın sahibi de şutörün yuvasına kayar —
         dizilimin çevresi korunur, yalnız bir nokta şut yerine doğru kaymış olur. */
      let k=bi,kd=1e9;
      B.forEach((c,i)=>{ const d=Math.hypot(c[0]-shot.x,c[1]-shot.y); if(d<kd){kd=d;k=i;} });
      const eski=B[bi];
      B[bi]=[shot.x,shot.y];
      if(k!==bi) B[k]=eski;
    }
  }
  /* §2: set kurulduğu andan itibaren "canlı" akış açılır — kimse donmaz. Dizilim
     merkezleri saklanır ki mikro hareket noktanın ÇEVRESİNDE kalsın, sürüklenmesin. */
  S.canliSet=(phase==='set');
  offR.forEach((p,i)=>{
    if(!p||p._oob) return;                    /* topu sokan çizgi dışında kalır */
    p._wp=null;                               /* set kurulunca geçiş ara noktası biter */
    const c=B[i];
    /* ⚠ `_sonHedefRt` BURADA basılmaz. `keepNear` dalı noktasına zaten yakın oyuncunun
       hedefini DEĞİŞTİRMEDEN bırakıyor (p.tx=p.x); damga atılınca canlı salınım 900 ms
       daha erteleniyor ve oyuncu ekranda 1,5 sn+ donuk kalıyordu. Salınım saatini yalnız
       gerçekten yeni hedef verilen an sıfırlar. */
    p._setTx=c[0]; p._setTy=c[1]; p._sonHedefT=S.time;
    p._nudgeOfs=0;                            /* yeni dizilim → sürüklenme merkezden başlar */
    if(p===shooter){ _hedefAta(p,c[0],c[1],_URG.KOS); return; }
    /* Noktasına ZATEN yakınsa yeni hedef atanmaz (yerinde durur, mikro-salınım yapar).
       F11-2: eşik 40 px idi — iki oyuncu birbirine doğru 40'ar px sapabildiği için ölçülen
       en yakın ikili mesafe dizilimin kâğıt üzerindeki değerinden ~2,4 m düşüyordu. Eşik ve
       serpme (jitter) daraltıldı: oyuncular gerçekten noktalarına oturur, aralık korunur. */
    const near=Math.hypot(p.x-c[0],p.y-c[1])<24;
    if(near&&opts.keepNear!==false){ p.tx=p.x; p.ty=p.y; _setUrg(p,_URG.YURU); }
    else _hedefAta(p,_jit(c[0],6),_jit(c[1],6),_URG.JOG);
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
        _hedefAta(p,_jit(shooter.tx,5),_jit(shooter.ty,5),_URG.KOS);
      } else {
        p._zone=z;
        _hedefAta(p,_jit(z[0],6),_jit(z[1],6),_URG.JOG);
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
    { const bh=_defBehind(m.tx+dx/d*gap,m.ty+dy/d*gap,{x:m.tx,y:m.ty},rim);
      /* §2/§5 sonrası: hücum artık set içinde de hareket ediyor (donma yok, yayılma
         itmesi var). Topsuz savunmacı JOG ile takip ederken adamının arkasında kalıyor
         ve "ball-you-man" ölçümü %82,9'dan %78'e düşüyordu. Savunmacı, adamı hareket
         hâlindeyken KOŞ kademesine çıkar — gerçek savunma da böyledir; yerinde duran
         adamda JOG'da kalır (gereksiz koşuşturma olmasın). */
      const _mHareketli=(m&&Math.hypot(m.tx-m.x,m.ty-m.y)>18);
      _hedefAta(p,_jit(bh[0],press?4:6),_jit(bh[1],press?4:6),
        Math.max(isBall?_URG.KOS:((press||_mHareketli)?_URG.KOS:_URG.JOG),(m.urg!=null?m.urg:_URG.JOG))); }
  });
  S.shooter=shooter;
  return shooter;
}

/** Serbest atış dizilimi (gerçek kural): şutör çizginin gerisinde; kulvar sırası
    dipten yukarı SAVUNMA→HÜCUM→SAVUNMA. Blok noktalarını uzunlar (C/PF) alır. */
function _setFtFormation(offLeft,offPlayers,defPlayers,shooter){
  /* SERBEST ATIŞ = ÖLÜ TOP: canlı set salınımı (§2) burada ÇALIŞMAMALI. `canliSet`
     yalnız `_setFormation` içinde kurulup temizleniyordu; serbest atış dizilişi ayrı bir
     fonksiyon olduğu için bayrak önceki set pozisyonundan AÇIK kalıyordu. Sonuç: salınım
     çizgiye yürüyen şutörün ve kulvarlara dizilen dokuz oyuncunun hedefini eziyor,
     şutör çizgiye hiç varamıyordu (M12 "şutör çizgide + top elinde" 0/2'ye düştü,
     F14-7 "yerinde" 9,5/10'dan 8,7/10'a indi). */
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(S){ S.canliSet=false; S._ftAktif=true; }
  const line=_pt([FT_LINE_X,250],offLeft,false);
  _hedefAta(shooter,line[0],line[1],_URG.JOG);
  const bigFirst=(arr)=>_rolesOrder(arr).slice().reverse();   /* C, PF, SF, SG, PG */
  /* FAZ 37 §8.2: şutör dışındaki dokuz oyuncu kulvarlara KOŞARAK dizilir — gerçek maçta
     da düdükle birlikte koşarlar. JOG ile yollandıklarında sahanın öbür ucundaki pivot
     atış anına yetişemiyordu (ölçüm: yakalanan karede yerinde olan oyuncu 0/10).
     Şutör JOG kalır; o zaten çizgiye yakın ve acelesi yok. */
  const others=bigFirst(offPlayers.filter(p=>p!==shooter));
  others.forEach((p,i)=>{ const c=_pt(FT_OFF_S[i%FT_OFF_S.length],offLeft,false); _hedefAta(p,_jit(c[0],2),_jit(c[1],2),(Math.hypot(p.x-c[0],p.y-c[1])>110?_URG.KOS:_URG.JOG)); });
  bigFirst(defPlayers).forEach((p,i)=>{ const c=_pt(FT_DEF_S[i%FT_DEF_S.length],offLeft,false); _hedefAta(p,_jit(c[0],2),_jit(c[1],2),(Math.hypot(p.x-c[0],p.y-c[1])>110?_URG.KOS:_URG.JOG)); });
}

/** F14-7: SERBEST ATIŞ BEKLEMESİ — düdükten atışa kadar geçmesi gereken süre (sn).
    Ölçüt EN GEÇ GELEN oyuncudur, şutör değil: `_setFtFormation` on oyuncuyu birden
    yerleştirir; şutör çizgiye yakınken taban süreye düşülünce sahanın öbür ucundaki pivot
    daha koşarken atış yapılıyordu (ölçüm: atış anında 10 oyuncudan 2,8'i yerinde).
    Varış süresi düz "yol / hız" değildir: jeton son 24 px'i varış freniyle (≤12 px/sn)
    kapatır, yalnız o bölüm ~2 sn sürer — fren payı hesaba katılır.
    İKİ ÇAĞIRAN VARDIR (normal faul dalı ve `_and1Sequence`); ikisi de buradan geçmeli. */
function _ftWaitSec(players){
  try{
    const eta=p=>{
      if(!p) return 0;
      const d=Math.hypot(p.x-(p.tx!=null?p.tx:p.x),p.y-(p.ty!=null?p.ty:p.y));
      const v=Math.max(30,p.maxV||p.baseV||_PL_MAXV);
      return Math.max(0,d-24)/v + Math.min(d,24)/10 + 0.35;
    };
    const enGec=(players||[]).reduce((m,p)=>Math.max(m,eta(p)),0);
    /* FAZ 37 §8.1: üst sınır 6,0 sn idi. Faul sahanın öbür ucunda olduğunda on oyuncunun
       kulvarlara dizilmesi 7-9 sn sürüyor ve şut ERKEN patlıyordu (yerinde oyuncu 0/10).
       Sınır 9,5 sn'ye çıkarıldı; alt sınır 1,6 sn (yakın faul) aynı kaldı. */
    return Math.max(1.6,Math.min(9.5,enGec+0.45));
  }catch(e){ return 2.0; }
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
  return _sr()<0.5;
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
    return {x:bx,y:Math.max(CRT_Y0+40,Math.min(CRT_Y1-40,y!=null?y:250+(_sr()<0.5?-1:1)*_srand(30,86)))};
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
  /* F13-10: yön çeyreğe bağlıdır — 2. yarıda potalar değişir. */
  const offLeft=offLeftAtQ(offIsUser,(mState.quarter||1));
  const offP=offIsUser?S.home:S.away;
  const defP=offIsUser?S.away:S.home;
  S.offSide=offLeft; S.offP=offP; S.defP=defP; S.offIsUser=offIsUser;
  S.setIx=_srand(0,SET_ALL.length-1); S.flip=_sr()<0.5;
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
  _chase(inb,()=>{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; _setUrg(inb,_URG.KOS); },2.2);
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
  _setUrg(inb,_URG.KOS); inb.tx=spot.x; inb.ty=spot.y;
  /* F15-1: ETA jetonun GERÇEK hızından; eski taban (120 px/sn) yeni ölçekte fazla iyimser. */
  inb._inbEta=Math.min(2.4,bd/Math.max(40,inb.maxV||inb.baseV||_PL_MAXV)+0.28);
  _sokmaYerlesimi(spot,offP,inb);
  return inb;
}
/* ── §3: KENARDAN SOKMA YERLEŞİMİ ────────────────────────────────────────────────────
   Sorun: top kenardan sokulurken bazen BÜTÜN oyuncular rakip yarı sahaya geçiyor ve ilk
   top yarı saha ötesine atılarak sokuluyordu. Gerçekte sokucunun etrafında en az üç
   takım arkadaşı bulunur; uzun taç pası ancak savunma geride kalmışsa atılır.
   Burada yalnız 15 m'nin DIŞINDA kalanlar içeri çekilir — dizilime (FAZ 11) dokunulmaz. */
const _SOKMA_MAX_PX=443;      /* 15 m × 29,5429 px/m */
const _SOKMA_HEDEF_PX=400;    /* ≈ 13,5 m — 15 m kapısının içinde ama ön sahaya yakın */
const _SOKMA_MIN_YAKIN=3;     /* sokucu dışında bu kadar oyuncu yakında durmalı */
function _sokmaYerlesimi(spot,offP,inb){
  try{
    if(!spot||!offP||!offP.length) return;
    const digerleri=offP.filter(p=>p&&p!==inb);
    const uzak=(p)=>Math.hypot(p.x-spot.x,p.y-spot.y);
    const yakin=digerleri.filter(p=>uzak(p)<=_SOKMA_MAX_PX);
    let eksik=_SOKMA_MIN_YAKIN-yakin.length;
    if(eksik<=0) return;
    /* En yakın uzaktakiler çekilir — böylece hücumun geri kalanı yerinde kalır ve
       geçiş niyeti tamamen bozulmaz. */
    digerleri.filter(p=>uzak(p)>_SOKMA_MAX_PX)
      .sort((a,b)=>uzak(a)-uzak(b))
      .forEach(p=>{
        if(eksik<=0) return;
        const dx=p.x-spot.x, dy=p.y-spot.y, d=Math.hypot(dx,dy)||1;
        /* Sokma noktasının KENDİ yarı sahasında kal: yönü koru, yarıçapı kıs. */
        _hedefAta(p,_inX(spot.x+dx/d*_SOKMA_HEDEF_PX),_inY(spot.y+dy/d*_SOKMA_HEDEF_PX),_URG.KOS);
        eksik--;
      });
  }catch(e){}
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
/** §3: sokma pasının hedefi 15 m'yi aşmamalı. Aşıyorsa aynı takımdan, sokma noktasına
    yakın bir taşıyıcı (1/2/3) tercih edilir. Uzun taç pası yalnız savunma GERİDE
    kalmışsa (hızlı hücum niyeti) serbesttir — o durumda hedef değiştirilmez. */
function _sokmaHedefi(inb,to,offP,defP){
  try{
    if(!inb||!to) return to;
    const d=Math.hypot(to.x-inb.x,to.y-inb.y);
    if(d<=_SOKMA_MAX_PX) return to;
    /* Savunma geride mi? Hedefe en yakın savunmacı 8 m'den uzaksa gerçek hızlı hücumdur. */
    let ed=1e9;
    (defP||[]).forEach(p=>{ const k=Math.hypot(p.x-to.x,p.y-to.y); if(k<ed) ed=k; });
    if(ed>236) return to;                                    /* 8 m — savunma yetişmemiş */
    let en=null,eu=1e9;
    (offP||[]).forEach(p=>{
      if(p===inb||!_tasiyabilir(p)) return;
      const k=Math.hypot(p.x-inb.x,p.y-inb.y);
      if(k<=_SOKMA_MAX_PX&&k<eu){ eu=k; en=p; }
    });
    return en||to;
  }catch(e){ return to; }
}
function _inboundPass(inb,to,dur){
  const S=mState._sim;
  try{
    if(S) to=_sokmaHedefi(inb,to,S.offP||[],S.defP||[])||to;
  }catch(e){}
  /* Güvenlik: sokucu topa henüz yetişmediyse pas çizgi dışından atılmış gibi görünsün
     diye top ona verilir (birkaç px'lik düzeltme, görünmez). */
  if(S&&inb&&S.ball.carrier!==inb){
    const b0=S.ball;
    const d0=Math.hypot((b0.x||0)-inb.x,(b0.y||0)-inb.y);
    S.chase=null;
    if(d0>60){
      /* Görünür toparlama: top sokucuya uçar, sokma pası bir sonraki tick'te atılır. */
      _ballPass(inb,Math.max(0.16,Math.min(0.75,d0/520)));
      b0.onDone=()=>{ try{ b0.noDrib=true; _ballPass(to,dur||0.32); }catch(e){} };
      return;
    }
    b0.mode='held'; b0.carrier=inb; b0.noDrib=true;
  }
  _ballPass(to,dur||0.32);
  if(inb){                                            /* pası attı → sahaya geri dön */
    inb._oob=false;
    if(inb._retTx!=null){ inb.tx=_inX(inb._retTx); inb.ty=_inY(inb._retTy); }
    inb._retTx=inb._retTy=null;
    _setUrg(inb,_URG.KOS);
  }
}

/* ── Anlatım senkronu ────────────────────────────────────────────────────
   movePlayersForEvent/animateShotPossession, spiker cümlesini (paint) sahnedeki
   DOĞRU kareye bağlar. Bağlayabildiyse mState._evH.paint=true olur; main.js o
   zaman cümleyi kendisi basmaz. Aynı şekilde serbest atış izleri (_evH.marks). */
function _evHandled(){ if(typeof mState!=='undefined'&&mState) mState._evH={paint:false,marks:false}; }
function _markPainted(){ if(typeof mState!=='undefined'&&mState&&mState._evH) mState._evH.paint=true; }
function _markMarks(){ if(typeof mState!=='undefined'&&mState&&mState._evH) mState._evH.marks=true; }
/** Serbest atışı şut verisine ekle. (37. oturum: parkeye O/X izi ÇİZİLMEZ — veri yalnız
    kutu skor ve analiz içindir.) */
function _liveMark(sh){
  try{
    if(!sh) return;
    mState.allShots.push(sh);
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
    /* M8: sahneye dokunmayan duyuru olayları — yalnız anlatım. Oyuncu değişikliği
       (sub) jetonu zaten swapCourtToken ile yerinde değiştirilir; dizilim bozulmamalı. */
    if(type==='sub'||(type==='tactic'&&ev&&ev.botCoach)){
      if(P){ P(); _markPainted(); }
      return 520;
    }
    _clearOob((S.inb&&S.inb.tok)||null);   /* kalıntı çizgi-dışı izni kalmasın */

    /* ── HAVA ATIŞI (yalnız maç başı — gerçek FIBA kuralı) ── */
    if(type==='start'){
      clearBallTimers();
      S.defTrack=false;
      if(P){ P(); _markPainted(); }
      const hc=S.home.find(p=>p.role===4)||S.home[S.home.length-1];
      const ac=S.away.find(p=>p.role===4)||S.away[S.away.length-1];
      _hedefAta(hc,451,250,_URG.YURU);
      _hedefAta(ac,489,250,_URG.YURU);
      /* sıçramayan 8 oyuncu kendi yarı sahasında, orta bandın (x380-560) dışında */
      const userLeft=(mState.userIsHome!==false);   /* kullanıcı sola hücum ediyor → savunması sağda */
      const nearSpots=[[360,176],[360,324],[300,250],[212,250]];
      const farSpots=nearSpots.map(_mir);
      const hSpots=userLeft?farSpots:nearSpots;
      const aSpots=userLeft?nearSpots:farSpots;
      S.home.filter(p=>p!==hc).forEach((p,i)=>{ const s=hSpots[i%4]; _hedefAta(p,_jit(s[0],6),_jit(s[1],6),_URG.YURU); });
      S.away.filter(p=>p!==ac).forEach((p,i)=>{ const s=aSpots[i%4]; _hedefAta(p,_jit(s[0],6),_jit(s[1],6),_URG.YURU); });
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
      S.home.forEach((p,i)=>{ p._oob=false; _hedefAta(p,hs[i][0],hs[i][1],_URG.JOG); });
      S.away.forEach((p,i)=>{ p._oob=false; _hedefAta(p,as[i][0],as[i][1],_URG.JOG); });
      clearBallTimers();
      S.defTrack=false;
      /* M5/M6 (kenar durum): top çeyrek sonunda orta sahaya IŞINLANIYORDU (ölçüm: 245 px
         tek kare sıçrama, mod 'loose'). Uzaksa görünür şekilde taşınır — hakeme dönüş. */
      const b=S.ball;
      b.carrier=null; b.vx=0; b.vy=0; b.h=20; b.vh=40;
      const _dq=Math.hypot(b.x-COURT_MID,b.y-250);
      if(_dq>50){
        _ballPass({x:COURT_MID,y:250,vx:0,vy:0,side:1,ghost:true},Math.max(0.25,Math.min(0.85,_dq/520)));
      } else {
        b.mode='loose'; b.x=COURT_MID; b.y=250;
      }
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
      const offLeft=offLeftAtQ(off,(ev&&ev.q)||mState.quarter||1);
      const offP=off?S.home:S.away;
      const defP=off?S.away:S.home;
      S.offSide=offLeft; S.offP=offP; S.defP=defP; S.offIsUser=off;
      S.prevType=S.curType; S.curType=type;
      S.setIx=_srand(0,SET_ALL.length-1); S.flip=_sr()<0.5;
      _setFormation(offLeft,offP,defP,null,{phase:'set'});
      const spot=_inboundSpot('side',offLeft,COURT_MID+(offLeft?24:-24),_sr()<0.5?100:400);
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
    const offLeft=offLeftAtQ(off,(ev&&ev.q)||mState.quarter||1);
    const offP=off?S.home:S.away;
    const defP=off?S.away:S.home;
    const posChanged=(S.offP!==offP);
    S.offSide=offLeft;
    S.offP=offP; S.defP=defP;
    S.offIsUser=off;                      /* taktikler yalnız kullanıcı tarafına uygulanır */
    S.prevType=S.curType; S.curType=type;
    if(posChanged){ S.setIx=_srand(0,SET_ALL.length-1); S.flip=_sr()<0.5; }

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
      const tBase=_ftWaitSec(offP.concat(defP));   /* F14-7 */
      const shots=ev.shots.slice(0,3);   /* 3 atışlık fauller de tam canlandırılır */
      const steps=[];
      /* düdük anında spiker faul cümlesini söyler (sonuç DEĞİL) */
      if(P){
        steps.push({at:0.10,fn:()=>{ _ballHold(shooter); P('pre'); }});
        _markPainted();
      }
      /* FAZ 37 §8.3: SÜRE DOLSA BİLE DİZİLİM BEKLENİR. `_ftWaitSec` bir TAHMİNDİR
         (mesafe/hız); kare kaybı ya da çarpışma çözücüsü yüzünden gerçek varış gecikirse
         şut yine erken patlar. Bu kapı her karede bakar: 10 oyuncudan en az 9'u hedefine
         20 px yaklaşmadıysa atışı en fazla +2,5 sn erteler. Sahne saatinde çalışır,
         rastgelelik tüketmez. */
      const _ftHazir=()=>{
        try{
          let n=0;
          offP.concat(defP).forEach(p=>{ if(p&&Math.hypot(p.x-p.tx,p.y-p.ty)<=20) n++; });
          return n>=9;
        }catch(e){ return true; }
      };
      /* §4: topu alır ve 1-3 kez sektirir; süre dolunca top elde kalır ve atış gelir. */
      steps.push({at:tBase-0.60,fn:()=>{ _ballHold(shooter); _ftSektir(shooter); }});
      steps.push({at:tBase-0.05,fn:()=>{ const _b=_ball(); _b.noDrib=true; _b.dribBitis=null; }});
      let last=tBase;
      shots.forEach((sh,i)=>{
        const t0=tBase+0.55+i*1.05;      /* gerçek serbest atış ritmi (~1 sn arayla) */
        last=t0;
        steps.push({at:t0,bekle:(i===0)?_ftHazir:null,max:2.5,fn:()=>{
          shooter.pop=0.8;
          _ballShoot(rim,0.50,sh.made,()=>{
            _liveMark(sh);
            _rimFlash(rim[0],rim[1],sh.made);
            if(typeof sfx==='function'&&sh.made) sfx('score');
            if(i===shots.length-1){ if(S) S._ftAktif=false; if(P){ P('res'); } }
            if(!sh.made&&i===shots.length-1){
              const a=_sr()*6.283;
              _ballLoose(Math.cos(a)*110,Math.sin(a)*100,105);
              /* kaçan son atış → canlı ribaund: en yakın uzun topu toplar */
              const pool=_sr()<0.72?defP:offP;
              const reb=_rolesOrder(pool)[4]||pool[0];
              _chase(reb,null,2.6);
            }
          });
        }});
        /* M5: atislar arasi top cemberden aticiya ISINLANMAZ (b.carrier dogrudan atanmisti,
           ~135 px tek kare sicramasi); hakem topu geri verir — gorunur kisa pas. */
        if(i<shots.length-1){
          steps.push({at:t0+0.70,fn:()=>{ _ballHold(shooter); _ftSektir(shooter); }});
          steps.push({at:t0+1.00,fn:()=>{ const _b=_ball(); _b.noDrib=true; _b.dribBitis=null; }});
        }
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
      if(P) _markPainted();
      return _script([{at:0.15,fn:()=>{ _ballHold(reb); reb.pop=0.9; if(P) P(); _startBreak(rebIsUser); }}])+380;
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
      if(!thief) thief=defP[_srand(0,4)];
      const thiefIsUser=(ev.stealIsUser!=null)?!!ev.stealIsUser:(S.home.indexOf(thief)>=0);
      const b=S.ball;
      const dx=thief.x-b.x, dy=thief.y-b.y, dd=Math.hypot(dx,dy)||1;
      _ballLoose(dx/dd*150+_srand(-40,40),dy/dd*150+_srand(-40,40),60);
      /* Top kapıldığı an: cümle + karşı yöne hücum aynı karede başlar.
         §1.2: topu kapan UZUNSA (PF/C) karşı sahaya kendi sürmez — en yakın guard'a
         çıkış pası atar. Ribaund sonrası bu kural zaten vardı (M9); çalma yolunda yoktu. */
      _chase(thief,()=>{
        if(P){ P(); }
        _startBreak(thiefIsUser);
        try{
          const hedef=_cikisHedefi(thief,S.offP||[],_rim(S.offSide));
          if(hedef) _script([{at:0.30,fn:()=>{ try{ _ballPass(hedef,0.30); }catch(e){} }}]);
        }catch(e){}
      },2.2);
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
      S.players.forEach(p=>{ _setUrg(p,_URG.YURU); });  /* ölü topta herkes yürür */
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
      if(inb){ inb._oob=true; if(!S.chase){ inb.tx=spot.x; inb.ty=spot.y; _setUrg(inb,_URG.KOS); } }
      else {
        inb=_inboundSetup(spot,offP,[pg]);        /* dizilimden SONRA */
        _chase(inb,()=>{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; _setUrg(inb,_URG.KOS); },1.8);
      }
      const t0=Math.max(0.9,inb._inbEta||0.6);
      return _script([
        {at:t0+0.55,fn:()=>_inboundPass(inb,pg,0.32)},
        {at:t0+1.35,fn:()=>{ _setFormation(offLeft,offP,defP,null,{phase:'set'}); }}
      ])+500;
    }
    if(needBall) _ballHold(pg);
    _setFormation(offLeft,offP,defP,null,{phase:'set'});
    const a1=offR[_srand(1,4)]||pg, a2=offR[_srand(1,4)]||pg;
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
  /* Sonuç cümlesi tek noktadan basılır; bir kez basıldıysa tekrar basılmaz. */
  const _S0=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  const _res=()=>{ if(_S0) _S0.pendingPaint=null; try{ if(typeof onResult==='function') onResult(); }catch(e){} };
  try{
    const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
    if(!S) return 0;
    clearBallTimers();
    /* pendingPaint YALNIZCA clearBallTimers'tan SONRA kurulur: onceki sirada kurulunca
       bu satirdaki flush cumleyi pozisyonun BASINDA bastiriyordu (kimlik %64'e dusuyordu). */
    S.pendingPaint=_res;
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
    /* M9: savunma ribaundundan sonra top uzunda (PF/C) kalıyordu ve PİVOT topu tek başına
       karşı sahaya sürüyordu — oyun kurucu topa hiç dokunmuyordu. Gerçek basketbolda
       ribaundun ardından ilk iş ÇIKIŞ (outlet) PASIDIR. Uzun topu alırsa topu guard'a
       çıkarır, hücumu kurucu getirir. (İkinci şans şutunda outlet yok — top zaten potada.)
       Karar, aşağıdaki "pg===shooter" düzeltmesinden ÖNCE verilir: uzun hem ribaundu alıp
       hem şutu atacaksa pg guard'a çevriliyor, top yine uzunda kalıyor ve çıkış pası hiç
       kurulmuyordu (ölçüm: %71 → bu sıra düzeltilince ~%100). */
    let outletTok=null;
    if(!sh.pb&&pg&&(pg.role===3||pg.role===4)){
      const guard=offR.find(p=>p!==pg&&p!==shooter&&(p.role===0||p.role===1))
                ||offR.find(p=>p!==pg&&(p.role===0||p.role===1))
                ||offR.find(p=>p!==pg&&p!==shooter)
                ||offR.find(p=>p!==pg);
      if(guard){ outletTok=pg; pg=guard; }
    }
    if(pg===shooter) pg=offR.find(p=>p!==shooter&&p!==outletTok)||offR.find(p=>p!==shooter)||offR[0];
    /* Sunum denetimi damgası (tools/sunum-check.js okur) — davranışı etkilemez. */
    try{ S._dbgOutlet={tasiyiciRol:(b.carrier&&b.carrier.role!=null)?b.carrier.role:null,pb:!!sh.pb,outlet:!!outletTok,pgRol:pg?pg.role:null}; }catch(e){}
    const relay=offP.filter(p=>p!==shooter&&p!==pg);
    const tac=G.tactics||{};
    const userAtt=!!sh.isHome;
    /* Ara pas hedefi: taktik odağı → anlatımdaki asistçi (sh.pid) önceliklidir. */
    let mid=relay.length?relay[_srand(0,relay.length-1)]:pg;
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
    /* §5/§8: sunum denetimi bu pozisyonun şemasını okur (yörünge farkı ölçümü).
       Yalnız damgadır — davranışa hiç dokunmaz. */
    try{ mState._semaAd=scheme||'diger'; }catch(e){}
    /* F25-5 KÖK NEDENİ: `S._sema` sahne damgası yalnız YAYILMA şemasında (spotup)
       yazılıyor ve BİR DAHA TEMİZLENMİYORDU. Ölçüm damgayı `mState._semaAd`den önce
       okuduğu için maçın ilk spot-up pozisyonundan sonra bütün set kareleri 'spotup'
       kovasına düşüyor, geri kalan şemalar 20 karelik eşiği hiç aşamıyordu — kapı
       "yalnız 1 şema yeterli kare topladı" diye düşüyordu. Damga POZİSYON BAŞINADIR. */
    try{ const _S=(typeof mState!=='undefined'&&mState)?mState._sim:null; if(_S) _S._sema=null; }catch(e){}
    const mv=sh.move||null;
    const isPnr=(scheme==='pnr'||scheme==='handoff')&&!fastBreak&&!putback&&!iso;

    /* ── şut anı ── */
    const fire=()=>{
      try{ if(typeof onShoot==='function') onShoot(); }catch(e){}
      /* M5/M6: top sut noktasina ISINLANMAZ. bridge onu zaten oraya tasidi; kalan fark
         kucukse hizalanir, buyukse sut topun GERCEK konumundan cikar (tek karelik
         100+ px sicrama boylece kalkti). */
      { const dF=Math.hypot(b.x-sh.x,b.y-sh.y); if(dF<=40){ b.x=sh.x; b.y=sh.y; } }
      /* FAZ 26 §1: sıçrama da şut tipinden gelir — smaçta jeton belirgin yükselir ve
         havada daha uzun kalır, floater'da kısa bir sıçrama vardır, turnikede en az.
         `pop` hem ölçeği (jeton büyür) hem "havada" hissini verir. */
      const _sTip=sh.sut||null;
      shooter.pop=(_sTip==='smac')?1.6:(_sTip==='tipin')?1.45:(_sTip==='kanca')?0.9:(_sTip==='turnike')?0.85:(_sTip==='floater')?1.15:1;
      _lockTok(shooter,_sTip==='smac'?1.0:0.8);
      if(sh.blk){
        /* Blok: top çembere ULAŞMAZ — kısa yükselip çelinir, serbest kalır. */
        const bx=sh.x+(rim[0]-sh.x)*0.22+_srand(-16,16), by=sh.y+(rim[1]-sh.y)*0.22+_srand(-16,16);
        /* bloğu yapan en yakın savunmacı sıçrar */
        let bl=null,bd=1e9;
        defP.forEach(p=>{ const d=Math.hypot(p.x-sh.x,p.y-sh.y); if(d<bd){bd=d;bl=p;} });
        if(bl) bl.pop=1;
        _ballShoot([bx,by],0.20,false,()=>{
          _res();
          const a2=_sr()*6.283;
          _ballLoose(Math.cos(a2)*150,Math.sin(a2)*140,95);
          _rebScramble(offP,defP,rim,offLeft);
        });
        return;
      }
      const rimD=Math.hypot(sh.x-rim[0],sh.y-rim[1]);
      /* FAZ 26 §1: uzak şutta süre sabit 0,58 idi ve tip yayı ezemiyordu. Süre artık
         yalnız ORTA/UZAK jumper-üçlük için sabitlenir; tip verilen her şutta `_ballShoot`
         kendi tempo hesabını yapsın diye 0 geçilir. */
      const _durSabit=(rimD<90||_sTip==='smac'||_sTip==='turnike'||_sTip==='floater'||_sTip==='kanca'||_sTip==='tipin')?0:0.58;
      _ballShoot(rim,_durSabit,sh.made,()=>{
        _rimFlash(rim[0],rim[1],sh.made);
        /* M12: AND-1 — saha şutu girdi + faul. Eskiden çizgide kimse görünmezken tabela
           3 artıyor, spiker "AND-1 tamam!" diyordu. Artık ek atış canlandırılır; anlatım
           cümlesi (sonucu söylediği için) atışın sonucuyla aynı karede basılır. */
        if(sh.made&&sh.and1){ _and1Sequence(sh,shooter,offP,defP,offLeft,rim,_res); return; }
        _res();
        if(sh.made){
          /* Sayı: top fileden geçer, potanın altına düşer. Rakip HEMEN topu almaya gider,
             çizgi dışına çıkar; sayı atan takım savunmaya döner (ölü bekleme yok). */
          _setupInbound(!sh.isHome,250+(_sr()<0.5?-1:1)*_srand(24,74));
        } else {
          /* Kaçan şut: çemberden karambol — top potadan uzağa, GERÇEKÇİ mesafede seker
             (~2-3m), sonra ribaund mücadelesi başlar. */
          const away=Math.atan2(sh.y-rim[1],sh.x-rim[0])+(_sr()*2-1)*1.1;
          const sp=_srand(120,205);
          _ballLoose(Math.cos(away)*sp,Math.sin(away)*sp,105);
          S.inb=null;
          _rebScramble(offP,defP,rim,offLeft);
        }
      },_sTip);
    };

    /* Ribaund mücadelesi: iki taraftan da uzunlar cama yüklenir; topu ALAN,
       sıradaki olay (reb / bir sonraki hücum) ile TUTARLI seçilir. */
    function _rebScramble(offA,defA,rimXY,left){
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
      const w=pick(winTeam), l=pick(loseTeam);
      const bb=S.ball;
      const winIsUser=(winTeam===S.home);
      /* Rakip ribaundcu topun ÜSTÜNE değil, box-out mesafesinde (≈1.5m) yüklenir —
         iki jeton iç içe geçmesin. */
      if(l&&l!==w){ const an=_sr()*6.283, rr=_srand(48,66); _setUrg(l,_URG.KOS); l.tx=_inX(bb.x+Math.cos(an)*rr); l.ty=_inY(bb.y+Math.sin(an)*rr); _lockTok(l,1.4); }
      if(w){
        w.pop=0.7;
        /* Anlatımda ribaund cümlesi VARSA topu 'reb' olayı aldırır (senkron);
           yoksa mücadeleyi burada bitir ki top yerde kalmasın. Top alınır alınmaz
           yeni hücum BAŞLAR (gerçek basketbol: ribaund = geçişin başlangıcı). */
        if(!(nx&&nx.type==='reb')) _chase(w,()=>{ _startBreak(winIsUser); },2.4);
        else { _setUrg(w,_URG.SPRINT); w.tx=bb.x; w.ty=bb.y; _lockTok(w,1.2); }
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
          dfn.tx=_inX(sh.x+dx/dd*g); dfn.ty=_inY(sh.y+dy/dd*g); _setUrg(dfn,_URG.SPRINT);
          _lockTok(dfn,0.9);
          if(sh.contest==='heavy') dfn.pop=0.6;
        }
      }catch(e){}
    };
    /* Köprü adımı: şuttan hemen önce top şut noktasından hâlâ uzaksa kısa sıçrayışla taşınır. */
    const bridge=()=>{
      const d=Math.hypot(b.x-sh.x,b.y-sh.y);
      /* M5/M6: süre mesafeyle ölçeklenir — sabit 0,22 sn uzun mesafede ışınlanma yaratıyordu. */
      if(d>36) _ballPass({x:sh.x,y:sh.y,vx:0,vy:0,side:1,ghost:true},Math.max(0.14,Math.min(0.55,d/520)));
    };

    /* F15-1: taban 90 px/sn yeni ölçekte yürüyen jetonu 2,5 kat hızlı sayıyordu. */
    const etaTok=(p,x,y)=>p?Math.hypot(p.x-x,p.y-y)/Math.max(40,p.maxV||p.baseV||_PL_MAXV)+0.18:0.3;
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
        _chase(inb,()=>{ S.ball.noDrib=true; inb.tx=spot.x; inb.ty=spot.y; _setUrg(inb,_URG.KOS); },1.8);
      } else {
        inb._oob=true;                       /* çizgi dışı izni sürüyor */
        if(!S.chase){ inb.tx=spot.x; inb.ty=spot.y; }
      }
      /* §1.2: sokma pası ROL SIRASINA göre bir taşıyıcıya (1/2/3) gider. Eskiden dizideki
         ilk uygun oyuncu seçiliyordu; sokucu guard olduğunda top pivota atılıyor ve
         karşı sahaya pivot sürüyordu. */
      if(pg===inb||!_tasiyabilir(pg)){
        pg=offR.find(p=>p!==inb&&p!==shooter&&_tasiyabilir(p))
          ||offR.find(p=>p!==inb&&_tasiyabilir(p))
          ||offR.find(p=>p!==inb&&p!==shooter)||offR.find(p=>p!==inb)||pg;
      }
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
    /* M9: çıkış pası — uzun topu kanattaki/çemberdeki guard'a çıkarır, hücum ondan sonra kurulur. */
    if(outletTok&&pg&&outletTok!==pg){
      steps.push({at:tOff+0.15,fn:()=>{
        const d=Math.hypot(outletTok.x-pg.x,outletTok.y-pg.y);
        _ballPass(pg,Math.max(0.18,Math.min(0.62,d/520)));
        if(typeof sfx==='function') sfx('pass');
      }});
    }
    /* topu getiren gerçekten sürerek gelir.
       M9: ETA, topu getirenin GERÇEKTEN gittiği kulvara göre hesaplanır — eskiden her zaman
       TRANS_OFF[0] (PG kulvarı) alınıyordu, pivot topu getirdiğinde gitmediği bir noktaya
       göre süre biçiliyordu. Outlet varsa pasın süresi de eklenir. */
    const bringHedef=_pt(TRANS_OFF[Math.max(0,Math.min(TRANS_OFF.length-1,pg.role|0))],offLeft,false);
    const outletPay=outletTok?0.45:0;
    const bringT=fastBreak?0.85:Math.max(1.05,Math.min(2.4,outletPay+etaTok(pg,bringHedef[0],bringHedef[1])));
    const tSet=tOff+bringT;
    /* F11-2: topsuz dört oyuncu topu beklemeden dizilime açılır (hızlı hücumda kulvarlar korunur). */
    if(!fastBreak) steps.push({at:tOff+0.10,fn:()=>{ _setFormation(offLeft,offP,defP,null,{phase:'fill',ballTok:pg}); }});
    steps.push({at:tSet,fn:()=>{ _setFormation(offLeft,offP,defP,sh,{phase:'set',keepNear:true,lateShooter:true}); }});

    let tFire;
    if(fastBreak){
      /* Hızlı hücum: herkes sprintle öne, tek outlet pas, erken bitiriş. */
      const passerTok=(sh.pid!=null)?offP.find(p=>p!==shooter&&p.pl&&p.pl.id===sh.pid):null;
      tFire=tSet+(passerTok?1.15:0.95);
      steps.push({at:tOff+0.05,fn:()=>{ offP.forEach(p=>{ _setUrg(p,_URG.SPRINT); }); }});
      if(passerTok){
        steps.push({at:tOff+0.35,fn:()=>_ballPass(passerTok,0.42)});
        steps.push({at:tFire-0.55,fn:()=>{ _ballPass(shooter,0.40); if(typeof sfx==='function') sfx('pass'); }});
      } else {
        steps.push({at:tSet-0.25,fn:()=>_ballPass(shooter,0.45)});
      }
    } else if(iso){
      /* İzolasyon: diğerleri kenara çekilir, yıldız topu alır ve kendisi çözer. */
      steps.push({at:tSet+0.05,fn:()=>{ offP.forEach(p=>{ if(p!==shooter&&p!==pg) p.ty=_inY(p.ty+(p.ty<250?-24:24)); }); }});
      const tPass=tSet+0.95;
      tFire=tPass+2.9;
      steps.push({at:tPass,fn:()=>_ballPass(shooter,0.32)});
    } else {
      /* SET OYUNU: perde (pnr), tek kesme, kilit pas. */
      /* F11-2: kesme HER pozisyonda yapılıyordu; kesici dizilimdeki noktasını boşaltınca
         hücumun kapladığı alan çöküyordu. Artık yalnız anlatımın gerçekten kesme/postup
         olduğu pozisyonlarda (ve seyrek olarak çeşitlilik için) kesme yapılır — dış şut
         (spotup) pozisyonlarında dizilim korunur. */
      const doCut=(scheme==='cut')||(!isPnr&&scheme!=='postup'&&scheme!=='spotup'&&_sr()<0.35);
      const cutter=doCut?(relay.find(p=>p!==mid&&p.pl&&(p.pl.poz==='C'||p.pl.poz==='PF'))||relay.find(p=>p!==mid)||null):null;
      const screener=isPnr?_pickScreener(relay,mid,cutter,pg,rim):null;
      const doMid=(mid!==pg)&&(sh.pid!=null);
      /* M13: aralıklar ~2,2 katına çıkarıldı — dizilim şuttan en az 1,5 sn önce oturur,
         jetonlar sprint sınırına dayanmadan yerlerine yürür. */
      const tSwing=tSet+1.65;
      const tKey=tSwing+(doMid?1.85:0.85);
      tFire=tKey+1.60;
      if(screener){
        /* ── §6.2: PERDE ÜÇ AŞAMAYA BÖLÜNDÜ ──────────────────────────────────────────
           Eskiden perde tek adımdı: perdeci noktaya gidiyor, sonra potaya devriliyordu.
           Gerçek perde üç evredir ve üçü de ayrı ayrı görünmeli:
             1) KURULUM  — perdeci durur, gövdesini savunmacıya verir (bir an sabit)
             2) SIYIRMA  — topu taşıyan perdenin OMZUNU sıyırarak geçer
             3) DEVRİLME — perdeci potaya devrilir (roll) ya da dışarı açılır (pop)
           F11-2 mesafesi (32 px ≈ 1 m) korunur; jetonlar iç içe geçmez. */
        const _perdeSag=offLeft?32:-32;
        /* 1) KURULUM — perdeci yerine gelir ve KİLİTLENİR (gövdesini verdiği an). */
        steps.push({at:tSet+0.25,fn:()=>{
          screener.tx=_inX(pg.x+_perdeSag); screener.ty=_inY(pg.y-22);
          _setUrg(screener,_URG.KOS); _lockTok(screener,0.95);
          S._perde={evre:1,tok:screener,t:S.time};
        }});
        /* 2) SIYIRMA — topçu perdenin omzunu yalayarak geçer; perdeci hâlâ sabit. */
        steps.push({at:tSet+1.15,fn:()=>{
          try{
            const yan=offLeft?1:-1;
            /* Sıyırma OMUZ mesafesinde kalır. İlk denemede 30 px yanal + 26 px dikey
               verilmişti; topçu ~2,1 m yer değiştiriyor ve savunmacısı kopuyordu
               (spacing-check "topu tutana en yakın savunmacı" 1,98 → 2,08 m). */
            pg.tx=_inX(screener.x+yan*16); pg.ty=_inY(screener.y+20);
            _setUrg(pg,_URG.KOS); _lockTok(pg,0.55);
            _lockTok(screener,0.55);                 /* perde kurulu kalır */
            S._perde={evre:2,tok:screener,t:S.time};
            /* §6.2: SAVUNMA TEPKİSİ — perdeye ya GEÇİLİR (switch) ya ARKADAN DOLAŞILIR.
               Tepki olmadan savunmacı perdenin arkasında kalıyor ve markaj kalıcı
               kopuyordu. Karar sahne PRNG'sinden gelir (B-5). */
            const dPg=(S.defP||[]).find(d=>d._mark===pg);
            const dScr=(S.defP||[]).find(d=>d._mark===screener);
            if(dPg&&dScr&&_sr()<0.30){
              dPg._mark=screener; dScr._mark=pg;      /* switch: eşleşmeler değişir */
              S._perdeSav='switch';
            } else if(dPg){
              /* over/under: savunmacı perdenin arkasından dolaşıp adamına yetişir */
              dPg.tx=_inX(pg.tx+yan*10); dPg.ty=_inY(pg.ty+12);
              /* KOŞ yeterli: SPRINT, perde etrafında kısa mesafede anlık hızı 10,5 m/sn'ye
                 çıkarıyor ve hareket-check'in en yüksek hız kapısını (<9,5) düşürüyordu. */
              _setUrg(dPg,_URG.KOS);
              S._perdeSav='dolas';
            }
          }catch(e){}
        }});
        /* 3) DEVRİLME — potaya devril (roll) ya da dışarı aç (pop). Karar SAHNE
           PRNG'sinden gelir; `Math.random` maçın akışını kaydırırdı (B-5). */
        steps.push({at:tKey-0.10,fn:()=>{
          const roll=_sr()<0.62;
          if(roll){
            screener.tx=_inX(rim[0]+(offLeft?1:-1)*_srand(30,64));
            screener.ty=_inY(250+_srand(-30,30));
          } else {
            /* pop: yay dışına, topçunun arkasına açılır */
            screener.tx=_inX(pg.x+(offLeft?-52:52)); screener.ty=_inY(pg.y-_srand(28,58));
          }
          _setUrg(screener,_URG.KOS); _lockTok(screener,1.1);
          S._perde={evre:3,tok:screener,t:S.time,roll};
        }});
      }
      if(cutter){
        steps.push({at:tSet+0.45,fn:()=>{
          const sp=_pickCutSpot(offP,cutter,offLeft);
          cutter.tx=_inX(sp[0]); cutter.ty=_inY(sp[1]);
          _setUrg(cutter,_URG.KOS); _lockTok(cutter,1.2);
        }});
      }
      /* §5: YAYILMA (spotup) — dört oyuncu yay DIŞINDA geniş durur, bir kişi çembere gider.
         Şema seçiliyordu ama sahada karşılığı yoktu: spotup ile pnr aynı görünüyordu.
         Dizilim noktalarını ezmez, onları yay dışına doğru İTELER — FAZ 11 aralık ölçüsü
         bozulmaz, tersine açılır. */
      if(scheme==='spotup'){
        steps.push({at:tSet+0.30,fn:()=>{
          try{
            const yay=offP.filter(p=>p!==shooter);
            /* Çembere giden: en içerideki uzun. */
            let ic=null,icd=1e9;
            yay.forEach(p=>{ const d=Math.hypot(p.x-rim[0],p.y-rim[1]); if(d<icd){icd=d;ic=p;} });
            yay.forEach(p=>{
              if(p===ic){
                _hedefAta(p,_inX(rim[0]+(offLeft?1:-1)*_srand(26,46)),_inY(250+_srand(-24,24)),_URG.KOS);
                return;
              }
              /* Yay dışına it — ama YALNIZ içeride kalanı ve çizginin hemen dışına.
                 İlk denemede herkes `max(THREE_R+26, d)` yarıçapına itiliyordu; potadan
                 225 px uzak nokta sahanın ORTA ÜÇTE BİRİNE düşüyor ve dizilim ölçümünü
                 bozuyordu (orta üçte bir %16,4 → %20,7). */
              const dx=p.x-rim[0], dy=p.y-rim[1], d=Math.hypot(dx,dy)||1;
              if(d>=THREE_R+10) return;                 /* zaten yay dışında — dokunma */
              const hedefR=THREE_R+14;
              _hedefAta(p,_inX(rim[0]+dx/d*hedefR),_inY(rim[1]+dy/d*hedefR),_URG.JOG);
            });
            S._sema={ad:'spotup',t:S.time};
          }catch(e){}
        }});
      }
      if(doMid) steps.push({at:tSwing,fn:()=>_ballPass(mid,0.34)});
      /* §6.1: POST OYUNU — hücumcu posta iner ve SIRTINI POTAYA DÖNER; savunmacı arkasında
         kalır. Top girince sırtı dönük hâlde çevirme/kanca gelir. `_sirtDonuk` yalnız
         yönelim göstergesini etkiler, konum/hız matematiğine dokunmaz. */
      if(scheme==='postup'&&shooter){
        steps.push({at:tSet+0.35,fn:()=>{ shooter._sirtDonuk=true; S._postup={tok:shooter,t:S.time}; }});
        /* Şut anında sırt dönük hâl biter — oyuncu potaya döner ve bitirir. */
        steps.push({at:Math.max(tSet+0.5,tFire-0.28),fn:()=>{ shooter._sirtDonuk=false; }});
      }
      steps.push({at:tKey,fn:()=>{ _ballPass(shooter,0.34,scheme==='postup'); if(sh.pid!=null&&typeof sfx==='function') sfx('pass'); }});
    }

    /* F11-2/F11-3: boya içi şutlarda şutör dizilimde bekletildi (lateShooter); şut noktasına
       burada, şuttan ~1,9 sn önce koşar — hem 3 saniye ihlali görüntüsü kalkar hem de
       hücumun aralığı pozisyonun büyük kısmında korunur. */
    if(shooter&&_inPaint(sh.x,sh.y,offLeft)){
      const tRelease=Math.max(tSet+0.15,tFire-1.9);
      steps.push({at:tRelease,fn:()=>{
        shooter.tx=_inX(sh.x); shooter.ty=_inY(sh.y);
        _setUrg(shooter,_URG.KOS); _lockTok(shooter,Math.max(0.6,tFire-tRelease));
      }});
    }
    /* şutör hamlesi (crossover/step-back/spin/drive) — metinle birebir aynı hamle */
    if(shooter&&mv){
      if(mv==='stepback'){
        steps.push({at:Math.max(0.1,tFire-0.55),fn:()=>{ const dx=rim[0]-sh.x,dy=rim[1]-sh.y,dd=Math.hypot(dx,dy)||1; shooter.tx=_inX(sh.x+dx/dd*32); shooter.ty=_inY(sh.y+dy/dd*32); _setUrg(shooter,_URG.KOS); _lockTok(shooter,0.5); }});
        steps.push({at:Math.max(0.12,tFire-0.16),fn:()=>{ shooter.tx=sh.x; shooter.ty=sh.y; _lockTok(shooter,0.4); }});
      } else if(mv==='spin'){
        steps.push({at:Math.max(0.1,tFire-0.42),fn:()=>{ shooter.tx=_inX(sh.x+(offLeft?-15:15)); shooter.ty=_inY(sh.y+13); _lockTok(shooter,0.4); }});
        steps.push({at:Math.max(0.12,tFire-0.14),fn:()=>{ shooter.tx=sh.x; shooter.ty=sh.y; _lockTok(shooter,0.3); }});
      } else if(mv==='drive'){
        steps.push({at:Math.max(0.1,tFire-0.5),fn:()=>{ _setUrg(shooter,_URG.KOS); }});
      } else if(mv==='crossover'||mv==='hesitation'){
        steps.push({at:Math.max(0.1,tFire-0.44),fn:()=>{ shooter.tx=_inX(sh.x+(offLeft?18:-18)); shooter.ty=_inY(sh.y+(sh.y<250?12:-12)); _setUrg(shooter,_URG.KOS); _lockTok(shooter,0.4); }});
        steps.push({at:Math.max(0.12,tFire-0.15),fn:()=>{ shooter.tx=sh.x; shooter.ty=sh.y; _lockTok(shooter,0.3); }});
      }
    }
    if(sh.contest&&sh.contest!=='open') steps.push({at:Math.max(0.05,tFire-0.24),fn:closeout});
    /* bridge, pasin en uzun suresi (0,55 sn) kadar ONCE calisir ki top sut anina yetissin. */
    steps.push({at:Math.max(0.05,tFire-0.62),fn:bridge});
    steps.push({at:tFire,fn:fire});

    _script(steps);
    /* M12: AND-1'de ek atış koreografisi şuttan SONRA geliyor; gecikme bütçesine eklenir. */
    return Math.round((tFire+0.85)*1000)+((sh.made&&sh.and1)?2100:0);
  }catch(e){ return 0; }
}

/** M12: AND-1 ek atışı — şutör çizgiye gider, tek serbest atış, sonra oyun devam eder.
    res(): şut cümlesini basan geri çağrı; ek atışın SONUCUYLA aynı karede çalıştırılır. */
function _and1Sequence(sh,shooter,offP,defP,offLeft,rim,res){
  const S=(typeof mState!=='undefined'&&mState)?mState._sim:null;
  if(!S||!shooter){ try{ res(); }catch(e){} return; }
  const made=!!(sh.and1&&sh.and1.made);
  try{
    const line=_pt([FT_LINE_X,250],offLeft,false);
    offP.concat(defP).forEach(p=>{ p._oob=false; });
    _setFtFormation(offLeft,offP,defP,shooter);
    S.shooter=shooter;
    S.defTrack=false;                 /* ölü top — savunma çizgi dizilişinde */
    S.inb=null;
    /* F14-7: burada da bekleme şutöre göre hesaplanıyordu — aynı kapıdan geçer. */
    const tAt=_ftWaitSec(offP.concat(defP))+0.45;
    _script([
      {at:0.12,fn:()=>{ _ballHold(shooter); }},          /* hakem topu atıcıya verir */
      {at:tAt-0.18,fn:()=>{ _ballHold(shooter); }},      /* çizgiye varınca hizalan */
      {at:tAt,fn:()=>{
        shooter.pop=0.8;
        _ballShoot(rim,0.50,made,()=>{
          _rimFlash(rim[0],rim[1],made);
          try{ res(); }catch(e){}                        /* cümle: sonuçla senkron */
          if(typeof sfx==='function'&&made) sfx('score');
          if(made){
            _setupInbound(!sh.isHome,250+(_sr()<0.5?-1:1)*_srand(24,74));
          } else {
            /* Kaçan ek atış canlı toptur — ribaund mücadelesi başlar. */
            const a=_sr()*6.283;
            _ballLoose(Math.cos(a)*110,Math.sin(a)*100,105);
            const pool=_sr()<0.72?defP:offP;
            const reb=_rolesOrder(pool)[4]||pool[0];
            _chase(reb,null,2.6);
          }
        });
      }}
    ]);
  }catch(e){ try{ res(); }catch(e2){} }
}

/* 37. oturum — KULLANICI İSTEĞİ: canlı sahanın üzerine biriken "O / X" şut izleri kaldırıldı.
   Parkede artık yalnız oyuncular ve top var; şut verisi (`mState.allShots`) toplanmaya devam
   eder ve kutu skor / analiz sayfası bundan beslenir. Filtre düğmeleri, açıklama metni ve
   `shotsLayer` katmanı da arayüzden çıkarıldı (işlevsiz kalmışlardı). */

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
/* F14-3: `davranis` İÇ ANAHTARDIR, çevrilmez — localizeCatalogs yalnız ['ad','stil']
   alanlarını çevirir. Spikerler artık sıfatla değil DAVRANIŞLA ayrışır (bkz. spikerImza). */
const SPIKERS=[
  {id:'cosku',ad:'Coşkun Bağrışan',stil:'Heyecanlı',emoji:'🔥',davranis:'isimTekrar'},
  {id:'bilge',ad:'Bilge Hoca',stil:'Analitik',emoji:'🧠',davranis:'istatistik'},
  {id:'cem',ad:'Esprili Cem',stil:'Esprili',emoji:'😄',davranis:'espri'},
  {id:'reha',ad:'Klasik Reha',stil:'Resmî',emoji:'🎙️',davranis:'resmi'}
];
/* İŞ 4: havuzlar ~2 katına çıkarıldı (özellikle score2/miss2/score3/miss3) ve hamle/şema
   kelimeleri (step-back, çalım, spin, pick-and-roll, transition, "dibe indi") core'lardan
   TEMİZLENDİ — bu diller yalnız play.move/scheme dolduğunda MOVE_BY/ASSIST_PHRASES'ten gelir,
   böylece söz sahada gerçekten olanla çelişmez. Bölge filtreleri (_NEAR/_MID) için her
   score2/miss2 havuzunda yakın + orta + nötr kalıplar dengeli tutuldu. */
const SPIKER_LINES={
  cosku:{
    score2:['%S SMACI ÇAKTI, potaya asıldı! %SC','%S SMAÇLA BİTİRDİ — çember titredi! %SC','%S çemberi PARÇALADI, smaç! %SC','%S yumuşak kavisle yükseldi, içeride! %SC','%S POTAYA ASILDI, İKİ SAYI! %SC','%S BOYALI ALANI YIKTI! %SC','%S turnikeyi PATLATTI! %SC','%S pota altında CANAVAR gibi, iki! %SC','%S ORTA MESAFEDEN VURDU, muhteşem! %SC','%S orta mesafeden soğukkanlı, iki! %SC','%S orta mesafe şutunu tutturdu! %SC','%S DURDURULAMIYOR, iki sayı! %SC','%S sayıyı yazdırdı, tribün ayakta! %SC','%S buz gibi bitirdi! %SC','%S coştu, iki daha geldi! %SC'],
    score3:['%S DERİNDEN BOMBAYI PATLATTI — ÜÇLÜK! %SC','%S ÜÇLÜĞÜ GÖMDÜ, tribün ayakta! %SC','%S köşeden NİŞANCI gibi, üç! %SC','%S UZAKTAN VURDU, inanılmaz! %SC','%S yaydan ATEŞ etti — SWISH! %SC','%S logodan denedi ve GİRDİ! %SC','%S kanattan bombayı bıraktı! %SC','%S tereddütsüz çekti, üç geldi! %SC','%S file sallandı, muhteşem üçlük! %SC','%S yay dışından acımadı! %SC','%S üçlükte ateş hattında! %SC'],
    miss2:['%S smacı çemberde patladı!','%S kavisi kısa kaldı!','%S turnikede tökezledi!','%S POTA İZİN VERMEDİ, kaçtı!','%S yakındaydı ama SEKTİ!','%S orta mesafeden kaçırdı!','%S orta mesafe şutu kısa kaldı!','%S uzaktan denedi, olmadı!','%S çember reddetti!','%S bu sefer olmadı, yazık!','%S demire takıldı!','%S ıskaladı, seyirci sustu!'],
    miss3:['%S üçlüğü KAÇTI, çemberden döndü!','%S uzaktan ıskaladı, olmadı!','%S bombayı boşa harcadı!','%S yay dışından vuramadı!','%S köşe üçlüğü havada kaldı!','%S demir dedi, girmedi!','%S üçlük kısa düştü!','%S file yerine demiri buldu!','%S dış atış tutmadı!'],
    block:['%B MUAZZAM BLOK! %S geri döndü!','%B ŞAPKAYI TAKTI, inanılmaz savunma!','%B topu SİLİP ATTI!','%B duvar gibi, %S durduruldu!','%B kapağı kapadı, %S şaşkın!','%B uzun topu geri çevirdi!','%B savunmada devleşti!'],
    steal:['%C TOPU KAPTI, koşuyoo!','%C pas arasını OKUDU, çaldı!','%C elini uzattı ve ALDI!','%C müthiş bir top çalma!','%C çizgiyi okudu, top bizde!','%C hücumu ters çevirdi!','%C aktif eller, çaldı gitti!'],
    tactic:['Ritim değişiyor — tempo yükseliyoo!','Savunma kilitlendi, enerji tavanda!','Baskı artıyor, tribün ayakta!','Hücumda yeni varyasyon geliyoo!','Koç kenardan bağırıyor, tempo!']
  },
  bilge:{
    score2:['%S smaçla yüksek yüzdeli bitiriş. %SC','%S çembere yükselip smaçladı. %SC','%S kavisle uzunları aştı. %SC','%S doğru okumayla pota altında bitirdi. %SC','%S boyalı alanda yüksek yüzdeli bitiriş. %SC','%S turnikeyi sakin tamamladı. %SC','%S pota altı pozisyonunu iyi kullandı. %SC','%S orta mesafe şutu, mekanik kusursuz. %SC','%S orta mesafeden yüksek yüzde. %SC','%S uzaktan dengeli bir jumper, iki. %SC','%S savunmanın açığını görüp bitirdi. %SC','%S sabırlı hücum, temiz iki. %SC','%S pozisyonu iyi okudu, iki. %SC','%S soğukkanlı bir bitiriş. %SC'],
    score3:['%S ayakları hazır, ritimli üçlük. %SC','%S sahayı geniş kullandı, açık üç. %SC','%S kusursuz mekanikle üç. %SC','%S savunmayı yaydı ve cezalandırdı. %SC','%S yüksek yüzdeli konumdan üç. %SC','%S dengeli çıkış, temiz üçlük. %SC','%S köşe üçlüğünü değerlendirdi. %SC','%S kanattan isabetli üç. %SC','%S sabırlı organizasyon, açık üçlük. %SC','%S doğru karar, yay dışından üç. %SC','%S ritmini buldu, üç sayı. %SC'],
    miss2:['%S smaç denemesi çembere takıldı.','%S kavisi kısa kaldı, olmadı.','%S zorlama şut seçti, isabetsiz.','%S dengesi bozuktu, kaçtı.','%S savunma baskısında yüzde düştü.','%S bitiriş açısı kapalıydı.','%S acele etti, olmadı.','%S orta mesafeden kısa kaldı.','%S turnikede denge kaybı, kaçtı.','%S seçim hatalıydı, isabet yok.','%S{in} ritmi bozuldu, ıskaladı.','%S kontrolsüz şut, girmedi.'],
    miss3:['%S ayakları hazır değildi, kısa.','%S kontestli üçlük, düşük yüzde.','%S ritim tutmadı, ıskaladı.','%S seçim tartışılır, kaçtı.','%S dengesiz çıkış, isabet yok.','%S zorlama üçlük, girmedi.','%S yay dışından yüzde düşük, kaçtı.','%S erken şut, demire takıldı.','%S kapalı pozisyondan zorladı, olmadı.'],
    block:['%B iyi zamanlama, temiz blok — %S{i} durdurdu.','%B rotasyonu erken geldi, blokladı.','%B dikey savunmayla kurallı blok yaptı.','%B{in} okuması harika, %S engellendi.','%B yardım geldi ve blokladı.','%B pozisyonu tuttu, temiz blok.','%B disiplinli savunma, %S durduruldu.'],
    steal:['%C pas hattını kesti, kontrol onda.','%C okuması üst düzey, çaldı.','%C ellerini aktif kullandı, top kaybı.','%C savunma disiplini, topu aldı.','%C pasör hatasını cezalandırdı.','%C boşluğu okudu, top bizde.','%C erken rotasyonla topu kaptı.'],
    tactic:['Set oyunu düzenleniyor, sabırlı hücum.','Savunma rotasyonu yeniden ayarlanıyor.','Tempo kontrolü — doğru karar.','Açılma yeniden kuruluyor, akıllı oyun.','Hücum organizasyonu netleşiyor.']
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
    score2:['%S pota altında bitirdi. %SC','%S turnikeyi tamamladı. %SC','%S boyalı alandan bitirdi. %SC','%S pota dibinden bitirdi. %SC','%S orta mesafeden isabet kaydetti. %SC','%S orta mesafe şutunu geçti. %SC','%S uzaktan iki sayı buldu. %SC','%S içeride bitirdi. %SC','%S basket, iki sayı hanesine. %SC','%S sakin bitirdi. %SC','%S farkı ikiye indirdi. %SC'],
    score3:['%S dıştan vurdu, üç. %SC','%S dış atıştan başarılı. %SC','%S üçlük çizgisinden buldu. %SC','%S uzak mesafeden isabet. %SC','%S yay ötesinden geçirdi. %SC','%S yay dışından tamamladı. %SC','%S köşeden üç sayı. %SC','%S kanattan isabetli üçlük. %SC','%S dış atışta net isabet. %SC','%S üçlüğü fileye bıraktı. %SC','%S yay ötesinden skora üç. %SC'],
    miss2:['%S çemberden döndü.','%S şutu kısa kaldı.','%S turnikede başarısız.','%S tutturamadı.','%S bu kez tutturamadı.','%S orta mesafeden kaçırdı.','%S pota altında tamamlayamadı.','%S şutu çemberden döndü.','%S iki sayı denemesi boşa.','%S isabetsiz bir deneme.'],
    miss3:['%S üçlükte isabet yok.','%S dış atış tuttu değil.','%S uzaktan kaçırdı.','%S üç sayı denemesi boşa.','%S köşe üçlüğü isabetsiz.','%S yay dışından kaçırdı.','%S üçlük çemberden döndü.','%S dış atışta başarısız.','%S üç sayı bulamadı.'],
    block:['%B bloke etti; %S durduruldu.','%B temiz bir blok gerçekleştirdi.','%B savunmada blok kaydetti.','%B şutu engelledi.','%B bloğu tamamladı, %S{i} durdurdu.','%B savunmada müdahale etti.','%B şutu geri çevirdi.'],
    steal:['%C topu ele geçirdi.','%C top çalma kaydetti.','%C pası kesti.','%C savunmada topu aldı.','%C pas hattına müdahale etti.','%C topu kazandı.','%C hücumu kesti, top onda.'],
    tactic:['Taktik düzenleme yapılıyor.','Oyun temposu ayarlanıyor.','Savunma organizasyonu gözden geçiriliyor.','Set oyun kuruluyor.','Hücum düzeni yeniden kuruluyor.']
  }
};
/* İŞ 4: her spikerin şut havuzlarına ORTAK NÖTR (bölge-bağımsız, _NEAR/_MID içermez) ek
   kalıplar — yapısal çeşitliliği artırıp tek maçtaki tekrarı düşürür (patternReuse↓). */
(function(){
  const extra={
    score2:['%S skora iki yazdırdı. %SC','%S sakin bir bitirişle iki. %SC','%S iki sayıyı ekledi. %SC','%S net bir bitiriş, iki sayı. %SC','%S skoru büyüttü, iki. %SC'],
    miss2:['%S bu kez isabet yok.','%S fırsatı kullanamadı.','%S bitiremedi, top dışarı.','%S iki sayıyı bulamadı.','%S denemesi çemberden döndü.'],
    score3:['%S dıştan geçirdi, üç. %SC','%S dıştan isabetli, üç. %SC','%S yay ötesinden vurdu. %SC','%S dıştan tutturdu, üç. %SC'],
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
  'Çift çalımla rakibini yerinden etti —',
  'Yıldırım gibi ilk adımla dibe indi —',
  'Beklet-yükle ile savunmayı ters ayak yakaladı —',
  'Hesitasyon (bekletme) çalımıyla geçti —',
  'Çaprazdan sert bir çalım attı, savunma dağıldı —'
];
const REB_OFF_LINES=[
  '%R hücum ribaundunu çok yükseklerden çekti — ikinci şans bizde!',
  'Muhteşem ribaunt bloğu; %R rakibini uzakta tuttu, top yeniden bizde!',
  '%R camlara asıldı ve hücum ribaundunu kaptı!',
  '%R topu adeta tavandan indirdi, ekstra hücum!',
  '%R kaçan topu boyada avladı — ikinci şans!',
  '%R pota altında hükmetti, hücum ribaundu!',
  '%R sıçradı ve topu ikinci kez kazandı!',
  '%R rakibi arkasında bıraktı, top yine bizde!'
];
/* F13-1/F13-8: artık HER kaçan şutun ribaundu anlatıldığı için kısa, tekrar etmeyen bir
   havuz gerekiyor — renkli uzun kalıplar (yukarıdakiler) seyrek vurgular için saklandı.
   %R = ribaundu alan oyuncu · %T = hücum sırası geçen takım. */
/* F13-8: faul satırı TEK kalıba bağlıydı (bir maçtaki 11 faulün 11'i aynı cümle). Kuyruk
   havuzu satırı çeşitlendirir; ön ek (oyuncu + kişisel faul) her zaman aynı biçimde kalır. */
/* F13-6: çalma satırının ön eki — topu KAYBEDEN oyuncu her zaman söylenir. */
const STEAL_LOSS=[
  '%L pasını kontrol edemedi —',
  '%L topu elinden kaçırdı —',
  '%L pas hattını yanlış okudu —',
  '%L topu korumakta zorlandı —',
  '%L hatalı pas denedi —',
  '%L topu ortada bıraktı —'
];
/* F13-7: devre arası ve çeyrek sonu için ayrı kalıp setleri (tek cümle tekrarı yerine). */
const HALFTIME_LINES=[
  'İkinci yarı için soyunma odasında taktik konuşulacak.',
  'On beş dakikalık aranın ardından ikinci yarı başlayacak.',
  'Koçlar tahtayı çıkardı; ikinci yarı planı yapılıyor.',
  'Salon nefeslendi — ikinci yarıda tempo yükselir mi?',
  'Devre arası: kim daha iyi toparlarsa maçı o alır.'
];
const QEND_LINES=[
  'Taktik masasına dönülüyor.',
  'Kısa bir ara, oyuncular kenara geliyor.',
  'Koçlar son talimatları veriyor.',
  'Skor tabelası yenileniyor, oyun az sonra sürecek.',
  'Kenarda kısa bir değerlendirme yapılıyor.',
  'Tribün ayakta; oyun bir sonraki çeyrekte sürüyor.'
];
/* F13-7: yorgunluk satırları — "%P" yorulan oyuncu. */
/* ── §7.4b: TAKTİK ADI CÜMLEYE DOKUSAL YERLEŞİR ───────────────────────────────────────
   Eskiden taktik adı parantez içinde ekleniyordu: "Tempo kontrolü — doğru karar.
   (erken tempo)" — ekranda geliştirici notu gibi duruyordu. Artık cümlenin içine girer:
   "Erken tempoya geçtiler, doğru karar."
   ⚠ Taktik adları CİNS İSİMDİR — kesme işareti ALMAZ ("erken tempoya", "erken tempo'ya"
   değil). Bu yüzden turkEk() kullanılmaz; yönelme hâli tabloda hazır durur. */
const TAKTIK_ADI=[
  {ad:'ikili oyun',      e:'ikili oyuna'},
  {ad:'el presi',        e:'el presine'},
  {ad:'2-3 bölge',       e:'2-3 bölgeye'},
  {ad:'erken tempo',     e:'erken tempoya'},
  {ad:'yayılma hücumu',  e:'yayılma hücumuna'},
  {ad:'çift perde',      e:'çift perdeye'}
];
/* %K = yönelme hâli (erken tempoya) · %KN = yalın hâl (erken tempo).
   `devam:true` girişten sonra cümle SÜRER — spiker satırının ilk harfi küçülür.
   `devam:false` girişin kendisi bir cümledir; spiker satırı büyük harfle başlar. */
const TAKTIK_GIRIS=[
  {t:'%K geçtiler, ',        devam:true},
  {t:'%K döndüler, ',        devam:true},
  {t:'%K geçiş yapıldı, ',   devam:true},
  {t:'Kenardan işaret: %KN. ', devam:false},
  {t:'%KN devrede. ',        devam:false}
];
/* ── §7.3: SAAT REFERANSI ─────────────────────────────────────────────────────────────
   Ölçüm: 237 olayda saatten söz eden satır 2 taneydi (%0,8). Bu yüzden 4. çeyreğin son
   3 dakikası 1. çeyrekle BİREBİR aynı tonda akıyordu — gerilim hiç kurulmuyordu.
   Saat kapısı `scGate` ile aynı mantıkta çalışır: rastgele değil ANLAMLI anlarda açılır
   (çeyrek sonuna 2 dk / 30 sn kala, son çeyrekte fark ≤6). Dil, gerçek Türkçe maç
   anlatımının "süre" fiil bankasından gelir. Yalnız `pr` kullanır — sonuç değişmez. */
const SAAT_LINES=[
  'Süre daraldı.',
  'Hücum süresi noktalanıyor.',
  'Saat işliyor.',
  'Süreyi eritiyorlar.',
  'Saniyeler azalıyor.',
  'Saat daralıyor.',
  'Süre biterken geldi.',
  'Saat aleyhlerine çalışıyor.',
  'Zaman daralıyor.',
  'Saniyeler tükeniyor.',
  'Saati kullanıyorlar.',
  'Süre tükeniyor.'
];
/* Çeyrek kapanışı — her çeyreğin SON olayında saat mutlaka geçer (§7.3c). */
const SAAT_QSON=[
  'Çeyrek bitiyor.',
  'Süre bitiyor, son şans.',
  'Saat sıfıra gidiyor.',
  'Çeyrek kapanıyor.'
];
/* ── §7.3b: SON BÖLÜM TONU (4. çeyrek son 3 dakika) ──────────────────────────────────
   Mevcut satırların YERİNE değil YANINA gelir; havuz daralmaz. */
const SON_BOLUM={
  gergin:[
    'Kritik an geldi.',
    'Bu top belirleyici olacak.',
    'Savunma dikildi.',
    'Salon nefesini tuttu.',
    'Her şey buna bağlanıyor.',
    'Tansiyon yükseldi.',
    'Kimse oturmuyor.'
  ],
  yatismis:[
    'Maç koptu.',
    'Fark açıldı.',
    'Skor tabelası konuştu.',
    'İş bitti sayılır.',
    'Kalan süre yetmez.'
  ]
};
/* ── FAZ 34 §6: UZMANLIK VE GECELİK FORM ANLATIMI ──────────────────────────────
   Rakam yükselip sahada karşılığı olmazsa süs olur. Anlatım bu oyuncuları TANIR ama
   ROZET YAZMAZ (brif §2.3/§6): "Ribaund Canavarı" gibi bir etiket YOK, yalnız doğal
   cümle. Tetikleme maç içi BİRİKİME bağlıdır (3. ribaunt, 2. çalma…), her olayda
   tekrarlamaz; cooldown ile ardışık tekrar engellenir. */
const UZMAN_RIBAUND=[
  'Camı kimseye bırakmıyor.',
  'Pota altı bu akşam onun.',
  'Her sekeni okuyor.',
  'Ribaunt bölgesinde tek başına hüküm sürüyor.',
  'Rakip uzunlar onunla baş edemiyor.',
  'Camı kapatıyor, ikinci şans vermiyor.',
  'Cam onun tekelinde.'
];
const UZMAN_CALMA=[
  'Pas yollarını okuyor.',
  'Eli çok çabuk.',
  'Rakip ona bakarak pas atmaya korkuyor.',
  'Her pasın önünde o var.',
  'Elleri her yerde.',
  'Topu görmesi yetiyor.',
  'Pasa uzanan eli hep bir adım önde.'
];
const UZMAN_BLOK=[
  'Kimse üstünden atamıyor.',
  'Yükselen her topa ulaşıyor.',
  'Kolları sanki iki metre daha uzun.',
  'Her şutun önüne bir el çıkıyor.',
  'Zamanlaması kusursuz.',
  'Ne mesafeden olursa olsun ulaşıyor.',
  'Şut atmadan önce iki kere düşünmek gerekiyor.'
];
const FORM_SICAK=[
  'Bu akşam durdurulamıyor.',
  'Eli çok sıcak.',
  'Ne atsa giriyor.',
  'Bu gece onun gecesi.',
  'Kendine olan güveni tavan yapmış.',
  'Potayı deniz gibi görüyor.',
  'Sıcaklığı sürüyor.'
];
const FORM_SOGUK=[
  'Bu akşam tutturamıyor.',
  'Eli bir türlü ısınmadı.',
  'Bugün ritmini bulamıyor.',
  'Gecenin ona göre gitmediği belli.',
  'Denemeye devam ediyor ama olmuyor.',
  'Şutları bu akşam kısa kalıyor.'
];
const FATIGUE_LINES=[
  '%P nefes nefese kaldı, bacakları ağırlaşıyor — kenar değişiklik düşünüyor.',
  '%P dizlerine yaslandı; enerjisi düşüyor.',
  '%P ter içinde, tempoya yetişmekte zorlanıyor.',
  '%P yorgun görünüyor — dinlenmesi gerekebilir.',
  '%P son pozisyonlarda geriden geldi; kondisyonu sınırda.'
];
const FOUL_TAIL=[
  'Oyun yandan devam ediyor.',
  'Oyun yandan sokmayla sürüyor.',
  'Hakem düdüğü çaldı, top yandan.',
  'Faul verildi; top çizgi dışından oyuna giriyor.',
  'Kısa bir duraklama oldu, top yandan giriyor.',
  'Sert mücadele — hakem faulü gördü.'
];
/* F13-8: değişiklik ve çeyrek başı satırları tek kalıba bağlıydı (20 maçta 99 ve 80 tekrar). */
/* İŞ 6.3: TEK STANDART — önce ÇIKAN, sonra GİREN. Eski havuzda sıra kalıptan kalıba
   değişiyor ve "X için Y kenara geliyor" gibi okunmaz biçimler vardı. */
const SUB_LINES=[
  '🔄 %T değişiklik: %O kenara geliyor, yerine %I girdi.',
  '🔄 %O %W kenara geliyor, yerine %I girdi.',
  '🔄 %T kenardan müdahale: %O çıkıyor, %I giriyor.',
  '🔄 Rotasyon %T{de}: %O kenara geliyor, %I sahaya.',
  '🔄 %O soluklanmaya gidiyor, yerine %I girdi.',
  '🔄 %T beşliyi tazeliyor: %O çıktı, %I girdi.'
];
const QSTART_LINES=[
  '🔔 %Q. çeyrek başladı',
  '🔔 %Q. periyot için düdük çaldı',
  '🔔 %Q. çeyrek oyunu başlıyor',
  '🔔 Top yeniden oyunda — %Q. çeyrek',
  '🔔 %Q. çeyreğin ilk hücumu kuruluyor',
  '🔔 Salon yerinde: %Q. çeyrek başlıyor'
];
const REB_DEF_SHORT=[
  '%R ribaundu topladı, hücum sırası %T{de}.',
  'Cam %R{de}; top %T{e} geçiyor.',
  '%R savunma ribaundunu aldı.',
  'Top %R{in} elinde — %T hücuma çıkıyor.',
  '%R ribaundu çekti ve topu yukarı taşıyor.',
  'Rakibini arkada tuttu, ribaund %R{de}.',
  '%R camı kapattı, sıra %T{de}.',
  'Kaçan şutu %R indirdi.',
  '%R yükseldi, ribaund onda.',
  'Top %R{e} düştü; %T topu yukarı çıkarıyor.',
  '%R rakibi arkasında tuttu ve ribaundu aldı.',
  'Savunma ribaundu %R{de}.',
  '%R camdan döneni topladı.',
  'Ribaund %R — hücum %T{e} geçti.',
  '%R topu güvene aldı.',
  'Pota altı %R{in}; top %T{de}.',
  '%R kaçan şutu kontrol etti.',
  '%R temiz bir ribaundla camı kapattı.',
  'Top %R{de} kaldı, %T hücuma dönüyor.'
];
const REB_OFF_SHORT=[
  '%R hücum ribaundunu aldı — %T{de} ikinci şans!',
  'Top yine %T{de}; ribaund %R{in}.',
  '%R kaçan topu boyada topladı, hücum sürüyor.',
  'İkinci şans %T{de} — ribaund %R.',
  '%R camdan döneni aldı, atak devam ediyor.',
  'Hücum ribaundu %R{de}; %T bir daha deneyecek.',
  '%R ısrar etti, top yine %T{de}!',
  'Pota altında %R kazandı — ikinci şans.',
  '%R kaçan şutu geri aldı, hücum sürüyor.',
  '%R camlara asıldı; top %T{de} kalıyor.',
  'İkinci top %R{in} — %T yeniden kuruyor.',
  '%R hücum camını kapattı.'
];
const REB_DEF_LINES=[
  '%R savunma ribaundunu güçlü aldı, cam tertemiz!',
  'Sağlam ribaunt bloğu; %R ribaundu topladı.',
  '%R yükseldi ve defansif camı kapattı.',
  '%R ribaundu çekti, hızlı geçişe çıkıyor!',
  '%R camı süpürdü, top güvende.',
  '%R pozisyonu tuttu ve ribaundu aldı.',
  '%R rakibi bloklayıp topu topladı.',
  '%R defansif ribaundu kaptı, hücuma dönüyor.'
];
/* Anlatım-geometri tutarlılığı: yakın mesafe (turnike/smaç/pota altı) kalıpları yalnız
   pota dibindeki şutlarda, orta mesafe kalıpları yalnız uzak şutlarda kullanılır. */
/* F13-9: köşe ifadeleri — yalnız corner3 bölgesinde kullanılır. */
const _CORNER_WORDS=/köşe/i;
/* Ortak köşe üçlüğü havuzu (F13-8): filtre sonrası spiker havuzuna eklenir. */
const CORNER3_MADE=[
  '%S köşede boştu, üçlük file! %SC',
  '%S köşeden tetiği çekti — üç sayı! %SC',
  '%S dip köşeden vurdu, üçlük! %SC',
  '%S köşede ayakları hazırdı; üç! %SC',
  '%S köşe üçlüğünü tereddütsüz attı. %SC',
  '%S köşeden soğukkanlı — üç sayı. %SC',
  'Kısa köşeden %S, üçlük içeride! %SC',
  '%S köşede unutuldu ve cezasını kesti — üç! %SC'
];
const CORNER3_MISS=[
  '%S köşeden denedi, olmadı.',
  '%S köşe üçlüğünü kısa bıraktı.',
  '%S dip köşeden ıskaladı.',
  '%S köşede açıktı ama file dalgalanmadı.',
  '%S köşe şutu çemberden döndü.',
  '%S köşeden zorladı, girmedi.',
  'Köşe üçlüğü %S için bugün gelmiyor.',
  '%S köşeden attı — pota izin vermedi.'
];
const _NEAR_WORDS=/turnike|pota altı|potaya asıldı|boyalı alan|dibe|smaç|smac|pota ile anlaştı|potaya "merhaba"/i;
const _MID_WORDS=/orta mesafe|jump shot|uzaktan|kısa kaldı/i;
/* ── FAZ 26 §1: ŞUT TİPİ SÖZCÜKLERİ ──
   Bölge süzgeci (_NEAR/_MID) "yakın mı uzak mı" sorusunu çözüyordu ama yakın şutların
   ÜÇÜ DE aynı havuzdan besleniyordu: turnikede "potaya asıldı", smaçta "turnikeyi
   tamamladı" çıkabiliyordu. Tip artık kendi sözcüklerini seçer.
   ⚠ Üç küme AYRIK olmalı — bir satır iki kümeye birden girerse süzgeç onu her tipte
   eler ve havuz boşalır (o durumda süzgeç kendini iptal eder, aşağıdaki `f.length`). */
/* ⚠ İKİ DİLLİ: `localizeCatalogs()` havuzları EN modunda YERİNDE çevirir; yalnız Türkçe
   arayan bir süzgeç EN'de hiç eşleşmez ve tip ayrımı sessizce kaybolur (i18n dersi). */
const _DUNK_WORDS=/smaç|smac|potaya asıldı|çemberi salla|çemberi parçala|çember titredi|boyalı alanı yıktı|canavar gibi|yukarıdan bastır|çakmak istedi|üstünden çaktı|dunk|slam|throws it down|hangs on the rim|tears through the paint|beast down low/i;
const _LAYUP_WORDS=/turnike|layup/i;
const _FLOAT_WORDS=/kavis|havada asılı bırak|parmak ucu|floater|floats it|hangs it up in the air|fingertips|teardrop/i;
/* FAZ 28 §2: iki yeni sınıf. Kanca posttaki uzunun omuz üstü şutu, tip-in ise hücum
   ribaundunun havada tek dokunuşla tamamlanmasıdır; ikisinin de kendi dili vardır. */
const _HOOK_WORDS=/kanca|omzunun üstünden|hook shot|over his shoulder/i;
const _TIPIN_WORDS=/sekeni havada|havada yakala|tek dokunuşla|havada çevirip|ribaundunu havada|şansı havada|tip-in|tips it in|catches it in the air|one touch/i;
/* Sınıf → kendi sözcükleri. Kümeler AYRIK olmalı: bir satır iki kümeye birden girerse
   süzgeç onu her tipte eler ve havuz boşalır. `anlatim-check` ayrıklığı sınar. */
const _SUT_WORDS={smac:_DUNK_WORDS,turnike:_LAYUP_WORDS,floater:_FLOAT_WORDS,kanca:_HOOK_WORDS,tipin:_TIPIN_WORDS};
/** Şut tipine uymayan betimleri havuzdan eler; hiç satır kalmazsa süzgeç uygulanmaz.
    Tipe ait satır varsa ÖNCE onlar kullanılır (smaç smaç diliyle anlatılsın); yoksa
    en azından YANLIŞ tip iddiası taşıyanlar elenir. */
function _sutSuz(pool,sut,kind){
  if(!sut||!Array.isArray(pool)||!pool.length) return pool;
  const kendi=_SUT_WORDS[sut]||null;
  /* Sınıfın kendi havuzu spikerin satırlarına EKLENİR — üslup kaybolmasın. */
  let havuz=pool;
  try{
    const ek=(typeof SUT_LINES!=='undefined'&&SUT_LINES[sut]&&kind)?SUT_LINES[sut][kind]:null;
    if(ek&&ek.length) havuz=pool.concat(ek);
  }catch(e){}
  if(kendi){
    const f=havuz.filter(t=>kendi.test(t));
    if(f.length) return f;
  }
  /* Tipin kendi dili yoksa (jumper / uc) ya da havuzda hiç yoksa: diğer sınıfların
     dilini taşıyan satırlar elenir. */
  const f2=havuz.filter(t=>{
    for(const k in _SUT_WORDS){ if(k!==sut&&_SUT_WORDS[k].test(t)) return false; }
    return true;
  });
  return f2.length?f2:havuz;
}
function spikerLine(spId,kind,v){
  const set=SPIKER_LINES[spId]||SPIKER_LINES.reha;
  let pool=set[kind]||SPIKER_LINES.reha[kind]||[''];
  v=v||{};
  /* Şut sınıfı verilmişse (score2/miss2) uyumsuz betimleri havuzdan ele. */
  if(v.cls&&(kind==='score2'||kind==='miss2')){
    const f=pool.filter(t=>v.cls==='yakin'?!_MID_WORDS.test(t):!_NEAR_WORDS.test(t));
    if(f.length) pool=f;
    pool=_sutSuz(pool,v.sut,kind);   /* FAZ 26 §1 · FAZ 28 §2: sınıf dili */
  }
  /* %SC (skor) önce değiştirilmeli; yoksa %S onun içindeki "%S"i yiyip skoru "AdC"ye çevirir. */
  return adKoy(ch(pool),{SC:v.sc,S:v.s,B:v.b,C:v.c});
}

/* ══ Faz 1-3 (23. oturum): tek "play" tanımlayıcısı + bağlam + anti-tekrar anlatım ══
   Amaç: spikerin söylediği sahada birebir yaşansın, cümleler tekrara düşmesin, bağlam
   (seri/fark/sıcaklık/kritik an) anlatıma yansısın. SUNUM KATMANIDIR — maç sonucu
   matematiği DEĞİŞMEZ: tüm anlatım/senaryo rastgeleliği ayrı, deterministik bir üreteçten
   (`pr`, generateMatchEvents içinde) beslenir; sonuç randomu global Math.random'da kalır. */
function _mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Şut bölgesi GERÇEK şut noktasından (çember uzaklığı+açı) türetilir → metin, iz ve
   animasyon aynı yeri gösterir. 3'lük: köşe/kanat/tepe; 2'lik: pota dibi/boya/orta mesafe. */
/** F13-10: DEVRE ARASINDA SAHA DEĞİŞİMİ. Dört çeyrek boyunca aynı potaya hücum ediliyordu
    (124 şutun 124'ü tek yönde) — basketbol izleyen herkesin ilk fark edeceği hata. Gerçek
    kural: 1-2. çeyrek bir yön, 3-4. çeyrek (ve uzatmalar, 2. yarı yönüyle) ters yön.
    `userIsHome` bayrağı bilinmiyorsa (eski çağrı) ev sahibi sola hücum eder varsayılır. */
function offLeftAtQ(userPos,q,userIsHome){
  const uih=(userIsHome===undefined)
    ? ((typeof mState!=='undefined'&&mState&&mState.userIsHome!==false))
    : !!userIsHome;
  const ilkYari=(uih===!!userPos);      /* 1-2. çeyrekte kullanıcı ev sahibiyse sola hücum */
  return (Number(q)>=3)?!ilkYari:ilkYari;
}

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
/* §7.4a + §7.4c: hamle önekleri hem UZUNDU (5-8 kelime, şut cümlesini 27 kelimeye
   çıkarıyordu) hem de parantez içinde İngilizce terim taşıyordu — "(crossover)",
   "(spin move)", "(step-back)". Gerçek anlatımın birimi 2-5 kelimelik parçadır;
   önekler o ölçüye çekildi ve parantezli glosler kaldırıldı. Uzun biçimler
   TAMAMEN silinmedi, her anahtarda en az bir "geniş" varyant duruyor. */
const MOVE_BY={
  crossover:['Çalımla geçti —','Çaprazdan sıyrıldı —','Art arda çalım, savunma dağıldı —'],
  stepback:['Geriye çekildi —','Bir adım geri, alan açıldı —','Arasına mesafe koydu —'],
  spin:['Dönerek sıyrıldı —','Etrafında döndü —'],
  hesitation:['Bekletti ve geçti —','Ters ayak yakaladı —'],
  drive:['Dibe indi —','Boyalı alana daldı —','İlk adımla yüklendi —'],
  postup:['Sırtını döndü —','Postta sırtladı —','Düşük postta pozisyon aldı —']
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
  /* FAZ F: satır içi anlatım havuzları (fonksiyon gövdesinde tanımlı diziler) da
     sözlükten geçer; %S/%B/%C yer tutucuları yerine konmadan ÖNCE çevrildiği için birebir eşleşir. */
  /* §7.4b: havuzlar artık nesne de taşıyabiliyor (TAKTIK_GIRIS: {t, devam}).
     Çeviri YALNIZ dizgelere uygulanır; nesneye t() çağrılırsa "[object Object]" çıkar. */
  return (typeof pick==='string'&&typeof t==='function')?t(pick):pick;
}
/** §7.1: şablondaki adları yerine koyar.
 *  ÖNCE `%X{durum}` çekim ekli yer tutucular (turkEk), SONRA düz `%X`.
 *  Sıra önemli: düz değiştirme önce yapılırsa "%R{e}" içindeki %R adla dolar ve
 *  geriye çözülemeyen "Ömer Polat{e}" kalır. */
function adKoy(txt,map){
  try{
    let out=(typeof turkEkUygula==='function')?turkEkUygula(txt,map):String(txt==null?'':txt);
    /* Anahtarlar UZUNDAN KISAYA: '%SC' önce gelmezse '%S' onun içindeki S'yi yer ve
       skor 'AdC'ye dönüşür (F14-1'de bir kez yaşandı). */
    Object.keys(map||{}).sort((x,y)=>y.length-x.length).forEach(k=>{
      out=out.split('%'+k).join(map[k]==null?'':String(map[k]));
    });
    return out.replace(/\s+([.!?,;])/g,'$1').replace(/\s{2,}/g,' ').trim();
  }catch(e){ return String(txt==null?'':txt); }
}
/* ── FAZ 36 §B8: VİRGÜLDEN SONRA BÜYÜK HARF ───────────────────────────────────────
   Asist öneki ("Juárez topu kenara aktardı, ") ile şut cümlesi ("Kısa köşeden Süleyman
   Demirel, üçlük içeride!") birleşince ikinci parçanın baş harfi büyük kalıyordu.
   Virgülle biten önek CÜMLEYİ SÜRDÜRÜR — gövdenin ilk harfi küçülür. Noktalı virgül
   ya da nokta ile biten önekte cümle biter, harf büyük kalır.
   ⚠ Özel ad (oyuncu/takım adı) ile başlayan gövdeye DOKUNULMAZ; ölçüt, ilk sözcüğün
   havuz metninden gelen bir CİNS sözcük olmasıdır — özel adlar `%S`/`%A` ile sonradan
   yerleşir, bu yüzden burada ilk sözcük büyük harfli iki+ harfli bir ADSA korunur.
   Türkçe küçük harf zorunlu: İ→i, I→ı (trKucuk). */
function _birlestir(on,govde,korunan){
  const o=String(on||''), g=String(govde||'');
  if(!o||!g) return o+g;
  if(!/,\s*$/.test(o)) return o+g;
  const ilk=g.split(/\s+/)[0]||'';
  /* Yer tutucudan gelen özel ad (ör. "%S") ya da simge ile başlıyorsa dokunma. */
  if(/^[%\d🔥⚡]/.test(g)) return o+g;
  /* ÖZEL AD KORUMASI: gövde oyuncu/takım adıyla başlıyorsa küçültme (Türkçede özel ad
     cümle ortasında da büyük harfle yazılır). Adlar çağıran taraftan gelir — metinden
     "büyük harfli sözcük" diye tahmin etmek her cins sözcüğü de korur ve kapı işlemez. */
  if(korunan) for(const ad of korunan){
    if(!ad) continue;
    const ilkAd=String(ad).trim().split(/\s+/)[0];
    if(ilkAd&&ilk.replace(/[^\p{L}'’]/gu,'')===ilkAd) return o+g;
  }
  /* TAMAMI büyük harf (vurgu: "SMACI ÇAKTI") korunur. */
  if(ilk.length>1&&ilk===_trUst(ilk)) return o+g;
  const k=(typeof trKucuk==='function')?trKucuk(g.charAt(0)):g.charAt(0).toLowerCase();
  return o+k+g.slice(1);
}
function _trUst(s){ try{ return String(s).replace(/i/g,'İ').replace(/ı/g,'I').toUpperCase(); }catch(e){ return String(s).toUpperCase(); } }
/* İŞ 4: asist ibareleri şemayla uyumlu ve ÇEŞİTLİ (eski monoton "X buldu; Y…" bitti). */
/* ── F14-2: ZİNCİR ANLATIM ────────────────────────────────────────────────────────────
   Gerçek Türkçe basketbol anlatımının temel birimi 2-5 kelimelik bir parçadır
   ("Cedi güçlü gitti." / "Marilonis yüklendi." / "İsabetli."). Mevcut sistem her olay
   için tek, 6-10 kelimelik uzun cümle üretiyordu; ritim yoktu. 356 spiker cümlesi
   KORUNUR — pozisyonların bir kısmı artık bu kısa parçalı ritimle anlatılır.
   ⚠ Kısa çekirdekler bölge filtresinden (_NEAR_WORDS/_CORNER_WORDS) GEÇMEZ; bu yüzden
   içlerinde mesafe/bölge iddiası olan kelime BULUNMAMALI (köşe, boyalı alan, orta
   mesafe, yay dışı…). FAZ 13'te düzeltilen "söz ile saha çelişmesi" tekrarlamasın. */
const AKIS_ON={
  gelis:  ['%S geldi.','%S topu aldı.','%S tempoyu kurdu.','Topu %S kullanıyor.','%S ilerletiyor.','%S rakip yarı sahaya geçti.'],
  perde:  ['Perde geldi.','%S perdeden çıktı.','Yüksek perde kuruldu.','Perde arkasından %S çıktı.','İkili oyun geldi.','%S perde istedi.'],
  /* §7.5: 'sırtını döndü' / 'adamını sırtladı' POST OYUNU iddiasıdır ve zincir bölge
     filtresinden geçmediği için spotup/pnr/cut pozisyonlarında da çıkıyordu. Bölge ve
     şema iddiası taşımayan karşılıklarla değiştirildi (F13-9 ile aynı hata sınıfı). */
  eslesme:['%S eşleşmeyi buldu.','%S pozisyon aldı.','%S adamını okudu.','%S üstünlüğü buldu.','%S pozisyonu istedi.'],
  yuklen: ['%S yüklendi.','%S daldı içeriye.','%S çembere gitti.','%S kat etti.','%S süratlendi.','%S dişini gösterdi.']
};
/* Kısa çekirdekler: zincir modunda uzun spiker cümlesinin yerini alır. */
const KISA_CEKIRDEK={
  score2:['İsabet buldu.','Bitirdi.','İki sayıyı yazdırdı.','Basketi buldu.','Tutturdu.','Sayıyı buldu.','Kolay bitirdi.'],
  score3:['Üçlük içeride.','Üçlüğü tutturdu.','Bombayı bıraktı, girdi.','Cezayı kesti.','Üçlük geldi.'],
  miss2: ['İsabet bulamadı.','Kaçırdı.','Olmadı.','Kısa kaldı.','Çemberden döndü.','Demire takıldı.'],
  miss3: ['Üçlük kaçtı.','İsabet bulamadı.','Fileye değmedi — hava atışı.','Demire takıldı.','Uzun kaldı, arka demire çarptı.']
};
/* FAZ 26 §1: zincir çekirdekleri tip-nötrdü ("Bitirdi."), yani hızlı ritimli anlatımda
   smaç ile turnike hiç ayrışmıyordu. Tipi olan şutlarda önce bu havuz denenir; yoksa
   nötr çekirdeğe düşülür (çeşitlilik korunur, F25 §7.2 dersi). */
const KISA_CEKIRDEK_SUT={
  smac:{ score2:['Smaçladı.','Çemberi salladı.','Yukarıdan bastırdı.','Smaçla bitirdi.'],
         miss2:['Smacı çember reddetti.','Smaçta çembere takıldı.'] },
  floater:{ score2:['Yumuşak kavisle bitirdi.','Kavisi tutturdu.','Havada asılı bıraktı.'],
            miss2:['Kavisi kısa kaldı.','Kavisi uzun bıraktı.'] },
  turnike:{ score2:['Turnikeyi tamamladı.','Camdan yumuşak bıraktı.','Turnikeyi geçirdi.'],
            miss2:['Turnikede tökezledi.','Turnikesi çemberden döndü.'] },
  kanca:{ score2:['Kancayı kullandı.','Omzunun üstünden gönderdi.','Kancayı geçirdi.'],
          miss2:['Kancası çemberden döndü.','Kancayı uzun bıraktı.'] },
  tipin:{ score2:['Sekeni havada aldı.','Havada yakalayıp bıraktı.','Tek dokunuşla soktu.'],
          miss2:['Havada yakaladı, olmadı.','Tek dokunuşla denedi.'] }
};
/* ── FAZ 28 §2: ŞUT SINIFI İFADE HAVUZU ──
   Sorun: şut tipleri (FAZ 26) eklenirken yazılan ifadeler Türkçe basketbol diline
   oturmuyordu — "servisini yaptı" (voleybol terimi), "demire geldi", "turnike dönmedi",
   "smacı tutmadı" gibi deyim olmayan kalıplar canlıda görüldü. Ayrıca sınıf başına
   yalnız 3-4 ifade vardı, aynı cümle maç içinde tekrar ediyordu.
   Bu havuz spikerin KENDİ satırlarına EKLENİR (üslup kaybolmasın diye onların yerini
   almaz); `_sutSuz` tipe uyanları birleştirir. Sınıf başına ≥8 ifade zorunludur —
   `tools/anlatim-check.js` sayar. */
/* ── FAZ 36 §A1: ŞUT ANLATIMI İKİ BEAT ────────────────────────────────────────────
   Şutun TAMAMI (deneme + sonuç) tek cümlede ve top çembere varınca basılıyordu; hücum
   koreografisi boyunca (ölçüldü: üçlükte 7,2 sn) anlatım tamamen susuyor, sonra tek
   pakette dökülüyordu. Gerçek yayında anlatım şutla birlikte akar: top elden çıkarken
   "çekti", çemberden geçerken "içeride!".
   Bu havuz TOP ELDEN ÇIKTIĞI an basılan kısa ön parçadır (ev.preText); sonuç parçası
   (ev.text) eskisi gibi çember anında basılır. SONUCU ELE VERMEZ.
   ⚠ Yalnız `pr` tüketir (F13-3). */
/* ══ FAZ 37 §3-§4: İKİ BEAT ANLATIM — KURULUM / EYLEM / SONUÇ HAVUZLARI ══════════════
   FAZ 36'da şut anlatımı iki beat'e bölündü ama İÇERİK yanlış yerdeydi: ön parça yalnız
   "şutu bıraktı" diyor, kurulum/çalım/asist ise SONUÇ beat'inde geliyordu. Yani izleyici
   önce şutu, sonra şuta giden hamleyi duyuyordu (kronoloji ters — §2.3/1).
   Yeni bölüşüm:
     preText (top elden çıkarken) = [bağlam] + [kurulum/şema] + [asist] + ŞUTÖR + [şut eylemi]
     text    (top çemberde)       = [sonuç çekirdeği] + [skor] + [imza] + [saat/ton]
   İki beat TEK CÜMLENİN İKİ YARISIDIR: `chain:true` ile aynı balonda birleşir.
   ⚠ Bölge/tip iddiası ARTIK EYLEM beat'indedir (kurulum ve sonuç çekirdekleri bölge-nötr
     yazılır) — §4.5 tutarlılığı böylece tek yerden sağlanır.
   ⚠ Yalnız `pr` kullanılır (F13-3). */

/* Kurulum/şema ibaresi — şemaya göre. Tire ile biter, cümle devam eder. AD İÇERMEZ. */
const SUT_KURULUM={
  spotup:['Top zayıf tarafa aktarıldı —','Top dış çevrede dolaştı —','Aktarma pasıyla top kenara geçti —',
          'Pas trafiği çözüldü, top dış çevrede —','Savunma toparlanamadan top kenara döndü —',
          'Elden ele pasla top yay dışına çıktı —'],
  pnr:['Yüksek perde geldi, savunma geçiş yapmadı —','İkili oyunda perdeci potaya devrildi —',
       'Perde kuruldu, savunmacı arkadan dolaştı —','Perde sonrası savunma iki adım geride —',
       'İkili oyun açıldı, savunma kararsız kaldı —','Perdeden sıyrılıp topla ilerledi —'],
  cut:['Zayıf taraftan kesme geldi —','Dip çizgi boyunca kesti —','Elden ele pasla topu aldı —',
       'Savunmanın arkasından boşluğa koştu —','Perdenin arkasından boşa çıktı —',
       'Kesme zamanlaması kusursuzdu —'],
  postup:['Postta sırtı dönük çalışıyor —','Düşük postta pozisyon aldı —','Postta topu istedi ve aldı —',
          'Sırtını dönüp savunmacıyı yokladı —','Boyanın kenarında pozisyonunu kurdu —',
          'Postta omuz teması, alanını açtı —'],
  iso:['Teke tek kaldı, kimse yardıma gelmedi —','Alanı temizlediler, hücum başlıyor —',
       'Savunmacısıyla baş başa kaldı —','Alanı boşalttılar, teke tek —',
       'Topu alıp savunmacısını karşısına aldı —','Yalnız kaldı, kendi çözecek —'],
  transition:['Geçiş hücumunda sayı üstünlüğü var —','Kulvarlar doldu, hızlı çıkıyorlar —',
              'Savunma toparlanamadı, önde koşan var —','Top hızla karşı yarı sahaya taşındı —',
              'Sayı üstünlüğü kuruldu —','Geri dönüş savunması geç kaldı —'],
  putback:['Hücum ribaundu alındı, top yeniden yukarıda —','İkinci şans doğdu —',
           'Kaçan top boyada geri alındı —','Ribaunt mücadelesini kazandılar —',
           'Top bir kez daha çembere geliyor —','Boyada ikinci top kazanıldı —'],
  def:['Top çevrede, hücum kuruluyor —','Hücum yerine oturdu —','Top çevrede dolaşıyor —',
       'Savunma dizildi, hücum çözüm arıyor —','Pas trafiği başladı —','Top yay dışında dolaştı —']
};
/* Şut saati baskısı — kurulumun yerine geçebilen, gerilim taşıyan giriş. */
const SUT_KURULUM_SAAT=['Şut saati eriyor, bitirmek zorundalar —','Şut saati son saniyelerinde —',
  'Süre bitiyor, bir çözüm bulmak zorundalar —','Şut saati düdüğü yaklaştı —'];

/* Şut eylemi — ŞUTÖRÜN ADIYLA biter beat. Tip/bölge iddiası BURADADIR (§4.5). */
const SUT_EYLEM={
  uc:{
    corner3:['%S kısa köşede ayakları hazır, bıraktı.','%S dip köşeden tetiği çekti.',
             '%S köşede boştaydı, duraksız çekti.','%S köşeden yay ötesine kuruldu ve bıraktı.',
             '%S kısa köşeden gelen paslı bıraktı.','%S köşede kimse kapamadı, çekti.'],
    wing3:['%S kanattan yay ötesine kuruldu.','%S 45 dereceden ritim şutunu çıkardı.',
           '%S kanattan dengesini bozmadan bıraktı.','%S kanattan gelen paslı, duraksız çekti.',
           '%S kanattan geriye çekilip alan açtı ve bıraktı.','%S kanattan savunmacının eli üstünde denedi.'],
    top3:['%S yayın tepesinden bıraktı.','%S yayın tepesinde ayakları kare, çekti.',
          '%S tepeden geriye çekilip bıraktı.','%S yayın tepesinden gelen paslı çekti.',
          '%S tepeden zor pozisyondan denedi.','%S yay ötesinden kuruldu ve gönderdi.']
  },
  turnike:['%S turnikeyi camdan bıraktı.','%S çembere yükselip turnikeye gitti.','%S turnikeyi camdan denedi.',
           '%S dibe inip turnikeye kalktı.','%S savunmacının üstünden turnikeyi denedi.',
           '%S çemberin altından sıyrılıp turnikeye gitti.'],
  smac:['%S smaç için havalandı.','%S boyaya dalıp smaça kalktı.','%S savunmanın üstünden smaça gitti.',
        '%S çembere yüklendi, smaç geliyor.','%S smaç niyetiyle yükseldi.','%S potaya yüklendi, smaça kalktı.'],
  floater:['%S uzunların üstünden kavisi tercih etti.','%S boyada yumuşak kavisi bıraktı.',
           '%S parmak ucundan kavisli bıraktı.','%S boyanın ortasından kavisi denedi.',
           '%S uzunlara kaptırmadan kavisi seçti.','%S havada asılı kalıp kavisi bıraktı.'],
  kanca:['%S omzunun üstünden gönderdi.','%S postta kancaya döndü.','%S sırtı dönük kancayı denedi.',
         '%S boyada kancaya kalktı.','%S kancayı savunmanın üstünden bıraktı.','%S dönüp kancasını çıkardı.'],
  jumper:['%S dengesini bozmadan bıraktı.','%S geriye çekilip alan açtı ve bıraktı.',
          '%S orta mesafede ayakları kare, çekti.','%S duraklayıp orta mesafeden bıraktı.',
          '%S savunmacının eli üstünde, zor pozisyondan denedi.','%S orta mesafede ritim şutunu çıkardı.'],
  tipin:['%S sekeni havada tuttu ve bıraktı.','%S kaçan topu havada çevirdi.',
         '%S tek dokunuşla çembere yolladı.','%S havada yakalayıp bıraktı.',
         '%S sekene ilk uzanan oldu.','%S topa havada dokundu.'],
  def:['%S şutunu bıraktı.','%S çembere gönderdi.','%S denemesini yolladı.',
       '%S kalkıp bıraktı.','%S şutuna yükseldi.','%S topu çembere yolladı.']
};

/* SONUÇ ÇEKİRDEĞİ — chain ile önceki beat'e bağlanır, KÜÇÜK harfle başlar, ÖZNE İÇERMEZ
   ama YÜKLEM taşır (§4.4). Bölge/tip iddiası YOKTUR (§4.5).
   Spiker kişiliğine göre dağıtılır; ortak havuz + kişilik eki (her spiker ≥16 kalıp). */
const SUT_SONUC={
  ortak:{
    isabet:['fileyi buldu!','tereddütsüz fileye gitti.','temiz, file bile sallanmadı.',
            'camdan yumuşak dönüp içeri düştü.','çemberi doldurdu!','içeri düştü.',
            'file dalgalandı.','çember izin verdi, sayı geldi.','sayıyı yazdırdı.',
            'tam ortasından geçti.','çembere hiç değmeden geçti.','fileden aşağı süzüldü.',
            'çemberi yalayıp içeri düştü.','arka demirden içeri döndü.','file sesi geldi.',
            'tam isabetle indi.','çemberden içeri süzüldü.','iki takım da durdu — sayı geldi.',
            'çemberin ortasını buldu.','file boyun eğdi.','tam doğru zamanda içeri düştü.',
            'skoru değiştirdi, içeride.','sayıyı getirdi, tribün ayakta.','çember misafirini kabul etti.'],
    kacan:['ön demire çarptı.','arka demirden döndü.','kısa kaldı.','çemberi turlayıp çıktı.',
           'fileye değmedi, hava atışı oldu.','savunmanın eli değdi, yörünge bozuldu.',
           'çemberden döndü.','uzun kaldı, arka demire çarptı.','demire çarpıp dışarı çıktı.',
           'tutmadı.','çembere takıldı.','yay çok yüksek kaldı, girmedi.','çember geri çevirdi.',
           'demirden sekti, girmedi.','file hiç dalgalanmadı, kaçtı.','hedefi bulmadı.',
           'çemberin kenarından sıyırdı.','içeri girmedi, ribaunt mücadelesi başladı.',
           'çember bu kez kapalıydı.','yörünge kısa kaldı.','demire vurup çıktı.',
           'top potadan uzaklaştı, isabet yok.','şans yaver gitmedi, girmedi.','içeri düşmedi.']
  },
  cosku:{ isabet:['ve fileye gömüldü!','fileyi paramparça etti!','tribün ayakta, sayı geldi!',
                  'tam istediği gibi düştü!','çember bunu geri çeviremedi!','salon yıkıldı!',
                  'işte bu, içeri düştü!','file yerinden oynadı!','salonu ayağa kaldırdı!',
                  'çember teslim oldu!','bunu kimse durduramazdı!','muhteşem, içeri girdi!'],
          kacan:['ama olmadı!','çember bu kez acımadı!','demire takıldı, yazık!','salon sustu — girmedi.',
                 'kaçtı, tribün inledi.','tutturamadı!','çember izin vermedi!','yazık, girmedi!',
                 'demir çok sert vurdu!','salon nefesini tuttu, girmedi.'] },
  bilge:{ isabet:['mekaniği kusursuzdu, içeri düştü.','doğru seçimdi, sayı geldi.',
                  'sabırlı hücumun karşılığını aldı, sayı.','yüksek yüzdeli tercihti, girdi.',
                  'bileği düzgün çalıştı, file.','disiplinli bitirdi.',
                  'dengesi bozulmadı, girdi.','ayak yerleşimi doğruydu, düştü.',
                  'hazırlığı iyiydi, sayı geldi.','temiz iş çıkardı, sayı geldi.',
                  'kararı doğruydu, içeri girdi.','ritmi tuttu, sayı geldi.'],
          kacan:['seçimi tartışılırdı, girmedi.','ayak dengesi bozuktu, kaçtı.',
                 'zorlama şut seçti, olmadı.','acele etti, tutmadı.','açısı kapalıydı, girmedi.',
                 'ritmi bozuldu, kaçtı.','bileği geç kalktı, kısa düştü.',
                 'baskıyı okuyamadı, kaçırdı.','erken bıraktı, girmedi.','dengesi kaydı, olmadı.'] },
  cem:{ isabet:['buz gibi bitirdi.','soğukkanlı tamamladı.','hiç düşünmedi, sayı geldi.',
                'elini sallamış, girdi.','sakin sakin bıraktı, file.','işi bitirdi, içeride.',
                'gözünü bile kırpmadı, file.','kolay gösterdi, içeri düştü.','yine yaptı, sayı geldi.',
                'bunu ezbere biliyor, girdi.','şaşırtmadı, girdi.','alışkanlık hâline getirdi.'],
        kacan:['bu sefer olmadı.','çember misafir kabul etmedi.','kaçtı, olur böyle.',
               'tutmadı, devam ediyoruz.','girmedi ama denedi.','bugün onun günü değil.',
               'bu kez tutturamadı.','çember huysuzlandı, girmedi.','kaçırdı, canı sıkıldı — girmedi.',
               'girmedi, olmadı bu sefer.'] },
  reha:{ isabet:['içeri düştü, skor tabelası döndü.','sayı geldi, fark değişti.',
                 'file, iki takım da koşuyor.','içeri girdi — oyun hızlı akıyor.',
                 'sayı geldi, tempo yükseliyor.','geçti, oyun sürüyor.',
                 'girdi, hücum sırası değişiyor.','sayı yazıldı, akış devam ediyor.',
                 'içeri düştü, saat işliyor.','file, oyun kesintisiz sürüyor.',
                 'sayı geldi, tabela güncellendi.','girdi, iki takım da geri dönüyor.'],
         kacan:['kaçtı, ribaunt mücadelesi başlıyor.','girmedi, top cam altına düştü.',
                'tutmadı, cam altı kalabalıklaştı.','kaçtı — hızlı geçiş gelebilir.',
                'olmadı, top el değiştiriyor.','girmedi, oyun sürüyor.',
                'kaçtı, saat işlemeye devam ediyor.','tutmadı, ikinci şans doğabilir.',
                'girmedi, savunma toparlanıyor.','olmadı, tempo düşmüyor.'] }
};
/** Spikere göre sonuç çekirdeği havuzu (ortak + kişilik). */
/* İŞ 6.5: şut TİPİYLE çelişen sonuç çekirdekleri elenir. Smaç ve tip-in çemberin
   dibinden gelir — 'hava atışı' / 'fileye değmedi' / 'yay çok yüksek' onlarda olamaz. */
const _SONUC_YASAK={smac:/hava atışı|fileye değmedi|yay çok yüksek|yörünge kısa/i,
                    tipin:/hava atışı|fileye değmedi|yay çok yüksek/i,
                    turnike:/hava atışı|yay çok yüksek/i};
function _sonucHavuz(spId,made,sut){
  const k=made?'isabet':'kacan';
  const kis=(SUT_SONUC[spId]&&SUT_SONUC[spId][k])||[];
  let havuz=SUT_SONUC.ortak[k].concat(kis);
  const yasak=(!made&&sut)?_SONUC_YASAK[sut]:null;
  if(yasak){ const f=havuz.filter(x=>!yasak.test(x)); if(f.length) havuz=f; }
  return havuz;
}
/** Şut eylemi havuzunu tip + bölgeye göre seç. */
function _eylemHavuz(sut,zone,is3){
  try{
    if(is3){ const u=SUT_EYLEM.uc; return u[zone]||u.top3; }
    const h=SUT_EYLEM[sut];
    if(Array.isArray(h)&&h.length) return h;
    return SUT_EYLEM.def;
  }catch(e){ return SUT_EYLEM.def; }
}

/* ── FAZ 38 İŞ 4: EKSİK KURAL OLAYLARININ ANLATIM HAVUZLARI ──────────────────────
   Rejistr FAZ 37 ile aynı: kısa, yüklemli, yasak kalıp yok, ad kuralı geçerli.
   %S = ihlali yapan · %R = topu kullanacak oyuncu · %T = takım. */
const IHLAL24_LINES=[
  '⏱ Şut saati doldu — %T bitiremedi.',
  '⏱ Şut saati ihlali — %T şut bulamadı.',
  '⏱ Yirmi dört saniye doldu, %S bırakamadı.',
  '⏱ Saat sıfırlandı, şut gelmedi.',
  '⏱ İhlal — %T pozisyonu bitiremedi.',
  '⏱ Süre bitti, top kalkmadı bile.'
];
const HUCUM_FAULU_LINES=[
  '%S hücum faulü yaptı, top %R{e} geçti.',
  'Hakem hücum faulü verdi: %S savunmacıyı devirdi.',
  '%S dirsek attı, hücum faulü. Top %R{de}.',
  '%S perdeye yürürken faul yaptı — hücum faulü.',
  'Şarj faulü — %S savunmacıya çarptı.',
  '%S ittirdi, hakem hücum faulünü gördü.'
];
const ADIM_LINES=[
  '%S adım attı — düdük çaldı, topu %R kullanacak.',
  '%S çift sürme yaptı; hücum bitti, top %R{de}.',
  '%S çift sürme yaptı.',
  'Adım ihlali — %S pivot ayağını kaydırdı.',
  '%S topu ayağına değdirdi — ihlal, top %R{e} geçiyor.',
  'Üç saniye ihlali — %S boyadan çıkmadı.'
];
/* FAZ 38 İŞ 4 (tamamlayıcı): NADİR KURAL OLAYLARI.
   Değerleri seyrekliklerinden gelir — sık basılırsa sıradanlaşır ve anlatımı bozar. */
const TEKNIK_LINES=[
  'Hakem teknik faul verdi; %S itirazı fazla uzattı.',
  '%S kararı kabul etmedi, hakem teknik faulü çaldı.',
  'Teknik faul geldi — %S kenara doğru bağırdı.',
  '%S sinirlerine hâkim olamadı; hakem teknik faul çaldı.'
];
const SPORTMEN_LINES=[
  'Sportmenlik dışı faul — %S topa değil oyuncuya gitti.',
  'Hakem sportmenlik dışı faul çaldı; %S hücumu sertçe kesti.',
  '%S kaçan rakibini kolundan tuttu — sportmenlik dışı faul.'
];
const SAKAT_MAC_LINES=[
  '%S ayak bileğine bastı, acıyla yere oturdu.',
  '%S dizini tutuyor; sağlık ekibi sahaya girdi.',
  '%S düşerken omzuna yüklendi, kalkmakta zorlandı.',
  '%S bacağını tutarak kenara doğru yürüdü.'
];
const TAC_LINES=[
  '%S topu çizgi dışına kaçırdı — %R sokacak.',
  'Top yan çizgiden dışarı çıktı, son dokunan %S.',
  '%S topu kontrol edemedi, taç %R{de}.',
  'Top dip çizgiyi geçti — %S{in} elinden çıktı.',
  '%S pasında top dışarı gitti.',
  'Top çizgi dışına çıktı, %R sokacak.'
];
const SUT_ON_LINES={
  uc:['%S üçlük için kalktı.','%S dıştan tetiği çekti.','%S yaydan bıraktı.',
      '%S üçlüğü denedi.','%S dıştan gönderdi.','%S ayakları hazır, bıraktı.',
      '%S yay dışından kalktı.','%S üçlüğü havaya bıraktı.','%S uzaktan şansını denedi.',
      '%S dıştan kalktı.','%S üç sayı için bıraktı.','%S yay ötesinden gönderdi.',
      '%S bileği kalktı, üçlük havada.','%S dışarıdan denedi.','%S yaydan şutu bıraktı.',
      '%S üçlüğe yükseldi.','%S dış şutu havaya gönderdi.','%S uzaktan bıraktı.',
      '%S tereddüt etmedi, üçlüğü attı.','%S dıştan havaya bıraktı.'],
  ic:['%S şutu bıraktı.','%S çembere yükseldi.','%S denemesini gönderdi.',
      '%S kalktı ve bıraktı.','%S topu çembere yolladı.','%S bitirmeye gitti.',
      '%S şutunu havaya bıraktı.','%S potaya yüklendi.','%S çembere doğru gitti.',
      '%S denemesi havada.','%S şutunu gönderdi.','%S yükselip bıraktı.',
      '%S bitirmek için kalktı.','%S topu havaya bıraktı.','%S çembere yollandı.',
      '%S şansını kullandı.','%S şutuna kalktı.','%S potaya gönderdi.',
      '%S içeriden denedi.','%S bitirişe gitti.']
};
const SUT_LINES={
  smac:{
    score2:['%S çemberi salladı! %SC','%S potaya asıldı! %SC',
            '%S yukarıdan bastırdı! %SC','%S savunmanın üstünden çaktı! %SC',
            '%S smacı fileye gömdü! %SC','%S çembere yüklenip smaçladı. %SC',
            '%S havada kalıp smaçladı. %SC'],
    miss2:['%S smacını çember reddetti!','%S smaçta çembere takıldı.',
           '%S çakmak istedi, olmadı.','%S smacı fileyi bulmadı.']
  },
  turnike:{
    score2:['%S turnikeyi tamamladı. %SC','%S camdan yumuşak bıraktı. %SC',
            '%S turnikeyi camdan çevirdi. %SC','%S çemberin altından sıyırdı. %SC',
            '%S turnikeyi sakin bitirdi. %SC','%S ters turnikeyi geçirdi. %SC'],
    miss2:['%S turnikesi çemberden döndü.','%S turnikede tökezledi.',
           '%S turnikeyi kaçırdı.','%S turnikeyi uzun bıraktı.']
  },
  floater:{
    score2:['%S havada asılı bıraktı! %SC','%S parmak ucundan yolladı. %SC',
            '%S uzunların üstünden kavisledi. %SC','%S kavisi tutturdu. %SC',
            '%S boyadan yumuşak kavis bıraktı. %SC','%S yüksek kavisle geçirdi. %SC',
            '%S kavisli şutu fileye bıraktı. %SC','%S parmak ucuyla yumuşacık bıraktı. %SC'],
    miss2:['%S kavisli şutu denedi, takıldı.','%S kavisi uzun bıraktı.',
           '%S parmak ucundan denedi, olmadı.','%S yumuşak kavisi zorladı, girmedi.',
           '%S havada asılı bıraktı ama olmadı.','%S kavisi çemberden döndü.',
           '%S yüksek kavisi kısa kaldı.','%S uzunların üstünden denedi, girmedi.']
  },
  kanca:{
    score2:['%S kancayı kullandı. %SC','%S omzunun üstünden gönderdi. %SC',
            '%S kancayla çembere bıraktı. %SC','%S postta dönüp kancayı geçirdi. %SC',
            '%S kancasını yumuşak bıraktı. %SC'],
    miss2:['%S kancası çemberden döndü.','%S omzunun üstünden denedi, olmadı.',
           '%S kancayı uzun bıraktı.','%S kancada dengesini kaybetti.']
  },
  tipin:{
    score2:['%S sekeni havada aldı! %SC','%S havada yakalayıp bıraktı! %SC',
            '%S tek dokunuşla soktu. %SC','%S ribaundu havada bitirdi. %SC',
            '%S havada çevirip soktu. %SC'],
    miss2:['%S havada yakaladı, olmadı.','%S tek dokunuşla denedi.',
           '%S sekeni havada zorladı.','%S şansı havada kaçırdı.']
  }
};
/** Ön parça + kısa çekirdek [+ skor] birleşimi. Yalnız sunum PRNG'si kullanır. */
function zincirLine(kind,v,pr,memo){
  try{
    const uzak=(kind==='score3'||kind==='miss3');
    const onHavuz=uzak
      ? AKIS_ON.gelis.concat(AKIS_ON.perde)
      : AKIS_ON.yuklen.concat(AKIS_ON.eslesme,AKIS_ON.perde);
    const onHam=pickLine(onHavuz,pr,memo,'akis'+(uzak?'3':'2'));
    /* §7.2: ön parçaların bir kısmı adsız ('Perde geldi.', 'Yüksek perde.', 'İkili oyun.')
       ve kısa çekirdekler de adsız ('Kaçırdı.', 'Tutturdu.') — ikisi birleşince
       "İkili oyun. Tutturdu." çıkıyor ve KİMİN attığı kayboluyor (263 olayda 15 kez).
       Havuzu daraltmak çeşitliliği yer; onun yerine ad yoksa çekirdeğe fail eklenir. */
    const adVar=onHam.indexOf('%S')>=0;
    /* §7.4a: zincir, gerçek anlatımın 2-5 kelimelik parça ritmidir; orada spiker tam ad
       değil TEK ad kullanır ("Cedi güçlü gitti." / "Marilonis yüklendi."). Uzun/resmî
       cümlelerde tam ad korunur — ayrım bilinçli. */
    const kisaAd=(typeof _anlatimAdi==='function'&&v.s)?_anlatimAdi(v.s):v.s;
    const on=adKoy(onHam,{S:kisaAd});
    /* FAZ 26 §1: tipi olan yakın şutlarda önce tipe özgü çekirdek denenir. */
    const _sutCek=(v.sut&&KISA_CEKIRDEK_SUT[v.sut])?KISA_CEKIRDEK_SUT[v.sut][kind]:null;
    let cek=pickLine((_sutCek&&_sutCek.length?_sutCek:KISA_CEKIRDEK[kind])||[''],pr,memo,'kisa'+(v.sut||'')+kind);
    if(!adVar&&kisaAd&&cek){
      /* Türkçe küçük harf: İ→i, I→ı. Tarayıcı yereli varsayılamaz (trKucuk). */
      cek=kisaAd+' '+(typeof trKucuk==='function'?trKucuk(cek.charAt(0)):cek.charAt(0).toLowerCase())+cek.slice(1);
    }
    return (on+' '+cek+(v.sc?' '+v.sc:'')).replace(/\s+([.!?,;])/g,'$1').replace(/\s{2,}/g,' ').trim();
  }catch(e){ return ''; }
}

const ASSIST_PHRASES={
  spotup:['%A dış çevrede boşta bıraktı; ','%A topu kenara aktardı, ','%A yan çizgiye çıkardı, ','%A pas trafiğini çözüp gördü; '],
  pnr:['%A ikili oyun sonrası topu bıraktı; ','%A ikili oyunla ortağını kullandı, ','%A perde arkasından buldu; ','%A blok sonrası dağıttı, '],
  cut:['%A kes-geç pasıyla buldu; ','%A boşalan adamı gördü; ','%A savunma arasından geçirdi, ','%A zamanlı pasla ulaştırdı; '],
  postup:['%A posttan dışarı çıkardı; ','%A çift savunmayı bölüp gördü; '],
  transition:['%A hızlı çıkışta koşan adama attı, ','%A geçiş hücumunda gördü; '],
  def:['%A buldu; ','%A içeri dalıp dağıttı, ','%A pasıyla ','%A boşta bıraktı; ']
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
    pool=_sutSuz(pool,v.sut,kind);   /* FAZ 26 §1 · FAZ 28 §2: sınıf dili */
  }
  /* §7.5: BLOK cümlesi bölge süzgecinden geçmiyordu — üç sayılık deneme bloklanınca
     "boyalı alanın kapısını kapadı!" çıkıyordu. Yay dışı denemede boya/pota dibi
     iddiası taşıyan satırlar elenir. */
  if(kind==='block'&&v.uzak){
    const f=pool.filter(t=>!_NEAR_WORDS.test(t)&&!/boyalı alan|pota dib|çember/i.test(t));
    if(f.length) pool=f;
  }
  /* F13-9: "köşe üçlüğü" ifadesi bölgeden bağımsız seçiliyordu; kanattan ya da yay
     tepesinden atılan şut için de "köşeden" deniyordu (ölçüm: 53 iddianın 32'si yanlış).
     Bölge adı METİNDEN değil `shot.zone` alanından türetilir. */
  if(v.zone&&(kind==='score3'||kind==='miss3')){
    const koseMi=(v.zone==='corner3');
    let f=pool.filter(t=>koseMi?_CORNER_WORDS.test(t):!_CORNER_WORDS.test(t));
    /* Spiker başına yalnız 3-4 köşe kalıbı vardı; filtre açılınca köşe şutları aynı üç
       cümleyi tekrarlıyordu (F13-8). Ortak köşe havuzu her spikerin kendi kalıplarına eklenir. */
    if(koseMi) f=f.concat(kind==='score3'?CORNER3_MADE:CORNER3_MISS);
    if(f.length) pool=f;
  }
  const line=pickLine(pool,pr,memo,spId+kind);
  /* F14-1: %SC boşaldığında cümle sonunda yalnız kalan boşluk ve " !" gibi bozuk
     noktalama oluşuyordu — temizlenir. */
  return adKoy(line,{SC:v.sc,S:v.s,B:v.b,C:v.c});
}

/* ── F14-3: SPİKER İMZASI ─────────────────────────────────────────────────────────────
   Dört spiker aynı işi yapıyordu, yalnız sıfatları farklıydı; ayırt edilemiyorlardı.
   Her imza YALNIZ kendi bağlam eşiği aşıldığında devreye girer, her cümlede değil:
     Coşkun  → oyuncu üst üste 2+ isabet   → "Marco. Marco!" öneki
     Bilge   → 2+ isabet ve 8+ sayı        → "— bu maçta 14 sayı." soneki
     Cem     → 3+ isabet                   → kısa espri soneki
     Reha    → 6+ cevapsız seri            → "8-0'lık seri." soneki                    */
const IMZA_ESPRI=['Bunu sever.','Bugün eli yanıyor.','Salon buna doydu.','Sıraya girdiler.','Durdurabilene aşk olsun.'];
/* §7.4d: "— 14 sayısı oldu." Türkçesi bozuktu (sayı "olmaz", ulaşılır). */
const IMZA_ISTAT=['Böylece %P sayıya ulaştı.','Akşamki %P. sayısı.','Bu maçta %P sayısı var.','%P sayıya yükseldi.'];
const IMZA_SERI =['%R-0\'lık seri.','%R sayılık cevapsız seri.','Seri %R{e} ulaştı.'];
function spikerImza(SP,txt,ctx,pr,memo){
  try{
    if(!SP||!txt||!ctx) return txt;
    /* Ölçüm: eşikler tek başına maç başına 22 imza üretiyordu (hedef 3-12) — imza ancak
       en az 8 sayı olayı arayla tekrar eder; spikerin "tikleri" seyrek olmalı. */
    if(ctx.cd>0) return txt;
    switch(SP.davranis){
      case 'isimTekrar':
        if(ctx.heat>=2&&ctx.ad){ ctx.vur(); return ctx.ad+'. '+ctx.ad+'! '+txt; }
        break;
      case 'istatistik':
        if(ctx.heat>=2&&ctx.pts>=8){ ctx.vur();
          return txt+' '+pickLine(IMZA_ISTAT,pr,memo,'imzaB').replace('%P',String(ctx.pts)); }
        break;
      case 'espri':
        if(ctx.heat>=3){ ctx.vur(); return txt+' '+pickLine(IMZA_ESPRI,pr,memo,'imzaC'); }
        break;
      case 'resmi':
        if(ctx.run>=6){ ctx.vur(); return txt+' '+pickLine(IMZA_SERI,pr,memo,'imzaR').replace('%R',String(ctx.run)); }
        break;
    }
  }catch(e){}
  return txt;
}

/* F14-3: YORUMCU — ölü toplarda (faul, taktik) olayın NEDENİNİ söyleyen ikinci ses.
   Yeni olay türü açılmaz; mevcut olayın metnine eklenir (render katmanına dokunulmaz). */
const YORUMCU_LINES={
  foul:['Erken faul yapmamak için beklediler, daha pahalıya ödediler.','Faul hakları doldu; artık her temas çizgiye gidiyor.','Agresif savunma ama riskli.','Ayak pozisyonu geçti, doğru karar.','Bu faul gereksizdi, hücum zaten bitiyordu.'],
  tempo:['Ritim tamamen değişti bu bölümde.','Geçişlerde çok kolay sayı veriyorlar.','Sabırlı set oyunu doğru tercih burada.','Boyalı alanı kapatmayı başardılar.','Tempoyu düşürmek isteyecekler.'],
  seri:['Bu seri moral olarak çok değerli.','Mola almazlarsa bu iş kopar.','Karşılık vermeleri şart.','Skor tabelasından çok, oyunun akışı değişti.']
};

/* ══ BÖLÜM 3 — MAÇ BAĞLAMI (KARAR-SUNUCU.md madde 3.0) ═════════════════════════════════
   Motor iki yerde küresel duruma bağlıydı:
     1) `generateMatchEvents` içeride G.team / G.players / G.tactics / matchLineup() okuyordu —
        "şu an bu tarayıcıda oturan tek oyuncu" varsayımı. Sunucu aynı anda yüzlerce maç
        oynatırken tek bir G olamaz.
     2) Rakibin gücü ADININ HASH'İNDEN üretiliyordu (`pseudoTeamStrength`); rakibin gerçek
        kadrosu, taktiği ve formu maça hiç girmiyordu.
   Çözüm: motor artık BAĞLAM nesnesi (MC) okur. Bağlam verilmezse G'den kurulur — yani tek
   oyunculu davranış birebir korunur. Bağlam verildiğinde (sunucu / tools/sim-node.js) motor
   G'ye hiç dokunmaz ve iki taraf da AYNI kod yolundan geçer. */

/** Maç bağlamını kur. opts.ctx verilmişse doğrudan o kullanılır (G okunmaz). */
function buildMatchCtx(rakip,opts){
  opts=opts||{};
  if(opts.ctx) return opts.ctx;
  const _G=(typeof G!=='undefined')?G:{};
  return {
    gameDay:_G.gameDay||1,
    difficultyOpp:(typeof difficultyCfg==='function')?(difficultyCfg().rakip||1):1,
    home:{
      name:(_G.team&&_G.team.isim)||'Takım',
      players:_G.players||[],
      lineup:matchLineup(),
      tactics:_G.tactics||{},
      chemistry:(_G.chemistry!=null?_G.chemistry:75),
      strength:computeRosterOfrDef(),
      bonus:(typeof teamBonusFactor==='function')?teamBonusFactor():1,
      wins:_G.wins||0,
      losses:_G.losses||0
    },
    away:{
      name:(rakip&&rakip.isim)||'Rakip',
      players:(rakip&&Array.isArray(rakip.players))?rakip.players:null,
      tactics:(rakip&&rakip.tactics)||{},
      ligKey:(_G.team&&_G.team.tblKey)?_G.team.tblKey:'tbl',
      drift:(_G.season&&_G.season.drift)||{}
    }
  };
}

/** Rakip gücü (58-100 bandı). Gerçek kadro varsa kullanıcı tarafıyla AYNI formülden ölçülür;
    yoksa eski ada dayalı sanal güce düşer (tek oyunculu bot rakipler). */
function matchOppStrength(MC){
  const a=MC.away||{};
  if(a.strengthNum!=null) return Number(a.strengthNum);
  if(Array.isArray(a.players)&&a.players.length){
    const s=computeRosterOfrDef(a.players);
    /* computeRosterOfrDef ~190-320 bandı üretir; pseudoTeamStrength 58-100 bandındadır.
       İki ölçek aynı doğrusal eşlemeyle birleştirilir (uq/oq hesabıyla tutarlı). */
    const q=Math.max(0,Math.min(1,((s.ofr+s.def)/2-190)/130));
    return 58+q*42;
  }
  return pseudoTeamStrength(a.name,a.ligKey||'tbl')+((a.drift&&a.drift[a.name])||0);
}

/** Tohumlu PRNG — aynı tohum aynı maçı üretir (sunucu tarafı yeniden üretilebilirlik şartı). */
function _seedRandom(seed){
  let a=seed>>>0;
  return function(){
    a|=0; a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

/** SUNUCU SÖZLEŞMESİ — saf fonksiyon: G yok, DOM yok, tohumla deterministik.
      simulateMatch({homeRoster,awayRoster,homeTactics,awayTactics,seed,homeName,awayName,gameDay})
    Dönen: {events, home, away, box} — events dizisi tarayıcıda oynatılabilir (aynı biçim). */
function simulateMatch(o){
  o=o||{};
  const ctx={
    /* FAZ 34 §3: gecelik form maç tohumundan türer; sunucu tarafı simülasyonda da
       aynı tohum aynı formu vermeli (determinizm sözleşmesi). */
    macSeed:(o.seed!=null)?(o.seed|0):null,
    gameDay:o.gameDay||1,
    difficultyOpp:o.difficultyOpp!=null?o.difficultyOpp:1,
    home:{
      name:o.homeName||'Ev',
      players:o.homeRoster||[],
      lineup:matchLineup(o.homeRoster||[],o.homeLineup||null),
      tactics:o.homeTactics||{},
      chemistry:o.homeChemistry!=null?o.homeChemistry:75,
      strength:computeRosterOfrDef(o.homeRoster||[]),
      bonus:o.homeBonus!=null?o.homeBonus:1,
      wins:o.homeWins||0,
      losses:o.homeLosses||0
    },
    away:{
      name:o.awayName||'Deplasman',
      players:o.awayRoster||null,
      tactics:o.awayTactics||{},
      ligKey:'tbl',
      drift:{}
    }
  };
  const eskiRandom=Math.random;
  if(o.seed!=null) Math.random=_seedRandom(o.seed|0);
  let events;
  try{
    events=generateMatchEvents({isim:ctx.away.name,players:ctx.away.players},
      {ctx:ctx,userIsHome:o.userIsHome!==false});
  } finally {
    Math.random=eskiRandom;
  }
  const son=events[events.length-1]||{};
  return {events:events,home:son.home|0,away:son.away|0,box:son.box||null};
}

function generateMatchEvents(rakip, opts){
  opts=opts||{};
  const userIsHome=opts.userIsHome!==undefined?!!opts.userIsHome:true;
  const resume=opts.resume||null;   /* Madde 12: manuel değişiklik sonrası kalan maçı yeniden üret */
  /* Maç başına spiker ata (rotasyonlu — sezon maç sayısına göre + rastgele öğe). */
  const MC=buildMatchCtx(rakip,opts);
  /* ── FAZ 34 §3: GECELİK FORM ────────────────────────────────────────────────────
     Aynı oyuncu bazı maçlar uçar, bazı maçlar söner — gerçek hayattaki istisnai
     istatistikler böyle doğar. Dağılım (brif §3.1):
       %10 sıcak gece +8..+14 · %10 soğuk gece −8..−14 · %80 normal −4..+4
     Deterministik: hash32(oyuncu.seed + maçTohumu). rand()/Math.random ÇAĞIRMAZ.

     ⚠ §4 KISITI: form MUTLAK olasılığı değil TAKIM İÇİ GÖRELİ PAYI etkiler. Yani
     sıcak gecedeki oyuncu daha çok şut/ribaund/asist ALIR, ama takımın toplam şutu,
     ribaundu ve isabeti DEĞİŞMEZ — motorun mevcut mantığından gelmeye devam eder.
     Bu yüzden form yalnız ağırlık fonksiyonlarında (usageW/rebW/blkW/stlW/astW)
     okunur; shooterAcc'ın mutlak isabetine DOKUNULMAZ, yoksa lig FG%'si kayardı. */
  const _macTohum=(MC.macSeed!=null)?String(MC.macSeed)
    :String(hash32(String(MC.away&&MC.away.name||'')+'|'+(MC.home.wins||0)+'|'+(MC.home.losses||0)+'|'+(MC.gameDay||1)+'|'+(userIsHome?1:0)));
  const _formCache=new Map();
  /** Oyuncunun bu maçtaki form sapması (stat puanı cinsinden). */
  function macFormu(p){
    if(!p) return 0;
    const anahtar=String(p.seed||p.id||'');
    if(_formCache.has(anahtar)) return _formCache.get(anahtar);
    const t=anahtar+'|form|'+_macTohum;
    const u=prUnit(t);
    let v;
    if(u<0.10)      v= 8+Math.floor(prUnit(t+'|s')*7);     /* sıcak  +8..+14 */
    else if(u<0.20) v=-(8+Math.floor(prUnit(t+'|c')*7));   /* soğuk  −8..−14 */
    else            v=-4+Math.floor(prUnit(t+'|n')*9);     /* normal −4..+4  */
    _formCache.set(anahtar,v);
    return v;
  }
  /** Form uygulanmış stat okuması — yalnız GÖRELİ ağırlıklarda kullanılır. */
  /* TAVAN YOK — bilinçli. 99'da kırpmak sıcak geceyi budar, soğuk geceyi budamaz
     (taban 0'a hiç çarpılmaz) ve bu tek yönlü kayıp lig skorunu aşağı çekiyordu.
     Değer bir ORAN girdisidir (wPick ağırlığı / skillMul), stat kutusu değil;
     106 gibi bir ara değer hiçbir yerde gösterilmez. */
  function statF(p,k){ return Math.max(0,statN(p,k)+macFormu(p)); }
  const spikerIx=(Math.abs((MC.home.wins||0)+(MC.home.losses||0))+rand(0,3))%SPIKERS.length;
  const SP=(resume&&resume.spId)?(SPIKERS.find(s=>s.id===resume.spId)||SPIKERS[spikerIx]):SPIKERS[spikerIx];
  const lu=MC.home.lineup;
  if(!lu||!lu.pg){
    const emptyQ={1:0,2:0,3:0,4:0};
    return [{
      type:'end',
      text:'Sağlıklı oyuncu kalmadı — maç oynanamıyor.',
      q:1,t:0,home:0,away:0,winner:'draw',
      box:{h:emptyBox(),a:emptyBox()},qh:cloneQx(emptyQ),qa:cloneQx(emptyQ)
    }];
  }
  let {pg,sg,sf,pf,c}=lu;   /* let: aşağıdaki boş-slot savunması yeniden atayabilsin */
  /* Takım gücü etkisi: kadro OFR/DEF ↔ rakip sanal gücü → şut isabet çarpanı (±%16 sınırlı).
     Böylece güçlü kadro kurmanın maç sonucuna gerçek etkisi olur; rastgelelik korunur. */
  const rrStr=MC.home.strength;
  const ligKey=MC.away.ligKey;
  const oppName=MC.away.name;
  const oppStr=matchOppStrength(MC);
  const uq=Math.max(0,Math.min(1,((rrStr.ofr+rrStr.def)/2-190)/130));
  const oq=Math.max(0,Math.min(1,(oppStr-58)/42));
  const strengthEdge=Math.max(-0.16,Math.min(0.16,(uq-oq)*0.22));
  /* Madde 8/9: koç skoru + menajer itibarı küçük ek çarpan olarak kullanıcı lehine (maks ~+%5.5). */
  /* B5: zorluk rakip gücünü ölçekler (normal = 1, davranış değişmez). */
  const _zorRakip=MC.difficultyOpp!=null?MC.difficultyOpp:1;
  const uMul=(1+strengthEdge)*MC.home.bonus, oMul=(1-strengthEdge)*_zorRakip;
  /* Taktik etkisi (Faz 3: derinleştirildi): tempo·hücum odağı·savunma stili·top yükleme·yıldız eşleştirme.
     VARSAYILANLAR (tempo=normal, odak=dengeli, savunma=adam, yükleme yok, eşleştirme kapalı) tam olarak
     eski davranışı üretir — skor bandı (~86-90) korunur; yalnız kullanıcı seçimleri dengeyi kaydırır. */
  const tac=MC.home.tactics||{};
  const tempo=tac.tempo||'normal';
  const odak=tac.odak||'dengeli';
  const defStyle=tac.defensiveStyle||'adam';        /* adam / bolge / pres */
  const markStar=!!tac.markStar;                     /* rakibe özel eşleştirme (en iyi savunmacı ↔ rakip yıldızı) */
  const focusPlayerId=tac.focusPlayerId||null;       /* belirli oyuncuya top yükleme */
  /* Pozisyon süresi (sn) — 10 dk (600 sn) çeyrekte gerçekçi pozisyon sayısı üretir.
     Hızlı tempo daha çok pozisyon → daha yüksek skor; yavaş tempo kontrollü/az pozisyon. */
  const decLo=tempo==='hizli'?9:tempo==='yavas'?12:10;
  const decHi=tempo==='hizli'?17:tempo==='yavas'?24:20;
  /* M17 dengesi: top kaybı artık pozisyonların ~%12'sini tüketiyor; şut hacmi ve skor
     bandı korunsun diye pozisyon sayısı hafif artırıldı. */
  const playsMax=tempo==='hizli'?62:tempo==='yavas'?46:54;
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
  const userIs3Oran=Math.max(0.05,Math.min(0.72,(odak==='dis'?0.56:odak==='ic'?0.28:odak==='hizli'?0.38:odak==='set'?0.44:0.44)+(pb.is3||0)));
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
  /* BÖLÜM 3: rakip kadrosu ÖNCE bağlamdan gelir (sunucu / iki gerçek takım). Bağlamda kadro
     yoksa eski yol sürer: adı verilen bot kulübün kalıcı kadrosu (tek oyunculu davranış). */
  if(Array.isArray(MC.away.players)&&MC.away.players.length) oppFull=MC.away.players.slice();
  else { try{ oppFull=(getBotClubProfile(oppName,ligKey).roster||[]).slice(); }catch(e){ oppFull=[]; } }
  /* ── Madde 2/3/4: kullanıcı şutörünün kendi statı + enerjisi + moral/kimya isabeti belirler ──
     Takım gücü (uMul) ikincil çarpan olarak kalır; genel skor bandı (~85-95) korunur. */
  const teamChem=Math.max(0,Math.min(100,Number(MC.home.chemistry!=null?MC.home.chemistry:75)));
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
    /* FAZ 34 §3: kullanım payı forma duyarlı — sıcak gecedeki oyuncu daha çok şut alır.
       İsabet (shooterAcc) DEĞİŞMEZ; değişen yalnız şutların takım içi dağılımıdır. */
    const sk=(statF(p,'hucum')*0.6+statF(p,'sutIsabeti')*0.4);
    return Math.max(0.20,rolMul*(0.62+sk/150));
  };
  /* FAZ B: seçilen hücum seti bazı ROLLERİ besler (Pick&Roll → kurucu+pivot, Dip Köşe → şutör).
     Yalnız KULLANICI takımına uygulanır; rakip kendi setini FAZ C'de seçecek. */
  const _pbRoleW=(pb&&pb.roleW)||{};
  const usageWU=(p)=>usageW(p)*(_pbRoleW[(p&&p.rol)||'']||1)*((p&&_ilkBes&&_ilkBes.has(p.id))?1:0.70);
  /* FAZ 34 §2/§3: bu dört ağırlık ÖZEL YETENEĞİN ve GECELİK FORMUN sahaya yansıdığı
     yerdir. wPick bunları takım içinde oranlar — toplam ribaund/çalma/blok/asist sayısı
     motorun kendi mantığından gelmeye devam eder, değişen yalnız KİMİN aldığıdır (§4). */
  const astW=(p)=>Math.max(0.12,(_eg(p,'pas')/100)*1.5+statF(p,'pas')/140+(p&&p.rol==='oyunKurucu'?0.55:0)-((p&&p.poz==='C')?0.22:0));
  /* FAZ 34 §7: ribaunt ağırlığı statla DOĞRUSAL değil ÜSTEL artar. Doğrusalken elit
     ribaundcu (99) ortalamanın (70) yalnız 1,41 katı ağırlık taşıyordu ve takım içi
     payı %37'de kalıyordu — 40 maçta 20+ ribaunt alan TEK oyuncu-maç çıkmadı (brif
     hedefi %0,3-1,5). Üs, payı gerçek basketbolun dominant ribaundcusuna yaklaştırır.
     ⚠ TOPLAM ribaunt DEĞİŞMEZ: wPick yalnız takım içinde oranlar (§4). */
  const rebW=(p)=>Math.max(0.12,Math.pow(Math.max(1,statF(p,'ribaund'))/70,2.4)+((Number(p&&p.boy)||200)-198)/40+(p&&p.rol==='ribaundcu'?0.8:0));
  const blkW=(p)=>Math.max(0.08,statF(p,'blok')/60+(p&&p.rol==='karartici'?1.1:0));
  const stlW=(p)=>Math.max(0.10,statF(p,'topCalma')/65+(p&&p.rol==='kilit'?0.9:0));
  /* Faul disiplini düşük olan oyuncu faulleri toplar (gerçek hayatta pivotlar). */
  const foulW=(p)=>Math.max(0.15,(100-_eg(p,'disiplin'))/45);
  const shooterAcc=(shooter,is3,base,clutch,isUser)=>{
    /* FAZ 34 §3: form İSABETE de yansır — yoksa kullanım payı forma göre kayarken
       isabet sabit kalıyor, usage-yetenek korelasyonu seyreliyor ve takım FG%'si
       SİSTEMLİ olarak düşüyordu (ölçüldü: ligin deplasman ortalaması −2,3).
       Sıcak gece hem daha çok şut hem daha isabetli şut demektir; dağılım simetrik
       olduğu için (%10 sıcak / %10 soğuk) lig ortalaması korunur. */
    const s2=statF(shooter,'hucum')*0.5+statF(shooter,'sutIsabeti')*0.5;
    const s3=statF(shooter,'sutIsabeti')*0.7+statF(shooter,'hucum')*0.3;
    const skill=is3?s3:s2;
    const skillMul=1+(skill-70)/100*0.6;                 /* ~0.91..1.13 (avg 70 → 1.0) */
    const en=Math.max(0,Math.min(100,Number(shooter.enerji!=null?shooter.enerji:100)));
    const enMul=0.85+en/100*0.17;                        /* 0.85..1.02 — bireysel yorgunluk */
    const mood=Number(shooter.mood!=null?shooter.mood:70);
    /* Psikoloji: kullanıcı tarafında moral + takım kimyası; bot tarafında kulüp kadrosunun
       kendi morali (kimya kullanıcıya özgü bir kavram, bota taşınmaz). */
    const psyMul=(isUser===false)
      ? Math.max(0.96,Math.min(1.04,1+((mood-60)/40)*0.04))
      : Math.max(0.95,Math.min(1.05,1+((mood-60)/40)*0.04+((teamChem-70)/30)*0.03));
    /* Madde 36: kritik anlarda (son 2 dk / uzatma) zekâsı yüksek oyuncu daha iyi karar verir. */
    let clutchMul=1;
    if(clutch){
      /* FAZ A: SOĞUKKANLILIK — düşük eğilimli oyuncunun son dakikada eli titrer (×0.86'ya kadar),
         yüksek olan ısınır (×1.12). Zekâ katkısı korunur ama artık tek belirleyici değil. */
      const _cl=_eg(shooter,'clutch');
      clutchMul=Math.max(0.86,Math.min(1.12,1+(statN(shooter,'zeka')-70)/100*0.06+(_cl-50)/100*0.18));
    }
    /* Takım çarpanı ve pozisyon uyumu yalnız kullanıcı tarafına aittir; bot tarafında
       çağıran kendi çarpanını base'e katar. */
    if(isUser===false) return base*skillMul*enMul*psyMul*clutchMul;
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
  const byPid=id=>(MC.home.players||[]).find(p=>p.id===id);
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
  const _rotRank=p=>(Number(p&&p.genel)||0)*(0.70+0.30*Math.max(0,Math.min(100,Number(p&&p.enerji!=null?p.enerji:100)))/100);
  /* İlk beş kimlikleri — dinlenme bitince ÖNCELİKLİ olarak geri dönerler. */
  const _ilkBes=new Set(userCourt.map(x=>x&&x.id).filter(Boolean));
  /* Rotasyon havuzu: ilk beş + en iyi 4 yedek (toplam 9). Kalanlar yalnız faul/sakatlık
     zorunluluğunda girer — gerçek koç da kadronun tamamını oynatmaz. */
  const ROT_YEDEK=6;
  const _rotHavuz=new Set(benchQueue.slice(0,ROT_YEDEK).map(x=>x&&x.id).filter(Boolean));
  const _dinlenmeBitti=(c,say)=>!(c&&c._dinlenmeBitis!=null&&say<c._dinlenmeBitis);
  const benchNext=(say,ilkBesGeri)=>{
    /* Saha yedeğe kaydıysa: dinlenmiş İLK BEŞ oyuncusu öncelikli geri döner. */
    if(ilkBesGeri){
      for(let i=0;i<benchQueue.length;i++){
        const c=benchQueue[i];
        if(!c||(c.matchFouls||0)>=foulLimit) continue;
        if(_ilkBes.has(c.id)) return benchQueue.splice(i,1)[0];
      }
    }
    /* 1) ROTASYON HAVUZUNDAKİ hiç oynamamış yedek — derinlik havuzla sınırlı. */
    for(let i=0;i<benchQueue.length;i++){
      const c=benchQueue[i];
      if(!c||(c.matchFouls||0)>=foulLimit) continue;
      if(say!=null&&!_rotHavuz.has(c.id)) continue;
      if(!subbedIds.has(c.id)&&!_ilkBes.has(c.id)) return benchQueue.splice(i,1)[0];
    }
    /* 2) Dinlenmesi biten İLK BEŞ oyuncusu. */
    if(say!=null){
      for(let i=0;i<benchQueue.length;i++){
        const c=benchQueue[i];
        if(!c||(c.matchFouls||0)>=foulLimit) continue;
        if(_ilkBes.has(c.id)&&_dinlenmeBitti(c,say)) return benchQueue.splice(i,1)[0];
      }
    }
    /* 3) Havuz içinden kuyruk sırası. */
    if(say!=null){
      for(let i=0;i<benchQueue.length;i++){
        const c=benchQueue[i];
        if(!c||(c.matchFouls||0)>=foulLimit) continue;
        if(_rotHavuz.has(c.id)||_ilkBes.has(c.id)) return benchQueue.splice(i,1)[0];
      }
      return null;                      /* rutin rotasyonda havuz dışına çıkılmaz */
    }
    /* 4) Zorunlu değişiklik (5 faul / sakatlık): kadronun tamamı açıktır. */
    while(benchQueue.length){ const nx=benchQueue.shift(); if(nx&&(nx.matchFouls||0)<foulLimit) return nx; }
    return null;
  };
  /* Dinlenmeye çıkan oyuncu kuyruğa girer ve dinlenme penceresi damgalanır. */
  const _dinlenmeyeAl=(kuyruk,p,say,pencere)=>{ if(!p) return; p._dinlenmeBitis=(say||0)+(pencere||14); kuyruk.push(p); };
  /* M7: sahnenin dizeceği rakip beşlisi — motorun gerçekten oynattığı kadro (tek doğruluk kaynağı). */
  const _oppFiveOut=[];
  /* A1: Rakip sahada kalıcı 5 + yedek. En iyi 5 başlar; sakatlar dışlanır (yoksa tam kadroya düş). */
  const oppHealthy=oppFull.filter(p=>!(p&&p.injReturnDay!=null&&MC.gameDay<p.injReturnDay));
  /* M20: ilk 5 seçimi yalnız OVR'ye değil, güncel enerjiye de bakar (kullanıcı tarafındaki
     yorgun oyuncuyu dinlendirme mantığının bot karşılığı). Enerji 100 iken sıralama eskisiyle
     aynıdır; yorgun oyuncu geriye düşer ve yedeği başlar. */
  const _oppRank=p=>(Number(p&&p.genel)||0)*(0.75+0.25*Math.max(0,Math.min(100,Number(p&&p.enerji!=null?p.enerji:100)))/100);
  const oppPool=(oppHealthy.length>=5?oppHealthy:oppFull).slice().sort((a,b)=>_oppRank(b)-_oppRank(a));
  oppPool.forEach(p=>{ if(p) p.matchFouls=0; });
  let oppCourt=oppPool.slice(0,5);
  oppCourt.forEach(p=>_oppFiveOut.push(p));   /* M7: sahne bu beşliyi dizecek */
  /* M20: maç boyunca sahada SÜRE ALAN rakip oyuncular — sezon istatistiği yalnız onlara işlenir. */
  const _oppPlayed=new Set();
  oppCourt.forEach(p=>{ if(p&&p.id) _oppPlayed.add(p.id); });
  const oppBench=oppPool.slice(5);
  /* ── FAZ C: rakip koç ── Bot artık kendi setini seçer, mola alır, rotasyon yapar. */
  const botC=(typeof botCoachProfile==='function')?botCoachProfile(oppName):{pb:'dengeli',def:'adam',toRun:8,switchGap:10,depth:8,restEvery:20,panicPb:'transition'};
  let botPb=(typeof playbookOf==='function')?playbookOf(botC.pb):{is3:0,acc2:0,acc3:0,ast:0,to:0,roleW:{}};
  const botState={run:0,to:5,posCount:0,switched:false,dampen:0,restCd:0};
  /* İŞ 3: kullanıcı tarafının rotasyon durumu (bot ile simetrik). */
  const userRot={posCount:0,restCd:0};
  const userTo={run:0,to:5};   /* İŞ 4: kullanıcı takımının mola hakkı ve rakip serisi */
  const _botRoleW=()=>((botPb&&botPb.roleW)||{});
  const oFallback={isim:oppName+' oyuncusu'};
  const usageWO=(p)=>usageW(p)*(_botRoleW()[(p&&p.rol)||'']||1)*((p&&_oppIlkBes&&_oppIlkBes.has(p.id))?1:0.70);
  const oShooter=()=>oppCourt.length?(wPick(oppCourt,usageWO)||ch(oppCourt)):(oppPool[0]||oFallback);
  const oAny=()=>oppCourt.length?ch(oppCourt):(oppPool[0]||oFallback);
  const _oppIlkBes=new Set();
  oppCourt.forEach(p=>{ if(p&&p.id) _oppIlkBes.add(p.id); });   /* İŞ 3: rakip ilk beşi */
  const _oppRotHavuz=new Set(oppBench.slice(0,6).map(x=>x&&x.id).filter(Boolean));
  const oBenchNext=(say,ilkBesGeri)=>{
    if(ilkBesGeri){
      for(let i=0;i<oppBench.length;i++){
        const c=oppBench[i];
        if(!c||(c.matchFouls||0)>=foulLimit) continue;
        if(_oppIlkBes.has(c.id)) return oppBench.splice(i,1)[0];
      }
    }
    for(let i=0;i<oppBench.length;i++){
      const c=oppBench[i];
      if(!c||(c.matchFouls||0)>=foulLimit) continue;
      if(say!=null&&!_oppRotHavuz.has(c.id)) continue;
      if(!_oppPlayed.has(c.id)&&!_oppIlkBes.has(c.id)) return oppBench.splice(i,1)[0];
    }
    if(say!=null){
      for(let i=0;i<oppBench.length;i++){
        const c=oppBench[i];
        if(!c||(c.matchFouls||0)>=foulLimit) continue;
        if(_oppIlkBes.has(c.id)&&!(c._dinlenmeBitis!=null&&say<c._dinlenmeBitis)) return oppBench.splice(i,1)[0];
      }
    }
    if(say!=null){
      for(let i=0;i<oppBench.length;i++){
        const c=oppBench[i];
        if(!c||(c.matchFouls||0)>=foulLimit) continue;
        if(_oppRotHavuz.has(c.id)||_oppIlkBes.has(c.id)) return oppBench.splice(i,1)[0];
      }
      return null;
    }
    while(oppBench.length){ const nx=oppBench.shift(); if(nx&&(nx.matchFouls||0)<foulLimit) return nx; }
    return null;
  };
  const foulingTeamName=(defenderIsUser)=>defenderIsUser?MC.home.name:rname;
  function userFoulsOut(p,q,t){
    const sub=benchNext();
    const ix=userCourt.indexOf(p);
    if(sub){ if(ix>=0) userCourt[ix]=sub; else userCourt.push(sub); subbedIds.add(sub.id); }
    else if(ix>=0) userCourt.splice(ix,1);
    events.push({type:'foul',text:`⚠️ Faul — ${p.isim} (kişisel 5) 🚫 — oyundan atıldı${sub?` — yerine ${sub.isim} girdi.`:' — yedek kalmadı, eksik oynanıyor.'} (${homeScore} - ${awayScore})`,q,t:t||0,home:homeScore,away:awayScore,subOut:p.id,subIn:sub?sub.id:null,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
  }
  /* A3: Rakip oyuncu da 5. faulde oyundan atılır ve yedeğiyle değişir (kullanıcıyla simetrik). */
  function oppFoulsOut(p,q,t){
    const sub=oBenchNext();
    const ix=oppCourt.indexOf(p);
    if(sub){ if(ix>=0) oppCourt[ix]=sub; else oppCourt.push(sub); if(sub.id) _oppPlayed.add(sub.id); }
    else if(ix>=0) oppCourt.splice(ix,1);
    /* Rakip bot havuzu G.players'ta yok — id yerine oyuncu nesnesi taşınır (saha jetonu değişimi için). */
    events.push({type:'foul',text:`⚠️ Faul — ${p.isim} (kişisel 5) 🚫 ${rname} — oyundan atıldı${sub?` — yerine ${sub.isim} girdi.`:' — rakibin yedeği kalmadı, eksik oynuyor.'} (${homeScore} - ${awayScore})`,q,t:t||0,home:homeScore,away:awayScore,subOutObj:p,subInObj:sub||null,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
  }
  /* Savunma faulü kaydı — defenderIsUser=!userPos. Faul yapan takımın somut oyuncusuna yüklenir. */
  /* F13-4: faulü yapan oyuncu artık DÖNDÜRÜLÜR — anlatım "kim faul yaptı, kaçıncı kişisel
     faulü" bilgisini basabilsin diye (12 fauldan 11'inde ad yoktu). Menajerlik oyununda bu
     bilgi karar demek: 5 faulle oyun dışı, değişiklik gerekir. Sayaç mantığı değişmedi. */
  function recordFoul(defenderIsUser,q,t){
    let secilen=null;
    if(defenderIsUser){
      qFoulU[q]=(qFoulU[q]||0)+1;
      const cand=userCourt.filter(p=>p&&(p.matchFouls||0)<foulLimit);
      const p=cand.length?(wPick(cand,foulW)||ch(cand)):userCourt[0];   /* FAZ A: faul disiplini */
      if(p){ p.matchFouls=(p.matchFouls||0)+1; secilen=p; if(p.matchFouls>=foulLimit) userFoulsOut(p,q,t); }
    } else {
      qFoulO[q]=(qFoulO[q]||0)+1;
      const cand=oppCourt.filter(p=>p&&(p.matchFouls||0)<foulLimit);
      const p=cand.length?(wPick(cand,foulW)||ch(cand)):oppCourt[0];   /* FAZ A: faul disiplini */
      if(p){ p.matchFouls=(p.matchFouls||0)+1; secilen=p; if(p.matchFouls>=foulLimit) oppFoulsOut(p,q,t); }
    }
    return secilen;
  }
  /* Faul satırının ortak ön eki: "Faul — Ad (kişisel N)" + 4./5. fauldeyse uyarı tonu. */
  /* §7.4d: faul satırı KÜNYE gibi okunuyordu — "Faul — Uluç Demirel (kişisel 2)".
     237 olayda 25 kez aynı biçim. Gerçek anlatımda faul bir CÜMLEDİR. Künye biçimi
     bilgi değeri taşıdığı için tamamen kaldırılmaz; oranı yarının altına iner.
     Sıra sayısı ('ikinci faulü') sayıdan türetilir, ayrı bir liste tutulmaz. */
  const FOUL_SIRA=['ilk','ikinci','üçüncü','dördüncü','beşinci'];
  const FOUL_SIRA_I=['ilki','ikincisi','üçüncüsü','dördüncüsü','beşincisi'];
  /* Sonda nokta YOK: çağıran taraf ' · ' ile devam ettiriyor (künye biçimi de noktasız). */
  const FOUL_CUMLE=[
    /* FAZ 36 §B2: 'Hakem %A{i} gördü' KALDIRILDI — Türkçede hakem oyuncuyu "görmez",
       faul çalar. Kalan dört kalıp TEK ailedendir: hepsi "fail + kaçıncı faul" cümlesi. */
    '%A{in} %S faulü',
    '%A yine faulde — bu %I',
    'Hakem düdüğü çaldı — %A{in} %S faulü',
    '%A faul yaptı; maçtaki %S faulü'
  ];
  function foulPrefix(fp){
    try{
      if(!fp) return 'Faul —';
      const n=fp.matchFouls||1;
      const uyari=n===4?' ⚠ dikkat, 4. faulü!':(n>=5?' 🚫 5. faul!':'');
      /* 4. ve 5. faul uyarısı künye biçiminde daha okunaklı — orada cümleye geçilmez. */
      if(n>=4||!prChance(0.66)) return `Faul — ${fp.isim} (kişisel ${n})${uyari}`;
      const ix=Math.min(FOUL_SIRA.length-1,Math.max(0,n-1));
      /* "yine faulde" ancak İKİNCİ faulden itibaren doğru; ilk faulde "Ramazan Üstün
         yine faulde — bu ilki" çıkıyordu. */
      const havuz=(n>=2)?FOUL_CUMLE:FOUL_CUMLE.filter(x=>x.indexOf('yine faulde')<0);
      /* FAZ 30 (kelime bütçesi): CÜMLE biçiminde tek ad kullanılır — FAZ 25 §7.4'ün
         'zincir ve yüksek frekanslı olaylarda tek ad' kuralı. KÜNYE biçimi (yukarıdaki
         dal) resmî satırdır ve TAM adı korur. */
      const _kisaFail=(typeof _anlatimAdi==='function')?_anlatimAdi(fp.isim):fp.isim;
      return adKoy(pickLine(havuz,pr,narr.recent,'foulc'),
                   {A:_kisaFail,S:FOUL_SIRA[ix],I:FOUL_SIRA_I[ix]});
    }catch(e){ return 'Faul —'; }
  }
  const inBonus=(defenderIsUser,q)=>(defenderIsUser?(qFoulU[q]||0):(qFoulO[q]||0))>=5;
  /* M19: serbest atış sonrası ribaund. Dönüş: hücum ribaundu alındıysa true. */
  function ftRebound(userPos,B,D,nMade,nAtt,q,t){
    if(nMade>=nAtt) return false;                 /* son atış girdiyse ölü top */
    const rebOff=Math.random()<0.19;              /* serbest atışta hücum ribaundu daha nadir */
    const court=rebOff?(userPos?userCourt:oppCourt):(userPos?oppCourt:userCourt);
    const reb=wPick(court,rebW)||(userPos?(rebOff?uAny():oAny()):(rebOff?oAny():uAny()));
    if(rebOff){ B.reb++; if(userPos) bumpP(reb,'reb',1); else bumpO(reb,'reb',1); }
    else { D.reb++; if(userPos) bumpO(reb,'reb',1); else bumpP(reb,'reb',1); }
    /* Ribaund mücadelesinde sarkma faulü (küçük pay) */
    if(Math.random()<0.09){ (rebOff?D:B).foul++; }
    /* F13-1 (tamamlayıcı): KAÇAN SON SERBEST ATIŞIN ribaundu da anlatılır. Eskiden yalnız
       saha şutlarının ribaundu olay üretiyordu; kaçan serbest atıştan sonra top sessizce
       el değiştiriyor, anlatım karşı takımın şutuna atlıyordu (and-1 sonrası tipik vaka). */
    /* ⚠ SIRA: ftRebound, şut/serbest atış olayı DİZİYE EKLENMEDEN ÖNCE çağrılıyor (and-1'de
       ek atışın sonucu şut cümlesinin içinde). Ribaundu burada eklersek anlatım "ribaund →
       basket" sırasıyla ters okunur. Bu yüzden olay BEKLETİLİR ve _flushReb() ile şuttan
       hemen sonra basılır. */
    /* FAZ 36 §B1: serbest atış ribaundu da aynı kapıdan geçer — rutin savunma ribaundu
       sessiz kalır, hücum ribaundu (ikinci şans) daima anlatılır. İstatistik yukarıda
       zaten yazıldı; kapı YALNIZ anlatım satırını yargılar. */
    if(!rebOff&&!prChance(0.02)) return rebOff;
    try{
      const rebIsUser=rebOff?userPos:!userPos;
      _pendingReb={type:'reb',dt:0,text:adKoy(pickLine(rebOff?REB_OFF_SHORT:REB_DEF_SHORT,pr,narr.recent,rebOff?'rebO':'rebD'),
        {R:_anlatimAdi(reb.isim),T:rebIsUser?MC.home.name:rname}),
        q,t,rebId:reb.id,rebIsUser,rebOff:!!rebOff};
    }catch(e){}
    return rebOff;
  }
  /* Bekleyen serbest atış ribaundunu şut/atış cümlesinden SONRA diziye basar. */
  let _pendingReb=null;
  function _flushReb(){
    if(!_pendingReb) return;
    const e=_pendingReb; _pendingReb=null;
    e.home=homeScore; e.away=awayScore; e.box=snap(); e.qh=cloneQx(qh); e.qa=cloneQx(qa);
    events.push(e);
  }
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
  /* F13-7 yardımcıları: devre arası en skorer + yorgunluk adayı. İkisi de yalnız kutu
     skoru ve stat okur; rastgelelik kullanmaz (maç matematiği etkilenmez). */
  function _devreEnSkorer(){
    let en=null,enP=-1;
    try{
      Object.keys(hB.pl||{}).forEach(id=>{
        const st=hB.pl[id]; if(!st) return;
        const pl=(MC.home.players||[]).find(x=>String(x.id)===String(id));
        if(st.pts>enP){ enP=st.pts; en=pl?pl.isim:null; }
      });
    }catch(e){}
    return (en&&enP>0)?{ad:en,p:enP}:null;
  }
  function _yorgunAday(q){
    try{
      if(q<2) return null;
      /* Sahadaki EN DÜŞÜK dayanıklılıklı oyuncu; eşik 78 (70'te aday çoğu maçta çıkmıyordu). */
      const aday=(userCourt||[]).filter(p=>p&&statN(p,'dayaniklilik')<78);
      if(!aday.length) return null;
      return aday.slice().sort((a,b)=>statN(a,'dayaniklilik')-statN(b,'dayaniklilik'))[0];
    }catch(e){ return null; }
  }

  /* Faz 1-3: sunum (anlatım/senaryo) rastgeleliği için AYRI deterministik üreteç.
     Böylece bağlam/hamle/anti-tekrar seçimleri global Math.random akışını (maç sonucu)
     kirletmez. Seed maça özgü ama deterministik → resume tutarlı üretir. */
  const _seedBase=(Math.abs((MC.home.wins||0)*131+(MC.home.losses||0)*17)+(oppName?oppName.length*7:0)+(userIsHome?3:1))>>>0;
  const pr=_mulberry32(_seedBase||0x9E3779B9);
  const prCh=a=>a[Math.floor(pr()*a.length)];
  const prChance=x=>pr()<x;
  /* Bağlam durumu: seri (cevapsız sayı), oyuncu sıcaklığı (art arda isabet), öneki throttle. */
  const narr={runOff:null,run:0,heat:{},recent:{},ctxCd:0,yorumCd:0,imzaCd:0,
    /* FAZ 36 §B3: MAÇ DÜZEYİNDE tekrar hafızası. `pickLine` yalnız ŞABLON tekrarını
       engelliyor; aynı şablon + aynı oyuncu birleşince ortaya çıkan BİREBİR cümle
       (ör. "Rakibini arkada tuttu, ribaund Furtado'da.") tek maçta 2 kez görülüyordu.
       Burada üretilmiş METİN tutulur, tekrar gelirse yeniden çekilir. */
    said:Object.create(null),
    /* FAZ 36 §B9: bilgi taşımayan dolgu kalıpları maç başına en fazla 1 kez. */
    dolgu:Object.create(null)};
  /* Üreticiyi en çok 4 kez dener, hep görülmüş metin dönerse sonuncuyu kabul eder
     (havuz tükendiyse anlatım susmasın). Yalnız `pr` tüketir — sonuç matematiği değişmez. */
  const benzersiz=(uret)=>{
    let son='';
    for(let i=0;i<4;i++){
      son=uret();
      if(!son) return son;
      if(!narr.said[son]){ narr.said[son]=1; return son; }
    }
    return son;
  };
  /* §B9: "topu yukarı taşı…" ve "…güvene aldı" gibi bilgi taşımayan dolgular. */
  const DOLGU_RE=[{k:'yukari',re:/topu yukarı (taşı|çıkar)/i},{k:'guven',re:/güvene aldı|top güvende/i}];
  const dolguKota=(txt)=>{
    for(const d of DOLGU_RE){
      if(!d.re.test(txt)) continue;
      const n=(narr.dolgu[d.k]||0);
      if(n>=1) return false;
      narr.dolgu[d.k]=n+1;
    }
    return true;
  };
  /* F14-3: yorumcu ~%35 olasılıkla ve en az 5 olay arayla konuşur (ölü toplarda). */
  const yorumEk=(tur)=>{
    try{
      if(narr.yorumCd>0){ narr.yorumCd--; return ''; }
      if(!prChance(0.55)) return '';
      const havuz=(_runPts>=8)?YORUMCU_LINES.seri:(YORUMCU_LINES[tur]||YORUMCU_LINES.tempo);
      narr.yorumCd=4+Math.floor(pr()*3);
      return ' 💬 '+pickLine(havuz,pr,narr.recent,'yorum');
    }catch(e){ return ''; }
  };
  /* F13-3: cevapsız sayı serisi MAÇ düzeyinde tutulur (pozisyon düzeyinde tutulunca her
     pozisyonda sıfırlanıyordu). Serbest atış ve teknik dahil her sayı hareketi buradan geçer. */
  let _runTeam=null,_runPts=0;
  /* F14-1: skor kapısının sayaçları MAÇ düzeyinde tutulur. Pozisyon kapsamında tutulunca
     her pozisyonda sıfırlanıyor ve kapı her sayıda açılıyordu (ölçüm: %53 — hedef <%20). */
  const _scG={cd:0,gapMark:0};
  /* §7.3: saat kapısı ve son-bölüm tonu sayaçları MAÇ düzeyinde durur.
     ⚠ Bu tuzağa iki kez düşüldü (F13-3 `_runTeam`, F14-1 `_scG`): sayaç runPossession
     kapsamında tanımlanırsa her pozisyonda sıfırlanır, cooldown hiç çalışmaz ve kapı
     ya sürekli açık ya sürekli kapalı kalır. `narr` ile aynı kapsamda olmalı. */
  const _saatG={cd:0,say:0,sonQ:0,tonSay:0,tonCd:0};
  /* ── FAZ 34 §6 kapısı ──
     ⚠ SAYAÇLAR MAÇ DÜZEYİNDE (F13-3/F14-1 tuzağı): ilk kurguda blok pozisyon
     fonksiyonunun içindeydi, her pozisyonda sıfırlanıyor ve "3. ribaunt" eşiğine
     HİÇ ulaşılamıyordu (ölçüldü: 40 maçta 0 cümle). _saatG ile aynı kapsamda durur.
     Birikim: oyuncu başına ribaunt/çalma/blok/sayı sayacı tutulur. Eşiği GEÇEN ve
     ilgili statı gerçekten yüksek olan oyuncuda cümle basılır; sonra o kategori o
     oyuncu için susar (tekrar için yeni bir eşik gerekir).
     ⚠ Seçim SUNUM PRNG'si (pr/prChance) ile yapılır — maçın rastgele akışını
     TÜKETMEZ (F13-3/B-5 kuralı). */
  const _uzG={cd:0,say:0,bas:{}};
  const _uzSay=(p,tur)=>{
    if(!p||!p.id) return 0;
    const k=p.id+'|'+tur;
    _uzG.bas[k]=(_uzG.bas[k]||0)+1;
    return _uzG.bas[k];
  };
  /** Uzmanlık/form cümlesi — yoksa boş dize. Olay metnine EK olarak döner. */
  const uzmanGate=(p,tur)=>{
    try{
      if(!p) return '';
      const n=_uzSay(p,tur);
      if(_uzG.cd>0){ _uzG.cd--; return ''; }
      if(_uzG.bas['said|'+p.id+'|'+tur]) return '';   /* bu oyuncu+kategori bir kez */
      let havuz=null;
      const form=macFormu(p);
      if(tur==='reb'&&n>=3&&statN(p,'ribaund')>=85) havuz=UZMAN_RIBAUND;
      else if(tur==='stl'&&n>=2&&statN(p,'topCalma')>=85) havuz=UZMAN_CALMA;
      else if(tur==='blk'&&n>=2&&statN(p,'blok')>=85) havuz=UZMAN_BLOK;
      else if(tur==='sco'&&n>=4&&form>=8) havuz=FORM_SICAK;
      else if(tur==='mis'&&n>=4&&form<=-8) havuz=FORM_SOGUK;
      if(!havuz) return '';
      /* ⚠ prChance BURADA YERELDİR (satır ~3621: const prChance=x=>pr()<x) ve global
         iki argümanlı sürümü gölgeler. İlk kurguda prChance(damga,0.85) yazılmıştı;
         dizge olasılık sanıldı, karşılaştırma hep false döndü ve 40 maçta 0 cümle
         çıktı. Sunum PRNG'si zaten deterministiktir, ayrıca tohum vermeye gerek yok. */
      if(!prChance(0.85)) return '';
      _uzG.bas['said|'+p.id+'|'+tur]=1;
      _uzG.cd=2;
      _uzG.say++;
      return ' '+pickLine(havuz,pr,narr.recent,'uzman');
    }catch(e){ return ''; }
  };

  const _runEkle=(takim,n)=>{ if(n<=0) return; if(_runTeam===takim) _runPts+=n; else { _runTeam=takim; _runPts=n; } };

  /* Serbest atış metni AÇIKÇA "serbest atış" der — saha şutuyla karışmasın. */
  /* Serbest atış metni İKİYE ayrılır: `ftPre` düdük anında, `ftRes` (sonuç) son atış
     çemberden geçtiğinde basılır — spiker artık atış yapılmadan sonucunu söylemez.
     `text` eski birleşik hâliyle birebir aynı kalır (kayıt/özet uyumu). */
  const ftSplit=(pre,res)=>({text:pre+' '+res,ftPre:pre,ftRes:res});
  /* §7.4d: serbest atış satırı neredeyse hep aynıydı — "X serbest atışlarda 2/2 —
     hepsi içeride." 237 olayda 14 kez "serbest atışlarda", 10 kez "hepsi içeride"
     geçiyordu; tabela gibi okunuyordu. Sonuç bilgisi (kaç/kaç) korunur, ifade çeşitlenir.
     Yalnız `pr` kullanır. */
  const FT_TAM=['ikisini de attı.','çizgiden şaşmadı.','iki atış iki sayı.','hepsi içeride.',
    'hata yok.','tereddütsüz, ikisi de girdi.','soğukkanlı bitirdi.'];
  const FT_TAM3=['üçünü de attı.','çizgiden şaşmadı.','üç atış üç sayı.','hepsi içeride.','hata yok.'];
  /* İŞ 6.4: 'yarısı geldi' gibi zorlama kalıplar kalktı; her sonuç kendi doğal diliyle. */
const FT_YARIM=['birini kaçırdı.','sadece birini attı.','ikincisini fileye bıraktı, biri dışarıda.',
  'birini içeri gönderdi, diğeri demirden döndü.','ilkini kaçırdı, ikincisini attı.','çizgide yarım kaldı.'];
  const FT_SIFIR=['ikisi de gitti; seyirci sustu.','ikisi de dışarıda.','ikisini de kaçırdı.','hiçbiri girmedi.'];
  /* TEK ATIŞ (teknik faul) kendi dilini ister: iki atışlık kalıplar burada
     'ikisini de attı' diye yalan söylüyordu. */
  const FT_TEK_VAR=['attı.','tereddütsüz bıraktı, içeride.','çizgiden şaşmadı.','fileyi buldu.'];
  const FT_TEK_YOK=['kaçırdı.','demirden döndü.','çizgide bırakamadı.','fileyi bulamadı.'];
  const ftLine=(nMade,nAtt,who)=>{
    try{
      /* Ad ftPre'de zaten geçiyor ('… Batıkan Bayrak çizgide.'); ftRes'te tam adı
         tekrarlamak olayı 20 kelimeye çıkarıyordu. Kısa ad hem yeterli hem doğal. */
      const kisa=(typeof _anlatimAdi==='function')?_anlatimAdi(who):who;
      const skor=`${kisa} çizgide ${nMade}/${nAtt} —`;
      if(nAtt===1) return skor+' '+pickLine(nMade?FT_TEK_VAR:FT_TEK_YOK,pr,narr.recent,'fttek');
      if(nMade===nAtt) return `${skor} ${pickLine(nAtt>=3?FT_TAM3:FT_TAM,pr,narr.recent,'fttam')}`;
      if(nMade===0)    return `${skor} ${pickLine(FT_SIFIR,pr,narr.recent,'ftsifir')}`;
      return `${skor} ${pickLine(FT_YARIM,pr,narr.recent,'ftyarim')}`;
    }catch(e){ return `${who} çizgide ${nMade}/${nAtt}.`; }
  };

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
    if(botState.run>=Math.max(6,(botC.toRun||8)-2) && botState.to>0 && q>=1 && t>20){
      botState.to--; botState.run=0; botState.dampen=3;
      events.push({type:'mola',off:false,botCoach:true,
        text:`⏸ MOLA — ${rname} oyunu kesti. (${homeScore} - ${awayScore})`,
        q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* (b) SET DEĞİŞİMİ — belirgin geriye düştüyse (2. çeyrek sonrası) agresif sete geçer. */
    if(!botState.switched && q>=3 && (homeScore-awayScore)>=botC.switchGap){
      botState.switched=true;
      botPb=(typeof playbookOf==='function')?playbookOf(botC.panicPb):botPb;
      events.push({type:'tactic',off:false,botCoach:true,
        text:`🔁 ${rname} taktik değiştirdi — ${botPb.ikon||'📋'} ${botPb.ad||'yeni set'} setine geçiyor, farkı kapatmak istiyor. (${homeScore} - ${awayScore})`,
        q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* (c) ROTASYON — yorulan ya da faul yüklenen oyuncusunu dinlendirir (kullanıcıyla simetrik).
       İŞ 3: eşik 20 pozisyondan 11'e indi ve enerji ölçütü eklendi; ölçülen 4,9 değişiklik
       (takım başına) gerçek bandın (8-11) çok altındaydı. */
    if(botState.restCd>0){ botState.restCd--; return; }
    if(botState.posCount>=6 && oppBench.length && oppCourt.length>=5){
      const _restEvery=Math.max(20,Math.min(26,(botC.restEvery||20)+4));
      const _sahaIlk5=oppCourt.filter(p=>p&&_oppIlkBes.has(p.id)).length;
      const tired=(_sahaIlk5<3)
        ? oppCourt.filter(p=>p&&!_oppIlkBes.has(p.id))
        : oppCourt.filter(p=>p&&((p.matchFouls||0)>=3
            ||(Number(p.enerji!=null?p.enerji:100)<56)
            ||(botState.posCount%_restEvery===0)));
      if(tired.length){
        const out=tired.sort((a,b)=>((b.matchFouls||0)-(a.matchFouls||0))||((a.genel||0)-(b.genel||0)))[0];
        const inP=oBenchNext(botState.posCount,_sahaIlk5<3);
        if(out&&inP){
          const ix=oppCourt.indexOf(out);
          if(ix>=0) oppCourt[ix]=inP;
          if(inP&&inP.id) _oppPlayed.add(inP.id);   /* M20 */
          _dinlenmeyeAl(oppBench,out,botState.posCount,6);   /* İŞ 3: dinlenip geri döner */
          botState.restCd=11;
          const why=(out.matchFouls||0)>=3?`${out.matchFouls} faulle`:'dinlenmek için';
          events.push({type:'sub',off:false,botCoach:true,
            text:adKoy(pickLine(SUB_LINES,pr,narr.recent,'sub'),{T:rname,O:out.isim,W:why,I:inP.isim})+` (${homeScore} - ${awayScore})`,
            q,t,home:homeScore,away:awayScore,subOutObj:out,subInObj:inP,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      }
    }
  }
  /* FAZ 1 / M1: pozisyonun TÜKETTİĞİ maç saati (sn) olaylara damgalanır. Canlı oynatım
     gecikmeyi bundan türetir; böylece "15 sn'lik pozisyon 3,5 sn'de oynandı" kopukluğu biter
     ve hız oranı olay tipinden bağımsız sabitlenir. */
  /* F13-17: pozisyonun maç saati maliyeti (dt) o pozisyonun HER olayına ayrı ayrı
     yazılıyordu. Üç olaylı bir pozisyon 3×dt sayılıyor, çeyrek dt toplamı 600 sn yerine
     640-703 çıkıyordu; canlı izlemede de anlatım tabela saatinin gerisine düşüyordu
     (aynı pozisyon üç kez "süre harcıyordu"). Artık maliyet olaylara PAYLAŞTIRILIR;
     kendi dt'sini taşıyan olaylar (ör. ribaund, dt:0) paydan hariçtir. */
  let _pozIx=0;
  /* İŞ 3: KULLANICI TAKIMININ OTOMATİK ROTASYONU (bot ile birebir aynı kural).
     Manuel koçluk açıkken kullanıcı zaten kendi değişikliğini yapar ve maçın kalanı
     yeniden üretilir (`regenerateMatchRemainder`); bu otomatik akış onun yerine
     geçmez, yalnız hiç müdahale edilmeyen maçta kadronun tamamının oynamasını sağlar. */
  /* ── NADİR KURAL OLAYLARI: TEKNİK · SPORTMENLİK DIŞI · MAÇ İÇİ SAKATLIK ────────
     Brif §9 İŞ 4: teknik/sportmenlik dışı maçların %10-20'sinde bir, maç içi
     sakatlık %8-12'sinde bir. Hedef MAÇ başınadır; pozisyon olasılığına
     p = 1-(1-hedef)^(1/POZ) ile çevrilir (POZ = ölçülen pozisyon/maç).
     Brifin kuralı gereği fauller MEVCUT bütçenin içinden çıkar: takım faul
     sayacına ve kutu skora normal faul gibi yazılır, §3'ün faul bandına üstüne
     eklenmez. Tek Math.random() ile üç olay birden kararlaştırılır — rastgele
     akışı pozisyon başına bir adımdan fazla kaydırmamak için. */
  const _NADIR_POZ=162;
  const _pPoz=(hedef)=>1-Math.pow(1-hedef,1/_NADIR_POZ);
  const _P_TEK=_pPoz(0.11), _P_SPO=_pPoz(0.05), _P_SAK=_pPoz(0.10);
  let _nadirSay=0;
  function nadirOlayTick(q,t){
    try{
      if(_nadirSay>=2||t<25) return;                 /* korna anında olay üretme */
      /* KAPI RASTGELELİK TÜKETMEZ: nadir olayın olup olmadığı hash'ten türer
         (prUnit). Math.random() ile sorulsaydı BÜTÜN pozisyonlar bir adım kayar ve
         olay hiç düşmese bile maçın tamamı değişirdi — ölçüldü: sınır üstündeki yedi
         kapı (üçlük bölgeleri, kuyruk dağılımları, uzatma) hep birden oynadı.
         pr (sunum PRNG'si) de kullanılamaz: sonucu etkileyen bir kararı ona bağlamak,
         anlatım değiştiğinde maç sonucunu değiştirir — F13-3'ün tersi. */
      const r=prUnit('nadir|'+(_seedBase||0)+'|'+q+'|'+t+'|'+homeScore+'|'+awayScore);
      const c1=_P_TEK, c2=c1+_P_SPO, c3=c2+_P_SAK;
      if(r>=c3) return;
      if(r<c2){
        /* Teknik (1 atış) ya da sportmenlik dışı (2 atış). Faulü yapan taraf çalınır,
           atışları KARŞI taraf kullanır (FIBA). */
        const spor=(r>=c1), nAtis=spor?2:1;
        const failUser=(Math.random()<0.5);
        const _failKadro=failUser?userCourt:oppCourt;
        const fp=_failKadro.length?ch(_failKadro):null;
        if(failUser) qFoulU[q]=(qFoulU[q]||0)+1; else qFoulO[q]=(qFoulO[q]||0)+1;
        if(!fp) return;
        _nadirSay++;
        const atanKadro=failUser?oppCourt:userCourt;
        const atan=(wPick(atanKadro,pl=>Math.max(0.2,statN(pl,'serbest')/100))||atanKadro[0]);
        if(!atan) return;
        const failB=failUser?hB:aB, atanB=failUser?aB:hB;
        failB.foul++;
        let nMade=0;
        for(let i=0;i<nAtis;i++){ if(failUser?(Math.random()<0.74):ftMake(atan)) nMade++; }
        atanB.ftAtt+=nAtis; atanB.ftMade+=nMade;
        if(nMade){
          if(failUser){ awayScore+=nMade; qa[q]+=nMade; _runEkle('a',nMade); bumpO(atan,'pts',nMade); }
          else { homeScore+=nMade; qh[q]+=nMade; _runEkle('h',nMade); bumpP(atan,'pts',nMade); }
        }
        const on=adKoy(pickLine(spor?SPORTMEN_LINES:TEKNIK_LINES,pr,narr.recent,spor?'spor':'tek'),
                       {S:_anlatimAdi(fp.isim)});
        events.push({type:spor?'sportmenlikDisi':'teknik',
          ...ftSplit(on,ftLine(nMade,nAtis,_anlatimAdi(atan.isim))+' ('+homeScore+' - '+awayScore+')'),
          q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        return;
      }
      /* MAÇ İÇİ SAKATLIK — oyuncu sahayı terk eder, yerine yedek girer.
         Kalıcı sakatlık kaydı maç SONUNDA işlenmeye devam eder (tek kaynak orası);
         burada yalnız maç içi görünürlük ve rotasyon etkisi vardır. */
      const sakUser=(Math.random()<0.5);
      const kadro=sakUser?userCourt:oppCourt;
      if(kadro.length<2) return;
      const sk=ch(kadro);
      if(!sk) return;
      _nadirSay++;
      const yedek=sakUser?benchNext():oBenchNext();
      const ix=kadro.indexOf(sk);
      if(yedek){ if(ix>=0) kadro[ix]=yedek; if(sakUser) subbedIds.add(yedek.id); else if(yedek.id) _oppPlayed.add(yedek.id); }
      else if(ix>=0) kadro.splice(ix,1);
      const ek=yedek?(' Yerine '+_anlatimAdi(yedek.isim)+' girdi.'):' Yedek kalmadı, eksik oynanıyor.';
      const evS={type:'sakatlikMac',
        text:adKoy(pickLine(SAKAT_MAC_LINES,pr,narr.recent,'sakat'),{S:_anlatimAdi(sk.isim)})+ek+' ('+homeScore+' - '+awayScore+')',
        q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)};
      if(sakUser){ evS.subOut=sk.id; evS.subIn=yedek?yedek.id:null; }
      else { evS.subOutObj=sk; evS.subInObj=yedek||null; }
      events.push(evS);
    }catch(e){}
  }
  function rotasyonTick(q,t){
    try{
      userRot.posCount++;
      if(userRot.restCd>0){ userRot.restCd--; return; }
      if(userRot.posCount<6||!benchQueue.length||userCourt.length<5) return;
      const _her=24;
      const sahadakiIlkBes=userCourt.filter(p=>p&&_ilkBes.has(p.id)).length;
      /* Sahada ilk beşten en az ÜÇ oyuncu bulunur; altına düşerse yedek çıkar. */
      const adaylar=(sahadakiIlkBes<3)
        ? userCourt.filter(p=>p&&!_ilkBes.has(p.id))
        : userCourt.filter(p=>p&&((p.matchFouls||0)>=3
            ||(Number(p.enerji!=null?p.enerji:100)<56)
            ||(userRot.posCount%_her===0)));
      if(!adaylar.length) return;
      const out=adaylar.sort((a,b)=>((b.matchFouls||0)-(a.matchFouls||0))
        ||((Number(a.enerji!=null?a.enerji:100))-(Number(b.enerji!=null?b.enerji:100)))
        ||((a.genel||0)-(b.genel||0)))[0];
      const inP=benchNext(userRot.posCount,sahadakiIlkBes<3);
      if(!out||!inP) return;
      const ix=userCourt.indexOf(out);
      if(ix>=0) userCourt[ix]=inP; else return;
      subbedIds.add(inP.id);
      _dinlenmeyeAl(benchQueue,out,userRot.posCount,6);   /* İŞ 3: dinlenip geri döner */
      userRot.restCd=11;
      const why=(out.matchFouls||0)>=3?`${out.matchFouls} faulle`:'dinlenmek için';
      events.push({type:'sub',off:true,
        text:adKoy(pickLine(SUB_LINES,pr,narr.recent,'sub'),{T:MC.home.name,O:out.isim,W:why,I:inP.isim})+` (${homeScore} - ${awayScore})`,
        q,t,home:homeScore,away:awayScore,subOut:out.id,subIn:inP.id,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    }catch(e){}
  }
  /* İŞ 4: KULLANICI KOÇUNUN MOLASI — bot ile aynı kural (rakip seri yaptıysa oyunu keser).
     Canlı maçta kullanıcı kendi molasını da alabilir; bu otomatik akış, hiç müdahale
     edilmeyen maçta molanın hiç görünmemesini engeller. */
  function molaTick(q,t,userGain,oppGain){
    try{
      if(userGain>0) userTo.run=0; else userTo.run+=oppGain;
      if(userTo.run>=6 && userTo.to>0 && t>20){
        userTo.to--; userTo.run=0;
        events.push({type:"mola",off:true,
          text:"⏸ MOLA — "+escMatch(MC.home.name)+" oyunu kesti. ("+homeScore+" - "+awayScore+")",
          q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      }
    }catch(e){}
  }
  function runPossessionV(q,t,dt,poz){
    const s=events.length;
    _pozIx++;
    runPossession(q,t,poz);
    let pay=0;
    for(let i=s;i<events.length;i++){ if(events[i].dt===undefined) pay++; }
    const birim=pay>0?dt/pay:dt;
    for(let i=s;i<events.length;i++){
      if(events[i].off===undefined) events[i].off=_lastOff;
      events[i].pozIx=_pozIx;
      if(poz&&poz.fb) events[i].fbPoz=true;
      if(events[i].dt===undefined){
        events[i].dt=birim;      /* muhasebe: olayın gerçek maç saati payı (çeyrek toplamı=600) */
        events[i].dtPos=dt;      /* SUNUM temposu: pozisyonun tamamı — canlı izleme hızı korunur */
      }
    }
  }
  function runPossession(q,t,poz){
    /* İŞ 2: pozisyon sahibi ve hızlı hücum kararı ARTIK DÖNGÜDE alınır (maliyet onlara
       bağlı). Eski çağrı biçimi (poz yok) korunuyor — sunucu tarafı/eski testler için. */
    const userPos=(poz&&poz.userPos!==undefined)?poz.userPos
                  :((posNext===null)?(Math.random()<0.5):posNext);
    posNext=!userPos;                    /* varsayılan: pozisyon sonunda top rakibe geçer */
    const fromTrans=(poz&&poz.fromTrans!==undefined)?poz.fromTrans:fastNext;
    fastNext=null;
    _lastOff=userPos;
    const roll=Math.random();
    const B=userPos?hB:aB, D=userPos?aB:hB;
    /* İŞ 4: ŞUT SAATİ İHLALİ — pozisyon şutsuz biter, top kaybı yazılır. */
    if(poz&&poz.ihlal24){
      B.to++;
      const _ih=userPos?(wPick(userCourt,usageWU)||uAny()):(wPick(oppCourt,usageWO)||oAny());
      events.push({type:'ihlal24',text:adKoy(pickLine(IHLAL24_LINES,pr,narr.recent,'ihl24'),
        {T:userPos?MC.home.name:rname,S:_anlatimAdi(_ih.isim)})+` (${homeScore} - ${awayScore})`,
        q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    const defenderIsUser=!userPos;
    let shooter=null,putback=false;
    if(shooterHint&&((userPos?userCourt:oppCourt).indexOf(shooterHint)>=0)){ shooter=shooterHint; putback=true; }
    shooterHint=null;
    if(!shooter) shooter=userPos?uShooter():oShooter();
    const sc=()=>`(${homeScore} - ${awayScore})`;
    /* F14-1: SKOR KAPISI — gerçek Türkçe anlatımda skor tüm maçta ~6-8 kez söylenir,
       her sayıda değil. Mevcut sistem her sayı cümlesinin sonuna %SC koyuyordu; ölçülen
       en büyük sahtelik kaynağı buydu. Kapı yalnız anlamlı anlarda açılır (son 2 dk,
       çeyrek kapanışı, büyük seri, ilk kez çift hane/20 fark, periyodik hatırlatma);
       aksi halde boş string döner ve %SC yer tutucusu temizlenir.
       ⚠ Yalnız `pr` (sunum PRNG'si) kullanılır — maç sonucu etkilenmez. */
    const scGate=(qq,tt)=>{
      try{
        const gap=Math.abs(homeScore-awayScore);
        let ac=false;
        if(qq>=4&&tt<=120)                 ac=true;   /* son 2 dakika */
        else if(tt<=25)                    ac=true;   /* çeyrek kapanışı */
        else if(_runPts>=8)                ac=true;   /* büyük cevapsız seri */
        else if(gap>=20&&_scG.gapMark<20)  ac=true;   /* ilk kez 20 fark */
        else if(gap>=10&&_scG.gapMark<10)  ac=true;   /* ilk kez çift hane */
        else if(_scG.cd<=0)                ac=true;   /* periyodik hatırlatma */
        if(ac){
          _scG.cd=6+Math.floor(pr()*5);
          if(gap>=20) _scG.gapMark=20; else if(gap>=10) _scG.gapMark=Math.max(_scG.gapMark,10);
          return sc();
        }
        _scG.cd--; return '';
      }catch(e){ return ''; }
    };
    /* §7.3a: SAAT KAPISI — hedef %6-14 arası olayda saat geçsin, rastgele değil anlamlı
       anlarda. Cooldown maç düzeyinde (`_saatG`) tutulur; scGate ile aynı desen. */
    const saatGate=(qq,tt)=>{
      try{
        const gap=Math.abs(homeScore-awayScore);
        /* Ağırlıklar ÖLÇÜLEREK ayarlandı. Maç başına 250 olay var, hedef %6-14 = 15-35
           satır. Saat kapısı yalnız şut olaylarına takılı; aday şut sayısı maç başına
           ~38 (t≤30: 8,8 · t≤120: 17,8 · 4Ç yakın skor: ~12). İlk denemede ağırlıklar
           0,85/0,35/0,30 ve cooldown 3-6 idi → %2,4 çıktı, aday havuzunun küçüklüğü
           hesaba katılmamıştı. */
        /* §7.3c: çeyreğin SON olayında saat mutlaka geçer — cooldown'ı da atlar.
           Bu, "4. çeyreğin son 3 dakikası 1. çeyrekle aynı tonda" şikâyetinin
           en görünür yeri; kapanış anı hiçbir koşulda sessiz kalmamalı. */
        if(tt<=10){ _saatG.cd=0; _saatG.say++; return ' '+pickLine(SAAT_QSON,pr,narr.recent,'saat'); }
        let agirlik=0;
        if(tt<=30)                      agirlik=0.92;  /* çeyrek sonuna 30 sn — en sık */
        else if(tt<=120)                agirlik=0.62;  /* çeyrek sonuna 2 dk */
        else if(qq>=4&&gap<=6)          agirlik=0.55;  /* son çeyrek, maç başa baş */
        if(!agirlik) return '';
        if(_saatG.cd>0){ _saatG.cd--; return ''; }
        if(!prChance(agirlik)) return '';
        _saatG.cd=1+Math.floor(pr()*2);
        _saatG.say++;
        return ' '+pickLine(tt<=30?SAAT_QSON:SAAT_LINES,pr,narr.recent,'saat');
      }catch(e){ return ''; }
    };
    /* §7.3b: SON BÖLÜM TONU — 4. çeyrek son 3 dakikada farka göre gergin/yatışmış.
       Mevcut cümlelerin YERİNE değil YANINA eklenir. Maç başına ≥3 hedefi var, bu
       yüzden cooldown kısa (2 olay) ve olasılık yüksek. */
    const tonGate=(qq,tt)=>{
      try{
        if(qq<4||tt>180) return '';
        const gap=Math.abs(homeScore-awayScore);
        if(gap>6&&gap<15) return '';                   /* arası: normal ton */
        if(_saatG.tonCd>0){ _saatG.tonCd--; return ''; }
        /* Ölçüm: cd=2 · p=0,55 ile maç başına 2,4 satır çıktı (hedef ≥3). 4Ç son 3 dk'da
           ~21 olay var ama hepsi şut/ribaund değil ve fark 7-14 aralığındaysa ton hiç
           basılmaz — bu yüzden kalan adaylarda oran yüksek tutulur. */
        if(!prChance(0.78)) return '';
        _saatG.tonCd=1;
        _saatG.tonSay++;
        return ' '+pickLine(gap<=6?SON_BOLUM.gergin:SON_BOLUM.yatismis,pr,narr.recent,'ton');
      }catch(e){ return ''; }
    };
    /* F13-3: seri sayacı SKORDAN beslenir. Eskiden `narr.run` yalnız sahadan atılan
       sayıları topluyor, serbest atışları ve teknikleri kaçırıyor, üstüne metin
       kurulurken bir basket GERİDEN okunuyordu: skor 13-0 iken anlatım "9-0" diyordu.
       Artık her sayı hareketi buradan geçiyor; iddia her zaman tabelayla tutuyor. */
    const addU=(n)=>{ homeScore+=n; qh[q]+=n; _runEkle('h',n); };
    const addO=(n)=>{ awayScore+=n; qa[q]+=n; _runEkle('a',n); };
    const addPts=(n)=>{ if(userPos) addU(n); else addO(n); };
    /* SON DAKİKA TAKTİK FAULÜ — hücumdaki (önde olan) takım çizgiye gider. */
    if(poz&&poz.taktikFaul){
      D.foul++; const _tf=recordFoul(!userPos,q,t);   /* faulü savunmadaki takım yapar */
      const _sut=userPos?(wPick(userCourt,p=>Math.max(0.2,statN(p,'serbest')/100))||uAny())
                        :(wPick(oppCourt,p=>Math.max(0.2,statN(p,'serbest')/100))||oAny());
      let nMade=0;
      if(userPos){ if(ftMake(_sut))nMade++; if(ftMake(_sut))nMade++; }
      else { if(Math.random()<0.74)nMade++; if(Math.random()<0.74)nMade++; }
      B.ftAtt+=2; B.ftMade+=nMade;
      addPts(nMade); if(userPos) bumpP(_sut,'pts',nMade); else bumpO(_sut,'pts',nMade);
      if(ftRebound(userPos,B,D,nMade,2,q,t)) posNext=userPos;
      const lineX=offLeftAtQ(userPos,q,userIsHome)?210:730;
      events.push({type:'free',sid:_sut.id!=null?_sut.id:undefined,
        ...ftSplit(`⏱ ${foulPrefix(_tf)} — taktik faul, ${_sut.isim} çizgide.`,
                   `${ftLine(nMade,2,_sut.isim)} ${sc()}`),
        q,t,home:homeScore,away:awayScore,
        shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},
               {x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      _flushReb();
      return;
    }

    /* Faz 3 — Pres savunması: rakip pozisyonunda akış dışı ekstra top kaybı (kullanıcı çalar). */
    if(!userPos && defPressTO>0 && Math.random()<defPressTO){
      const stealer=wPick(userCourt,stlW)||uAny();   /* FAZ A: kilit savunmacı çalar */
      /* F13-6: topu KAYBEDEN de söylenir — "kimden aldı?" sorusu ekranda kalmasın.
         ⚠ Seçim SUNUM PRNG'si (pr) ile yapılır: `wPick`/`oAny` Math.random tüketir ve maç
         sonucunun rastgele akışını kaydırırdı (band.js hash'i değişirdi). Anlatım seçimi
         maç matematiğini asla etkilememeli. */
      const _lcand=(oppCourt||[]).slice().sort((a,b)=>statN(a,'topSurme')-statN(b,'topSurme')).slice(0,3);
      const _loser=_lcand[Math.floor(pr()*_lcand.length)]||_lcand[0]||oppCourt[0];
      B.to++; D.stl++;
      fastNext='steal';
      events.push({type:'steal',text:`🔥 Pres tuttu — ${_loser.isim} pasını kontrol edemedi, ${stealer.isim} topu çaldı! ${sc()}`,q,t,home:homeScore,away:awayScore,stealId:stealer.id,stealIsUser:true,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }
    /* Faz 3 — Hızlı hücum: acele şutta kullanıcı pozisyonunda ekstra top kaybı riski. */
    if(userPos && offRushTO>0 && Math.random()<offRushTO){
      const stealer=wPick(oppCourt,stlW)||oAny();    /* FAZ A: kilit savunmacı çalar */
      /* F13-6 (aynı gerekçe): sunum PRNG'si ile seçilir, maç akışı kirlenmez. */
      const _lcand=(userCourt||[]).slice().sort((a,b)=>statN(a,'topSurme')-statN(b,'topSurme')).slice(0,3);
      const _loser=_lcand[Math.floor(pr()*_lcand.length)]||_lcand[0]||userCourt[0];
      B.to++; D.stl++;
      fastNext='steal';
      /* F13-6: iki taraflı — kaybeden + kapan. */
      events.push({type:'steal',text:`⚡ Erken hücumda hata — ${_loser.isim} topu elinden kaçırdı, ${stealer.isim} kaptı. ${sc()}`,q,t,home:homeScore,away:awayScore,stealId:stealer.id,stealIsUser:false,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      return;
    }

    if(roll<0.700){
      /* Saha içi şut denemesi. Hızlı hücum: çalma/savunma ribaundu sonrası her iki takım
         için doğal olarak tetiklenir; kullanıcının hızlı tempo/odak seçimi ihtimali artırır. */
      /* Hızlı hücum GERÇEK basketboldaki gibi seyrek: çoğu top çalma/savunma ribaundu
         SAKİN yarı saha hücumuna döner. Eski oranlar (0.55/0.25) "sürekli hızlı hücum"
         hissi veriyordu; düşürüldü (çalma sonrası ~0.32, ribaund sonrası ~0.12). */
      /* FAZ 38 §İŞ 2: FAZ 37'nin SUNUM genişlemesi buraya katıldı — tek bayrak. Taban:
       çalma sonrası yüksek, savunma ribaundu sonrası orta, rakip sayısı sonrası düşük
       ('erken hücum'). */
    /* ⚠ ÖLÜ DEĞİL AMA YEDEK: karar pozTuru()'da veriliyor; bu dal yalnız poz parametresi
       verilmeyen eski çağrı biçimi için duruyor (sunucu tarafı / eski testler). */
    let fbCh=fromTrans==='steal'?0.62:fromTrans==='reb'?0.34:0.06;
      if(fbCh&&userPos&&(tempo==='hizli'||odak==='hizli')) fbCh=Math.min(0.80,fbCh*1.7);
      if(fbCh&&userPos&&tempo==='yavas') fbCh*=0.5;
      if(fbCh&&userPos&&pb.fbMul) fbCh=Math.min(0.88,fbCh*pb.fbMul);   /* FAZ B: Erken Hücum seti */
      /* ── FAZ 38 §İŞ 2: TEK HIZLI HÜCUM BAYRAĞI ───────────────────────────────────
         FAZ 37'de bayrak İKİYE bölünmüştü (`fbMat` matematik / `fb` sunum) çünkü o
         paketin kırmızı çizgisi sonuç matematiğine dokunmayı yasaklıyordu. FAZ 38'de
         çizgi kalktı ve ayrım ZARARLI hâle geldi: sunum hızlı hücumu maç saatinde
         13-21 sn sürüyor, yani ekranda '⚡ Hızlı hücum!' yazarken pozisyon set hücumu
         kadar uzun oluyordu (ölçüldü: fb ortalaması 11,2 sn). Karar artık `pozTuru()`
         içinde, MALİYETTEN ÖNCE ve TEK yerde veriliyor. */
      const fbMat=!putback&&((poz&&poz.fb!==undefined)?poz.fb:(Math.random()<fbCh));
      /* FAZ A: üçlük denemesi artık ŞUTÖRÜN eğilimine bağlı. Sahadaki 5'in ortalamasına
         normalize edildiği için TAKIMIN üçlük payı (userIs3Oran / 0.32) korunur; değişen,
         o denemeyi kimin yaptığı — şutör rolü dışarıdan, pivot boyalı alandan oynar. */
      const _court3=userPos?userCourt:oppCourt;
      let _is3p=userPos?userIs3Oran:Math.max(0.08,Math.min(0.68,(0.44+(botPb.is3||0))*(dset.opp3Rate!=null?dset.opp3Rate:1)));
      if(!putback&&_court3.length){
        const _avgUc=_court3.reduce((q,p)=>q+_eg(p,'uc'),0)/_court3.length;
        if(_avgUc>0) _is3p=Math.max(0.03,Math.min(0.74,_is3p*(_eg(shooter,'uc')/_avgUc)));
      }
      /* §İŞ 2: hızlı hücum ÇEMBERE gider — üçlükle bitmesi istisnadır. Bayrak artık
         is3'ten ÖNCE bilindiği için oran doğrudan kısılabiliyor (FAZ 37'de bayrak
         sonradan kurulduğu için bu mümkün değildi). */
      if(fbMat) _is3p*=0.42;
      /* Son dakika: geride kalan takım hücumdayken üçlük zorlar (farkı tek pozisyonda
         kapatmak için) — gerçek maçın son dakika görüntüsü budur. */
      if(q>=4&&t<=24){   /* uzatma da bir SON bölümdür: kapanış şut seçimi orada da geçerli */
        const _f=userPos?(homeScore-awayScore):(awayScore-homeScore);
        if(_f===-3) _is3p=1;          /* üç farkla geride: uzatmaya götüren şut */
        else if(_f===-2||_f===-1) _is3p=0.12;   /* iki sayı yeter, üçlük zorlamaz */
      }
      if(q>=4&&t<=125){
        const _f=userPos?(homeScore-awayScore):(awayScore-homeScore);
        if(_f<=-3&&_f>=-11) _is3p=Math.min(0.90,_is3p*2.2);
      }
      const is3=putback?false:Math.random()<_is3p;
      const fb=fbMat;
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
      /* M20: rakip isabeti de şutörün KENDİ statından/enerjisinden/moralinden geçer.
         Taban değerler korunur; oyuncu kalitesi artık her iki tarafta da fark yaratır. */
      const oppBase=(is3?(0.336+(botPb.acc3||0))*defOppAcc3Mul:(0.468+(botPb.acc2||0))*defOppAcc2Mul)*oMul*markMul;
      const oppAcc=shooterAcc(shooter,is3,oppBase,clutch,false);
      const acc=userPos?shooterAcc(shooter,is3,is3?0.335+acc3:0.479+acc2,clutch,true):oppAcc;
      /* Ev avantajı (eski %53 pozisyon payının yerine, isabete taşındı) + hızlı hücumda kolay sayı. */
      let accF=acc*((userPos===userIsHome)?1.03:0.97);
      if(userPos&&botState.dampen>0) accF*=0.93;   /* FAZ C: rakip molası kullanıcının serisini keser */
      if(fbMat&&!is3) accF+=0.07;   /* §5: prim MATEMATİK bayrağına bağlı — sunum genişlemesi isabeti değiştirmez */
      const made=Math.random()<Math.max(0.14,Math.min(0.72,accF));
      /* Putback: pota dibinden ikinci şans — şut noktası çembere yapışık. */
      let xy;
      if(putback){
        const rm=(userPos===userIsHome)?RIM_L:RIM_R, dr=(userPos===userIsHome)?1:-1;
        const an=rand(-75,75)*Math.PI/180, rr=rand(14,58);
        xy={x:rm[0]+dr*Math.cos(an)*rr,y:rm[1]+Math.sin(an)*rr};
      } else xy=randShotXY(offLeftAtQ(userPos,q,userIsHome),is3,made,shooter.poz);
      const pts=is3?3:2;
      let passer=null;
      if(made){
        if(userPos){ const pp=userCourt.filter(p=>p&&p.id!==shooter.id); if(pp.length&&Math.random()<(0.64+offAstBonus)) passer=wPick(pp,astW)||ch(pp);   /* FAZ A: asist oyun kurucudan */ }
        else { const op=oppCourt.filter(p=>p&&p.id!==shooter.id); if(op.length&&Math.random()<Math.max(0.25,Math.min(0.88,0.59+(botPb.ast||0)))) passer=wPick(op,astW)||ch(op); }
        if(passer&&passer.isim===shooter.isim) passer=null;
      }
      if(is3){ B.thrAtt++; if(made) B.thrMade++; } else { B.twoAtt++; if(made) B.twoMade++; }
      if(made){
        addPts(pts);
        if(userPos){ bumpP(shooter,'pts',pts); if(passer){ B.ast++; bumpP(passer,'ast',1); } }
        else { bumpO(shooter,'pts',pts); if(passer){ B.ast++; bumpO(passer,'ast',1); } }
      }
      /* And-1 (yalnızca isabetli 2 sayıda) */
      let and1=false, and1Made=false, _and1Foul='';
      const _dFoulMul=defenderIsUser?(dset.foul!=null?dset.foul:1):1;   /* FAZ B: pres faul riski ↑, pack ↓ */
      if(made&&!is3&&Math.random()<0.085*_dFoulMul){   /* M18: and-1 %12 → %8,5 */
        and1=true; B.ftAtt++; D.foul++; const _fp=recordFoul(defenderIsUser,q,t);
        /* F13-5: and-1 faulü de sayaca yazılıyordu ama anlatımda görünmüyordu; oyuncunun
           kişisel faul dizisi "1 → 3" gibi atlamalı görünüyordu. */
        _and1Foul=foulPrefix(_fp);
        and1Made=ftMake(shooter);   /* M20: rakip de kendi serbest atış statından */
        if(and1Made){ B.ftMade++; addPts(1); if(userPos) bumpP(shooter,'pts',1); else bumpO(shooter,'pts',1); }
        else if(ftRebound(userPos,B,D,0,1,q,t)) posNext=userPos;
      }
      /* Kaçan turnikede savunma faulü → 2 serbest atış */
      if(!made&&!is3&&Math.random()<0.095*_dFoulMul){  /* M18: kaçan turnikede faul %15 → %9,5 */
        let nMade=0;
        if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++;   /* M20: iki taraf da aynı yoldan */
        B.ftAtt+=2; B.ftMade+=nMade; D.foul++; const _fp=recordFoul(defenderIsUser,q,t);
        if(ftRebound(userPos,B,D,nMade,2,q,t)) posNext=userPos;
        addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
        const lineX=offLeftAtQ(userPos,q,userIsHome)?210:730;
        events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(`${foulPrefix(_fp)} · `+pickLine([`${shooter.isim} şutta faul aldı.`,`${shooter.isim} şutta faul aldı, çizgide.`,`şut faulü — ${shooter.isim}, 2 atış.`,`${shooter.isim} bindirmede faul kazandı.`],pr,narr.recent,'ftsf'),`${ftLine(nMade,2,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
          shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
          box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        _flushReb();
        return;
      }
      /* Madde 20: kaçan 3 sayı denemesinde savunma faulü → 3 serbest atış */
      if(!made&&is3&&Math.random()<0.05*_dFoulMul){    /* M18: üçlükte faul %8 → %5 */
        let nMade=0;
        for(let k=0;k<3;k++){ if(userPos?ftMake(shooter):(Math.random()<0.74)) nMade++; }
        B.ftAtt+=3; B.ftMade+=nMade; D.foul++; const _fp=recordFoul(defenderIsUser,q,t);
        if(ftRebound(userPos,B,D,nMade,3,q,t)) posNext=userPos;
        addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
        const lineX=(userPos===userIsHome)?204:736;
        events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(`${foulPrefix(_fp)} · ${shooter.isim} üçlükte faul aldı — 3 atış:`,`${ftLine(nMade,3,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
          shots:[{x:lineX+rand(-8,8),y:236,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-8,8),y:250,made:nMade>=2,isHome:userPos,kind:'ft',q},{x:lineX+rand(-8,8),y:264,made:nMade>=3,isHome:userPos,kind:'ft',q}],
          box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        _flushReb();
        return;
      }
      /* Blok / ribaund (kaçan şutlarda) */
      let blocked=false, blk=null;
      if(!made&&Math.random()<0.108){ blocked=true; blk=(userPos?(wPick(oppCourt,blkW)||oAny()):(wPick(userCourt,blkW)||uAny())); D.blk++; }  /* FAZ A: pota altı karartıcı bloklar */
      let rebounder=null, rebOff=false;
      if(!made){
        /* SON SANİYE CAM SÜPÜRME: 4Ç'nin son 30 saniyesinde 1-3 sayı geride olan
           takım hücum ribaundu için herkesle potaya yüklenir; önde olan geri çekilip
           savunma ribaundunu garantiler. Uzatma oranını yükselten GERÇEK mekanizma
           budur: farkı büyütmeden (kimseye bedava sayı vermeden) yalnız beraberliğe
           götüren ikinci şansı doğurur. Normal dağılımın öngördüğü tavan (%2,9) bu
           tür son dakika yığılması olmadan aşılamaz — ölçüldü. */
        let _orbP=0.26;
        if(q>=4&&t<=30){
          const _fk=userPos?(homeScore-awayScore):(awayScore-homeScore);
          if(_fk<=-1&&_fk>=-3) _orbP=0.46; else if(_fk>=1&&_fk<=3) _orbP=0.16;
        }
        rebOff=Math.random()<_orbP;
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
      const rimIsLeft=offLeftAtQ(userPos,q,userIsHome);
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
      /* ── FAZ 26 §1: ŞUT TİPİ ── Bölge tek başına yetmiyordu: pota dibindeki her şut aynı
         yayla, aynı sürede ve aynı dille (hep "turnike") oynuyordu; smaç diye bir şey yoktu.
         Tip bir SUNUM kararıdır — isabeti, sayıyı, kutu skoru DEĞİŞTİRMEZ; yalnız topun
         yörüngesini, şutörün sıçramasını ve spiker sözcüklerini seçer.
         ⚠ Karar `pr` (sunum PRNG'si) üzerinden verilir (F13-3): `rand()`/`Math.random`
         kullanılırsa maçın rastgele akışı kayar ve `band.js` hash'i değişir.
           smac    — pota dibinden yukarıdan bitiriş (uzun/kanat, açık, hızlı hücum)
           turnike — pota dibi/boya, çemberi yalayan yumuşak bitiriş
           floater — boyada kısa parabol; guard'ın uzunların üstünden attığı şut
           jumper  — orta mesafe sıçrama şutu
           uc      — yay dışı */
      let sut;
      if(is3) sut='uc';
      else if(zone==='midrange') sut='jumper';
      else {
        const _big=(shooter.poz==='C'||shooter.poz==='PF');
        const _wing=(shooter.poz==='SF');
        /* FAZ 28 §2: TIP-IN — hücum ribaundu çemberin dibinde tek dokunuşla tamamlanır.
           Zaten `putback` bayrağı vardı ama sunumda turnikeden ayrışmıyordu. */
        if(putback&&zone==='rim'&&prChance(0.55)) sut='tipin';
        /* FAZ 28 §2: KANCA — postta sırtı dönük uzunun omuz üstü şutu. Yalnız postup
           şemasında ve uzun oyuncuda anlamlıdır; guard kanca atmaz. */
        else if(scheme==='postup'&&_big&&prChance(0.16)) sut='kanca';   /* §6: %6,3 → hedef %1,5-3 */
        else {
        /* Gerçekte smaçların neredeyse tamamı ÇEMBER bölgesinden ve uzunlardan gelir;
           boyanın dışından smaç istisnadır. Kaçan smaç nadirdir (top çemberden döner
           değil, tutulur) — kaçışta oran düşürülür. */
        let _dp=(zone==='rim')?(_big?0.33:_wing?0.21:0.085):(_big?0.035:0.010);   /* §6: smaç payı %9,2 → hedef %5-7 */
        if(fb) _dp+=0.14;                       /* hızlı hücumda serbest koşu */
        if(contest==='heavy') _dp*=0.45;
        if(!made) _dp*=0.55;
        if(prChance(_dp)) sut='smac';
        /* Floater guard/kanat işidir ve boyada anlamlıdır — pivot floater atmaz. */
        else if(!_big&&zone==='paint'&&prChance(0.79)) sut='floater';   /* §6: floater %3,9 → hedef %8-10 */
        else sut='turnike';
        }
      }
      const play={scheme,zone,sut,is3:!!is3,shooterId:shooter.id!=null?shooter.id:undefined,passerId:(passer&&passer.id!=null)?passer.id:undefined,move,contest,result:blocked?'block':and1?'and1':made?'make':'miss'};
      /* Faz 3: bağlam öneki (seri/fark/sıcaklık/kritik) — seçili ve throttled (spam değil). */
      let ctxPre='';
      if(made){
        narr.ctxCd=(narr.ctxCd||0)-1;
        const mg=Math.abs(homeScore-awayScore), hh=narr.heat[shooter.id]||0, cand=[];
        /* Seri iddiası yalnız SAYI ATAN taraf seride ise ve skorla birebir tutuyorsa. */
        const _seriBenim=(_runTeam===(userPos?'h':'a'));
        if(_seriBenim&&_runPts>=8) cand.push(`🔥 ${_runPts}-0'lık seri!`);
        else if(mg>=18) cand.push(`Fark açıldı — ${mg} sayı.`);
        if(hh>=3) cand.push(`${_anlatimAdi(shooter.isim)} üst üste ${hh}. isabetini buldu!`);
        if(clutch&&mg<=4) cand.push('Başa baş gidiyor!');
        /* ⚠ `rand(3,6)` MAÇ rastgeleliğini tüketiyordu: anlatım bağlam öneki ne sıklıkta
           çıkarsa maçın rastgele akışı o kadar kayıyordu (F13-3 seri düzeltmesi hash'i bu
           yüzden değiştirdi). Sunum kararları yalnız sunum PRNG'sini (pr) kullanmalı. */
        if(cand.length&&narr.ctxCd<=0){ ctxPre=prCh(cand)+' '; narr.ctxCd=3+Math.floor(pr()*4); }
      }
      /* Hamle ibaresi yalnız gerçekten yapılan (play.move) hamleye uygun; move dolu değilse
         asla move ibaresi çıkmaz (söz/görüntü tutarlı). */
      const movePhrase=(move&&MOVE_BY[move]&&prChance(0.5))?(pickLine(MOVE_BY[move],pr,narr.recent,'mv')+' '):'';
      /* F14-2: pozisyonların ~%40'ı kısa parçalı zincirle anlatılır. Hamle ibaresi ya da
         asist öneki zaten varsa zincir kullanılmaz (iki ritim üst üste binmesin). */
      /* Asistli pozisyonlarda zincir kullanılmadığı için etkin oran seçilen olasılığın
         altında kalıyor; ölçüm 0,40 ile %25 verdi (hedef %30-50) → 0,55.
         §7.4a: hedef %50-60'a çıkarıldı (gerçek anlatımın temel birimi 2-5 kelimelik
         parçadır); 0,55 ile ölçülen %35,4 idi → 0,80. */
      const _zincirMod=prChance(0.95);
      /* §8 kapısı için zincir oranı METİNDEN tahmin edilemiyor: kısa ad kullanımı
         (§7.4a) normal cümleleri de 'kısa ilk yan cümle' kalıbına sokuyor ve regex
         tabanlı ölçüm %64 gibi yanlış bir sayı veriyordu. Bayrak üreticinin kendi
         kararını taşır — ölçüm tahmine değil olguya bakar. */
      /* ── FAZ 37 §3/§4: İKİ BEAT ─────────────────────────────────────────────────────
         BEAT 1 (preText, top elden çıkarken): bağlam + kurulum/şema + asist + ŞUTÖR + eylem.
         BEAT 2 (text, top çemberde): yalnız SONUÇ + skor (+ imza + saat/ton).
         Eski tasarımda kurulum/çalım/asist SONUÇ beat'inde geliyordu; izleyici önce şutu,
         sonra şuta giden hamleyi duyuyordu. Kronoloji artık doğru.
         §4.2 AD KURALI: pozisyonda ilk anılan TAM ad, sonraki anmalar SOYAD; aynı cümlede
         iki oyuncu varsa ikisi de aynı biçimde (asist ibaresi soyad kullanır → şutör de
         soyad). Bu, "Rychlík … Benjamin Ouellet" karışıklığını bitirir. */
      const _adIlk={};                       /* pozisyon içi ad hafızası */
      const _ad=(isim)=>{
        try{
          const tam=String(isim||'');
          if(!tam) return tam;
          if(_adIlk[tam]) return _anlatimAdi(tam);
          _adIlk[tam]=1; return tam;
        }catch(e){ return isim; }
      };
      /* Asist varsa iki ad aynı biçimde olsun: ikisi de SOYAD (kısa, hızlı ritim). */
      const _ikili=!!passer;
      const _adS=_ikili?_anlatimAdi(shooter.isim):_ad(shooter.isim);
      const _adP=passer?_anlatimAdi(passer.isim):'';
      const pasTxt=passer?assistPhrase(_adP,scheme,pr,narr.recent):'';
      /* Kurulum ibaresi: şemaya göre. Asist ya da hamle ibaresi zaten varsa kurulum
         eklenmez — bir olayda EN FAZLA İKİ CÜMLE kuralı (§4.4). */
      let kurTxt='';
      if(!pasTxt&&!movePhrase&&!ctxPre){
        const kurHavuz=(scGate(q,t)&&prChance(0.30))?SUT_KURULUM_SAAT
                       :(SUT_KURULUM[scheme]||SUT_KURULUM.def);
        kurTxt=pickLine(kurHavuz,pr,narr.recent,'kur'+(scheme||'d'))+' ';
      }
      /* Şut eylemi: tip + bölge iddiası burada (§4.5). */
      const eylem=adKoy(pickLine(_eylemHavuz(sut,zone,is3),pr,narr.recent,'eyl'+(is3?zone:(sut||'d'))),{S:_adS});
      let onTxt=_birlestir(movePhrase+pasTxt+kurTxt,eylem,[shooter.isim,passer&&passer.isim,_adS,_adP]);
      let _zincirKul=true;                   /* iki beat = zincir ritmi (yapısal) */
      let txt;
      if(blocked){
        /* Blokta sonuç beat'i bloğun sahibini söyler — sonuç bilgisi odur. */
        txt=spikerLinePR(SP.id,'block',{s:_anlatimAdi(shooter.isim),b:_anlatimAdi(blk.isim),uzak:is3},pr,narr.recent)+uzmanGate(blk,'blk');
      } else if(and1){
        txt=`faule rağmen içeride — ${and1Made?'devam sayısı tamam!':'ek atış kaçtı.'} (${_and1Foul}) ${sc()}`;
      } else {
        txt=pickLine(_sonucHavuz(SP.id,made,sut),pr,narr.recent,'son'+(made?'i':'k')+SP.id);
        if(made) txt=txt+' '+sc();
      }
      /* FAZ 34 §6: sıcak/soğuk gece — 4. isabet / 4. ıskadan sonra, formu uçta olan
         oyuncuda bir kez. */
      txt=txt+uzmanGate(shooter,made?'sco':'mis');
      /* §3: bağlam öneki ve hızlı hücum/ikinci şans etiketi KURULUM beat'ine aittir —
         ikisi de şuttan ÖNCE bilinen bilgilerdir. */
      onTxt=ctxPre+onTxt;
      /* §5.4: "⚡ Hızlı hücum!" etiketi her fast break'te değil ~%40'ında. */
      if(fb&&prChance(0.40)) onTxt='⚡ Hızlı hücum! '+onTxt;
      else if(putback) onTxt='İkinci şans! '+onTxt;
      /* §7.3: saat referansı ve son-bölüm tonu SONUÇ beat'inin sonuna eklenir. */
      txt+=saatGate(q,t)+tonGate(q,t);
      /* Faz 3: seri + sıcaklık takibi (yalnız karşılaştırma/sayaç — sonuç randomu değişmez). */
      if(made){
        if(narr.runOff!==userPos){ narr.runOff=userPos; narr.run=pts; } else narr.run+=pts;
        narr.heat[shooter.id]=(narr.heat[shooter.id]||0)+1;
      } else { narr.heat[shooter.id]=0; }
      /* F14-3: imza, sıcaklık/seri sayaçları güncellendikten SONRA uygulanır — aksi halde
         eşikler bir olay geç tetiklenir. */
      if(made){
        try{
          const _st=((userPos?pstats:ostats)[shooter.id])||{};
          if(narr.imzaCd>0) narr.imzaCd--;
          txt=spikerImza(SP,txt,{ad:shooter.isim,heat:narr.heat[shooter.id]||0,
                                 pts:_st.pts||0,run:_runPts||0,cd:narr.imzaCd||0,
                                 vur:()=>{ narr.imzaCd=8; }},pr,narr.recent);
        }catch(e){}
      }
      /* §3: ön parça artık kurulum+asist+eylemi taşır; sonuç beat'i ona zincirle bağlanır. */
      events.push({type:made?(is3?'score3':'score2'):(is3?'miss3':'miss2'),text:txt,preText:onTxt,chain:true,play,shot:{x:xy.x,y:xy.y,made,isHome:userPos,kind:is3?'3':'2',q,fb:fb||undefined,pb:putback||undefined,blk:blocked||undefined,/* FAZ 34 §5: bloğun SAHİBİ de kaydedilir — blok yalnız takım
         toplamında (D.blk) duruyordu, oyuncuya atfedilemiyordu ve "blok statı sahaya
         yansıyor mu" ölçülemiyordu. */blkId:(blocked&&blk&&blk.id!=null)?blk.id:undefined,scheme,zone,sut,move:move||undefined,contest,sid:shooter.id!=null?shooter.id:undefined,pid:(passer&&passer.id!=null)?passer.id:undefined,and1:and1?{made:and1Made}:undefined,zincir:_zincirKul||undefined},q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      _flushReb();   /* and-1 ek atışının ribaundu şut cümlesinden SONRA gelir */
      /* F13-1: kaçan şutların yalnız ~%22'sinde ribaund ANLATILIYORDU; kalan %78'de top
         sessizce el değiştiriyor, anlatım "biz kaçırdık → rakip sayı attı" diye atlıyordu
         (198 olaylık maçta 44 kopukluk — şikâyetin merkezi buydu). Ribaund kutuya zaten
         yazılıyordu, eksik olan yalnız OLAYDI. Artık her kaçan şut ribaundunu anlatıyor.

         ⚠ Rastgelelik akışı korunuyor: eski %22 çekilişi (_rebAnlat) ve ona bağlı putback
         çekilişi aynen yapılır — yalnız olay üretimi koşuldan çıkarıldı. Böylece maç
         matematiği (skorlar, band.js hash'i) değişmez; değişen tek şey anlatımdır.
         `dt:0` — ribaund, şut pozisyonunun İÇİNDE geçer, çeyrek saatine süre eklemez. */
      const _rebAnlat=(!made&&rebounder)?(Math.random()<0.22):false;
      /* ── FAZ 36 §B1: RUTİN SAVUNMA RİBAUNDU ANLATILMAZ ─────────────────────────────
         F13-1 "her kaçan şutun ribaundu anlatılsın" kuralı kopukluğu çözdü ama tersine
         düştü: 256 satırın 69'u (%27) ribaund/top değişimiydi ve anlatım istatistik
         akışı gibi okunuyordu. Gerçek spiker rutin savunma ribaundunu geçer; anlattığı
         ribaund HÜCUM ribaundu, mücadeleli top ya da seri kıran ribaunttur.
         ⚠ İSTATİSTİK DEĞİŞMEZ — ribaunt kutuya zaten yazıldı, `rebounder`/`rebOff`
         çekilişleri aynen yapıldı; kapı YALNIZ olayın diziye girip girmediğini belirler.
         ⚠ Yalnız `pr` (sunum PRNG'si) tüketilir — F13-3 kuralı.
         ÖLÇÜLEN KISIT: bu motorda ribaundların ~%34'ü HÜCUM ribaundudur (gerçek
         basketbolda ~%25). "Hücum ribaundu daima anlatılsın" kuralı tek başına ribaund
         satırı oranını %10,4'e çakılıyor; %8-11 bandında rutin savunma ribaunduna kalan
         pay bu yüzden %25 değil ~%2'dir. İkisinden biri seçilmek zorundaydı — ikinci
         şansın sessiz geçmemesi (F13-1'in çözdüğü asıl kusur) daha önemli.
         Ölçüm: %10,6 (879/8276) · `anlatim-check` [A]. */
      const _rebOnemli=(rebOff||(rebounder&&statN(rebounder,'ribaund')>=88));
      const _rebGoster=(!made&&rebounder)?(_rebOnemli||prChance(0.02)):false;
      if(!made&&rebounder&&_rebGoster){
        const rebIsUser=rebOff?userPos:!userPos;
        const havuz=_rebAnlat?(rebOff?REB_OFF_LINES:REB_DEF_LINES)
                             :(rebOff?REB_OFF_SHORT:REB_DEF_SHORT);
        const rl=benzersiz(()=>{
          const c=adKoy(pickLine(havuz,pr,narr.recent,rebOff?'rebO':'rebD'),
            {R:_anlatimAdi(rebounder.isim),T:rebIsUser?MC.home.name:rname});
          return dolguKota(c)?c:'';                     /* §B9: dolgu kotası dolduysa yeniden çek */
        })||adKoy(pickLine(havuz,pr,narr.recent,rebOff?'rebO':'rebD'),
            {R:_anlatimAdi(rebounder.isim),T:rebIsUser?MC.home.name:rname});
        /* §7.3: ribaund da saat referansı için doğal bir yer — kapı aday havuzu
           yalnız şutlara takılıyken %5'te kalıyordu (hedef %6-14). */
        /* FAZ 34 §6: ribaunt uzmanı 3. ribaundundan sonra anlatımda tanınır. */
        const rl2=rl+uzmanGate(rebounder,'reb')+saatGate(q,t)+tonGate(q,t);
        events.push({type:'reb',text:rl2,dt:0,q,t,home:homeScore,away:awayScore,rebId:rebounder.id,rebIsUser,rebOff:!!rebOff,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});   /* M14: hücum ribaundunda şut saati 24 değil 14 */
        /* Hücum ribaundu + renkli anlatım varsa: ~%55 aynı oyuncu pota dibinden tekrar dener. */
        if(_rebAnlat&&rebOff&&rebounder.id!=null&&Math.random()<0.55) shooterHint=rebounder;
      }

    } else if(roll<0.748){
      /* Şut faulü — çizgide 2 serbest atış. M18: pay %10 → %6 (serbest atış enflasyonu). */
      let nMade=0;
      if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++;     /* M20: iki taraf da aynı yoldan */
      B.ftAtt+=2; B.ftMade+=nMade; D.foul++; const _fp=recordFoul(defenderIsUser,q,t);
      if(ftRebound(userPos,B,D,nMade,2,q,t)) posNext=userPos;
      addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
      const lineX=offLeftAtQ(userPos,q,userIsHome)?210:730;
      events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(`${foulPrefix(_fp)} · `+pickLine(['%S çizgide.','%S çizgide.','%S çizgiye gidiyor.','%S faul kazandı.','%S iki atışta.'],pr,narr.recent,'ftpx').replace('%S',shooter.isim),`${ftLine(nMade,2,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
        shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        _flushReb();

    } else if(roll<0.985){
      /* M17: bu dalın payı %6 → %14,5; içindeki top kaybı ağırlığı %68 → %82. */
      if(Math.random()<0.40){
        /* Şutsuz ortak faul — Madde 17: takım çeyrek faulü 5'i geçtiyse bonus (2 serbest atış). */
        D.foul++; const _fp=recordFoul(defenderIsUser,q,t);
        if(inBonus(defenderIsUser,q)){
          let nMade=0;
          if(userPos){ if(ftMake(shooter))nMade++; if(ftMake(shooter))nMade++; }
          else { if(Math.random()<0.72)nMade++; if(Math.random()<0.72)nMade++; }
          B.ftAtt+=2; B.ftMade+=nMade;
          if(ftRebound(userPos,B,D,nMade,2,q,t)) posNext=userPos;
          addPts(nMade); if(userPos) bumpP(shooter,'pts',nMade); else bumpO(shooter,'pts',nMade);
          const lineX=offLeftAtQ(userPos,q,userIsHome)?210:730;
          events.push({type:'free',sid:shooter.id!=null?shooter.id:undefined,...ftSplit(`🎯 Bonus — ${foulPrefix(_fp)}, ${shooter.isim} çizgide.`,`${ftLine(nMade,2,shooter.isim)} ${sc()}`),q,t,home:homeScore,away:awayScore,
            shots:[{x:lineX+rand(-10,10),y:242,made:nMade>=1,isHome:userPos,kind:'ft',q},{x:lineX+rand(-10,10),y:262,made:nMade===2,isHome:userPos,kind:'ft',q}],
            box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        _flushReb();
        } else {
          const cnt=defenderIsUser?(qFoulU[q]||0):(qFoulO[q]||0);
          posNext=userPos;   /* şutsuz faul: top hücum eden takımda kalır (yandan devam) */
          /* §7.4a: takım faulü sayacı HER faulde basılıyordu; cümlenin yarısı defter
             tutmaya gidiyordu (faul olayı ortalama 19,2 kelime). Sayaç ancak bonusa
             yaklaşırken (4+) bilgi taşır — öncesinde sessiz kalır. */
          const _tf=(cnt>=4)?` · ${foulingTeamName(defenderIsUser)} bu çeyrek ${cnt}. takım faulü${cnt>=5?" · BONUS":""}.`:'';
          events.push({type:'foul',text:`${foulPrefix(_fp)}${_tf||'.'} ${pickLine(FOUL_TAIL,pr,narr.recent,"ftail")}${yorumEk('foul')}${saatGate(q,t)}`,q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      } else {
        /* Top kaybı / top çalma — sayı yok. Faz 3: yalnız AZALTMA çarpanı (set oyun / bölge savunması);
           nötr seçimlerde keep=1 → her zaman top kaybı (eski davranış birebir). */
        const keep=userPos?offStealKeep:defStealKeep;
        if(keep>=1||Math.random()<keep){
          /* M17: top kaybının türü gerçek dağılıma göre — çalma ~%35 (savunmacıya yazılır),
             pas hatası ~%45 ve adım/çift top ~%20 (savunmacıya ÇALMA yazılmaz). */
          const tur=Math.random();
          const loser=userPos?(wPick(userCourt,p=>Math.max(0.15,(120-statN(p,'topSurme'))/60))||uAny())
                             :(wPick(oppCourt,p=>Math.max(0.15,(120-statN(p,'topSurme'))/60))||oAny());
          if(tur<0.615){
            const stealer=userPos?(wPick(oppCourt,stlW)||oAny()):(wPick(userCourt,stlW)||uAny());
            B.to++; D.stl++;
            fastNext='steal';
            /* F13-6: top çalma iki farklı dille anlatılıyordu ve spiker kalıbında TOPU KAYBEDEN
               hiç geçmiyordu ("Victor Kim müthiş bir top çalma!" — kimden aldı?). Artık her
               çalma satırı iki taraflı: kaybeden + kapan. */
            events.push({type:'steal',text:pickLine(STEAL_LOSS,pr,narr.recent,'stl2').replace('%L',_anlatimAdi(loser.isim)).replace('%C',_anlatimAdi(stealer.isim))+' '+spikerLinePR(SP.id,'steal',{c:_anlatimAdi(stealer.isim)},pr,narr.recent)+uzmanGate(stealer,'stl'),q,t,home:homeScore,away:awayScore,stealId:stealer.id,stealIsUser:!userPos,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
          } else if(tur<0.72){
            B.to++;
            fastNext='steal';
            const alan=userPos?(wPick(oppCourt,stlW)||oAny()):(wPick(userCourt,stlW)||uAny());
            events.push({type:'steal',text:pickLine(['%S pasını kontrol edemedi — topu %R aldı.','%S kötü bir pas attı, %R topu aldı.','%S pasına %R araya girdi; hücum bitti.','%S pasında iletişim koptu — topu %R topladı.'],pr,narr.recent,'topas').replace('%S',_anlatimAdi(loser.isim)).replace(/%R/g,_anlatimAdi(alan.isim)),q,t,home:homeScore,away:awayScore,stealId:alan.id,stealIsUser:!userPos,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
          } else {
            B.to++;
            /* İŞ 4: bu dal eskiden hepsini tek 'steal' tipiyle basıyordu; adım, çift
               sürme, taç ve hücum faulü artık AYRI olay türleri. Kutu skora etkisi
               değişmedi (hepsi aynı top kaybı bütçesinden), değişen anlatım ve akış. */
            const _ihTur=Math.random();
            const alan2=userPos?(wPick(oppCourt,stlW)||oAny()):(wPick(userCourt,stlW)||uAny());
            const _L=_anlatimAdi(loser.isim), _R=_anlatimAdi(alan2.isim);
            let _tip,_hav;
            if(_ihTur<0.34){ _tip='hucumFaulu'; _hav=HUCUM_FAULU_LINES; B.foul++; }
            else if(_ihTur<0.62){ _tip='ihlal'; _hav=ADIM_LINES; }
            else { _tip='tac'; _hav=TAC_LINES; }
            events.push({type:_tip,text:adKoy(pickLine(_hav,pr,narr.recent,'ih'+_tip),{S:_L,R:_R}),
              q,t,home:homeScore,away:awayScore,stealId:alan2.id,stealIsUser:!userPos,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
          }
        } else {
          /* Top kaybı savuşturuldu — sabırlı/kontrollü pozisyon, top el değiştirmedi (sayı yok). */
          posNext=userPos;
          events.push({type:'tactic',text:spikerLinePR(SP.id,'tactic',{},pr,narr.recent)+(userPos&&offStealKeep<1?' — sabırlı set oyunu.':'')+yorumEk('tempo'),q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        }
      }

    } else {
      /* Renk — mola/taktik vurgusu (pozisyon değişmez, oyun aynı topla sürer) */
      posNext=userPos;
      /* §7.4b: taktik adı artık parantezli etiket değil, cümlenin DOKUSU.
         Önce: 'Tempo kontrolü — doğru karar. (erken tempo)' — geliştirici notu gibi.
         Sonra: 'Erken tempoya geçtiler, doğru karar.'
         Taktik adları cins isimdir, kesme işareti ALMAZ — turkEk kullanılmaz. */
      const _tk=prCh(TAKTIK_ADI);
      const _tkG=pickLine(TAKTIK_GIRIS,pr,narr.recent,'tkgiris')||TAKTIK_GIRIS[0];
      const _tkGiris=String(_tkG.t).split('%KN').join(_tk.ad).split('%K').join(_tk.e);
      let _tkSpiker=spikerLinePR(SP.id,'tactic',{},pr,narr.recent);
      /* Giriş cümleyi SÜRDÜRÜYORSA spiker satırı küçük harfle devam eder; kendi başına
         bir cümleyse büyük kalır. İlk sürümde ayrım yoktu ve iki bozuk biçim çıktı:
         'Kenardan işaret: el presine. hücumda plan B…' ve 'yayılma hücumuna geçiş
         yapıldı — yeni varyasyon…' (cümle başı küçük harf). */
      if(_tkG.devam) _tkSpiker=(typeof trKucuk==='function'?trKucuk(_tkSpiker.charAt(0)):_tkSpiker.charAt(0).toLowerCase())+_tkSpiker.slice(1);
      let _tkTxt=_tkGiris+_tkSpiker;
      _tkTxt=(typeof trBuyukIlk==='function')?trBuyukIlk(_tkTxt):(_tkTxt.charAt(0).toUpperCase()+_tkTxt.slice(1));
      events.push({type:'tactic',text:_tkTxt+yorumEk('tempo'),q,t,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    }
  }

  /* Savunma katmanı: ilk 5'te boş slot kalırsa (kadro çok eksikse) anlatım çökmesin. */
  if(!pg||!sg||!sf||!pf||!c){
    const _yedekler=(lu&&lu.avail)||(MC.home.players||[]);
    const _ilk=_yedekler[0]||{isim:MC.home.name};
    if(!pg) pg=_yedekler[0]||_ilk;
    if(!sg) sg=_yedekler[1]||_ilk;
    if(!sf) sf=_yedekler[2]||_ilk;
    if(!pf) pf=_yedekler[3]||_ilk;
    if(!c)  c =_yedekler[4]||_ilk;
  }
  if(!resume){
    events.push({
      type:'start',spId:SP.id,
      text:`${SP.emoji} Bugünün spikeri: <strong>${SP.ad}</strong> (${SP.stil}). Maç hava atışıyla başlıyor. ${escMatch(MC.home.name)} ${userIsHome?t('ev sahibi'):t('deplasman takımı olarak')}; ${c.isim} dairede, ${pg.isim} ilk hücumu kuruyor. Tribünler doldu.`,
      /* F: hava atışı maç saatinden süre YEMEZ. dt verilmezse oynatma 12 sn varsayıp
         3,6 sn bekliyor; koreografi 1,4 sn'de bittiği için saha donup kalıyordu
         ("düdük çaldı, herkes sabit kaldı"). */
      dt:0,
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
        type:'quarter_start',dt:0,
        /* FAZ B: çeyrek başında hangi setle oynandığı anlatıma girer (koçun kararı görünür olsun). */
        /* 1. çeyrekte düdük hava atışında çaldı; o satırda "düdük çaldı" demeyen
           kalıplar kullanılır (ses ile metin tutarlı olsun). */
        text:pickLine(q===1?QSTART_LINES.filter(x=>!/düdük/i.test(x)):QSTART_LINES,pr,narr.recent,'qstart').replace('%Q',String(q))+` — ${escMatch(MC.home.name)} ${homeScore} - ${awayScore} ${rname}.${pb&&pb.key!=='dengeli'?` ${escMatch(MC.home.name)} ${pb.ikon} ${pb.ad} setiyle çıkıyor.`:''}`,
        q,t:MATCH_CLOCK_SEC,home:homeScore,away:awayScore,
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
      });
    }


  /* ── FAZ 28 §4: OLAY DAMGALARI POZİSYON İÇİNDE YAYILIR ────────────────────────────
     KÖK NEDEN: maç saati POZİSYON BAŞINA bir kez azalıyor (`t=t-rand(decLo,decHi)`) ve
     `runPossessionV` o pozisyonun BÜTÜN olaylarını (perde, blok, top kaybı, şut, hatta
     oyuncu değişikliği) aynı `t` ile damgalıyordu. Canlıda üç ayrı olay "1P 6:19"
     görünüyordu — üç şey aynı saniyede olamaz.
     ÇÖZÜM sonuç matematiğine DOKUNMAZ: pozisyonun toplam saat maliyeti (`_dt`) ve
     rastgele akış aynen kalır; yalnız o pozisyonda üretilmiş olayların damgaları
     pozisyonun KENDİ penceresine `(tEnd … tPrev-1)` dağıtılır. Olay üretimi bittikten
     sonra çalışan saf bir son-işlemdir; determinizmi bozmaz.
     Duraklama olayları (çeyrek başı/sonu, maç sonu) bu pencerenin dışındadır ve
     dokunulmaz — onların damgası kuralın kendisidir (600 / 0). */
  const _DAMGA_MUAF={quarter_start:1,quarter_end:1,end:1,mvp:1};
  function _damgaDagit(evs,bas,tPrev,tSon){
    try{
      const dizi=[];
      for(let i=bas;i<evs.length;i++){
        const e=evs[i];
        if(!e||e.t==null||_DAMGA_MUAF[e.type]) continue;
        dizi.push(e);
      }
      const _ustTek=Math.max(tSon,tPrev-1);
      /* Tek olaylı pozisyon: ham `t` bir önceki pozisyonun bitiş saniyesidir ve
         iki pozisyonun damgası çakışır. Pencerenin üst ucuna çekilir. */
      if(dizi.length<2){ if(dizi.length===1) dizi[0].t=_ustTek; return; }
      /* FAZ 36 §B7: pencerenin ÜST sınırı tPrev-1'de KALMALIDIR. tPrev'e kadar açmak
         denendi ve ÇAPRAZ ÇAKIŞMA üretti: bir önceki pozisyonun son olayı zaten tSon
         (= yeni pozisyonun tPrev) damgasını taşıyor, yeni pozisyonun ilk olayı da aynı
         saniyeye oturuyordu. Pozisyon penceresi olay sayısından kısaysa çakışma kalır ve
         bu DOĞRUDUR — faul/serbest atış dizisinde saat işlemez (brifin kendi istisnası). */
      const ust=Math.max(tSon,tPrev-1);               /* pencerenin en yüksek saniyesi */
      const alan=Math.max(0,ust-tSon);
      const adim=Math.max(1,Math.floor(alan/(dizi.length-1)));
      for(let i=0;i<dizi.length;i++){
        /* İlk olay pencerenin başında, son olay pozisyonun bittiği saniyede. */
        dizi[i].t=Math.max(tSon,Math.min(ust,tSon+adim*(dizi.length-1-i)));
      }
    }catch(e){}
  }
  /* ══ FAZ 38 İŞ 2: POZİSYONUN TÜRÜ VE MALİYETİ ══════════════════════════════════════
     Pozisyon süresi gerçek basketbolda düz değil İKİ TEPELİDİR:
       ikinci şans (putback)  2 – 5 sn   — top zaten çemberin dibinde
       hızlı hücum            5 – 9 sn   — geçiş, sayı üstünlüğü
       erken hücum            9 – 15 sn  — geçişten set'e dönen pozisyon
       set hücumu            13 – 21 sn  — kurulmuş yarı saha hücumu
     Tür maliyetten ÖNCE bilinmeli, bu yüzden pozisyon sahibi (userPos) ve hızlı hücum
     çekilişi burada yapılır; `runPossession` bunları parametre olarak alır.
     Kullanıcı tempo/odak seçimi ve Erken Hücum seti (pb.fbMul) eskisi gibi etkilidir. */
  let qAktif=1;                     /* pozTuru son dakika kuralı için çeyreği okur */
  function pozTuru(){
    const userPos=(posNext===null)?(Math.random()<0.5):posNext;
    const fromTrans=fastNext;
    /* FAZ 38 §İŞ 2: TEK hızlı hücum bayrağı — FAZ 37'nin sunum genişlemesi buraya
       katıldı. Taban: çalma sonrası yüksek, savunma ribaundu sonrası orta, rakip sayısı
       sonrası düşük ('erken hücum'). Oranlar ölçülerek ayarlandı: hedef, pozisyonların
       %13-16'sının 5-9 sn bandında geçmesi. */
    let fbCh=fromTrans==='steal'?0.56:fromTrans==='reb'?0.31:0.055;
    if(fbCh&&userPos&&(tempo==='hizli'||odak==='hizli')) fbCh=Math.min(0.80,fbCh*1.7);
    if(fbCh&&userPos&&tempo==='yavas') fbCh*=0.5;
    if(fbCh&&userPos&&pb.fbMul) fbCh=Math.min(0.88,fbCh*pb.fbMul);
    const putbackVar=!!shooterHint;
    const fb=!putbackVar&&Math.random()<fbCh;
    /* Tempo seçimi bandı kaydırır (hızlı: kısa uç · yavaş: uzun uç). */
    const kay=tempo==='hizli'?-2:tempo==='yavas'?2:0;
    let lo,hi;
    /* Şut saati ihlali: yalnız KURULMUŞ set hücumunda (geçişten gelmeyen), nadir.
       Maliyeti tam 24 sn — göstergenin 0'a inmesiyle aynı an. */
    /* Son dakika taktik faulü: geride kalan takım savunmadayken pozisyonu keser. */
    const _fark=homeScore-awayScore;
    const _geride=(_fark<0)?true:(_fark>0?false:null);          /* true = ev sahibi geride */
    /* Taktik faul iki pencerede meşrudur ve ikisi de gerçek koç davranışıdır:
       (a) 32 sn kala 4-9 sayı geride — saati durdurup çizgiye göndermek,
       (b) 10 sn kala 1-3 sayı geride — topu geri almanın tek yolu.
       (b) penceresi bilerek DAR: FAZ 38 eki §1'de ölçüldüğü gibi taktik faul
       pozisyon başına ~+0,4 fark verir; 125 saniyelik pencerede onlarca kez
       tekrarlanınca yakın maçları AÇIYORDU. 10 saniyede en fazla bir kez olur. */
    const _sonDk=(qAktif>=4&&((t<=32&&Math.abs(_fark)>=4&&Math.abs(_fark)<=9)
                            ||(t<=10&&Math.abs(_fark)>=1&&Math.abs(_fark)<=3)));
    if(_sonDk&&_geride!==null&&_geride!==userPos){
      /* Hücumdaki taraf ÖNDE — geride kalan savunmada, faul yapar. */
      return {userPos,fromTrans,fb:false,ihlal24:false,taktikFaul:true,maliyet:rand(3,7)};
    }
    const ihlal24=(!putbackVar&&!fb&&!fromTrans&&Math.random()<0.016);
    if(ihlal24) return {userPos,fromTrans,fb:false,ihlal24:true,maliyet:24};
    if(putbackVar){ lo=3; hi=6; }
    else if(fb){ lo=5; hi=9; }
    else if(fromTrans){ lo=9+kay; hi=14+kay; }        /* erken hücum: geçişten geldi ama koştu */
    else { lo=13+kay; hi=21+kay; }                    /* kurulmuş set hücumu */
    /* ── SON DAKİKA SAAT YÖNETİMİ ────────────────────────────────────────────
       Gerçek basketbolda son dakikanın saati iki takım için AYRI akar: geride
       kalan hızlanır (erken şut, uzun ribaunt kovalama, faul), önde olan saati
       eritir. Motorda bu yoktu — son dakika da orta oyunla aynı 13-21 sn
       maliyetini kullanıyordu, dolayısıyla yakın maçlarda beraberliğe götüren
       o EK POZİSYONLAR hiç doğmuyordu.
       Neden bu doğru mekanizma: maliyeti değiştirmek kimin kazandığına dokunmaz
       (iki taraf da kendi durumuna göre davranır), yalnız son dakikada oynanan
       pozisyon SAYISINI artırır — beraberlik olasılığı buradan gelir. Taktik
       faulle fark açma kusuru (FAZ 38 eki §1) tam da bunun yerine konmuş yanlış
       vekildi: o, farkı sistemli biçimde BÜYÜTÜYORDU. */
    if(qAktif>=4&&t<=70){
      const _fk=userPos?(homeScore-awayScore):(awayScore-homeScore);   /* hücumdaki tarafın farkı */
      if(Math.abs(_fk)<=6){
        if(_fk<0){ lo=5; hi=11; }          /* geride: erken şut, saat yakma yok */
      }
    }
    lo=Math.max(2,lo); hi=Math.max(lo+1,hi);
    let _mal=rand(lo,hi);
    /* SON ŞUT: 4Ç'de 1-3 sayı geride olan takım, elinde top ve 12 saniyeden az
       süre varken saati SON SANİYEYE kadar eritip tek şuta oynar — gerçek maçın
       kapanış görüntüsü budur. Uzatmayı doğuran mekanizma tam olarak bu: beraberlik
       şutu kornada gelirse rakibin cevap hakkı kalmaz. Erken atılırsa (mevcut
       davranış) rakip bir pozisyon daha oynar ve fark yeniden açılır — bu yüzden
       farkı 1-3'e çeken her düzeltme uzatma oranını YÜKSELTMİYORDU (ölçüldü: 1-3
       bandı %15,8 → %16,8, uzatma %3,0'de sabit). */
    if(qAktif>=4&&t<=24){
      const _fs=userPos?(homeScore-awayScore):(awayScore-homeScore);
      if(_fs<=-1&&_fs>=-3) _mal=t;   /* şut saatinin tamamı: son şuta oyna */
    }
    return {userPos,fromTrans,fb,ihlal24:false,maliyet:_mal};
  }
    let t=isResumeQ?Math.max(0,Number(resume.tStart)||MATCH_CLOCK_SEC):MATCH_CLOCK_SEC;
    let plays=0;
    while(t>0&&plays<playsMax){
      plays++;
      qAktif=q;
      const _tPrev=t;
      const _poz=pozTuru();
      t=Math.max(0,t-_poz.maliyet);
      const _dt=Math.max(1,_tPrev-t);                 /* M1: bu pozisyonun maç saati maliyeti */
      const _bh=homeScore,_ba=awayScore;
      const _evIx=events.length;
      runPossessionV(q,t,_dt,_poz);
      botCoachTick(q,t,homeScore-_bh,awayScore-_ba);   /* FAZ C: rakip koç kararı */
      rotasyonTick(q,t);                               /* FAZ 38 İŞ 3: kullanıcı rotasyonu */
      nadirOlayTick(q,t);                              /* FAZ 38 İŞ 4: teknik / sakatlık */
      molaTick(q,t,homeScore-_bh,awayScore-_ba);        /* FAZ 38 İŞ 4: kullanıcı molası */
      _damgaDagit(events,_evIx,_tPrev,t);              /* FAZ 28 §4 */
      if(t===0) break;
    }

    if(q<4){
      /* F13-7: 2. çeyrek sonu DEVRE ARASIDIR — 1. ve 3. çeyrekle aynı cümle kullanılıyordu.
         Devre arasında skor özeti, en skorer oyuncu ve ikinci yarı beklentisi verilir.
         F13-8: diğer çeyrek sonları da tek kalıba bağlıydı; havuzdan seçilir. */
      let qText;
      if(q===2){
        const _fark=homeScore-awayScore;
        const _durum=_fark>0?`${escMatch(MC.home.name)} ${_fark} sayı önde`
          :(_fark<0?`${rname} ${-_fark} sayı önde`:'skorlar eşit');
        const _enIyi=_devreEnSkorer();
        qText=`⏸ DEVRE ARASI — ${escMatch(MC.home.name)} ${homeScore} - ${awayScore} ${rname} (${_durum}).`
          +(_enIyi?` İlk yarının en skoreri ${_enIyi.ad} (${_enIyi.p} sayı).`:'')
          +` ${pickLine(HALFTIME_LINES,pr,narr.recent,"half")}`;
      } else {
        qText=`${q}. çeyrek bitti: ${escMatch(MC.home.name)} ${homeScore} - ${awayScore} ${rname}. ${pickLine(QEND_LINES,pr,narr.recent,"qend")}`;
      }
      events.push({
        type:'quarter_end',
        text:qText,
        q,t:0,home:homeScore,away:awayScore,
        box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)
      });
      /* F13-7: enerji sistemi motorda vardı ama anlatımda hiç görünmüyordu; oysa oyuncunun
         değişiklik kararı buna bağlı. Dayanıklılığı düşük ve çok oynayan oyuncu için
         yorgunluk satırı üretilir (sunum PRNG'si — maç matematiği etkilenmez). */
      const _yorgun=_yorgunAday(q);
      if(_yorgun&&prChance(0.72)){
        events.push({type:'tactic',dt:0,text:pickLine(FATIGUE_LINES,pr,narr.recent,'fatigue').replace('%P',_yorgun.isim),
          q,t:0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
      }
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
    events.push({type:'quarter_start',dt:0,text:`🔔 Uzatma ${otRound} başladı — 5:00. Skor ${homeScore}-${awayScore}. Gerginlik tavan!`,q:qq,t:OT_CLOCK_SEC,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    let t=OT_CLOCK_SEC;
    let step=0;
    while(t>0 && step<40){
      step++;
      qAktif=qq;
      const _tPrev2=t;
      /* İŞ 2: uzatmada da pozisyon türü maliyeti belirler (aynı iki tepeli dağılım). */
      const _poz2=pozTuru();
      t=Math.max(0,t-_poz2.maliyet);
      const _dt2=Math.max(1,_tPrev2-t);
      const _bh2=homeScore,_ba2=awayScore;
      const _evIx2=events.length;
      runPossessionV(qq,t,_dt2,_poz2);
      botCoachTick(qq,t,homeScore-_bh2,awayScore-_ba2);
      rotasyonTick(qq,t);
      nadirOlayTick(qq,t);
      molaTick(qq,t,homeScore-_bh2,awayScore-_ba2);
      _damgaDagit(events,_evIx2,_tPrev2,t);            /* FAZ 28 §4 */
      if(t===0) break;
    }
    events.push({type:'quarter_end',text:`Uzatma ${otRound} bitti: ${escMatch(MC.home.name)} ${homeScore} - ${awayScore} ${rname}${homeScore===awayScore?' — hâlâ berabere, bir uzatma daha!':'.'}`,q:qq,t:0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
    /* Güvenlik: aşırı uzarsa (çok nadir) bir sonraki uzatmada kesin sonuç için küçük eşik. */
    if(otRound>=8 && homeScore===awayScore){
      if(Math.random()<0.5){ homeScore++; qh[qq]++; hB.ftMade++; hB.ftAtt++; } else { awayScore++; qa[qq]++; aB.ftMade++; aB.ftAtt++; }
      events.push({type:'free',text:`Son saniye serbest atışı sonucu belirledi — ${escMatch(MC.home.name)} ${homeScore} - ${awayScore} ${rname}.`,q:qq,t:0,home:homeScore,away:awayScore,box:snap(),qh:cloneQx(qh),qa:cloneQx(qa)});
        _flushReb();
      break;
    }
  }

  /* M7: rakip beşliyi olay akışına damgala — sahne (startMatch) buradan okur. */
  if(events.length) events[0].oppFive=_oppFiveOut.slice();
  let winner='draw';
  if(homeScore>awayScore) winner='home';
  else if(awayScore>homeScore) winner='away';

  /* A2: MVP anonsu — artık HER İKİ takımın oyuncuları arasından en yüksek katkı seçilir
     (sayı + asist×1.5 + ribaund×1.2). Rakip daha iyi oynadıysa MVP rakipten çıkabilir. */
  let mvp=null,mvpScore=-1,mvpStat=null,mvpTeam='';
  const scoreOf=s=>(s.pts||0)+(s.ast||0)*1.5+(s.reb||0)*1.2;
  Object.keys(pstats).forEach(id=>{
    const s=pstats[id], sc0=scoreOf(s);
    if(sc0>mvpScore){ mvpScore=sc0; mvp=(MC.home.players||[]).find(p=>p.id===id); mvpStat=s; mvpTeam=MC.home.name; }
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
  if(ow) endNote=userIsHome?'Ev sahasında kaybettik.':'Deplasmanda kaybettik.';
  events.push({
    type:'end',
    text:`Maç bitti! ${escMatch(MC.home.name)} ${homeScore} - ${awayScore} ${rname}. ${endNote}`,
    q:lastPeriod,t:0,home:homeScore,away:awayScore,winner,spId:SP.id,
    players:pstats,
    lineupIds:[pg,sg,sf,pf,c].filter(Boolean).map(x=>x.id),
    subIds:[...subbedIds],
    /* M20: rakip tarafın maç istatistiği + sahada süre alan rakip oyuncular. */
    oplayers:_cloneStats(ostats),
    oppPlayedIds:oppPool.filter(x=>x&&x.id&&(_oppPlayed.has(x.id))).map(x=>x.id),
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
    /* M20: rakip kadro artık kalıcı durum biriktiriyor — maç istatistiği ve yorgunluk. */
    if(typeof mergeBotClubMatchStats==='function') mergeBotClubMatchStats(ctx.rakipName,ligKey,ev.oplayers,ev.oppPlayedIds);
    if(typeof recoverBotClubEnergy==='function') recoverBotClubEnergy(ctx.rakipName,ligKey,Math.max(1,(G.gameDay||1)-prevDay));
    simulateRoundCpuMatches(sm.round);
    regenerateSeasonFixtures();
    syncUserRecordFromStandings();
    if(typeof recordMatchAnalytics==='function') recordMatchAnalytics(sm,uPts,oPts); /* Faz 5.2: analiz verisi */
    if(typeof tickCup==='function') tickCup(); /* Paket 1: vadesi gelen kupa turlarını işlet */
    if(ctx.userIsHome){
      const bilet=homeTicketIncome();
      txn('Bilet geliri',bilet);
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--green);">🎟️ Ev maçı bilet geliri: <strong>+${fmtPara(bilet)}</strong> (${fmtn(G.arena.kap)} kapasite)</div>`);
    } else {
      /* Paket A: seyahat da sezonla pahalanır (gider enflasyonu).
         Madde 2: ecoRound kaldırıldı — maç günü nakit akışı (bilet/ödül/seyahat) artık tek
         ölçekte (ham ölçekte); önceden seyahat 6.2K-14.6K ile kapı hasılatını (~4K) eziyordu. */
      const seyahat=Math.round(rand(300,700)*ecoInflationMul());
      txn('Deplasman seyahat masrafı',-seyahat);
      pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid var(--red);">✈️ Deplasman seyahat masrafı: <strong>-${fmtPara(seyahat)}</strong></div>`);
    }
    if(G.wins>=1) unlockAchievement('ilkGalibiyet');
    if(G.wins>=5) unlockAchievement('seri5');
    if(G.wins>=10) unlockAchievement('g10');
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid ${ev.winner==='home'?'var(--green)':ev.winner==='draw'?'var(--gold)':'var(--red)'};">🏀 <strong>${escMatch(G.team.isim)}</strong> ${uPts}-${oPts} <strong>${ctx.rakipName}</strong> · Gün ${sm.day} · Tur ${sm.round}/${totalRounds()}</div>`);
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
    /* M20: playoff maçında da rakip kadroya işlenir. */
    if(typeof mergeBotClubMatchStats==='function') mergeBotClubMatchStats(ctx.rakipName,ligKey,ev.oplayers,ev.oppPlayedIds);
    if(typeof recoverBotClubEnergy==='function') recoverBotClubEnergy(ctx.rakipName,ligKey,Math.max(1,(G.gameDay||1)-prevDay));
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
    pushLeagueNewsLine(`<div style="padding:9px 12px;background:var(--bg3);border-radius:8px;font-size:12px;border-left:3px solid ${uPts>oPts?'var(--green)':'var(--red)'};">🏆 Playoff (${playoffRoundLabel(0,total)}) ${gd.gameNo}. maç: <strong>${escMatch(G.team.isim)}</strong> ${uPts}-${oPts} <strong>${ctx.rakipName}</strong> — ${seriesTxt}</div>`);
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
       20.833-50.000 birim/galibiyet. Bilet geliri (~4-5K/maç) ve haftalık maaş (~5K) ham ölçekte
       ölçekte olduğu için tek galibiyet bir haftalık tüm ekonomiyi eziyordu. Artık ödül de
       ham ölçekte: bir iç saha kapı hasılatının yaklaşık yarısı kadar. */
    /* F9-2: 1400-2600 → 900-1700. Sezonda ~15 galibiyet × 2000 ≈ 30.000 birim ile ödül, bilet
       gelirine yakın ikinci bir gelir kalemi oluyordu; kasa pasif oyuncuda bile şişiyordu. */
    /* FAZ 25 USD §2.2: galibiyet primi ~$5.000 (eski ölçekte 850-1.550 idi).
       rand() ÇAĞRI SAYISI değişmedi — yalnız aralık değişti, rastgele akış kaymaz. */
    const priz=rand(4200,5800);
    txn('Maç ödülü (galibiyet)',priz);
    sfx('win');
    G.winStreak=(Number(G.winStreak)||0)+1;
    if(G.winStreak>=10) unlockAchievement('seri10');
    showNotif(`🏆 Galip geldin! +2 tablo puanı · +${fmtPara(priz)} ödül${G.winStreak>=3?` · ${G.winStreak} maçlık seri!`:''}`);
  }
  else if(ev.winner==='away'){
    G.winStreak=0;
    /* FAZ 25 USD: MAĞLUBİYET GELİRİ KISILDI ($2.000 → ~$800).
       season-loop ölçümü: haftada ~2,2 mağlubiyet × $2.000, kaybeden kulübe bile
       $4.400/hafta pasif gelir veriyordu; "kötü yönetim iflasa gitsin" hedefini
       (brif §2.4) doğrudan baltalıyor ve ortalama kulübün kasasını kendiliğinden
       şişiriyordu (K2 3,07×). Maç günü geliri artık simgesel bir kalem. */
    const cons=rand(600,1000);
    txn('Maç günü geliri',cons);
    sfx('lose');
    showNotif(`😔 Mağlup — +${fmtPara(cons)} maç günü geliri.`);
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

