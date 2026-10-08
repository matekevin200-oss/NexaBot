# NEXA Bot 20.1.0 — CIA Expanded kézikönyv

Magyar CIA RP frakciórendszer: 26 kezelt rang, 17 kategória, 117 csatorna (101 szöveges, 16 hangszoba). A CIA nyilvános működéséről szóló háttér és a saját szerver szabályai külön szerepelnek. A dokumentum egy szerepjátékos Discord-frakció használati útmutatója.

## Frissítés a meglévő CIA szerveren

1. A csomagból frissítsd a Render által futtatott projektet, különösen az `index.js`, `package.json` és `package-lock.json` fájlt, majd indítsd újra a botot.
2. Az eddigi környezeti változókat tartsd meg. A `BOT_OWNER_ID` a saját fő botowner fiókod Discord-azonosítója legyen. A tartós beállításokhoz és erőforrás-azonosítókhoz legyen működő PostgreSQL `DATABASE_URL`.
3. Neked és a botnak Rendszergazda jog szükséges a cél szerveren. A NEXA rangja legyen a kezelt CIA rangok fölött.
4. A már telepített szerveren használd: **`/cia ujratelepites`**. Ez frissíti a rangokat, szobákat, hozzáféréseket és paneleket; pótolja a hiányzó elemeket.
5. Az eredményt a **`/cia ellenorzes`** paranccsal nézd meg.

| Parancs | Feladat | Ki használhatja? |
| --- | --- | --- |
| `/cia telepites` | Első telepítés olyan szerveren, ahol még nincs CIA rendszer | A fő botowner |
| `/cia ujratelepites` | Meglévő CIA rendszer frissítése, bővítése és javítása | Kizárólag a fő botowner |
| `/cia rangok-frissitese` | Csak rangnevek, sorrend és rangtájékoztatók | Kizárólag a fő botowner |
| `/cia ellenorzes` | Állapot és hiányzó elemek, módosítás nélkül | A fő botowner |

Más admin, szervertulajdonos, CIA-vezető és hozzáadott Owner-kezelő nem kap telepítési jogot. Az engedélyt a `BOT_OWNER_ID` fiókazonosító adja, nem a Discord-rang neve. A CIA továbbra is Discordon kezelhető; a webes dashboardba nem kerül CIA-kezelőfelület.

A kezelt, meglévő rangok és csatornák azonosítója megmarad, akkor is, ha közben átnevezted őket. A telepítő visszaállítja a saját kanonikus neveit és jogosultságait, a hiányzó elemeket létrehozza. A felhasználói beszélgetéseket, ticketeket és meglévő tagi rangkiosztásokat nem törli. A NEXA saját tájékoztatóit és paneljeit frissíti. Kézzel törölt rang új azonosítót kap, ezért annak korábbi tagi kiosztását nem tudja visszaállítani.

A CIA modulbeállítások a telepítési alapértékekre frissülnek. A már létező CIA TGF saját címe, kérdései és várakozási ideje megmarad; a kapcsolódó csatornaazonosítók frissülnek. A meglévő egyedi dokumentumok tartalmát szintén megőrzi, és más felvételi sablonokat nem töröl.

A korábbi V1 telepítési jelzőt felismeri. Megszakadás után a már mentett erőforrás-azonosítók alapján újra próbálható ugyanaz a művelet. Bot- vagy Render-újraindítás önmagában nem telepít újra. A telepítések dátuma, végrehajtója és összesítése az igazgatósági telepítési naplóba kerül; a tulajdonosi művelet auditbejegyzést is kap.

## Beosztások és hozzáférési rangok

A valós nyilvános munkakörökből kiinduló RP beosztások, szervezeti címkék és értesítési rangok eltérő célokat szolgálnak. A Discord megjelenítési sorrendje nem a valódi CIA katonai rangsora. A szakmai munkakörök egymás mellett is működhetnek.

