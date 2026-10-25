# NEXA 25.10.0 — Belv szóbeli vizsga

## Újdonság
- A Belv szerver kiképzési terv csatornájában a jogosult kiképző a `/mdt szobeli` paranccsal elindíthatja egy jelölt szóbeli vizsgáját.
- A pontozó 30 kérdést tartalmaz öt témakörben. Minden kérdés 0, 1 vagy 2 pontot ér.
- A bot a kérdéseket hat rövid, interaktív oldalra bontja, majd a csatornában közzéteszi az összesített és témakörönkénti eredményt.
- 45/60 ponttól az eredmény „Megfelelt”; ez alatt „Ismétlés szükséges”.
- A vizsgapontok és lezárt eredmények adatbázisban maradnak.

## Hozzáférés
- Kizárólag a Belv szerveren és a `📚┃kiképzési-terv` szöveges csatornában használható.
- A műveletet a Kiképző Tiszt jogosultságú tag, a vezetőség, illetve a Manage Server/Administrator jogosultságú személy indíthatja.
- A vizsgaeredmény ugyanabban a kiképzési terv csatornában jelenik meg.

## Ellenőrzés
- Tesztek: 332/332 sikeres.
- JavaScript szintaktikai ellenőrzés és Lua ellenőrzés sikeres.
