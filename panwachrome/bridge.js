/* Access to the monitoring engine for the UI pages.
 *
 * The engine runs in the offscreen document. UI pages ask it for data with runtime messages and get
 * "deviceevent" broadcasts when a view changes. Stats history is read straight from IndexedDB
 * (same extension origin), see panwstatsdb.js.
 */

var bridge = bridge || {};

// send a command to the engine; resolves with the response, rejects with an error string
bridge.call = function(cmd, params, attempt) {
	attempt = attempt || 0;
	var promise = new RSVP.Promise();
	var msg = { target: "engine", cmd: cmd };
	for (var p in (params || {})) {
		msg[p] = params[p];
	}

	chrome.runtime.sendMessage(msg).then(function(response) {
		if (response && response.error) {
			promise.reject(response.error);
		} else if (response) {
			promise.resolve(response);
		} else {
			throw new Error("no response");
		}
	}).catch(function(err) {
		// the engine may still be starting (service worker just woke up), retry a few times
		if (attempt < 5) {
			setTimeout(function() {
				bridge.call(cmd, params, attempt+1).then(function(r) { promise.resolve(r); }, function(e) { promise.reject(e); });
			}, 500);
			return;
		}
		promise.reject("Monitoring engine not available");
	});

	return promise;
};

bridge.reviveDates = function(obj) {
	if (obj && typeof obj == "object") {
		for (var k in obj) {
			if (k == "lastPoll" && typeof obj[k] == "string") {
				obj[k] = new Date(obj[k]);
			} else if (typeof obj[k] == "object") {
				bridge.reviveDates(obj[k]);
			}
		}
	}
	return obj;
};

// Local mirror of a monitored device. Same shape and events ("xxxview:update") the stats page used
// when it shared memory with the background page.
bridge.openDevice = function(serial) {
	var promise = new RSVP.Promise();

	bridge.call("getdevice", { serial: serial }).then(function(response) {
		var mdevice = bridge.reviveDates(response.result);
		RSVP.EventTarget.mixin(mdevice);
		mdevice.statsdb = new panwstatsdb.StatsDb(serial);
		mdevice.refresh = function(view) { return bridge.call("updateview", { serial: serial, view: view }); };

		var listener = function(msg, sender) {
			if (sender.id !== chrome.runtime.id || msg.target !== "ui" || msg.serial !== serial) {
				return;
			}
			if (msg.cmd == "deviceevent") {
				var fields = bridge.reviveDates(msg.fields);
				for (var k in fields) {
					mdevice[k] = fields[k];
				}
				mdevice.triggerDetach(msg.event, { detail: serial });
			}
			if (msg.cmd == "devicedeleted") {
				window.close();
			}
		};
		chrome.runtime.onMessage.addListener(listener);
		mdevice.close = function() { chrome.runtime.onMessage.removeListener(listener); };

		mdevice.statsdb.open().then(function() { promise.resolve(mdevice); }, function(err) { promise.reject(err); });
	}, function(err) { promise.reject(err); });

	return promise;
};

bridge.getConfig = function() {
	var tracking = parseInt(localStorage.getItem('trackingInterval'), 10);
	return { trackingInterval: (isNaN(tracking) ? 30 : tracking) };
};

bridge.escapeHtml = function(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
};
