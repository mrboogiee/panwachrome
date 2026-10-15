/*! Released under MIT License by Luigi Mori. January 2013. MV3 port 2026. */

var panwxmlapi = panwxmlapi || {};

panwxmlapi.requestTimeout = 5000;
panwxmlapi.maxRunningReq = 2;

panwxmlapi.queues = {};

panwxmlapi.origin = function(address, port, proto) {
	var host = (address.indexOf(":") != -1 && address.charAt(0) != "[") ? "["+address+"]" : address;
	return proto+"://"+host+":"+port;
};

// Extract <response>/<result> from the XML document returned by the device.
// Returns a jQuery object wrapping <result>, or a string describing the error.
panwxmlapi.getResult = function(doc) {
	var $r = $(doc).find("response");
	if ($r.length === 0) {
		return "Invalid response from device: missing <response>";
	}
	var status = $r.attr("status");
	if (typeof status != "string") {
		return "Invalid response from device: missing status";
	}
	if (status != "success") {
		// PAN-OS reports errors either in <response><msg> or <response><result><msg>
		var msg = $r.find("msg").map(function() {
			var $line = $(this).children("line");
			return ($line.length ? $line.map(function() { return $(this).text(); }).get().join(" ") : $(this).text());
		}).get().join(" ");
		var code = $r.attr("code");
		return "Request failed ("+(msg || "no message")+(code ? ", code "+code : "")+")";
	}

	return $r.children("result");
};

// One HTTP call to the XML API. Credentials and API key are never put in the
// URL and no browser cookies are sent or stored (credentials: 'omit').
panwxmlapi._call = function(origin, params, key) {
	var promise = new RSVP.Promise();
	var body = new URLSearchParams();
	for (var p in params) {
		body.append(p, params[p]);
	}
	var headers = { "Content-Type": "application/x-www-form-urlencoded" };
	if (key) {
		headers["X-PAN-KEY"] = key;
	}

	var ctrl = new AbortController();
	var timer = setTimeout(function() { ctrl.abort(); }, panwxmlapi.requestTimeout);

	fetch(origin+"/api/", {
		method: "POST",
		headers: headers,
		body: body.toString(),
		credentials: "omit",
		cache: "no-store",
		signal: ctrl.signal
	})
	.then(function(resp) {
		return resp.text().then(function(text) {
			clearTimeout(timer);
			var doc = new DOMParser().parseFromString(text, "application/xml");
			if (doc.getElementsByTagName("parsererror").length > 0 || doc.getElementsByTagName("response").length === 0) {
				promise.reject("Invalid response from device (HTTP "+resp.status+")");
				return;
			}
			promise.resolve(doc);
		});
	})
	.catch(function(err) {
		clearTimeout(timer);
		if (err && err.name == "AbortError") {
			promise.reject("timeout");
		} else {
			// fetch gives no detail; most common cause is an untrusted/invalid TLS certificate
			promise.reject("Cannot connect to "+origin+" (unreachable, blocked, or certificate not trusted by Chrome)");
		}
	});

	return promise;
};

panwxmlapi.keygen = function(username, password, address, port, proto) {
	var promise = new RSVP.Promise();

	panwxmlapi._call(panwxmlapi.origin(address, port, proto), { type: "keygen", user: username, password: password })
	.then(function(doc) {
		var $r = panwxmlapi.getResult(doc);
		if (typeof $r != "object") {
			promise.reject($r);
			return;
		}
		var key = $r.find("key").text();
		if (key === "") {
			promise.reject("Invalid response from device: no key returned");
			return;
		}
		promise.resolve(key);
	}, function(err) { promise.reject(err); });

	return promise;
};

panwxmlapi._sendCmdFromQueue = function(event) {
	var queue = panwxmlapi.queues[event.detail];
	if(queue.numrunning >= panwxmlapi.maxRunningReq) {
		return;
	}
	if(queue.queue.length === 0) {
		return;
	}

	queue.numrunning = queue.numrunning + 1;
	var request = queue.queue.shift();
	var finish = function() {
		queue.numrunning = queue.numrunning - 1;
		queue.triggerDetach("update", { detail: event.detail });
	};

	panwxmlapi._call(panwxmlapi.origin(request.address, request.port, request.proto), request.params, request.key)
	.then(function(doc) {
		finish();

		var $r = panwxmlapi.getResult(doc);
		if (typeof $r != "object") {
			request.promise.reject($r);
			return;
		}
		request.promise.resolve($r);
	}, function(err) {
		finish();

		console.log("XML API cmd error: "+err);
		request.promise.reject(err);
	});
};

