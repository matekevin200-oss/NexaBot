# Crown City RP — telepítés és használat

**NEXA Bot 20.4.0 • Emergency Response: Liberty County**

## Gyors telepítés

1. Hozz létre vagy válassz ki egy Crown City RP nevű Discord-szervert, és hívd meg a NEXA botot.
2. A jelenlegi botforrásban frissítsd az `index.js`, `package.json` és `package-lock.json` fájlokat ebből a csomagból, majd telepítsd újra / indítsd újra a botot. A korábbi környezeti változókat és adatbázist tartsd meg.
3. A `BOT_OWNER_ID` a saját Discord-fiókod azonosítója legyen. A cél szerveren legyen szervertulajdonosi vagy Rendszergazda jogod. A NEXA botnak Rendszergazda jog kell, rangját tedd a kezelendő rangok fölé.
4. A cél Discord-szerveren futtasd:

```text
/crown-city telepites
```

Ha már tudod az ER:LC privátszerverkódot, a parancs `szerverkod` mezőjében add meg. Példa:

```text
/crown-city telepites szerverkod:Crown123
```

A válasz csak neked látható. Telepítés közben a bot jelzi, melyik szakasznál tart. **69 rang, 15 kategória, 98 szoba és 81 panel** készül, öt külön jelentkezési rendszerrel.

A parancs a bot újraindításakor globálisan és a fő tulajdonos jogosult szerverein külön is regisztrálódik. Ha még nem látod, ellenőrizd az új verzió elindulását, a `BOT_OWNER_ID` értékét és a cél szerveren a saját adminjogodat, majd frissítsd a Discord parancslistáját. Angol felületen az `install`, `repair`, `check` nevek jelenhetnek meg.

## Telepítési és karbantartási parancsok

| Parancs | Mire való? |
| --- | --- |
| `/crown-city telepites` | Teljes létrehozás, illetve félbeszakadt telepítés folytatása. |
| `/crown-city javitas` | Hiányzó rangok / szobák pótlása és Crown City botpanelek frissítése. |
| `/crown-city javitas szerverkod:Crown123` | Privátszerverkód későbbi megadása vagy módosítása. |
| `/crown-city ellenorzes` | Hiányzó elemek, privát csatornahozzáférések és letiltott modulok ellenőrzése. |

Csak az elsődleges `BOT_OWNER_ID` használhatja a telepítőparancsot, Rendszergazda vagy szervertulajdonosi joggal. A kiosztott Management / Staff szerepek önmagukban nem adnak telepítőjogot. A bot a Discord-szerver valós tulajdonosát nem változtatja meg.

A telepítéshez 69 rang és legfeljebb 113 kategória-/csatornahely kell. A meglévő elemeknél kevesebb új hely szükséges. A bot ellenőrzi a keretet; újrafuttatva felismeri a mentett elemeket, a hiányokat pótolja, és nem töröl adatokat. A meglevő egyedi neveket, témákat és jogosultságokat megőrzi. Törölt saját kategória után az árva, kezelt gyerekszobákat visszarendezheti. A hivatalos NEXA Support és a befejezett CIA-telepítés szervere védett.

## Belépés és jogosultságok

- A belépő Új lakos rangot kap; a szabályzat, hitelesítés és ügyintézési útmutatók nyilvánosak.
- A hitelesítőgomb után Állampolgár rangot kap, és megnyílnak a közösségi, civil és jelentkezési szobák.
- A frakciók belső csatornáit a megfelelő frakciórangok és a jogosult vezetőség látják. A rendfokozatok nem adnak Discord-adminjogot.
- A privát bírálatot csak a kijelölt frakcióvezetők / bírálók és a vezetőség láthatják; a sima Cadet / Recruit tag nem.
- A Staff a saját belső szobákat és a ticketeket láthatja. A bizalmas vezetőségi szobákhoz külön vezetőségi rang kell.
- A Discord tényleges szervertulajdonosa és az Administrator joggal rendelkező tagok a Discord szabályai szerint a privát szobákat is elérhetik.

A rangokat a Discord tagrang-kezelésében oszthatod ki. A frakció kezdő rangja az elfogadott jelentkezés után automatikusan jár; a további kinevezéseket a vezetőség végzi.

## Frakció- és Staff-jelentkezések

