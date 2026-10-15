# Privacy policy

Pan(w)achrome monitors PAN-OS devices that you add yourself.

## What the extension handles

- Device address, port and protocol that you enter.
- The username and password you enter when adding a device. They are sent once, over the protocol you chose, to the device you specified, to request an API key. They are not stored.
- The API key returned by the device. It is kept in memory only and is discarded when the browser closes or the extension reloads.
- Statistics returned by the device (interfaces, sessions, resources, counters, jobs). They are kept in the browser's IndexedDB for the current browser session and deleted at the next start.
- Settings (polling intervals, timeouts, filtered job types), stored in the extension's local storage.

## What it does not do

- No data is sent to the developer or any third party. The only network destinations are the devices you add.
- No analytics, telemetry, advertising or remote code.
- No browser cookies are sent to or stored from the devices.
- It does not read web pages you visit.

## Contact

Open an issue in the repository.
