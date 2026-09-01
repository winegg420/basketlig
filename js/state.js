// ===== VERİ =====
const ULKELER=[{ad:'ABD',b:'🇺🇸'},{ad:'Türkiye',b:'🇹🇷'},{ad:'Fransa',b:'🇫🇷'},{ad:'İspanya',b:'🇪🇸'},{ad:'Yunanistan',b:'🇬🇷'},{ad:'Brezilya',b:'🇧🇷'},{ad:'Arjantin',b:'🇦🇷'},{ad:'Almanya',b:'🇩🇪'},{ad:'Sırbistan',b:'🇷🇸'},{ad:'Avustralya',b:'🇦🇺'},{ad:'Kanada',b:'🇨🇦'},{ad:'İtalya',b:'🇮🇹'},{ad:'Hırvatistan',b:'🇭🇷'},{ad:'Slovenya',b:'🇸🇮'},{ad:'Nijerya',b:'🇳🇬'},{ad:'Filipinler',b:'🇵🇭'},{ad:'Japonya',b:'🇯🇵'},{ad:'Çin',b:'🇨🇳'},{ad:'Güney Kore',b:'🇰🇷'},{ad:'Senegal',b:'🇸🇳'},{ad:'Litvanya',b:'🇱🇹'},{ad:'Belçika',b:'🇧🇪'},{ad:'Polonya',b:'🇵🇱'},{ad:'Meksika',b:'🇲🇽'},{ad:'Portekiz',b:'🇵🇹'},{ad:'İngiltere',b:'🇬🇧'},{ad:'Rusya',b:'🇷🇺'},{ad:'Ukrayna',b:'🇺🇦'},{ad:'İsrail',b:'🇮🇱'},{ad:'Letonya',b:'🇱🇻'},{ad:'Bosna-Hersek',b:'🇧🇦'},{ad:'Karadağ',b:'🇲🇪'},{ad:'Gürcistan',b:'🇬🇪'},{ad:'Çekya',b:'🇨🇿'},{ad:'Finlandiya',b:'🇫🇮'},{ad:'Estonya',b:'🇪🇪'},{ad:'Macaristan',b:'🇭🇺'},{ad:'Bulgaristan',b:'🇧🇬'},{ad:'Romanya',b:'🇷🇴'},{ad:'Kuzey Makedonya',b:'🇲🇰'},{ad:'Arnavutluk',b:'🇦🇱'},{ad:'Slovakya',b:'🇸🇰'},{ad:'İsveç',b:'🇸🇪'}];
/* ── FAZ 30: LİG KÜRESEL ─────────────────────────────────────────────────────────────
   FAZ 17'de kurulan "ligin ev ülkesi" kavramı (LIG_EV_ULKE) KALDIRILDI. Oyun artık
   küresel: bir divizyon tek bir ülkenin ligi değildir, oyuncular 43 ülkeden GELİŞİGÜZEL
   dağılır. Kullanıcının kayıt olduğu ülke yalnız profil kartında görünür ve hiçbir
   mekaniği etkilemez (G.menajerUlke).
   Kalkan kurallar: yerli kadro kurulumu · bot yabancı kotası (BOT_YABANCI_MAX/ORAN) ·
   market yerli oranı (MARKET_YERLI_*). Kalan: NAME_POOLS, randomNameFor, ULKE_KOVA
   (portre) — ad ve yüz hâlâ oyuncunun ÜLKESİNE göre üretilir. */
/** Ada göre ülke kaydı (bulunamazsa null). */
function ULKE_BUL(ad){ const a=String(ad||''); return ULKELER.find(u=>u.ad===a)||null; }
/** Tohumdan deterministik ülke ADI — haber/onarım gibi yerlerde `ch()` yerine kullanılır. */
function rastgeleUlkeAdi(tohum){
  if(tohum==null) return ch(ULKELER).ad;
  const u=prPick('ulke|'+tohum,ULKELER);
  return (u&&u.ad)||ULKELER[0].ad;
}
/* FAZ 17: bot takımların yabancı sınırı — botlar marketteki iyi yabancıları tüketmesin,
   oyuna yeni başlayan kullanıcıya kadro malzemesi kalsın. */
/* FAZ 30: MARKET_YERLI_* ve BOT_YABANCI_* KALDIRILDI — "yerli" diye bir kategori yok.
   Market ve bot kadroları da 43 ülkeden gelişigüzel çekilir. Marketteki OVR primi de
   uyruğa değil, yalnız bant hesabına bağlıdır (aşağıda kullanılmıyor artık). */