Öt nyolckérdéses, kétlépéses jelentkezés készül. Az Állampolgár rang szükséges; ugyanarra a részlegre 24 óránként lehet beküldeni. A válaszok privát bírálati szobába kerülnek, alapértelmezett vak bírálattal. A döntéskor a jelentkező értesítést kap; elfogadás esetén a kezdő rangot is megkapja.

| Jelentkezés | Kijelölt bírálói rang | Elfogadáskor kiosztott rang |
| --- | --- | --- |
| Staff | Staff Manager | Trial Moderator |
| CCPD | CCPD • Recruiter | CCPD • Cadet |
| CCSO | CCSO • Recruiter | CCSO • Cadet |
| CCFD / EMS | CCFD / EMS • Recruiter | CCFD / EMS • Recruit |
| CCDOT | CCDOT • Recruiter | CCDOT • Trainee |

A frakcióvezetőnek add oda a saját frakciója **Recruiter** kiegészítő rangját is, ha dönthet a felvételikről. A valós Discord-adminisztrátorok a bot bírálói ellenőrzésén is átjutnak. Az eredmény ugyanabban a privát részlegben marad; a személyes válaszok nem kerülnek nyilvános eredménylistára.

Működő `DATABASE_URL` / PostgreSQL kell a biztonságos jelentkezésekhez. Adatbázis nélkül a szobák és rangok elkészülnek, de a jelentkezési gombok előkészített, letiltott állapotban maradnak. Az adatbázis beállítása után a `/crown-city javitas` frissíti a paneleket.

## Ügyintézés és értesítések

A ticketmenü öt ügytípust ad: segítség / technikai hiba; játékosbejelentés / fellebbezés; frakció / Staff kérdés; partnerség; egyéb ügy. A bot a nyitó tagnak és a kijelölt Crown City Staff-rangoknak külön privát szobát készít. Egy játékosnak egyszerre egy aktív ticketje lehet. Frakcióvezetői rang önmagában nem ad ticket-hozzáférést.

A tagok önként kapcsolhatják be a Session értesítések, Esemény értesítések és Hírek és fejlesztések rangokat. Ezek nem adnak Staff- vagy frakciójogot.

## Session meghirdetése és lezárása

A **session-központ** gombjait a Crown City Staff és a **Session Host** használja.

1. Az ER:LC-ben nyisd meg / készítsd elő a saját privátszerveredet.
2. Discordon kattints a **Session meghirdetése** gombra.
3. Add meg a session nevét; ha módosult vagy még hiányzik, a szerverkódot is.
4. A bot közzéteszi a sessiont a session-állapot szobában, és a Session értesítések rangot pingeli.
5. Befejezéskor a **Session lezárása** gombbal küldheted ki a zárást.

Egyszerre egy session aktív; párhuzamos beküldés nem nyithat több sessiont. A bot Discordon hirdet és tárol állapotot; e gombok nem nyitják vagy állítják le az ER:LC játékbeli szerverét. ER:LC API-kulcs a Discord-struktúra és a sessionhirdetés használatához nem kell.

## Arculat és tartalom

Arany–palakék beágyazott panelek, számozott kategóriák és következetes szobanevek. Külön Discord- és RP-szabályzat, IC/OOC, MG, PG, RDM, VDM, Fear RP, combat logging és fair play alapelvek. CCPD, CCSO, CCFD / EMS és CCDOT kézikönyvek; állományi, intézkedési, EMS-, DOT- és karakterlapsablonok; bejelentési és fellebbezési útmutató; közös rádióprotokoll.

A kezdeti védelem nem ad automatikus kick / ban büntetést, és nem büntet a friss fiók vagy a tömeges belépés miatt. A bot többi beállítását a saját dashboardban kezelheted. Az Owner Center által globálisan letiltott modulokat a telepítő nem oldja fel; az ellenőrzés jelzi őket. Más szerverek moderációs állapotához nem nyúl.

## Kategóriák

