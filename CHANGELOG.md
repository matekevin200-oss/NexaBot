# NEXA Bot változásnapló

## 20.3.1 — Egygombos Support moderációs szünet és MDT-parancsjavítás

- Fő owner kapcsoló az Owner Center Support műveletek oldalán és privát Discord-parancson.
- Csak a hivatalos Supporton szünetelteti a NEXA moderációját; más szerverek, ticketek, üdvözlés és tagellenőrzés működését megőrzi.
- Aktív Discord AutoMod-szabályok kikapcsolása, eredeti állapothoz kötött visszaállítás és tartós mentés.
- Raidlezárás/karantén feloldása, észlelési ablakok kiürítése, régi büntetési gombok és parancsok blokkolása.
- Folyamatban lévő intézkedések friss állapotellenőrzése, részleges hibák folytatása és újraindítás utáni helyreállítás.
- MDT-tagfelvétel a beállításlap tetején; fő owner hozzáférési diagnosztika a tagokhoz.
- Központbeli alkalmazásparancsjog a felvett tagoknak, külön jogonként mentett és visszaállított korábbi állapot.
- MDT-regisztráció a csatornafrissítés előtt, más globális parancshibától független indulási szinkron.
- 129 Node-teszt (61 MDT, 20 Support) és 22 emulált kliensfolyamat sikeres; élő deploy nem történt.

## 20.3.0 — Tagi Belv MDT, állományi Discord-központ és betöltőképernyő

- Fő owner által felvett Discord–Roblox fiókpárok, saját tagi kódok és ügyintézői azonosítás.
- Saját iratkezelés; fő owner-jóváhagyás; más tag függő iratának védelme.
- Belv állományi rang olvasási hozzáférése a közzétett nyilvántartáshoz.
- Discord-központ és útmutató, személyes gombok, visszaállítható célzott jogosultságok és ismételhető frissítés.
- Animált helyi betöltőképernyő és hibánál visszatérés a bejelentkezéshez.
- Egyetlen Belv Discord-szerver; `/mdt` szerverhez kötött regisztráció.
- 102 Node-teszt és 22 emulált kliensfolyamat sikeres.

## 20.2.2 — Saját egysoros MDT-betöltő

- `/mdt script`: privát, kész `loadstring(game:HttpGet("…"))()` sor a fő ownernek.
- Egysoros kód, letöltés és a régi betöltőlink visszavonása az Owner Centerben; a teljes script megmarad.
- Újraindítás után megmaradó, saját HTTPS-betöltőlink; minden letöltés a mentett Roblox-ID-listát és a fő owner Discord-tagságát ellenőrzi.
- A betöltő nem ad irathozzáférést; külön személyes belépőkód és fő owner-jog kell.
- 89 Node-teszt és 18 emulált Roblox-folyamat sikeres; az egysoros kódot a ténylegesen kiszolgált személyes Lua-forrással is futtatja az ellenőrzés.

## 20.2.1 — MDT-csatornák, játékoskereső és körözésjelzés

- Csak a hiányzó privát MDT-szobák telepítése; a meglévő csatornák és rangok módosítása nélkül.
- Párhuzamos futást védő adatbázis-zárolás, ismételhető és folytatható telepítés.
- Owner Center telepítőgomb és külön másolható, személyes scriptkód-oldal.
- Név/ID szerinti játékosadatlap, pontos Roblox-ID-hez kapcsolt saját MDT-iratok és új adatok felvitele.
- A kiválasztott, megjelenített rendőrségi telefonlista piros/fehér színjelzésének olvasása; hiányzó/ellentmondó forrás ismeretlen.
- Saját MDT-körözések külön listával, jóváhagyási szűrővel. Fő owner és Roblox-ID korlátozás megtartva.
- 77 Node-teszt és 16 emulált kliensfolyamat sikeres. Élő Xeno/Emergency Hamburg próba és Render-deploy nem történt.
- Útmutató: [BELV-MDT-UTMUTATO.md](BELV-MDT-UTMUTATO.md).

## 20.2.0 — Belv MDT

