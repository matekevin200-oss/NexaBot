# NEXA Bot biztonsági szabályzat

## Titkok kezelése

A Discord token, OAuth2 client secret, adatbázis-cím, session secret és AI API-kulcs kizárólag szerveroldali environment variable lehet. Ezeket tilos GitHubra, Discordra, képernyőképre vagy kliensoldali JavaScriptbe másolni.

Az ER:LC Server Key két biztonságos módon kezelhető:

- az Owner Centerben elmentve, AES-256-GCM hitelesített titkosítással;
- vagy `ERLC_API_KEY` environment variable-ként, kötelező `ERLC_GUILD_ID` szerverazonosítóhoz kötve.

Az Owner Centeres tároláshoz az `ERLC_ENCRYPTION_KEY` legalább 32 karakteres, titkos environment variable. Az ER:LC-kulcs mentés után nem jelenik meg újra teljes egészében, és nem kerülhet GitHubra vagy kliensoldali kódba.

Ha egy kulcs nyilvánosságra került, az érintett szolgáltatás kezelőfelületén azonnal vond vissza vagy generáld újra, majd frissítsd a Render Environment értékét.

## Hibabejelentés

Biztonsági hibát ne nyilvános Discord-csatornában és ne publikus GitHub issue-ban részletezz. A bot tulajdonosának küldd el:

- az érintett NEXA Bot verziót;
- a hiba rövid, titkok nélküli leírását;
- a reprodukálás lépéseit;
- az esetleges hatást;
- a releváns időpontot és szerverazonosítót.

Tokeneket, ER:LC-kulcsokat, session cookie-kat, teljes adatbázis-címeket és privát AI-beszélgetéseket ne csatolj.

## Támogatott verzió

A legújabb 7.x kiadás kap biztonsági javításokat. Régebbi csomag használatakor először frissíts a legújabb kiadásra.
