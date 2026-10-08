# NEXA Bot 15.5.0 — Server Architect

## Legfontosabb újdonság

Az Owner Center új **Server Architect** modulja természetes nyelvű leírásból teljes Discord-szervertervet készít. A terv rangokat, kategóriákat, szöveges és hangcsatornákat, jogosultságokat, információs paneleket és NEXA-modulokat tartalmazhat.

## Használat

1. Jelentkezz be a weboldalon a `BOT_OWNER_ID` Discord-fiókkal.
2. Nyisd meg az **Owner Center → Szerverek** részt.
3. A kívánt szerverkártyán kattints a **Server Architect** gombra.
4. Írd le részletesen a kívánt szervert, válassz nyelvet és méretet.
5. Készíts előnézetet, majd ellenőrizd a teljes tervet.
6. Írd be pontosan: `NEXA OWNER`.
7. Indítsd el a biztonságos telepítést.

## Biztonság

- Kizárólag az elsődleges `BOT_OWNER_ID` fér hozzá; delegált Owner-kezelő nem.
- A terv szerverhez és ownerhez kötött HMAC-aláírást kap, és 30 perc után lejár.
- A tervező nem használ `Administrator` jogosultságot.
- Nem töröl rangot, kategóriát vagy csatornát.
- Nem enged tokent vagy API-kulcsot a leírásban.
- Telepítés előtt ChronoGuard-pillanatképet próbál készíteni.
- Minden tervezés, telepítés és javítás bekerül az Owner auditnaplóba.

## Ismételt futtatás és javítás

A legutóbbi mentett terv újra alkalmazható. A NEXA a korábban mentett Discord-ID-k alapján frissíti a saját erőforrásait, és újra létrehozza a hiányzó elemeket. A Recovery Center ezen felül:

- szinkronizálja a normál NEXA-paneleket;
- javítja vagy hiány esetén újraépíti a hivatalos Support szervert.

A CIA-rendszer nem része a webes dashboardnak vagy az Owner Centernek. A telepítés és az ellenőrzés kizárólag az elsődleges botowner Discord-parancsaival érhető el.

A helyreállításhoz pontosan ezt kell beírni: `OWNER JAVÍTÁS`.

## Adatbázis

Az új `nexabot_architect_deployments` tábla tárolja a terv hashét, a promptot, a jóváhagyott tervet, a kezelt erőforrások Discord-ID-it, a végrehajtó owner ID-jét és az eredmény összesítését. A migráció automatikusan lefut induláskor.

## Render

Render-újraindításkor sem a Server Architect, sem a CIA-telepítés, sem a Support-helyreállítás nem indul el automatikusan. Minden Discord-struktúrát módosító művelethez kézi owner-jóváhagyás szükséges.
