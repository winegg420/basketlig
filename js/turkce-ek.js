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

/* ── FAZ 33 §2: OKUNUŞ NORMALİZASYONU ─────────────────────────────────────────
   Türkçe ek uyumu YAZILIŞA değil OKUNUŞA bakar. FAZ 30'a kadar bütün oyuncular
   Türk'tü ve Türkçede yazılış ≈ okunuş olduğu için sorun görünmedi. Lig
   küreselleşince yazıldığı gibi okunmayan adlar devreye girdi ve canlıda ölçüldü:

     Đurašković'de  →  doğrusu Đurašković'TE   (sondaki 'ć' Türkçede ç = sert ünsüz)
     Sy'a · Sy'da   →  doğrusu Sy'YE · Sy'DE   ("Si" okunur; y burada ÜNLÜ)

   Normalizasyon YALNIZ ek seçiminde kullanılır — ekranda ad özgün yazımıyla kalır
   ("Đurašković'te", "Đuraşkoviç'te" DEĞİL).

   Neden güvenli: ek yalnız iki şeye bakar — (a) sondan ilk ünlü, (b) son harfin
   sert ünsüz/ünlü olup olmadığı. Kelime ortasındaki dönüşümler bu ikisini
   etkilemediği sürece sonucu değiştirmez; bu yüzden tablo cömert olabilir.

   TABLO (brif §2.3):
     ć č c → ç   |  š → ş   |  ž → j   |  đ → c   |  w → v   |  x → ks
     q → k       |  ñ → ny  |  ll → y  |  j → h   |  th → t  |  y(sonda) → i
   Artı: aksanlı ünlüler Türkçe karşılığına katlanır (é→e, ú→u, å→o, ø→ö …). */

/* Tek geçişli harf haritası — SIRALI zincir kullanılmaz. 'đ→c' ile 'c→ç' zincirlenirse
   'đ' iki adımda 'ç' olur (yanlış); tek geçiş bunu yapısal olarak engeller. */
const _OKU_HARF={
  'ć':'ç','č':'ç','c':'ç','ĉ':'ç',
  'š':'ş','ś':'ş','ş':'ş',
  'ž':'j','ź':'j','ż':'j',
  'đ':'c','ð':'c',
  'w':'v','x':'ks','q':'k','j':'h',
  'ñ':'ny',
  /* aksanlı ünlüler → Türkçe ünlü değeri */
  'á':'a','à':'a','ä':'a','ã':'a','å':'o','ā':'a',
  'é':'e','è':'e','ê':'e','ë':'e','ē':'e','ę':'e',
  'í':'i','ì':'i','ï':'i','ī':'i','į':'i',
  'ó':'o','ò':'o','ô':'o','õ':'o','ō':'o','ø':'ö',
  'ú':'u','ù':'u','ū':'u','ų':'u',
  'ý':'i','ł':'l','ń':'n','ň':'n','ř':'r','ś':'ş','ť':'t','ď':'d',
  'ß':'s','æ':'e','œ':'ö'
};
/* Çok harfli okunuşlar — tek geçişten ÖNCE uygulanır. */
const _OKU_IKILI=[
  [/th/g,'t'],      /* Smith → Smit  (sert t) */
  [/sch/g,'ş'],     /* Scholz → Şolz */
  [/ll/g,'y'],      /* Villa → Viya */
  [/ch/g,'ç'],      /* Bianchi → Bianoçi; sondaki 'ch' sert kalır */
  [/ph/g,'f']
];
/**
 * Adı Türkçe okunuşa yaklaştırır. SADECE ek seçimi için; ekrana YAZILMAZ.
 * @param {string} kelime  ekin yapışacağı son kelime (küçük harfe çevrilmiş)
 */
