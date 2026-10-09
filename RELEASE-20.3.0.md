# NEXA Bot 20.3.0 • Belv állományi MDT

A fő owner Discord-ID + Roblox-ID párral felvehet tagokat. Minden tag saját egyszeri belépőkódot kér és saját ügyintézőként rögzít. A saját irat kezelhető; más tag iratának módosítása, a vezetői jóváhagyás és a beállítások a fő ownernél maradnak. Más tag jóváhagyásra váró irata rejtett.

A kiválasztott Belv állományi rang a közzétett iratokat olvashatja Discordon. Új MDT-központ és útmutató, privát választ adó gombok, áttekinthető iratüzenetek. A bot célzott olvasási jogot ad; visszavonáskor a korábbi állapotot helyreállítja, a többi jogot megőrzi. A saját központüzenetét frissíti, másokét nem írja át.

A Roblox-panel helyi betöltőképernyőt és animált folyamatjelzést kapott. A személyes bejelentkezés a fiókpárt és az elérhető iratsablonokat ellenőrzi. Hiba esetén a betöltő bezáródik, hiányos munkamenet nem nyitja meg a nyilvántartást.

Az MDT egyetlen Belv Discord-szerverhez kötött. Más szerveren a belépés, konfiguráció és betöltőkódkérés tiltott. A `/mdt` csak a Belvhez regisztrálódik; a globális példány megszűnik. Opcionális `BELV_MDT_GUILD_ID` állítja be a Belv ID-jét; enélkül az egyetlen meglévő aktív MDT-t veszi át, új telepítéskor az első owner-beállítás rögzíti.

A tag törlése a kódjait és tokenjeit visszavonja. Új hozzáadás nem éleszti fel a régi tokent. A meglévő adatok és a CIA végső telepítési zár megmaradnak; nincs új npm-függőség.

Ellenőrzés: **102/102 Node-teszt (54 MDT), 22/22 emulált Roblox-folyamat**, JavaScript- és Lua-szintaxis. Élő Discord/Roblox/Xeno-próba és Render-deploy nem történt. A szerverzár a Discord-szerverre vonatkozik; Roblox privát szerverhez tartozást nem hitelesít.

Frissítsd a projektet GitHub/Renderen. Owner Center → Belv MDT: állományi rang kiválasztása → MDT-központ frissítése → tagok felvétele Discord-ID és Roblox-ID párral. A tagok `/mdt script` és `/mdt belepes` paranccsal indulnak. Teljes útmutató: [BELV-MDT-UTMUTATO.md](BELV-MDT-UTMUTATO.md).
