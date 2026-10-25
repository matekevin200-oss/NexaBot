# NEXA 25.15.0 — Staff Feladatközpont

- Új `/feladat kiosztas`: felelős, részletes leírás és opcionális budapesti határidő.
- A kijelölt tag privát Discord-értesítést és állapotgombokat kap.
- Új `/feladat sajat`: a saját nyitott feladatok listája.
- Új `/feladat attekintes`: Staff-only, szerverenkénti aktív és lezárt feladatlista.
- Új `/feladat allapot`: felelős átveheti és lezárhatja; Staff újranyithatja.
- Az állapotváltások optimista verzióellenőrzéssel és auditnaplóval mentődnek.
- A webes feladatnézet meglévő rekordjaival közös adatbázist használ; a meglévő adatok megmaradnak.
- Két új nullable adatbázismező migrációja: határidő és lezárás ideje.
- A Support-közlemény magyarul és angolul készül.
