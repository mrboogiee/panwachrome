// Released under MIT License by Luigi Mori. January 2013. MV3 port 2026.

(function(d,w,u) {
	var msg;
	var form;

	var displayMessage = function(m) {
		msg.textContent = m;
		msg.style.display = "block";
		form.style.display = "none";
	};
	var displayError = function(e) {
		msg.textContent = "Error: "+e+" ";
		var a = d.createElement("a");
		a.href = "#";
		a.textContent = "Retry";
		a.addEventListener('click', function(ev) { ev.preventDefault(); msg.style.display = "none"; form.style.display = "block"; });
		msg.appendChild(a);
		msg.style.display = "block";
		form.style.display = "none";
	};
	var originPattern = function(proto, address) {
		var host = (address.indexOf(":") != -1 && address.charAt(0) != "[") ? "["+address+"]" : address;
		return proto+"://"+host+"/*";
	};
	var addMonitoredDevice = function(ev) {
		ev.preventDefault();

		var proto = d.querySelector('#proto').value;
		var address = d.querySelector('#address').value.trim();
		var port = d.querySelector('#port').value.trim();
		var u = d.querySelector('#username').value;
		var p = d.querySelector('#password').value;

		if (address === "" || !/^[0-9]+$/.test(port) || u === "" || p === "") {
			displayError("Address, a numeric port, username and password are required");
			return;
		}
		if (/[\/?#@\s]/.test(address)) {
			displayError("Address must be a plain hostname or IP address");
			return;
		}

		// The extension only gets access to the devices the user adds. This call must be made
		// straight from the click handler (user gesture).
		chrome.permissions.request({ origins: [originPattern(proto, address)] }, function(granted) {
			if (!granted) {
				displayError("Access to "+address+" was not granted");
				return;
			}
			displayMessage("Checking credentials...");
			bridge.call('add', { proto: proto, address: address, port: port, user: u, password: p }).then(function(r) {
				msg.textContent = r.result+". ";
				if (r.serial) {
					var a = d.createElement("a");
					a.href = chrome.runtime.getURL('stats.html')+'?d='+encodeURIComponent(r.serial);
					a.textContent = "Show";
					msg.appendChild(a);
				}
			}, function(err) {
				displayError(err);
			});
		});
	};
	var setup = function() {
		var params = URI.parseQuery(URI(d.location.href).query());

		msg = d.querySelector("#loginmessage");
		form = d.querySelector("#loginform");

		if (params.p == "http" || params.p == "https") d.querySelector('#proto').value = params.p;
		if (params.a) d.querySelector('#address').value = params.a;
		if (params.dp) d.querySelector('#port').value = params.dp;

		d.querySelector('#proto').addEventListener('change', function() {
			var port = d.querySelector('#port');
			if (port.value == "80" || port.value == "443") port.value = (this.value == "http" ? "80" : "443");
		});
		d.querySelector('#loginbtn').addEventListener('click', addMonitoredDevice);
	};

	setup();
})(document,window);
