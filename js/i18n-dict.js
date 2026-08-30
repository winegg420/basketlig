/* ══════════════════════════════════════════════════════════════════════════════════════
   FAZ F — TR → EN SÖZLÜĞÜ (kaynak-dize anahtarlı)
   Anahtar = oyunda yazılı Türkçe metnin BİREBİR kendisi. Karşılığı yoksa Türkçesi görünür,
   yani eksik çeviri asla hata üretmez. Bölümler:
     1) Arayüz kabuğu (menü, sayfa başlıkları, butonlar, etiketler)
     2) Veri katalogları (mevkiler, statlar, roller, eğilimler, setler, kişilikler, sakatlıklar,
        arena/koç/antrenman/altyapı seviyeleri, izci bölgeleri, spikerler)
     3) Bildirimler, modallar ve akış metinleri
     4) Maç anlatımı (spiker havuzları — %S/%SC/%B/%C yer tutucuları korunur)
   ══════════════════════════════════════════════════════════════════════════════════════ */
const I18N_TR_EN={

/* ─── 1) ARAYÜZ KABUĞU ────────────────────────────────────────────────────────────── */
'Menajerlik':'Manager',
'Ana Panel':'Dashboard',
'Takım':'Team',
'Kadro':'Roster',
'Maçlar':'Matches',
'Lig puan durumu':'Standings',
'Transfer Market':'Transfer Market',
'Altyapı':'Youth Academy',
'Antrenman':'Training',
'Arena':'Arena',
'Bilanço':'Finances',
'Analiz':'Analytics',
'Ligler':'Leagues',
'TAKIM':'TEAM',
'KADRO YÖNETİMİ':'ROSTER MANAGEMENT',
'MAÇLAR':'MATCHES',
'LİG PUAN DURUMU':'LEAGUE STANDINGS',
'TRANSFER MARKET':'TRANSFER MARKET',
'ALTYAPI':'YOUTH ACADEMY',
'ANTRENMAN & KOÇLAR':'TRAINING & COACHES',
'ARENA':'ARENA',
'BİLANÇO':'FINANCES',
'ANALİZ & İSTATİSTİK':'ANALYTICS & STATS',

'🏀 YENİ KARİYERE BAŞLA':'🏀 START NEW CAREER',
'Kayıttan devam et':'Continue from save',
'Kayıtlı kariyer:':'Saved career:',
'Nasıl oynanır?':'How to play',
'🏀 Takımını Kur':'🏀 Build Your Team',
'Takım adını ve rengini seç. 15 oyuncun otomatik oluşturulacak.':'Choose a team name and colour. Your 15 players will be generated automatically.',
'Takım Adı':'Team Name',
'Takım adı':'Team name',
'Takım Rengi':'Team Colour',
'Menajer Adın (isteğe bağlı)':'Your Manager Name (optional)',
'Resim URL (isteğe bağlı)':'Image URL (optional)',
'örn: Ankara Kartallar':'e.g. Ankara Eagles',
'örn: Ahmet':'e.g. Michael',
'TAKIM OLUŞTUR →':'CREATE TEAM →',
'Kulüp bilgileri':'Club details',
'Adı kaydet':'Save name',
'Arena adı ver...':'Name your arena...',
'Tıkla veya URL':'Click or paste URL',
'Tıkla — bilgisayardan seç':'Click — pick from your computer',
'Tıkla — görsel yükle':'Click — upload an image',
'Tıkla — maçı başlat':'Click — start the match',
'Yükleniyor...':'Loading...',
'Başarımlar':'Achievements',
'Kariyer Özeti':'Career Summary',
'Görünüm:':'View:',
'Tümü':'All',
'Sırala (tekrar tıkla ⇄):':'Sort (click again ⇄):',
'Maaş ↓':'Wage ↓',
'-- Oyuncu seç --':'-- Select a player --',
'Oyuncu Seç':'Select Player',
'— Boş —':'— Empty —',
'Düşük':'Low',
'Yüksek':'High',
'Ev Takımı':'Home Team',
'Takımın':'Your team',
'Takımın:':'Your team:',
'SONRAKİ MAÇ':'NEXT MATCH',
'Maçı Başlat':'Start Match',
'▶ Maçı Başlat':'▶ Start Match',
'Maçı başlatmak için butona bas 🏀':'Press the button to start the match 🏀',
'⛶ Büyük Ekran':'⛶ Fullscreen',
'🎧 Manuel Koçluk':'🎧 Manual Coaching',
'🔴 CANLI MAÇ':'🔴 LIVE MATCH',
'🔴 Canlı Maç — Şut Haritası':'🔴 Live Match — Shot Chart',
'↓ Canlı maç &amp; şut haritasına git':'↓ Go to live match &amp; shot chart',
'📊 Maç içi — Takım istatistikleri':'📊 In-game — Team stats',
'📊 Özet kutu (maç bitince)':'📊 Box score (after the match)',
'Ev / Deplasman (Charazay tarzı özet; maç ilerledikçe dolar)':'Home / Away (Charazay-style summary; fills as the match runs)',
'Canlı istatistikler sahanın yanında; burada son skor özeti.':'Live stats sit beside the court; this is the final summary.',
'Şut haritası:':'Shot chart:',
'Canlı (bu çeyrek)':'Live (this quarter)',
'Tüm maç':'Full match',
'Bizim — kaçan':'Ours — missed',
'Rakip — kaçan':'Opponent — missed',
'= isabetli şut,':'= made shot,',
'= kaçan şut. Canlı görünüm her çeyrek sıfırlanır; maç boyunca biriken şutlar için':'= missed shot. The live view resets each quarter; for every shot in the match use',
'İzleme hızı:':'Playback speed:',
'— hareketin ve anlatımın hızını birlikte ölçekler':'— scales both movement and commentary speed',
'Mola al — oyuncular nefeslenir, enerji tazelenir; molada değişiklik serbest':'Call a timeout — players catch their breath and energy refreshes; substitutions are free during a timeout',
'Ç1':'Q1','Ç2':'Q2','Ç3':'Q3','Ç4':'Q4','Ç1–Ç4':'Q1–Q4',
'Fikstür':'Fixtures',
'📅 Tüm sezon fikstürü':'📅 Full season fixtures',
'🔜 Önümüzdeki maçlar':'🔜 Upcoming matches',
'Yaklaşan maçlar — tarihler güncel güne göre (sıradaki maç vurgulu).':'Upcoming matches — dates follow the current day (next match highlighted).',
'Lig Sırası':'League Position',
'Üst lige yükselme':'Promotion',
'Alt lige düşme':'Relegation',
'Ligde kalır':'Stays up',
'Sezonu işle (yüksel / düş)':'Process season (promote / relegate)',
'Tabloya göre senin sıran uygulanır; boş slotlar yeniden doldurulur.':'Your place is applied from the table; empty slots are refilled.',
'TBL — Türkiye Basketbol Ligi kademelerinde 20 takımlı gruplar.':'TBL — Turkish Basketball League tiers, groups of 20 teams.',
'Tek devre (19 tur) — fikstür, tablo ve simülasyon tek çekirdek.':'Single round robin (19 rounds) — fixtures, table and simulation share one core.',
'🏁 Sezon bitti — tablo kilitlendi. Bir sonraki sezon otomatik açılacak.':'🏁 Season over — the table is locked. The next season starts automatically.',
'Transfer pazarı:':'Transfer market:',
'💵 Satılık':'💵 For sale',
'🔁 Kiralık':'🔁 Loan',
'🔁 Kulüp Transferleri':'🔁 Club Transfers',
'🔭 İzci Ağı':'🔭 Scout Network',
'🛰️ İzci Pazarı':'🛰️ Scout Market',
'🛒 Koç Pazarı':'🛒 Coach Market',
'🎽 Takım Koçları':'🎽 Team Coaches',
'100 farklı oyuncu listeleniyor.':'100 different players listed.',
'Rakip kulüplerin':'Rival clubs’',
'satışa':'for sale',
'kiralığa':'on loan',
'çıkardığı oyuncular. Kiralık oyuncu sezon sonunda kulübüne döner.':'players. A loaned player returns to his club at the end of the season.',
'Altyapı akademisi:':'Youth academy:',
'Altyapı raporu:':'Youth report:',
'3 genç yetenek ön plana çıktı!':'3 young talents have stood out!',
'farklı — nadiren 50–60 civarı OVR’lı ama 90+ potansiyelli “ham elmas”lar da çıkar. Genç yaş ve büyük potansiyel boşluğu, antrenmanda':'different — occasionally a 50–60 OVR “diamond in the rough” with 90+ potential appears. Young age and a big potential gap mean',
'çok daha hızlı gelişim':'much faster development',
'potansiyel tavanı':'potential ceiling',
'Özet kadro — tam statlar için soldaki':'Squad summary — for full stats use the',
'menüsünü kullan.':'menu on the left.',
'🏋️ Takım Antrenmanı':'🏋️ Team Training',
'Takımını bu hafta antrene et.':'Train your team this week.',
'ANTRENMAN BAŞLAT':'START TRAINING',
'Antrenman zamanı!':'Training time!',
'Belirli bir oyuncuyu geliştir. Antrenman':'Develop a specific player. Training takes',
'Geliştirilen Özellik':'Attribute Trained',
'sürer — günler maçlar oynandıkça ilerler. Tamamlanınca gelişim potansiyele göre eklenir.':'— days advance as matches are played. On completion the gain is applied up to the player’s potential.',
'sürer.':'.',
'2-4 oyun günü':'2-4 game days',
'3-7 oyun günü':'3-7 game days',
'Arena kapasiteni artır, bilet gelirlerin yükselsin.':'Increase your arena capacity to raise ticket income.',
'Başlangıç Arena':'Starter Arena',
'Haftalık Bakım':'Weekly Upkeep',
'Bilet Fiyatı':'Ticket Price',
'Doluluk (forma göre)':'Attendance (form based)',
'Maç Başı Gelir':'Income per Match',
'⬆️ Geliştir':'⬆️ Upgrade',
'Taraftar büyüklüğü grubu':'Fan base tier',
'💚 GELİRLER':'💚 INCOME',
'❤️ GİDERLER':'❤️ EXPENSES',
'Son 28 oyun günü — gerçek işlemler':'Last 28 game days — real transactions',
'🤝 Takım Kimyası':'🤝 Team Chemistry',
'Çok transfer yapılınca düşer, zaman geçince yükselir':'Drops with heavy transfer activity, recovers over time',
'Mağlubiyet':'Loss',
'İpucu:':'Tip:',
'Görsellerde sağ tık →':'Right-click images →',
'(yaklaşık)':'(approx.)',
'kişi':'people',
'maçta':'in matches',
'maçların; sırayı gösteren':'of your matches; the one showing the order',
'açıktır (sim test); sonrakiler sırayı bekler.':'is open (sim test); the rest wait their turn.',
'açılır; tablo maçlara göre güncellenir.':'opens; the table updates as matches are played.',
'bugünden':'from today',
'itibaren gösterilir (her yüklemede güncellenir). Yalnızca':'onwards (refreshed on every load). Only',
'kulüp ilanı · fikstür 1–2 günde bir maç':'club listings · fixtures roughly one match every 1-2 days',
'yalnızca bir sonraki maç içindir.':'applies to the next match only.',
'sıradaki':'next',
'seç.':'choose.',
'(bu turda BYE geçtin)':'(you had a BYE this round)',
' • Ücretsiz':' • Free',
' 🩹 Yeni döndü':' 🩹 Just returned',
' · 20 takım · Sezon hazırlanıyor':' · 20 teams · Season being prepared',
' · sezon sonunda döner':' · returns at the end of the season',
' · Sıradaki: Tur ':' · Next: Round ',
' · Takvim günü ~':' · Calendar day ~',
' · tıkla → canlı panel':' · click → live panel',
' — tur atladın!':' — you advanced!',
' — KUPA SENİN! 🎉':' — THE CUP IS YOURS! 🎉',

/* ─── 2) VERİ KATALOGLARI ─────────────────────────────────────────────────────────── */
/* Mevkiler */
'Organizatör':'Point Guard','Şutör':'Shooting Guard','K. Forvet':'Small Forward','G. Forvet':'Power Forward','Pivot':'Center',
'PG — Organizatör':'PG — Point Guard','SG — Şutör':'SG — Shooting Guard',
/* Statlar */
'Hücum':'Offense','Savunma':'Defense','Ribaund':'Rebounding','Top Çalma':'Steals','Pas':'Passing','Hız':'Speed',
'Kondisyon':'Conditioning','Dayanıklılık':'Stamina','Şut İsabeti':'Shooting','Serbest Atış':'Free Throw',
'Top Sürme':'Ball Handling','Blok':'Blocking','Zekâ':'IQ','Liderlik':'Leadership',
/* Roller (FAZ A) */
'Şutör rolü':'Sharpshooter',
'Skorer':'Scorer','Oyun Kurucu':'Floor General','Potaya Dalan':'Slasher','Kilit Savunmacı':'Lockdown Defender',
'Pota Altı Karartıcı':'Rim Protector','Cam Süpürücü':'Glass Cleaner','Çok Yönlü':'All-Around',
'Dış atışı besler — üçlük denemelerinin çoğu ondan geçer.':'Feeds the outside game — most three-point attempts run through him.',
'Topu isteyen bitirici — takımın en yüksek şut yükü onda.':'A finisher who wants the ball — carries the highest shot load.',
'Floor general — asistleri dağıtır, tempoyu o belirler.':'A floor general — distributes assists and sets the tempo.',
'Dip çizgiye/potaya girer — faul kazanır, üçlük denemez.':'Attacks the baseline and the rim — draws fouls, rarely shoots threes.',
'Rakibin en iyi dış oyuncusunu kapatır, top çalar.':'Locks down the opponent’s best perimeter player and forces steals.',
'Boyalı alanı korur — blokların çoğu ondan gelir.':'Guards the paint — most blocks come from him.',
'Hem hücum hem savunma ribaundunda ilk sıçrayan.':'First off the floor on both offensive and defensive glass.',
'Belirgin bir uzmanlığı yok — her işi ortalama üstü yapar.':'No single specialty — does everything above average.',
/* Eğilimler */
'Üçlük eğilimi':'Three-point tendency','Potaya dalma':'Drive tendency','Pas dağıtımı':'Playmaking',
'Soğukkanlılık':'Clutch','Faul disiplini':'Foul discipline',
'Şut seçiminde dışarıyı tercih etme oranı.':'How often he chooses an outside shot.',
'Boyalı alana girme / faul kazanma eğilimi.':'How often he drives into the paint and draws fouls.',
'Asistlerin ne kadarının ondan geçtiği.':'How much of the assist load runs through him.',
'Son 2 dakika ve uzatmada isabet. Düşükse baskı altında eli titrer.':'Accuracy in the last 2 minutes and overtime. If low, his hands shake under pressure.',
'Düşükse takımın faullerini o toplar, erken oyundan atılır.':'If low he collects the team’s fouls and fouls out early.',
/* Kişilikler */
'Sadık':'Loyal','Hırslı':'Ambitious','Parasever':'Money-driven','Şehir bağımlısı':'Homebody','Kararsız':'Unpredictable',
'Kulübüne bağlı — ayrılmaya isteksiz, düşük teklifi kolay kabul etmez.':'Attached to the club — reluctant to leave, rarely accepts a low offer.',
'Başarı ve büyük hedef ister — iyi fırsata atlar.':'Wants trophies and big goals — jumps at a good opportunity.',
'Parayı önemser — en yüksek teklife gitmeye meyilli.':'Cares about money — inclined to take the highest offer.',
'Şehrine/kulübüne bağlı — taşınmaya çok isteksiz.':'Tied to his city and club — very reluctant to move.',
'Öngörülemez — kararları ruh haline göre değişebilir.':'Unpredictable — his decisions swing with his mood.',
/* Hücum setleri (FAZ B) */
'Serbest Akış':'Free Flow','Pick & Roll':'Pick & Roll','Horns (Boynuz)':'Horns','Dip Köşe Üçlüsü':'Corner Threes',
'Motion (Sürekli Hareket)':'Motion Offense','Yıldıza İzolasyon':'Star Isolation','Pota Altı Yükleme':'Post-Up',
'Erken Hücum':'Push the Pace','Kır ve Dağıt':'Drive & Kick','Beş Dışarı':'Five-Out','Flex Ofans':'Flex Offense',
'Belirli bir set yok — oyuncular doğal eğilimlerine göre oynar. Nötr.':'No set play — players follow their natural tendencies. Neutral.',
'Kurucu-pivot ikilisi. Perde sonrası pivot potaya dalar: iki sayı ve asist artar, üçlük azalır.':'Guard–big two-man game. The big rolls to the rim: more twos and assists, fewer threes.',
'İki uzun serbest atış çizgisinde, iki şutör köşede. Her seçeneği açar: asist ve isabet dengeli artar.':'Two bigs at the elbows, two shooters in the corners. Opens every option: assists and accuracy both rise.',
'Top içeri, pas köşeye. Üçlük denemesi belirgin artar — şutör rolündekiler yüklenir.':'Ball inside, kick to the corner. Three-point attempts jump — the sharpshooters take the load.',
'Beş oyuncu da hareket eder, perdeler zincirlenir. Top kaybı düşer, asist ve isabet artar; tempo yavaşlar.':'All five move and screens chain together. Turnovers fall, assists and accuracy rise; tempo slows.',
'Top yüklenen oyuncuya alan açılır. Asist düşer, top kaybı azalır; yıldız yoksa isabet düşer.':'The floor is cleared for your featured player. Assists drop, turnovers fall; without a star, accuracy suffers.',
'Top boyalı alanda pivota. İki sayı ve faul kazanımı artar, üçlük belirgin azalır.':'Ball into the post. Twos and drawn fouls rise, threes fall sharply.',
'Ribaund sonrası koşu. Hızlı hücum katlanır, kolay sayı gelir ama top kaybı riski artar.':'Run off the rebound. Fast breaks multiply and easy buckets come, but turnover risk rises.',
'Potaya dalış, savunma toplanınca dışarı pas. Üçlük ve asist birlikte artar.':'Drive to the rim, kick out when the defense collapses. Threes and assists rise together.',
'Beş oyuncu da çember dışında. Boyalı alan boşalır: üçlük patlar, ribaund zayıflar.':'All five outside the arc. The paint empties: threes explode, rebounding weakens.',
'Dip çizgi perdeleri döngüsü. Sabırlı, düşük riskli: top kaybı en aza iner, isabet artar.':'A cycle of baseline screens. Patient and low risk: turnovers hit their minimum, accuracy rises.',
/* Savunma setleri */
'Adam Adama':'Man-to-Man','2-3 Bölge':'2-3 Zone','Tam Saha Pres':'Full-Court Press',
'Her Perdede Değişim':'Switch Everything','Boyalıyı Kapat':'Pack the Paint',
'Dengeli, risksiz temel savunma.':'Balanced, low-risk base defense.',
'Boyalı alanı kapatır; rakip dışarıdan daha çok deneme yapar.':'Shuts the paint; the opponent takes more outside attempts.',
'Çok top çalar; faul ve kolay sayı riski yüksek.':'Forces many steals; high foul and easy-bucket risk.',
'Perde arkasından üçlük vermez — rakip içeri girmeye zorlanır.':'Gives up no threes off screens — the opponent is forced inside.',
'Beş oyuncu da içeri çöker: turnike yok, ama rakip üçlük yağdırır.':'All five collapse inside: no layups, but the opponent rains threes.',
/* Savunma stili (taktik ekranı) */
'Adam adama':'Man-to-man','Bölge savunması':'Zone defense','Pres':'Press','Bölge':'Zone',
'Dengeli — nötr':'Balanced — neutral',
'Pota altını kapar (iki sayı isabeti düşer), dışarı biraz açık':'Protects the paint (two-point accuracy drops), a little open outside',
'Çok top çalar ama isabet/faul riski artar':'Forces steals but accuracy and foul risk suffer',
/* Tempo / odak */
'Yavaş':'Slow','Normal':'Normal','Hızlı':'Fast',
'Az hücum, kontrollü — isabet artar':'Fewer possessions, controlled — accuracy rises',
'Dengeli oyun':'Balanced play',
'Çok hücum — isabet biraz düşer':'More possessions — accuracy drops slightly',
'İçeri ağırlıklı':'Inside focus','Dış şut ağırlıklı':'Outside focus','Hızlı hücum':'Fast break','Set oyun':'Set offense','Dengeli':'Balanced',
'Pota altı, 2 sayı isabeti artar':'Paint focus, two-point accuracy rises',
'Bol üçlük denemesi':'Plenty of three-point attempts',
'Erken şut — top kaybı riski artar':'Early shots — turnover risk rises',
'Sabırlı — asist ve isabet artar, top kaybı azalır':'Patient — assists and accuracy rise, turnovers fall',
'Karışık şut seçimi':'Mixed shot selection',
'Tempo':'Tempo','Hücum odağı':'Offensive focus','Savunma stili':'Defensive style','Savunma':'Defense',
'Top yükleme (belirli oyuncu)':'Featured player','Rakibe özel eşleştirme':'Matchup assignment',
/* Antrenman / koç / arena / altyapı */
'Hücum Antrenmanı':'Offense Training','Savunma Antrenmanı':'Defense Training','Kondisyon Koşusu':'Conditioning Run','Çift Antrenman':'Double Session',
'Hücum Koçu':'Offense Coach','Savunma Koçu':'Defense Coach','Kondisyon Koçu':'Strength Coach','Şut Koçu':'Shooting Coach','Altyapı Koçu':'Youth Coach',
'Küçük Arena':'Small Arena','Orta Arena':'Mid Arena','Büyük Arena':'Big Arena','Dev Arena':'Major Arena','Mega Arena':'Mega Arena',
'Temel Akademi':'Basic Academy','Gelişmiş Akademi':'Advanced Academy','Elit Akademi':'Elite Academy','Uluslararası Kamp':'International Camp',
'Yerli (Türkiye)':'Domestic','Avrupa':'Europe','Amerika':'Americas','Global Genç Yetenek':'Global Youth',
/* Spikerler */
'Coşkun Bağrışan':'Chuck Roarer','Bilge Hoca':'The Professor','Esprili Cem':'Witty Sam','Klasik Reha':'Classic Ray',
'Heyecanlı':'Excitable','Analitik':'Analytical','Esprili':'Witty','Resmî':'Formal',
/* Sakatlıklar */
'Hafif':'Minor','Orta':'Moderate','Ağır':'Severe',
'Ayak bileği burkulması (hafif)':'Ankle sprain (minor)','Baldır kası krampı':'Calf cramp','Parmak ezilmesi':'Jammed finger',
'Sırt spazmı':'Back spasm','Uyluk kası zorlanması (hafif)':'Thigh strain (minor)','Boyun tutulması':'Stiff neck',
'Diz sıyrığı / darbesi':'Knee contusion','Hafif beyin sarsıntısı':'Mild concussion','Hamstring zorlanması':'Hamstring strain',
'Kasık zorlanması':'Groin strain','Omuz zorlanması':'Shoulder strain','Ayak bileği burkulması (orta)':'Ankle sprain (moderate)',
'El bileği burkulması':'Wrist sprain','Baldır kası yırtığı (kısmi)':'Partial calf tear','Ayak parmağı çıkığı':'Dislocated toe',
'Diz bağı zorlanması':'Knee ligament strain','Bel fıtığı alevlenmesi':'Disc flare-up','Ön çapraz bağ (ACL) yırtığı':'ACL tear',
'Menisküs yırtığı':'Meniscus tear','Aşil tendon kopması':'Achilles rupture','Omuz çıkığı':'Shoulder dislocation',
'Parmak kırığı':'Broken finger','El bileği kırığı':'Broken wrist','Ayak bileği kırığı':'Broken ankle','Stres kırığı (metatars)':'Metatarsal stress fracture',
/* Vücut bölgeleri */
'Ayak bileği':'Ankle','Baldır':'Calf','El':'Hand','Sırt':'Back','Uyluk':'Thigh','Boyun':'Neck','Diz':'Knee','Baş':'Head',
'Arka bacak':'Hamstring','Kasık':'Groin','Omuz':'Shoulder','El bileği':'Wrist','Ayak':'Foot','Bel':'Lower back','Aşil':'Achilles'
};