- Owner-only Roblox MDT a NEXA Discord-iratrendszerével.
- Owner Center Roblox-ID-lista és személyre beállított scriptletöltés.
- Személyes kód, szerverenkénti PostgreSQL-mentés, jóváhagyás, keresés, verzióellenőrzés és újraküldés.
- 66 Node-teszt és 7 emulált kliensfolyamat sikeres.
- Útmutató: [BELV-MDT-UTMUTATO.md](BELV-MDT-UTMUTATO.md).

## 20.1.1 — CIA utolsó telepítés

- A fő BOT_OWNER_ID fiók még egyszer frissítheti a korábban telepített CIA-rendszert.
- A V1/V2 telepítési jelző felismerhető; a korábbi telepítési zár nem tiltja az utolsó futást.
- Siker után a telepítő tartósan lezár, és a teljes `/cia` parancsot eltávolítja az érintett Discord-szerverről.
- Újraindításkor nem regisztrálja vissza. Elmaradt parancstörlést induláskor újra megpróbálja.
- A beállításmentés nem oldja fel a végleges lezárást; más admin vagy hozzáadott Owner-kezelő nem indíthat telepítést.
- Megszakadt telepítés folytatható; a végső engedélyt csak teljes siker után használja fel.
- Megtartja a 26 kezelt rangot, 17 kategóriát, 117 szobát, magyar kézikönyvet és az egyedi TGF-megőrzést.
- Ellenőrzés: 48/48 automatikus teszt, ebből 10 CIA futási próba; Node szintaxisellenőrzés. Éles Discordon nem történt telepítés ebben a beszélgetésben.

A friss projekt indítása után futtasd egyszer: `/cia ujratelepites`.
Részletes útmutató: [CIA-UTMUTATO-20.1.1.md](CIA-UTMUTATO-20.1.1.md).

## 20.1.0 — CIA Expanded

- 26 kezelt rang és beosztás, 17 kategória, 117 csatorna (101 szöveges, 16 hangszoba).
- `/cia ujratelepites`: kizárólag az elsődleges BOT_OWNER_ID fiók frissítheti / javíthatja a CIA rendszert.
- Tulajdonosi ellenőrzés a parancskezelőben és a belső telepítő / rangfrissítő függvényekben.
- A régi V1 telepítés támogatott; első telepítés helyett a tulajdonosi újratelepítés használható.
- ID alapján kezeli a meglévő, akár átnevezett rangokat és csatornákat; hiányzó elemeket pótol.
- Megmaradnak a tagi rangkiosztások, ticketek, beszélgetések és egyedileg módosított TGF-kérdések.
- Magyar CIA-bemutató, beosztásleírások, szolgálati és kiképzési rend, szakterületek és munkaszobák.
- Javítva a rangfrissítő hiányzó importja és a camelCase erőforráskulcsok mentése.
- Újraindítás önmagában nem telepít; CIA-kezelés továbbra is kizárólag Discordon.
- Ellenőrzés: 45/45 automatikus teszt, köztük 7 CIA futási próba, valamint Node szintaxisellenőrzés. Éles Discordon nem futott telepítés ebben a beszélgetésben.

Használat: [CIA-UTMUTATO-20.1.0.md](CIA-UTMUTATO-20.1.0.md).

## 20.0.0 – NEXA OS Studio

