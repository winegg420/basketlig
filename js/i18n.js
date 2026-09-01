/* ══════════════════════════════════════════════════════════════════════════════════════
   FAZ F (30. oturum) — I18N ÇEKİRDEĞİ (TR / EN)
   Oyun tek dosyalık ve tüm metinler Türkçe gömülü yazılmıştı. Yeniden yazmak yerine
   KAYNAK-DİZE ANAHTARLI bir çeviri katmanı kuruldu:
     t('Kadro Yönetimi')  → dil TR ise aynısını, EN ise sözlükteki karşılığını döndürür.
   Böylece sözlükte olmayan her metin Türkçesiyle çalışmaya devam eder (asla kırılmaz).

   Üç mekanizma:
     1) SÖZLÜK (I18N_TR_EN)  — birebir dize eşlemesi. Anlatım havuzları %S/%SC şablonlu
        olduğu için (JS interpolasyonu yok) doğrudan buradan çevrilir.
     2) KALIPLAR (I18N_PATTERNS) — içinde oyuncu adı/sayı geçen üretilmiş metinler için
        regex → şablon. Örn. "Ali Kaya 5. faulüne ulaştı" → "Ali Kaya picked up a 5th foul".
     3) DOM YÜRÜTÜCÜ (applyStaticI18n) — HTML gövdesindeki sabit metinleri, kaynağa hiç
        dokunmadan, metin düğümü + placeholder/title/aria-label üzerinden çevirir.

   Bu dosya `charazay2.0.html` içinde EN ÖNCE yüklenir; diğer modüller t()'yi serbestçe kullanır.
   ══════════════════════════════════════════════════════════════════════════════════════ */

const I18N_LANG_KEY='charazay_lang';
const I18N_LANGS=[
  {code:'tr', ad:'Türkçe',  bayrak:'🇹🇷'},
  {code:'en', ad:'English', bayrak:'🇬🇧'}
];
let _lang=(function(){
  try{
    const v=localStorage.getItem(I18N_LANG_KEY);
    if(v==='tr'||v==='en') return v;
    /* İlk açılışta tarayıcı diline göre seç — Türkçe değilse İngilizce. */
    const nav=(navigator&&(navigator.language||navigator.userLanguage)||'tr').toLowerCase();
    return nav.indexOf('tr')===0?'tr':'en';
  }catch(e){ return 'tr'; }
})();

function getLang(){ return _lang; }
function isEN(){ return _lang==='en'; }

/** Kaynak-dize anahtarlı çeviri. params verilirse {ad} yer tutucuları doldurulur. */
function t(s,params){
  let out=String(s==null?'':s);
  if(_lang!=='tr'){
    const dict=I18N_TR_EN;
    if(Object.prototype.hasOwnProperty.call(dict,out)) out=dict[out];
    else {
      const trimmed=out.trim();
      if(trimmed!==out&&Object.prototype.hasOwnProperty.call(dict,trimmed)){
        out=out.replace(trimmed,dict[trimmed]);
      }
    }
  }
  if(params){
    Object.keys(params).forEach(k=>{
      out=out.split('{'+k+'}').join(String(params[k]));
    });
  }
  return out;
}

/** Üretilmiş (isim/sayı gömülü) metinler için kalıp tabanlı çeviri. */
function tp(s){
  if(_lang==='tr') return s;
  let str=String(s==null?'':s);
  /* Önce birebir sözlük — tam eşleşme varsa kalıplara hiç girme. */
  if(Object.prototype.hasOwnProperty.call(I18N_TR_EN,str)) return I18N_TR_EN[str];
  for(let i=0;i<I18N_PATTERNS.length;i++){
    const p=I18N_PATTERNS[i];
    if(p[0].test(str)){
      str=str.replace(p[0],p[1]);
      if(!p[2]) return str;   /* p[2]=true → zincirlemeye devam et (parça çeviri) */
    }
  }
  return str;
}

/** HTML parçalarındaki bilinen TR ifadeleri çevirir (etiketleri bozmadan, metin düğümü bazlı). */
function tHtml(html){
  if(_lang==='tr') return html;
  try{
    const box=document.createElement('div');
    box.innerHTML=String(html==null?'':html);
    _i18nWalk(box);
    return box.innerHTML;
  }catch(e){ return html; }
}

/** Sayı biçimi — TR "50.000", EN "50,000". */
function i18nNum(n){
  const v=Number(n)||0;
  try{ return v.toLocaleString(_lang==='tr'?'tr-TR':'en-US'); }catch(e){ return String(v); }
}

