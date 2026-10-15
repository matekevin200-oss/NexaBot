# NEXA Bot 22.1.0 — MDT Network

Az MDT web a meglévő NEXA bot **Render-szolgáltatásán belül**, a `/mdt-web` útvonalon működik. A NEXA web MDT Network menüpontja ide vezet. Külön szolgáltatás nem szükséges.

A Renderhez igazított kód és az ellenőrzés elkészült. Az élő Render-telepítés még nem történt meg: a Render-kapcsolat előbb a munkaterület kiválasztását kéri. A jelenleg elérhető munkaterület neve My Workspace.

## 1. A bot frissítése

1. Mentsd el a jelenlegi `index.js` fájlodat.
2. A letöltött frissítésből cseréld le a bot **`index.js`** fájlját. A frissítési ZIP csak ezt az egy fájlt tartalmazza.
3. Indítsd újra / telepítsd újra a jelenlegi botodat a megszokott módon. Ehhez nincs szükség új ChatGPT-bővítményre.
4. A meglévő környezeti változókat és adatbázist tartsd meg. Indításkor a bot hozzáadja az új MDT-táblákat; nem törli az eddigi iratokat, ticketeket vagy szerverbeállításokat.
5. Lépj be a **meglévő NEXA webre** a fő owner Discord-fiókjával, majd kattints az **MDT Network** menüpontra. Ez a külön webet a helyes botcímmel nyitja meg.

Ha a ZIP nem tölthető le, használd az `index.js` közvetlen letöltését, vagy az azonos tartalmú `NEXA-Render-index.txt` fájlt. A TXT-t a bothoz **`index.js`** névre kell átnevezni. Ez a botkód; a Roblox-klienshez a bot külön generál betöltőkódot.

A webcím a bot meglévő Render-címe + **`/mdt-web`**. A kapcsolat automatikusan a jelenlegi szolgáltatást használja; külön webcímet nem kell megadni. A Discord OAuth továbbra is a meglévő `/oauth/callback` végpontra tér vissza. Ha korábban külön MDT_WEB_URL értéket adtál meg, ez a változat a saját NEXA Render-címét használja.

A meglévő Node környezetet használja: Node.js 22 vagy újabb, `discord.js` 14.27.0, `dotenv` és `pg`. Új éles csomag nem került bele. A teljes forrásmentés tartalmazza a csomagfájlokat is.

## 2. Kizárólag az öt megadott szerver

| Munkaterület | Discord szerver-ID |
|---|---|
| Belv | `1517509643734221030` |
| FBI | `1520397344829603871` |
| ARFK | `1479777567702777889` |
| TEK | `1526575205475156099` |
| CIA | `1557420697968578690` |

Az MDT telepítése és szerverhez kapcsolása más ID-val elutasításra kerül. A NEXA Support szerver nem MDT-frakció; a közös segélykérések továbbra is a meglévő Support rendszeren keresztül működnek.

**Telepítést, csatornakiosztást és vezetőségi jelszót csak az elsődleges `BOT_OWNER_ID` állíthat.** Delegált Owner Center-hozzáférés, Discord-adminjog vagy vezetőségi rang nem ad MDT-telepítési jogot.

## 3. Frakció aktiválása — fő owner

A külön weben: **Kapcsolatok → Owner / engedélyezett frakciók → Csatornák / telepítés**.

1. A bot és a fő owner legyen tag a kiválasztott Discord-szerveren.
2. A bot lekéri a szerver aktuális szöveges csatornáit és rangjait. A korábbi MDT-kiosztást és a CIA-telepítés mentett célcsatornáit is figyelembe veszi.
3. Válaszd ki az alapcsatornát, a **privát bírálati csatornát**, valamint az irattípusok céljait. Két egyformán felismerhető csatorna esetén kézi kijelölés kell.
4. Jelöld ki a valódi vezetőségi Discord-rangokat. A rendszer minden tagkezelésnél friss szerverjogosultságot ellenőriz.
5. Ha hiányoznak MDT-szobák, válaszd a **Hiányzó MDT-szobák létrehozása** lehetőséget. A meglévő csatornákat újra használja; nem nevez át vagy töröl szerveres szobákat és rangokat, és nem takarítja ki más üzeneteit.
6. Állíts be **legalább 12 karakteres** vezetőségi jelszót, majd ments.
7. Ismételd meg a szükséges frakcióknál.