- Elkészült az elsődleges botownerhez kötött NEXA OS Studio nyolc szervertípussal és tizenhárom kapcsolható modullal.
- Az új helyi tervezőmotor nem használ OpenAI API-t vagy AI-kreditet, és nem fogad el tokent vagy más titkos kulcsot.
- Digital Twin előnézet mutatja a létrehozandó és frissítendő rangokat, kategóriákat, csatornákat, paneleket és a szükséges botjogosultságokat.
- A terv HMAC-aláírt, ownerhez és szerverhez kötött, időkorlátos, auditált és ismételten biztonságosan futtatható.
- A telepítés hozzáadó és javító jellegű; nem ütemez törlést, nem oszt Administrator jogot és Render-újraindításkor nem indul el magától.
- Új Owner Recovery Center, telepítési előzmény és kezelt Discord-erőforrás-nyilvántartás készült.
- A normál webes felület angol alapnyelvű és tartósan magyarra váltható; az Owner Center kizárólag magyar marad.
- A slash parancsok nyelve szerverenként Automatikus, Magyar vagy English módra kapcsolható, közös kanonikus parancskezeléssel.
- A régi túlméretezett Platform-kártyákat új, reszponzív rendszerarchitektúra, élő magtérkép, kompakt modulmátrix és ellenőrzött működési folyamat váltotta fel.
- A CIA-rendszer továbbra is kizárólag Discordon kezelhető, és nem került vissza a webes dashboardba.
- A teljes kiadást 38 automatikus teszt ellenőrzi, beleértve a Studio, Platform UI, Stripe, nyelv, Support, CIA és újraindítási védelmet.

## 15.4.0 – Azure Command & CIA One-Time Factory

- Visszatért az egységes szerver-kezelőközpont: az Anti-Nuke, Ticket, Automod és a többi modul nem külön bal oldali menüpontként jelenik meg.
- Új sötétkék, égkék és türkiz Azure Command arculat, nagyobb PC-s munkaterület, tisztább aktív állapotok és átrendezett beállításkártyák készült.
- Új, kizárólag az elsődleges bot-owner által használható `/cia telepites` parancs hozza létre a teljes CIA RP frakciószervert.
- A CIA gyár 15 rangot, 12 jogosultságkezelt kategóriát, teljes csatornaszerkezetet, ticketet, szolgálatot, moderációs panelt, 10 kérdéses TGF-et és hat dokumentum-workflow-t telepít.
- Sikeres telepítés után kettős, adatbázis- és Discord-alapú végleges zár akadályozza meg az újrafuttatást.
- A `/cia ellenorzes` semmit nem módosít; megmutatja a zárat és a hiányzó rangokat, kategóriákat vagy csatornákat.
- A Render újraindítása nem futtat CIA-telepítést, és nem írja felül a már kialakított szervert.
- Új automatikus tesztek védik a CIA owner-korlátozását, egyszeri telepítését, a webes navigációt és az Azure Command arculatot.

## 15.3.0 – Calm Horizon & Checkout Recovery

- Teljesen új, nyugodtabb grafit–zsályazöld–pezsgő webes arculat és jobban tagolt asztali elrendezés.
- Az Előfizetés oldal szerver → csomag → Stripe folyamatra lett bontva, külön állapotjelzővel és lenyitható diagnosztikával.
- A Checkout gomb JSON-alapú indítást, 30 másodperces időkorlátot, betöltési állapotot és helyben látható hibaüzenetet kapott.
- A Content Security Policy engedélyezi a Stripe Checkout és Customer Portal célcímeket, ezért a böngésző nem blokkolja csendben az átirányítást.
- A teljesen hibás Stripe-beállítás többé nem hagy látszólag kattintható, de néma gombot: a csomagkártya rögtön megmutatja a hibát, és a részletes diagnosztikához visz.
- Checkout indításakor csak a kiválasztott Price kerül ellenőrzésre; az általános négyáras diagnosztika párhuzamosan fut, így nem tud négyszeres várakozást okozni.
- Valós Stripe API-diagnosztika ellenőrzi a Price ID-k aktív állapotát, EUR pénznemét, összegét, ismétlődő ciklusát és Test/Live módját.
- Sikeres fizetés után a visszatérő oldal szerveroldalon újra lekéri és hitelesíti a Checkout Sessiont, majd azonnal aktiválja az előfizetést.
- A webhook-késés többé nem akadályozza az aktiválást; a webhook továbbra is idempotens háttérbiztosítás és számlanapló.
- Dupla kattintás elleni idempotens Checkout, szigorú szerver/felhasználó/csomag metaadat-ellenőrzés és PostgreSQL readiness figyelmeztetés került be.