| Kategória | Alap hozzáférés | Szobák |
| --- | --- | ---: |
| 01 • INFORMÁCIÓ  |  CROWN CITY | Nyilvános | 7 |
| 02 • HÍREK ÉS SESSIONÖK  |  CROWN CITY | Állampolgár / Staff | 6 |
| 03 • KÖZÖSSÉG  |  CROWN CITY | Állampolgár / Staff | 8 |
| 04 • CIVIL SZEREPJÁTÉK  |  CROWN CITY | Állampolgár / Staff | 6 |
| 05 • TAGFELVÉTEL  |  CROWN CITY | Állampolgár / Staff | 6 |
| 06 • ÜGYINTÉZÉS  |  CROWN CITY | Nyilvános | 5 |
| 07 • STAFF MŰVELETEK  |  CROWN CITY | Staff | 8 |
| 08 • VEZETŐSÉG  |  CROWN CITY | Vezetőség | 5 |
| 09 • CCPD  |  CROWN CITY | CCPD / vezetőség | 10 |
| 10 • CCSO  |  CROWN CITY | CCSO / vezetőség | 9 |
| 11 • CCFD / EMS  |  CROWN CITY | CCFD / EMS / vezetőség | 10 |
| 12 • CCDOT  |  CROWN CITY | CCDOT / vezetőség | 8 |
| 13 • KÖZÖS IRÁNYÍTÁS  |  CROWN CITY | Frakciók / diszpécser / vezetőség | 5 |
| 14 • NAPLÓK ÉS ARCHÍVUM  |  CROWN CITY | Vezetőség | 5 |
| 15 • PRIVÁT ÜGYEK  |  CROWN CITY | Staff | 0 |

A TAGFELVÉTEL kategóriában vannak a nyilvános jelentkezési panelek. A privát bírálati szobák a Staff- vagy a megfelelő frakciórészlegen belül találhatók. A PRIVÁT ÜGYEK kategória induláskor üres; a ticketek szükség szerint kerülnek bele.

## Teljes ranglista

### Vezetőség

- 👑 Crown City • Tulajdonos
- 👑 Crown City • Társtulajdonos
- 🏛️ Projektvezető
- 🧭 Management

### Staff

- 🛡️ Staff Manager
- 🛡️ Head Administrator
- 🛡️ Administrator
- 🔰 Senior Moderator
- 🔰 Moderator
- 🔰 Trial Moderator
- 🎧 Support Team

### Kiegészítő szerepek

- 💻 Developer
- 🎬 Session Host
- 📷 Media Team
- 🤝 Partner
- 💎 VIP
- ✨ Támogató

### CCPD

- 🚓 CCPD • Chief of Police
- 🚓 CCPD • Deputy Chief
- 🚓 CCPD • Commander
- 🚓 CCPD • Captain
- 🚓 CCPD • Lieutenant
- 🚓 CCPD • Sergeant
- 🚓 CCPD • Corporal
- 🚓 CCPD • Senior Officer
- 🚓 CCPD • Police Officer
- 🚓 CCPD • Cadet
- 🚓 CCPD • Detective
- 🚓 CCPD • SWAT
- 🚓 CCPD • FTO
- 🚓 CCPD • Recruiter

### CCSO

- 🤠 CCSO • Sheriff
- 🤠 CCSO • Undersheriff
- 🤠 CCSO • Chief Deputy
- 🤠 CCSO • Captain
- 🤠 CCSO • Lieutenant
- 🤠 CCSO • Sergeant
- 🤠 CCSO • Corporal
- 🤠 CCSO • Senior Deputy
- 🤠 CCSO • Deputy Sheriff
- 🤠 CCSO • Cadet
- 🤠 CCSO • FTO
- 🤠 CCSO • Recruiter

### CCFD / EMS

- 🚒 CCFD / EMS • Fire Chief
- 🚒 CCFD / EMS • Deputy Chief
- 🚒 CCFD / EMS • Captain
- 🚒 CCFD / EMS • Lieutenant
- 🚒 CCFD / EMS • Engineer
- 🚒 CCFD / EMS • Firefighter
- 🚒 CCFD / EMS • Paramedic
- 🚒 CCFD / EMS • EMT
- 🚒 CCFD / EMS • Recruit
- 🚒 CCFD / EMS • FTO
- 🚒 CCFD / EMS • Recruiter

### CCDOT

- 🚧 CCDOT • Director
- 🚧 CCDOT • Supervisor
- 🚧 CCDOT • Senior Technician
- 🚧 CCDOT • Technician
- 🚧 CCDOT • Trainee
- 🚧 CCDOT • Recruiter

### Diszpécser

- 📡 Diszpécser

### Civil / belépési szerepek

- 🏢 Vállalkozó
- ⚖️ Ügyvéd
- 👤 Állampolgár
- 🆕 Új lakos
- 🤖 Automatizáció

### Értesítések

- 🔔 Session értesítések
- 🎉 Esemény értesítések
- 📢 Hírek és fejlesztések

## Teljes szobalista

