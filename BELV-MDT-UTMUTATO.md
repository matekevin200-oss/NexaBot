# Belv MDT • NEXA Bot 20.2.2

Magyar, személyes MDT-panel az Emergency Hamburg RP-hez. A bot csak a hiányzó MDT-csatornákat hozza létre a kiválasztott Belv-szerveren. A panelben játékost kereshetsz, a saját MDT-iratokat lekérheted és bővítheted, valamint a megnyitott játékbeli rendőrségi telefonlista körözési színjelzését olvashatod. Az MDT kizárólag a **fő botowner Discord-fiókjával** és az **Owner Centerben felvett Roblox-ID-kkel** használható.

## Indítás

1. A ZIP projektfájljait frissítsd a NEXA GitHub/Render projektjében, majd indíts új deployt. A meglévő környezeti változókat tartsd meg.
2. A `BOT_OWNER_ID` a saját fő Discord-fiókod ID-je legyen. Működő `DATABASE_URL` és HTTPS NEXA-webcím kell: `PUBLIC_URL` vagy Renderen `RENDER_EXTERNAL_URL`. Új token vagy webhook nem szükséges.
3. A NEXA weben lépj be a fő owner fiókoddal: **Owner Center → Belv-szerver → Belv MDT**. Közvetlenül a saját NEXA-webcímed után `/owner/mdt` is megnyitható.
4. Add hozzá a saját **Roblox User ID-det**. A profilcímben a `/users/` és `/profile` közötti szám: `https://www.roblox.com/users/123456789/profile` → `123456789`. Legfeljebb 10 saját fiók vehető fel, külön sorokban.
5. Kattints a **Hiányzó csatornák létrehozása és MDT indítása** gombra. A bot menti a megadott ID-ket, létrehozza a hiányzó szobákat, hozzárendeli a célcsatornákat és bekapcsolja az MDT-t. Ha meglévő szobát szeretnél célként használni, előtte válaszd ki a megfelelő listából.
6. Az **Egysoros MDT-betöltő** mezőből másold le az egyetlen `loadstring(game:HttpGet("…"))()` sort. Discordon a **`/mdt script`** is privát válaszban adja meg ugyanezt a kész sort. Az **Egysoros betöltő letöltése** gomb ezt `.lua` fájlként adja. A **Betöltő és teljes script megnyitása** oldalon a teljes panelkód is megmaradt, ha azt szeretnéd másolni.
7. A Belv Discord-szerveren kérj személyes, privát belépőkódot: `/mdt belepes`. A zárolt Discord-parancs láthatóságához adminjog vagy külön parancsengedély szükséges; a bot ezen felül a fő `BOT_OWNER_ID` fiókot is ellenőrzi.
8. Az Emergency Hamburg kliensében másold az egysoros betöltőt Xeno-ba, majd futtasd. Ehhez `loadstring`, `game:HttpGet` és a panel botkapcsolatához `request` HTTP-funkció kell. A panelben add meg a személyes Discord-kódot. Nyitás és elrejtés: **F6** vagy **BELV MDT**. Az egysoros indítást emulált Roblox-környezetben ellenőriztük; élő Xeno-próba nem történt.

A külön átadott `Belv-MDT-Emergency-Hamburg.lua` és a ZIP azonos nevű `roblox/` forrásfájlja üres konfigurációval indul, ezért senkinek sem hoz létre panelt. **A saját, használatra beállított kód az Owner Centerben vagy a `/mdt script` paranccsal készül.** A teljes kód kézi másolása esetén Roblox-ID módosítása után újra kell másolni. Az egysoros betöltő minden indításkor az aktuális ID-listával tölti le a panelt; ugyanaz a sor botújraindítás után is használható.

## Egysoros betöltő és visszavonás

A bot a saját HTTPS-webcímére mutató, egyedi betöltőlinket készít. Nem kell más scriptoldal címét, bot-tokent vagy belépőkódot beleírnod. A kész sor a saját szerveredhez tartozó panelt tölti be.

