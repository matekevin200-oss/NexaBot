# NEXA Bot 20.3.1 • Support kapcsoló és Belv MDT-javítás

A Support szerveren várható tömeges belépéshez a fő owner egyetlen gombbal szüneteltetheti a moderációt: **Owner Center → Support műveletek → Minden moderáció kikapcsolása**. A kapcsoló csak a fő `BOT_OWNER_ID` fióknak és a hivatalos Supportnak (`1556219615858655254`) érhető el. Más szerver védelmét nem módosítja.

Szünetel a NEXA automatikus moderációja és büntető kézi műveletei: nincs új automatikus kick, ban, timeout, figyelmeztetés, üzenettörlés, Anti-Nuke intézkedés vagy raidlezárás. A régi moderációs és raid-gombok is blokkoltak. A bot feloldja a korábbi raidlezárást/karantént és kiüríti a belépési, spam- és szabálysértési számlálókat. A szünet alatti belépéseket nem gyűjti új büntetési listába. A már elküldött Discord-intézkedést nem tudja visszavonni.

Kikapcsolja az aktív Discord AutoMod-szabályokat is; ehhez **Szerver kezelése** jog kell. A szabályok tartalmát és a korábbi NEXA-modulbeállításokat megőrzi. **Moderáció visszakapcsolása** csak a szüneteltetett szabályokat aktiválja újra, a korábban inaktívakat nem. Működő adatbázissal a kapcsoló és visszaállítási lista újraindítás után is megmarad.

Részleges hiba külön állapotot és **Kikapcsolás folytatása** gombot kap. Sikertelen raidfeloldás vagy AutoMod-visszaállítás alatt a NEXA nem kapcsol vissza. Megmarad a sikertelen visszaállítás listája és az újraindításkor felismerhető raidpillanatkép. Ticketek, üdvözlés és tagellenőrzés a saját modulbeállításaik szerint tovább működhetnek. Más botok moderációját külön kell kezelni.

A privát Discord-kapcsoló: magyar listán **`/support-szerver moderacio`**, angol listán **`/support-server moderation`**. A megnyitás nem telepít újra semmit. A webes végpont fő owner- és CSRF-ellenőrzést végez; a bot belső szolgáltatása is ellenőrzi a fő ownert és Support ID-jét.

Az MDT központ frissítése a felvett tagoknak és a fő ownernek külön **Alkalmazásparancsok használata** jogot ad. Az eredeti háromállapotú jogot külön menti, tagvisszavonás vagy központáthelyezés után helyreállítja, a későbbi kézi módosításokat megőrzi. Az állományi rang továbbra is olvasási hozzáférést kap, panelbelépéshez saját Discord–Roblox párosítás kell.

A `/mdt` regisztráció a Discord-csatornák frissítése előtt fut; más globális parancsregisztráció hibája sem hagyja ki. A tagfelvételi űrlap a lap elején látható. A tag sorának **Hozzáférés ellenőrzése** nézete az aktuális Discord-tagságot, ID-párt, személyes jogosultságot, parancsot, alapkorlátozást, központi jogokat és érintő integrációs szabályokat kéri le. Kódot nem ad ki, összetett integrációs szabályok eredményét nem állítja biztosnak.

Megmaradt a tagi belépés, saját ügyintézői azonosítás, saját iratkezelés, fő owner-jóváhagyás, Belv Discord-szerverhez kötés, animált helyi Roblox-betöltő és CIA végső telepítési zár. Nincs új npm-függőség vagy külön adatbázis-migráció; a Support állapota a meglévő konfigurációban van.

**Ellenőrzés:** 129/129 Node-teszt (61 MDT és 20 Support), 22/22 emulált Roblox-folyamat, JavaScript/Lua-szintaxis. A Support-próbák 500 egyidejű ember/bot belépését, spam és régi büntetési gombok tiltását, folyamatban lévő és újraindításból visszaállított raidlezárás feloldását, natív szabályok részleges hibáját és az eredeti állapot visszaállítását ellenőrzik. Élő Discord/Roblox/Xeno-próba és Render-deploy nem történt.

**Telepítés:** a ZIP projektfájljaival frissítsd a GitHub/Render projektet, tartsd meg a környezeti változókat, majd indíts deployt. Ezután nyomd meg a Support kikapcsológombját. A Belv MDT-nél frissítsd a Discord-nézetet és ellenőrizd az érintett tag hozzáférését. Teljes lépések: [BELV-MDT-UTMUTATO.md](BELV-MDT-UTMUTATO.md).