const TR_ULKE={ad:'Türkiye',b:'🇹🇷'};
/* ── FAZ 30 §4: DİVİZYON MERDİVENİ ───────────────────────────────────────────────────
   Divizyon 1 EN ÜST, aşağı doğru istenildiği kadar uzar. Her divizyon 20 takım.
   Divizyon 1 tek gruptur; alt divizyonlar paralel gruplara ayrılabilir (kullanıcı
   sayısı arttıkça grup eklenir). Yeni kariyer EN ALT divizyonda başlar — ekonomi
   tasarımı "küçük kulübü devral ve büyüt" üzerine kurulu.
   Anahtar biçimi korunur: 'tbl' = Divizyon 1, 'd.g' = Divizyon d+1 · Grup g.
   DIV_SAYISI'nı artırmak yapıyı büyütmeye yeter; depo şablonu 6 divizyona kadar hazır. */
const DIV_SAYISI=3;              /* Divizyon 1, 2, 3 */
const DIV_GRUP_SAYISI=5;         /* alt divizyonlarda paralel grup üst sınırı */
/** Divizyon numarasından (1 tabanlı) o divizyonun slot anahtarları. */
function divizyonAnahtarlari(div){
  if(div<=1) return ['tbl'];
  const out=[];
  for(let g=1;g<=DIV_GRUP_SAYISI;g++) out.push((div-1)+'.'+g);
  return out;
}
/** Doldurma sırası: EN ALT divizyondan yukarı. assignUserToTblSlot bunu kullanır. */
function divizyonDoldurmaSirasi(){
  const out=[];
  for(let d=DIV_SAYISI;d>=1;d--) divizyonAnahtarlari(d).forEach(k=>out.push(k));
  return out;
}
/* ── Divizyon gücü ──
   Üst divizyonda oyuncu kalitesi yüksek olmalı: kullanıcı yükseldikçe zorluk artsın.
   Kayma OVR puanı cinsindendir ve bot kadrolarına uygulanır (kullanıcı kadrosuna DEĞİL —
   kullanıcı kendi kadrosunu kendi kurar). Divizyon 1 en güçlü. */
function divizyonOvrKaymasi(key){
  const d=(typeof divizyonNo==='function')?divizyonNo(key):1;
  /* ⚠ MERDİVEN EN ALT DİVİZYONDA NÖTRDÜR (0), yukarı doğru güçlenir.
     İlk kurguda Div1 +6 · Div2 +1 · Div3 −4 idi; yeni kariyer en altta başladığı için
     oyunun MUTLAK zorluğu düşüyordu (ölçüm: skor bandı 89,7-81,8 iken 90,7-76,8 oldu).
     Çapa en alta konunca başlangıç deneyimi FAZ 30 öncesiyle aynı kalır, yükselmek
     gerçekten zorlaşır. Divizyon eklenirse en alt yine 0 olur (aşağıdaki hesap
     DIV_SAYISI'na göre kayar).
     Div1 +8 · Div2 +4 · Div3 0 (üç divizyonlu kurulumda). */
  const basamak=4;
  const enAlt=DIV_SAYISI;
  return Math.max(0,(enAlt-d))*basamak;
}
/** Yan panelde gösterilecek alt lig sayısı (Divizyon 1 ayrı). */
const SIDEBAR_DIV_MAX_VISIBLE=1;
const POZLAR=['PG','SG','SF','PF','C'];
const POZ_TR={PG:'Organizatör',SG:'Şutör',SF:'K. Forvet',PF:'G. Forvet',C:'Pivot'};
/* ── FAZ 30 §3: KÜRESEL TAKIM ADI HAVUZU ─────────────────────────────────────────────
   Havuz 32 Türk ilinden ibaretti ve her divizyon "Türkiye ligi" gibi duruyordu. Oyun
   küreselleştiği için şehirler de dünyanın her yerinden gelir; sonekler İngilizce,
   Türkçe ve nötr karışıktır ve karışım SERBESTTİR — "Kaunas Kartalları" da olur,
   "İzmir Eagles" da. Bu bilinçli: lig tek bir ülkenin ligi değil.
   Havuz boyu kuralı: ≥120 şehir × ≥25 sonek (`milliyet-check` sayar). "Aynı divizyonda
   aynı şehirden en fazla 2 takım" kuralı genUniqueClubName'de uygulanır — havuz ona
   rahatça yetiyor (120×25 = 3.000 kombinasyon, divizyon başına 20 takım). */
