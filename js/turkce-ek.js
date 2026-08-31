/* ──────────────────────────────────────────────────────────────────────────────
   TÜRKÇE ÇEKİM EKİ — özel adlara ek ekleme (js/turkce-ek.js)

   Neden var: anlatım şablonlarında ek SABİT yazılmıştı ("Top %S'ye düştü"),
   isim değişince ek değişmiyordu. Canlıda ölçülen: 263 olayda 20 dilbilgisi
   hatası — "Ömer Polat'ye", "Bursa Yıldırım'de", "Kayseri Boğaları'ye",
   "Koray Gündoğdu'nin", "Onur Kaplan'nin". Yaklaşık 9-13 satırda bir hata;
   Türkçe konuşan bir oyuncu bunu ilk maçta fark eder.

   Bu dosya match-engine.js'ten ÖNCE yüklenir (charazay2.0.html script sırası
   ve tools/sim-node.js modül listesi). Hiçbir global duruma dokunmaz, saf
   fonksiyondur — maçın rastgele akışını TÜKETMEZ.
   ────────────────────────────────────────────────────────────────────────── */

/* Türkçe ünlüler. 'â/î/û' düzeltme işaretli biçimler de kalın/ince eşleriyle
   sayılır (Kâmil → ince, Hâlâ → kalın). */
const _TR_UNLU='aeıioöuüâîû';
/* Son ünlüye göre ek ünlüsü: [düz (e/a), dar (i/ı/u/ü)] */
const _TR_UNLU_TABLO={
  'a':['a','ı'], 'â':['a','ı'], 'ı':['a','ı'],
  'e':['e','i'], 'î':['e','i'], 'i':['e','i'],
  'o':['a','u'], 'u':['a','u'], 'û':['a','u'],
  'ö':['e','ü'], 'ü':['e','ü']
};
/* Sert ünsüzler (fıstıkçı şahap) — bulunma/ayrılma eki bunlardan sonra sertleşir. */
const _TR_SERT='fstkçşhp';

/* ── Zamir n'si ────────────────────────────────────────────────────────────────
   Türkçede ünlüyle biten adlarda İKİ AYRI olgu var, karıştırılırsa ek yanlış çıkar:

   (a) Kaynaştırma — sıradan, iyelik EKSİZ ad:  Gündoğdu → Gündoğdu'YA (y),
       ama tamlayanda Gündoğdu'NUN (n). Yani harf duruma göre değişir.
   (b) Zamir n'si — 3. tekil İYELİK ekiyle biten ad: Boğaları → Boğaları'NA,
       Boğaları'NDA, Boğaları'NDAN, Boğaları'NIN. Burada 'n' BÜTÜN hâl eklerinden
       önce gelir; bulunma ve ayrılmada da.

   İlk sürümde ikisi tek kural sayılmıştı; "Boğaları'da" ve "Gündoğdu'na" çıktı.
   İyelik tespiti sözlüksüz genel olarak çözülemez (Gündoğdu da 'u' ile biter),
   ama takım adlarında güvenilir iki belirti var: çoğul+iyelik kalıbı (-ları/-leri)
   ve LIG_T listesindeki tekil iyelikli adlar ("Koleji"). */
const _TR_IYELIK_RE=/(?:lar|ler)[ıi]$/;                 /* Boğaları · Ejderleri · Şahinleri */
const _TR_IYELIK_TEK=['koleji','üniversitesi','spor kulübü'];
function _trIyelikli(kucukKelime){
  try{
    if(_TR_IYELIK_RE.test(kucukKelime)) return true;
    if(_TR_IYELIK_TEK.indexOf(kucukKelime)>=0) return true;
    /* LIG_T yüklüyse ondan da doğrula — takım adı sonekleri tek kaynakta durur.
       Yüklü değilse (bu dosya state.js'ten önce çalışırsa) yukarıdaki kalıplar yeter. */
    if(typeof LIG_T!=='undefined'&&Array.isArray(LIG_T)){
      for(let i=0;i<LIG_T.length;i++){
        const s=String(LIG_T[i]||'').toLowerCase();
        if(s===kucukKelime&&(_TR_IYELIK_RE.test(s)||_TR_IYELIK_TEK.indexOf(s)>=0)) return true;
      }
    }
    return false;
  }catch(e){ return false; }
}

/** Kelimenin sonundan geriye doğru ilk ünlü. Bulunamazsa null. */
function _trSonUnlu(s){
  try{
    const t=String(s||'').toLowerCase();
    for(let i=t.length-1;i>=0;i--){ if(_TR_UNLU.indexOf(t[i])>=0) return t[i]; }
    return null;
  }catch(e){ return null; }
}

/** Ekin yapışacağı son kelime — "Kayseri Boğaları"nda ek "Boğaları"ya göre belirlenir. */
function _trSonKelime(ad){
  try{
    const a=String(ad||'').trim().split(/\s+/);
    return a[a.length-1]||'';
  }catch(e){ return ''; }
}

