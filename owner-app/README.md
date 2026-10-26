# NEXA Owner Center for Windows

A small Windows desktop client that opens only the NEXA Owner Center.

## Access

Sign in with Discord inside the app. The NEXA server checks the signed-in Discord account against the existing Owner Center access list. Only accounts with Owner Center access can use the dashboard. Adding or removing an account remains controlled from the existing Owner Center.

The desktop client contains no Discord bot token, database password, or copied owner credentials. Downloading the installer does not grant access.

## Build

Requires Node.js 24.

```sh
npm install
npm run start
npm run dist:win
```

The Windows build creates an installer and a portable executable in `dist/`.

## Downloads

The latest Windows installer and portable executable are published on the [NEXA Bot GitHub Releases page](https://github.com/matekevin200-oss/NexaBot/releases/latest).