### 01 • INFORMÁCIÓ  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 👑・üdvözlünk | Szöveg / csak olvasás | Az első lépések és a közösség bemutatása. |
| 📜・discord-szabályzat | Szöveg / csak olvasás | Közösségi szabályok és ügykezelési alapelvek. |
| 🎭・rp-szabályzat | Szöveg / csak olvasás | Az ER:LC szerepjáték alapelvei és tiltott magatartások. |
| 🎮・szerver-információ | Szöveg / csak olvasás | Crown City RP privátszerver és csatlakozás. |
| ✅・hitelesítés | Szöveg / csak olvasás | Szabályelfogadás és az Állampolgár rang felvétele. |
| 🏷️・rangok-és-hatáskörök | Szöveg / csak olvasás | Rangrendszer, frakciók és kinevezések. |
| ❓・gyakori-kérdések | Szöveg / csak olvasás | Belépés, jelentkezés, segítségkérés és fellebbezés. |

### 02 • HÍREK ÉS SESSIONÖK  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📢・közlemények | Szöveg / csak olvasás | A vezetőség hivatalos bejelentései. |
| 🟢・session-állapot | Szöveg / csak olvasás | Sessionnyitások és lezárások. |
| 🎛️・session-központ | Szöveg / csak olvasás | Session információk; a vezérlőgombokat a Staff és a Session Host használhatja. |
| 🎉・események | Szöveg / csak olvasás | Szervezett szerepjáték-események és részvételi feltételek. |
| 🛠️・fejlesztési-napló | Szöveg / csak olvasás | Crown City RP változások és szerverfrissítések. |
| 🔔・értesítési-rangok | Szöveg / csak olvasás | Önként felvehető session-, esemény- és hírrangok. |

### 03 • KÖZÖSSÉG  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 💬・közösségi-chat | Szöveg | Kulturált OOC beszélgetés. |
| 📷・képek-és-videók | Szöveg | Saját ER:LC képek, videók és jelenetek. |
| 💡・ötletláda | Szöveg | A /otlet paranccsal szavazható javaslatokat küldhetsz. |
| 📊・szavazások | Szöveg / csak olvasás | Közösségi döntések és visszajelzések. |
| 🤖・bot-parancsok | Szöveg | A bot általános parancsainak használata. |
| Közösségi társalgó 01 | Hang | Részleghez tartozó hangkommunikáció. |
| Közösségi társalgó 02 | Hang | Részleghez tartozó hangkommunikáció. |
| Pihenő | Hang | Részleghez tartozó hangkommunikáció. |

### 04 • CIVIL SZEREPJÁTÉK  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 🪪・karakterlapok | Szöveg | Csak a kitalált RP-karakter adatait add meg; valós személyes adatot ne írj ide. |
| 📰・ic-hirdetések | Szöveg | Kitalált, szerepen belüli hirdetések és szolgáltatások. |
| 🏢・vállalkozások | Szöveg | Jóváhagyott RP-vállalkozások és üzleti jelenetek. |
| 💼・civil-munkák | Szöveg | Civil munkalehetőségek és szerepjáték-feladatok. |
| 🎬・rp-ötletek | Szöveg | Egyeztetett, szabályos szerepjáték-jelenetek. |
| Civil egyeztetés | Hang | Részleghez tartozó hangkommunikáció. |

### 05 • TAGFELVÉTEL  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📋・jelentkezési-tudnivalók | Szöveg / csak olvasás | Frakció- és Staff-jelentkezések menete. |
| 🛡️・staff-jelentkezés | Szöveg / csak olvasás | Jelentkezés a Crown City Staff csapatába. |
| 🚓・ccpd-jelentkezés | Szöveg / csak olvasás | Crown City Police Department jelentkezés. |
| 🤠・ccso-jelentkezés | Szöveg / csak olvasás | Crown County Sheriff’s Office jelentkezés. |
| 🚒・ccfd-ems-jelentkezés | Szöveg / csak olvasás | Tűzoltó- és EMS-jelentkezés. |
| 🚧・ccdot-jelentkezés | Szöveg / csak olvasás | Department of Transportation jelentkezés. |