- Premium SaaS-style server control shell with dedicated Moderation, Automod, Welcome, Ticket, Logs, Reaction Role, Auto Role, Level, Giveaway, AI, Security, Stats and Settings routes.
- Server context switcher, searchable sidebar, Ctrl/Cmd+K navigation focus, responsive mobile drawer and clearer active-location state.
- Safe focused views keep the complete settings form in the DOM so hidden configuration is preserved when saving.
- Session draft recovery protects unsaved configuration from accidental navigation/reload.
- Client/server validation keeps values, highlights the invalid field and scrolls directly to it.
- Web Support state changes now apply live without forcing a page reload; Discord Close/Pending/Reopen updates the web composer in place.
- Live Support polling tightened to 1.8 seconds with status toasts and reconnect state.
- Owner Center remains limited to BOT_OWNER_ID plus explicit Owner operators; server owner Discord name/username and ID remain visible.
- Subscription naming remains Subscription/Előfizetés only; no public “Prices/Árak” navigation item.
- Render restarts now perform a read-only Support audit and never recreate or overwrite Discord roles, channels or panels.
- Added a dedicated profile and account-security page with a persistent English/Hungarian language preference.
- Added Stripe configuration diagnostics, strict key/Price ID format validation and visible checkout loading state.
- Refreshed the desktop-first interface with a high-contrast deep-blue/mint Command Deck theme and account popover.

## 15.2.1 – Live Control Stability

- Megtartja a kétirányú Web ↔ Discord Support Bridge-et és a Discordos Claim / Pending / Close / Reopen vezérlést.
- Megtartja az automatikus webes ticket-frissítést, így nincs szükség kézi oldalfrissítésre.
- Javítja az angol alapnyelvet: hiányzó/új konfigurációnál nem esik vissza magyarra.
- Az új ticket-címkék és az AI alap rendszerüzenete is következetesen angol alapértelmezést kapott.
- Owner Center továbbra is kizárólag a bot ownerének és explicit hozzáadott Owner felhasználóknak látható és elérhető.
- Megtartja a szervertulajdonos Discord-nevének megjelenítését, a Subscription Center elnevezést és a hibás beállításhoz ugró validációt.
- Render-újraindításkor a Support szerver csak olvasási auditot kap; automatikus újratelepítés vagy szerkezetmódosítás nincs.
- Új Profilközpont, tartós nyelvválasztás, Stripe Readiness diagnosztika és egyértelmű fizetési betöltési állapot készült.
- A web új, mélykék–menta, PC-központú Command Deck arculatot és lenyíló fiókmenüt kapott.

## 14.0.0 – Live Control

- Élő Web Support szinkron: a ticket állapota, felelőse és üzenetei kézi oldalfrissítés nélkül követik a Discordot.
- Discord Staff vezérlők a webes ticketekhez: Claim, Pending, Close és Reopen.
- A webes és Discordos ticket ugyanazt a PostgreSQL rekordot használja; az állapotváltások eseményként és értesítésként is megjelennek.
- A hivatalos Support szerver ticketjei kizárólag a kezelt TICKETS kategóriába kerülnek; a kategóriák és csatornák tényleges sorrendje automatikusan rendeződik.
- Új szerverek alapnyelve és slash-command nyelve angol; a web EN alapértelmezésű, HU/EN váltással.
- Az Árak/Pricing oldal helyett egységes Subscriptions/Előfizetés felület működik.
- Stripe Checkout külön ellenőrzi a kiválasztott Pro/Ultimate havi és éves Price ID-t, és hibánál visszavisz az Előfizetés oldalra érthető üzenettel.
- A dashboard konfigurációs hibái nem törlik a kitöltött adatokat: a rendszer ugyanazt az űrlapot rajzolja újra és a hibás mezőhöz visz.
- A navigáció kiemeli az aktuális oldalt/szakaszt, a dashboard pedig külön kontextussávot kapott.
- Az Owner Center továbbra is kizárólag a fő tulajdonos és a külön engedélyezett owner-userek számára látható; a szerverlistában a tulajdonos Discord-neve is megjelenik.
- Modernizált sötét lila/türkiz webes arculat és tisztább Support/Subscription munkafolyamat.

