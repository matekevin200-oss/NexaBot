# NEXA Bot 20.1.0 — CIA Expanded

- 26 kezelt rang és beosztás, 17 kategória, 117 csatorna (101 szöveges, 16 hangszoba).
- `/cia ujratelepites`: kizárólag az elsődleges BOT_OWNER_ID fiók frissítheti / javíthatja a CIA rendszert.
- Tulajdonosi ellenőrzés a parancskezelőben és a belső telepítő / rangfrissítő függvényekben.
- A régi V1 telepítés támogatott; első telepítés helyett a tulajdonosi újratelepítés használható.
- ID alapján kezeli a meglévő, akár átnevezett rangokat és csatornákat; hiányzó elemeket pótol.
- Megmaradnak a tagi rangkiosztások, ticketek, beszélgetések és egyedileg módosított TGF-kérdések.
- Magyar CIA-bemutató, beosztásleírások, szolgálati és kiképzési rend, szakterületek és munkaszobák.
- Javítva a rangfrissítő hiányzó importja és a camelCase erőforráskulcsok mentése.
- Újraindítás önmagában nem telepít; CIA-kezelés továbbra is kizárólag Discordon.
- Ellenőrzés: 45/45 automatikus teszt, köztük 7 CIA futási próba, valamint Node szintaxisellenőrzés. Éles Discordon nem futott telepítés ebben a beszélgetésben.

Használat: [CIA-UTMUTATO-20.1.0.md](CIA-UTMUTATO-20.1.0.md).