### 06 • ÜGYINTÉZÉS  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 🎫・ügyintézési-központ | Szöveg / csak olvasás | Privát segítségkérés, játékosbejelentés, fellebbezés és technikai ügy. |
| 🚨・bejelentési-útmutató | Szöveg / csak olvasás | Bizonyíték, időpont és pontos eseményleírás megadása privát ticketben. |
| ⚖️・fellebbezési-útmutató | Szöveg / csak olvasás | Moderációs döntések kulturált felülvizsgálata. |
| 🤝・partnerség | Szöveg / csak olvasás | Együttműködési feltételek és kapcsolatfelvétel. |
| 💎・támogatói-információ | Szöveg / csak olvasás | Közösségi támogatás; nem biztosít Staff- vagy frakcióhatáskört. |

### 07 • STAFF MŰVELETEK  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 🛡️・staff-közlemények | Szöveg / csak olvasás | Belső Staff-utasítások és változások. |
| 💬・staff-chat | Szöveg | Belső koordináció és folyamatban lévő ügyek. |
| 📁・ügymegbeszélés | Szöveg | Bejelentések és szankciók indoklása; az IC és OOC ügyek elkülönítése. |
| 📎・bizonyítékok | Szöveg | Csak ügyhöz tartozó játékbeli bizonyíték; érzékeny adatot ne tárolj. |
| 🎓・staff-képzés | Szöveg / csak olvasás | Moderációs eljárásrend, kommunikáció és arányosság. |
| 📝・staff-bírálat | Szöveg | Staff-jelentkezések privát elbírálása. |
| Staff eligazítás | Hang | Részleghez tartozó hangkommunikáció. |
| Staff interjú | Hang | Részleghez tartozó hangkommunikáció. |

### 08 • VEZETŐSÉG  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 🏛️・vezetőségi-chat | Szöveg | Projektvezetés és bizalmas döntések. |
| 🗂️・vezetőségi-feladatok | Szöveg | Határidők, kinevezések és szervezeti feladatok. |
| 🧭・eseménytervezés | Szöveg | Nagyobb RP-események és szervezési feladatok. |
| ⚙️・szerver-kezelés | Szöveg / csak olvasás | Crown City RP telepítő és karbantartási útmutató. |
| Vezetőségi megbeszélés | Hang | Részleghez tartozó hangkommunikáció. |

### 09 • CCPD  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📘・ccpd-kézikönyv | Szöveg / csak olvasás | A rendőri RP szolgálati rendje. |
| 📢・ccpd-közlemények | Szöveg / csak olvasás | Parancsnoki közlemények. |
| 👥・ccpd-állomány | Szöveg / csak olvasás | Állomány, rendfokozat, hívójel és szolgálati státusz. |
| 💬・ccpd-belső | Szöveg | Belső koordináció. |
| 📝・ccpd-jelentések | Szöveg | Játékbeli intézkedések és szolgálati jelentések. |
| 🎓・ccpd-képzések | Szöveg / csak olvasás | FTO, járőr-, üldözési és rádióképzés. |
| 📋・ccpd-bírálat | Szöveg | Privát rendőrségi felvételi bírálat. |
| CCPD • Rádió 01 | Hang | Részleghez tartozó hangkommunikáció. |
| CCPD • Rádió 02 | Hang | Részleghez tartozó hangkommunikáció. |
| CCPD • Parancsnoki | Hang | Részleghez tartozó hangkommunikáció. |

### 10 • CCSO  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📘・ccso-kézikönyv | Szöveg / csak olvasás | Megyei járőrszolgálat és Sheriff RP. |
| 📢・ccso-közlemények | Szöveg / csak olvasás | Sheriff vezetői közlemények. |
| 👥・ccso-állomány | Szöveg / csak olvasás | Állomány, hívójelek és szolgálati státusz. |
| 💬・ccso-belső | Szöveg | Belső koordináció. |
| 📝・ccso-jelentések | Szöveg | Járőr-, körözési és együttműködési jelentések. |
| 🎓・ccso-képzések | Szöveg / csak olvasás | FTO és megyei járőrképzés. |
| 📋・ccso-bírálat | Szöveg | Privát Sheriff-jelentkezések. |
| CCSO • Rádió | Hang | Részleghez tartozó hangkommunikáció. |
| CCSO • Parancsnoki | Hang | Részleghez tartozó hangkommunikáció. |

