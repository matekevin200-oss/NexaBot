# NEXA Bot 20.1.1 — CIA utolsó telepítés

- A fő BOT_OWNER_ID fiók még egyszer frissítheti a korábban telepített CIA-rendszert.
- A V1/V2 telepítési jelző felismerhető; a korábbi telepítési zár nem tiltja az utolsó futást.
- Siker után a telepítő tartósan lezár, és a teljes `/cia` parancsot eltávolítja az érintett Discord-szerverről.
- Újraindításkor nem regisztrálja vissza. Elmaradt parancstörlést induláskor újra megpróbálja.
- A beállításmentés nem oldja fel a végleges lezárást; más admin vagy hozzáadott Owner-kezelő nem indíthat telepítést.
- Megszakadt telepítés folytatható; a végső engedélyt csak teljes siker után használja fel.
- Megtartja a 26 kezelt rangot, 17 kategóriát, 117 szobát, magyar kézikönyvet és az egyedi TGF-megőrzést.
- Ellenőrzés: 48/48 automatikus teszt, ebből 10 CIA futási próba; Node szintaxisellenőrzés. Éles Discordon nem történt telepítés ebben a beszélgetésben.

A friss projekt indítása után futtasd egyszer: `/cia ujratelepites`.
Részletes útmutató: [CIA-UTMUTATO-20.1.1.md](CIA-UTMUTATO-20.1.1.md).