A `/mdt telepites` parancs is fő owner számára engedélyezett, és az engedélyezett frakción pótolja a hiányzó MDT-szobákat. A vezetőségi jelszót és a pontos célkiosztást a weben kezeld.

A csatornafelismerés nem importálja automatikusan a régi Discord-beszélgetéseket az adatbázisba. A jóváhagyásra váró irat privát bírálati csatornába kerülhet; nem esik vissza általános célcsatornára. A korábbi CIA / frakciós aktaszobák jogosultságait a hálózati tagfelvétel nem nyitja meg automatikusan. A bot az általa létrehozott MDT-szobákon adhat célzott hozzáférést, és a korábban kezelt Belv MDT-szobák hozzáférési körét is megőrzi.

A meglévő frakciós iratsablonok megjelenítése külön bekapcsolható. Ezek a hozzájuk tartozó Discord-csatornajogok szerint érhetők el. A fő owner a NEXA **Rendszerellenőrzés** oldalán mind az öt frakció kapcsolatát és célcsatornáit látja.

## 4. Állománytag hozzáadása — vezetőség vagy fő owner

1. Discorddal jelentkezz be az MDT weben.
2. A bal felső munkaterület-választóban válaszd a **saját frakciódat**.
3. Nyisd meg az **Állomány** oldalt.
4. Vezetőként kattints a **Vezetőségi feloldás** gombra, és add meg a frakció jelszavát. A fő owner külön feloldás nélkül kezelhet.
5. A **Tag hozzáadása** űrlapon írd be a személy **Discord felhasználó-ID-jét**, beosztását és szükség esetén a saját Roblox-ID-it.
6. Az illető legyen valódi emberi tag ezen a Discord-szerveren. Legfeljebb 5 Roblox-ID tartozhat hozzá.
7. Külön kijelölheted ügyirat-jóváhagyónak.

**A jelszó önmagában nem ad vezetőségi jogot.** Ellenőrzött vezetőségi Discord-jogosultság is szükséges. A feloldás 15 percig tart. A rang elvesztése vagy a jelszó lecserélése megszünteti a kezelési jogosultságot.

Roblox-ID nélkül webes MDT-tagság adható. Játékbeli belépőkódhoz már jóváhagyott saját Roblox-ID kell. Egy Roblox-ID másik Discord-fiókhoz nem rendelhető; ugyanaz a Discord–Roblox fiókpár több engedélyezett frakcióban is szerepelhet.

A visszavonás megszünteti a frakciós MDT-tagságot és törli az adott frakció személyes játékbeli kódjait / munkameneteit. A saját közös RP-profil és más frakcióhoz tartozó jogosultság külön marad. Vezetőségi jogot adó Discord-rang esetén annak szerveres visszavonása is szükséges a vezetőségi jogosultság megszüntetéséhez.

## 5. Közös RP-karakterprofilok

Minden Discorddal bejelentkező felhasználó készíthet saját fiktív RP-profilt a **Karakterprofilok → Új karakter** oldalon. Egyszerre legfeljebb 5 aktív karakter tartozhat egy fiókhoz.

RP-név, születési dátum, megnevezés, állampolgárság, lakcím, telefonszám, foglalkozás, Roblox-felhasználónév és karaktertörténet adható meg. Kizárólag szerepjátékos adatokat írj bele.

- **Közösségi profil:** a bejelentkezett felhasználók kereshetik és megnyithatják.
- **Privát profil:** a profilgazda és a fő owner láthatja.
- Más karakterét átírni a profilgazda vagy a fő owner tudja.
- A módosítás ellenőrzi az adatlap verzióját, hogy két nyitott szerkesztés ne írja felül egymást.