### 11 • CCFD / EMS  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📘・ccfd-ems-kézikönyv | Szöveg / csak olvasás | Tűzoltó- és mentőszolgálati RP-eljárások. |
| 📢・ccfd-ems-közlemények | Szöveg / csak olvasás | Szolgálati közlemények. |
| 👥・ccfd-ems-állomány | Szöveg / csak olvasás | Tűzoltó- és EMS-állomány, képesítések és hívójelek. |
| 💬・ccfd-ems-belső | Szöveg | Belső szolgálati koordináció. |
| 📝・esemény-jelentések | Szöveg | Tűz-, baleseti és műszaki mentési RP-jelentések. |
| 🚑・ems-jelentések | Szöveg | Kizárólag kitalált játékbeli ellátási jelentések; valódi egészségügyi adatot ne írj ide. |
| 🎓・ccfd-ems-képzések | Szöveg / csak olvasás | Tűzoltási, műszaki mentési és EMS RP-képzések. |
| 📋・ccfd-ems-bírálat | Szöveg | Privát tűzoltó- és EMS-felvételi. |
| CCFD • Rádió | Hang | Részleghez tartozó hangkommunikáció. |
| EMS • Rádió | Hang | Részleghez tartozó hangkommunikáció. |

### 12 • CCDOT  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📘・ccdot-kézikönyv | Szöveg / csak olvasás | Közútkezelési és vontatási szerepjáték. |
| 📢・ccdot-közlemények | Szöveg / csak olvasás | DOT szolgálati közlemények. |
| 👥・ccdot-állomány | Szöveg / csak olvasás | Állomány és szolgálati hívójelek. |
| 💬・ccdot-belső | Szöveg | Vontatás, útjavítás és terelések koordinációja. |
| 📝・ccdot-munkalapok | Szöveg | Munkavégzési és vontatási jelentések. |
| 🎓・ccdot-képzések | Szöveg / csak olvasás | Munkaterület-biztosítás és szolgálati képzés. |
| 📋・ccdot-bírálat | Szöveg | Privát DOT-jelentkezések. |
| CCDOT • Diszpécser | Hang | Részleghez tartozó hangkommunikáció. |

### 13 • KÖZÖS IRÁNYÍTÁS  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 📡・rádióprotokoll | Szöveg / csak olvasás | Egységes hívójelek, rövid rádiózás és incidenskoordináció. |
| 📞・hívásnapló | Szöveg | Játékbeli bejelentések és egységkiosztások. |
| 🟩・egység-státusz | Szöveg | Szabad, kiérkező, helyszíni és szolgálaton kívüli egységek. |
| Közös műveleti rádió | Hang | Részleghez tartozó hangkommunikáció. |
| Központi diszpécser | Hang | Részleghez tartozó hangkommunikáció. |

### 14 • NAPLÓK ÉS ARCHÍVUM  |  CROWN CITY

| Szoba | Típus | Rendeltetés |
| --- | --- | --- |
| 🛡️・moderációs-napló | Szöveg | Discord moderációs és Staff-műveletek. |
| 🔐・biztonsági-napló | Szöveg | A beállított szervervédelmi modul jelzései. |
| 📥・tag-napló | Szöveg | Csatlakozás, távozás és változások. |
| 🗃️・rp-archívum | Szöveg | Lezárt RP-események és vezetőség által megőrzött anyagok. |
| 📚・jelentkezési-archívum | Szöveg | Lezárt tagfelvételi ügyek privát eredményei. |

### 15 • PRIVÁT ÜGYEK  |  CROWN CITY

A privát ticketcsatornák itt nyílnak meg.

## Ellenőrzés és frissítés

**151/151 automatikus Node-teszt sikeres; 22 Crown City próba.** Ellenőrizve a teljes létrehozás, újrafuttatás, félbeszakadt telepítés és panelhiba utáni folytatás, törölt elemek és árva kategóriacsatornák javítása, tartós konfiguráció visszatöltése, privát bírálat, a valódi Discord-jogosultsági sorrend, ticketek, tulajdonosi korlátozások, keretellenőrzés, session jogosultság és párhuzamos sessionnyitás. A korábbi 129 botpróba is sikeres.

Ellenőrzés: `npm ci`, `npm test`, `node --check index.js`. A Discord API-t a próbák modellezik, a parancsok a tényleges discord.js 14.27.0 builderével is ellenőrizve. Élő Discord-telepítés és Render-deploy nem történt.

A csomagban az új telepítő mellett a korábbi Belv MDT-, CIA- és Support-funkciók szerepelnek. A mentett konfiguráció nem törlődik frissítéskor. Új npm-függőség nincs; a bot továbbra is Node 22 vagy újabb környezetet használ.