| Discord-rang | Feladat a szerveren |
| --- | --- |
| 👑 Director of the CIA (D/CIA) | D/CIA — a szerver teljes RP vezetése, végső döntések és kinevezések. A telepítési jog külön, a BOT_OWNER_ID fiókhoz kötött. |
| ⭐ Deputy Director of the CIA (DD/CIA) | DD/CIA — az igazgató helyettese; összehangolja a szerver vezetőinek munkáját és kezeli az eszkalált ügyeket. |
| 🏛️ Executive Director (EXDIR) | EXDIR — az RP szerver végrehajtási és igazgatási koordinátora, a vezetői döntések követése. |
| 🛡️ Deputy Director for Operations (DDO) | DDO — a műveleti RP ág vezetője; műveleti jóváhagyás, felvételi bírálat és szakmai ellenőrzés. |
| 🎖️ Chief of Station (COS) | COS — az adott RP állomás munkáját és szolgálatát szervezi; mentorálást és eligazítást vezet. |
| 🕶️ Deputy Chief of Station (DCOS) | DCOS — az állomásvezető helyettese; feladatkövetés, átadás és szakmai koordináció. |
| 🕵️ Case Officer (CO) | CO — Case Officer; a fiktív RP forrásokkal és ügyekkel kapcsolatos feladatok, jelentések. |
| 🎯 Targeting Officer (TO) | TO — Targeting Officer; az RP információigények és az ügyek összefüggéseinek értékelése. |
| 📡 Staff Operations Officer (SOO) | SOO — Staff Operations Officer; az RP műveleti feladatok és a központ közötti koordináció. |
| 🗂️ Collection Management Officer (CMO) | CMO — Collection Management Officer; információigények, gyűjtési összesítők és továbbítás nyilvántartása. |
| 🧩 Specialized Skills Officer (SSO) | SSO — Specialized Skills Officer; kijelölt, szakképzéshez kötött RP támogató feladatok. |
| 🛡️ Paramilitary Officer (PMO) | PMO — Paramilitary Officer; külön engedélyezett RP gyakorlatok résztvevője, a játék szabályai szerint. |
| 🧠 Intelligence Analyst (IA) | IA — Intelligence Analyst; az RP információkat tényekre, következtetésekre és bizonytalanságokra bontja. |
| 🧪 Technical Operations Officer (TOO) | TOO — Technical Operations Officer; RP technikai eszközök állapota, igénylése és hibajelentése. |
| 💻 IT Engineer | IT Engineer — a szerver kijelölt digitális folyamatainak és rendszerhibáinak dokumentálása; külön fejlesztői jogosultságot nem kap. |
| 📦 Support Integration Officer (SIO) | SIO — Support Integration Officer; RP logisztika, készletek és támogatási igények koordinálása. |
| 🎓 Professional Trainee (PT) | PT — Professional Trainee; betanuló állománytag, aki mentor mellett tanul és teljesíti az alapképzést. |
| 🧠 Directorate of Analysis (DA) | DA — az elemzői RP terület hozzáférési csoportja; szervezeti címke, nem önálló előléptetési fokozat. |
| 🧪 Directorate of Science & Technology (DS&T) | DS&T — a tudományos és technikai RP terület hozzáférési csoportja. |
| 💻 Directorate of Mission Systems (DMS) | DMS — a Mission Systems RP terület hozzáférési csoportja. |
| 📦 Directorate of Support (DS) | DS — a támogatási és logisztikai RP terület hozzáférési csoportja. |
| 📋 CIA Jelölt | Jelölt — jelentkezés alatt álló személy, belső műveleti hozzáférés nélkül. |
| ✅ Ellenőrzött állomány | Ellenőrzött — belépési státusz; önmagában nem jogosít műveleti vagy vezetői hozzáférésre. |
| 🚨 Műveleti Riasztás | Műveleti értesítési rang — kizárólag értesítést kér, hozzáférést nem ad. |
| 📢 CIA Közlemények | Közleményértesítési rang — kizárólag a szerver közleményeinek értesítéseihez. |
| ⛔ Felfüggesztett | Felfüggesztett státusz — a hozzáférési rangokat a vezetőségnek külön el kell venni; önmagában nem írja felül más Discord-rang engedélyét. |

## Kategóriák és csatornák

### ━━━ 01 • CIA BELÉPÉS ━━━

Hozzáférés: Nyilvános, vezetőség által írható.

| Szoba | Típus |
| --- | --- |
| 👋・üdvözlés | Tájékoztató / botpanel |
| 📜・szabályzat | Tájékoztató / botpanel |
| ✅・ellenőrzés | Tájékoztató / botpanel |
| 🎭・értesítési-rangok | Tájékoztató / botpanel |
| 📢・közlemények | Tájékoztató / botpanel |
| 🕵️・toborzási-információk | Tájékoztató / botpanel |
| 📝・jelentkezés | Tájékoztató / botpanel |
| ✅・jelentkezési-eredmények | Tájékoztató / botpanel |
| 🏛️・mi-a-cia | Tájékoztató / botpanel |
| ❓・gyakori-kérdések | Tájékoztató / botpanel |
| 🧭・szerver-útmutató | Tájékoztató / botpanel |

### ━━━ 02 • CIA INFORMÁCIÓ ━━━

Hozzáférés: Ellenőrzött, vezetőség által írható.

| Szoba | Típus |
| --- | --- |
| 📘・állományi-kézikönyv | Tájékoztató / botpanel |
| 🔰・szolgálati-hierarchia | Tájékoztató / botpanel |
| 🎖️・beosztások | Tájékoztató / botpanel |
| 📻・rádiókódok | Tájékoztató / botpanel |
| 🧰・felszerelési-szabályzat | Tájékoztató / botpanel |
| 📑・eljárásrendek | Tájékoztató / botpanel |
| 🏢・igazgatóságok | Tájékoztató / botpanel |
| 🔄・hírszerzési-ciklus | Tájékoztató / botpanel |
| ⚖️・rp-hatáskörök | Tájékoztató / botpanel |
| 🔐・hozzáférési-szintek | Tájékoztató / botpanel |
| 🤝・etikai-kódex | Tájékoztató / botpanel |
| 📖・fogalomtár | Tájékoztató / botpanel |

### ━━━ 03 • CIA ÜGYINTÉZÉS ━━━

Hozzáférés: Ellenőrzött közösség.

| Szoba | Típus |
| --- | --- |
| 🎫・ügyintézés | Tájékoztató / botpanel |

### ━━━ 04 • CIA TICKETEK ━━━

Hozzáférés: Kijelölt ügyintézők és saját ticket résztvevői.

A privát ticketeket a bot itt hozza létre.

### ━━━ 05 • CIA KÖZÖSSÉG ━━━

Hozzáférés: Ellenőrzött közösség.

| Szoba | Típus |
| --- | --- |
| 💬・állományi-társalgó | Szöveges munkaszoba |
| 📸・média | Szöveges munkaszoba |
| 🤖・bot-parancsok | Szöveges munkaszoba |
| 🔊・Társalgó | Hangszoba |
| ☕・ooc-társalgó | Szöveges munkaszoba |
| 💡・állományi-ötletek | Szöveges munkaszoba |
| 🗓️・eseménynaptár | Tájékoztató / botpanel |
| 🔊・Közösségi terem | Hangszoba |

