# Belv MDT • NEXA Bot 20.2.0

Robloxon belüli, magyar MDT-panel az Emergency Hamburg RP-hez. A panelből Belv-bejegyzéseket tölthetsz ki; a NEXA bot menti őket PostgreSQL-be, és a beállított Discord-csatornába küldi. Az MDT kizárólag a **fő botowner Discord-fiókjával** és az **Owner Centerben hozzáadott Roblox-ID-kkel** használható.

## Beállítás

1. A ZIP projektfájljait tedd a NEXA GitHub/Render projektjébe, majd indíts új deployt. A meglévő környezeti változókat tartsd meg.
2. Ellenőrizd, hogy a `BOT_OWNER_ID` a saját Discord-fiókod ID-je. Az MDT-hez működő `DATABASE_URL` és HTTPS NEXA-webcím kell. A webcím a `PUBLIC_URL` vagy a Render `RENDER_EXTERNAL_URL` értékéből származik. Új Discord-token vagy webhook nem kell.
3. A NEXA weben jelentkezz be a fő owner fiókoddal. **Owner Center → a Belv-szerver kártyája → Belv MDT.** A közvetlen oldal: a saját NEXA-webcímed után `/owner/mdt`. Válaszd ki a Belv-szervert.
4. Add hozzá a saját **Roblox User ID-det**. Ez a profilod címében a `/users/` és a `/profile` közötti szám. Példa: `https://www.roblox.com/users/123456789/profile` → `123456789`. Több saját fiókot külön sorba írj; legfeljebb 10 adható hozzá.
5. Válassz alapértelmezett Discord-célcsatornát és ellenőrzési csatornát. Szükség esetén a személy-, jármű-, ügy-, körözés-, szolgálat- és feljegyzéstípusokhoz külön csatorna is választható.
6. Kapcsold be az MDT-t, és kattints a **MDT-beállítások mentése** gombra.
7. Ugyanezen az oldalon kattints a **Saját Belv MDT script letöltése** gombra. Ez a fájl már tartalmazza a saját NEXA-webcímedet, a Belv-szerver ID-jét és a felvett Roblox-ID-ket. Belépőkódot vagy bot-tokent nem tartalmaz.
8. A Belv Discord-szerveren kérj személyes kódot: `/mdt belepes`. A parancshoz Discordon adminjog is kell a zárolt parancsláthatóság miatt, de a bot külön ellenőrzi, hogy te vagy-e a fő botowner.
9. Az Emergency Hamburg kliensében futtasd az Owner Centerből letöltött Luau-scriptet a használni kívánt, `request` HTTP-funkciót biztosító környezetben. A belépőképernyőn add meg a Discordon kapott kódot.
10. A panelt az **F6** billentyűvel vagy a **BELV MDT** képernyőgombbal nyithatod meg és rejtheted el.

A ZIP `roblox/Belv-MDT-Emergency-Hamburg.lua` fájlja a konfigurálatlan forrás. Alapállapotban senkit sem enged be. Használatra az Owner Centerben letöltött, a fiókodhoz beállított fájl való.

## Mit kezel a panel?

| Oldal | Tartalom | Közzététel |
| --- | --- | --- |
| Ügyiratok | Tárgy, érintettek, időpont/helyszín, tényállás, bizonyíték | Előbb owner jóváhagyás |
| Körözések | RP-személy/jármű, indok, prioritás, érvényesség | Előbb owner jóváhagyás |
| Személyek | Roblox-felhasználónév, RP-név, RP-státusz, megjegyzés | Közvetlen |
| Járművek | Rendszám, típus, RP-tulajdonos, RP-státusz, megjegyzés | Közvetlen |
| Szolgálati napló | Időtartam, egység, résztvevők, tevékenység, esemény | Közvetlen |
| Belv-iratsablonok | A NEXA meglévő alap- és saját dokumentuműrlapjai | Az eredeti sablon jóváhagyási igénye szerint |
| Feljegyzések | Cím, tartalom, kapcsolódó ügy/hivatkozás | Közvetlen |

A Belv-iratsablonok között megjelenhet például szolgálati jelentés, állománytag-adatlap, fegyelmi irat, belső vizsgálat, előléptetés, szabadságigénylés és saját dokumentumtípus. A sablon célcsatornájának léteznie kell, és azt a Discord-fiókodnak látnia kell. A sablonok saját NEXA-célcsatornáit használjuk; a bot nem hoz létre új csatornákat.

A rendszer az **MDT-n keresztül beküldött új iratokat** tartja nyilván. A régi Discord-üzeneteket nem importálja automatikusan. Egy körözés lezárását neked kell rögzítened; az érvényesség mező szöveges RP-adat.

## Használat és jóváhagyás

Válassz irattípust, majd kattints az **Új irat** gombra. A csillagos mezők kötelezők. Beküldés után az MDT megmutatja az iratazonosítót és a Discord-bejegyzés linkjét.

A jóváhagyást kérő irat az ellenőrzési Discord-csatornába kerül. Fő ownerként a panelből vagy a Discord-bejegyzés **Jóváhagyás / Elutasítás** gombjával dönthetsz. Előtte nem kerül a végleges célcsatornába.

A közvetlenül közzétett nyilvántartások szerkeszthetők; a NEXA ugyanazt a Discord-üzenetet frissíti. A már jóváhagyott irat tartalma nem írható át: javításhoz új bejegyzést készíts. A **Lezárás** archiválja az iratot, az adatbázisban és Discordon megőrzi. A lezárt irat nem szerkeszthető.