A frakciós ügyiratok az adott munkaterülethez tartoznak. Az FBI-tagság nem ad CIA- vagy TEK-iratolvasást.

## 6. RP-személyik kiadása

A regisztrált frakciós állománytag a saját munkaterületén **RP-igazolványok → Igazolvány kiadása** alatt más játékos közösségi RP-karakteréhez is kiadhat személyit. Kiválaszthatja a karaktert, vagy megadhatja annak nyilvántartási ID-jét.

A kártya kap:

- egyedi `RP-…` azonosítót;
- kiállító frakciót és ügyintézőt;
- kiadáskori, változatlan karakteradatokat;
- érvényességi dátumot;
- visszavonási állapotot és indokot;
- nyomtatható nézetet és letölthető SVG-kártyát.

A kártya jól láthatóan **fiktív RP-igazolvány**, nem hatósági okmány. A profil későbbi szerkesztése nem módosítja a már kiadott kártyát. A kiadó vagy jogosult frakciós vezetőség visszavonhatja. A kijelölt Discord-célba a bot is elküldi; sikertelen küldés után az igazolvány megmarad és újraküldhető.

## 7. Ügyiratok és közös RP-körözések

Személyek, járművek, ügyiratok, körözések, szolgálati bejegyzések, előállítások, RP-bírságok, bizonyítékok, műveletek és feljegyzések érhetők el. Az owner kapcsolhatja az irattípusokat és a jóváhagyási szabályokat; a vezetőség / kijelölt ellenőr bírálhat a választott szabály szerint.

A létrehozó, a vezetőség és a kijelölt ellenőr a jogosultsága szerint látja a várakozó iratot. A frakció többi tagja a közzétett iratokat olvashatja. Szerkesztés, előzmények, bírálat, archiválás és Discord-újraküldés külön művelet. A jóváhagyott, bírálatköteles irat nem írható át utólag; módosításhoz új irat készülhet.

A **Közös központ → Körözések** csak a közzétett és **külön megosztott** RP-körözéseket mutatja. Belső megjegyzések nem kerülnek a közös nézetbe. Archiváláskor a bejegyzés eltűnik az aktív közös listából.

A mentés megmarad Discord-kieséskor is. Az **Újraküldés** az aktuális állapotot küldi, és a tárolt üzenetet frissíti. Az ismételt beküldés ugyanazzal a kérésazonosítóval nem készít új iratot vagy igazolványt.

## 8. Közös segélykérés

**Segítségkérés → Új segítségkérés**. Tárgy, kategória és részletes leírás után a meglévő NEXA Support rendszerben jön létre a ticket. A NEXA web, az MDT web és a bot ugyanazt a beszélgetést használja.

A felhasználó saját ticketjeit és a neki látható üzeneteket követheti, válaszolhat és lezárt ticketet értékelhet a beállított szabályok szerint. Belső staff-jegyzet nem kerül az ügyfél nézetébe. A fő owner a korábbi Support Operations teljes kezelőfelületét is használhatja.

A Support szerver szüneteltetett moderációját ez a frissítés nem kapcsolja vissza. A régi Crown RP parancsok kivezetése és a korábbi CIA-telepítési védelem megmarad.

## 9. Roblox / Xeno — MDT Network 4.0

1. A vezetőség párosítsa a saját Discord-ID-det és Roblox-ID-det a megfelelő frakcióban.
2. Ugyanazon a Discord-szerveren kérd a **`/mdt script`** személyes betöltőkódját.
3. A bot által adott teljes egysoros kódot futtasd a kliens HTTP-kéréseket támogató környezetében.
4. Kérj **`/mdt belepes`** kódot, és írd be a saját játékbeli panelbe. A kód egyszer használható, időkorlátos és saját fiókpárhoz kötött.
5. **F6:** panel megjelenítése / elrejtése.