### ━━━ 10 • KIKÉPZÉS ━━━

Hozzáférés: Állomány és vezetőség.

| Szoba | Típus |
| --- | --- |
| 📣・kiképzési-felhívások | Tájékoztató / botpanel |
| 📚・kiképzési-anyagok | Tájékoztató / botpanel |
| 📅・kiképzési-beosztás | Tájékoztató / botpanel |
| 📝・kiképzési-jelentések | Szöveges munkaszoba |
| 🎧・Kiképzési terem | Hangszoba |
| 🎓・alapképzés | Tájékoztató / botpanel |
| 🧩・szakképzések | Tájékoztató / botpanel |
| 📝・vizsgakövetelmények | Tájékoztató / botpanel |
| 🤝・mentorálás | Szöveges munkaszoba |
| 🎧・Vizsgaterem | Hangszoba |

### ━━━ 20 • MŰVELETI KÖZPONT ━━━

Hozzáférés: Műveleti szakmai beosztások és vezetőség.

| Szoba | Típus |
| --- | --- |
| 🗺️・műveleti-eligazítás | Tájékoztató / botpanel |
| 📟・központi-diszpécser | Szöveges munkaszoba |
| 🚨・aktív-műveletek | Szöveges munkaszoba |
| 📄・műveleti-jelentések | Szöveges munkaszoba |
| 📻・műveleti-rádió | Szöveges munkaszoba |
| 🔊・Műveleti rádió | Hangszoba |
| 📋・műveleti-tervezés | Szöveges munkaszoba |
| ⚠️・kockázatértékelés | Szöveges munkaszoba |
| 🧾・műveleti-értékelés | Szöveges munkaszoba |
| 🗄️・műveleti-archívum | Tájékoztató / botpanel |
| 🔊・Műveleti rádió 2 | Hangszoba |
| 🎧・Eligazító terem | Hangszoba |

### ━━━ 30 • HÍRSZERZÉS ━━━

Hozzáférés: Kijelölt hírszerzési / elemzői munkakörök és vezetőség.

| Szoba | Típus |
| --- | --- |
| 🧠・hírszerzési-központ | Szöveges munkaszoba |
| 🎯・célpontok | Szöveges munkaszoba |
| 🗃️・akták | Szöveges munkaszoba |
| 📎・bizonyítékok | Szöveges munkaszoba |
| 🔎・hírszerzési-jelentések | Szöveges munkaszoba |
| 🗂️・rp-forrásjegyzék | Szöveges munkaszoba |
| 📥・információigények | Szöveges munkaszoba |
| 📊・forrásértékelés | Tájékoztató / botpanel |
| 🎧・Hírszerzési tárgyaló | Hangszoba |

### ━━━ 31 • ELEMZÉS — DA ━━━

Hozzáférés: IA / DA és vezetőség.

| Szoba | Típus |
| --- | --- |
| 🧠・elemzői-műhely | Szöveges munkaszoba |
| 📑・elemzések | Szöveges munkaszoba |
| 🌍・helyzetértékelés | Szöveges munkaszoba |
| 📚・elemzési-alapelvek | Tájékoztató / botpanel |
| 🎧・Elemzői tárgyaló | Hangszoba |

### ━━━ 32 • TUDOMÁNY ÉS TECHNOLÓGIA ━━━

Hozzáférés: TOO / DS&T és vezetőség.

| Szoba | Típus |
| --- | --- |
| 🧪・technikai-koordináció | Szöveges munkaszoba |
| 🧰・eszközigénylések | Szöveges munkaszoba |
| 🔧・technikai-jelentések | Szöveges munkaszoba |
| 📖・technikai-útmutató | Tájékoztató / botpanel |
| 🎧・Technikai tárgyaló | Hangszoba |

### ━━━ 33 • MISSION SYSTEMS — DMS ━━━

Hozzáférés: IT Engineer / DMS és vezetőség.

| Szoba | Típus |
| --- | --- |
| 💻・rendszer-koordináció | Szöveges munkaszoba |
| 🚧・rendszerhibák | Szöveges munkaszoba |
| 🛠️・változásnapló | Tájékoztató / botpanel |
| 🔐・digitális-biztonság | Tájékoztató / botpanel |
| 🎧・Rendszerügyi tárgyaló | Hangszoba |

### ━━━ 34 • TÁMOGATÁS — DS ━━━

Hozzáférés: SIO / DS és vezetőség.

| Szoba | Típus |
| --- | --- |
| 📦・logisztika | Szöveges munkaszoba |
| 🗃️・készletnyilvántartás | Szöveges munkaszoba |
| 📋・támogatási-igények | Szöveges munkaszoba |
| 📖・támogatási-rend | Tájékoztató / botpanel |
| 🎧・Támogatási tárgyaló | Hangszoba |

### ━━━ 35 • KAPCSOLATTARTÁS ━━━

Hozzáférés: Vezetőség.

| Szoba | Típus |
| --- | --- |
| 🤝・partnerkapcsolatok | Szöveges munkaszoba |
| 📨・együttműködési-kérelmek | Szöveges munkaszoba |
| 📜・kapcsolattartási-rend | Tájékoztató / botpanel |
| 🎧・Egyeztető terem | Hangszoba |

### ━━━ 40 • ADMINISZTRÁCIÓ ━━━

Hozzáférés: Állomány és vezetőség.

