# NEXA Bot 7.0 Operations Platform

Általános, több szerveren használható Discord management platform. A projekt egy Discord botot, mobilbarát webes dashboardot, külön Owner Centert, PostgreSQL adattárolást, Nexa AI-t, moderációt, Automod/Anti-Nuke védelmet, ticketeket és közösségi rendszereket tartalmaz. Az opcionális RP- és dokumentumrendszert kizárólag a bot tulajdonosa vagy az általa kijelölt Owner-kezelő kapcsolhatja be egy kiválasztott szerveren.

## Fő funkciók

- szerverenként külön mentett modulok, csatornák, rangok, nyelv és arculat;
- magyar alapnyelv, szerverenként választható angol Discord-felület;
- professzionális, kétnyelvű publikus bemutatóoldal élő szerver-, tagszám-, ping-, uptime- és adatbázis-állapottal;
- Discord OAuth2 dashboard tulajdonos, admin és egy kijelölt kezelői rang részére;
- külön Owner Center: szerverhálózat, uptime, ping, memória, adatbázis, használat, hibák és audit;
- kereshető, lapozott Owner szerverlista és szerverenkénti részletes állapotlap modul-, csatorna-, rang-, jogosultság-, NEXA Shield-, audit- és hibanézettel;
- owner-kezelők, AI-engedélylista, user/guild blacklist, maintenance és globális modul-vészkapcsoló;
- Owner által ingyen kiosztható Free, Pro és Ultimate jogosultsági csomagok, megadható lejárattal vagy korlátlan időre;
- Owner-only RP modul: szerverenkénti engedélyezés, TGF, részletes dokumentumpanelek és vezetői jóváhagyás;
- Owner Document Control: az Owner Centerben szerverenként kiválasztható alapértelmezett használati rang, dokumentumtípusonkénti rangfelülírás, kapcsolható ügyszám és Discord-listás személymegjelölés; a felhívások és egyszerű közlemények alapból nem kapnak ügyszámot;
- Workflow Studio: az Owner Centerben saját dokumentum- és ügyiratsablon készíthető legfeljebb öt egyedi kérdéssel, célcsatornával, használati ranggal, pinggel, automatikus ügyszámmal és opcionális vezetői jóváhagyással;
- teljes Owner Shift Operations: aktív és lezárt szolgálatok áttekintése, budapesti idő szerinti javítása, szünetidő-módosítás, rekordtörlés, tagonkénti vagy teljes nullázás kötelező megerősítéssel és audittal;
- ER:LC Bridge: szerverenkénti, AES-256-GCM titkosított Server Key, élő szerver-/játékos-/staff-/queue-nézet és megerősítéshez kötött owner parancskonzol;
- moderációs Case ID és adatbázis: ban, unban, kick, timeout, untimeout, warn, warnings, clearwarns, clear, slowmode, lock, unlock és nick;
- Automod: spam/flood, ismétlés, mass mention, invite, link, scam, tiltott szavak, caps és emoji spam;
- whitelist felhasználó, rang és csatorna szerint;
- külön webes Anti-Raid irányítóközpont érzékenység-, csatorna-, whitelist- és büntetésbeállítással;
- teljes Anti-Nuke: már az első jogosulatlan csatorna-, rang-, jogosultság-, ban/kick/prune- vagy webhookműveletnél azonnali karantén és szerverlezárás;
- Bot-Guard: kizárólag az előre engedélyezett bot-ID maradhat bent; minden más új bot az auditellenőrzés előtt azonnal kirúgásra kerül;
- admin döntésig lezárt raid-riasztás, nyitva maradó döntési csatorna és újraindítás után is használható visszaállítási állapot;
- kategóriás ticketek, claim/unclaim, lezárás és automatikus HTML transcript;
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

## Owner által kezelt csomagok

Nincs bankkártyás fizetés és nincs automatikus előfizetés. A szerverek csomagját kizárólag a bot tulajdonosa vagy az általa engedélyezett Owner-kezelő módosíthatja az Owner Centerben.

| Csomag | Elérhető rendszerek |
|---|---|
| Free | Moderáció, welcome/autorole, ticket, naplózás, gombos tagellenőrzés és tartós emlékeztetők |
| Pro | Minden Free funkció, Automod, XP, rangpanelek, Starboard, giveaway, custom commands, közösségi és shift modulok |
| Ultimate | Minden Pro funkció, Nexa AI, teljes Anti-Nuke, raid detection és automatikus szerverlezárás |