panwxmlapi._enqueue = function(params, key, address, port, proto) {
	var qkey = address+":"+port;
	var promise = new RSVP.Promise();

	if(typeof panwxmlapi.queues[qkey] == "undefined") {
		panwxmlapi.queues[qkey] = { queue: [], numrunning: 0 };
		RSVP.EventTarget.mixin(panwxmlapi.queues[qkey]);
		panwxmlapi.queues[qkey].on("update", panwxmlapi._sendCmdFromQueue);
	}
	panwxmlapi.queues[qkey].queue.push({
		params: params,
		key: key,
		address: address,
		port: port,
		proto: proto,
		promise: promise
	});
	panwxmlapi.queues[qkey].triggerDetach("update", { detail: qkey });

	return promise;
};
panwxmlapi.sendOpCmd = function(cmd, key, address, port, proto) {
	return panwxmlapi._enqueue({ type: "op", cmd: cmd }, key, address, port, proto);
};
panwxmlapi.sendConfigCmd = function(action, xpath, key, address, port, proto) {
	return panwxmlapi._enqueue({ type: "config", action: action, xpath: xpath }, key, address, port, proto);
};

// values interpolated into op commands come from the device (vsys names) or are
// fixed strings; escape anyway so a crafted name can't alter the command
panwxmlapi.xmlEscape = function(s) {
	return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

panwxmlapi.getIfsCounters = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd("<show><counter><interface>all</interface></counter></show>", key, address, port, proto);
};
panwxmlapi.getCounterGlobal = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd('<show><counter><global></global></counter></show>', key, address, port, proto);
};
panwxmlapi.getSessionInfo = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd('<show><session><info></info></session></show>', key, address, port, proto);
};
panwxmlapi.getInterfaceAll = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd('<show><interface>all</interface></show>', key, address, port, proto);
};
panwxmlapi.getDPResources = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd('<show><running><resource-monitor></resource-monitor></running></show>', key, address, port, proto);
};
panwxmlapi.getCPResources = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd('<show><system><resources></resources></system></show>', key, address, port, proto);
};
panwxmlapi.getJobs = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd('<show><jobs><all></all></jobs></show>', key, address, port, proto);
};
panwxmlapi.getSystemInfo = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd("<show><system><info></info></system></show>", key, address, port, proto);
};
panwxmlapi.getSessionStateCount = function(key, address, port, proto, state) {
	return panwxmlapi.sendOpCmd("<show><session><all><filter><state>"+panwxmlapi.xmlEscape(state)+"</state><count>yes</count></filter></all></session></show>", key, address, port, proto);
};
panwxmlapi.getSessionApplicationCount = function(key, address, port, proto, application) {
	return panwxmlapi.sendOpCmd("<show><session><all><filter><application>"+panwxmlapi.xmlEscape(application)+"</application><count>yes</count></filter></all></session></show>", key, address, port, proto);
};
panwxmlapi.getSessionDecryptCount = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd("<show><session><all><filter><ssl-decrypt>yes</ssl-decrypt><count>yes</count></filter></all></session></show>", key, address, port, proto);
};
panwxmlapi.getSessionVsysCount = function(key, address, port, proto, vsysname) {
	return panwxmlapi.sendOpCmd("<show><session><all><filter><vsys-name>"+panwxmlapi.xmlEscape(vsysname)+"</vsys-name><count>yes</count></filter></all></session></show>", key, address, port, proto);
};
panwxmlapi.getHardwareInterfaceErrors = function(key, address, port, proto) {
	return panwxmlapi.sendOpCmd("<show><system><state><filter>sys.s1.p*.detail</filter></state></system></show>",
		key, address, port, proto);
};
panwxmlapi.getVsysList = function(key, address, port, proto) {
	return panwxmlapi.sendConfigCmd("get", "/config/devices/entry[@name='localhost.localdomain']/vsys/entry/@name",
		key, address, port, proto);
};

// "show session all filter ... count yes" returns one <member> per DP on older
// releases and a text line ("... match filter: N") on newer ones. Returns an
// array with one number per DP.
panwxmlapi.parseCount = function($result) {
	var members = $.map($result.find('member'), function(x) { return +x.textContent; });
	if (members.length > 0) {
		return members;
	}
	var counts = [];
	var re = /(\d+)\s*$/gm;
	var text = $result.text();
	var m;
	while ((m = re.exec(text)) !== null) {
		counts.push(+m[1]);
	}
	return counts;
};
