# NEXA 25.12.0 — Folyamatos élő szervercsatornák

- A `/nexa elo muvelet:telepites` külön `📊・NEXA LIVE` kategóriát és hat külön státuszcsatornát hoz létre.
- A csatornák: élő áttekintés, taglétszám, ticketállapot, szolgálati lefedettség, staff-feladatok és moderációs esetek.
- A bot az adatokat 30 másodpercenként újra lekéri és szerkeszti a státuszüzeneteket; nem küld új üzenetet minden frissítéskor.
- Ha a saját státuszüzenet vagy egy élő csatorna eltűnik, a bot helyreállítja. Más csatornákhoz nem nyúl.
- A frissítés a `/nexa elo muvelet:leallitas` paranccsal szüneteltethető; a létrehozott kategóriát és csatornákat a bot megtartja.
- A telepítéshez a használónak Szerver kezelése, a botnak Csatornák kezelése, valamint az új csatornákban üzenetküldési és beágyazási jogosultság szükséges.
- A kétnyelvű közlemény automatikus Support-közzététele engedélyezve van.
