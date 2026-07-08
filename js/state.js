// ===== VERİ =====
const ULKELER=[{ad:'ABD',b:'🇺🇸'},{ad:'Türkiye',b:'🇹🇷'},{ad:'Fransa',b:'🇫🇷'},{ad:'İspanya',b:'🇪🇸'},{ad:'Yunanistan',b:'🇬🇷'},{ad:'Brezilya',b:'🇧🇷'},{ad:'Arjantin',b:'🇦🇷'},{ad:'Almanya',b:'🇩🇪'},{ad:'Sırbistan',b:'🇷🇸'},{ad:'Avustralya',b:'🇦🇺'},{ad:'Kanada',b:'🇨🇦'},{ad:'İtalya',b:'🇮🇹'},{ad:'Hırvatistan',b:'🇭🇷'},{ad:'Slovenya',b:'🇸🇮'},{ad:'Nijerya',b:'🇳🇬'},{ad:'Filipinler',b:'🇵🇭'},{ad:'Japonya',b:'🇯🇵'},{ad:'Çin',b:'🇨🇳'},{ad:'Güney Kore',b:'🇰🇷'},{ad:'Senegal',b:'🇸🇳'},{ad:'Litvanya',b:'🇱🇹'},{ad:'Belçika',b:'🇧🇪'},{ad:'Polonya',b:'🇵🇱'},{ad:'Meksika',b:'🇲🇽'},{ad:'Portekiz',b:'🇵🇹'},{ad:'İngiltere',b:'🇬🇧'}];
const TR_ULKE={ad:'Türkiye',b:'🇹🇷'};
/** Yan panelde gösterilecek alt lig sayısı (TBL ayrı). İleride kayıt / içerik arttıkça artırılabilir. */
const SIDEBAR_DIV_MAX_VISIBLE=1;
const POZLAR=['PG','SG','SF','PF','C'];
const POZ_TR={PG:'Organizatör',SG:'Şutör',SF:'K. Forvet',PF:'G. Forvet',C:'Pivot'};
const SEHIR=['Adana','Trabzon','Gaziantep','Samsun','Eskişehir','Diyarbakır','Kayseri','İzmir','Bursa','Konya'];
/** Bot kulüp adı ekleri — genRandomClubName bunu kullanır (eksikti; yeni oyunda takım kurma çöküyordu). */
const LIG_T=['Basket','Spor','Yıldızları','Kartalları','Aslanları','Şimşekleri','Boğaları','Panterleri','Şahinleri','Kurtları','BK','Gençlik'];
const ILK=['Marcus','James','Kevin','Luka','Nikola','Joel','Trae','Jayson','Devin','Damian','Tyler','Darius','Cade','Paolo','Victor','Anthony','Donovan','Shai','Ja','LaMelo','Yuki','Chen','Hakeem','Kwame','Diego','Andre','Giannis','Domantas','Rudy','Jonas','Bogdan','Dennis'];
const SY=['Johnson','Williams','Smith','Brown','Jones','Davis','Miller','Wilson','Anderson','Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Tiongko','Okonkwo','Nakamura','Kim','Diallo','Kowalski','Silva','Fernandes'];
const TR_ILK=['Mehmet','Serkan','Burak','Can','Emre','Ali','Oğuz','Kaan','Berk','Mert','Arda','Enes','Furkan','Alperen','Cedi'];
const TR_SY=['Yılmaz','Kaya','Demir','Şahin','Çelik','Öztürk','Arslan','Doğan','Kılıç','Aslan'];

const TBL_STORAGE_KEY='charazay_tbl_v4';
const LEAGUE_SIZE=20;
const TBL_COMP_NAME='Türkiye Basketbol Ligi';
const CLUB_CACHE_KEY='charazay_club_public_v1';
const NEWS_SESSION_KEY='charazay_news_sess_v1';
const GAME_SAVE_KEY='charazay_game_save_v2';
const IDB_NAME='charazay_idb_v1';
const IDB_STORE_G='game';
const MATCH_CLOCK_SEC=600;   /* Regülasyon çeyrek süresi — FIBA 10 dk (gerçekçi skorlar için) */
const OT_CLOCK_SEC=300;      /* Uzatma süresi — FIBA 5 dk */
/** Eski ekonomi 2.400 KR — yeni başlangıç 50.000 KR ile orantılı fiyatlar */
const START_KR=50000;
const ECO_REF_KR=2400;
const ECO_MUL=START_KR/ECO_REF_KR;
function ecoRound(x){ return Math.max(1, Math.round(Number(x)*ECO_MUL)); }
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
function formatTblSlotLabel(key){
  if(!key) return 'TBL';
  if(key==='tbl'||String(key).startsWith('t.')) return 'TBL';
  return String(key);
}
function sidebarSlotLabel(key){
  if(key==='tbl'||String(key).startsWith('t.')) return 'TBL';
  return String(key);
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
  return Math.max(60, Math.round((24 + g*1.95 + (g*g)/115 + hi*14 + hi*hi*0.08)*1.7));
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

// ===== EKONOMİ ÇEKİRDEĞİ: işlem defteri + haftalık döngü =====
/** Tüm para hareketleri buradan geçer — bilanço gerçek veriden beslenir. */