| Szoba | Típus |
| --- | --- |
| ⏱️・szolgálati-panel | Tájékoztató / botpanel |
| 📊・szolgálati-napló | Tájékoztató / botpanel |
| 🏖️・szabadság-igénylés | Szöveges munkaszoba |
| 👥・állományi-nyilvántartás | Tájékoztató / botpanel |
| 📅・szolgálati-beosztás | Tájékoztató / botpanel |
| 🔁・szolgálatátadás | Szöveges munkaszoba |
| 📑・dokumentum-útmutató | Tájékoztató / botpanel |

### ━━━ 80 • BELSŐ ELLENŐRZÉS ━━━

Hozzáférés: Vezetőség.

| Szoba | Típus |
| --- | --- |
| 📁・ügyiratok | Szöveges munkaszoba |
| 📨・belső-jelentések | Szöveges munkaszoba |
| ⚖️・fegyelmi-eljárások | Szöveges munkaszoba |
| ✉️・panaszok | Szöveges munkaszoba |
| 🔍・ellenőrzési-napló | Tájékoztató / botpanel |
| 🧾・esemény-felülvizsgálat | Szöveges munkaszoba |
| 📖・ellenőrzési-eljárásrend | Tájékoztató / botpanel |
| 🎧・Meghallgató terem | Hangszoba |

### ━━━ 90 • VEZETŐSÉG ━━━

Hozzáférés: Vezetőség.

| Szoba | Típus |
| --- | --- |
| 🔒・vezetőségi-chat | Szöveges munkaszoba |
| 📜・vezetői-határozatok | Tájékoztató / botpanel |
| ⬆️・előléptetés-lefokozás | Szöveges munkaszoba |
| 🛡️・állomány-kezelés | Tájékoztató / botpanel |
| 🔊・Vezetőségi tárgyaló | Hangszoba |
| 📋・vezetői-napirend | Szöveges munkaszoba |
| 📝・értekezleti-jegyzőkönyv | Szöveges munkaszoba |

### ━━━ 99 • IGAZGATÓSÁG ━━━

Hozzáférés: D/CIA és DD/CIA.

| Szoba | Típus |
| --- | --- |
| 👑・főigazgatói-iroda | Szöveges munkaszoba |
| 🗄️・szigorúan-bizalmas-archívum | Szöveges munkaszoba |
| 🛡️・biztonsági-napló | Tájékoztató / botpanel |
| 🤖・bot-napló | Tájékoztató / botpanel |
| 👤・tag-napló | Tájékoztató / botpanel |
| ⚙️・cia-rendszer | Tájékoztató / botpanel |
| 🔁・telepítési-napló | Tájékoztató / botpanel |
| 🎧・Igazgatósági tárgyaló | Hangszoba |

## CIA háttér, szolgálati rend és gyakorlati útmutatók

### 🏛️ Mi a CIA?

A Central Intelligence Agency az Egyesült Államok 1947-ben létrehozott külföldi hírszerző szervezete. Külföldi információt gyűjt és elemez, és a döntéshozókat tájékoztatja. A CIA saját bemutatása szerint nem rendőri szervezet.

**Ezen a szerveren:** fiktív játékbeli RP frakció működik. Nem képviseljük a valódi CIA-t, és a szerver nem ad valós hatósági jogot. Valós személyek magánadatai helyett fiktív karaktereket és játékbeli ügyeket használunk.

Nyilvános háttér: https://www.cia.gov/about/

### 🧭 Kezdés a CIA RP szerveren

1. Olvasd el a szabályzatot és a CIA-bemutatót.
2. Végezd el az ellenőrzést.
3. Az értesítési panelen kizárólag közlemény- és műveleti értesítést választhatsz.
4. A jelentkezési panelen saját szavaiddal válaszolj.
5. Elfogadás után a Professional Trainee beosztás következik, majd az alapképzés.
6. Szakmai és igazgatósági rangot kizárólag a vezetőség oszt ki.
7. Segítséget a privát ügyintézésen kérhetsz.

A szobák láthatósága a feladathoz tartozó rangjaidtól függ. A bot telepítése külön tulajdonosi művelet.

### ❓ Gyakori kérdések

**A CIA ugyanaz, mint az FBI?** Nem. A CIA alapfeladata a külföldi hírszerzés. A játékbeli rendőrségi feladatokat a szerver saját frakciószabályai rendezik.
**Miért nem látok minden szobát?** A belső területekhez szakmai vagy vezetői rang kell.
**A CO magasabb rang a TO-nál?** Eltérő munkakörök; a szerver megjelenítési sorrendje nem hivatalos katonai rangsor.
**Ki telepíthet újra?** Kizárólag a NEXA fő botowner fiókja. A CIA igazgatói rang és az Owner Center kezelői hozzáférése önmagában nem elég.
**Újratelepítés után elvesznek a tagok rangjai?** Az azonosított, meglévő rangokat helyben frissítjük. A kézzel törölt rang korábbi kiosztásait a Discord nem állítja vissza.

### 🏢 A CIA nyilvános szervezeti területei

**DO — Directorate of Operations:** emberi forrásból származó külföldi információ.
**DA — Directorate of Analysis:** több forrásra támaszkodó értékelés.
**DS&T — Directorate of Science and Technology:** tudományos és technikai támogatás.
**DMS — Directorate of Mission Systems:** adatok, alkalmazások, infrastruktúra és digitális rendszerek.
**DS — Directorate of Support:** például logisztika, személyzet és működési támogatás.

A Mission Centerek különböző szakterületek együttműködését szervezik. A Discord-kategóriák ezekből ihletett RP munkaterületek.
Forrás: https://www.cia.gov/about/organization/

### 📘 Állományi kézikönyv

