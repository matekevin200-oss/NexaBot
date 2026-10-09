# Belv MDT • NEXA Bot 20.3.0

A Belv MDT-t a fő owner és az általa felvett **Discord-ID + Roblox-ID párok** használhatják. Minden felvett tag a saját Discord-belépőkódját kéri, és saját ügyintézőként rögzít. A Belv állomány kiválasztott rangja a közzétett iratokat Discordon olvashatja. A jóváhagyás és a hozzáférések kezelése a fő ownernél marad.

## Első indítás vagy frissítés

1. A ZIP projektfájljait frissítsd a NEXA GitHub/Render projektjében, majd indíts új deployt. A meglévő környezeti változókat tartsd meg.
2. A `BOT_OWNER_ID` a saját fő Discord-fiókod ID-je legyen. Működő `DATABASE_URL` és HTTPS NEXA-webcím kell: `PUBLIC_URL` vagy `RENDER_EXTERNAL_URL`.
3. A Belv-szerver rögzítéséhez megadhatod Renderen a **`BELV_MDT_GUILD_ID`** változót, a Belv Discord-szerver ID-jével. Ha nem adod meg, az egyetlen korábban bekapcsolt MDT-szervert veszi át; új rendszerben a fő owner első beállítása köti egy szerverhez. Másik Discord-szerveren nem lehet MDT-t beállítani vagy belépőkódot kérni.
4. A NEXA weben a fő owner fiókkal nyisd meg: **Owner Center → Belv MDT**. Válaszd a saját Belv-szervert. A szerverhez kötés után csak a Belv jelenik meg ezen az oldalon.
5. Add meg a **fő owner saját Roblox-ID-jét**. A Roblox-profil címében a `/users/` és `/profile` közötti szám az ID. Legfeljebb 10 saját fiók vehető fel, külön sorban.
6. Válaszd ki a **Belv állomány rangját**. A meglévő ranghoz tartozó állomány látja a közzétett iratokat, a központot és az útmutatót. A bot a rang nevét, sorrendjét vagy tagi kiosztását nem módosítja.
7. Kattints: **MDT-központ létrehozása és frissítése**. Bekapcsolja az MDT-t, pótolja a hiányzó szobákat, elhelyezi a központ és az útmutató üzenetét, majd frissíti az állomány olvasási hozzáférését.
8. Az **MDT-tagok • Discord-ID + Roblox-ID** részen add meg a tag Discord-ID-jét és saját Roblox-ID-jét, majd kattints a **Tag hozzáadása / saját fiókok frissítése** gombra. A tag legyen a Belv Discord-szerver tagja. Egy Roblox-ID egy Discord-fiókhoz tartozhat; egy taghoz legfeljebb öt saját fiók, összesen legfeljebb ötven MDT-tag vehető fel.

A **Beállítások és állományi hozzáférés mentése** megőrzi a felvett tagokat. A **Discord-nézet és MDT-gombok frissítése** megismételhető: a bot saját korábbi központját frissíti, nem készít újabb üzenetet minden alkalommal.

## A felvett tag használata

1. A tag a Belv Discordon kattintson a `#mdt-kozpont` **Saját betöltő** gombjára, vagy használja: **`/mdt script`**. Privát választ kap a kész `loadstring(game:HttpGet("…"))()` sorral.
2. A **Belépőkód** gomb vagy **`/mdt belepes`** a saját egyszeri kódját adja meg. A kód tíz percig érvényes, és a kérő Discord-fiókhoz felvett Roblox-ID-khez tartozik. Más tag vagy a fő owner Roblox-ID-jével nem lehet felhasználni.
3. Emergency Hamburgban futtassa az egysoros betöltőt a megfelelő klienskörnyezetben. `loadstring`, `game:HttpGet` és a botkapcsolathoz `request` HTTP-funkció szükséges.
4. A panelen adja meg saját Discord-kódját. A betöltőképernyő mutatja a fiókpár ellenőrzését, a nyilvántartás betöltését és a belépés eredményét. A fejlécben a saját ügyintéző neve látszik.
5. **F6** vagy **BELV MDT**: panel nyitása / elrejtése. A panel az adott játékos saját képernyőjén jelenik meg.