## 13.0.0 – Premium Support Operations

- Öngyógyító Support Center: felismeri vagy biztonságosan létrehozza a ticket kategóriát és Support rangot.
- Új Owner Support Operations inbox kereséssel, prioritással, állapottal és felelős ügyintézővel.
- Belső jegyzetek, amelyeket az ügyfél nem lát.
- Webes értesítési központ a Discord Staff válaszaihoz.
- Lezárt ügyek 1–5 csillagos értékelése és visszajelzése.
- Automatikus PostgreSQL migráció a 13.0 support-adatmodellhez.

## 12.0.0 – Stripe Billing Operations

- Új, önálló Ticket Center került a szerver dashboardjára: külön állítható panelcsatorna, kategória, ügyintézői rang, panelszöveg és az öt engedélyezett ticket-típus.
- A NEXA Support Gateway szerver- és komponensszinten a hivatalos `1556219615858655254` Support szerverhez lett zárva.
- Elkészült a kétirányú Web Support Bridge, amely a webes ügyfelet és a Discord Support Staffot egy közös ticketbeszélgetésben kapcsolja össze.
- A normál szerverek külön, semleges Ügyintézési központ panelt kaptak; a hivatalos NEXA Support szerver saját Support Gateway megjelenést és kategóriákat használ.
- Új nyilvános, magyar–angol Árak oldal Free, Pro és Ultimate csomaggal, eurós díjakkal.
- Stripe Checkout havi és éves előfizetéshez; a kártyaadatokat a bot nem látja és nem tárolja.
- Stripe Customer Portal a fizetési mód, csomagváltás és lemondás biztonságos kezeléséhez.
- HMAC-aláírt, ötperces időablakkal ellenőrzött webhook és idempotens eseményfeldolgozás.
- PostgreSQL-alapú előfizetés-, állapot-, ciklus- és lejáratkezelés automatikus csomagaktiválással.
- Az Owner-ajándékcsomag és a fizetett csomag külön tárolódik; mindig a magasabb aktív jogosultság érvényesül.
- Az Owner Center külön mutatja az ajándékcsomagokat és a Stripe-előfizetéseket; Pro vagy Ultimate csomagot ingyen is kioszthatsz.
- A Shift alapfunkciója Free csomagban is elérhető.

## 11.0.8 – Kétnyelvű Slash Command rendszer

- Minden slash parancs, alparancs és beviteli mező magyar és angol lokalizációt kapott.
- A Discord saját felhasználói nyelve alapján automatikusan jeleníti meg például a `/beallitas` vagy `/settings`, illetve `/vedelem` vagy `/security` alakot.
- A parancsleírások és a választólisták megnevezései is kétnyelvűek.
- A magyar és angol parancsnevek külön ellenőrzést kaptak, így egyik nyelven sincs névütközés.
- A szerver dashboardján kiválasztott nyelv továbbra is a bot válaszait és paneljeit szabályozza.

## 11.0.7 – External App/Webhook Shield

- Bezárult az a kiskapu, amely miatt a bot- vagy webhook-szerzőként megjelenő felhasználói alkalmazásüzenetek kimaradtak az Automodból.
- A védelem most már az embedek, mezők, képlinkek, mellékletek, select opciók és linkgombok szövegét is átvizsgálja.
- Az egyetlen üzenetbe sűrített ismételt soros, Markdown- és Unicode-karakteráradat az első példánynál felismerhető.
- A nyers `@everyone` és `@here` próbálkozás akkor is blokkolható, ha a Discord mention-feldolgozása elrejti vagy módosítja.
- A rendszer megpróbálja azonosítani és büntetni a felhasználói alkalmazást elindító valódi tagot.
- Jogosulatlan szerver-webhook esetén az üzenet mellett maga a webhook is automatikusan eltávolítható.
- A hivatalos NEXA Support javítása visszakapcsolja az összes fontos üzenet-, webhook-, raid- és Anti-Nuke őrt.

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
