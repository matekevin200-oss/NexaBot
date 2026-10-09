# NEXA Bot 20.2.2 • Belv MDT egysoros betöltő

Az MDT indításához most elég egy saját `loadstring(game:HttpGet("…"))()` sor. A fő owner az Owner Center **Egysoros MDT-betöltő** mezőjéből vagy a privát `/mdt script` válaszból másolhatja. A teljes, személyre beállított panelkód és `.lua` letöltés továbbra is elérhető.

A link a bot HTTPS-webcímére mutat, újraindítás után megmarad, és minden indításkor a mentett Roblox-ID-listával tölti be a panelt. Owner Centerben visszavonható és új készíthető. Kikapcsolt MDT, üres ID-lista, megváltozott fő owner vagy elveszett Discord-tagság esetén nem tölti le a panelt.

A betöltő csak a klienskódot szolgálja ki. Nem tartalmaz belépőkódot, munkamenettokent vagy Discord-tokent. Az MDT-adatokhoz továbbra is a fő owner `/mdt belepes` kódja kell. Másnak átadott kóddal a másik felvett fiók a fő owner nevében férhet hozzá. Csak saját ID-k felvétele és a kód megtartása szükséges a személyes használathoz.

A meglévő PostgreSQL-adatokat megtartó automatikus migráció adja hozzá a betöltőlinkek tárolását. Nincs új környezeti változó vagy npm-függőség. A csatornatelepítő és a CIA végső telepítési zárának működése megmarad.

Ellenőrzés: 89/89 Node-teszt (41 MDT), 18/18 emulált Roblox-folyamat, JavaScript- és Lua-szintaxis. Az emuláció a bot által valóban előállított egysoros kódot és letöltött személyes Lua-forrást futtatja. Élő Discord/Roblox/Xeno-próba és Render-deploy nem történt.

Frissítsd a projektfájlokat GitHub/Renderen, indíts új deployt, majd a fő owner fiókkal kérd le a kész sort: `/mdt script`. Beállítás: [BELV-MDT-UTMUTATO.md](BELV-MDT-UTMUTATO.md).
