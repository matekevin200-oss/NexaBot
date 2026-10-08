# NEXA Bot 15.5.0 Server Architect Platform

Általános, több szerveren használható Discord management platform. A projekt egy Discord botot, mobilbarát webes dashboardot, külön Owner Centert, PostgreSQL adattárolást, Nexa AI-t, moderációt, Automod/Anti-Nuke védelmet, ticketeket és közösségi rendszereket tartalmaz. Az opcionális RP- és dokumentumrendszert kizárólag a bot tulajdonosa vagy az általa kijelölt Owner-kezelő kapcsolhatja be egy kiválasztott szerveren.

## 15.5.0 újdonságok röviden

- Új, kizárólag az elsődleges `BOT_OWNER_ID` által használható **Server Architect** az Owner Centerben.
- Természetes nyelven leírhatod, milyen Discord-szervert szeretnél; a rendszer rang-, kategória-, csatorna-, jogosultság-, panel- és modul-tervet készít.
- A terv alkalmazás előtt részletes webes előnézetet, darabszámokat és rövid tervazonosítót mutat.
- Az előnézet HMAC-aláírt, a kiválasztott szerverhez és ownerhez kötött, 30 perc után lejár, ezért nem lehet másik szerverre áttenni vagy észrevétlenül módosítani.
- A Server Architect nem kér és nem fogad el tokent vagy API-kulcsot, nem ad `Administrator` jogosultságot, nem hajt végre törlést és nem küld tömeges megjelölést.
- Telepítés előtt ChronoGuard-pillanatképet próbál készíteni, minden futás Owner auditbejegyzést kap, és a kezelt erőforrások Discord-ID-i PostgreSQL-be kerülnek.
- A korábbi terv bármikor biztonságosan újrafuttatható: a rendszer a saját rangjait, kategóriáit és csatornáit javítja/frissíti, a hiányzókat pedig újra létrehozza.
- Új **Owner Recovery Center** szinkronizálja a NEXA-paneleket, illetve javítja a hivatalos Support szervert.
- A CIA-rendszer nem jelenik meg a webes dashboardon vagy az Owner Centerben; telepítése és ellenőrzése kizárólag a botowner Discord-parancsaival érhető el.
- A webes javítás, valamint a Discord telepítőparancsok az elsődleges botownerre vannak korlátozva; a külön felvett Owner-kezelők sem futtathatják.
- Render-újraindítás továbbra sem indít automatikus Discord-telepítést vagy javítást.
- Ha az OpenAI-kulcs nem érhető el, a NEXA ellenőrzött helyi szervertervező sablonnal készít használható tervet, így a funkció nem áll le.
- Új adatbázis-migráció tárolja a tervek hashét, a kezelt erőforrásokat, a végrehajtót és a telepítési összesítést.

## A 15.4.0-ból megtartott fejlesztések

- Visszatért az egységes, egyoldalas szerver-kezelőközpont: az Anti-Nuke, Ticket, Automod és a többi modul nem külön bal oldali menüpontokban van szétszórva.
- Új Azure Command arculat: nyugodt sötétkék, égkék és türkiz színvilág, nagyobb asztali munkaterület, üveghatású kártyák és egyértelmű aktív állapotok.
- Új, kizárólag a fő bot-owner által használható `/cia telepites` rendszer. Egy futással létrehozza a teljes CIA RP rang-, kategória-, csatorna-, jogosultság-, ticket-, szolgálat-, TGF-, dokumentum- és védelmi struktúrát. Nem kell a szerver tulajdonosának lenned: a saját `BOT_OWNER_ID` fiókodnak Rendszergazda jog szükséges.
- A CIA telepítő siker után adatbázis- és Discord-jelzővel végleg lezárja magát az adott szerveren; Render-újraindításkor sem fut újra.
- A `/cia ellenorzes` módosítás nélkül megmutatja a telepítési zárat, a szerkezet teljességét és az esetleges hiányzó elemeket.
- A CIA szerver magyar marad, miközben a vezetői és műveleti szerepkörök a valódi amerikai CIA nyilvános elnevezéseihez igazodnak (D/CIA, DD/CIA, EXDIR, DDO, COS, DCOS, Case Officer, Targeting Officer, Staff Operations Officer és Professional Trainee). Ezek valós vezetői vagy szakmai beosztások, nem kitalált katonai rendfokozatok.
- Már telepített CIA szerveren a fő bot-owner a `/cia rangok-frissitese` paranccsal nevezi át biztonságosan a kezelt rangokat; a csatornák, jogosultságok, panelek és magyar tartalmak megmaradnak.
- A CIA rendszer automatikusan Ultimate hozzáférést, szigorú Anti-Raid/Anti-Nuke védelmet, vak bírálatú 10 kérdéses felvételt és hat részletes CIA iratsablont állít be.
- A vezetői dokumentumjóváhagyást a szerverhez kijelölt dashboard-kezelői rang is használhatja.