**Szolgálat előtt:** ellenőrizd a beosztást, mentorodat, az aktuális feladatot és a játék szabályait. A szolgálati panelen csak ténylegesen játékban töltött szolgálatot indíts.
**Szolgálat közben:** a kijelölt koordinátornak jelents; a feladat és a jogosultság határát tartsd be. A bizonytalan információt ne tüntesd fel bizonyított tényként.
**Lezáráskor:** add át a nyitott ügyeket, készíts tényszerű jelentést, majd zárd le a szolgálatot.
**Távollét:** a szabadságkérelemben dátumot, helyettesítést és a szükséges rövid indokot rögzítsd.
**Konfliktus:** kérj privát vezetői felülvizsgálatot; az érintett ügyben ne te legyél a saját döntésed bírálója.

### 🔰 RP szolgálati út

**Szervervezetés:** D/CIA → DD/CIA → EXDIR.
**Műveleti RP ág:** DDO → COS → DCOS.
**Szakmai beosztások:** CO, TO, SOO, CMO, SSO, PMO, IA, TOO, IT Engineer, SIO; ezek párhuzamos feladatok. A PT mentor mellett tanul.
**Igazgatósági csoportok:** DA, DS&T, DMS és DS hozzáférési címkék.

A CIA a valóságban nem katonai rendfokozatokat, hanem vezetői és szakmai beosztásokat használ. A fenti szolgálati út a saját RP szerver szabálya, nem a valódi CIA teljes szervezeti ábrája. Munkakör nem jelent automatikus utasítási jogot egy másik szakterület felett.

### 📜 CIA RP szolgálati szabályzat

1. Tartsd be a játék és a szerver szabályait.
2. Tilos a metagaming, powergaming, non-RP és OOC sértegetés.
3. OOC információt ne használj IC döntéshez.
4. Személyes adatot, jelszót és valós személyről összeállított aktát ne küldj.
5. A feladatot a kijelölt vezető és a jogosultság szerint végezd.
6. Minden ügyben tény, időpont, bizonyíték és indok szerepeljen.
7. Bizonyítékot meghamisítani, panaszt megtorolni tilos.
8. Műveleti adat csak az engedélyezett belső területre kerülhet.
9. Ügyhöz nem kapcsolódó rangosztás és adminjoggal visszaélés tilos.
10. Szabályellenes utasítást jelezz a vezetőségnek, és kérj felülvizsgálatot.
11. A saját ügyed elbírálásából lépj ki.
12. A bot védelmét és naplózását ne kerüld meg.
13. Értesítést csak indokoltan küldj.
14. Felfüggesztéskor a hozzáférési rangokat külön el kell venni.
15. A telepítő és az újratelepítő kizárólag a fő botowner művelete.

### 🔄 Hírszerzési ciklus az RP-ben

**1. Igény:** fogalmazd meg a fiktív ügy kérdését.
**2. Gyűjtés:** csak a játék és a szerver által engedélyezett információt használd.
**3. Feldolgozás:** rögzítsd a keletkezési időt, a forráskódot és az ügyazonosítót.
**4. Elemzés:** válaszd külön a tényt, feltételezést és a hiányzó adatot.
**5. Továbbítás:** a kijelölt címzettnek adj rövid, követhető összefoglalót.
**6. Visszajelzés:** javítsd a pontatlanságot és zárd le az ügyet.

Ez a szerver számára készített RP munkamenet. A következtetés nem lesz bizonyított tény attól, hogy magasabb rangú személy írta.

### ⚖️ Hatáskörök a játékban

A CIA RP beosztás kizárólag a szerver saját szerepjátékán belüli jogosultság. Nem ad valós igazoltatási, lehallgatási, letartóztatási vagy adatgyűjtési jogot.

Rendőrségi vagy más frakciót érintő játékbeli intézkedéshez a szerver szabályai szerinti feladatmegosztás és együttműködés kell. A CIA-szerep nem jelent automatikus utasítási jogot minden más frakció felett. Vitás esetben a frakcióvezető vagy a szerver vezetősége dönt.

Kizárólag a játékban létrehozott karakteradatokat kezeljük. A játékosok valós címét, igazolványát, telefonszámát vagy titkos fiókadatait nem kérjük.

### 🔐 RP hozzáférési rend

**Nyilvános:** belépés, szabályzat és általános bemutató.
**Ellenőrzött:** tájékoztató és közösségi terület.
**Állomány:** képzés, szolgálat és saját adminisztráció.
**Szakmai:** műveleti vagy igazgatósági munkaterület.
**Vezetőség:** bírálat, fegyelmi ügy és vezetői döntés.
**Igazgatóság:** a két felső vezetői beosztás számára fenntartott rész.

Ezek helyi RP-hozzáférési csoportok. A szoba elérése nem jogosít a tartalom nyilvános megosztására. A Discord szervertulajdonosa és a Rendszergazda jogosultságú fiókok technikailag minden szobát elérhetnek.

### 🤝 Etikai kódex

Az RP-ben légy tényszerű, pártatlan és tiszteletteljes. Ne használd a beosztásodat személyes konfliktus rendezésére. A valódi játékos és a fiktív karakter külön személyiség.

Rögzítsd, ha valamiben bizonytalan vagy. Kérj második véleményt, ha összeférhetetlenség áll fenn. Panaszt kulturáltan, bizonyítékkal kezelj; a bejelentő ellen megtorlás tilos.

A tisztességes szerepjáték, a magánszféra tisztelete és az arányos szerverintézkedés minden beosztásnál kötelező.