function _trOkunus(kelime){
  try{
    let t=String(kelime||'');
    for(let i=0;i<_OKU_IKILI.length;i++) t=t.replace(_OKU_IKILI[i][0],_OKU_IKILI[i][1]);
    let cik='';
    for(let i=0;i<t.length;i++){
      const h=t[i];
      /* 'y' sonda ya da ünsüzden sonra ÜNLÜDÜR (Sy → "Si", Gyenge → "Gienge").
         Ünlüden sonra geliyorsa Türkçedeki gibi ünsüzdür (Mihaylov, Bay). */
      /* 'j' → 'h' YALNIZ kelime ortasında. Brifin tablosu İspanyolca okunuşu verir
         (Juan → Huan) ama SON harfteki 'j' Slav dillerinde yumuşaktır ve Türkçe 'j'
         gibi okunur ("Mihalj" = Mihaly). Sonda sertleştirmek "Mihalj'ta" üretiyordu;
         doğrusu "Mihalj'da". İspanyolcada sözcük sonu 'j' pratikte yoktur, bu yüzden
         kural kaybı yok. Kelime ortasındaki dönüşüm ek kararını zaten etkilemez. */
      if(h==='j'&&i===t.length-1){ cik+='j'; continue; }
      if(h==='y'){
        const onceki=cik[cik.length-1];
        const oncekiUnlu=onceki!=null&&_TR_UNLU.indexOf(onceki)>=0;
        cik+=oncekiUnlu?'y':'i';
        continue;
      }
      cik+=(_OKU_HARF[h]!=null?_OKU_HARF[h]:h);
    }
    return cik;
  }catch(e){ return String(kelime||''); }
}

/* Türk alfabesinde harf ADLARI. Ünlüsüz KISALTMALAR (BK, TBMM) harf harf okunur ve ek
   okunuşa uyar: "BK" = "be-ke" → ünlüyle biter → BK'ye · BK'de · BK'nin.
   Ayrım YAZIMDAN gelir: tamamı büyük harf + ünlüsüz = kısaltma; karışık yazım ise
   addır ("Ng" bir soyadıdır, harf harf okunmaz → Ng'e). */
const _HARF_ADI={b:'be',c:'ce','ç':'çe',d:'de',f:'fe',g:'ge','ğ':'ğe',h:'he',j:'je',k:'ke',
  l:'le',m:'me',n:'ne',p:'pe',r:'re',s:'se','ş':'şe',t:'te',v:'ve',y:'ye',z:'ze'};
function _trKisaltmaMi(kelimeHam){
  try{
    const t=String(kelimeHam||'');
    if(t.length<2) return false;
    if(t!==t.toUpperCase()) return false;                 /* karışık yazım → ad */
    if(!/^[A-ZÇĞİÖŞÜ]+$/.test(t)) return false;
    return _trSonUnlu(trKucuk(t))==null;                  /* ünlü varsa kısaltma sayma */
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

    /* İyelik tespiti (-ları/-leri) TÜRKÇE yazılışa bakar — normalize edilmiş biçime
       değil; "Boğaları" okunuşta da aynıdır ama kural Türkçe kalıba bağlıdır. */
    const kucuk=trKucuk(kelime);
    /* FAZ 33 §2: ek KARARI okunuş üzerinden verilir, ad özgün yazımıyla döner. */
    const oku=_trKisaltmaMi(kelime)?(_HARF_ADI[trKucuk(kelime).slice(-1)]||_trOkunus(kucuk)):_trOkunus(kucuk);
    const sonHarf=oku[oku.length-1];
    const sonUnlu=_trSonUnlu(oku);
    /* Ünlüsüz ad (Ng, BK …) Türkçede harf adlarıyla okunur ve harf adlarının hepsi
       İNCE ünlü taşır (be, ce, de, ge, ne, se, te …) → "Ng'e", "Ng'de". Eskiden kalın
       varsayılan vardı ve "Ng'a" çıkıyordu. */
    const tab=_TR_UNLU_TABLO[sonUnlu]||['e','i'];
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
