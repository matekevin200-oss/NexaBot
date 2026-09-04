# NexaBot

Gombos Discord ügyintéző és moderációs bot a NexaDev szerverhez.

## Funkciók

- ticket, segítségkérés és rendelés
- üdvözlés és automatikus rang
- figyelmeztetés, némítás és kirúgás
- naplózás
- jelentkezési rendszer elfogadás/elutasítás gombokkal
- szöveges és hangcsatorna létrehozása
- egyszeri `/telepites` parancs a teljes szerverrendszer elkészítéséhez

## Biztonság

A Discord bot tokenjét soha ne töltsd fel a GitHubra. A tokent kizárólag a Render `DISCORD_TOKEN` titkos környezeti változójában add meg.

## Indítás

```bash
npm ci
npm start
```

A bot indulás után regisztrálja a `/telepites` parancsot a beállított Discord-szerveren.
