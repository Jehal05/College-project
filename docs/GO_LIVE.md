# Going live: the real parts of the demo

Everything here is free. The only thing that stays simulated is the ambulance, the hospitals' replies, the patients' contacts and 112/108. **No real emergency service is ever contacted.** Every real message starts with "HEALTHTWIN DEMO (fictional patient, nobody is really hurt, do NOT call 112)".

| Real part | What it does | Needs |
|---|---|---|
| Saved data | Alerts, passports, consents and an event log go into a SQLite file and survive a restart | Node 22.5 or newer (built in, no package). Turns itself off with a note on older Node |
| Phone alerts | At SOS, hospital acknowledged, ambulance dispatched, arrived and cancelled, your two phones get a message | One of ntfy, Telegram, Twilio (below) and internet on the laptop |
| Live stream | The patient phone sends its real GPS and strap heart rate to the hospital screen while the alert is open | Location and vitals consent, browser location permission; strap is optional |
| Pop-up on a second device | The portal shows a system notification when its tab is in the background | Open the portal on the other device, tap "Allow pop-up alerts" |

## 1. Saved data (nothing to do)

Start the demo with `npm run one`. The file is `mock-server/data/healthtwin.db` (ignored by git). The start page says whether it is on. After a restart the earlier alerts are back; an alert that was still open when the server stopped is closed and marked "interrupted" because its timeline cannot continue. **Reset demo** wipes the file. Passwords of the five demo logins are new at every start, so everyone signs in again; the saved passport links keep working.
Turn it off with `PERSIST=off`. Choose another file with `DB_FILE=...`.

## 2. Phone alerts (pick at least one, ntfy takes 2 minutes)

Copy `mock-server/live.config.example.json` to `mock-server/live.config.json` and fill in what you use. That file is ignored by git. **Never commit it, never paste keys or numbers into chat or an issue.** At most 2 recipients per channel are used (Puneet and Jehal).

**ntfy (push app, no account).** Install the free "ntfy" app on both phones, subscribe to a topic name that nobody can guess (at least 12 characters, for example `healthtwin-` plus random letters), and put the same name in `ntfy.topic`. Anyone who knows the topic can read the messages, so keep it private and do not put patient details in it (the messages hold only the fictional name and the alert type).

**Telegram (free bot).** In Telegram talk to `@BotFather`, send `/newbot`, copy the token into `telegram.bot_token`. Each of you opens the bot and sends it any message. Then open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and copy the number after `"chat":{"id":` into `telegram.chat_ids`.

**Twilio SMS (optional).** A free trial account sends only to numbers you verified in the Twilio console, and every trial SMS carries a "Sent from a Twilio trial account" prefix. Put the account SID, token, your Twilio number and your two verified numbers in `twilio`. SMS to Indian numbers can be delayed or blocked by carrier rules, so treat ntfy or Telegram as the main route and SMS as a bonus. Not tested from the build sandbox.

The same values can come from environment variables instead: `NTFY_TOPIC`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `TWILIO_TO`.

Check it: open `http://localhost:4000/start` on the laptop, read the "Phone alerts" line and press **Send a test message to the team phones**.

Safety limits built in: the patients' own (fictional) contact numbers are never used; at most 20 messages a minute; each step of an alert is sent once; a failing phone service never slows the alert; no secret or number is logged or sent to the apps.

## 3. Live location and heart rate

While an alert is open (after SOS until the hand-over), the patient screen shows **Live sharing with the hospital**. It sends the real GPS position and, if a Bluetooth strap is connected, the real heart rate about every 2 seconds. The portal's alert detail shows a green **Live from patient phone** card with a map and the strap heart rate. After 15 seconds without an update it says so instead of showing an old number as current.

- Location needs the location consent, heart rate needs the vitals consent. The server also refuses data without consent.
- **Stop sharing** ends it at once; the portal then says the patient stopped sharing.
- Only the patient who owns the alert can send; other patients' phones never receive it.
- In "practice location" mode the real position is not sent.
- The phone browser needs a secure address for GPS on a real phone (https or localhost). Over plain `http://<laptop-ip>:4000` many phones refuse GPS and Bluetooth. Use a free tunnel such as Cloudflare Tunnel or ngrok, or test GPS on the laptop itself.
- The ambulance on the map is still simulated and does not chase the live position.

## 4. Second device

Open `http://<laptop-ip>:4000/portal/` on another phone or laptop, sign in as staff, tap **Allow pop-up alerts**. When an alert arrives and that tab is in the background you get a system notification. Browsers show these only on a secure address or localhost, and some phones only after "Add to home screen". Try it before the jury.

## What has and has not been tested

Offline tests (no internet, no phone) cover the saving, restore, notification messages with a fake network, the live stream rules and the portal's handling. **Not tested from the build sandbox:** a real ntfy, Telegram or Twilio delivery, a real GPS or strap on a phone, the notification pop-up, and the full `npm run one` run. Do a rehearsal with `docs/DEMO_SCRIPT.md` before presenting and tell us what breaks.
