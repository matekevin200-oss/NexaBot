# NEXA 5.0 Next Generation · build 25.15.0

A meglévő NEXA továbbfejlesztése. A csomagolt futó alkalmazás a gyökér `index.js` fájlból indul.

Node >=22; az éles függőségek: discord.js 14.27.0, @discordjs/voice 0.19.2, dotenv 16.6.1, ffmpeg-static 5.2.0, opusscript 0.0.8 és pg ^8.23.0. Telepítéskor az éles adatbázist és titkokat őrizd meg.

## Fejlesztés

A hiteles forrás a `src/` könyvtár; a `module-order.txt` határozza meg a csomagolás sorrendjét. A régi gyökérszintű modulfájlok nem részei a buildnek.

- Build: `python3 bundle.py`
- Ellenőrzések: `npm test`
- Az ellenőrzés a forrásmodulok szintaxisát, a BELV jogosultsági és nyilvántartási szabályait, a szolgálati idő és pénzügyi levonás fontos invariánsait, valamint az `index.js` és a források egyezését vizsgálja.

BELV dokumentum-jóváhagyásnál add meg a szerveren a `BELV_APPROVAL_ROLE_ID` környezeti változót (vagy az Owner Center dokumentumbeállításában a jóváhagyó rangazonosítót). Rangnév alapján jóváhagyást a BELV nem fogad el.

Zeneparancsok: `/zene` és `/music` (lejátszás, YouTube-keresés, szünet, folytatás, kihagyás, várólista, hangerő, kilépés és interaktív panel). A panelt a kívánt szöveges csatornában a `/zene panel` paranccsal lehet közzétenni; ezután a panelen kiválasztható a voice-csatorna, kereshető YouTube, beilleszthető link, és vezérelhető a lejátszás. A közvetlen HTTPS hangfolyam forrásdomainjét engedélyezni kell a `NEXA_MUSIC_ALLOWED_HOSTS` környezeti változóban. YouTube-videólinkekhez a build `youtube-dl-exec` csomagja telepíti a `yt-dlp` futtatható állományt. Ha a YouTube a Render szerver kérését blokkolja, a tulajdonos a `YOUTUBE_COOKIES_BASE64` környezeti változóba állíthat be Base64 kódolt, Netscape-formátumú YouTube-cookie-fájlt.

A bot indítása: `npm start`. Az élesítést a Render automatikus telepítése végzi a `main` frissítése után.
