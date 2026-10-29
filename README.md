# NEXA 5.0 Next Generation · build 25.15.0

A meglévő NEXA továbbfejlesztése. A csomagolt futó alkalmazás a gyökér `index.js` fájlból indul.

Node >=22; az éles függőségek: discord.js 14.27.0, @discordjs/voice 0.18.0, dotenv 16.6.1, ffmpeg-static 5.2.0, opusscript 0.0.8 és pg ^8.23.0. Telepítéskor az éles adatbázist és titkokat őrizd meg.

## Fejlesztés

A hiteles forrás a `src/` könyvtár; a `module-order.txt` határozza meg a csomagolás sorrendjét. A régi gyökérszintű modulfájlok nem részei a buildnek.

- Build: `python3 bundle.py`
- Ellenőrzések: `npm test`
- Az ellenőrzés a forrásmodulok szintaxisát, a BELV jogosultsági és nyilvántartási szabályait, a szolgálati idő és pénzügyi levonás fontos invariánsait, valamint az `index.js` és a források egyezését vizsgálja.

BELV dokumentum-jóváhagyásnál add meg a szerveren a `BELV_APPROVAL_ROLE_ID` környezeti változót (vagy az Owner Center dokumentumbeállításában a jóváhagyó rangazonosítót). Rangnév alapján jóváhagyást a BELV nem fogad el.

Zeneparancsok: `/zene` és `/music` (lejátszás, szünet, folytatás, kihagyás, várólista, hangerő, kilépés). A `/zene lejatszas` közvetlen HTTPS hangfolyamot fogad; a forrás domainjét előbb engedélyezni kell a `NEXA_MUSIC_ALLOWED_HOSTS` környezeti változóban, vesszővel elválasztva. YouTube-videó hangjának kinyerése és továbbítása nem támogatott; YouTube-linket a bot felismer és megnyitható linkként visszaad.

A bot indítása: `npm start`. Az élesítést a Render automatikus telepítése végzi a `main` frissítése után.