Az Owner által RP-re engedélyezett szerver automatikusan Ultimate hozzáférést kap. A régi `premium` adatbázis-bejegyzéseket az induló migráció Ultimate csomagra alakítja.

## Könyvtárstruktúra

```text
src/
  index.js             Discord kliens és automatikus sharding
  runtime.js           gateway watchdog, health állapot és öngyógyító újraindítás
  config.js            PostgreSQL, migrációk, szerver- és owner-beállítás
  dashboard.js         OAuth2 Command Deck, Owner Center, publikus oldalak
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
  i18n.js               magyar/angol szervernyelv
```

## Követelmények

- Node.js 22 vagy újabb;
- Discord alkalmazás és bot;
- PostgreSQL adatbázis;
- HTTPS publikus URL az OAuth dashboardhoz;
- opcionálisan OpenAI API-kulcs és aktív API-egyenleg.
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
| `OPENAI_API_KEY` | csak AI-hoz | Kizárólag szerveroldali environment variable |
| `OPENAI_MODEL` | nem | Alapérték: `gpt-5-mini` |
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
A NEXA Bot 7.0 operations platform használatra kész.
```

## Használat

- `/beallitas`: megnyitja az adott szerver dashboardját;
- `/help`: kategóriás súgó;
- `/hitelesites panel`: kihelyezi vagy frissíti a gombos tagellenőrzőpanelt;
- `/emlekezteto letrehozas`: személyes emlékeztetőt készít (`10m`, `2h`, `3d`, `1w` formátum);
- `/emlekezteto lista` és `/emlekezteto torles`: kezeli a saját aktív emlékeztetőket;
- válaszd ki a fő Discord Control Center csatornát, majd ments;
- a szerver nyelve ugyanott állítható `Magyar` vagy `English` értékre;
- a bot mentéskor frissíti a Discord-paneleket;
- Custom Commands: nyisd meg a szerver **Custom Command kezelő** oldalát;
- Owner Center: a `BOT_OWNER_ID` fiókkal belépve automatikusan megnyílik.
- Csomag kiosztása: az Owner Center **Ingyenes csomag kiosztása** részében válaszd ki a Pro vagy Ultimate csomagot és a lejáratot; a szerverkártyán egy mozdulattal visszaállítható Free-re.
- RP-rendszer: az Owner Center szerverlistáján nyomd meg az **RP bekapcsolása** gombot. Ezután Discordon a `/telepites` a teljes alap RP-rendszert, a `/dokumentum-panelek` pedig a már meglévő dokumentumcsatornák paneljeit telepíti.
- Dokumentumjogosultság: az Owner Center szerverkártyáján nyisd meg az **Iratvezérlés** oldalt, válaszd ki az **Alapértelmezett használati rangot**, majd ments. Ettől kezdve nem a fix „Operatív állomány”, hanem a kiválasztott rang használhatja a paneleket. Egyes dokumentumtípusokhoz külön rang is megadható.
- Egyedi ügyirat: **Owner Center → szerver → Workflow Studio**. Add meg a kérdéseket, célcsatornát és szabályokat, mentsd, majd nyomd meg a **Panel kihelyezése** gombot.
- Szolgálati adatok: **Owner Center → szerver → Szolgálatkezelés**. Itt javítható vagy törölhető egy rekord, és külön megerősítéssel nullázható egy tag vagy a teljes szerver szolgálati előzménye.
- ER:LC: először állítsd be Renderen az `ERLC_ENCRYPTION_KEY` értéket, majd nyisd meg az **Owner Center → szerver → ER:LC Bridge** oldalt, és ott add meg a Server Key-t. A kulcs mentés előtt élőben ellenőrzésre kerül, és utána csak maszkolva látható.

### Teljes Anti-Raid bekapcsolása

1. Az Owner Centerben adj a szervernek **Ultimate** csomagot. Az Owner által RP-re engedélyezett szerver ezt automatikusan megkapja.
2. A szerver dashboardján kapcsold be a **Védelem** modult.
3. A **Külön Anti-Raid irányítóközpontban** válaszd a `minden-log` csatornát, és kapcsold be az összes őrt, az Anti-Nuke-ot és az azonnali szerverlezárást.
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
