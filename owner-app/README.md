# NEXA Owner Center for Windows

A desktop control room for the complete NEXA Bot Owner Center.

## What is inside

- A custom searchable app home with quick links to Owner Center areas.
- Native desktop navigation and keyboard shortcuts.
- Full access to the existing web Owner Center for server, subscription, support, owner access, AI access, audit and system settings.
- The server remains the authority for Discord sign-in and Owner Center permissions. Accounts without Owner Center access cannot open its management pages.
- App-only home and navigation; management actions continue to use the existing secure Owner Center routes and database.

The app does not store a Discord bot token or owner password. It needs an internet connection.

## Build

Requires Node.js 24.

```sh
npm install
npm run start
npm run dist:win
```

The Windows build creates an installer and a portable executable in `dist/`.

## Downloads

Get the latest installer or portable app from the [NEXA Bot GitHub Releases page](https://github.com/matekevin200-oss/NexaBot/releases/latest).
