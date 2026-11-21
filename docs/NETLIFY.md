# NEXA Netlify – biztonságos webes belépőoldal

A NEXA meglévő botja és dashboardja a Renderen fut tovább. A Netlify **nem futtatja a Discord botot**; a repository gyökerében lévő `npm start` bot-indításra szolgál. Ezért a Netlify kizárólag a `netlify-site/` statikus, magyar nyelvű bemutatkozó oldalát telepíti.

## Beállítás

1. Netlify → Add new project → GitHub → `matekevin200-oss/NexaBot`.
2. Válaszd ki a megfelelő branch-et (a PR összevonása után `main`).
3. A `netlify.toml` beállítja a buildet: `node scripts/build-netlify.cjs` és `netlify-site` publish directory.
4. Site configuration → Environment variables: állítsd a `NEXA_DASHBOARD_URL` értékét a már működő Render dashboard HTTPS alapcímére, például `https://sajat-render-domain.onrender.com`. **A példa nem valódi projektcím.**
5. Redeploy. A Vezérlőpult gomb a meglévő dashboardra navigál; a Discord OAuth2 és jogosultságok továbbra is a Render alkalmazásban maradnak.

Ha a változó hiányzik, a link nem jelenik meg, és az oldal ezt egyértelműen jelzi. A build elutasítja a nem HTTPS, hitelesítőadatot vagy query/fragment részt tartalmazó URL-eket.

## Fontos korlátozások

- Ez egy **belépőoldal**, nem a teljes NEXA dashboard átköltöztetése.
- Nincs kliensoldalon Discord token, OAuth2 secret vagy adatbázis-jelszó.
- A `NEXA_DASHBOARD_URL` **nyilvános** URL; soha ne tegyél bele titkot.
- A Render `PUBLIC_URL` és a Discord OAuth2 redirect URL-ek maradjanak a tényleges dashboard címére állítva mindaddig, amíg az autentikáció és a route-ok külön migrációja nincs tesztelve.
- A Netlify build eredménye akkor is megjeleníti a NEXA funkciókat, ha a dashboard átmenetileg elérhetetlen, de nem állít hamis online adatot.
- Az automatikus Netlify deployt és a DNS-t csak a build ellenőrzése után kapcsold élesre.

## Helyi ellenőrzés

```sh
NEXA_DASHBOARD_URL=https://example.com node scripts/build-netlify.cjs
node --check scripts/build-netlify.cjs
node --check netlify-site/site.js
```

A repository teljes bottesztje továbbra is: `npm test`.