const SEHIR=[
  /* Avrupa */
  'İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Trabzon','Eskişehir','Samsun',
  'Athens','Thessaloniki','Piraeus','Belgrade','Subotica','Zagreb','Split','Ljubljana','Sarajevo','Podgorica',
  'Skopje','Tirana','Sofia','Plovdiv','Bucharest','Cluj','Budapest','Debrecen','Prague','Brno',
  'Bratislava','Warsaw','Kraków','Gdańsk','Vilnius','Kaunas','Klaipėda','Riga','Tallinn','Helsinki',
  'Tampere','Stockholm','Gothenburg','Oslo','Copenhagen','Berlin','Munich','Hamburg','Cologne','Frankfurt',
  'Bamberg','Vienna','Zurich','Geneva','Milano','Bologna','Roma','Siena','Venezia','Trento',
  'Madrid','Barcelona','Valencia','Sevilla','Bilbao','Málaga','Vitoria','Lisboa','Porto','Paris',
  'Lyon','Marseille','Villeurbanne','Strasbourg','Nantes','London','Manchester','Leicester','Newcastle','Glasgow',
  'Dublin','Antwerp','Brussels','Ostend','Amsterdam','Rotterdam','Groningen','Moscow','Kazan','Perm',
  'Kyiv','Odesa','Dnipro','Tbilisi','Yerevan','Minsk',
  /* Amerika */
  'Boston','Chicago','Denver','Portland','Austin','Memphis','Seattle','Phoenix','Detroit','Houston',
  'Toronto','Montréal','Vancouver','Puebla','Guadalajara','Monterrey','Santos','Niterói','Brasília','Curitiba',
  'Mendoza','Córdoba','Rosario','Tucumán','Santiago','Montevideo','Bogotá','Caracas','Lima','Ponce',
  /* Asya · Afrika · Okyanusya */
  'Tokyo','Osaka','Nagoya','Seoul','Busan','Beijing','Shanghai','Guangzhou','Taipei','Manila',
  'Cebu','Jakarta','Bangkok','Mumbai','Delhi','Tehran','Haifa','Jerusalem','Beirut','Cairo',
  'Alexandria','Casablanca','Tunis','Dakar','Lagos','Abuja','Accra','Nairobi','Luanda','Johannesburg',
  'Durban','Sydney','Melbourne','Perth','Auckland','Wellington'
];
/** Kulüp adı sonekleri — İngilizce + Türkçe + nötr karışık (FAZ 30 §3). */
const LIG_T=[
  /* Türkçe */
  'Basket','Spor','Yıldızları','Kartalları','Aslanları','Şimşekleri','Boğaları','Panterleri',
  'Şahinleri','Kurtları','Gençlik','Koleji','Belediyespor','Üniversite','Doğanları','Atmacaları','Ejderleri',
  /* İngilizce */
  'Eagles','Wolves','Lions','Hawks','Panthers','Bulls','Kings','Giants','Raptors','Thunder',
  'Storm','Titans','Warriors','Pilots','Miners','United',
  /* Nötr / kısaltma */
  'BC','BK','Athletic','Sporting','Olympia','Union','Academy','Metropolitans'
];
/* FAZ 24 §2: ILK / SY genel isim havuzları SİLİNDİ.
   FAZ 17 §3.4'te marka temizliği yapıldı ama yalnız NAME_POOLS üzerinde; bu ikili gözden
   kaçtı ve canlı kaldı. 32 ilk ismin neredeyse tamamı aktif NBA yıldızının adıydı (Luka,
   Nikola, Joel, Trae, Jayson, Shai, Ja, LaMelo, Giannis, Domantas…), Türkçe karakter oranı
   %0'dı. Üç yeri besliyordu: lig haberleri (league.js), ekonomi olayları (economy.js) ve
   randomNameFor'un YEDEK DALI (aşağıda). Sonuç: %100 Türk bir ligde "Ja Clark adlı genci
   A takıma çıkardı" gibi haberler. Artık tek isim kaynağı NAME_POOLS. */
const TR_ILK=['Mehmet','Serkan','Burak','Can','Emre','Ali','Oğuz','Kaan','Berk','Mert','Arda','Enes','Furkan','Alperen','Cedi'];
const TR_SY=['Yılmaz','Kaya','Demir','Şahin','Çelik','Öztürk','Arslan','Doğan','Kılıç','Aslan'];

/* ── Madde 5 (29. oturum): ülkeye özgü isim havuzları ────────────────────────────────────
   Önceden bayrak ULKELER'den rastgele, isim ise TEK genel havuzdan (ILK/SY) geliyordu; bu
   yüzden "🇹🇷 Kowalski" gibi uyumsuz oyuncular üretiliyordu. Artık her ülkenin kendi 16 ad +
   16 soyad havuzu var (26 ülke ≈ 832 isim) — hem bayrak-isim uyumu hem tekrar azalması.
   ILK/SY genel havuzu koç/izci/haber isimleri için (bayraksız bağlam) olduğu gibi duruyor. */
/* FAZ 17: NAME_POOLS js/names.js'e taşındı (boyut: 43 ülke × 150 ad × 140 soyad).
   randomNameFor burada kalır — havuz dosyası state.js'ten ÖNCE yüklenir. */
/** Ülkeye uygun rastgele "Ad Soyad".
 *  FAZ 24 §2.3: yedek dal artık SABİT LİSTEYE DÜŞMÜYOR. Eskiden bilinmeyen bir ülke
 *  sessizce NBA adı üretiyordu — bu bir mayındı: 43 ülkenin hepsi kapsansa da yeni bir
 *  ülke eklendiği gün fark edilmeden geri gelirdi. Sıra: istenen ülke → ligin ev ülkesi →
 *  Türkiye. Bilinmeyen ülke ayrıca konsola UYARI yazar; sessiz yedek bir daha gizlenmesin. */