### A 15.3.0-ból megtartott fejlesztések

- A 15.3 fizetési, Support Bridge-, nyelvi és adatmegőrzési fejlesztései változatlanul megmaradtak; a korábbi Calm Horizon vizuális réteget az Azure Command arculat váltja fel.
- Az Előfizetés oldal új, háromlépcsős munkafolyamatot, külön szerverválasztót, nagyobb csomagkártyákat, szolgáltatáslistát és lenyitható Stripe-diagnosztikát kapott.
- A fizetési gomb aszinkron, látható állapotú Checkout-indítást használ: siker esetén közvetlenül a Stripe-ra visz, hiba vagy időtúllépés esetén pedig ugyanott megmutatja a pontos okot.
- A biztonsági fejléc most kifejezetten engedélyezi a Stripe Checkout és Customer Portal célcímeket, így a böngésző nem tudja csendben blokkolni az átirányítást.
- A fizetési kártyán nincs több néma, letiltott gomb: hibás Stripe-beállításnál látható magyarázat és a pontos diagnosztikához vezető gomb jelenik meg.
- Checkoutkor csak a kiválasztott ár kerül újraellenőrzésre, a teljes Stripe-diagnosztika pedig négy párhuzamos kéréssel fut.
- A Subscription Center már közvetlenül a Stripe API-n ellenőrzi mind a négy Price ID-t: aktív állapot, ismétlődő ciklus, EUR pénznem, pontos összeg és Test/Live mód.
- A sikeres Checkout visszatérés szerveroldali hitelesítést és azonnali előfizetés-aktiválást végez; nem marad a felhasználó kizárólag a webhook megérkezésére utalva.
- A Checkout Session csak akkor aktiválható, ha a hitelesített Discord-felhasználó, szerver, csomag és számlázási ciklus egymással egyezik.
- Stabil idempotenciakulcs akadályozza meg, hogy dupla kattintás több párhuzamos Checkout Sessiont indítson.
- A Billing oldal külön figyelmeztet, ha nincs tartós PostgreSQL-kapcsolat, mert éles előfizetés memóriatárolással nem fogadható biztonságosan.
- Az Owner Center Stripe-állapota immár élő API-diagnosztikát mutat, nem pusztán a környezeti változók formáját ellenőrzi.
- Discord és web között élő Support ticket-szinkron 1,8 másodperces automatikus frissítéssel.
- Discord Staff gombok: Claim, Pending, Close és Reopen; az állapot a weben automatikusan követi a Discordot.
- Angol az alapértelmezett nyelv új szervereken és a weben; a tartós HU/EN váltó megőrzi az aktuális oldalt és az újabb belépés után is megmarad.
- Az Árak/Pricing rész helyett egységes Előfizetés/Subscriptions felület működik, külön havi/éves Stripe Price ID ellenőrzéssel.
- A Stripe Readiness panel pontosan megmutatja, melyik Render-változó hiányzik vagy hibás anélkül, hogy titkos értéket jelenítene meg.
- Hibás dashboard-beállításnál a kitöltött űrlap megmarad, és a rendszer a hibás mezőhöz görget.
- Az Owner Center hozzáférési modellje változatlanul owner + külön engedélyezett owner-user; a szerverkártyák a szervertulajdonos Discord-nevét is feloldják.
- A hivatalos Support szerver kategóriái számozott sorrendet, javított ticket-célkategóriát és rendezett csatornákat kaptak.
- Új Profile & Language központ mutatja a Discord-identitást, kezelhető szervereket, hozzáférési szintet és a tartós nyelvválasztást.
- A Render újraindítása csak olvasási ellenőrzést végez: nem telepíti újra és nem módosítja automatikusan a Discord-szerver struktúráját.


## Fő funkciók

