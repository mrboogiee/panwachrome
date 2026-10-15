# Pan(w)achrome

Chrome extension (Manifest V3) for monitoring Palo Alto Networks PAN-OS firewalls and Panorama through the XML API: interface traffic, sessions, data plane and management plane resources, global counters and job notifications.

Originally written by Luigi Mori for PAN-OS 4.x to 7.x (see https://github.com/jtschichold/stratachrome for the version described in the book Mastering Palo Alto Networks). This fork ports it to Manifest V3 and to current PAN-OS releases.

This project is not affiliated with or endorsed by Palo Alto Networks. PAN-OS and Palo Alto Networks are trademarks of their owner.

## Install without the Web Store

Works in any Chromium-based browser at version 116 or later (Chrome, Chromium, Edge, Brave, Vivaldi, Opera).

1. Get the code: `git clone` this repository, or download it as a zip and unpack it.
2. Open the extensions page: `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`, Vivaldi: `vivaldi://extensions`, Opera: `opera://extensions`).
3. Turn on Developer mode (toggle in the top right, or bottom left in Edge).
4. Click "Load unpacked" and select the `panwachrome` subdirectory (the one that contains `manifest.json`, not the repository root).
5. Pin the Pan(w)achrome icon from the puzzle-piece menu. Click it to open the device list, then "+ Add device" and enter protocol, address, port, username and password. Chrome asks you to approve access to that one device address.

Notes:

- The extension stays installed across browser restarts. Chrome may show a "Disable developer mode extensions" prompt at startup on some platforms; dismiss it and leave the extension enabled.
- After you pull or edit code, click the reload icon on the extension card. Monitored devices are kept in memory only, so you must add them again after a reload or browser restart.
- To debug, click "service worker" on the extension card for the worker, or open `chrome://extensions` > Details > Inspect views > `offscreen.html` for the polling engine.
- Optional packaged install: run `make` to build `panwachrome.zip`. Recent Chrome versions refuse to install a .crx or zip from outside the Web Store on Windows and macOS, so "Load unpacked" is the reliable route. Managed environments can instead force-install a self-hosted, signed .crx through enterprise policy (`ExtensionInstallForcelist`).

Build the Web Store package with `make` (creates `panwachrome.zip`).

## Requirements on the firewall

- PAN-OS 9.0 or later (the API key is sent in the `X-PAN-KEY` header). Tested only against the response formats documented below, see "Status".
- An administrator that may use the XML API (admin role with XML API enabled for Operational Requests and Configuration, or superuser read-only). SAML/MFA-only admins cannot generate an API key; use a local or RADIUS/LDAP admin or a dedicated API account.
- The management certificate must be trusted by Chrome. Chrome extensions cannot bypass certificate errors, so a self-signed certificate must be installed in the OS trust store.
- The management interface must be reachable from the browser's machine.

## What changed in this port

- Manifest V3. The polling engine runs in an offscreen document (it needs a DOM for XML parsing and keeps polling while no page is open); a small service worker handles notifications, the badge and the toolbar click. UI pages talk to the engine with runtime messages.
- Host access is requested per device (optional host permissions) instead of `https://*/*` at install time. No `tabs`, `webRequest` or `unlimitedStorage` permission.
- The content script that read credentials from the PAN-OS login page is removed. Devices are added from the "Add device" page.
- API calls use POST, the key travels in a header rather than the URL, and no cookies are sent or stored.
- `show system resources` parsing handles the older `top` layouts and the `MiB Mem` layout of recent PAN-OS releases.
- Session count parsing accepts both the per-DP member list and the text form.
- Device-supplied strings are HTML-escaped before display.

## Status

There was no PAN-OS 10/11/12 device available during the port, so the code was checked statically and against sample `top` output only. Please test against a real device and report what does not parse. Known limits:

- API keys and the device list are kept in memory only (as before). They are lost when the browser restarts.
- jQuery 1.8.3 and Flot 0.7 are still bundled. They run only on extension pages with the default MV3 content security policy.
- Per-DP session counts depend on the output format of `show session all filter ... count yes`; the text fallback is untested.

## Docs

- [Privacy policy](docs/PRIVACY.md)
- [Web Store listing notes and permission justifications](docs/STORE_LISTING.md)

License: MIT (see `panwachrome/LICENSE`).