/*  FAZ 29 §7: isteğe bağlı `tohum` — verilirse ad DETERMİNİSTİK seçilir (prPick, hiç
 *  rastgelelik tüketmez). Eski kayıt onarımlarında zorunludur: `ch()` ile seçilen ad
 *  her açılışta değişir ve oyuncu kadrosunun her seferinde başka isimler almasına yol
 *  açar (FAZ 24'te koç adında yaşandı). Tohumsuz çağrı davranışı DEĞİŞMEZ. */
function randomNameFor(ulkeAd,tohum){
  const ad=String(ulkeAd||'');
  let pool=NAME_POOLS[ad];
  if(!pool){
    try{ console.warn('randomNameFor: isim havuzu olmayan ülke →',ad||'(boş)'); }catch(e){}
    /* FAZ 30: ev ülkesi yok — havuzu olmayan ülke için RASTGELE bir havuza düşülür.
       Yine de uyarı basılır: sessiz yedek bir daha gizlenmesin. */
    const _hk=Object.keys(NAME_POOLS);
    pool=NAME_POOLS[_hk[Math.floor(Math.random()*_hk.length)]]||NAME_POOLS['Türkiye'];
  }
  if(tohum!=null) return `${prPick(tohum+'|ilk',pool.ilk)} ${prPick(tohum+'|sy',pool.sy)}`;
  return `${ch(pool.ilk)} ${ch(pool.sy)}`;
}

const TBL_STORAGE_KEY='charazay_tbl_v5';   /* FAZ 17: milliyet kuralı — eski kayıt sessizce yok sayılır */
const LEAGUE_SIZE=20;
const TBL_COMP_NAME='Küresel Basketbol Ligi';   /* FAZ 30: ülke bazlı ad kalktı */
const CLUB_CACHE_KEY='charazay_club_public_v1';
const NEWS_SESSION_KEY='charazay_news_sess_v1';
const GAME_SAVE_KEY='charazay_game_save_v3'; /* FAZ 17: milliyet + portre şeması — göç yok, eski anahtar yok sayılır */
/* FAZ 19 §6: DESTEKLENMEYEN SÜRÜM ANAHTARLARI.
   Canlıda hem charazay_game_save_v2 hem v3, hem charazay_tbl_v4 hem _v5 yan yana duruyordu.
   "Sessizce yok say" yetmiyor: eski kayıt yer kaplıyor, tarayıcı kotasını yiyor ve bir
   sonraki şema değişiminde hangisinin geçerli olduğu karışıyor. Artık açılışta siliniyor
   ve kullanıcıya tek satırlık bilgi veriliyor (sessizce silmek de doğru değil). */
const ESKI_KAYIT_ANAHTARLARI=[
  'charazay_game_save','charazay_game_save_v1','charazay_game_save_v2',
  'charazay_tbl','charazay_tbl_v1','charazay_tbl_v2','charazay_tbl_v3','charazay_tbl_v4'
];
/** Şu an KULLANILAN charazay_* anahtarları — bunlar korunur, geri kalanı silinir. */
function guncelKayitAnahtarlari(){
  const l=[GAME_SAVE_KEY,TBL_STORAGE_KEY,CLUB_CACHE_KEY,NEWS_SESSION_KEY];
  try{ if(typeof SETTINGS_KEY!=='undefined') l.push(SETTINGS_KEY); }catch(e){}
  try{ if(typeof ACH_KEY!=='undefined') l.push(ACH_KEY); }catch(e){}
  try{ if(typeof SLOT_KEY_PREFIX!=='undefined') l.push(SLOT_KEY_PREFIX); }catch(e){}
  return l.filter(Boolean);
}
/** Desteklenmeyen anahtarları siler; silinen sayısını döndürür.
 *  FAZ 20 §5: sabit liste YETMİYORDU — canlıda charazay_game_save_v2 ve charazay_tbl_v4
 *  hâlâ duruyordu. Artık tüm charazay_* anahtarları taranır; güncel olanlar, kayıt
 *  slotları ve analitik dışındakiler (yani eski SÜRÜM anahtarları) silinir. */