/* ══════════════════════════════════════════════════════════════════════════════════════
   İFADE (PHRASE) KATMANI — çalışma anında birleştirilmiş metinler için
   Örn. "🇩🇪 Almanya • 31 yaş" tek bir metin düğümüdür; sözlükte tam karşılığı olamaz.
   Buradaki kalıplar kelime/kalıp düzeyinde çevirir. Oyuncu adlarını bozmamak için kalıplar
   DAR tutuldu: ya sayıya bitişik birimler ya da isim havuzunda geçmeyen sözcükler.
   Sıra önemlidir — uzun kalıplar önce gelir.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const I18N_PHRASES=[
  /* — birimler ve sayıya bağlı kalıplar — */
  [/(\d+)\s*maçtır süre almadı/g,'$1 games without minutes'],
  [/(\d+)\s*maçlık seri/g,'$1-game streak'],
  [/(\d+)\s*oyun günü/g,'$1 game days'],
  [/(\d+)\s*gün/g,'$1 days'],
  [/(\d+)\s*yaş/g,'$1 yrs'],
  [/(\d+)\s*sezon/g,'$1 season(s)'],
  [/(\d+)\s*hafta/g,'$1 weeks'],
  [/(\d+)\s*boşluk/g,'$1 to spare'],
  [/(\d+)\s*takım/g,'$1 teams'],
  [/(\d+)\.\s*çeyrek/g,'Q$1'],
  [/(\d+)\.\s*seçim/g,'pick $1'],
  [/KR\/hafta/g,'KR/week'],
  [/KR\/hf/g,'KR/wk'],
  [/\bTur\b/g,'Round'],
  [/\bGün\b/g,'Day'],
  /* — sık geçen etiketler — */
  [/Maaş:/g,'Wage:'],
  [/Psikoloji:/g,'Mood:'],
  [/Potansiyel:/g,'Potential:'],
  [/Sözleşme:/g,'Contract:'],
  [/Enerji \(maç yorgunluğu\)/g,'Energy (match fatigue)'],
  [/Kadro sırası/g,'Squad rank'],
  [/Bu sezon henüz maça çıkmadı\./g,'Has not played yet this season.'],
  [/Bu sezon:/g,'This season:'],
  [/asist ort\./g,'assists per game'],
  [/sayı ort\./g,'points per game'],
  [/ribaund ort\./g,'rebounds per game'],
  [/Kimya/g,'Chemistry'],
  [/· hedef /g,'· target '],
  [/yükseliyor/g,'rising'],
  [/düşüyor/g,'falling'],
  [/Huzursuz:/g,'Unhappy:'],
  [/Süre bekleyen:/g,'Waiting for minutes:'],
  [/Söz verildi:/g,'Promised:'],
  [/Sürtüşme yok/g,'No friction'],
  [/Belirgin dostluk yok/g,'No notable friendships'],
  [/rol çakışması/g,'role clash'],
  [/Kadro uyumu:/g,'Squad fit:'],
  [/\bTaban\b/g,'Floor'],
  [/\bTavan\b/g,'Ceiling'],
  [/net rapor/g,'clear report'],
  [/geniş band — daha iyi izci gerek/g,'wide band — a better scout is needed'],
  [/Sahadaki 5 ile/g,'Fit of your five with'],
  [/uyumu:/g,'fit:'],
  /* — psikoloji / durum sözcükleri — */
  [/Çok mutlu/g,'Delighted'],[/Çok mutsuz/g,'Miserable'],
  [/\bMutlu\b/g,'Happy'],[/\bMutsuz\b/g,'Unhappy'],
  [/\bSakat\b/g,'Injured'],[/Yeni döndü/g,'Just returned'],[/\bYorgun\b/g,'Tired'],
  [/\bDeplasman\b/g,'Away'],[/\bDep\./g,'Away'],
  [/\bMaç yok\b/g,'No match'],
  [/Menajerlik/g,'Manager'],
  [/\bSezon\b/g,'Season'],
  [/sezon bitti/g,'season over'],
  [/sezon yok/g,'no season'],
  /* — ülkeler (isim havuzlarında soyadı olarak geçmezler, güvenli) — */
  [/\bABD\b/g,'USA'],[/\bFransa\b/g,'France'],[/(^|[\s(·•])İspanya\b/g,'$1Spain'],
  [/\bYunanistan\b/g,'Greece'],[/\bBrezilya\b/g,'Brazil'],[/\bArjantin\b/g,'Argentina'],[/\bAlmanya\b/g,'Germany'],
  [/\bSırbistan\b/g,'Serbia'],[/\bAvustralya\b/g,'Australia'],[/\bKanada\b/g,'Canada'],[/(^|[\s(·•])İtalya\b/g,'$1Italy'],
  [/\bHırvatistan\b/g,'Croatia'],[/\bSlovenya\b/g,'Slovenia'],[/\bNijerya\b/g,'Nigeria'],[/\bFilipinler\b/g,'Philippines'],
  [/\bJaponya\b/g,'Japan'],[/(^|[\s(·•])Çin\b/g,'$1China'],[/\bGüney Kore\b/g,'South Korea'],
  [/\bLitvanya\b/g,'Lithuania'],[/\bBelçika\b/g,'Belgium'],[/\bPolonya\b/g,'Poland'],[/\bMeksika\b/g,'Mexico'],
  [/\bPortekiz\b/g,'Portugal'],[/(^|[\s(·•])İngiltere\b/g,'$1England']
];

/* Ek birebir karşılıklar (F2) — üretilen arayüzde sık görünen tam metinler */
Object.assign(I18N_TR_EN,{
'ANA PANEL':'DASHBOARD',
'TBL · Menajerlik':'TBL · Manager',
'Soyunma Odası':'Locker Room',
'🧬 Soyunma Odası':'🧬 Locker Room',
'Kimya; moral ortalaması, liderlik, süre alamayanlar ve rol çakışmalarından hesaplanır. Maç başına en fazla ±3 hareket eder.':'Chemistry is derived from average morale, leadership, players without minutes and role clashes. It moves at most 3 points per match.',
'TRANSFER MARKETE KOY':'LIST ON MARKET',
'MARKETE KOY':'LIST',
'KADROYA AL':'PROMOTE',
'Seç':'Select',
'Kaydet':'Save',
'Kapat':'Close',
'İptal':'Cancel',
'Devam':'Continue',
'▶ Devam et':'▶ Continue',
'Yeni sezona geç':'Start next season',
'Taktiği kaydet':'Save tactics',
'🏀 İlk 5 seç':'🏀 Pick starting five',
'Maçlara dön':'Back to matches',
'⏭ Otomatik seç':'⏭ Auto pick',
'⏸ Mola':'⏸ Timeout',
'⏸ Mola / Değişiklik':'⏸ Timeout / Substitution',
'🎧 Sahadaki 5 · canlı enerji':'🎧 On court · live energy',
'🎯 Maç içi taktik (anında geçerli)':'🎯 In-game tactics (applies instantly)',
'📋 Set değişimi (maç içi)':'📋 Set change (in-game)',
'Ölü topta değişiklik serbest — yedek seç ve ↔ ile değiştir.':'Substitutions are free on a dead ball — pick a sub and swap with the ↔ button.',
'Değişiklik için ⏸ Mola al ya da çeyrek arasını bekle.':'Call a timeout or wait for the quarter break to substitute.',
'📋 Hücum seti (Playbook)':'📋 Offensive set (Playbook)',
'🛡️ Savunma seti':'🛡️ Defensive set',
'Her set motorda gerçekten oynanır: şut seçimi, asist, top kaybı ve kimin yükleneceği değişir. Kadro uyumu düşükse set tutmaz.':'Every set is really played by the engine: shot selection, assists, turnovers and who carries the load all change. A set with a poor squad fit will not work.',
'pas':'pass','kesme/koşu':'cut / run','top sürme':'dribble','perde':'screen',
'Seçim sırası':'Draft order','Tüm seçimler':'All picks',
'Aday kalmadı.':'No prospects left.',
'Bu draftta seçim yapmadın.':'You did not make a pick in this draft.',
'İzci raporu yok — kör seçim.':'No scouting report — a blind pick.',
'💬 Soyunma Odası':'💬 Locker Room',
'Nasıl karşılık vereceksin? Kararın moralini ve tüm takımın kimyasını etkiler.':'How will you respond? Your decision affects his morale and the whole squad chemistry.',
'Söz ver':'Make a promise','Sert konuş':'Talk tough','Görmezden gel':'Ignore it',
'⚙️ Ayarlar':'⚙️ Settings',
'🔊 Ses efektleri':'🔊 Sound effects',
'🎚️ Efekt sesi':'🎚️ Effects volume',
'Dil değişince oyun yeniden yüklenir — ilerlemen korunur.':'The game reloads when you change language — your progress is kept.',
'Hesap gerekmez — ilerlemen bu cihazda otomatik kaydedilir.':'No account needed — your progress is saved automatically on this device.',
'Basketbol menajerlik — TBL':'Basketball management — TBL',
'Kart':'Cards','Liste':'List','Tümü':'All','Yok':'None',
'CANLI':'LIVE','BİTTİ':'FINAL','DURDURULDU':'STOPPED',
'Ev':'Home','Deplasman':'Away'
});

/* ── F2: arayüz taramasıyla (tools/i18n-scan.js) bulunan eksik metinler ───────────────── */
Object.assign(I18N_TR_EN,{
/* Öğretici / karşılama */
'Hoş geldin, Menajer!':'Welcome, Manager!',
'Bu oyunda bir basketbol kulübünü yönetiyorsun: kadro kur, maç kazan, geliri büyüt ve ligde yüksel. Bu kısa tur sana temel döngüyü gösterecek.':'In this game you run a basketball club: build a roster, win matches, grow revenue and climb the league. This short tour walks you through the core loop.',
'🏀 Takımın hazır! Hadi basketbol oynayalım.':'🏀 Your team is ready! Let’s play some basketball.',
'❓ Öğreticiyi göster':'❓ Show tutorial',
/* Kadro / ilk 5 */
'🏀 İlk 5 — Sahaya Diz':'🏀 Starting Five — Set the Lineup',
'tutup sahadaki yuvalara sürükle':'and drag them onto the court slots',
'(mobilde de çalışır). Yuvaya tıklayınca oyuncu yedeğe döner; yedek karta tıklayınca ilk boş yuvaya girer. Yuvalar arasında da sürükleyerek yer değiştirebilirsin. Seçmezsen en iyi 5 otomatik oynar.':'(works on mobile too). Tap a slot to send that player back to the bench; tap a bench card to fill the first empty slot. You can also drag between slots to swap. If you pick nothing, the best five play automatically.',
'İlk 5 seçmezsen sağlıklı oyunculardan en iyi 5 otomatik oynar. Taktik ve ilk 5 sonraki maçlarda da geçerli kalır.':'If you do not pick a starting five, the best five healthy players play automatically. Tactics and the lineup carry over to later matches.',
'KADRODAN ÇIKAR':'REMOVE FROM SQUAD',
'Boş slot':'Empty slot',
'Oyuncuları':'Players',
'Kişilik:':'Personality:',
'Uzmanlık':'Specialty',
'Maaş':'Wage',
'Haftalık Maaş':'Weekly Wage',
'Puan':'Points',
'Toplam':'Total',
'Toplam:':'Total:',
'Top Kaybı':'Turnovers',
'2 Sayı':'2 Points','3 Sayı':'3 Points',
'Sayı ort.':'Points per game',
'Sayı ort. (attı/yedi)':'Points per game (for / against)',
'Attığı sayı (maç bazında)':'Points scored (per match)',
'Maç bazında sayı farkı (+/-)':'Point differential per match (+/-)',
'Son 5 maç formu: —':'Last 5 matches form: —',
'Gelişim gösteriliyor':'Showing development',
'Veri yok — birkaç maç oyna, grafikler burada oluşur.':'No data yet — play a few matches and the charts will appear here.',
'Henüz hareket yok — maç oynadıkça dolar':'No activity yet — this fills as you play matches',
'Henüz işlem yok.':'No transactions yet.',
'📈 Oyuncu Gelişimi':'📈 Player Development',
'📈 Oyuncu ort. güç':'📈 Average player rating',
'⚡ Takım OVR':'⚡ Team OVR',
'🎂 Oyuncu ort. yaş':'🎂 Average squad age',
'📊 Taraftar havası':'📊 Fan mood',
'🎟️ Sıradaki ev maçı bilet tahmini':'🎟️ Next home gate estimate',
'🧾 Haftalık sabit gider (maaş+bakım)':'🧾 Weekly fixed costs (wages + upkeep)',
'📅 Katılım':'📅 Joined',
'İtibar:':'Reputation:',
'Başkan':'Chairman',
'Yerel oluşum':'Local support',
'Logo yok':'No logo',
'Logoyu kaydet (URL)':'Save logo (URL)',
'KAYDET':'SAVE','BAŞLAT':'START','İŞE AL':'HIRE','KİRALA':'LOAN','TEKLİF VER':'MAKE OFFER',
'🔁 KİRALIK':'🔁 LOAN',
'Altyapı →':'Youth →',
'Altyapıdan oyuncu yükselt':'Promote a player from the academy',
'Marketten oyuncu transfer et':'Sign a player from the market',
'🧭 İkincil Pozisyon Eğitimi':'🧭 Secondary Position Training',
'-- Oyuncu ve target pozisyon seç --':'-- Pick a player and target position --',
'Kadro uyumu':'Squad fit',
'Yükle':'Load',
'⚔️ Rakip (ör.)':'⚔️ Opponent (e.g.)',
/* Ayarlar / kayıt */
'Kayıt slotları (çoklu kariyer)':'Save slots (multiple careers)',
'Kayıt yönetimi':'Save management',
'Slotlar otomatik kayıttan bağımsızdır — farklı kariyerleri buraya kaydedip yükleyebilirsin.':'Slots are independent of the autosave — you can store and load different careers here.',
'Otomatik kayıt aktif':'Autosave on',
'💾 Otomatik kayıt sıklığı':'💾 Autosave interval',
'12 saniye (önerilen)':'12 seconds (recommended)',
'Kapalı (elle)':'Off (manual)',
'📤 Dışa aktar (.json)':'📤 Export (.json)',
'📥 İçe aktar':'📥 Import',
'🗑 Kaydı sil':'🗑 Delete save',
'🌓 Yüksek kontrast':'🌓 High contrast',
'🔍 Büyük yazı':'🔍 Large text',
'🏟️ Kalabalık ambiyansı':'🏟️ Crowd ambience',
'🌍 Ülke':'🌍 Country',
'😄 Bugünün spikeri:':'😄 Today’s commentator:',
/* Başarımlar */
'🏆 Başarımlar':'🏆 Achievements',
'İlk Galibiyet':'First Win','İlk maçını kazan':'Win your first match',
'Bir sezonda 5 galibiyet':'Win 5 matches in a season',
'Bir sezonda 10 galibiyet':'Win 10 matches in a season',
'Üst üste 10 galibiyet serisi yakala':'Put together a 10-match winning run',
'Çift Hane':'Double Digits',
'İlk İmza':'First Signing',
'Bir oyuncunu sat':'Sell one of your players',
'1.000.000 KR bakiyeye ulaş':'Reach a balance of 1,000,000 KR',
'100.000 KR bakiyeye ulaş':'Reach a balance of 100,000 KR',
'Arenayı son seviyeye getir':'Upgrade the arena to its top level',
'Teknik ekibi 5 koçla doldur':'Fill your staff with 5 coaches',
'Tam Kadro Ekip':'Full Staff',
'Bir sezonu tamamla':'Complete a season',
'Bir üst lige çık':'Earn promotion',
'Yükseliş':'Promotion',
'Sezonu 1. sırada bitir':'Finish the season in first place',
'Düzenli sezonu 1. sırada bitir':'Finish the regular season in first place',
'Düzenli sezonu hiç kaybetmeden bitir':'Finish the regular season unbeaten',
'Şampiyon':'Champion',
'Playoff Kralı':'Playoff King',
'Playoff şampiyonu ol':'Win the playoff title',
'Kupa Şampiyonu':'Cup Winner',
'Ulusal Kupayı kazan':'Win the National Cup',
'Yüz Maç Kulübü':'Century Club',
'Kariyerinde 100 maça çık':'Play 100 matches in your career',
'Ömür Boyu':'One-Club Man',
'Bir oyuncuyu emekli olana dek en az 8 sezon kadronda tut':'Keep a player in your squad for at least 8 seasons until he retires',
'Aynı kulüpte 10 sezon tamamla':'Complete 10 seasons at the same club',
'Yıldız Doğuyor':'A Star Is Born',
'Bir maçta MVP çıkar':'Have a match MVP',
'Doğru Seçim':'Right Pick',
'Draftta seçtiğin bir oyuncu maçın yıldızı (MVP) olsun':'Have a player you drafted named match MVP',
'Gençlerin Gücü':'Youth Power',
'Küllerinden':'From the Ashes',
'Mali kriz yaşadığın sezonu artı kasayla bitir':'End a season in the black after a financial crisis',
'Tersine Dönüş':'Turnaround',
'Çaylak Menajer':'Rookie Manager',
'Pazarlıkçı':'Negotiator',
'Isınıyoruz':'Warming Up',
/* Koç bonusları */
'Haftada zayıf oyunculara +1 Hücum':'+1 Offense per week to your weakest players',
'Haftada zayıf oyunculara +1 Savunma':'+1 Defense per week to your weakest players',
'Haftada zayıf oyunculara +1 Kondisyon':'+1 Conditioning per week to your weakest players',
'Haftada zayıf oyunculara +1 Şut':'+1 Shooting per week to your weakest players',
'Altyapı +%5 gelişim':'+5% youth development',
/* İzci */
'Henüz izcin yok. Aşağıdan işe al — atadıkları havuzda oyuncuları otomatik keşfederler.':'You have no scouts yet. Hire one below — they automatically uncover players in the pool you assign them to.',
'İzciler her ekonomi haftası atandıkları havuzda (Altyapı / Transfer Market) oyuncu potansiyellerini otomatik keşfeder. Kalite = keşif hızı ve isabeti.':'Each economy week your scouts uncover player potential in the pool they are assigned to (Youth / Transfer Market). Quality determines both speed and accuracy.',
/* Lig / kupa */
'🏆 Lig puan durumu':'🏆 League standings',
'Fikstür, tablo, G/M/Puan ve maç simülasyonu tek çekirdek.':'Fixtures, table, W/L/Points and match simulation all share one core.',
'Sadece sıradaki maç (sim test)':'Next match only (sim test)',
'Ön Eleme':'Preliminary Round',
'Tek eleme; kupa günleri lig turlarının arasındadır. Maçını 1 tur içinde oynamazsan otomatik simüle edilir.':'Single elimination; cup days sit between league rounds. If you do not play your tie within one round it is simulated automatically.',
/* Taktik ekranı */
'— Yok (dengeli dağıtım) —':'— None (balanced distribution) —',
'🎯 En iyi savunmacını':'🎯 Assign your best defender to',
'rakibin yıldızına':'the opponent’s star',
'ata — o oyuncunun isabeti düşer.':'— his accuracy will drop.',
'🐢 Yavaş':'🐢 Slow','⚡ Hızlı':'⚡ Fast','⚡ Hızlı hücum':'⚡ Fast break',
'🏀 İçeri ağırlıklı':'🏀 Inside focus','🎯 Dış şut ağırlıklı':'🎯 Outside focus','🛡️ Bölge savunması':'🛡️ Zone defense',
'⏳ Maç Devam Ediyor':'⏳ Match In Progress',
'⏳ seçiyor…':'⏳ picking…',
/* Draft raporu sözcükleri */
'ham yetenek':'raw talent','hazıra yakın':'nearly ready','uzun vadeli proje':'long-term project',
'belirgin bir kozu yok':'no standout weapon',
'atletizm':'athleticism','dış atış':'outside shooting','oyun kurma':'playmaking',
'pota koruma':'rim protection','top kullanımı':'ball handling','oyun zekâsı':'basketball IQ',
'Ligi altta bitiren önce seçer. Taban/tavan tahminleri':'The team finishing last picks first. Floor/ceiling estimates depend on',
'bağlıdır — en iyi izcin':'your scouting — your best scout is',
/* Arena / taraftar */
'BAŞLANGIÇ ARENA':'STARTER ARENA',
'Başlangıç Arena — 5.000 kişi':'Starter Arena — 5,000 seats',
'Çok ucuz':'Very cheap','Pahalı':'Expensive','Çok pahalı':'Very expensive',
/* Sezon / başkan */
'düşme hattından uzak durmak':'stay clear of the relegation zone',
'🗣️ Başkanın hedefi: düşme hattından uzak durmak.':'🗣️ The chairman’s goal: stay clear of the relegation zone.',
'Bugün bedeli yok; huzursuzluk büyür ve odaya yayılır.':'No cost today; the unrest grows and spreads through the locker room.',
'Karakterine bağlı: kimisi toparlanır, kimisi küser. Otoriteni gösterir.':'Depends on his character: some rally, some sulk. It shows your authority.',
'Morali hemen yükselir. Sözünü tutmazsan güven çöker ve kimya düşer.':'His morale lifts immediately. Break the promise and trust collapses along with chemistry.',
'— “Gelecek maç ilk 5’tesin.”':'— “You start the next match.”',
'— “Yerini antrenmanda kazanacaksın.”':'— “You will earn your place in training.”',
'senin':'yours','ile':'with','için anlaşma duyurdu.':'have announced a deal for.',
'Ç1:':'Q1:','Ç2:':'Q2:','Ç3:':'Q3:','Ç4:':'Q4:'
});

/* Ek ifade kalıpları (F2) */
I18N_PHRASES.push(
  [/· sezon sonunda döner/g,'· returns at season end'],
  [/(\d+) kişilik/g,'$1 seats'],
  [/(\d+)\s*taraftar/g,'$1 fans'],
  [/(\d+)\s*genç\b/g,'$1 youth players'],
  [/(\d+) başarı/g,'$1 achievements'],
  [/İlk 8 ort/g,'Top-8 avg'],
  [/güçlü:/g,'strengths:'],
  [/gelişmeli:/g,'needs work:'],
  [/serbest oyuncu/g,'free agents'],
  [/kulübünden/g,'from'],
  [/seçim yapıyor…/g,'is on the clock…'],
  [/senin sıran:/g,'your pick:'],
  [/beklenen güç sıran/g,'projected strength rank'],
  [/takım bonusu/g,'team bonus'],
  [/Takvim günü/g,'Calendar day'],
  [/Sıradaki:/g,'Next:'],
  [/Senin grubun:/g,'Your group:'],
  [/başladı\./g,'has started.'],
  [/sürer/g,'long'],
  [/Ücretsiz/g,'Free'],
  [/oyun içi/g,'in-game'],
  [/hücum gücü/g,'offensive power'],
  [/pas dağıtımı/g,'playmaking'],
  [/pota altı gücü/g,'interior strength'],
  [/üçlük eğilimi/g,'three-point tendency'],
  [/\bhız\b/g,'speed'],
  [/kadro sırası/g,'squad rank'],
  [/gelişim payı/g,'growth left'],
  [/SÖZLEŞME UZAT/g,'EXTEND CONTRACT'],
  [/maçlar 4×5 dk \(20 dk\) \+ 5 dk uzatmalar\./g,'matches are 4×5 min (20 min) plus 5-min overtimes.'],
  [/tur \(tek devre\)/g,'rounds (single round robin)'],
  [/Fikstür, tablo ve skorlar tek kaynaktan\./g,'Fixtures, table and scores come from one source.'],
  [/Yedekler/g,'Bench'],
  [/İlk 5:/g,'Starters:']
);

/* ── F2b: ikinci tarama turunun eksikleri ────────────────────────────────────────────── */
Object.assign(I18N_TR_EN,{
'Her set motorda gerçekten oynanır: şut seçimi, asist, top kaybı ve kimin yükleneceği değişir.':'Every set is really played by the engine: shot selection, assists, turnovers and who carries the load all change.',
'düşükse set tutmaz.':'is low, the set will not work.',
'Oyuncuya komşu bir pozisyon öğret (PG↔SG↔SF↔PF↔C) — 15 oyun günü · 10.417 KR. İkincil pozisyonda hafif performans kaybıyla oynar.':'Teach a player an adjacent position (PG↔SG↔SF↔PF↔C) — 15 game days · 10,417 KR. He plays his secondary position with a slight performance loss.',
'— senin grubun (':'— your group (',
'— yalnızca':'— only',
'— yalnızca senin':'— yours only',
'🌱 Altyapı':'🌱 Youth',
'🇹🇷 Türkçe':'🇹🇷 Türkçe',
'↓ Canlı maç & şut haritasına git':'↓ Go to live match & shot chart'
});

/* Bu kalıplar dizinin BAŞINA eklenir: daha genel kalıplardan (ör. "hedef") önce çalışmalı. */
I18N_PHRASES.unshift(
  [/Başkanın hedefi/g,'Chairman’s goal'],
  [/Bugünün spikeri/g,'Today’s commentator'],
  [/Takım Trendi/g,'Team Trend'],
  [/OVR gelişim eğrisi/g,'OVR development curve'],
  [/şu an/g,'now'],
  [/Adaylar/g,'Prospects'],
  [/(\d+) kaldı/g,'$1 left'],
  [/(\d+)\.\s*sıra/g,'$1. place'],
  [/(\d+)\s*genç/g,'$1 youth players'],
  [/Yerel oluşum/g,'Local support'],
  [/orta sıra — en fazla/g,'mid-table — no worse than'],
  [/kuraları çekildi/g,'draw has been made'],
  [/ön elemede oynayacaksın/g,'you will play in the preliminary round'],
  [/ön elemeyi BYE geçtin/g,'you got a BYE in the preliminary round'],
  [/Son 16 içindesin/g,'you are in the last 16'],
  [/Kupa günleri lig turları arasına serpiştirilir/g,'Cup days are spread between league rounds'],
  [/\bŞUT\b/g,'SHOT'],
  [/yaklaşık/g,'approx.'],
  [/Genel:/g,'Overall:'],
  [/\bBaşarımlar\b/g,'Achievements'],
  [/gelişim payı/g,'growth left'],
  [/İkincil pozisyonda hafif performans kaybıyla oynar/g,'He plays his secondary position with a slight performance loss'],
  [/Oyuncuya komşu bir pozisyon öğret/g,'Teach a player an adjacent position'],
  [/bitmek üzere!/g,'expiring soon!'],
  [/en iyi izcin/g,'your best scout is'],
  [/bağlıdır —/g,'depends on —']
);

I18N_PHRASES.push(
  [/ham yetenek/g,'raw talent'],[/hazıra yakın/g,'nearly ready'],[/uzun vadeli proje/g,'long-term project'],
  [/belirgin bir kozu yok/g,'no standout weapon'],
  [/atletizm/g,'athleticism'],[/dış atış/g,'outside shooting'],[/oyun kurma/g,'playmaking'],
  [/pota koruma/g,'rim protection'],[/top kullanımı/g,'ball handling'],[/oyun zekâsı/g,'basketball IQ'],
  [/ribaund/g,'rebounding'],[/savunma/g,'defense'],[/asist/g,'assists'],[/top kaybı/g,'turnovers']
);

/* ── F2c: son kalan arayüz metinleri ─────────────────────────────────────────────────── */
Object.assign(I18N_TR_EN,{
'-- Oyuncu ve hedef pozisyon seç --':'-- Pick a player and target position --'
});
I18N_PHRASES.unshift(
  [/Soyunma Odası/g,'Locker Room'],
  [/Kişilik:/g,'Personality:'],
  [/ŞUT (\d+)/g,'SHOT $1'],
  [/\((\d+) maç ·/g,'($1 games ·'],
  [/(\d+) maçtır kenardayım/g,'I have been on the bench for $1 games'],
  [/Ben bu takımın en iyi (\d+)\. oyuncusuyum — sahada olmam gerekiyor\./g,'I am the number $1 player in this squad — I should be on the floor.'],
  [/Antrenmanda her şeyi yapıyorum ama maç günü ismim yok\. Bunu anlamıyorum\./g,'I do everything in training but my name is missing on game day. I do not understand it.'],
  [/Menajerimle konuştum\. Süre alamayacaksam burada ne işim var\?/g,'I spoke to my agent. If I am not going to play, what am I doing here?']
);

/* ── F2d: emoji önekli etiketler ve başlık kalıpları ─────────────────────────────────── */
Object.assign(I18N_TR_EN,{
'⚖️ Dengeli':'⚖️ Balanced','⚖️ Normal':'⚖️ Normal','⚖️ Normal tempo':'⚖️ Normal tempo','⚖️ Dengeli hücum':'⚖️ Balanced offense',
'📋 Set oyun':'📋 Set offense','🧍 Adam adama':'🧍 Man-to-man','🔥 Pres':'🔥 Press','🔥 Pres sav.':'🔥 Press def.',
'🛡️ Bölge sav.':'🛡️ Zone def.','🏀 İçeri':'🏀 Inside','🎯 Dış şut':'🎯 Outside','⚡ Hızlı tempo':'⚡ Fast tempo',
'Tempo':'Tempo','Hücum odağı':'Offensive focus'
});
I18N_PHRASES.unshift(
  [/Taktik — vs/g,'Tactics — vs'],
  [/TAKTİK — VS/g,'TACTICS — VS'],
  [/\bSen:/g,'You:'],
  [/· sen$/g,'· you'],
  [/Maç hazırlığı/g,'Match preparation']
);

/* ── F2e: ana panel / haber kartları / özet rozetleri ────────────────────────────────── */
Object.assign(I18N_TR_EN,{
'HABERLER':'NEWS','GALİBİYET':'WINS','GALIBIYET':'WINS','MAĞLUBİYET':'LOSSES','MAĞLUBIYET':'LOSSES',
'LİG SIRASI':'LEAGUE POSITION','PUAN':'POINTS','SEN':'YOU','EV':'HOME','DEPLASMAN':'AWAY',
'SONRAKİ MAÇ':'NEXT MATCH','Ulusal Kupa':'National Cup','Lig haberleri':'League news',
'Başkan':'Chairman','Sezon':'Season'
});
I18N_PHRASES.unshift(
  [/Lig haberleri/g,'League news'],
  [/Ulusal Kupa/g,'National Cup'],
  [/(\d+)G · (\d+)M/g,'$1W · $2L'],
  [/\bhedefi:/g,'goal:'],
  [/\bgrubun\b/g,'group'],
  [/yalnızca senin/g,'only your'],
  [/ekonomi KR/g,'economy in KR'],
  [/anlaşma duyurdu\./g,'announced a deal.'],
  [/kadrosunu güçlendirdi:/g,'strengthened the squad:'],
  [/yerine\)/g,'in his place)'],
  [/mevki ihtiyacı/g,'positional need'],
  [/oyun kurucu\b/g,'point guard'],[/şutör guard/g,'shooting guard'],
  [/kısa forvet/g,'small forward'],[/uzun forvet/g,'power forward'],[/\bpivot\b/g,'center']
);

Object.assign(I18N_TR_EN,{'Haberler':'News','Galibiyet':'Wins','Mağlubiyet':'Losses','Sen':'You','Lig Sırası':'League Position','Puan':'Points'});

/* ── F8-5 / F8-6 (32. oturum): canlı EN oturumunda ekranda kalan Türkçe dizeler ──────────
   Emoji ön ekli olanlar artık i18n.js'teki simge-öneki normalizasyonu sayesinde gövdeden
   çözülüyor; buraya GÖVDELER eklendi (önek olduğu gibi korunur). */
Object.assign(I18N_TR_EN,{
'Serbest Oyuncular':'Free Agents',
'Bakiye:':'Balance:',
'Bakiye':'Balance',
'Bireysel Antrenman':'Individual Training',
'Takım Antrenmanı':'Team Training',
'Menajer':'Manager',
'Gelir Tahmini':'Revenue Estimate',
'Gider Tahmini':'Expense Estimate',
/* Kutu skor + Analiz sayfası başlıkları (EN oynayan kullanıcının en çok baktığı iki ekran) */
'Asist':'Assists',
'Faul':'Fouls',
'Asist ort.':'Assists avg.',
'Ribaund ort.':'Rebounds avg.',
'Sayı ort.':'Points avg.',
'Ribaund':'Rebounds',
'Blok':'Blocks',
'Top çalma':'Steals',
'Top kaybı':'Turnovers',
'Sayı':'Points'
});

/* F8-7 sonrası: düzeltilmiş tarayıcının bulduğu kalan dizeler. */
Object.assign(I18N_TR_EN,{
'Oyuncular':'Players',
'· serbest':'· free agent',
'· oyuncu ilanı':'· listed by you'
});
I18N_PHRASES.unshift(
  [/Ligi altta bitiren önce seçer\. Taban\/tavan tahminleri/g,'The lowest-placed club picks first. Floor/ceiling estimates depend on'],
  [/izci kalitene/g,'your scout quality'],
  [/ bağlıdır/g,''],
  [/— en iyi izcin (\d+)★/g,'— your best scout: $1★'],
  [/— izcin yok, band çok geniş/g,'— no scout, the range is very wide']
);

/* F8-11 / F8-12 (32. oturum): yeni eklenen Ana Panel özet bloğu ve haber şablonları. */
Object.assign(I18N_TR_EN,{
'Durum Özeti':'Status Summary',
'Son 5 maç':'Last 5 games',
'Sıradaki maçlar':'Upcoming games',
'Kadro uyarıları':'Squad alerts',
'Başkan hedefi':'Chairman goal',
'Henüz maç oynanmadı.':'No games played yet.',
'✅ Kadro sağlıklı ve formda.':'✅ Squad is healthy and in form.',
'Şu an':'Currently',
'sakat':'injured',
'yorgun (enerji <60)':'fatigued (energy <60)',
'morali düşük':'low morale'
});
I18N_PHRASES.unshift(
  /* Ana Panel özeti */
  [/(\d+)G · (\d+)M$/g,'$1W · $2L'],
  [/hedef (\d+)\. sıra/g,'target: $1. place'],
  [/(\d+)\. sıra/g,'$1. place'],
  [/🩹 (\d+) sakat/g,'🩹 $1 injured'],
  [/😮‍💨 (\d+) yorgun \(enerji/g,'😮‍💨 $1 fatigued (energy'],
  [/💬 (\d+) morali düşük/g,'💬 $1 with low morale'],
  /* Haber şablonları (F8-11) */
  [/kötü haber aldı: (.+?) (\d+) hafta sahalardan uzak kalacak\./g,'received bad news: $1 will be out for $2 weeks.'],
  [/(\d+) hafta sahalardan uzak kalacak\./g,'will be out for $1 weeks.'],
  [/son (\d+) maçını kazandı/g,'have won their last $1 games'],
  [/^formda takım\./g,'— a team in form.'],
  [/ formda takım\./g,' — a team in form.'],
  [/başkanı: "Bu sezon hedefimiz ilk (\d+)\. Kadromuza güveniyoruz\."/g,'chairman: "Our goal this season is a top-$1 finish. We trust this squad."'],
  [/taraftarı sonuçlardan memnun değil — tribünde pankart açıldı\./g,'fans are unhappy with the results — banners were unfurled in the stands.'],
  [/bilet fiyatlarını güncelledi; iç saha doluluğu/g,'have updated ticket prices; home attendance is at'],
  [/altyapıdan (.+?) adlı genci A takıma çıkardı —/g,'have promoted $1 from the academy to the first team —'],

  [/(\d+) yaşında\./g,'aged $1.'],
  /* i18n-scan bulgusu (36. oturum): metin düğümü çeviriye girmeden ÖNCE trim edilir
     (_i18nTextNode → raw.trim()), bu yüzden BAŞTA BOŞLUK isteyen kalıplar hiç eşleşmiyordu.
     <strong> ile bölünen haber satırlarında görünen düğüm tam olarak budur. */
  [/^arasında takas görüşmesi sürüyor\./g,'are in trade talks.'],
  [/ arasında takas görüşmesi sürüyor\./g,' are in trade talks.'],
  [/ ile <strong>/g,' and <strong>']
);

/* B5 (FAZ 6): zorluk seviyesi arayüzü. */
Object.assign(I18N_TR_EN,{
'Zorluk Seviyesi':'Difficulty',
'🎚️ Zorluk Seviyesi':'🎚️ Difficulty',
'Kolay':'Easy','Normal':'Normal','Zor':'Hard',
'Daha geniş bütçe, daha yumuşak rakipler, az sakatlık. Oyunu öğrenmek için.':'A bigger budget, softer opponents, fewer injuries. Good for learning the game.',
'Dengeli deneyim — tasarlanmış zorluk.':'A balanced experience — the intended challenge.',
'Dar bütçe, güçlü rakipler, sık sakatlık. Deneyimli menajerler için.':'A tight budget, strong opponents, frequent injuries. For experienced managers.'
});
I18N_PHRASES.unshift(
  [/Zorluk: Kolay/g,'Difficulty: Easy'],
  [/Zorluk: Normal/g,'Difficulty: Normal'],
  [/Zorluk: Zor/g,'Difficulty: Hard'],
  [/şampiyonluk yarışı — ilk (\d+)/g,'title race — top $1'],
  [/playoff \(ilk (\d+)\)/g,'playoffs (top $1)']
);

/* F9-6: FAZ 8'den kalan tek çeviri eksiği (Antrenman sayfası). */
Object.assign(I18N_TR_EN,{
'Transfer Bedeli':'Transfer Fee',
'Transfer bedeli':'Transfer fee'
});

/* ── F10-6: ÖĞRETİCİ — 7 adımın tamamı + gezinme butonları ────────────────────
   Tarama aracı öğreticinin yalnız İLK adımını görüyordu (sonraki adımlar tıklamayla açılıyor),
   bu yüzden EN oturumunda 1. adım İngilizce, kalan altı adım ve butonlar Türkçe kalıyordu.
   Adım metinleri <strong> içerdiği için metin düğümü bazlı çeviri parçalanır; çözüm TUT_STEPS
   kataloğunu localizeCatalogs() ile ETİKETLERİYLE BİRLİKTE, innerHTML'e girmeden önce
   çevirmektir (i18n.js). Bu yüzden anahtarlar markup içerir — kısaltma. */
Object.assign(I18N_TR_EN,{
/* 1. adimin baslik+govdesi F2 taramasinda zaten eklenmisti. */
'Maçlar sayfası':'Matches page',
'Sol menüden <strong>Maçlar</strong>a gir. Sıradaki maçında <strong>Taktik ayarla</strong> ile tempo ve hücum odağını seç, sonra <strong>▶ Maçı Başlat</strong> ile canlı izle. Maçlar oynandıkça oyun günleri ilerler.':'Open <strong>Matches</strong> from the left menu. On your next fixture use <strong>Set tactics</strong> to pick tempo and offensive focus, then hit <strong>▶ Start Match</strong> to watch it live. Game days advance as matches are played.',
'Ekonomi':'Economy',
'Her hafta oyuncu maaşları, koç maaşları ve arena bakımı kasandan düşer. Ev maçlarında <strong>bilet geliri</strong> kazanırsın — galibiyetler tribünü doldurur. Detaylar <strong>Bilanço</strong> sayfasında.':'Player wages, coach wages and arena upkeep leave your treasury every week. Home games earn you <strong>gate revenue</strong> — wins fill the stands. See the details on the <strong>Balance</strong> page.',
'Kadro ve transfer':'Squad and transfers',
'<strong>Kadro</strong>da oyuncularını incele; <strong>Transfer Market</strong>ten yenilerini al, ihtiyaç fazlasını sat (bonservisin %85\'i kasaya girer). <strong>Altyapı</strong>daki gençleri yükseltmeyi unutma — bazıları ham elmas!':'Review your players in <strong>Squad</strong>; buy new ones from the <strong>Transfer Market</strong> and sell the ones you do not need (85% of the fee goes to your treasury). Do not forget to promote prospects from the <strong>Academy</strong> — some of them are rough diamonds!',
'Gelişim':'Development',
'<strong>Antrenman</strong> sayfasından takım veya bireysel antrenman başlat; birkaç oyun günü sonra gelişim işlenir. Koçlar her hafta zayıf oyunculara küçük bonuslar verir.':'Start team or individual sessions from the <strong>Training</strong> page; progress is applied after a few game days. Coaches also hand small weekly bonuses to your weaker players.',
'Enerji ve sakatlık riski':'Energy and injury risk',
'Oyuncuların enerjisi maç oynadıkça düşer. Düşük enerjiyle — özellikle art arda — sahaya sürdüğün oyuncularda <strong>sakatlanma riski artar</strong>. Kadro ve İlk 5 ekranlarındaki ⚡ göstergesini takip et; 🥵 art arda yorgun oynayanı, 🩹 sakatlıktan yeni döneni işaretler. Riskli oyuncuları dinlendir.':'Energy drops as players log minutes. Fielding tired players — especially on back-to-back games — <strong>raises their injury risk</strong>. Watch the ⚡ gauge on the Squad and Starting Five screens; 🥵 marks a player who keeps playing tired, 🩹 one who just returned from injury. Rest the risky ones.',
'Hedef':'Your goal',
'İlk 5\'te bitir, üst lige yüksel, başarımları topla (sağ üstteki 🏆). Ayarlara ⚙️ simgesinden ulaşabilirsin. Bol şans!':'Finish in the top five, get promoted, collect achievements (🏆 in the top right). Settings live behind the ⚙️ icon. Good luck!',
'← Geri':'← Back',
'Sonraki →':'Next →',
'Atla':'Skip',
'Başla!':'Start!',
'İyi oyunlar! 🏀':'Enjoy the game! 🏀',
'Maç saati henüz gelmedi.':'It is not match time yet.'
});

/* ── F10-5: paylaşım / davet ─────────────────────────────────────────────────────────── */
Object.assign(I18N_TR_EN,{
'📣 Sonucu Paylaş':'📣 Share Result',
'Maç sonucunu paylaş':'Share the final score',
'📣 Arkadaşını davet et':'📣 Invite a friend',
'🔗 Oyun bağlantısını paylaş':'🔗 Share the game link',
'Bağlantı panoya kopyalanır (mobilde paylaşım menüsü açılır).':'The link is copied to your clipboard (on mobile the share sheet opens).',
'📣 Paylaş':'📣 Share',
'Metni kopyalayıp arkadaşına gönder.':'Copy the text and send it to a friend.',
'Bağlantı kopyalandı — arkadaşına gönder!':'Link copied — send it to a friend!',
'Paylaşılacak maç sonucu yok.':'There is no match result to share yet.',
'Charazay 2.0 — Türkçe basketbol menajerlik oyunu. Kendi kulübünü kur:':'Charazay 2.0 — a basketball management game. Build your own club:',
'Charazay 2.0’da {takim} kulübünü yönetiyorum. Sen de bir kulüp kur, ligde karşılaşalım:':'I manage {takim} in Charazay 2.0. Start your own club and let us meet in the league:'
});

/* ── F11-6: kilitli maç / takılı durum bildirimleri ─────────────────────────────────── */
Object.assign(I18N_TR_EN,{
'▶ Maçı sonuçlandır':'▶ Finish match',
'Maç zaten oynanıyor.':'A match is already in progress.'
});

/* ── FAZ 12: mobil arayüz (alt sekme çubuğu, katlanır bölümler, kısayollar) ──────────── */
Object.assign(I18N_TR_EN,{
'Ana':'Home','Kadro':'Squad','Maç':'Match','Lig':'League','Market':'Market',
'🏀 İlk 5’i Düzenle':'🏀 Edit Starting Five',
'⚙ Taktik ayarla':'⚙ Set tactics',
'📊 Maç içi istatistikler':'📊 In-game stats',
'🎯 Şut haritası filtreleri':'🎯 Shot map filters',
'🎯 Şut haritası':'🎯 Shot map',
'Sıradaki maç yok — önce sezonu başlat.':'No upcoming match — start the season first.',
'Taktik ekranı açılamadı.':'The tactics screen could not be opened.'
});
I18N_PHRASES.unshift(
  [/^Daha fazla \((\d+) oyuncu\)$/,'Show more ($1 players)']
);