Az Owner Centerben a **Régi betöltőlink visszavonása és új készítése** gomb érvényteleníti a korábbi sort. Ezután másold az új sort, vagy kérd le újra: `/mdt script`. A betöltőlink visszavonása a már bejelentkezett panelt nem zárja be; a személyes hozzáférés visszavonásához a **Minden saját MDT-belépés visszavonása** gomb vagy `/mdt kijelentkezes` szükséges.

A betöltőlink csak a felület kódját és a beállított Roblox-ID-ket szolgálja ki. Önmagában nem ad hozzáférést az MDT-adatokhoz. Az MDT kikapcsolása, az ID-lista kiürítése, a fő owner cseréje vagy a Discord-tagság elvesztése után a régi link nem tölti be a panelt. A linket tartsd magadnál, és visszavonhatod, ha máshoz kerül.

## A hiányzó Discord-szobák

A kategória neve **BELV • MDT**. Legfeljebb nyolc szöveges csatorna készül:

| Csatorna | Feladat |
| --- | --- |
| `mdt-iratok` | Alapértelmezett nyilvántartás |
| `mdt-ellenorzes` | A fő owner jóváhagyására váró iratok |
| `mdt-szemelyek` | Saját RP-személyadatok |
| `mdt-jarmuvek` | Saját RP-járműadatok |
| `mdt-ugyiratok` | Jóváhagyott ügyiratok |
| `mdt-korozesek` | Saját, jóváhagyott RP-körözések |
| `mdt-szolgalati-naplo` | Szolgálati bejegyzések |
| `mdt-feljegyzesek` | Belső feljegyzések |

A már kiválasztott, létező célcsatorna megmarad. Ha nincs ilyen, a bot az azonos nevű meglévő szobát használja, és csak ennek hiányában készít újat. **Meglévő csatornát nem nevez át, nem mozgat, nem töröl, nem módosítja a témáját vagy jogosultságait, és a telepítés során nem küld vagy szerkeszt üzenetet.** Meglévő ranghoz sem nyúl. Ha az azonos nevű csatorna nem megfelelő típusú vagy több is van belőle, megáll és egyértelmű célcsatorna kiválasztását kéri.

Az új kategória és az új szobák külön jogosultságot kapnak: `@everyone` nem láthatja, a fő owner és a bot láthatja. A Discord szervertulajdonosa és Administrator-jogosultságú tagjai a Discord szabályai szerint hozzáférhetnek privát szobákhoz; ez nem ad nekik MDT-paneljogot. A már meglévő szoba jogosultságát a bot nem változtatja meg.

Létrehozáshoz a botnak **Csatornák kezelése** jog kell. A célcsatornákban szükséges a látás, üzenetküldés, embedküldés és előzményolvasás is. Hiányzó jogosultságnál a telepítő hibát jelez; nem állít át meglévő csatornajogot.

A telepítés kézzel újrafuttatható az Owner Center gombjával vagy a mentett Roblox-ID-k megadása után `/mdt telepites` paranccsal. Teljes készültségnél nem készít új másolatot. Félbeszakadt futás után a már létrejött szobákat újra használja. Adatbázis-zárolás védi két botfolyamat egyidejű telepítését. Bot- vagy Render-újraindítás nem hoz létre Discord-csatornát automatikusan.

## Játékoskereső és adatfelvitel

A **Játékoskereső** az aktuális Roblox-szerver játékosait listázza. Kereshetsz felhasználónévvel, megjelenített névvel vagy Roblox-ID-vel. Pontos felhasználónév vagy ID megadásával a **Profil lekérése** gomb olyan nyilvános Roblox-profilt is feloldhat, aki nincs a jelenlegi szerverben. A megjelenített név nem egyedi azonosító; az iratok összekapcsolásának alapja a Roblox-ID.

Az adatlapon látszik a felhasználónév, ID, Roblox-profil linkje, jelenlegi szerverben a csapat és az elérhető játékbeli körözésjelzés. A saját MDT személy-, körözés- és ügyiratai külön listában jelennek meg.

- **+ Személyadat:** új RP-adatlap; a felhasználónév és Roblox-ID előre kitöltve. Az RP-név, státusz és megjegyzés szerkeszthető.
- **+ MDT-körözés:** saját RP-körözési irat; az érintett neve és ID-je kitöltve. Indokot, prioritást és érvényességet neked kell megadnod. Vezetői jóváhagyásra kerül.
- **+ Ügyirat:** saját RP-ügyirat az érintett nevével és ID-jével. Beküldés után jóváhagyásra kerül.