const I18N_SKIP_TAGS={SCRIPT:1,STYLE:1,SVG:1,CANVAS:1,TEXTAREA:1};
function _i18nWalk(root){
  if(!root) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const p=node.parentNode;
      if(!p||I18N_SKIP_TAGS[p.nodeName]) return NodeFilter.FILTER_REJECT;
      return node.nodeValue&&node.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
    }
  });
  const jobs=[];
  let n;
  while((n=walker.nextNode())) jobs.push(n);
  jobs.forEach(_i18nTextNode);
  /* Nitelikler: placeholder / title / aria-label / value(button) */
  const attrs=['placeholder','title','aria-label'];
  const els=root.querySelectorAll?root.querySelectorAll('*'):[];
  Array.prototype.forEach.call(els,el=>{
    attrs.forEach(a=>{
      const v=el.getAttribute&&el.getAttribute(a);
      if(!v) return;
      const hit=I18N_TR_EN[v.trim()];
      if(hit!=null&&hit!==v.trim()) el.setAttribute(a,hit);
    });
    if(el.tagName==='OPTION'&&el.textContent){
      const hit=I18N_TR_EN[el.textContent.trim()];
      if(hit!=null) el.textContent=hit;
    }
  });
}

/** Sayfadaki sabit (HTML gövdesinden gelen) metinleri çevirir. */
function applyStaticI18n(){
  if(_lang==='tr') return;   /* kaynak zaten Türkçe */
  try{ _i18nWalk(document.body); }catch(e){}
  try{ document.documentElement.setAttribute('lang',_lang); }catch(e){}
}

/** Dili değiştir — kayıtlı tutulur ve sayfa yeniden yüklenerek tüm arayüz yeni dile geçer. */
function setLang(code){
  if(code!=='tr'&&code!=='en') return;
  if(code===_lang) return;
  try{ localStorage.setItem(I18N_LANG_KEY,code); }catch(e){}
  _lang=code;
  /* Metinlerin çoğu render sırasında üretildiği için en temiz yol yeniden yüklemektir;
     oyun durumu localStorage/IndexedDB'de olduğundan hiçbir ilerleme kaybolmaz. */
  try{ if(typeof saveGameNow==='function'&&G&&G.team) saveGameNow(false); }catch(e){}
  setTimeout(()=>{ try{ location.reload(); }catch(e){} },60);
}

/** Dil seçici (giriş ekranı + ayarlar) */
function langPickerHtml(){
  return I18N_LANGS.map(l=>`<button type="button" class="lang-btn${l.code===_lang?' sel':''}" onclick="setLang('${l.code}')">${l.bayrak} ${l.ad}</button>`).join('');
}

/* ── Kalıp tabanlı çeviriler (isim/sayı gömülü üretilmiş metinler) — F2/F3'te doldurulur ── */
const I18N_PATTERNS=[];

/* ══ KATALOG YERELLEŞTİRME ═════════════════════════════════════════════════════════════
   Oyunun sabit veri tabloları (mevkiler, statlar, roller, setler, kişilikler, sakatlıklar,
   arena/koç/antrenman seviyeleri, spiker anlatım havuzları) tek seferde YERİNDE çevrilir.
   Böylece bu verileri kullanan yüzlerce çağrı noktasına hiç dokunmadan tüm arayüz dil değiştirir.
   Yalnızca EN modunda ve yalnızca bir kez çalışır. */
