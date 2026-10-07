# NEXA Bot 15.4.0 – Azure Command & CIA One-Time Factory

## Mit változtat ez a kiadás?

A szerverbeállítások ismét egyetlen, átlátható **Kezelőközpontban** találhatók. Az Anti-Nuke, Ticket, Automod és más modulok nem foglalnak külön helyet a bal oldali menüben. A részletes szakaszok az oldalon belüli gyorsnavigációval érhetők el.

A web új **Azure Command** arculatot kapott: kellemes sötétkék alap, égkék elsődleges műveletek, türkiz állapotjelzések, nagyobb asztali munkaterület és egyértelműbb kiválasztott állapotok.

## Egyszeri CIA frakciótelepítő

A `/cia telepites` kizárólag akkor fut, ha:

1. a parancsot a `BOT_OWNER_ID` értékében megadott elsődleges bot-owner használja;
2. a Discord-szerver tényleges tulajdonosa ugyanaz a személy;
3. a NEXA Bot rendelkezik `Rendszergazda` jogosultsággal és megfelelő rangpozícióval;
4. az adott szerveren még nem történt sikeres CIA-telepítés.

A telepítő létrehozza:

- a CIA teljes ranghierarchiáját és jogosultságait;
- 12 rendezett, célzott hozzáférésű kategóriát;
- a nyilvános beléptető-, belső, kiképzési, műveleti, hírszerzési, adminisztrációs, ellenőrzési és igazgatósági csatornákat;
- gombos ellenőrzést, értesítési rangokat, CIA ticketet, szolgálati és moderációs panelt;
- 10 kérdéses, vak bírálatú CIA felvételi folyamatot;
- műveleti, hírszerzési, kiképzési, szabadság-, fegyelmi és előléptetési dokumentumokat;
- Ultimate hozzáférést és szigorú Anti-Raid/Anti-Nuke alapbeállítást.

## Egyszeri működés és újraindítási biztonság

A végleges zár csak a teljes telepítés és a panelek sikeres kihelyezése után aktiválódik. Ekkor a rendszer:

- az adatbázisban menti a telepítési rekordot és az erőforrás-azonosítókat;
- a Discordon külön telepítési jelzőt helyez el;
- minden későbbi `/cia telepites` kérést elutasít;
- Render- vagy bot-újraindításkor nem telepít újra semmit.

Ha a folyamat a végleges zár előtt hibával megszakad, a hiba javítása után biztonságosan újraindítható. A `/cia ellenorzes` parancs módosítás nélkül felsorolja a hiányzó elemeket.

## Frissítés

1. Töltsd fel a csomag gyökérfájljait a GitHub repository gyökerébe.
2. Ne tölts fel valódi `.env` fájlt vagy titkos kulcsot; csak a `.env.example` minta kerülhet GitHubra.
3. Várd meg a Render sikeres automatikus deployját.
4. Ellenőrizd a logban a `NEXA Bot 15.4.0 Azure Command Platform használatra kész.` sort.
5. A saját CIA szervereden először futtasd a `/cia ellenorzes`, majd a `/cia telepites` parancsot.

## Ellenőrzés

- `node --check index.js`
- `npm test`

A kiadás 26 automatikus teszttel ellenőrzi a fizetést, a Support Bridge-et, a webes kezelőközpontot, a nyelveket, az Owner-hozzáférést, valamint a CIA telepítő owner-only és egyszeri működését.
