# NEXA Bot 20.2.0 • Belv MDT

Az Emergency Hamburg kliensében megnyitható Belv MDT-panel a NEXA boton keresztül ment és publikál Discord-iratokat. Személy-, jármű-, ügy-, körözés- és szolgálati nyilvántartás, feljegyzések és a meglévő Belv-iratsablonok kitöltése támogatott.

Az MDT kizárólag a fő `BOT_OWNER_ID` fiók számára használható. Az Owner Center szerverkártyáján a **Belv MDT** oldalon kötelező felvenni a Roblox-ID-t; ugyanitt választhatók a Discord-célcsatornák és tölthető le a fiókhoz beállított script. A személyes, egyszeri belépőkód Discordon kérhető: `/mdt belepes`.

A jóváhagyást kérő iratok ellenőrzésre kerülnek. A hálózati újrapróbálás nem hoz létre új adatbázis-bejegyzést; a sikertelen Discord-küldés külön újraküldhető. A lezárt iratok megmaradnak, a módosítások verzióellenőrzést kapnak. A CIA végső telepítési zárát és parancstörlését a frissítés megtartja.

Ellenőrzés: 66/66 Node-teszt, 7/7 emulált Roblox-kliensfolyamat, JavaScript- és Lua-szintaxisellenőrzés. Élő Discord/Roblox/Xeno integrációs próba és Render-deploy nem történt.

Beállítás: [BELV-MDT-UTMUTATO.md](BELV-MDT-UTMUTATO.md).