### 📖 Fogalomtár

**IC:** a karakter és a játékvilág eseményei. **OOC:** a játékosok közötti, szerepen kívüli kommunikáció.
**HUMINT:** emberi forrástól származó információ. **OSINT:** nyilvánosan hozzáférhető információ. A szerveren mindkettő csak engedélyezett RP-adatra vonatkozik.
**Forrás:** az információ eredete. **Tény:** ellenőrizhető állítás. **Elemzés:** tények értékelése. **Feltételezés:** még nem igazolt elképzelés.
**Need-to-know:** csak a feladathoz szükséges hozzáférés. **Audit:** egy folyamat utólagos ellenőrzése.
A vezetői és szakmai rövidítések részletesen a beosztások szobában szerepelnek.

### 📻 RP rádiófegyelem és hívójel

Alak: **hívójel → címzett → játékbeli helyszín → rövid esemény → kért segítség**.
Példa: „Központ, Alfa-2. A kijelölt játékbeli területen vagyunk, a feladat lezárult. Jelentést készítünk.”

**Helyi státuszok:** elérhető / feladaton / segítséget kér / feladat lezárva / szolgálaton kívül. A szerver nem állítja, hogy ezek valódi CIA rádiókódok.

Beszélj röviden; ne vágj más közlésébe. OOC beszélgetést a társalgóban folytass. Privát adatot és másik ügy bizalmas részletét ne mondd be közös rádión.

### 🧰 RP felszerelési rend

Csak a játék által biztosított és a feladatodhoz engedélyezett felszerelést használd. Átvételkor rögzítsd az eszköz játékbeli nevét, az átvevőt és az időpontot. Hibát vagy elvesztést a technikai jelentésekben jelezz.

Szakmai eszköz használata a szakképzéshez és a vezetői engedélyhez kötött. A felszerelés nem ad új hatáskört. Valós fegyverekkel, lehallgató eszközökkel vagy más valós műveleti eszközzel ez a szerver nem foglalkozik.

### 📑 Egységes RP ügykezelés

**Megnyitás:** ügyazonosító, időpont, felelős és kérdés.
**Rögzítés:** csak a szükséges játékbeli tények és bizonyítéklinkek.
**Ellenőrzés:** pontosság, jogosultság, OOC/IC szétválasztás.
**Döntés:** kijelölt vezető, indoklás és jóváhagyási állapot.
**Lezárás:** eredmény, megmaradt bizonytalanság, következő lépés.
**Archívum:** a lezárt ügy hivatkozása, dátuma és hozzáférési csoportja.

Hibát javítási megjegyzéssel korrigálj. A változás okát és idejét tartsd követhetően nyilván.

### 🕵️ Felvételi eljárás

A jelentkezés a felvételi panelen indul, tíz saját megfogalmazású válasszal. A kitöltő a releváns RP-tapasztalatáról írjon, személyes okmány és valós lakcím nélkül.

A vezetőség vak bírálatot használ. Elfogadás után Professional Trainee beosztás és alapképzés következik. Elutasítás után a panel beállítása szerinti várakozási idő érvényes; ezt a kézikönyv alaptelepítésben 72 órára állítja. Az eredményről a bot privát értesítést próbál küldeni.

### 📚 Kiképzési program

**Alap:** szerver- és RP szabályok, szolgálati út, IC/OOC, rádiófegyelem, ügyazonosító, jelentésírás.
**Szakmai:** a választott munkakör feladatai, hozzáférési rend, csapatmunka és bizonytalanságok jelölése.
**Gyakorlat:** fiktív ügy feldolgozása és saját szavakkal írt értékelés.
**Vizsga:** rövid elméleti rész és megfigyelt RP-gyakorlat; értékelés után megfelelt vagy ismétlendő.

A kiképzés szerveres RP-oktatás. A valós CIA képzéseit vagy titkos eljárásait nem másolja.

### 🎓 Alapképzés — PT

A mentor bemutatja a belépési rendet és a csatornákat. A jelölt ellenőrizhetően megkülönbözteti az IC és OOC adatot, megfogalmaz egy rövid rádióközlést, és kitölt egy fiktív műveleti jelentést.

A betanuló nem kap önálló műveletvezetői jogot. A mentor rögzíti a gyakorlat idejét, témáját és eredményét. Ha hiba marad, közösen átismétlik; a következő gyakorlathoz egyértelmű fejlesztési célt jelölnek ki.

### 🧩 Szakképzések

**CO / SOO:** játékbeli ügykövetés és koordináció.
**TO / CMO:** információigény és forrásértékelés.
**IA / DA:** tény, következtetés és bizonytalanság elkülönítése.
**TOO / DS&T:** játékbeli eszköznyilvántartás.
**IT Engineer / DMS:** szerveres hibajelentés és változáskövetés.
**SIO / DS:** készlet és támogatási igény.
**PMO / SSO:** kizárólag a játék szabályai által engedélyezett, külön kijelölt gyakorlat.

A munkakörök közötti váltás külön vezetői döntés, nem automatikus előléptetés.

### 📝 Vizsgakövetelmények

**Kötelező elemek:** helyes IC/OOC elkülönítés, a szerepkör megértése, rövid és követhető kommunikáció, tényszerű jelentés, bizonyítéklink és szabályos szolgálatlezárás.

A kiképző minden elemnél megfelelt vagy ismétlendő értékelést ad, és rövid indokot rögzít. Megfelelt eredményhez minden kötelező elem teljesítése kell. A megismételt vizsga új dátumot és értékelést kap; az előző eredményt megőrizzük.

### 🤝 Mentorálási napló

