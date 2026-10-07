# NEXA Bot 15.3.0 — Calm Horizon

This release keeps the complete feature set and upgrades the web control experience without resetting existing server configuration.

## Calm Horizon interface
- Replaces the blue-neon palette with calm graphite, sage and champagne tones.
- Wider desktop workspace, clearer sidebar groups, separated control cards and stronger active-location feedback.
- Rebuilt Subscription Center with a visible server → plan → secure payment flow.
- Responsive server selector, full plan feature cards and collapsible Stripe diagnostics.

## Web Control Center
- Dedicated server routes: Overview, Moderation, Automod, Welcome, Ticket, Logs, Reaction Role, Auto Role, Level, Custom Commands, Giveaway, NEXA AI, Security, Server Stats and Settings.
- Server switcher in the sidebar.
- Searchable navigation with Ctrl/Cmd + K focus.
- Active page indicator, control ribbon and responsive mobile drawer.
- English remains the default UI language; Hungarian remains selectable.
- Subscription naming is used instead of Prices/Pricing in navigation.
- New desktop-first Calm Horizon visual system and an account/profile popover.
- Dedicated Profile page with Discord identity, access tier, manageable servers and account-security status.
- English/Hungarian language preference is stored persistently and restored on the next OAuth login.

## Safe configuration editing
- Focused pages still submit the full server configuration so hidden modules are never accidentally reset.
- Unsaved settings are kept as a session draft for up to two hours.
- Validation preserves entered values, opens the relevant page and focuses the invalid field.
- Successful saves return to the page the operator was editing.

## Live Support Bridge
- Discord controls: Claim, Pending, Close and Reopen.
- Discord staff replies are reflected on the web automatically.
- Web polling runs every 1.8 seconds.
- Status changes no longer force a browser reload.
- The web reply composer opens/closes in place as the ticket state changes.

## Owner Center
- Access remains restricted to BOT_OWNER_ID and explicitly authorized Owner operators.
- Server cards keep Discord server-owner display name/username and user ID.
- Support Operations remains isolated from normal server management.

## Restart safety and payments
- Render restarts run a read-only audit of the official Support server.
- Startup never recreates, renames or overwrites Discord roles, channels or panels.
- Repairs remain explicit owner actions through `/support-szerver javitas` or the other setup commands.
- Stripe Readiness calls Stripe server-side and verifies active recurring EUR Prices, exact plan amounts, billing intervals and Test/Live consistency without exposing secret values.
- A completed Checkout Session is authenticated again on return and can safely activate the subscription even if webhook delivery is delayed.
- Discord guild, buyer, selected plan and billing cycle metadata must all match before activation.
- Persistent PostgreSQL health is shown before accepting production subscriptions.
- Checkout buttons show an immediate loading state while Stripe opens.
- Checkout is started through an authenticated JSON request and performs a direct browser navigation to the verified Stripe URL.
- Errors and 30-second timeouts are shown beside the selected plan instead of failing silently.
- The CSP explicitly allows Stripe Checkout and Customer Portal destinations as a no-JavaScript fallback.

## Verification
- `node --check index.js` passes.
- 22/22 automated tests pass.