A külön átadott `Belv-MDT-Emergency-Hamburg.lua` és a ZIP `roblox/` forrása üres konfigurációval indul. **A kész, saját betöltőt az Owner Center vagy a `/mdt script` adja.** A teljes forrás az Owner Centerben külön is megnyitható. A betöltő minden indításkor az aktuális ID-listával tölt be.

## Jogosultságok

| Személy | Roblox MDT | Iratkezelés | Beállítás és jóváhagyás |
| --- | --- | --- | --- |
| Fő owner, saját Roblox-ID-vel | Saját személyes kóddal | Az összes elérhető irat | Igen |
| Felvett Discord–Roblox fiókpár | Saját személyes kóddal | Közzétett iratok és saját beküldések; rögzítés és saját módosítás | Nem |
| Belv állományi rang, külön ID-pár nélkül | Nem | Közzétett iratok olvasása Discordon | Nem |
| Más admin vagy delegált Owner Center-kezelő | Csak ha külön felvetted a fiókpárját | A felvett tag joga szerint | Nem |
| Más Discord-szerver | Nem | Nem | Nem |

A felvett tag a másik ügyintéző jóváhagyásra váró vagy elutasított iratát nem olvashatja. A saját iratát és a közzétett közös nyilvántartást láthatja. A fő owner minden elérhető iratot kezelhet. A Discord szervertulajdonosa és Administrator-jogú tagjai a Discord saját szabályai miatt a privát ellenőrzési csatornát is láthatják; ettől nem kapnak MDT-jóváhagyási jogot.

## Discord MDT-központ

Kategória: **BELV • MDT**. Legfeljebb tíz szöveges csatorna készül.

| Csatorna | Feladat |
| --- | --- |
| `mdt-kozpont` | Állományi központ: személyes betöltő, kód, állapot és kijelentkezés gombjai |
| `mdt-utmutato` | Használati rend és jogosultságok |
| `mdt-iratok` | Alapértelmezett nyilvántartás |
| `mdt-ellenorzes` | Privát vezetői ellenőrzés |
| `mdt-szemelyek` | RP-személyadatok |
| `mdt-jarmuvek` | RP-járműadatok |
| `mdt-ugyiratok` | Jóváhagyott ügyiratok |
| `mdt-korozesek` | Jóváhagyott saját RP-körözések |
| `mdt-szolgalati-naplo` | Szolgálati bejegyzések |
| `mdt-feljegyzesek` | Belső RP-feljegyzések |

A hiányzó szobák telepítése a meglévő szobát újra használja. Nem nevez át, nem mozgat és nem töröl csatornát, nem változtat rangot. Az új állományi kérésnek megfelelő **Discord-hozzáférésfrissítés** az MDT célcsatornáiban a felvett tagoknak és a kiválasztott rangnak látási és előzményolvasási jogot ad. Meglévő egyéb csatornajogot nem ír felül. A Belv-iratsablonok célcsatornáira is alkalmazza az olvasási jogot.

A vezetői ellenőrzésnek külön csatornában kell lennie. Az állományi és tagi olvasási jogot nem adja hozzá ehhez a csatornához. Más, már meglévő Discord-jogosultságot nem töröl.

A bot saját központ- és útmutatóüzenetét frissíti. Mások üzeneteit érintetlenül hagyja. Az iratkezelés a bot saját iratüzenetét szerkesztheti. Ehhez a botnak **Csatornák kezelése**, valamint a célokban látási, küldési, embedküldési és előzményolvasási jog kell.