- szerverenként külön mentett modulok, csatornák, rangok, nyelv és arculat;
- angol alapnyelv új szervereken és a weben, választható magyar felülettel; a szerverenkénti nyelv és slash-command nyelv külön kezelhető;
- Azure Command arculat: PC-re optimalizált sötétkék–égkék–türkiz kezelőközpont, profilmenü, rendezett Owner-szerverlista és kétnyelvű publikus bemutatóoldal élő szerver-, tagszám-, ping-, uptime- és adatbázis-állapottal;
- kétnyelvű Tudásközpont 14 rendszer részletes, gyakorlati magyarázatával: mit csinál, ki használhatja, hol állítható és mi kell hozzá;
- Discord OAuth2 dashboard tulajdonos, admin és egy kijelölt kezelői rang részére;
- külön Owner Center: szerverhálózat, uptime, ping, memória, adatbázis, használat, hibák és audit;
- ChronoGuard Digital Twin: aláírt szerverpillanatképek, magyarázható eltérés- és kockázatelemzés, Incident Capsule export és biztonságos helyreállítás;
- AEGIS Permission DNA: veszélyes jogosultságok, identitásonkénti robbanási sugár, ranghierarchia és elszigetelhetőség elemzése; kriptográfiai bázis és jogosultság-drift az Owner Centerben;
- kereshető, lapozott Owner szerverlista és szerverenkénti részletes állapotlap modul-, csatorna-, rang-, jogosultság-, NEXA Shield-, audit- és hibanézettel;
- owner-kezelők, AI-engedélylista, user/guild blacklist, maintenance és globális modul-vészkapcsoló;
- biztonságos Stripe Checkout és Customer Portal havi/éves Pro és Ultimate előfizetéssel, automatikus aktiválással, lemondással és lejáratkezeléssel;
- Owner által ingyen kiosztható Pro és Ultimate jogosultsági csomagok, megadható lejárattal vagy korlátlan időre;
- Owner-only RP modul: szerverenkénti engedélyezés, TGF, részletes dokumentumpanelek és vezetői jóváhagyás;
- Owner Document Control: az Owner Centerben szerverenként kiválasztható alapértelmezett használati rang, dokumentumtípusonkénti rangfelülírás, kapcsolható ügyszám és Discord-listás személymegjelölés; a felhívások és egyszerű közlemények alapból nem kapnak ügyszámot;
- Workflow Studio: az Owner Centerben saját dokumentum- és ügyiratsablon készíthető legfeljebb öt egyedi kérdéssel, célcsatornával, használati ranggal, pinggel, automatikus ügyszámmal és opcionális vezetői jóváhagyással;
- NEXA TGF Forge: legfeljebb 15 egyedi kérdésből automatikusan többoldalas Discord-jelentkezést készít, külön nyitó-, bírálati és eredménycsatornával, hozzáférési/bírálói/elfogadott ranggal és újraküldési időkorláttal;
- vak bírálat és TGF-időkapszula: a jelentkező személye a döntésig rejtett, a beküldés pedig a sablon pontos verziójával együtt marad meg akkor is, ha később átírod vagy törlöd a sablont;
- NEXA Integrity Pulse: a kitöltöttség, részletesség és ismétlődő válaszminta alapján döntést nem hozó, bírálást segítő minőségjelzés;
- Zero-Form Broadcast: az Owner Centerből kérdések, ügyszám és jóváhagyás nélkül küldhető egyszerű szöveg vagy prémium kártya bármely meglévő csatornába, opcionális biztonságos rangpinggel;
- teljes Owner Shift Operations: aktív és lezárt szolgálatok áttekintése, budapesti idő szerinti javítása, szünetidő-módosítás, rekordtörlés, tagonkénti vagy teljes nullázás kötelező megerősítéssel és audittal;
- ER:LC Bridge: szerverenkénti, AES-256-GCM titkosított Server Key, élő szerver-/játékos-/staff-/queue-nézet és megerősítéshez kötött owner parancskonzol;
- moderációs Case ID és adatbázis: ban, unban, kick, timeout, untimeout, warn, warnings, clearwarns, clear, slowmode, lock, unlock és nick;
- Automod: spam/flood, ismétlés, mass mention, invite, link, scam, tiltott szavak, caps és emoji spam;
- whitelist felhasználó, rang és csatorna szerint;
- az egységes szerver-kezelőközpont Anti-Raid szakaszában állítható érzékenység, naplócsatorna, whitelist és büntetési rend;
- teljes Anti-Nuke: már az első jogosulatlan csatorna-, rang-, jogosultság-, ban/kick/prune- vagy webhookműveletnél azonnali karantén és szerverlezárás;
- Bot-Guard: kizárólag az előre engedélyezett bot-ID maradhat bent; minden más új bot az auditellenőrzés előtt azonnal kirúgásra kerül;
- admin döntésig lezárt raid-riasztás, nyitva maradó döntési csatorna és újraindítás után is használható visszaállítási állapot;
- az egységes szerver-kezelőközpont Ticket szakaszából konfigurálható kategóriás ticketek (segítség, bejelentés, vásárlás, partnerség, egyéb), claim/unclaim, lezárás és automatikus HTML transcript;
- a hivatalos NEXA Support Gateway kizárólag a `1556219615858655254` azonosítójú Support szerveren működik; más szerverek a saját, általános ticketpaneljüket kapják;
- élő, kétirányú Web Support Bridge: a weboldalon beadott segítségkérés privát Discord-ticketet nyit a hivatalos Support szerveren; Discordból Claim/Pending/Close/Reopen kezelhető, a Staff válaszai és az állapotváltozások pedig automatikusan frissülnek a weben kézi újratöltés nélkül;
- welcome/goodbye placeholder, külön ember- és bot-autorang;
- XP, szintek, ranglista, önkiszolgáló rangpanel, ötletek, szavazás, bejelentés és giveaway;
- egykattintásos tagellenőrzőpanel külön ellenőrzött ranggal és auditnaplóval;
- konfigurálható Starboard a legtöbb ⭐ reakciót kapó üzenetek automatikus kiemelésére;
- PostgreSQL-alapú személyes emlékeztetők, amelyek bot-újraindítás után is megmaradnak;
- PostgreSQL-alapú saját `!parancsok`, webes létrehozással;
- Shift Management és ideiglenes hangcsatornák;
- Nexa AI kijelölt csatornában és DM-ben, cooldownnal, korlátozott előzménnyel és beleegyezéses memóriával;
- select menüs `/help` nyolc kategóriával;
- automatikus Discord sharding, korlátozott cache, sweeperek, adatbázis-pool és háttérfeladatok;
- öngyógyító Discord gateway watchdog: tartós kapcsolatvesztésnél szabályos process-újraindítást kér a hostingtól;
- külön liveness/readiness végpont, valós Discord-állapottal, indulási türelmi idővel és adatbázis-állapotjelzéssel;
- PostgreSQL kapcsolat-időkorlát, automatikus állapotellenőrzés és háttérben történő visszacsatlakozás;
- központi error handler, audit-, command-, dashboard- és AI használati napló.
- kétlépcsős Discord interakciós rate limit felhasználó és szerver szerint, automatikus telemetria- és AI-előzménytisztítással;
- External App/Webhook Shield: a felhasználói alkalmazások, webhookok, embedek és linkgombok tartalmában is felismeri a meghívókat, az `@everyone` visszaélést és az együzenetes Unicode-/Markdown-szövegáradatot;
- teljes magyar–angol Discord slash-command lokalizáció: a parancsok, alparancsok, mezők, leírások és választási lehetőségek a felhasználó Discord-nyelvén jelennek meg;
- Owner-only NEXA Support Server Factory: egyetlen parancsból idempotensen létrehozza vagy frissíti a hivatalos támogatási szerver 13 rangját, 7 kategóriáját, teljes csatornaszerkezetét, pontos jogosultságait, ellenőrző-, nyelv- és ticketpaneljeit, valamint kész magyar–angol tájékoztatóit;

