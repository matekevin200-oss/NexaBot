# NEXA Bot biztonsági szabályzat

## Titkok kezelése

A Discord token, OAuth2 client secret, adatbázis-cím, session secret és AI API-kulcs kizárólag szerveroldali environment variable lehet. Ezeket tilos GitHubra, Discordra, képernyőképre vagy kliensoldali JavaScriptbe másolni.

Ha egy kulcs nyilvánosságra került, az érintett szolgáltatás kezelőfelületén azonnal vond vissza vagy generáld újra, majd frissítsd a Render Environment értékét.

## Hibabejelentés

Biztonsági hibát ne nyilvános Discord-csatornában és ne publikus GitHub issue-ban részletezz. A bot tulajdonosának küldd el:

- az érintett NEXA Bot verziót;
- a hiba rövid, titkok nélküli leírását;
- a reprodukálás lépéseit;
- az esetleges hatást;
- a releváns időpontot és szerverazonosítót.

Tokeneket, session cookie-kat, teljes adatbázis-címeket és privát AI-beszélgetéseket ne csatolj.

## Támogatott verzió

A legújabb 6.x kiadás kap biztonsági javításokat. Régebbi csomag használatakor először frissíts a legújabb kiadásra.