Ismételt vagy megszakadt telepítés folytatható. Adatbázis-zárolás védi az egyidejű futást. Botújraindítás nem telepít szobát vagy üzenetet; a `/mdt` parancsot a Belvhez regisztrálja, más szerverekről eltávolítja a régi szerveres példányát. A globális `/mdt` regisztrációt megszünteti. Discordon a parancslista frissülése eltarthat egy ideig.

## Játékoskereső és nyilvántartás

Név vagy Roblox-ID alapján nyithatsz játékosadatlapot. Látszik a felhasználónév, ID, Roblox-profil, a jelenlegi szerverben a csapat, és a felismert játékbeli körözésjelzés. Az aktuális szerveren kívüli nyilvános Roblox-profilt pontos felhasználónévvel vagy ID-vel is keresheted.

- **+ Személyadat:** a név és ID előre kitöltve; RP-név, státusz és megjegyzés rögzíthető.
- **+ MDT-körözés:** saját RP-körözési irat, kézi indokkal, prioritással és érvényességgel. Fő owner-jóváhagyásra kerül.
- **+ Ügyirat:** saját ügyirat a személy nevével és ID-jével. Fő owner-jóváhagyásra kerül.

A személy-, ügy- és körözési iratok azonos Roblox-ID alapján kapcsolódnak. Régi ID nélküli adatnál pontos felhasználónév alapján jelenhet meg **csak névegyezés** jelöléssel. Más ID-jű személy irata nem kerül az adatlaphoz névegyezés miatt. Ötven találat után lapozható.

Járművek, szolgálati napló, feljegyzések és a meglévő Belv-iratsablonok is kitölthetők. A NEXA elmenti az iratot és a hozzá tartozó Discord-bejegyzést. A jóváhagyott ügyirat vagy körözés tartalma nem írható át; javításhoz új irat készül. A tag saját, közvetlenül közzétett személyadata vagy feljegyzése szerkeszthető. Lezáráskor az irat megmarad, archiválódik. Sikertelen Discord-küldés az adatlap **Újraküldés** gombjával folytatható.

## A játék szerinti körözésjelzés

Rendőrként nyisd meg az Emergency Hamburg telefonjának rendőrségi játékoslistáját. Az MDT **Játék körözései → Lista kapcsolása** menüjében válaszd ki a megjelenített rendőrségi névlistát. A panel a felismert piros és fehér névjelzést olvassa, körülbelül ötmásodpercenként.

Hiányzó, bezárt, rejtett vagy ellentmondó jelzésnél **ismeretlen** az állapot. Az ismeretlen nem jelent körözésmentességet. A játék belső felületét élőben nem ellenőriztük; a kiválasztást a saját kliensedben kell elvégezni. Körözési szint, bűncselekmények vagy EH-járműadatok nem következnek a színjelzésből; ezeket a játékban ellenőrizheted és kézzel feljegyezheted.

Saját MDT-körözés felvitele nem változtatja meg a játék valódi körözési rendszerét. A korábbi, MDT-n kívüli Discord-üzenetek nem importálódnak automatikusan.

## Hozzáférés visszavonása

Az Owner Center taglistájában a **Visszavonás** törli a tag személyes kódjait és munkameneteit. A következő API-kérés elutasítja a tagot, a panel pedig kiüríti a privát adatokat. Új felvétel nem éleszti újra a régi tokent.

A Discord-frissítés a bot által hozzáadott látási és olvasási jogot állítja vissza a korábbi állapotra. Más rangból eredő jogot nem töröl; ha a tag továbbra is az állományi rangban van, Discordon a közzétett iratokat az állomány tagjaként láthatja. Ez nem ad vissza Roblox MDT-belépést. Ha a Discord-jogfrissítés hibával megáll, a tag panelhozzáférése már visszavont, a Discord-frissítést újra kell indítani.

Saját kijelentkezés: `/mdt kijelentkezes`, a központ **Belépések visszavonása** gombja vagy a panel **Kijelentkezés** gombja. Ez csak a kérő saját munkameneteit vonja vissza.