A panelben a korábbi nyilvántartások mellett közös RP-karakterprofilok, RP-igazolványok, megosztott RP-körözések, NEXA segélykérés és a külön web elérése is van. A betöltő a frakcióhoz kötött; más szerver ID-jével nem ad hozzáférést. A betöltőlink önmagában nem helyettesíti a személyes kódot.

A játékoskereső a nyilvános Roblox-profilt és a játékban látható adatokat használja. A játék körözésjelzése a megnyitott, felismerhető játékfelületből olvasható; hiányzó jelzésnél ismeretlent mutat. A saját RP-körözés felvétele nem módosítja a játék állapotát. A script nem tartalmaz bot-tokent vagy Discord-webhook titkot.

## 10. Ellenőrzés és ismert üzembe helyezési feltételek

A kiadásban **90 automatizált teszt sikeres**, tényleges PostgreSQL-motorral (PGlite) és szimulált Discord-válaszokkal. Az ellenőrzések vizsgálják az öt szerverkorlátot, a fő owner kizárólagos telepítési jogát, a vezetőségi feloldást, a profilok és frakciók adatelkülönítését, a személyik változatlan adatlapját és visszavonását, a mentési ütközéseket, a Discord-kiesést / párhuzamos újraküldést, a közös RP-körözést, a ticketeket és a meglévő Discord OAuthon keresztüli egyszeri belépési átadást.

Az 54 beépített modul és a teljes `index.js` szintaktikailag ellenőrizve lett. A Lua 5.4 szintaxisellenőrzés, valamint a web statikus fájl-, űrlapazonosító- és kliensszintaxis-ellenőrzése sikeres. A Renderhez igazított kód szintaxisa és a saját szolgáltatáson belüli belépési útvonal ellenőrizve lett. A Renderre történő éles feltöltés még hátravan.

**Élő Discord-, valódi Discord-bejelentkezés-, böngészős megjelenés- és Roblox/Xeno-próba ebben a környezetben nem történt.** A jelenlegi bot futtatási hitelesítő adataihoz nincs hozzáférés. Ezeket a tényleges botfrissítés után a saját fiókkal kell ellenőrizni. Bot-tokent és Discord-kliens titkot ne írj az MDT űrlapjaiba vagy a játékbeli scriptbe; a meglévő szerveres környezeti változókban maradjanak.

Az OAuth ugyanazt a meglévő NEXA `/oauth/callback` visszatérési címet használja. Az ugyanazon Renderen működő MDT webhez nem kell új Discord OAuth-alkalmazás. A web akkor tud kapcsolódni, ha a bot HTTPS-en elérhető, az adatbázis működik, és a frissítés elindult.

## 22.1 · Rendvédelmi adatközpont
- Központi kereső RP-karakter, személy, rendszám, ügyirat és körözés alapján.
- Önálló személy-, jármű-, műveleti és szolgálati nézet; ugyanazokat a mentett iratokat használják, mint a bot.
- Frakciós áttekintés tényleges, jogosultság alapján szűrt számlálókkal és legutóbbi iratokkal. A közös rész nem jeleníti meg más frakció belső ügyeit.
- Kapcsolatok → Teljes rendszerellenőrzés: csak a fő botowner látja. Megmutatja az öt szerver csatornáit, jogosultságait, beállításait és a sikertelen Discord-küldések számát. Az ellenőrzés nem hoz létre és nem módosít csatornát.
- A kapcsolatfrissítés vendégként is újrakéri a hálózat állapotát. Hibás HTML/JSON, időtúllépés és szerverhiba nem mutat sikeres kapcsolatot.
- A megjelenés saját NEXA-felület. A Galaxy RP zárt paneljéről nem állt rendelkezésre ellenőrzött kép vagy forráskód.
- A körözések RP-bejegyzések; nincs automatikus Emergency Hamburg-adatkinyerés. Az élő Roblox-próba külön ellenőrzés.