function eskiKayitlariTemizle(){
  let n=0;
  try{
    const guncel=guncelKayitAnahtarlari();
    const korunacak=(k)=>{
      if(guncel.indexOf(k)>=0) return true;
      /* kayıt slotları ve kullanıcı ayarları sürümlü değildir — korunur */
      if(/^charazay_(slot|ayar|settings|ach|basarim|analytics)/.test(k)) return true;
      /* güncel anahtarlardan biriyle aynı önekli ve aynı sürümlü ise koru */
      return guncel.some(g=>k===g);
    };
    const silinecek=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||k.indexOf('charazay_')!==0) continue;
      if(!korunacak(k)) silinecek.push(k);
    }
    silinecek.forEach(k=>{ try{ localStorage.removeItem(k); n++; }catch(e){} });
  }catch(e){}
  return n;
}
const IDB_NAME='charazay_idb_v1';
const IDB_STORE_G='game';
const MATCH_CLOCK_SEC=600;   /* Regülasyon çeyrek süresi — FIBA 10 dk (gerçekçi skorlar için) */
const OT_CLOCK_SEC=300;      /* Uzatma süresi — FIBA 5 dk */
/** Eski ekonomi 2.400 KR — yeni başlangıç 50.000 KR ile orantılı fiyatlar */
/* ── B5: ZORLUK SEVİYESİ (FAZ 6) ────────────────────────────────────────────────────────
   Tam sürüm/Steam beklentisi. Kariyer başında seçilir, Ayarlar'dan değiştirilebilir.
   Tek bir yerden okunur (difficultyCfg) — çarpanlar koda dağılmasın.
     butce   : başlangıç bütçesi çarpanı
     gelir   : haftalık gelirler (bilet, sponsor) çarpanı
     rakip   : rakip takım güç çarpanı (>1 = rakip daha güçlü)
     sakat   : kullanıcı oyuncularının sakatlanma riski çarpanı
     piyasa  : serbest piyasa tavanına eklenen OVR payı
     hedef   : başkan hedefi sıra toleransı (+ = daha kolay hedef)
   NORMAL tüm çarpanları 1 / 0'dır: davranış FAZ 6 öncesiyle birebir aynıdır. */
const DIFFICULTY={
  kolay:  {ad:'Kolay',  ikon:'🟢', butce:1.50, gelir:1.15, rakip:0.94, sakat:0.60, piyasa:+2, hedef:+2,
           desc:'Daha geniş bütçe, daha yumuşak rakipler, az sakatlık. Oyunu öğrenmek için.'},
  normal: {ad:'Normal', ikon:'🟡', butce:1.00, gelir:1.00, rakip:1.00, sakat:1.00, piyasa:0,  hedef:0,
           desc:'Dengeli deneyim — tasarlanmış zorluk.'},
  zor:    {ad:'Zor',    ikon:'🔴', butce:0.70, gelir:0.90, rakip:1.06, sakat:1.40, piyasa:-2, hedef:-1,
           desc:'Dar bütçe, güçlü rakipler, sık sakatlık. Deneyimli menajerler için.'}
};
const DIFFICULTY_KEYS=['kolay','normal','zor'];
/** Geçerli zorluk ayarını döndürür (kayıtta yoksa normal). */
/* FAZ 20 §8 (kullanıcı kararı A): zorluk seçicisi kaldırıldı; oyun DAİMA nötr dengede
   çalışır. DIFFICULTY tablosu ve difficultyCfg() imzası yerinde bırakıldı — çağıran onlarca
   yer var ve eski kayıtlarda G.difficulty='zor' yazıyor olabilir; burada nötrlemek, o
   çağrıları tek tek sökmekten hem küçük hem güvenli bir değişiklik. Zorluk artık
   yorgunluk → sakatlık riski dinamiğinden gelir. */
function difficultyCfg(){
  return DIFFICULTY.normal;
}
/* F9-3: A takım kadro üst sınırı. Sınır dolduğunda yeni katılım engellenir ve kullanıcı
   karar vermeye zorlanır (kimi göndereceksin?) — bu aynı zamanda zayıf oyuncuyu gönderip
   ortalamayı yükseltme baskısı yaratır. */
const ROSTER_MAX=18;
/** Kadroya yeni oyuncu eklenebilir mi? Engelliyse kullanıcıya sebebini söyler. */
function rosterHasRoom(uyar){
  const n=((typeof G!=='undefined'&&G&&G.players)||[]).length;
  if(n<ROSTER_MAX) return true;
  if(uyar!==false&&typeof showNotif==='function')
    showNotif(`👥 Kadro dolu (${ROSTER_MAX} oyuncu) — önce birini gönder ya da sat.`,{critical:true});
  return false;
}
const START_KR=50000;
const ECO_REF_KR=2400;
const ECO_MUL=START_KR/ECO_REF_KR;
function ecoRound(x){ return Math.max(1, Math.round(Number(x)*ECO_MUL)); }
/** FAZ 22 §5.5: arena yükseltme fiyatları 17.083 / 34.375 / 66.667 / 129.167 gibi
 *  hesaplanmış ondalıklar hâlinde görünüyordu — fiyat listesi gibi durmuyordu.
 *  Bin sayısı ≥10.000 ise en yakın bine, altındaysa en yakın yüze yuvarlanır. */
