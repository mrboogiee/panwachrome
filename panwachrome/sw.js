/* Pan(w)achrome service worker.
 *
 * The monitoring engine needs a DOM (XML parsing, jQuery, IndexedDB timers) and has to keep running
 * while no UI page is open, so it lives in an offscreen document (reason DOM_PARSER). This worker only
 * owns what the offscreen document cannot do: create it, show notifications, set the toolbar badge and
 * open the device list.
 */

const OFFSCREEN_URL = "offscreen.html";
const BADGE_COLOR = "#9db93f";

async function ensureEngine() {
	const contexts = await chrome.runtime.getContexts({
		contextTypes: ["OFFSCREEN_DOCUMENT"],
		documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
	});
	if (contexts.length > 0) {
		return;
	}
	try {
		await chrome.offscreen.createDocument({
			url: OFFSCREEN_URL,
			reasons: ["DOM_PARSER"],
			justification: "Parse the XML returned by the PAN-OS XML API and keep the polling engine running while no page is open."
		});
	} catch (e) {
		// a concurrent call may have created it first
		if (!String(e).includes("Only a single offscreen")) {
			throw e;
		}
	}
}

function setBadge(text) {
	chrome.action.setBadgeText({ text: text });
	chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
}

function notify(msg) {
	const id = msg.id || ("Info@" + Date.now());
	const options = {
		type: "basic",
		iconUrl: "images/icon_paper_128.png",
		title: msg.title,
		message: msg.message,
		priority: 0
	};
	if (msg.filterButton) {
		options.buttons = [{ title: "Don't show this job again" }];
	}
	chrome.notifications.create(id, options, function(nid) {
		setTimeout(function() { chrome.notifications.clear(nid); }, (msg.timeout || 5) * 1000);
	});
}

chrome.runtime.onMessage.addListener(function(msg, sender) {
	if (sender.id !== chrome.runtime.id || msg.target !== "sw") {
		return;
	}
	if (msg.cmd === "notify") notify(msg);
	if (msg.cmd === "badge") setBadge(msg.text);
});

chrome.notifications.onButtonClicked.addListener(function(nid) {
	// ids look like Job@<id>@<type>; the job type may itself contain '@'
	if (!nid.startsWith("Job@")) {
		return;
	}
	const jobtype = nid.split("@").slice(2).join("@");
	chrome.runtime.sendMessage({ target: "engine", cmd: "filterjob", jobtype: jobtype }).catch(function() {});
});

chrome.action.onClicked.addListener(function() {
	chrome.tabs.create({ url: chrome.runtime.getURL("monitorlist.html"), active: true });
});

chrome.runtime.onInstalled.addListener(function() { ensureEngine(); setBadge("0"); });
chrome.runtime.onStartup.addListener(function() { ensureEngine(); setBadge("0"); });
// the worker is restarted by events; make sure the engine is there whenever it wakes up
ensureEngine();