Minta: **PT beosztású karakter / mentor / dátum / gyakorlat témája / megfigyelt teljesítmény / javítandó pont / következő alkalom**.

A mentor szakmai útmutatást ad, de nem oszthat magának új vezetői vagy botowner jogot. Az értékelés ne minősítse a játékos valódi személyiségét.

### 🗺️ Műveleti eligazítás

Az RP eligazításban legyen: ügyazonosító, cél, felelős, résztvevők, feladatmegosztás, kommunikációs szoba, hatáskör, kockázat és lezárási feltétel.

A vezető ellenőrizze, hogy a feladat megfelel a játék és a frakciószabályoknak. A résztvevők kérdezhetnek és jelezhetik a bizonytalanságot. A jóváhagyás nem helyettesíti a szerver szabályait.

### 📋 RP műveleti terv sablon

**Ügyazonosító:**
**Játékbeli cél:**
**Felelős vezető:**
**Résztvevő karakterek és feladatok:**
**Időpont:**
**Kommunikációs szoba:**
**Szerveres hatáskör:**
**Megszakítási feltétel:**
**Jóváhagyás:**

A tervet a kijelölt koordinátor vizsgálja felül, és a módosítást időponttal rögzíti.

### ⚠️ RP kockázatértékelés

Csak játékbeli és szerveres kockázatot írj: hiányzó információ, eltérő szabályértelmezés, nem elérhető résztvevő, kommunikációs hiba vagy technikai probléma.

Minta: **kockázat / várható játékbeli hatás / felelős / szükséges tisztázás / döntés**. Ha a szabályosság nem tisztázott, a feladatot előbb egyeztesd a vezetővel.

### 🧾 Művelet utáni értékelés

**Tervezett cél / tényleges eredmény / időrend / jól működött rész / eltérés / bizonyíték / tanulság / következő teendő**.

Tényszerűen írj; a karakter hibáját és a játékos viselkedését külön kezeld. A felülvizsgálat célja az RP folyamat javítása. Panaszügyet az illetékes privát ügykezelésben folytass.

### 🗂️ RP forrásjegyzék

Csak fiktív RP-forráskódot használj. A bejegyzésben legyen ügyazonosító, keletkezési idő, játékbeli információ és hozzáférési csoport.

Valós játékosról ne készíts háttéraktát. A karakter adatlapja nem tartalmazhat lakcímet, telefonszámot, valódi munkahelyet vagy okmányt. Más ügy adatát csak kapcsolódó indokkal és jogosultsággal használd.

### 📥 RP információigény sablon

**Ügyazonosító / megválaszolandó kérdés / jelenlegi tények / hiányzó RP adat / felelős munkakör / határidő / értékelés állapota**.

A gyűjtést kizárólag a játékban engedélyezett módon végezd. A hiányzó információt jelöld hiányzóként; ne találj ki bizonyítékot a feladat lezárásához.

### 📊 Forrásértékelés

A szerver helyi értékelése: **ellenőrzött / részben alátámasztott / nem ellenőrzött / ellentmondásos**.

A forrás megbízhatósága és az egyes állítások bizonyítottsága külön dolog. Minden állításnál hivatkozás, időpont és bizonytalanság szerepeljen. Ezek RP értékelési címkék, nem a valódi CIA belső minősítései.

### 📚 Elemzési alapelvek

Az RP értékelés négy része: **tények / következtetés / alternatív értelmezés / bizonytalanság**.

Egy állítás ismétlése nem új bizonyíték. A cáfoló adatot is rögzítsd. A jelentésben a felhasznált játékbeli forrásokra hivatkozz, és jelezd, mi változtatná meg a következtetést.

### 📖 Technikai munkarend

Az RP eszköznyilvántartásban rögzítsd a játékbeli eszköz nevét, állapotát, felelősét és a kért javítást. A technikai jelentésben leírás, megismétlés és hatás szerepeljen.

Másik felhasználó fiókjához vagy valódi eszközéhez hozzáférést ne kérj. A szerveres technikai rang nem jogosít valós rendszerek vizsgálatára.

### 🔐 Digitális szerverrend

Hibajelentés: érintett funkció, időpont, várt eredmény, tényleges eredmény és érzékeny adat nélküli képernyőkép.

Token, jelszó és API-kulcs nem kerülhet Discord-csatornába. A változásnaplóba a módosítás célja, felelőse és eredménye kerül. A DMS csoport nem kap botowner vagy Owner Center jogot. A bot telepítési műveleteit kizárólag a fő botowner végezheti.

### 📖 Támogatási munkarend

Minden RP igényhez rendelj felelőst, státuszt és határidőt. A készletnyilvántartásban csak játékbeli erőforrás szerepeljen.

Státuszok: beérkezett / egyeztetés / teljesítés / lezárt. Az átadás után az igénylő visszajelzése zárja le a tételt. Valós költséget vagy személyes pénzügyi adatot ne kezelj ezekben a szobákban.

### 🤝 Kapcsolattartási rend

Másik RP frakcióval kijelölt kapcsolattartó egyeztet. A kérelemben szerepeljen frakció, RP cél, szükséges együttműködés, időpont és jóváhagyó.

A külön frakciók jogköreit nem írja felül egy CIA-beosztás. Csak a jóváhagyott játékbeli összefoglalót oszd meg, és ne add át a teljes belső archívumot.

### 🔁 Szolgálatátadás

**Távozó karakter / átvevő karakter / időpont / nyitott ügyek / határidők / szükséges hivatkozások / hiányzó információk**.