## Hivatalos Support szerver kézi telepítése és biztonságos indítása

A parancsot kizárólag a `BOT_OWNER_ID` értékében szereplő elsődleges bot-tulajdonos használhatja, és csak a saját tulajdonú Discord-szerverén.

```text
/support-szerver telepites
/support-szerver panelek
/support-szerver javitas
/support-szerver angolositas
/support-szerver ellenorzes
```

- `telepites`: létrehozza vagy frissíti a teljes rang-, kategória-, csatorna- és jogosultsági rendszert, beállítja a NEXA modulokat, kihelyezi a kész paneleket és korlátlan Ultimate csomagot ad a hivatalos support szervernek;
- `panelek`: újraküldi a bot által kezelt tájékoztatókat és interaktív paneleket;
- `javitas`: helyreállítja a support modulokat, a tagellenőrzést, a rangsorrendet és a paneleket;
- `angolositas`: a meglévő kezelt szervert veszteség nélkül angol alapnyelvre állítja; a magyar nyelv a `🇭🇺 Magyar` ranggal és a `🇭🇺・hungarian-chat` csatornában marad elérhető;
- `ellenorzes`: felsorolja a hiányzó rangokat, kategóriákat és csatornákat.

> **Render-újraindítási védelem:** a bot minden induláskor kizárólag olvasási auditot futtat a hivatalos Support szerveren. Nem hoz létre, nem nevez át és nem töröl rangot, kategóriát, csatornát vagy panelt. Ha hiányt talál, a logban jelzi; módosítás csak a botowner által kézzel futtatott `/support-szerver telepites`, `/support-szerver javitas`, `/support-szerver panelek` vagy `/support-szerver angolositas` paranccsal történik.

A telepítéshez a botnak ideiglenesen `Rendszergazda` jogosultság kell. A Discord Közösség funkció feltételeit a szervertulajdonosnak egyszer kézzel kell elfogadnia.

## Előfizetések és Stripe

A szerver tulajdonosa, adminja vagy kijelölt webes kezelője az **Előfizetés** oldalon indíthat előfizetést. A kártyaadatokat kizárólag a Stripe Checkout kezeli; a NEXA nem látja és nem tárolja őket. A Stripe webhook automatikusan aktiválja, frissíti vagy lejáratja a jogosultságot. Az Owner Centerben ettől függetlenül továbbra is adhatsz ingyenes csomagot.