let _catalogsLocalized=false;
function localizeCatalogs(){
  if(_lang==='tr'||_catalogsLocalized) return;
  _catalogsLocalized=true;
  const tr=v=>(typeof v==='string'?t(v):v);
  const mapObj=(o,keys)=>{ if(!o) return; Object.keys(o).forEach(k=>{
    const v=o[k];
    if(typeof v==='string'){ o[k]=tr(v); return; }
    if(v&&typeof v==='object') keys.forEach(f=>{ if(typeof v[f]==='string') v[f]=tr(v[f]); });
  }); };
  const mapArr=(a,keys)=>{ if(!Array.isArray(a)) return; a.forEach(v=>{
    if(typeof v==='string') return;    /* dizideki düz metinler ayrıca ele alınır */
    if(v&&typeof v==='object') keys.forEach(f=>{ if(typeof v[f]==='string') v[f]=tr(v[f]); });
  }); };
  const mapStrArr=a=>{ if(Array.isArray(a)) for(let i=0;i<a.length;i++) if(typeof a[i]==='string') a[i]=tr(a[i]); };
  try{ mapObj(typeof POZ_TR!=='undefined'?POZ_TR:null,[]); }catch(e){}
  try{ mapObj(typeof STAT_LABELS!=='undefined'?STAT_LABELS:null,[]); }catch(e){}
  try{ mapObj(typeof ROLLER!=='undefined'?ROLLER:null,['ad','desc']); }catch(e){}
  try{ mapObj(typeof EG_META!=='undefined'?EG_META:null,['ad','desc']); }catch(e){}
  try{ mapObj(typeof KISILIKLER!=='undefined'?KISILIKLER:null,['ad','desc']); }catch(e){}
  try{ mapArr(typeof PLAYBOOKS!=='undefined'?PLAYBOOKS:null,['ad','ozet']); }catch(e){}
  try{ if(typeof PLAYBOOKS!=='undefined') PLAYBOOKS.forEach(p=>{ if(p&&p.uyum&&typeof p.uyum.ad==='string') p.uyum.ad=tr(p.uyum.ad); }); }catch(e){}
  try{ mapArr(typeof DEF_SETS!=='undefined'?DEF_SETS:null,['ad','ozet']); }catch(e){}
  try{ mapArr(typeof INJURIES!=='undefined'?INJURIES:null,['ad','bolge','siddet']); }catch(e){}
  try{ mapArr(typeof ARENA_LVL!=='undefined'?ARENA_LVL:null,['isim']); }catch(e){}
  try{ mapArr(typeof YOUTH_FAC_LVL!=='undefined'?YOUTH_FAC_LVL:null,['isim']); }catch(e){}
  try{ mapArr(typeof KOC_T!=='undefined'?KOC_T:null,['isim','uzm','bonus']); }catch(e){}
  try{ mapArr(typeof ANTRENMAN_T!=='undefined'?ANTRENMAN_T:null,['isim']); }catch(e){}
  try{ mapArr(typeof SPIKERS!=='undefined'?SPIKERS:null,['ad','stil']); }catch(e){}
  try{ mapStrArr(typeof SCOUT_REGIONS!=='undefined'?SCOUT_REGIONS:null); }catch(e){}
  /* F10-6: öğretici adımları. Metinler <strong> içerdiği için DOM düğümü bazlı çeviri
     onları parçalar; katalog olarak burada, innerHTML'e girmeden önce çevrilirler. */
  try{ mapArr(typeof TUT_STEPS!=='undefined'?TUT_STEPS:null,['baslik','metin']); }catch(e){}
  /* Spiker anlatım havuzları: {spikerId:{kind:[şablon,...]}} — %S/%SC yer tutucuları korunur. */
  try{
    if(typeof SPIKER_LINES!=='undefined') Object.keys(SPIKER_LINES).forEach(sp=>{
      const set=SPIKER_LINES[sp];
      Object.keys(set).forEach(kind=>mapStrArr(set[kind]));
    });
  }catch(e){}
  try{ mapStrArr(typeof MOVE_LINES!=='undefined'?MOVE_LINES:null); }catch(e){}
  try{ mapStrArr(typeof REB_OFF_LINES!=='undefined'?REB_OFF_LINES:null); }catch(e){}
  try{ mapStrArr(typeof REB_DEF_LINES!=='undefined'?REB_DEF_LINES:null); }catch(e){}
  try{ if(typeof MOVE_BY!=='undefined') Object.keys(MOVE_BY).forEach(k=>mapStrArr(MOVE_BY[k])); }catch(e){}
  try{ if(typeof ASSIST_PHRASES!=='undefined') Object.keys(ASSIST_PHRASES).forEach(k=>mapStrArr(ASSIST_PHRASES[k])); }catch(e){}
  /* F14: zincir anlatım + spiker imzası + yorumcu havuzları. */
  try{ if(typeof AKIS_ON!=='undefined') Object.keys(AKIS_ON).forEach(k=>mapStrArr(AKIS_ON[k])); }catch(e){}
  try{ if(typeof KISA_CEKIRDEK!=='undefined') Object.keys(KISA_CEKIRDEK).forEach(k=>mapStrArr(KISA_CEKIRDEK[k])); }catch(e){}
  /* FAZ 28 §2: şut sınıfı ifade havuzu (smaç/turnike/floater/kanca/tipin). */
  try{ if(typeof SUT_LINES!=='undefined') Object.keys(SUT_LINES).forEach(t=>{
    const set=SUT_LINES[t]; Object.keys(set).forEach(k=>mapStrArr(set[k]));
  }); }catch(e){}
  /* FAZ 26 §1: şut tipine özgü zincir çekirdekleri (smaç / floater / turnike). */
  try{ if(typeof KISA_CEKIRDEK_SUT!=='undefined') Object.keys(KISA_CEKIRDEK_SUT).forEach(t=>{
    const set=KISA_CEKIRDEK_SUT[t]; Object.keys(set).forEach(k=>mapStrArr(set[k]));
  }); }catch(e){}
  try{ if(typeof YORUMCU_LINES!=='undefined') Object.keys(YORUMCU_LINES).forEach(k=>mapStrArr(YORUMCU_LINES[k])); }catch(e){}
  try{ mapStrArr(typeof IMZA_ESPRI!=='undefined'?IMZA_ESPRI:null); }catch(e){}
  try{ mapStrArr(typeof IMZA_ISTAT!=='undefined'?IMZA_ISTAT:null); }catch(e){}
  try{ mapStrArr(typeof IMZA_SERI!=='undefined'?IMZA_SERI:null); }catch(e){}
  /* B-1: FAZ 13 ile gelen havuzlar buraya HİÇ kaydedilmemişti — EN oyuncu canlı anlatımın
     %37,5'ini Türkçe görüyordu. Yeni bir anlatım havuzu eklerken bu listeye de yaz;
     `node tools/i18n-scan.js` artık canlı anlatım akışını da tarıyor ve %5 üstünü düşürür. */
  try{ mapStrArr(typeof QSTART_LINES!=='undefined'?QSTART_LINES:null); }catch(e){}
  try{ mapStrArr(typeof QEND_LINES!=='undefined'?QEND_LINES:null); }catch(e){}
  try{ mapStrArr(typeof HALFTIME_LINES!=='undefined'?HALFTIME_LINES:null); }catch(e){}
  try{ mapStrArr(typeof SUB_LINES!=='undefined'?SUB_LINES:null); }catch(e){}
  try{ mapStrArr(typeof FATIGUE_LINES!=='undefined'?FATIGUE_LINES:null); }catch(e){}
  try{ mapStrArr(typeof FOUL_TAIL!=='undefined'?FOUL_TAIL:null); }catch(e){}
  try{ mapStrArr(typeof STEAL_LOSS!=='undefined'?STEAL_LOSS:null); }catch(e){}
  try{ mapStrArr(typeof REB_DEF_SHORT!=='undefined'?REB_DEF_SHORT:null); }catch(e){}
  try{ mapStrArr(typeof REB_OFF_SHORT!=='undefined'?REB_OFF_SHORT:null); }catch(e){}
  try{ mapStrArr(typeof CORNER3_MADE!=='undefined'?CORNER3_MADE:null); }catch(e){}
  try{ mapStrArr(typeof CORNER3_MISS!=='undefined'?CORNER3_MISS:null); }catch(e){}
  /* FAZ 25: saat referansı, son bölüm tonu, taktik girişi, serbest atış ve faul havuzları.
     B-1 dersi: yeni bir anlatım havuzu buraya kaydedilmezse EN oyuncu o satırları
     Türkçe görür ve `i18n-scan` canlı anlatım kapısı düşer. */
  try{ mapStrArr(typeof SAAT_LINES!=='undefined'?SAAT_LINES:null); }catch(e){}
  try{ mapStrArr(typeof SAAT_QSON!=='undefined'?SAAT_QSON:null); }catch(e){}
  try{ if(typeof SON_BOLUM!=='undefined') Object.keys(SON_BOLUM).forEach(k=>mapStrArr(SON_BOLUM[k])); }catch(e){}
  /* TAKTIK_ADI/TAKTIK_GIRIS nesne dizileridir — alan bazında çevrilir. */
  try{ mapArr(typeof TAKTIK_ADI!=='undefined'?TAKTIK_ADI:null,['ad','e']); }catch(e){}
  try{ mapArr(typeof TAKTIK_GIRIS!=='undefined'?TAKTIK_GIRIS:null,['t']); }catch(e){}
}