A szolgálati panelen a tényleges játékbeli időt zárd le. Az átadott feladatért felelős személy nevét egyértelműen rögzítsd.

### 📑 Dokumentumok használata

**Műveleti jelentés:** időrend és eredmény.
**Hírszerzési jelentés:** RP-források, tények és elemzés.
**Kiképzési értékelés:** teljesített és ismétlendő elemek.
**Szabadságkérelem:** dátum és átadás.
**Fegyelmi lap:** állítás, bizonyíték, meghallgatás és indokolt döntés.
**Előléptetési javaslat:** teljesítmény és kívánt beosztás.

A szobákba telepített űrlapok végzik a dokumentumok létrehozását. A jóváhagyásra váró irat még nem vezetői döntés.

### 📖 Belső ellenőrzési munkamenet

**1.** Rögzítsd a bejelentést és az ügyazonosítót.
**2.** Ellenőrizd az összeférhetetlenséget.
**3.** Válaszd külön az állítást és a bizonyítékot.
**4.** Hallgasd meg az érintetteket a kijelölt privát területen.
**5.** Írj indokolt döntési javaslatot.
**6.** Az illetékes vezető dönt, és a felülvizsgálati lehetőség is szerepel.

A bejelentő személyét csak az ügyhöz szükséges körben oszd meg. A belső ellenőrzés a saját RP szerver ügyeit kezeli.

### 📋 Vezetői napirend

**Dátum / résztvevők / nyitott ügyek / felvételi döntések / kiképzési helyzet / szolgálati feladatok / felelősök / határidők**.

A botowner művelete külön feladat: CIA-rang nem helyettesíti a BOT_OWNER_ID azonosítást.

### 📝 Értekezleti jegyzőkönyv

**Időpont / napirend / rövid tényállás / döntés / indoklás / felelős / határidő / következő ellenőrzés**.

A jegyzőkönyvben a vitát röviden, személyeskedés nélkül foglald össze. Nyilvános közleményhez külön, érzékeny részleteket nem tartalmazó változat készül.

### 👑 CIA vezetői központ

A CIA-rendszer kizárólag Discordon, a botowner parancsaival kezelhető.

**Első telepítés:** `/cia telepites`
**Teljes frissítés és bővítés:** `/cia ujratelepites`
**Csak rangok:** `/cia rangok-frissitese`
**Állapot:** `/cia ellenorzes`

A telepítő és az újratelepítő csak az elsődleges BOT_OWNER_ID fióknak engedélyezett, megfelelő szerverjoggal. A szervertulajdonos, admin, CIA vezető és hozzáadott Owner-kezelő ettől nem kap újratelepítési jogot. A NEXA kezelt elemei frissülnek; a tagi rangkiosztások és a felhasználói beszélgetések megmaradnak.

### ⚙️ Telepítési és javítási rend

Az újratelepítés a kezelt rangok és szobák tárolt Discord-azonosítóit használja; a hiányzó elemeket létrehozza. A NEXA saját tájékoztatóit és kezelőpaneljeit frissíti.

Kézzel törölt rang új azonosítót kap, korábbi tagi kiosztását nem állítja vissza. A szerver saját többi csatornáját és beszélgetését nem törli. A CIA modulbeállítások a telepítési alapértékekre frissülnek.

A sikert és a tulajdonosi újratelepítést naplózzuk. Megszakadás esetén a már mentett azonosítók alapján ugyanaz a parancs újraindítható. Render-újraindítás önmagában nem telepít.

## Nyilvános források

A háttéranyag ellenőrzésének dátuma: 2026. október 8. A fenti RP-szabályok, hozzáférési sorrend, rádióstátuszok és vizsgarend a saját szerverhez készült javaslatok. Az angol munkakörök rövidítései a szerveres megjelenítést segítik, nem egy teljes hivatalos rangjegyzéket jelentenek.

- [CIA — About](https://www.cia.gov/about/): alapfeladat, történeti kezdet és hírszerző szerep.
- [CIA — Organization](https://www.cia.gov/about/organization/): az öt igazgatóság és a Mission Centerek.
- [CIA — Directorate of Operations](https://www.cia.gov/about/organization/directorate-of-operations/): a nyilvánosan bemutatott műveleti munkakörök.
- [CIA — Directorate of Mission Systems](https://www.cia.gov/about/organization/directorate-of-mission-systems/): a digitális rendszerterület jelenlegi neve.
- [CIA — Using Foreign Languages](https://www.cia.gov/stories/story/using-foreign-languages-at-cia/): Technical Operations Officer és Support Integration Officer.
- [CIA — Directorate of Support](https://www.cia.gov/about/organization/directorate-of-support/): támogatási feladatok.
- [CIA — Technology Careers](https://www.cia.gov/tech/tech-careers/): technikai és mérnöki munkakörök.
- [CIA — DO Undergraduate Internship](https://www.cia.gov/careers/student-programs/undergraduate-internship-program-directorate-of-operations/): SOO, TO és Professional Trainee program.

## Ellenőrzés a kiadásban

45 automatikus teszt futott le sikeresen. Ezek között van a fő botowner kizárólagossága, a régi V1 telepítés migrációja, a többszöri újratelepítés duplikáció nélkül, a megszakadt telepítés folytatása, az egyedi TGF megőrzése, a szobajogosultságok és a valódi parancskezelőben futó rangfrissítés / újratelepítés. A Discord-embed méretkorlátokat is ellenőriztük.

A futási próbák szimulált Discord-szerveren történtek. A saját éles szervered csak a frissített bot elindítása és a fenti parancs futtatása után változik meg.