| Csomag | Havi díj | Éves díj | Elérhető rendszerek |
|---|---:|---:|---|
| Free | 0,00 € | 0,00 € | Moderáció, welcome/autorole, ticket, naplózás, Shift alapfunkció, tagellenőrzés és emlékeztetők |
| Pro | 4,99 € | 49,90 € | Minden Free funkció, Automod, XP, rangpanelek, Starboard, giveaway, custom commands és ideiglenes hangszobák |
| Ultimate | 9,99 € | 99,90 € | Minden Pro funkció, Nexa AI, teljes Anti-Nuke, raid detection, ChronoGuard és automatikus szerverlezárás |

Az Owner által RP-re engedélyezett szerver automatikusan legalább Ultimate hozzáférést kap. A Stripe- és az Owner-ajándékjogosultság egymás mellett megmarad; mindig a magasabb aktív csomag érvényesül.

## Könyvtárstruktúra

```text
src/
  index.js             Discord kliens és automatikus sharding
  runtime.js           gateway watchdog, health állapot és öngyógyító újraindítás
  config.js            PostgreSQL, migrációk, szerver- és owner-beállítás
  dashboard.js         OAuth2 Command Deck, Owner Center, publikus oldalak
  dashboard-theme.js   NEXA Operations felület és reszponzív megjelenés
  server-architect.js  owner-only tervkészítés, aláírt előnézet és ismételhető szerverépítés
  payments.js          Stripe Checkout, Customer Portal, aláírt webhook és előfizetés-szinkron
  applications.js      TGF Forge, vak bírálat, időkapszula és Integrity Pulse
  chronoguard.js        digitális szerveriker, Shadow Scan, incidenskapszula és helyreállítás
  aegis.js              Permission DNA, kockázati térkép és jogosultság-drift
  erlc.js              titkosított ER:LC API-kapcsolat, cache és rate limit
  interactions.js      gombok, select menük, modalok és ticket workflow
  engagement.js        tagellenőrzés, Starboard és tartós emlékeztetők
  moderation.js        slash moderáció és Case ID
  security.js          Automod, raidvédelem és Anti-Nuke
  telemetry.js         használat, audit, hiba és runtime statisztika
  transcripts.js       biztonságos HTML ticket transcript
  custom-commands.js   adatbázisos szerverparancsok
  ai.js                 Nexa AI és adatvédelmi memória
  help.js               interaktív súgó
  support-server.js     Owner-only hivatalos Support szerverépítő és kész panelek
  i18n.js               magyar/angol szervernyelv
```

## Követelmények

- Node.js 22 vagy újabb;
- Discord alkalmazás és bot;
- PostgreSQL adatbázis;
- HTTPS publikus URL az OAuth dashboardhoz;
- opcionálisan OpenAI API-kulcs és aktív API-egyenleg;
- fizetéshez Stripe-fiók, két termék havi és éves EUR Price azonosítóval;
- az ER:LC integrációhoz megvásárolt ER:LC API pack és Server Key.

## Környezeti változók

