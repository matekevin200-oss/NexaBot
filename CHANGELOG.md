# NEXA Bot változásnapló

## 11.0.6 – English Support Server Migration

- A hivatalos NEXA Support szerver teljes kezelt rang-, kategória- és csatornaszerkezete angol alapnyelvet kapott.
- Az új `/support-szerver angolositas` művelet a meglévő elemeket átnevezi, ezért a csatornaazonosítók, üzenetek és előzmények megmaradnak.
- Minden nyilvános, staff- és owner tájékoztatópanel angol szöveget kapott.
- A magyar nyelv választható maradt a `🇭🇺 Magyar` ranggal és a külön `🇭🇺・hungarian-chat` csatornával.
- A nyelv-, tagellenőrző- és ticketpanelek alapértelmezett nyelve angol.
- A migráció eltávolítja a bot korábbi magyar kezelt paneljeit, így nem maradnak dupla tájékoztatók.

## 11.0.5 – Megbízható nyelv- és önkiszolgáló rangok

- A nyelv- és rangválasztó csak valóban kiosztott rang után küld sikerüzenetet.
- A művelet után visszaellenőrzi a tag tényleges Discord-rangjait.
- Hiányzó jogosultság vagy hibás rangsorrend esetén pontos javítási üzenetet ad.
- A Support javítóparancs automatikusan a NEXA Bot rangja alá rendezi a kezelt rangokat.
- Az elavult vagy törölt rangokat tartalmazó panelek biztonságosan felismerhetők.

## 11.0.4 – Support tagellenőrzés önjavítása

- Új, kizárólag az elsődleges bottulajdonos által használható `/support-szerver javitas` parancs.
- Egy lépésben visszakapcsolja a tagellenőrzést, beállítja az ellenőrzőcsatornát és az ellenőrzött rangot.
- Megszünteti a véletlenül bekapcsolt globális tagellenőrzési vésztiltást.
- Az ellenőrzőparancs most már a szerverstruktúra mellett a modul tényleges állapotát is kijelzi.
- A Discord-gomb pontosan megmondja, hogy helyi beállítás, csomag vagy globális tiltás miatt nem működik-e.

## 11.0.3 – Discord parancsregisztráció javítása

- A `/nick` parancs kötelező `indok` mezője most az opcionális `becenev` mező előtt szerepel.
- Megszűnt a Discord API `APPLICATION_COMMAND_OPTIONS_REQUIRED_INVALID` hibája.
- A teljes parancslista kötelező/opcionális mezősorrendje ellenőrizve lett.

## 11.0.2 – Azonnali Support parancs

- A `/support-szerver` parancs globálisan és a bot tulajdonosa által birtokolt szervereken azonnali szerverparancsként is regisztrálódik.
- A Render naplója külön kiírja, melyik szerveren sikerült az azonnali regisztráció.
- A hibás vagy hiányzó `BOT_OWNER_ID` most egyértelmű figyelmeztetést ad a naplóban.

## 11.0.1 – Support Server Factory

- új Owner-only `/support-szerver telepites|panelek|ellenorzes` parancs;
- 13 rang, 7 kategória és teljes támogatási csatornaszerkezet automatikus, ismételhető létrehozása;
- pontos kategória- és rangjogosultságok, elkülönített Staff-, Ticket- és Owner-területek;
- automatikus ellenőrző-, nyelvválasztó- és ticketpanel;
- kész magyar–angol szabályzat, bemutatkozás, útmutató, hibajelentés, ötlet- és staffműködési sablon;
- automatikus NEXA-konfiguráció, szigorú védelem és korlátlan Ultimate support-szerver csomag;
- három új célzott teszt; a teljes készlet 96 sikeres tesztet tartalmaz.

## 11.0.0 – AEGIS Permission DNA

- új Owner-only AEGIS jogosultsági intelligencia és külön Owner Center oldal;
- veszélyes Discord-jogok, privilegizált emberek, ismeretlen botok és nem elszigetelhető identitások elemzése;
- 0–100 biztonsági pontszám és minden találathoz emberileg olvasható kockázati magyarázat;
- kriptográfiai Permission DNA, jóváhagyott bázis és későbbi jogosultsági drift összehasonlítása;
- új `/aegis statusz`, `/aegis vizsgalat` és `/aegis bazis` Owner-parancs;
- új PostgreSQL migráció az AEGIS vizsgálatokhoz és egyetlen aktív bázishoz;
- teljes magyar–angol Tudásközpont 14 fő rendszer gyakorlati leírásával;
- új, szemkímélő grafit–réz webes arculat visszafogott rendszerállapot-jelzésekkel;
- célzott AEGIS automatizált tesztek, változatlanul megőrzött korábbi modulok.

## 10.0.1 – NEXA Operations Interface

- teljesen új, asztali gépre optimalizált NEXA Operations webes arculat;
- prémium, letisztult irányítóközpont rácsozott háttérrel és visszafogott rendszerállapot-jelzésekkel;
- áttervezett fejléc, oldalsó navigáció, űrlapok, táblázatok, kapcsolók és mentősáv;
- rendezett, kétoszlopos Owner-szerverlista javított statisztikákkal és műveleti gombokkal;
- új publikus termékbemutató, élő hálózati sáv, platformmátrix és biztonsági eseménykonzol;
- szélesebb PC-s munkaterület, javított laptopos töréspontok és külön telefonos egyszerűsítés;
- az összes meglévő NEXA Bot, Owner, ChronoGuard, RP és Discord funkció változatlanul megmaradt.