/** Sondaki noktalama/kısaltma işaretlerini at — "Polat." gibi girdiler eki bozmasın. */
function _trGovde(k){
  try{ return String(k||'').replace(/[.,;:!?"'`´’()\[\]]+$/,''); }catch(e){ return String(k||''); }
}

/**
 * Özel ada Türkçe çekim eki ekler. Ek kesme işaretiyle ayrılır (özel ad kuralı).
 *
 * @param {string} ad     Oyuncu ya da takım adı ("Ömer Polat", "Kayseri Boğaları")
 * @param {string} durum  'e' yönelme · 'de' bulunma · 'den' ayrılma · 'in' tamlayan · 'le' vasıta
 * @returns {string}      "Ömer Polat'a" · "Kayseri Boğaları'nda"
 *
 * Kurallar (brif §7.1):
 *  1) Ünlü uyumu — son ünlüye göre düz (a/e) veya dar (ı/i/u/ü) ek ünlüsü.
 *  2) Ünsüz benzeşmesi — sert ünsüzle biten adda bulunma/ayrılma eki -ta/-te, -tan/-ten.
 *  3) Kaynaştırma — ünlüyle biten adda yönelme ve tamlayan ekinden önce 'n'.
 *  4) Çok kelimeli adda ek SON kelimeye göre belirlenir, tam ada yapıştırılır.
 */
function turkEk(ad, durum){
  try{
    const tam=String(ad==null?'':ad).trim();
    if(!tam) return '';
    const kelime=_trGovde(_trSonKelime(tam));
    if(!kelime) return tam;

    const kucuk=kelime.toLowerCase();
    const sonHarf=kucuk[kucuk.length-1];
    const sonUnlu=_trSonUnlu(kucuk);
    /* Ünlüsüz ad (kısaltma vb.) için kalın-düz varsayılan; ek yine de doğru "görünür". */
    const tab=_TR_UNLU_TABLO[sonUnlu]||['a','ı'];
    const duz=tab[0], dar=tab[1];
    const unluIleBitiyor=_TR_UNLU.indexOf(sonHarf)>=0;
    const sertIleBitiyor=_TR_SERT.indexOf(sonHarf)>=0;
    /* Bulunma/ayrılma ekinin ilk ünsüzü: sert ünsüzden sonra t, aksi hâlde d. */
    const d=sertIleBitiyor?'t':'d';
    /* Zamir n'si yalnız iyelik ekli adlarda ve BÜTÜN hâl eklerinden önce gelir. */
    const zamirN=unluIleBitiyor&&_trIyelikli(kucuk);

    let ek;
    switch(String(durum||'').toLowerCase()){
      /* Yönelme: iyeliklide n (Boğaları'na), sıradan ünlüde y (Gündoğdu'ya). */
      case 'e':   ek=zamirN?('n'+duz):((unluIleBitiyor?'y':'')+duz);        break;
      case 'de':  ek=(zamirN?'n':'')+d+duz;                                 break;  /* Polat'ta · Boğaları'nda */
      case 'den': ek=(zamirN?'n':'')+d+duz+'n';                             break;  /* Polat'tan · Boğaları'ndan */
      /* Tamlayan: hem kaynaştırma hem zamir n'si aynı harfi verir. */
      case 'in':  ek=(unluIleBitiyor?'n':'')+dar+'n';                       break;  /* Polat'ın · Gündoğdu'nun */
      case 'le':  ek=(unluIleBitiyor?'y':'')+'l'+duz;                       break;  /* Polat'la · Gündoğdu'yla */
      case 'i':   ek=zamirN?('n'+dar):((unluIleBitiyor?'y':'')+dar);        break;  /* Polat'ı · Boğaları'nı */
      default:    return tam;                                                       /* bilinmeyen durum: düz ad */
    }
    return tam+"'"+ek;
  }catch(e){ return String(ad==null?'':ad); }
}

/**
 * Şablondaki `%X{durum}` yer tutucularını çözer.
 * `%X` (süslü parantezsiz) eskisi gibi düz adla değiştirilir — bu yüzden bu
 * fonksiyon ÖNCE çalışır, düz değiştirme sonra.
 *
 * @param {string} txt  '%R{e} düştü; %T topu çıkarıyor.'
 * @param {object} map  {R:'Ömer Polat', T:'Bursa Yıldırım'}
 */
function turkEkUygula(txt, map){
  try{
    if(!txt||txt.indexOf('{')<0) return String(txt==null?'':txt);
    return String(txt).replace(/%([A-Z]+)\{([a-z]+)\}/g,(hep,anahtar,durum)=>{
      const ad=map&&map[anahtar];
      if(ad==null||ad==='') return '';
      return turkEk(ad,durum);
    });
  }catch(e){ return String(txt==null?'':txt); }
}

/** Türkçe küçük harf — tarayıcı yerelini varsayma: İ→i, I→ı elle ele alınır. */
function trKucuk(s){
  try{
    return String(s==null?'':s).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase();
  }catch(e){ return String(s==null?'':s); }
}
/** Cümle başı için Türkçe büyük harf — i→İ, ı→I. */
function trBuyukIlk(s){
  try{
    const t=String(s==null?'':s);
    if(!t) return t;
    const ilk=t[0]==='i'?'İ':(t[0]==='ı'?'I':t[0].toUpperCase());
    return ilk+t.slice(1);
  }catch(e){ return String(s==null?'':s); }
}
