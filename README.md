# NexaBot 3.1

Professzionális, több szerveres Discord-bot modern webes vezérlőpulttal. A zenei modul szándékosan nincs benne.

## Fő rendszerek

- szerverenként kapcsolható modulok és saját arculat;
- spam-, raid-, link-, meghívó-, frissfiók- és jogosulatlanbot-védelem;
- tagválasztós moderáció: figyelmeztetés, felfüggesztés, kirúgás, kitiltás, rang és becenév;
- privát segítségkérő ticketek;
- üdvözlés, búcsúzás és automatikus rang;
- XP, szintek és ranglista;
- önkiszolgáló rangpanel;
- ötletek, szavazások, botként közzétett bejelentések és nyereményjátékok;
- automatikusan létrejövő és kiürüléskor törlődő hangcsatornák;
- Shift Management: szolgálat, szünet, napló, heti/havi statisztika és ranglista;
- Nexa AI szervermemóriával és külön engedélyhez kötött személyes memóriával;
- teljes, gombos Discord Control Center, ezért az alapfunkciókhoz nem kell parancsot beírni;
- kijelölhető AI-csatorna, ahol a bot a normál üzenetekre válaszol;
- elkülönített privát Nexa AI-beszélgetés a bot közvetlen üzeneteiben;
- teljes RP jelentkezési, ügyintézési és dokumentumrendszer a kijelölt fő RP-szerveren.

## Webes Control Center

A `/beallitas` parancs nyitja meg az adott szerver kezelőoldalát. Beléphet:

- a szerver tulajdonosa;
- az adminisztrátor;
- a webpanelen kiválasztott egy kezelői rang.

A vezérlőpulton módosítható:

- minden modul állapota;
- napló-, panel-, közösségi-, szolgálati- és hangcsatornák;
- Staff, autorang, webes kezelői és szolgálati rang;
- legfeljebb 10 önkiszolgáló rang;
- üdvözlő-, búcsúzó-, szintlépési és ticketszöveg;
- XP erőssége és időkorlátja;
- AI-memória, memóriahatár és szerverutasítás;
- védelem érzékenysége és büntetései;
- a vezérlőpult neve, két fő színe és logója.

A **NexaBot fő vezérlőpanel** csatorna mentésekor a bot automatikusan kihelyezi vagy frissíti a Discord-panelt. Az **Nexa AI beszélgetőcsatornában** minden nem-bot szöveges üzenetre válaszol. A panel AI-gombjáról kérdés, személyes memória és privát AI is indítható.

## Tartalék Discord-parancsok

A fő funkciók a gombos panelről használhatók. A parancsok visszafelé kompatibilis tartalékként megmaradtak:

- `/beallitas` – webes Control Center;
- `/vedelem statusz|feloldas` – védelmi állapot és raidlezárás feloldása;
- `/nexa kerdes|dokumentum|emlekezz|memoria|felejts|beleegyezes` – AI, szövegkészítés és memória;
- `/szolgalat panel|statisztika|ranglista|szabadsag|beosztas` – szolgálatkezelés;
- `/szint`, `/szint-ranglista` – XP-rendszer;
- `/otlet`, `/szavazas`, `/bejelentes`, `/rangpanel`, `/nyeremenyjatek` – közösségi funkciók;
- `/telepites`, `/dokumentum-panelek` – a kijelölt fő RP-szerveren.

## Render környezeti változók

Kötelező:

- `DISCORD_TOKEN` – Discord-bot token;
- `CLIENT_ID` – Discord Application ID;
- `GUILD_ID` – a teljes RP-rendszert használó fő Discord-szerver ID-je;
- `DISCORD_CLIENT_SECRET` – Discord OAuth2 Client Secret;
- `DATABASE_URL` – Render PostgreSQL belső kapcsolati címe.

Az AI bekapcsolásához:

- `OPENAI_API_KEY` – az OpenAI API-kulcs;
- `OPENAI_MODEL` – alapérték: `gpt-5-mini`.

Opcionális:

- `PUBLIC_URL` – például `https://nexabot-25vo.onrender.com`;
- `DATABASE_SSL` – Renderen `true`;
- `PORT` – Render automatikusan megadja.

Titkos értéket soha ne tölts fel GitHubra és ne küldj el Discordon. Az OpenAI API használata külön, felhasználás alapú költséggel járhat.

## Discord Developer Portal

A **Bot → Privileged Gateway Intents** résznél kapcsold be:

- Server Members Intent;
- Message Content Intent.

Az OAuth2 Redirect URL:

`https://nexabot-25vo.onrender.com/oauth/callback`

Saját domain esetén ezt és a `PUBLIC_URL` értékét is módosítani kell.

## Telepítés

```bash
npm ci
npm start
```

A csomag Node.js 22 vagy újabb verziót használ. A `render.yaml` közvetlen Render Blueprint-telepítést támogat.

## AI-adatvédelem

- A személyes memória alapból csak a felhasználó külön beleegyezése után használható; ez az AI-panelen gombbal be- és kikapcsolható.
- A beleegyezés visszavonásakor a bot törli a személyes emlékeket és beszélgetési előzményeket.
- A szervermemóriát csak Staff kezelheti, teljes törlését csak admin végezheti.
- Token, jelszó, API-kulcs és hasonló titkos adat nem menthető memóriába.
- Az AI funkció szerverenként bármikor kikapcsolható.
- A privát AI nem olvassa és nem keveri össze a különböző Discord-szerverek memóriáit.