A lekérdezés pontos Roblox-ID alapján kapcsolja össze a bejegyzéseket. Régi, ID nélküli személyadatot vagy körözést pontos felhasználónév alapján is megmutathat, **[csak névegyezés]** jelöléssel. Egy másik Roblox-ID-hez rögzített irat nem kerül a személyhez puszta névegyezés miatt. Csak a jelenlegi Belv Discord-szerverhez és elérhető célcsatornákhoz tartozó MDT-iratok jelennek meg. Ötven találat után a **További iratok** gomb lapoz.

Az MDT-n kívüli régi Discord-üzeneteket nem importálja automatikusan. Az új adatok a saját MDT-adatbázisba és a kiválasztott Discord-csatornába kerülnek. Személyadat vagy MDT-körözés felvitele nem állítja át a játék valódi körözési rendszerét.

## A játék szerinti körözésjelzés

Az Emergency Hamburg leírása szerint a rendőrségi telefonalkalmazás az aktuális szerver játékosait mutatja: piros név jelzi a körözött játékost, fehér név a körözés nélküli játékost. A panel ezt a megjelenített jelzést olvassa.

1. A játékban rendőrként nyisd meg a telefon **rendőrségi alkalmazásának játékoslistáját**.
2. Az MDT-ben nyisd meg a **Játék körözései** oldalt.
3. Kattints a **Lista kapcsolása** gombra.
4. A listából válaszd ki a rendőrségi névlista felületét. A felületútvonal és a felismert nevek segítenek. Olyan sort válassz, amelynek nevei egyeznek a játék telefonjának listájával. A chat vagy Roblox játékoslista színe nem körözési jelzés.
5. A panel külön számolja a piros jelzésűeket, a fehér jelzésűeket és az ismeretlen állapotúakat. A körözési oldalon a piros jelzésű és az ismeretlen állapotú játékosok szerepelnek; a játékoskeresőben minden csatlakozott játékos.

A játékforrás olvasása körülbelül ötmásodpercenként frissül, amikor a panel látható; az owner-hozzáférés harminc másodpercenként újra ellenőrződik. A forrás és az olvasás ideje szerepel a panelben. Telefonbezárás, eltűnt felület, nem felismert név/szín, offline játékos vagy ellentmondó piros/fehér jelzés esetén az állapot **ismeretlen**. Az ismeretlen nem jelent körözésmentességet. A játékban ellenőrizhető rendőrségi adatlap marad az elsődleges forrás.

A játék felületének belső neveit és elrendezését nem sikerült élő játékban ellenőrizni, ezért a kapcsolatot a saját kliensedben kell kiválasztani. A panel csak a rendőrségi felületen elérhető nevekből és alap szövegszínből olvas; egyedi RichText-színezést nem találgat. Más felületszerkezetnél vagy megjelenített név helyett nem felismerhető címkénél ismeretlen állapotot jelez. Nem kérdez le elrejtett szerveradatot, és nem hív játékbeli RemoteEventet.

A körözés szintjét, a bűncselekmények felsorolását és az EH járműadatait ez a színjelzés nem tartalmazza; ezeket a játék saját rendőrségi adatlapján ellenőrizheted, majd szükség esetén saját RP-iratba feljegyezheted.

A **MDT-körözések** menüpont a saját RP-nyilvántartásod. Az **Összes / jóváhagyott** gomb vált a teljes lista és a jóváhagyott, le nem zárt iratok között. Az érvényesség szöveges RP-mező; a lejáratot és a lezárást neked kell kezelni.

## Iratok és jóváhagyás

