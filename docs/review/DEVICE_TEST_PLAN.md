# Real-device test plan (45 minutes)

**Status: not done. Everything so far ran in headless Chrome on a laptop.** This checklist is for one real Android phone (Chrome) and, if possible, one iPhone (Safari). Tick each box per device and write what you saw. Use a test SIM or Wi-Fi only; never press a real 112 / 108 call to the end (see step 3).

Setup (5 min): start the mock on a laptop on the same Wi-Fi (`npm run mock`), build the app with `VITE_API_URL=http://<laptop-ip>:4000 VITE_DEMO_TOOLS=true`, serve it over HTTPS (a tunnel or a deployed preview; install and notifications need HTTPS), open it on the phone. Sign in `patient@demo.test` / `demo1234`.

| # | Check | Android | iPhone | What to write down |
|---|---|---|---|---|
| 1 | **Install the PWA** (Chrome: Install app; Safari: Share > Add to Home Screen). Opens full screen with the icon and name "HealthTwin" | [ ] | [ ] | Icon sharp? Splash? Status bar colour? |
| 2 | **Layout** at the real screen size: Home, Symptoms, Emergency, Profile, Contacts. No sideways scroll, thumbs reach the main buttons | [ ] | [ ] | Any text cut off? Notch or home-bar overlap? |
| 3 | **Call 112 / 108** button opens the dialer with 112 filled in. Cancel the call in the dialer | [ ] | [ ] | Does it open at once with no network? |
| 4 | **Offline**: switch on airplane mode, open the installed app | [ ] | [ ] | App opens? Saved screens readable? |
| 5 | Offline, press Emergency help > Get help now > Send now | [ ] | [ ] | Does it say "Not sent yet" (never "sent")? Is Call 112 / 108 first? |
| 6 | **SMS fallback**: tap "Tell your contacts by SMS" | [ ] | [ ] | Messages app opens with the text and the contact numbers? Android uses `sms:` with `?body=`, iPhone with `&body=`; note which worked. Text includes a maps link? |
| 7 | Back online: the alert sends by itself | [ ] | [ ] | How many seconds? |
| 8 | **Safety check-in**: Profile > turn on; `/demo` > Simulated fall. Full-screen "Are you OK?" | [ ] | [ ] | Is the beep audible? Does it vibrate (Android yes, iPhone Safari usually no)? Is "I'm OK" easy to hit? |
| 9 | Let the check-in time out: an alert starts, source "Safety check-in" | [ ] | [ ] | Screen stays on? |
| 10 | **Countdown sound and vibration** in a normal emergency (10 s) | [ ] | [ ] | Sound with the ringer off? With the screen locked for 5 s? |
| 11 | **Reminders**: create one 2 minutes ahead, app open | [ ] | [ ] | Alert shown? Sound? |
| 12 | Reminder with the app in a **hidden tab** (switch app for 3 min) | [ ] | [ ] | Fired late or never? (The app says reminders only work while it is open.) |
| 13 | **Notifications**: allow when asked; trigger a hospital-acknowledged event (`/demo` scenario) while the app is in the background | [ ] | [ ] | Notification appears? Tapping opens the right screen? Denied permission handled calmly? |
| 14 | **Location**: Emergency with location consent on, outdoors if possible | [ ] | [ ] | "Using your location" or demo location? Accuracy? Denied permission message? |
| 15 | **Voice** symptom entry in Hindi and Gujarati | [ ] | [ ] | Does the phone have those voices? Are ticked symptoms right? |
| 16 | **QR passport**: Profile > Health passport > create; scan with a second phone's camera | [ ] | [ ] | Opens the responder page? Readable in sunlight (brightness)? Link expires? |
| 17 | **Screen reader** (TalkBack or VoiceOver) on Home and Emergency | [ ] | [ ] | Every button spoken with a name? Order sensible? |
| 18 | **Large text** (system font size to maximum) | [ ] | [ ] | Layout survives? |
| 19 | **Slow network** (data saver or 2G/3G) on Emergency send | [ ] | [ ] | Spinner and "Sending..." not stuck? |
| 20 | **Battery and heat** after 10 minutes of use | [ ] | [ ] | Any drain or heat? |

## Report back

Device, OS and browser version for each phone; the numbers of failed rows; a screenshot or phone video of every failure; anything confusing a non-technical person would trip on. File findings as notes in `docs/RELEASE_CHECKLIST.md` (section "Real devices") and do not change code until the list is reviewed.

## Known limits (do not report as bugs)

Reminders and the check-in only work while the app is open. iPhone Safari does not support vibration and limits web notifications to installed web apps. SMS only opens the Messages app; nothing is sent for the user. All hospital and ambulance activity is simulated.