| Változó | Kötelező | Leírás |
|---|---:|---|
| `DISCORD_TOKEN` | igen | Discord bot token |
| `CLIENT_ID` | igen | Discord Application ID |
| `BOT_OWNER_ID` | Owner Centerhez | A fő bot-tulajdonos Discord user ID-je |
| `DISCORD_CLIENT_SECRET` | webhez | Discord OAuth2 Client Secret |
| `DATABASE_URL` | productionben | PostgreSQL kapcsolat |
| `PUBLIC_URL` | ajánlott | Például `https://nexabot-25vo.onrender.com` |
| `SESSION_SECRET` | ajánlott | Legalább 32 karakteres véletlen titok |
| `CHRONOGUARD_SIGNING_KEY` | ajánlott | Külön, legalább 32 karakteres HMAC-kulcs a pillanatképlánc aláírásához; hiányában a `SESSION_SECRET` használatos |
| `OPENAI_API_KEY` | csak AI-hoz | Kizárólag szerveroldali environment variable |
| `OPENAI_MODEL` | nem | Alapérték: `gpt-5-mini` |
| `STRIPE_SECRET_KEY` | fizetéshez | Stripe szerveroldali standard (`sk_live_...`) vagy korlátozott (`rk_live_...`) éles kulcs; tesztben az ezeknek megfelelő `*_test_...` kulcs |
| `STRIPE_WEBHOOK_SECRET` | fizetéshez | A `/webhooks/stripe` végponthoz tartozó `whsec_...` aláírási titok |
| `STRIPE_PRICE_PRO_MONTHLY` | fizetéshez | Pro havi Stripe Price ID |
| `STRIPE_PRICE_PRO_YEARLY` | fizetéshez | Pro éves Stripe Price ID |
| `STRIPE_PRICE_ULTIMATE_MONTHLY` | fizetéshez | Ultimate havi Stripe Price ID |
| `STRIPE_PRICE_ULTIMATE_YEARLY` | fizetéshez | Ultimate éves Stripe Price ID |
| `STRIPE_AUTOMATIC_TAX` | nem | `true` esetén Stripe Tax, kötelező számlázási cím és adóazonosító-gyűjtés; csak kész Stripe Tax beállítás után kapcsold be |
| `ERLC_ENCRYPTION_KEY` | ER:LC webes mentéshez | Legalább 32 karakter; a szerverenkénti ER:LC kulcsok titkosításához |
| `ERLC_API_KEY` | nem | Opcionális egyetlen környezeti Server Key; csak az `ERLC_GUILD_ID` szerveren használható |
| `ERLC_GUILD_ID` | `ERLC_API_KEY` mellé | A globális Server Key-hez tartozó Discord szerver ID-je |
| `ERLC_PUBLIC_APP_TOKEN` | nem | Hivatalosan regisztrált nyilvános ER:LC alkalmazás Authorization értéke |
| `DB_POOL_MAX` | nem | Pool méret, alapérték 10, maximum 20 |
| `DB_RETRY_MS` | nem | Adatbázis-visszacsatlakozás gyakorisága; alapérték 60 000 ms |
| `DISCORD_MAX_OFFLINE_MS` | nem | Ennyi tartós Discord-kiesés után indul újra a process; alapérték 180 000 ms |
| `STARTUP_GRACE_MS` | nem | Indulási türelmi idő; alapérték 180 000 ms |
| `WATCHDOG_INTERVAL_MS` | nem | Gateway-ellenőrzés gyakorisága; alapérték 15 000 ms |
| `INTERACTION_WINDOW_MS` | nem | Discord interakciós rate limit időablaka; alapérték 10 000 ms |
| `INTERACTION_USER_LIMIT` | nem | Egy felhasználó súlyozott interakciós limitje időablakonként; alapérték 18 |
| `INTERACTION_GUILD_LIMIT` | nem | Egy szerver súlyozott interakciós limitje időablakonként; alapérték 220 |
| `TELEMETRY_RETENTION_DAYS` | nem | Használati események megőrzése; alapérték 90 nap |
| `ERROR_RETENTION_DAYS` | nem | Hibanaplók megőrzése; alapérték 180 nap |
| `AUDIT_RETENTION_DAYS` | nem | Auditnaplók megőrzése; alapérték 365 nap |
| `AI_HISTORY_RETENTION_DAYS` | nem | AI beszélgetési előzmények megőrzése; alapérték 30 nap |
| `SHARD_COUNT` | nem | Kézi shard szám; nélküle automatikus |
| `DATABASE_SSL` | nem | Renderen `true` |
| `PORT` | nem | Render automatikusan beállítja |

Titkos értéket soha ne tölts fel GitHubra, és ne írj `.js`, `.json`, `.yaml` vagy kliensoldali fájlba.

## Stripe beállítása

1. A Stripe Dashboardban hozz létre két terméket: **NEXA Pro** és **NEXA Ultimate**.
2. Mindkettőhöz hozz létre havi és éves, ismétlődő EUR árat a fenti táblázat szerint.
3. A négy `price_...` azonosítót másold a megfelelő Render Environment változóba.
4. A Stripe Developers → Webhooks résznél add hozzá ezt a végpontot:

```text
https://nexabot-25vo.onrender.com/webhooks/stripe
```

