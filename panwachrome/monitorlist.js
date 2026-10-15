/* Released under MIT License by Luigi Mori. January 2013. MV3 port 2026. */

(function(d,w,u) {
	var refreshInterval;
	var esc = bridge.escapeHtml;

	var removeDevice = function() {
		var serial = $(this).parent().parent().attr('data-dserial');
		bridge.call('remove', { serial: serial });
	};
	var openDeviceStats = function() {
		var serial = $(this).parent().attr('data-dserial');
		w.location.href = chrome.runtime.getURL("stats.html")+"?d="+encodeURIComponent(serial);
	};
	var createDeviceRow = function(dev) {
		var $table = $('#device-table');

		var desc = "Not monitored";
		if(dev.polling) {
			desc = "Monitored";
			if(dev.pendingJobs > 0) desc = desc + ", " + dev.pendingJobs + " pending Jobs";
		}

		var lastpoll = "N/A";
		if(dev.lastPoll)
			lastpoll = new Date(dev.lastPoll).toLocaleString();

		var ihtml = [];
		ihtml.push('<tr data-dserial="'+esc(dev.serial)+'">');
		ihtml.push('<td class="device-table-link">'+esc(dev.hostname)+'</td>');
		ihtml.push('<td class="device-table-link">'+esc(dev.serial)+'</td>');
		ihtml.push('<td class="device-table-link">'+esc(dev.address)+'</td>');
		ihtml.push('<td>'+esc(desc)+'</td>');
		ihtml.push('<td>'+esc(lastpoll)+'</td>');
		ihtml.push('<td class="device-table-tools"><a href="#" class="device-table-delete">remove</a></td>');
		ihtml.push('</tr>');

		$table.append(ihtml.join(''));
	};
	var createMessageRow = function(msg) {
		$('#device-table').append('<tr><td>'+esc(msg)+'</td></tr>');
	};
	var displayTabInfo = function() {
		bridge.call('getmonitored').then(function(response) {
			var $table = $('#device-table');
			$table.empty();
			$table.html('<tr id="device-table-header"><th>Name</th><th>Serial</th><th>Address</th><th>Status</th><th>Last Poll</th><th>&nbsp;</th></tr>');
			if (response.result.length === 0) {
				createMessageRow("No monitored devices");
				return;
			}
			for(var j = 0; j < response.result.length; j++) {
				createDeviceRow(response.result[j]);
			}
		}, function(err) {
			$('#device-table').empty();
			createMessageRow(err);
		});
	};

	var onmessage = function(msg, sender) {
		if (sender.id === chrome.runtime.id && msg.target === "ui" && msg.cmd === "deviceschanged") {
			displayTabInfo();
		}
	};
	chrome.runtime.onMessage.addListener(onmessage);
	w.addEventListener("beforeunload", function() {
		chrome.runtime.onMessage.removeListener(onmessage);
		clearInterval(refreshInterval);
	});

	displayTabInfo();
	refreshInterval = setInterval(displayTabInfo, 30*1000);

	$('#device-table').on('click', '.device-table-link', openDeviceStats);
	$('#device-table').on('click', '.device-table-delete', removeDevice);
	$('#open-options').on('click', function(e) { e.preventDefault(); chrome.runtime.openOptionsPage(); });
})(document,window);