| Oldal | Tartalom | Közzététel |
| --- | --- | --- |
| Ügyiratok | Tárgy, érintettek, Roblox-ID, helyszín, tényállás, bizonyíték | Owner jóváhagyás után |
| MDT-körözések | Érintett, Roblox-ID, indok, prioritás, érvényesség | Owner jóváhagyás után |
| Személyek | Felhasználónév, Roblox-ID, RP-név, státusz, megjegyzés | Közvetlen |
| Járművek | Rendszám, típus, RP-tulajdonos, státusz, megjegyzés | Közvetlen |
| Szolgálati napló | Időtartam, egység, résztvevők, tevékenység | Közvetlen |
| Belv-iratsablonok | A NEXA meglévő alap- és saját dokumentuműrlapjai | A sablon szabálya szerint |
| Feljegyzések | Cím, tartalom, kapcsolódó ügy/hivatkozás | Közvetlen |

Az **Új irat** gomb kitölthető űrlapot nyit. A csillagos mezők kötelezők. Beküldés után megjelenik az irat azonosítója és Discord-linkje. A Belv-iratsablonok saját, korábban beállított NEXA-célcsatornájukat használják; a telepítő ezek meglévő csatornáját nem módosítja, és új egyedi sabloncsatornát nem készít.

A jóváhagyásra váró irat az ellenőrzési csatornában marad, amíg a fő owner a panelben vagy Discordon a **Jóváhagyás / Elutasítás** gombbal nem dönt. A jóváhagyott irat tartalma nem írható át; javításhoz új irat készíthető. Közvetlenül közzétett személy- és más nyilvántartás szerkeszthető, a bot ugyanazt a hozzá tartozó MDT-üzenetet frissíti. Ez rendes iratkezelés; a csatornatelepítő maga meglévő üzenetet nem módosít.

A **Lezárás** archivál, az irat és Discord-bejegyzése megmarad. Verzióellenőrzés védi a párhuzamos módosításokat. Hálózati újrapróbálás azonos, változatlan űrlapnál ugyanazt a beküldésazonosítót használja. Sikertelen Discord-küldés után az adatlap **Újraküldés** gombja külön próbálja a közzétételt.

## Személyes hozzáférés

- Csak a fő `BOT_OWNER_ID` használhatja a teljes MDT-t, a konfigurációt, telepítést és a scriptoldalt. Más admin, szervertulaj vagy delegált owner nem kap MDT-jogot.
- A script a felület létrehozása előtt ellenőrzi a `LocalPlayer.UserId` értékét. A panel a saját `PlayerGui` felületeden jelenik meg, más játékosok képernyőjére nem kerül.
- A bot minden API-kérésben frissen ellenőrzi a fő owner Discord-fiókját, az engedélyezett Roblox-ID-t és a szerverhez tartozó munkamenetet. ID-törlés vagy belépésvisszavonás után a következő kérés lezárja és kiüríti az MDT-t.
- A kliens által küldött Roblox-ID nem hiteles Roblox OAuth-bejelentkezés. A tényleges hozzáférést a fő owner Discordon kapott személyes kódja is védi. Egy ID hozzáadása önmagában nem ad MDT-belépést. Ha más felvett fióknak átadod a személyes kódot, a te fő owner-jogoddal használhatja az MDT-t. Ha csak te használhatod, kizárólag a saját ID-idet add hozzá, és a személyes kódot tartsd magadnál.
- A személyes kód tíz percig, egyszer használható; a munkamenet legfeljebb hatórás. Új bejelentkezés a korábbi saját munkamenetet visszavonja. A titkos token csak a kliens memóriájában van, az adatbázis lenyomatot tárol.

Kijelentkezés: `/mdt kijelentkezes`, a panel **Kijelentkezés** gombja vagy az Owner Center **Minden saját MDT-belépés visszavonása** gombja.

## Hiba esetén

