// ===== VERİ =====
const ULKELER=[{ad:'ABD',b:'🇺🇸'},{ad:'Türkiye',b:'🇹🇷'},{ad:'Fransa',b:'🇫🇷'},{ad:'İspanya',b:'🇪🇸'},{ad:'Yunanistan',b:'🇬🇷'},{ad:'Brezilya',b:'🇧🇷'},{ad:'Arjantin',b:'🇦🇷'},{ad:'Almanya',b:'🇩🇪'},{ad:'Sırbistan',b:'🇷🇸'},{ad:'Avustralya',b:'🇦🇺'},{ad:'Kanada',b:'🇨🇦'},{ad:'İtalya',b:'🇮🇹'},{ad:'Hırvatistan',b:'🇭🇷'},{ad:'Slovenya',b:'🇸🇮'},{ad:'Nijerya',b:'🇳🇬'},{ad:'Filipinler',b:'🇵🇭'},{ad:'Japonya',b:'🇯🇵'},{ad:'Çin',b:'🇨🇳'},{ad:'Güney Kore',b:'🇰🇷'},{ad:'Senegal',b:'🇸🇳'},{ad:'Litvanya',b:'🇱🇹'},{ad:'Belçika',b:'🇧🇪'},{ad:'Polonya',b:'🇵🇱'},{ad:'Meksika',b:'🇲🇽'},{ad:'Portekiz',b:'🇵🇹'},{ad:'İngiltere',b:'🇬🇧'}];
const TR_ULKE={ad:'Türkiye',b:'🇹🇷'};
/** Yan panelde gösterilecek alt lig sayısı (TBL ayrı). İleride kayıt / içerik arttıkça artırılabilir. */
const SIDEBAR_DIV_MAX_VISIBLE=1;
const POZLAR=['PG','SG','SF','PF','C'];
const POZ_TR={PG:'Organizatör',SG:'Şutör',SF:'K. Forvet',PF:'G. Forvet',C:'Pivot'};
/* F8-4: 10 şehirlik havuz 20 takımlık ligde şehir başına 3-4 takım üretiyordu (aynı ligde
   dört Kayseri takımı) ve İstanbul, Ankara, Antalya hiç yoktu — Türkiye ligi hissi vermiyor,
   üretilmiş görünüyordu. Havuz 24 şehre çıkarıldı; lig kurulumu ayrıca şehir başına en fazla
   2 takım uyguluyor (genUniqueClubName). */
const SEHIR=['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Gaziantep',
  'Kayseri','Eskişehir','Samsun','Trabzon','Diyarbakır','Mersin','Denizli','Sakarya',
  'Manisa','Balıkesir','Malatya','Erzurum','Şanlıurfa','Aydın','Tekirdağ','Kocaeli'];
/** Bot kulüp adı ekleri — genRandomClubName bunu kullanır (eksikti; yeni oyunda takım kurma çöküyordu). */
const LIG_T=['Basket','Spor','Yıldızları','Kartalları','Aslanları','Şimşekleri','Boğaları','Panterleri','Şahinleri','Kurtları','BK','Gençlik'];
const ILK=['Marcus','James','Kevin','Luka','Nikola','Joel','Trae','Jayson','Devin','Damian','Tyler','Darius','Cade','Paolo','Victor','Anthony','Donovan','Shai','Ja','LaMelo','Yuki','Chen','Hakeem','Kwame','Diego','Andre','Giannis','Domantas','Rudy','Jonas','Bogdan','Dennis'];
const SY=['Johnson','Williams','Smith','Brown','Jones','Davis','Miller','Wilson','Anderson','Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Tiongko','Okonkwo','Nakamura','Kim','Diallo','Kowalski','Silva','Fernandes'];
const TR_ILK=['Mehmet','Serkan','Burak','Can','Emre','Ali','Oğuz','Kaan','Berk','Mert','Arda','Enes','Furkan','Alperen','Cedi'];
const TR_SY=['Yılmaz','Kaya','Demir','Şahin','Çelik','Öztürk','Arslan','Doğan','Kılıç','Aslan'];

/* ── Madde 5 (29. oturum): ülkeye özgü isim havuzları ────────────────────────────────────
   Önceden bayrak ULKELER'den rastgele, isim ise TEK genel havuzdan (ILK/SY) geliyordu; bu
   yüzden "🇹🇷 Kowalski" gibi uyumsuz oyuncular üretiliyordu. Artık her ülkenin kendi 16 ad +
   16 soyad havuzu var (26 ülke ≈ 832 isim) — hem bayrak-isim uyumu hem tekrar azalması.
   ILK/SY genel havuzu koç/izci/haber isimleri için (bayraksız bağlam) olduğu gibi duruyor. */