function ecoRoundPretty(x){
  const v=ecoRound(x);
  return v>=10000?Math.round(v/1000)*1000:Math.round(v/100)*100;
}
/** Paket A (13. oturum): kulüp gider enflasyonu — sezonlar ilerledikçe maaş piyasası ve
    arena bakımı pahalanır (+%4/sezon, tavan ×2.2 ≈ 31. sezon). Gelir kalemleri sabit kalır;
    böylece uzun vadede kasa otomatik şişmez, iyi yönetim yine kâr eder. Yalnız YENİ
    sözleşmelere/piyasaya işler — imzalı maaşlar sözleşme bitene dek değişmez. */
function ecoInflationMul(){
  try{
    const y=(typeof G!=='undefined'&&G&&G.season&&Number(G.season.year))||1;
    return Math.min(2.2,1+0.04*Math.max(0,y-1));
  }catch(e){ return 1; }
}
let _gameSaveTimer=null;
/** LS boşken girişte IDB’den okunan kayıt; resumeFromSavedGame bunu yedekler. */
let _pendingResumeFromIdb=null;

function dbg(...args){ try{ if(window.CHARAZAY_DEBUG) console.log('[Charazay]',...args); }catch(e){} }
function openIdb(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open(IDB_NAME,1);
    req.onupgradeneeded=()=>{ req.result.createObjectStore(IDB_STORE_G); };
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>rej(req.error||new Error('IDB open'));
  });
}
function idbPutString(s){
  return openIdb().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(IDB_STORE_G,'readwrite');
    tx.objectStore(IDB_STORE_G).put(s,'save');
    tx.oncomplete=()=>{ db.close(); res(); };
    tx.onerror=()=>rej(tx.error);
  }));
}
/* F7-3: kayit silinince IndexedDB kopyasi da silinmeli — yoksa sonraki acilista
   LS bos oldugu icin IDB okunur ve SILINEN kariyer geri gelir. */
function idbDeleteString(){
  return openIdb().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(IDB_STORE_G,'readwrite');
    tx.objectStore(IDB_STORE_G).delete('save');
    tx.oncomplete=()=>{ db.close(); res(); };
    tx.onerror=()=>rej(tx.error);
  })).catch(()=>null);
}
function idbGetString(){
  return openIdb().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(IDB_STORE_G,'readonly');
    const rq=tx.objectStore(IDB_STORE_G).get('save');
    rq.onsuccess=()=>{ db.close(); res(rq.result||null); };
    rq.onerror=()=>rej(rq.error);
  })).catch(()=>null);
}

function parseTblKey(key){
  const s=String(key||'');
  if(s==='tbl'||s.startsWith('t.')) return {kind:'tbl'};
  const p=s.split('.');
  return {kind:'div',div:parseInt(p[0],10)||1,grp:parseInt(p[1],10)||1};
}
/* ── FAZ 30 §4: DİVİZYON ADLARI NÖTR ─────────────────────────────────────────────────
   "TBL — Türkiye Basketbol Ligi" küresel yapıda yanlış. En üst grup Divizyon 1'dir;
   alt divizyonlar paralel gruplara ayrılabilir ("Divizyon 2 · Grup 1").
   Anahtar biçimi DEĞİŞMEDİ (`tbl` = Divizyon 1, `d.g` = Divizyon d+1 Grup g) — eski
   kayıtlar ve TBL deposu olduğu gibi okunmaya devam eder, yalnız ETİKET değişir. */
function divizyonNo(key){
  if(!key||key==='tbl'||String(key).startsWith('t.')) return 1;
  const p=String(key).split('.');
  return (parseInt(p[0],10)||1)+1;      /* '1.1' → Divizyon 2 */
}
function divizyonGrup(key){
  if(!key||key==='tbl'||String(key).startsWith('t.')) return 1;
  const p=String(key).split('.');
  return parseInt(p[1],10)||1;
}
function formatTblSlotLabel(key){
  if(!key) return t('Divizyon 1');
  const d=divizyonNo(key), g=divizyonGrup(key);
  if(d===1) return t('Divizyon 1');
  return t('Divizyon {d} · Grup {g}',{d:d,g:g});
}
function sidebarSlotLabel(key){
  const d=divizyonNo(key), g=divizyonGrup(key);
  return d===1?('D'+d):('D'+d+'.'+g);
}
function starFromGenel(g){
  const x=Number(g)||0;
  if(x>=88) return 5;
  if(x>=76) return 4;
  if(x>=68) return 3;
  if(x>=58) return 2;
  return 1;
}
/** Haftalık maaş (KR) — 15 kişilik ortalama kadro ≈ 5-6K/hafta; 50K başlangıç bütçesiyle dengeli. */
function salaryKRFromGenel(genel){
  const g=Number(genel)||0;
  const hi=Math.max(0,g-78);
  /* Paket A: piyasa maaşı sezon enflasyonuyla büyür (yalnız yeni sözleşmeler). */
  /* F9-2: çarpan 1,7 → 2,9. Maaş yükü artık gelirle aynı büyüklük mertebesinde; kadro
     genişletmek ve yıldız tutmak gerçek bir bütçe kararı (eskiden kasa kendiliğinden şişiyordu). */
  return Math.max(60, Math.round((24 + g*1.95 + (g*g)/115 + hi*14 + hi*hi*0.08)*2.9*ecoInflationMul()));
}
/** Bonservis (KR) — 65 OVR ≈ 18K, 76 ≈ 25K, 90 ≈ 89K, 97 ≈ 134K: erken hedefler ulaşılır, yıldızlar birikimle. */
function transferFeeKR(p){
  const g=Number(p.genel)||65;
  const pot=Number(p.potansiyel||g);
  const listed=p.listedFromUser?1:0;
  const hi=Math.max(0,g-76);
  return Math.max(1500, Math.round(300 + g*g*4.2 + pot*8 + listed*g*30 + hi*2600 + hi*hi*90));
}