## 10.0.0 – ChronoGuard Digital Twin

- új, Owner-only ChronoGuard szerver-időgép és incidensközpont;
- a rangok, csatornák, jogosultsági felülírások és fontos szerverbeállítások aláírt digitális ikre;
- stabil SHA-256 állapotlenyomat és HMAC-lánc, amely kimutatja a tárolt pillanatkép manipulálását;
- Causal Drift Engine: magyarázható eltéréslista, kritikus/magas/közepes/alacsony besorolás és 0–100 kockázati pontszám;
- védett rangok és csatornák kijelölése, amelyek eltérése automatikusan kritikus riasztás;
- automatikus, konfigurálható pillanatképezés, megőrzés és Shadow Scan a háttérben;
- biztonságos helyreállítás: módosított elemek visszaállítása, hiányzó elemek opcionális újralétrehozása, új elemek törlése nélkül;
- exportálható Incident Capsule teljes pillanatképpel, aktuális állapottal, eltéréssel és integritás-ellenőrzéssel;
- új Owner Center oldal és owner-only `/chronoguard statusz|vizsgalat|pillanatkep` parancs;
- PostgreSQL migrációk, indexek, auditok, hibakezelés és célzott ChronoGuard tesztkészlet.

## 7.0.1 – TGF Forge & Zero-Form Broadcast

- Owner Centerből létrehozható, szerkeszthető és Discordra kihelyezhető egyedi TGF-folyamatok;
- legfeljebb 15 kérdés automatikus, ötkérdéses Discord-lépésekre bontással;
- vak bírálat: a jelentkező személye csak a végleges döntés után válik láthatóvá;
- TGF-időkapszula: minden beküldés a használt kérdéssor verziójával és teljes pillanatképével kerül PostgreSQL-be;
- bírálói 1–10 pontozás, elutasításkor kötelező indoklás, automatikus privát értesítés és elfogadott rang;
- NEXA Integrity Pulse döntést nem hozó kitöltöttségi, részletességi és ismétlődésjelzéssel;
- kérdés, ügyszám és jóváhagyás nélküli Owner Zero-Form Broadcast, opcionális rangpinggel;
- új TGF-statisztikák, auditbejegyzések, adatbázistáblák, indexek és automatikus migráció;
- 82 automatikus teszt sikeresen lefut.

## 7.0.0 – Owner Operations & ER:LC Bridge

- új, külön Platform oldal látható aktív navigációval és magyar/angol nyelvváltással;
- Owner Workflow Studio saját dokumentum- és ügyiratsablonokkal, legfeljebb öt egyedi kérdéssel;
- sablononkénti célcsatorna, használati rang, személyping, ügyszám és vezetői jóváhagyás;
- Owner Shift Operations aktív és lezárt szolgálatok szerkesztésével, törlésével és nullázásával;
- minden szolgálati adminművelet auditálása és veszélyes teljes reset kötelező megerősítése;
- ER:LC Bridge titkosított, szerverenkénti Server Key tárolással;
- élő ER:LC szerver-, játékos-, staff- és queue-áttekintés;
- owner-only, külön megerősítéses ER:LC távoli parancskonzol;
- API timeout, rövid cache, helyi rate limit és biztonságos hibakezelés;
- új PostgreSQL migráció és ER:LC integrációs állapottábla.
- PC-re optimalizált, széles Owner Operations felület külön oldalsó navigációval és rögzített gyorsmenüvel;
- átrendezett Owner Center, nagyobb munkaterület, olvasható táblázatok és közvetlen Saját iratok, Szolgálatkezelés és ER:LC gyorsgombok.
- dokumentumonként választható értesítendő Discord-rang biztonságos automatikus rangpinggel.

## 6.1.0 – Engagement Suite

- egykattintásos, kétnyelvű tagellenőrzőpanel automatikus rangkiosztással;
- konfigurálható Starboard a közösség legjobb üzeneteinek automatikus kiemelésére;
- PostgreSQL-alapú személyes emlékeztetők létrehozással, listázással és törléssel;
- háttérfeladat-kezelő az újraindítás után is megmaradó értesítésekhez;
- három új, szerverenként kapcsolható dashboard-modul;
- modern Engagement Suite állapotkártyák a szerver Command Deck oldalán;
- új adatbázis-migrációk és célzott indexek.

## 6.0.0 – Production Core

- kereshető, lapozott Owner Center és részletes szerverállapot-oldal;
- NEXA Shield jogosultság- és rangpozíció-ellenőrzés;
- jogosulatlan csatorna-, rang- és webhook-létrehozás automatikus visszavonása;
- felhasználó- és szerveralapú Discord interakciós rate limit;
- 24 órás műveleti, védelmi, audit- és hibastatisztika;
- automatikus telemetria-, audit-, hiba- és AI-előzménymegőrzés;
- production environment readiness ellenőrzés titkok megjelenítése nélkül;
- szerverenkénti naplókhoz optimalizált PostgreSQL indexek;
- kibővített webes biztonsági fejlécek;
- fizetős Render compute és hosszabb szabályos leállítási idő;
- frissített függőségek, 0 ismert npm-sérülékenység.

## 5.5.0

- Owner által vezérelt RP- és dokumentumrendszer;
- Anti-Raid, Anti-Nuke és Bot-Guard;
- Owner által kiosztható Free, Pro és Ultimate csomagok;
- OAuth2 dashboard, közösségi modulok, moderáció, ticket, AI és szolgálati rendszer.
