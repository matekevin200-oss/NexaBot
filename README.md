# NEXA 5.0 Next Generation · build 25.12.3

A meglévő NEXA továbbfejlesztése. Teljes állapot és telepítés: `NEXA-5-ALLAPOT.md`.

Node >=22; az éles függőségek változatlanok: discord.js 14.27.0, dotenv 16.6.1, pg ^8.23.0. Telepítéskor csak a csomagolt gyökér `index.js` cserélendő. Az éles adatbázist és titkokat őrizd meg.

Build: `python3 embed-web.py`, `python3 bundle.py`. Tesztek: `npm test`. Lua: `python3 test/check-lua.py`. Külön titkosított mentési segéd: `scripts/nexa-backup.cjs`.

Új felület: `/dashboard/guild/<id>/next`. Külön MDT: `/mdt-web`. Discord-központ: `/nexa panel`, állapot: `/nexa status`. A korábbi parancsok megmaradnak. Publikus changelog: `/changelog`, sablonkönyvtár: `/workflows`, tagi jelentkezés/esemény: `/community/<id>`.

A helyi tesztek szimulált Discord- és AI-kapcsolattal futnak. Az új kiadás nincs élesítve; a teljes 28 pontos specifikáció fennmaradó elemei az állapotjelentésben szerepelnek.