function hash32(str){
  let h=5381;
  for(let i=0;i<str.length;i++) h=((h<<5)+h)^str.charCodeAt(i);
  return h>>>0;
}

/* ── FAZ 17: DETERMİNİSTİK KARAR YARDIMCILARI ────────────────────────────────────────────
   Milliyet/portre kararları maçın ya da kadronun rastgele akışını TÜKETMEMELİ: bunlar
   Math.random() çağırırsa aynı tohum farklı kadro üretir ve band.js hash'i kayar
   (F13-3'ün anlatım kuralının, B-5'in sahne kuralının milliyet karşılığı). Bu yüzden
   karar tek yönlü hash'ten türetilir — çağrı sırası ne olursa olsun sonuç aynıdır. */
/** Tohumdan 0..1 arası deterministik değer.
 *  hash32 (djb2-xor) TEK BAŞINA YETMEZ: son karakteri XOR'ladığı için yalnız son karakteri
 *  değişen anahtarlar (…|yabanci|0 … |yabanci|9) yalnız düşük bitlerde ayrışır ve aynı
 *  dilime düşer. Ölçüldü: bot yabancı kapısı doğru oranda (%11,5) açılıyordu ama açılışlar
 *  BİRKAÇ TAKIMDA yığılıyor, o takımlar 2 yabancı tavanına çarpınca 183 açılış boşa gidiyor
 *  ve gerçekleşen oran %2,3'e düşüyordu. Aşağıdaki karıştırıcı (murmur3 finalizer türevi)
 *  bitleri dağıtır — ölçülen sonuç %10,0 ve desiller düz. */
function prMix(x){
  x=x>>>0; x^=x>>>16; x=Math.imul(x,0x7feb352d)>>>0; x^=x>>>15;
  x=Math.imul(x,0x846ca68b)>>>0; x^=x>>>16; return x>>>0;
}
function prUnit(seed){ return prMix(hash32('pr|'+String(seed)))/4294967296; }
/** Tohumdan deterministik olasılık kapısı (Math.random YERİNE). */
function prChance(seed,p){ return prUnit(seed)<Number(p); }
/** Tohumdan deterministik dizi seçimi. */
function prPick(seed,arr){
  if(!Array.isArray(arr)||!arr.length) return null;
  return arr[Math.floor(prUnit(seed)*arr.length)%arr.length];
}
/** Ağırlıklı dağılımdan ({a:0.6,b:0.4}) deterministik anahtar seçimi. */
function prWeighted(seed,dist){
  const keys=Object.keys(dist||{});
  if(!keys.length) return null;
  let toplam=0; keys.forEach(k=>{ toplam+=Number(dist[k])||0; });
  if(toplam<=0) return keys[0];
  let r=prUnit(seed)*toplam;
  for(const k of keys){ r-=Number(dist[k])||0; if(r<0) return k; }
  return keys[keys.length-1];
}

// ===== EKONOMİ ÇEKİRDEĞİ: işlem defteri + haftalık döngü =====
/** Tüm para hareketleri buradan geçer — bilanço gerçek veriden beslenir. */

/* ══ FAZ 10 — YAYIN ALTYAPISI (test bayrağı · analitik · üretim tespiti) ════════════════
   Oyunun hedefi çok oyunculu ve FİKSTÜR TARİHLİ: maç, saati gelince oynanır. Bugün fikstür
   kayıtlarında saat alanı (scheduledAt) yok — tek oyunculu sürümde maçlar art arda oynanabilir
   ve bu BİLİNÇLİ bir test kolaylığıdır. Kapı yine de şimdiden tek noktada kuruluyor: sunucu
   tarafı geldiğinde davranış yalnız burada açılır, kapıyı atlayan yol açık bir bayrağın
   (?test=1) arkasındadır. Node harness'lerinde (season-loop, band, box-band) location yoktur
   → test modu açık kabul edilir, araçlar bozulmaz. */
const TEST_MODU=(function(){
  try{
    if(typeof location==='undefined') return true;
    return new URLSearchParams(location.search||'').has('test');
  }catch(e){ return true; }
})();