Ha két ablakból eltérő változatot mentenél, az MDT frissítést kér, és nem írja felül észrevétlenül a másik változatot. A kereső a címben és az űrlapszövegben keres; 50 találat után a **További iratok** gombbal lapozhatsz.

## Ki láthatja és használhatja?

- A teljes MDT és a hozzá tartozó Owner Center-oldal csak a `BOT_OWNER_ID` fő Discord-fiók számára hozzáférhető. Delegált owner, szervertulaj vagy más admin nem kap MDT-jogot.
- A letöltött script már a felület létrehozása előtt ellenőrzi a Roblox `LocalPlayer.UserId` értékét. A panel a saját `PlayerGui` felületeden jelenik meg; más játékosok képernyőjére nem kerül.
- A NEXA minden kérésnél ellenőrzi a fő owner Discord-fiókot és az adott munkamenethez tartozó, továbbra is engedélyezett Roblox-ID-t. Egy ID törlése után a következő kérés tiltást ad, és a panel eltünteti a megjelenített iratokat.
- A kliens által küldött Roblox-ID önmagában nem hiteles Roblox-bejelentkezés. A tényleges hozzáférést a fő owner Discordon, privát üzenetként kapott egyszeri kódja is védi. A kódot ne oszd meg.
- A Discordra közzétett iratokat a célcsatorna meglévő Discord-jogosultságai szabályozzák. A panel személyes hozzáférése nem teszi priváttá a Belv nyilvános Discord-csatornáit.

Az egyszeri belépőkód 10 percig érvényes, a munkamenet legfeljebb 6 órás. Új belépéskor a korábbi saját munkamenet visszavonódik. A `/mdt kijelentkezes` vagy az Owner Center **Minden saját MDT-belépés visszavonása** gombja visszavonja a kódokat és munkameneteket. A tokenek csak a kliens memóriájában maradnak; a szerver a titkos kódok és tokenek lenyomatát tárolja.

## Hiba esetén

| Üzenet / helyzet | Teendő |
| --- | --- |
| Nem jelenik meg a panel, Roblox-ID nincs hozzáadva | Add hozzá az ID-t az Owner Centerben, ments, és onnan töltsd le újra a scriptet. |
| Nincs `/mdt` parancs vagy Belv MDT gomb | Ellenőrizd, hogy a 20.2.0 botverzió fut. Indítsd újra a botot, és a fő owner fiókkal jelentkezz be. |
| Hibás, lejárt vagy felhasznált kód | Új kód: `/mdt belepes`. A panelhez beállított Belv-szerveren kérd. |
| PostgreSQL szükséges / szolgáltatás nem érhető el | Ellenőrizd a Render `DATABASE_URL` beállítását és az adatbázis működését. Nincs átmeneti, elvesző álmentés. |
| A környezet nem ad HTTP request funkciót | A panel nem tud a bothoz kapcsolódni ebben a futtatókörnyezetben. |
| Hiányzó bot-csatornajog | A bot lássa a cél- és ellenőrzési csatornát, küldhessen üzenetet és embedet, olvashassa az előzményeket. |
| Az irat megvan, de Discord-küldés sikertelen | Javítsd a csatornajogot, majd az irat adatlapján válaszd az **Újraküldés** gombot. |
| Hálózati hiba beküldéskor | Az űrlap megmarad. Az újrapróbálás ugyanazt a beküldésazonosítót használja, hogy ne keletkezzen két irat. |
| Az irat időközben módosult | Frissítsd a listát, nyisd meg a jelenlegi adatlapot, és abból szerkessz. |

## Ellenőrzés és korlátok

66 Node-teszt sikeres, köztük 18 MDT-futási próba. További 7 emulált Roblox-kliensfolyamat ellenőrzi az ID-korlátozást, a belépést, az űrlap beküldését, a szerkesztést, az újrafuttatást, a hozzáférés visszavonását és a hálózati újrapróbálást. A JavaScript és a Lua szintaxisellenőrzése sikeres.

Élő Emergency Hamburgban vagy Xeno alatt nem futott próba, és ebben a beszélgetésben nem történt Render-telepítés. A script a rendelkezésre álló `request`, `http_request`, `Xeno.request` vagy `http.request` funkcióval kapcsolódik a saját NEXA API-hoz. Nem használ játékbeli szerveres RemoteEventeket, és az Emergency Hamburg járműveit, rendőri intézkedéseit, pénzét vagy más játékállapotát nem kezeli; az RP-adatokat kézzel töltöd ki.

## Fejlesztői ellenőrzés

Bot: `npm test`, szintaxis: `node --check index.js`. A headless Lua-ellenőrzés valódi Roblox helyett emulált UI- és HTTP-jelzésekkel fut: `lua test/roblox-mdt-headless.test.lua roblox/Belv-MDT-Emergency-Hamburg.lua` (Lua 5.4).

Adattáblák: `nexabot_mdt_settings`, `nexabot_mdt_codes`, `nexabot_mdt_sessions`, `nexabot_mdt_records`. A bot induláskor hozza létre őket. A bejegyzések szerverenként elkülönülnek, módosításkor verzióellenőrzés védi őket. Az API kizárólag `/api/mdt/v1/...` útvonalon, a fő owner személyes munkamenetével írhat.
