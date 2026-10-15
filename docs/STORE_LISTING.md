# Chrome Web Store listing notes

## Single purpose

Monitor Palo Alto Networks PAN-OS firewalls through their XML API.

## Permission justifications

- `offscreen`: runs the polling engine in an offscreen document with reason DOM_PARSER. The XML API returns XML that must be parsed with DOMParser, which a service worker does not have, and polling must continue while no extension page is open.
- `notifications`: shows a notification when a job (commit, install, etc.) finishes on a monitored device.
- Optional host permissions (`https://*/*`, `http://*/*`): requested at runtime, one origin at a time, only for the device address the user enters. Needed to call that device's XML API. The extension has no host access at install time.

## Privacy practices tab

- Data collected: authentication information (the device credentials the user types, used once and not stored) and website content/web history: none. Everything stays on the device running the browser.
- Certify: data is not sold, not used for unrelated purposes, not used for creditworthiness or lending.
- Privacy policy URL: publish `docs/PRIVACY.md` (for example via GitHub Pages or the raw repository URL).

## Listing text

Name: Pan(w)achrome
Short description: Monitor Palo Alto Networks PAN-OS firewalls via the XML API: traffic, sessions, resources and counters.
Add the disclaimer to the long description: "Not affiliated with or endorsed by Palo Alto Networks."

## Assets still needed

- At least one screenshot, 1280x800 or 640x400.
- Small promo tile 440x280 (`panwachrome/images/logo_webstore.png` is only 128x128, so a new one is needed).
- Developer account, one-time registration fee, verified contact email.
- Consider a different extension name if Palo Alto Networks objects to "Pan" in the name (impersonation and trademark policies).
