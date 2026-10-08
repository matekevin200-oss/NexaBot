# NEXA Bot 20.0.0 – NEXA OS Studio

Ez a kiadás a meglévő NEXA Bot biztonságos, production használatra szánt továbbfejlesztése. A korábbi moderációs, Anti-Nuke, ticket, Support Bridge, Stripe, közösségi, AI, RP és owner funkciók megmaradtak.

## Legfontosabb újdonságok

- Owner-only **NEXA OS Studio** szervertervező és telepítő.
- Nyolc blueprint: Smart Detect, Community, Gaming, Creator, Support, Clan, Business és Agency.
- Tizenhárom kapcsolható modul: ticket, verification, moderation, security, levels, events, applications, shift, voice, suggestions, reaction roles, giveaway és AI.
- Helyi tervezőmotor: nincs OpenAI-hívás, nincs AI-kreditigény.
- **Digital Twin**: pontos create/update előnézet, jogosultság-ellenőrzés, készenléti pontszám és garantált zero-delete terv.
- HMAC-aláírt, szerverhez és elsődleges ownerhez kötött, 30 percig érvényes terv.
- Telepítési előzmény, audit, kezelt erőforrások és Owner Recovery Center.
- Angol alapértelmezett web, választható magyar felület; az Owner Center mindig magyar.
- Szerverenkénti slash-command mód: Automatikus, Magyar vagy English.
- Újratervezett Platform 20 bemutatóoldal élő rendszertérképpel, moduláris képességmátrixszal és valóban reszponzív kártyarendszerrel.

## Biztonsági szabályok

- A Studio kizárólag a `BOT_OWNER_ID` felhasználónak érhető el.
- Nem fogad el Discord tokent, API-kulcsot vagy más titkot a leírásban.
- Nem ad `Administrator` jogosultságot.
- Nem töröl Discord-rangot, kategóriát vagy csatornát.
- Végrehajtás előtt a botnak `Manage Roles` és `Manage Channels` jogosultság kell.
- Render-újraindítás nem futtat telepítést, javítást vagy szerkezetmódosítást.

## Frissítés GitHubon és Renderen

1. Csomagold ki a ZIP-et a számítógépeden.
2. A projektfájlokat töltsd fel a GitHub repository gyökerébe. Magát a ZIP-et és saját `.env` fájlt ne tölts fel.
3. Várd meg az automatikus Render deployt, vagy válaszd a **Manual Deploy → Deploy latest commit** lehetőséget.
4. Ellenőrizd a Render logban ezt a sort:

```text
A NEXA Bot 20.0.0 NEXA OS Studio Platform használatra kész.
```

5. Nyisd meg az **Owner Center → Szerver → NEXA OS Studio** oldalt, készíts Digital Twin tervet, majd csak az előnézet ellenőrzése után telepíts.

## Ellenőrzött állapot

- JavaScript szintaxisellenőrzés: sikeres.
- Automatikus tesztek: 38/38 sikeres.
- A csomag nem tartalmaz valódi `.env` fájlt vagy beégetett Discord/OpenAI/Stripe titkot.