/* ══ CANLI DOM ÇEVİRİSİ ═══════════════════════════════════════════════════════════════
   Arayüzün büyük kısmı çalışma anında innerHTML ile üretiliyor. Sözlükte tam karşılığı olan
   her metin düğümü, üretildiği anda çevrilir — böylece JS tarafındaki yüzlerce çağrı noktasına
   dokunmadan arayüz İngilizceye döner. Kendi değişikliğimizi tekrar işlememek için bayrak var. */
let _i18nBusy=false;
let _i18nObserver=null;
function startI18nObserver(){
  if(_lang==='tr'||_i18nObserver||typeof MutationObserver==='undefined') return;
  const root=document.body;
  if(!root) return;
  _i18nObserver=new MutationObserver(muts=>{
    if(_i18nBusy) return;
    _i18nBusy=true;
    try{
      muts.forEach(m=>{
        if(m.type==='characterData'){ _i18nTextNode(m.target); return; }
        Array.prototype.forEach.call(m.addedNodes||[],n=>{
          if(n.nodeType===3) _i18nTextNode(n);
          else if(n.nodeType===1) _i18nWalk(n);
        });
      });
    }catch(e){}
    _i18nBusy=false;
  });
  _i18nObserver.observe(root,{childList:true,subtree:true,characterData:true});
}
/* Metin düğümü çevirisi: önce BİREBİR sözlük, tutmazsa İFADE katmanı.
   İfade katmanı, "🇩🇪 Almanya • 31 yaş" gibi çalışma anında birleştirilmiş dizeleri
   kelime/kalıp düzeyinde çevirir; oyuncu adlarına dokunmaması için kalıplar dar tutuldu. */