A **Régi betöltőlink visszavonása és új készítése** érvényteleníti a korábbi betöltősort. A link visszavonása a már belépett tagot önmagában nem jelentkezteti ki. A link csak klienskódot szolgál ki, bot-token, belépőkód és munkamenettoken nincs benne.

## Hiba esetén

| Helyzet | Teendő |
| --- | --- |
| A tag nem kérhet kódot | A fő owner vegye fel a tag Discord-ID-jét és saját Roblox-ID-jét; a tag legyen a Belv Discordon. |
| A Roblox-ID másik fiókhoz tartozik | Ellenőrizd a Discord–Roblox párosítást. A saját Discord-fiókoddal kérj új kódot. |
| Másik szerveren tiltott | Az MDT csak a beállított Belv Discord-szerverhez tartozik. Ellenőrizd a `BELV_MDT_GUILD_ID` értéket. |
| Az állomány nem látja az iratokat | Válaszd ki a helyes állományi rangot, majd frissítsd a Discord-nézetet. |
| A vezetői csatorna nem különálló | A review-csatornát válaszd külön, vagy futtasd a hiányzó MDT-szobák telepítését. |
| Betöltés vagy belépés hibával leáll | Ellenőrizd a NEXA HTTPS-címét, adatbázisát, a saját fiókpárt és a bot naplóját. A személyes kód egyszer használható; kérj újat. |
| Nem látszik `/mdt` | Ellenőrizd a 20.3.0 verziót és a Belv-kötést, majd frissítsd a Discord-nézetet. A központ gombjai is használhatók. |
| Nincs HTTP-funkció a kliensben | A futtatókörnyezetnek `request`, `http_request`, `Xeno.request` vagy `http.request` HTTP-funkciót kell biztosítania. |
| A Discord-frissítés félbeszakadt | Javítsd a bot célcsatornajogát, majd ismételd meg a frissítést; a mentett lista és a korábbi állapot megmarad. |

## Ellenőrzés és technikai korlátok

**102 Node-teszt sikeres, ebből 54 MDT-teszt; 22 emulált Roblox-kliensfolyamat sikeres.** Ellenőrizve a saját tagi belépés, más fiók kódjának tiltása, szerverzár, tagi iratkezelés, vezetői jóváhagyás, visszavonás, a Discord-jogok helyreállítása és a részleges frissítés folytatása. Az emuláció a bot által generált egysoros kódot és tényleges személyes Lua-forrást futtatja, beleértve a tagi nézetet, a betöltőképernyőt és a hibás belépést.

Élő Discord/Roblox/Xeno-próba és Render-deploy nem történt. A kompatibilitást emulált GUI- és HTTP-funkciókkal ellenőriztük. A szerverzár a **Belv Discord-szervert** ellenőrzi; egy konkrét Roblox privát szerverhez tartozást nem hitelesít. A kliens által jelentett Roblox-ID nem Roblox OAuth-bejelentkezés. A szerver minden API-kérésnél a friss Discord-tagságot, a regisztrált fiókpárt, az aktív jogosultságot és a munkamenetet ellenőrzi. A személyes kód egyszer használható, tízperces; a munkamenet legfeljebb hatórás.

Indításkor a meglévő adatokat megőrző migráció előkészíti az MDT beállítás-, kód-, munkamenet-, irat-, telepítési zár-, betöltőlink-, Belv-szerverkötés- és Discord-állapottábláit. Nincs új npm-függőség. A CIA végső telepítési zárának működése megmarad.

Ellenőrzés: `npm test`, `node --check index.js`. A 19 alap klienspróba: `lua test/roblox-mdt-headless.test.lua roblox/Belv-MDT-Emergency-Hamburg.lua` Lua 5.4 alatt. A további három próba a generált betöltőből futtatott klienshez tartozik.
