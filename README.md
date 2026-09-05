# NEXA Bot 5.1

Általános, több szerveren használható Discord management platform. A projekt egy Discord botot, mobilbarát webes dashboardot, külön Owner Centert, PostgreSQL adattárolást, Nexa AI-t, moderációt, Automod/Anti-Nuke védelmet, ticketeket és közösségi rendszereket tartalmaz. Az opcionális RP- és dokumentumrendszert kizárólag a bot tulajdonosa vagy az általa kijelölt Owner-kezelő kapcsolhatja be egy kiválasztott szerveren.

## Fő funkciók

- szerverenként külön mentett modulok, csatornák, rangok, nyelv és arculat;
- magyar alapnyelv, szerverenként választható angol Discord-felület;
- professzionális, kétnyelvű publikus bemutatóoldal élő szerver-, tagszám-, ping-, uptime- és adatbázis-állapottal;
- Discord OAuth2 dashboard tulajdonos, admin és egy kijelölt kezelői rang részére;
- külön Owner Center: szerverhálózat, uptime, ping, memória, adatbázis, használat, hibák és audit;
- owner-kezelők, AI-engedélylista, user/guild blacklist, maintenance és globális modul-vészkapcsoló;
- Owner által ingyen kiosztható Free, Pro és Ultimate jogosultsági csomagok, megadható lejárattal vagy korlátlan időre;
- Owner-only RP modul: szerverenkénti engedélyezés, TGF, részletes dokumentumpanelek, vezetői jóváhagyás és automatikus RP-ügyszám;
- moderációs Case ID és adatbázis: ban, unban, kick, timeout, untimeout, warn, warnings, clearwarns, clear, slowmode, lock, unlock és nick;
- Automod: spam/flood, ismétlés, mass mention, invite, link, scam, tiltott szavak, caps és emoji spam;
- whitelist felhasználó, rang és csatorna szerint;
- Anti-Nuke: csatorna/rang létrehozás és törlés, tömeges ban/kick, webhook és jogosultságmódosítás;
- admin döntésig lezárt raid-riasztás és visszaállítási állapot;
- kategóriás ticketek, claim/unclaim, lezárás és automatikus HTML transcript;
- welcome/goodbye placeholder, külön ember- és bot-autorang;
- XP, szintek, ranglista, önkiszolgáló rangpanel, ötletek, szavazás, bejelentés és giveaway;
- PostgreSQL-alapú saját `!parancsok`, webes létrehozással;
- Shift Management és ideiglenes hangcsatornák;
- Nexa AI kijelölt csatornában és DM-ben, cooldownnal, korlátozott előzménnyel és beleegyezéses memóriával;
- select menüs `/help` nyolc kategóriával;
- automatikus Discord sharding, korlátozott cache, sweeperek, adatbázis-pool és háttérfeladatok;
- központi error handler, audit-, command-, dashboard- és AI használati napló.

## Owner által kezelt csomagok

Nincs bankkártyás fizetés és nincs automatikus előfizetés. A szerverek csomagját kizárólag a bot tulajdonosa vagy az általa engedélyezett Owner-kezelő módosíthatja az Owner Centerben.

| Csomag | Elérhető rendszerek |
|---|---|
| Free | Moderáció, welcome/autorole, ticket és részletes naplózás |
| Pro | Minden Free funkció, Automod, XP, rangpanelek, giveaway, custom commands, közösségi és shift modulok |
| Ultimate | Minden Pro funkció, Nexa AI, teljes Anti-Nuke, raid detection és automatikus szerverlezárás |

Az Owner által RP-re engedélyezett szerver automatikusan Ultimate hozzáférést kap. A régi `premium` adatbázis-bejegyzéseket az induló migráció Ultimate csomagra alakítja.

## Könyvtárstruktúra

```text
src/
  index.js             Discord kliens és automatikus sharding
  config.js            PostgreSQL, migrációk, szerver- és owner-beállítás
  dashboard.js         OAuth2 Command Deck, Owner Center, publikus oldalak
  interactions.js      gombok, select menük, modalok és ticket workflow
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
| `DB_POOL_MAX` | nem | Pool méret, alapérték 10, maximum 20 |
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

A sikeres logban ez jelenik meg:

```text
A NEXA Bot 5.1 management platform használatra kész.
```

## Használat

- `/beallitas`: megnyitja az adott szerver dashboardját;
- `/help`: kategóriás súgó;
- válaszd ki a fő Discord Control Center csatornát, majd ments;
- a szerver nyelve ugyanott állítható `Magyar` vagy `English` értékre;
- a bot mentéskor frissíti a Discord-paneleket;
- Custom Commands: nyisd meg a szerver **Custom Command kezelő** oldalát;
- Owner Center: a `BOT_OWNER_ID` fiókkal belépve automatikusan megnyílik.
- Csomag kiosztása: az Owner Center **Ingyenes csomag kiosztása** részében válaszd ki a Pro vagy Ultimate csomagot és a lejáratot; a szerverkártyán egy mozdulattal visszaállítható Free-re.
- RP-rendszer: az Owner Center szerverlistáján nyomd meg az **RP bekapcsolása** gombot. Ezután Discordon a `/telepites` a teljes alap RP-rendszert, a `/dokumentum-panelek` pedig a már meglévő dokumentumcsatornák paneljeit telepíti.

## Biztonság

- paraméterezett SQL lekérdezések;
- OAuth state, HttpOnly/SameSite/Secure session cookie és CSRF token;
- Content Security Policy, XSS-kódolás, kérésméret-limit és IP-alapú rate limit;
- Discord jogosultság és rangsorrend ellenőrzése;
- szervertulajdonos, bot és whitelistelt tagok Anti-Nuke védelme;
- az AI kulcs és Discord token nem jelenik meg a dashboardon vagy logokban;
- az Owner Center AI-statisztikát mutat, privát beszélgetésszöveget nem.

## Skálázás

A kliens automatikus shardolást támogat, a cache-ek korlátozottak és időszakosan tisztulnak. A PostgreSQL kapcsolat poolt, célzott indexeket és rövid lekérdezéseket használ. Több külön Render példányos horizontális skálázásnál közös Redis-alapú session/cache és külön web worker ajánlott; ez a kiadás egy példányon futtatja a botot és a dashboardot.