5. Események: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`.
6. A webhook `whsec_...` titkát add meg `STRIPE_WEBHOOK_SECRET` néven, a szerveroldali kulcsot pedig `STRIPE_SECRET_KEY` néven.
7. A Stripe Customer Portalban engedélyezd a csomagváltást, fizetési mód módosítását és lemondást.
8. Először tesztkulcsokkal és Stripe tesztkártyával ellenőrizd a teljes folyamatot; élesítéskor minden kulcsot és Price ID-t együtt válts Live módra.
9. Nyisd meg a weben az **Előfizetés** oldalt. Mind a hat Stripe-sornak ellenőrzött állapotot kell mutatnia; a Price soroknál a várt EUR összeg és ciklus is látható.

Elvárt árak: Pro havi **4,99 EUR**, Pro éves **49,90 EUR**, Ultimate havi **9,99 EUR**, Ultimate éves **99,90 EUR**. A NEXA biztonsági okból nem engedi megnyitni a Checkoutot, ha egy Price más összegű, más pénznemű, egyszeri, inaktív vagy a Stripe-kulccsal ellentétes Test/Live módban van.

## Discord Developer Portal

1. Nyisd meg az alkalmazást, majd a **Bot** oldalt.
2. Kapcsold be a **Server Members Intent** és **Message Content Intent** kapcsolót.
3. Az OAuth2 Redirects listába add hozzá:

```text
https://nexabot-25vo.onrender.com/oauth/callback
```

4. Saját domainnél ugyanitt és a `PUBLIC_URL` változóban is az új címet használd.
5. A bot meghívója a dashboard főoldalán található. Nem kér Administrator jogot, csak szükséges részjogosultságokat.

## Helyi indítás és migráció

```bash
npm ci
cp .env.example .env
npm start
```

Az első indítás létrehozza a PostgreSQL táblákat, indexeket és a `nexabot_schema_migrations` nyilvántartást. Adatbázis nélkül fejlesztői memória-fallback működik, de újraindításkor az adatok elvesznek.

Tesztelés:

```bash
npm test
```

## Render telepítés

1. Töltsd fel a projekt gyökerében lévő fájlokat a GitHub repository fő ágára. A ZIP-et ne hagyd a repositoryban.
2. Renderen válaszd a meglévő `nexabot` Web Service-t.
3. Az Environment oldalon add meg a fenti változókat.
4. Build Command: `npm ci`
5. Start Command: `npm start`
6. Health Check Path: `/health`
7. Indíts **Manual Deploy → Deploy latest commit** műveletet.

Az állapotvégpontok:

- `/health/live`: a Node.js folyamat fut-e;
- `/health`: a Discord gateway ténylegesen üzemkész-e. Induláskor rövid türelmi időt ad, tartós kiesésnél `503` választ küld, hogy a hosting újra tudja indítani a szolgáltatást.

> **Folyamatos online állapot:** a `render.yaml` fizetős `0.5c-512mb` compute csomagra van beállítva, ezért nincs Free inaktivitási alvás. A szolgáltató karbantartási újraindításai továbbra is előfordulhatnak; a health check, a szabályos leállítás és a gateway-watchdog automatikusan helyreállítja a folyamatot. Production PostgreSQL használata szükséges ahhoz, hogy az adatok újraindítás után is megmaradjanak.

A sikeres logban ez jelenik meg:

```text
A NEXA Bot 15.5.0 Server Architect Platform használatra kész.
```

## Használat

- `/beallitas`: megnyitja az adott szerver dashboardját;
- `/help`: kategóriás súgó;
- `/chronoguard statusz`, `/chronoguard vizsgalat`, `/chronoguard pillanatkep`: Owner-only digitális iker kezelés;
- `/aegis statusz`, `/aegis vizsgalat`, `/aegis bazis`: Owner-only jogosultsági kockázatelemzés és Permission DNA-bázis;
- `/hitelesites panel`: kihelyezi vagy frissíti a gombos tagellenőrzőpanelt;
- `/emlekezteto letrehozas`: személyes emlékeztetőt készít (`10m`, `2h`, `3d`, `1w` formátum);
- `/emlekezteto lista` és `/emlekezteto torles`: kezeli a saját aktív emlékeztetőket;
- válaszd ki a fő Discord Control Center csatornát, majd ments;
- a szerver nyelve ugyanott állítható `Magyar` vagy `English` értékre;
- a bot mentéskor frissíti a Discord-paneleket;
- Custom Commands: nyisd meg a szerver **Custom Command kezelő** oldalát;
- Owner Center: a `BOT_OWNER_ID` fiókkal belépve automatikusan megnyílik.
- Server Architect: **Owner Center → Szerverek → Server Architect**. Írd le legalább 15 karakterben a kívánt szervert, készíts előnézetet, ellenőrizd a rangokat és csatornákat, majd a `NEXA OWNER` megerősítéssel indítsd el. Javításhoz vagy újrafuttatáshoz ugyanitt használd az utolsó mentett tervet vagy az Owner Recovery Centert.
- Előfizetés: a szerver dashboardján nyisd meg a **Csomag és számlázás** oldalt, válassz csomagot és havi/éves ciklust, majd fejezd be a Stripe Checkoutot. Lemondás vagy kártyamódosítás a **Számlázás és lemondás kezelése** gombbal történik.
- Ingyenes csomag kiosztása: az Owner Centerben válaszd ki a Pro vagy Ultimate csomagot és a lejáratot; az eltávolítás csak az Owner-ajándékot veszi el, a külön Stripe-előfizetést nem.
- RP-rendszer: az Owner Center szerverlistáján nyomd meg az **RP bekapcsolása** gombot. Ezután Discordon a `/telepites` a teljes alap RP-rendszert, a `/dokumentum-panelek` pedig a már meglévő dokumentumcsatornák paneljeit telepíti.
- Dokumentumjogosultság: az Owner Center szerverkártyáján nyisd meg az **Iratvezérlés** oldalt, válaszd ki az **Alapértelmezett használati rangot**, majd ments. Ettől kezdve nem a fix „Operatív állomány”, hanem a kiválasztott rang használhatja a paneleket. Egyes dokumentumtípusokhoz külön rang is megadható.
- Egyedi ügyirat: **Owner Center → szerver → Workflow Studio**. Add meg a kérdéseket, célcsatornát és szabályokat, mentsd, majd nyomd meg a **Panel kihelyezése** gombot.
- Egyedi TGF: **Owner Center → szerver → TGF Forge**. Add meg a kérdéseket soronként; a `?` jellel kezdődő kérdés opcionális. Mentés után használd a **Panel kihelyezése** gombot.
- Kérdés nélküli kiírás: ugyanott, a **Gyors közzététel** részben válassz csatornát és opcionális rangpinget, majd küldd ki a szöveget a bot nevében.
- Szolgálati adatok: **Owner Center → szerver → Szolgálatkezelés**. Itt javítható vagy törölhető egy rekord, és külön megerősítéssel nullázható egy tag vagy a teljes szerver szolgálati előzménye.
- ER:LC: először állítsd be Renderen az `ERLC_ENCRYPTION_KEY` értéket, majd nyisd meg az **Owner Center → szerver → ER:LC Bridge** oldalt, és ott add meg a Server Key-t. A kulcs mentés előtt élőben ellenőrzésre kerül, és utána csak maszkolva látható.
- ChronoGuard: **Owner Center → szerver → ChronoGuard 10.0**. Először készíts bázispillanatképet, jelöld ki a védett rangokat és csatornákat, majd kapcsold be az automatikus megfigyelést. Helyreállítás előtt mindig ellenőrizd a drift-térképet.
- AEGIS: **Owner Center → szerver → Részletes állapot → AEGIS Permission DNA**. Futtass teljes vizsgálatot, rendezd a NEXA fölött lévő kockázatos rangokat, majd rögzíts jóváhagyott bázist.
- Tudásközpont: a publikus felső menü **Tudásközpont** pontja vagy közvetlenül a `/tudaskozpont` útvonal; angolul a `?lang=en` kapcsolóval érhető el.

### Teljes Anti-Raid bekapcsolása

1. Az Owner Centerben adj a szervernek **Ultimate** csomagot. Az Owner által RP-re engedélyezett szerver ezt automatikusan megkapja.
2. A szerver dashboardján kapcsold be a **Védelem** modult.
3. Nyisd meg a szerver **Kezelőközpontját**, majd az **Anti-Raid** résznél válaszd a `minden-log` csatornát, és kapcsold be az összes őrt, az Anti-Nuke-ot és az azonnali szerverlezárást.
4. A Discord **Szerverbeállítások → Rangok** oldalán húzd a NEXA Bot rangját minden más bot és minden általa kezelendő rang fölé.
5. Minden engedélyezett külső bot ID-jét add a **NEXA Bot-Guard** listájához még a meghívása előtt. A listán nem szereplő botot a NEXA azonnal kirúgja.
6. A `/vedelem statusz` paranccsal ellenőrizd a szükséges jogosultságokat és a rangpozíciót.

## Biztonság

- paraméterezett SQL lekérdezések;
- OAuth state, HttpOnly/SameSite/Secure session cookie és CSRF token;
- Content Security Policy, Permissions Policy, cross-origin izoláció, XSS-kódolás, kérésméret-limit, IP- és Discord-interakciós rate limit;
- Discord jogosultság és rangsorrend ellenőrzése;
- a szervertulajdonos, Admin/Vezetőség, külön whitelistelt tagok és engedélyezett bot-ID-k biztonságos kivétele;
- az AI kulcs és Discord token nem jelenik meg a dashboardon vagy logokban;
- az ER:LC Server Key nem kerül a GitHubba vagy a böngészőbe vissza; adatbázisban hitelesített AES-256-GCM titkosítással tárolódik;
- az Owner Center AI-statisztikát mutat, privát beszélgetésszöveget nem.

## Skálázás

A kliens automatikus shardolást támogat, a cache-ek korlátozottak és időszakosan tisztulnak. A PostgreSQL kapcsolat poolt, célzott indexeket és rövid lekérdezéseket használ. Több külön Render példányos horizontális skálázásnál közös Redis-alapú session/cache és külön web worker ajánlott; ez a kiadás egy példányon futtatja a botot és a dashboardot.
