# NEXA Bot változásnapló

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