/** Fikstür saati kapısı. scheduledAt yoksa (tek oyunculu sürüm) kapı açıktır. */
function matchTimeGateOk(match){
  if(TEST_MODU) return true;
  const at=match?Number(match.scheduledAt||0):0;
  if(!at||!isFinite(at)) return true;
  return Date.now()>=at;
}
/** Kapı kapalıyken kullanıcıya gösterilecek mesaj (maç saatini içerir). */
function matchTimeGateMsg(match){
  const base=(typeof t==='function'?t('Maç saati henüz gelmedi.'):'Maç saati henüz gelmedi.');
  const at=match?Number(match.scheduledAt||0):0;
  if(!at||!isFinite(at)) return base;
  let s='';
  try{ s=new Date(at).toLocaleString(typeof getLang==='function'&&getLang()==='en'?'en-US':'tr-TR'); }catch(e){ s=''; }
  return s?base+' ('+s+')':base;
}

/** Yayın sunucusunda mıyız? (yerel geliştirme ve test araçları hariç) */
function isProdHost(){
  try{
    if(typeof location==='undefined') return false;
    if(location.protocol!=='https:') return false;
    const h=String(location.hostname||'');
    if(!h||h==='localhost'||h==='127.0.0.1'||h==='[::1]') return false;
    return !/\.local$/.test(h);
  }catch(e){ return false; }
}

/* ── Analitik (çerezsiz, kişisel veri toplamaz) ────────────────────────────────────────
   Varsayılan KAPALI: ANALYTICS_SRC boşken hiçbir dış istek yapılmaz; olaylar yalnız bellekteki
   halkaya yazılır (window.__charazayAnalytics — tools/faz10-check.js bunu okur). Yayında açmak
   için ANALYTICS_SRC + ANALYTICS_SITE doldurulur (Umami/Plausible), başka değişiklik gerekmez.
   Betik ayrıca YALNIZ üretim sunucusunda yüklenir; yerel testlerde ölçüm kirletilmez. */
const ANALYTICS_SRC='';
const ANALYTICS_SITE='';
const ANALYTICS_KEY='charazay_analytics';
/** İzlenen olaylar — yeni olay eklerken bu listeye de yaz (belge niteliğinde). */
const ANALYTICS_EVENTS=['oyun_acildi','takim_kuruldu','ogretici_atlandi','ogretici_bitti',
  'ilk_mac_bitti','gun2_donus','davet_paylasildi','sonuc_paylasildi','magaza_acildi','reklam_izlendi'];
const _analyticsLog=[];
const _analyticsOnce={};

function trackEvent(name,props){
  try{
    if(!name) return;
    const rec={ad:String(name),t:Date.now(),props:props||null};
    _analyticsLog.push(rec);
    if(_analyticsLog.length>200) _analyticsLog.shift();
    if(typeof window!=='undefined') window.__charazayAnalytics=_analyticsLog;
    if(typeof umami!=='undefined'&&umami&&typeof umami.track==='function') umami.track(rec.ad,props||undefined);
    else if(typeof plausible==='function') plausible(rec.ad,props?{props:props}:undefined);
  }catch(e){}
}
/** Oturum başına bir kez. */
function trackOnce(name,props){
  if(!name||_analyticsOnce[name]) return;
  _analyticsOnce[name]=1;
  trackEvent(name,props);
}
function _analyticsRead(){
  try{ return JSON.parse(localStorage.getItem(ANALYTICS_KEY)||'{}')||{}; }catch(e){ return {}; }
}
function _analyticsWrite(o){
  try{ localStorage.setItem(ANALYTICS_KEY,JSON.stringify(o||{})); }catch(e){}
}
/** Tarayıcı başına bir kez (huni kilometre taşları: ilk maç, ertesi gün dönüşü). */
function trackMilestone(name,props){
  if(!name) return;
  const o=_analyticsRead();
  if(o[name]) return;
  o[name]=Date.now();
  _analyticsWrite(o);
  trackEvent(name,props);
}
function initAnalytics(){
  try{
    if(ANALYTICS_SRC&&ANALYTICS_SITE&&isProdHost()&&typeof document!=='undefined'){
      const s=document.createElement('script');
      s.async=true; s.defer=true; s.src=ANALYTICS_SRC;
      s.setAttribute('data-website-id',ANALYTICS_SITE);
      document.head.appendChild(s);
    }
  }catch(e){}
  trackOnce('oyun_acildi');
  /* Ertesi gün dönüşü: ilk ziyaretten 20-72 saat sonraki ilk açılış. */
  try{
    const o=_analyticsRead();
    const first=Number(o.ilk_ziyaret||0);
    if(!first){ o.ilk_ziyaret=Date.now(); _analyticsWrite(o); }
    else{
      const saat=(Date.now()-first)/3600000;
      if(saat>=20&&saat<=72) trackMilestone('gun2_donus');
    }
  }catch(e){}
}