| Helyzet | Teendő |
| --- | --- |
| Roblox-ID nincs felvéve / nincs panel | Owner Centerben add hozzá a saját ID-t, mentsd, majd futtasd újra a betöltőt. Teljes kód kézi másolásakor másold le újra a saját scriptet. |
| Nincs `/mdt script` vagy egysoros betöltő | Ellenőrizd, hogy a 20.2.2 botverzió fut és a fő owner fiókkal léptél be. |
| Régi vagy érvénytelen betöltőlink | Kérj új saját sort: `/mdt script`. Ellenőrizd, hogy a linket nem vontad vissza és az MDT be van kapcsolva. |
| A betöltő HTTP-hibát jelez | Ellenőrizd a bot HTTPS-webcímét, működő adatbázisát és a fő owner Discord-tagságát. Ismételt letöltések után várj egy percet. |
| Hiányzik a csatornalétrehozási jog | A botnak Csatornák kezelése jog kell. A meglévő csatornákat a telepítő nem javítja át. |
| Már folyamatban van a telepítés | A futó telepítés végét várd meg. Megszakadt botfolyamat zárolása legfeljebb öt perc után lejár. |
| Több azonos nevű MDT-szoba van | A megfelelő célcsatornát válaszd ki az Owner Centerben, majd futtasd újra. |
| Játék körözése ismeretlen | A játék rendőrségi telefonlistája legyen megnyitva és kiválasztva. A hiányzó adatot az MDT nem találgatja. |
| Nem található egy személy irata | Ellenőrizd az irat Roblox-ID-jét. Régi, MDT-n kívüli Discord-üzenet nincs automatikusan importálva. |
| Hibás vagy lejárt személyes kód | Új kód: `/mdt belepes`, a panelhez kiválasztott Belv-szerveren. |
| PostgreSQL / NEXA nem érhető el | Ellenőrizd a Render naplót, HTTPS-webcímet és `DATABASE_URL` beállítást. |
| Nincs HTTP request funkció | Ebben a futtatókörnyezetben nem indítható botkapcsolat. |
| Discord-küldés sikertelen | A bot célcsatornajogának javítása után az iratnál kattints az Újraküldés gombra. |

## Ellenőrzés és technikai részletek

**89 Node-teszt sikeres**, köztük 41 MDT-futási teszt; **18 emulált Roblox-kliensfolyamat sikeres**, valamint JavaScript- és Lua-szintaxisellenőrzés. A tesztek a meglévő csatornák nulla módosítását, részleges és párhuzamos telepítést, owner/ID-korlátozást, keresést, űrlapbeküldést, jóváhagyást, körözésszűrést, látható/hiányzó/ellentmondó játékforrást és hozzáférés-visszavonást is vizsgálják. A betöltőlink érvénytelenítését, tulajdonoshoz és szerverhez kötését, a titkos belépési adatok hiányát, valamint a bot által ténylegesen generált egysoros kód futtatását is ellenőriztük. A CIA végső telepítési zárát a kiadás megtartja.

Élő Discord/Roblox/Xeno integrációs próba és Render-deploy ebben a beszélgetésben nem történt. A kliens a rendelkezésre álló `request`, `http_request`, `Xeno.request` vagy `http.request` funkcióval kapcsolódik a saját NEXA API-hoz. A kompatibilitás feltétele a Roblox GUI- és HTTP-funkciók rendelkezésre állása.

Node: `npm test`, szintaxis: `node --check index.js`. A fej nélküli klienspróba valódi Roblox helyett emulált UI-val és HTTP-val fut: `lua test/roblox-mdt-headless.test.lua roblox/Belv-MDT-Emergency-Hamburg.lua` (Lua 5.4). Ez a 16 alapfolyamatot ellenőrzi. A további két betöltőpróbához az emuláció a Node-teszt által előállított egysoros kódot és személyes Lua-forrást kapta meg.

Adattáblák: `nexabot_mdt_settings`, `nexabot_mdt_codes`, `nexabot_mdt_sessions`, `nexabot_mdt_records`, `nexabot_mdt_provision_locks`, `nexabot_mdt_loader_links`. A bot induláskor előkészíti ezeket; a csatornalétrehozás külön kézi művelet. API: `/api/mdt/v1/...`; személylekérdezés: `GET /people/lookup?robloxId=...&username=...` a fő owner személyes munkamenetével. A saját, aláírt klienslink a `/mdt/client/...` útvonalon kizárólag Lua-kódot szolgál ki.

A játékjelzés leírásának forrása: [Emergency Hamburg – Police Department](https://wiki.emergency-hamburg.com/en/jobs/police). A nyilvános játékos- és névlekérdezés API-ja: [Roblox Creator Hub – Players](https://create.roblox.com/docs/reference/engine/classes/Players).