/* F8-5: Sözlük kaynak-dize anahtarlı çalışıyor; "🆓 Serbest Oyuncular" gibi EMOJİ ÖN EKLİ
   metinler anahtar olarak hiç eklenmediği için EN modunda olduğu gibi kalıyordu (canlı
   oturumda 9 dize gözlendi). Her emoji'li varyantı sözlüğe eklemek yerine kalıcı çözüm:
   baştaki simge/boşluk önekini ayır, GÖVDEYİ çevir, öneki olduğu gibi geri koy.
   (30. oturumdaki " ASCII tabanlı" hatasıyla aynı sınıf: anahtar normalize edilmiyordu.) */
function _splitIconPrefix(str){
  try{
    /* Baştaki simge/boşluk/noktalama önekini tara. Harf tespiti için büyük/küçük harf
       karşılaştırması kullanılır (emoji ve noktalamada ikisi eşittir, harfte değil) —
       böylece Unicode özellik kaçışlarına gerek kalmaz ve Türkçe harfler de doğru tanınır. */
    let i=0;
    while(i<str.length){
      const c=str[i];
      const cc=str.codePointAt(i);
      if(c>='0'&&c<='9') break;                    /* rakam: gövde başlamış */
      if(c.toLowerCase()!==c.toUpperCase()) break; /* harf: gövde başlamış */
      i+=(cc>0xFFFF?2:1);
    }
    if(!i) return null;
    const pre=str.slice(0,i);
    const body=str.slice(i).trim();
    if(!body||body===str) return null;
    return {pre,body};
  }catch(e){ return null; }
}
/** Bir anahtarı çevirir: önce tam eşleşme, sonra simge öneki ayrılmış gövde, sonra ifade katmanı. */
function _i18nResolve(key){
  const hit=I18N_TR_EN[key];
  if(hit!=null&&hit!==key) return hit;
  const sp=_splitIconPrefix(key);
  if(sp){
    const h2=I18N_TR_EN[sp.body];
    if(h2!=null&&h2!==sp.body) return sp.pre+h2;
    const p2=i18nPhrases(sp.body);
    if(p2!==sp.body) return sp.pre+p2;
  }
  const ph=i18nPhrases(key);
  return ph!==key?ph:null;
}
function _i18nTextNode(node){
  if(!node||!node.nodeValue) return;
  const p=node.parentNode;
  if(p&&I18N_SKIP_TAGS[p.nodeName]) return;
  const raw=node.nodeValue;
  const key=raw.trim();
  if(!key) return;
  const out=_i18nResolve(key);
  if(out!=null&&out!==key) node.nodeValue=raw.replace(key,out);
}
/** İfade (parça) çevirisi — sözlükte tam karşılığı olmayan birleşik metinler için. */
function i18nPhrases(str){
  if(_lang==='tr') return str;
  let out=str;
  for(let i=0;i<I18N_PHRASES.length;i++){
    const p=I18N_PHRASES[i];
    out=out.replace(p[0],p[1]);
  }
  return out;
}
/** Boot: katalogları çevir, sabit metinleri uygula, canlı gözlemciyi başlat. */
function initI18n(){
  try{ localizeCatalogs(); }catch(e){}
  try{ applyStaticI18n(); }catch(e){}
  try{ startI18nObserver(); }catch(e){}
}

/* Dil katmanı, DOM ayrıştırılır ayrıştırılmaz devreye girer: giriş ekranı `display:flex` ile
   window.onload'dan ÖNCE görünür olduğu için boot'u beklemek ilk ekranın Türkçe görünmesine
   yol açıyordu. initI18n idempotenttir; window.onload'daki çağrı zararsızca tekrar eder. */
if(typeof document!=='undefined'){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ try{ initI18n(); }catch(e){} });
  else { try{ initI18n(); }catch(e){} }
}