const NAME_POOLS={
 'ABD':{ilk:['Marcus','James','Kevin','Jayson','Devin','Damian','Tyler','Darius','Cade','Anthony','Donovan','Trae','Malik','Brandon','Austin','Jalen'],sy:['Johnson','Williams','Smith','Brown','Jones','Davis','Miller','Wilson','Anderson','Robinson','Clark','Lewis','Walker','Hall','Young','Harris']},
 'Türkiye':{ilk:['Mehmet','Serkan','Burak','Can','Emre','Ali','Oğuz','Kaan','Berk','Mert','Arda','Enes','Furkan','Alperen','Cedi','Doğuş'],sy:['Yılmaz','Kaya','Demir','Şahin','Çelik','Öztürk','Arslan','Doğan','Kılıç','Aslan','Koç','Kurt','Özdemir','Aydın','Polat','Şen']},
 'Fransa':{ilk:['Nicolas','Evan','Théo','Rudy','Frank','Killian','Mathias','Adrien','Lucas','Hugo','Antoine','Vincent','Guerschon','Élie','Nando','Bilal'],sy:['Fournier','Dubois','Martin','Bernard','Petit','Moreau','Lambert','Rousseau','Girard','Yabusele','Diaw','Mercier','Blanc','Chevalier','Renard','Leroy']},
 'İspanya':{ilk:['Sergio','Ricky','Willy','Juancho','Rudy','Pau','Marc','Álex','Víctor','Jaime','Darío','Xabi','Carlos','Alberto','Pablo','Santi'],sy:['Rodríguez','Hernández','García','López','Fernández','Martínez','Sánchez','Pérez','Gómez','Ruiz','Navarro','Torres','Ramos','Ortega','Iglesias','Vives']},
 'Yunanistan':{ilk:['Giannis','Thanasis','Kostas','Nikos','Dimitris','Vassilis','Georgios','Ioannis','Panagiotis','Christos','Michalis','Stefanos','Antonis','Lefteris','Alexis','Yannis'],sy:['Papadopoulos','Antetokounmpo','Sloukas','Printezis','Kalaitzakis','Papanikolaou','Bourousis','Zisis','Georgiou','Nikolaidis','Vasileiou','Karagiannis','Mantzaris','Larentzakis','Athanasiou','Konstantinidis']},
 'Brezilya':{ilk:['Lucas','Rafael','Bruno','Marcelo','Gabriel','Vitor','Leandro','Anderson','Yago','Guilherme','Caio','Felipe','Ricardo','Tiago','Alex','Didi'],sy:['Silva','Santos','Oliveira','Souza','Pereira','Costa','Almeida','Barbosa','Ferreira','Ribeiro','Nascimento','Machado','Varejão','Huertas','Garcia','Mello']},
 'Arjantin':{ilk:['Facundo','Luis','Gabriel','Nicolás','Luca','Carlos','Marcos','Andrés','Patricio','Juan','Tomás','Leandro','Máximo','Santiago','Agustín','Federico'],sy:['Campazzo','Scola','Deck','Laprovíttola','Vildoza','Delfino','Nocioni','Garino','Brussino','Fernández','Gómez','López','Álvarez','Sosa','Romero','Acuña']},
 'Almanya':{ilk:['Dennis','Daniel','Moritz','Franz','Maximilian','Johannes','Lukas','Andreas','Tobias','Niels','Isaac','Leon','Paul','David','Jonas','Robin'],sy:['Schröder','Theis','Wagner','Kleber','Müller','Schmidt','Fischer','Weber','Becker','Hoffmann','Schulz','Koch','Richter','Neumann','Zimmermann','Braun']},
 'Sırbistan':{ilk:['Nikola','Bogdan','Vasilije','Aleksa','Marko','Miloš','Stefan','Nemanja','Filip','Dušan','Vladimir','Ognjen','Luka','Petar','Uroš','Đorđe'],sy:['Jokić','Bogdanović','Micić','Avramović','Petrović','Marković','Nikolić','Jovanović','Stojaković','Milošević','Radonjić','Simonović','Lučić','Gudurić','Kalinić','Đorđević']},
 'Avustralya':{ilk:['Josh','Patty','Matthew','Jock','Dyson','Joe','Aron','Ben','Dante','Nick','Cameron','Tyler','Xavier','Jack','Duop','Will'],sy:['Giddey','Mills','Dellavedova','Landale','Daniels','Ingles','Baynes','Simmons','Exum','Kay','Froling','Reath','Cooks','Hodgson','Bruton','Walker']},
 'Kanada':{ilk:['Shai','Jamal','Andrew','Dillon','Luguentz','Kelly','Nickeil','Dwight','Trey','Cory','Chris','Oshae','Khem','Melvin','Zach','Bennedict'],sy:['Gilgeous','Murray','Wiggins','Barrett','Brooks','Dort','Olynyk','Alexander','Powell','Lyles','Joseph','Boucher','Birch','Ejim','Nembhard','Mathurin']},
 'İtalya':{ilk:['Danilo','Simone','Nicolò','Marco','Alessandro','Luigi','Achille','Gabriele','Stefano','Riccardo','Andrea','Matteo','Giampaolo','Amedeo','Paolo','Diego'],sy:['Gallinari','Fontecchio','Melli','Datome','Belinelli','Polonara','Ricci','Rossi','Bianchi','Conti','Esposito','Romano','Greco','Marino','Ferrari','Colombo']},
 'Hırvatistan':{ilk:['Bojan','Dario','Ivica','Mario','Ante','Krunoslav','Dominik','Toni','Marko','Luka','Karlo','Roko','Filip','Josip','Ivan','Duje'],sy:['Bogdanović','Šarić','Zubac','Hezonja','Žižić','Simon','Ukić','Babić','Perković','Marić','Horvat','Kovačević','Novak','Vuković','Jurić','Božić']},
 'Slovenya':{ilk:['Luka','Goran','Zoran','Klemen','Edo','Vlatko','Jaka','Mike','Gregor','Aleksej','Žiga','Blaž','Matic','Rok','Domen','Miha'],sy:['Dončić','Dragić','Prepelič','Čančar','Murić','Blažič','Nikolić','Hrovat','Radovan','Zagorac','Samar','Ferme','Kovač','Novak','Krajnc','Bratanič']},
 'Nijerya':{ilk:['Chimezie','Precious','Josh','Gabe','Ike','Emeka','Ekpe','Obi','Chinedu','Uche','Kelechi','Nnamdi','Ifeanyi','Chika','Tochukwu','Femi'],sy:['Metu','Achiuwa','Okogie','Vincent','Diogu','Okafor','Udoh','Nwora','Okonkwo','Eze','Obi','Aluko','Adebayo','Balogun','Nwankwo','Chukwu']},
 'Filipinler':{ilk:['Jordan','Kai','Dwight','Justin','Ray','Carl','Scottie','Christian','Kevin','Japeth','Calvin','Roger','Paul','Arvin','Mikey','Jamie'],sy:['Clarkson','Sotto','Ramos','Brownlee','Fajardo','Thompson','Standhardinger','Aguilar','Abueva','Tiongko','Cruz','Reyes','Santos','Bautista','Mendoza','Villanueva']},
 'Japonya':{ilk:['Yuta','Rui','Yuki','Makoto','Kenji','Daiki','Hiroshi','Shohei','Ryota','Takumi','Kosuke','Sota','Haruto','Naoki','Ren','Keisuke'],sy:['Watanabe','Hachimura','Kawamura','Tanaka','Sato','Suzuki','Takahashi','Nakamura','Ito','Yamamoto','Kobayashi','Yoshida','Matsumoto','Inoue','Kimura','Hayashi']},
 'Çin':{ilk:['Yao','Zhou','Wang','Yi','Guo','Zhao','Hu','Zhang','Liu','Chen','Sun','Li','Xu','Lin','Yang','Wu'],sy:['Ming','Qi','Zhelin','Jianlian','Ailun','Rui','Mingxuan','Zhenlin','Chuanxing','Xiaochuan','Minghui','Kaicheng','Jie','Hao','Feng','Peng']},
 'Güney Kore':{ilk:['Jun','Min','Seung','Hyun','Dong','Sang','Ji','Tae','Young','Jae','Kyung','Woo','Sung','Han','Bo','Chan'],sy:['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon','Hwang']},
 'Senegal':{ilk:['Gorgui','Tacko','Cheikh','Mamadou','Ibrahima','Moussa','Abdoulaye','Pape','Alioune','Babacar','Saliou','Malick','Ousmane','Amadou','Modou','Serigne'],sy:['Dieng','Fall','Diallo','Ndiaye','Sarr','Sy','Faye','Gueye','Diouf','Ba','Seck','Cissé','Sow','Camara','Diagne','Mbaye']},
 'Litvanya':{ilk:['Jonas','Domantas','Arvydas','Mindaugas','Rokas','Tomas','Paulius','Marius','Deividas','Ignas','Lukas','Donatas','Šarūnas','Gytis','Martynas','Eimantas'],sy:['Valančiūnas','Sabonis','Kuzminskas','Jasikevičius','Motiejūnas','Giedraitis','Butkevičius','Kalnietis','Sirvydis','Brazdeikis','Normantas','Vasiliauskas','Petrauskas','Blaževičius','Gudaitis','Masiulis']},
 'Belçika':{ilk:['Retin','Ismaël','Vrenz','Jean-Marc','Hans','Emmanuel','Maxime','Thijs','Sam','Loïc','Andy','Pierre','Niels','Quentin','Haris','Mathias'],sy:['Obasohan','Bako','Mwema','Vervoort','Van Rossom','Lecomte','Depuydt','De Ridder','Peeters','Janssens','Maes','Willems','Claes','Wouters','Mertens','Dumont']},
 'Polonya':{ilk:['Jeremy','Mateusz','Aleksander','Michał','Andrzej','Tomasz','Adam','Piotr','Jakub','Marcin','Kamil','Łukasz','Damian','Szymon','Bartosz','Dominik'],sy:['Sochan','Ponitka','Balcerowski','Zieliński','Nowak','Wójcik','Kowalski','Lewandowski','Kaczmarek','Mazur','Krawczyk','Wieczorek','Górski','Adamski','Sikora','Olszewski']},
 'Meksika':{ilk:['Juan','Gustavo','Jorge','Francisco','Orlando','Paco','Israel','Héctor','Luis','Miguel','Fabián','Diego','Emiliano','Ángel','Rodrigo','Sebastián'],sy:['Ayón','Toscano','Gutiérrez','Méndez','Cabrera','Vázquez','Reyes','Morales','Castillo','Jiménez','Herrera','Delgado','Rivera','Guzmán','Salazar','Aguilar']},
 'Portekiz':{ilk:['Neemias','Diogo','Miguel','Tomás','João','Rafael','Carlos','Bruno','André','Ricardo','Nuno','Pedro','Francisco','Gonçalo','Tiago','Vasco'],sy:['Queta','Brito','Ventura','Lima','Sousa','Cardoso','Fernandes','Marques','Gonçalves','Rocha','Pinto','Correia','Teixeira','Moreira','Antunes','Faria']},
 'İngiltere':{ilk:['Ovie','Luol','Dan','Myles','Jamie','Ryan','Callum','Harrison','Gabe','Amir','Josh','Oliver','Tarik','Carl','Ashley','Nathan'],sy:['Soko','Deng','Clark','Hesson','Gordon','Richards','Ward','Bentil','Olaseni','Hanley','Thompson','Watson','Turner','Cole','Bailey','Sullivan']}
};
/** Ülkeye uygun rastgele "Ad Soyad". Ülke havuzda yoksa genel ILK/SY havuzuna düşer. */
function randomNameFor(ulkeAd){
  const pool=NAME_POOLS[String(ulkeAd||'')];
  return pool?`${ch(pool.ilk)} ${ch(pool.sy)}`:`${ch(ILK)} ${ch(SY)}`;
}

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
function difficultyCfg(){
  try{
    const k=(typeof G!=='undefined'&&G&&G.difficulty)||'normal';
    return DIFFICULTY[k]||DIFFICULTY.normal;
  }catch(e){ return DIFFICULTY.normal; }
}
const START_KR=50000;
const ECO_REF_KR=2400;
const ECO_MUL=START_KR/ECO_REF_KR;
function ecoRound(x){ return Math.max(1, Math.round(Number(x)*ECO_MUL)); }
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
  /* Paket A: piyasa maaşı sezon enflasyonuyla büyür (yalnız yeni sözleşmeler). */
  return Math.max(60, Math.round((24 + g*1.95 + (g*g)/115 + hi*14 + hi*hi*0.08)*1.7*ecoInflationMul()));
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
