(function(exports) {

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion

//#region solid-js/web
var require_web = __commonJS({ "solid-js/web"(exports, module) {
	module.exports = shelter.solidWeb;
} });

//#endregion
//#region plugins/profile-theming/Settings.tsx
var import_web = __toESM(require_web(), 1);
var import_web$1 = __toESM(require_web(), 1);
var import_web$2 = __toESM(require_web(), 1);
var import_web$3 = __toESM(require_web(), 1);
var import_web$4 = __toESM(require_web(), 1);
var import_web$5 = __toESM(require_web(), 1);
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div><!#><!/><!#><!/></div>`, 6), _tmpl$2 = /*#__PURE__*/ (0, import_web.template)(`<div></div>`, 2);
const { Header, HeaderTags, Button, ButtonColors, ButtonSizes, Text } = shelter.ui;
const { createSignal, onCleanup } = shelter.solid;
const { store: store$1 } = shelter.plugin;
function randomState() {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function checkToken() {
	if (!store$1.authToken) return { valid: false };
	const data = await wsVerify(store$1.authToken);
	if (!data.valid || data.expired) store$1.authToken = undefined;
	return data;
}
async function uploadAvatar(userId, file) {
	const form = new FormData();
	form.append("avatar", file);
	const res = await fetch(`${API_BASE}/avatars/${userId}`, {
		method: "POST",
		body: form,
		headers: { Authorization: `Bearer ${store$1.authToken}` }
	});
	if (res.ok) {
		invalidateUser(userId);
		return "ok";
	}
	if (res.status === 401) {
		store$1.authToken = undefined;
		return "expired";
	}
	return "failed";
}
const settings = () => {
	const [loggedIn, setLoggedIn] = createSignal(!!store$1.authToken);
	const [loggingIn, setLoggingIn] = createSignal(false);
	let fileInput;
	let pollTimer;
	if (store$1.authToken) checkToken().then((result) => {
		if (!result.valid) {
			setLoggedIn(false);
			shelter.ui.showToast({
				title: "Invalid session, please log in again",
				duration: 3e3
			});
		} else if (result.expired) {
			setLoggedIn(false);
			shelter.ui.showToast({
				title: "Session expired, please log in again",
				duration: 3e3
			});
		}
	});
	onCleanup(() => {
		if (pollTimer) clearInterval(pollTimer);
	});
	const login = () => {
		const state = randomState();
		setLoggingIn(true);
		window.open(`${API_BASE}/auth/discord?state=${state}`);
		pollTimer = setInterval(async () => {
			try {
				const res = await fetch(`${API_BASE}/auth/token?state=${state}`);
				if (!res.ok) return;
				const data = await res.json();
				if (data.token) {
					clearInterval(pollTimer);
					pollTimer = undefined;
					store$1.authToken = data.token;
					setLoggedIn(true);
					setLoggingIn(false);
					shelter.ui.showToast({
						title: "Logged in",
						duration: 2e3
					});
				}
			} catch {}
		}, 2e3);
	};
	const logout = () => {
		store$1.authToken = undefined;
		setLoggedIn(false);
		shelter.ui.showToast({
			title: "Logged out",
			duration: 2e3
		});
	};
	const pickFile = () => {
		fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = "image/*";
		fileInput.onchange = async () => {
			const file = fileInput?.files?.[0];
			if (!file) return;
			const userId = store$1.userId?.trim();
			if (!userId) {
				shelter.ui.showToast({
					title: "no user id found",
					duration: 3e3
				});
				return;
			}
			const result = await uploadAvatar(userId, file);
			if (result === "expired") {
				setLoggedIn(false);
				shelter.ui.showToast({
					title: "Session expired, please log in again",
					duration: 3e3
				});
				return;
			}
			shelter.ui.showToast({
				title: result === "ok" ? "Avatar uploaded, it will appear once processing is done" : "Upload failed",
				duration: 3e3
			});
		};
		fileInput.click();
	};
	return [
		(0, import_web$5.createComponent)(Header, {
			get tag() {
				return HeaderTags.H3;
			},
			children: "Discord Login"
		}),
		(0, import_web$5.createComponent)(Text, { get children() {
			return (0, import_web$4.memo)(() => !!loggingIn())() ? "Waiting for login..." : loggedIn() ? "Logged in" : "Not logged in";
		} }),
		(() => {
			const _el$ = (0, import_web$1.getNextElement)(_tmpl$), _el$2 = _el$.firstChild, [_el$3, _co$] = (0, import_web$2.getNextMarker)(_el$2.nextSibling), _el$4 = _el$3.nextSibling, [_el$5, _co$2] = (0, import_web$2.getNextMarker)(_el$4.nextSibling);
			_el$.style.setProperty("margin-top", "8px");
			_el$.style.setProperty("display", "flex");
			_el$.style.setProperty("gap", "8px");
			_el$.style.setProperty("justify-content", "space-between");
			(0, import_web$3.insert)(_el$, (() => {
				const _c$ = (0, import_web$4.memo)(() => !!loggedIn());
				return () => _c$() ? (0, import_web$5.createComponent)(Button, {
					onClick: logout,
					get size() {
						return ButtonSizes.MEDIUM;
					},
					get color() {
						return ButtonColors.RED;
					},
					children: "Logout"
				}) : (0, import_web$5.createComponent)(Button, {
					onClick: login,
					get size() {
						return ButtonSizes.MEDIUM;
					},
					get color() {
						return ButtonColors.BRAND;
					},
					get disabled() {
						return loggingIn();
					},
					grow: true,
					children: "Login with Discord"
				});
			})(), _el$3, _co$);
			(0, import_web$3.insert)(_el$, (0, import_web$5.createComponent)(Button, {
				onClick: pickFile,
				get size() {
					return ButtonSizes.MEDIUM;
				},
				get color() {
					return ButtonColors.BRAND;
				},
				get disabled() {
					return !loggedIn();
				},
				grow: true,
				children: "Upload Avatar"
			}), _el$5, _co$2);
			return _el$;
		})(),
		(() => {
			const _el$6 = (0, import_web$1.getNextElement)(_tmpl$2);
			_el$6.style.setProperty("margin-top", "16px");
			_el$6.style.setProperty("margin-bottom", "16px");
			_el$6.style.setProperty("display", "flex");
			_el$6.style.setProperty("gap", "8px");
			(0, import_web$3.insert)(_el$6, (0, import_web$5.createComponent)(Button, {
				onClick: clearCache,
				get size() {
					return ButtonSizes.MEDIUM;
				},
				get color() {
					return ButtonColors.RED;
				},
				children: "Reset cache"
			}));
			return _el$6;
		})()
	];
};

//#endregion
//#region plugins/profile-theming/index.ts
const { plugin: { scoped, store } } = shelter;
const CDN_BASE = "https://discordcdn.mapetr.moe";
const API_BASE = "https://api.discordcdn.mapetr.moe";
const WS_URL = "wss://api.discordcdn.mapetr.moe/avatars/ws";
const PING_INTERVAL = 3e4;
const MAX_RECONNECT_DELAY = 3e4;
const cache = new Map();
let synced = false;
const replacedElements = new Map();
let ws = null;
let pingTimer;
let reconnectTimer;
let reconnectDelay = 1e3;
const pendingCallbacks = new Map();
function wsSend(msg) {
	if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function clearCache() {
	cache.clear();
	synced = false;
	refreshNow();
}
function invalidateUser(userId) {
	for (const [el] of replacedElements) {
		if (!el.isConnected) continue;
		const url = getAvatarUrl(el);
		if (!url) continue;
		const id = isOurUrl(url) ? url.match(/\/avatars\/(\d+)/)?.[1] ?? null : extractUserId(url);
		if (id === userId) applyAvatar(userId, el);
	}
}
function wsVerify(token) {
	return new Promise((resolve) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			resolve({ valid: false });
			return;
		}
		pendingCallbacks.set("verify", (msg) => {
			resolve({
				valid: msg.valid,
				expired: msg.expired,
				userId: msg.userId,
				expiresAt: msg.expiresAt
			});
		});
		wsSend({
			type: "verify",
			token
		});
	});
}
function wsCheck(ids) {
	return new Promise((resolve) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			resolve({});
			return;
		}
		pendingCallbacks.set("check", (msg) => {
			resolve(msg.available ?? {});
		});
		wsSend({
			type: "check",
			ids
		});
	});
}
function avatarUrl(userId, hash) {
	return `${CDN_BASE}/avatars/${userId}?h=${hash}`;
}
function extractUserId(src) {
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];
	return null;
}
function isOurUrl(src) {
	return src.startsWith(`${CDN_BASE}/`);
}
function getAvatarUrl(el) {
	if (el instanceof HTMLImageElement) return el.src;
	const bg = el.style.backgroundImage;
	const match = bg?.match(/url\(["']?(.+?)["']?\)/);
	return match ? match[1] : null;
}
function setAvatarUrl(el, url) {
	if (el instanceof HTMLImageElement) el.src = url;
else el.style.backgroundImage = `url("${url}")`;
}
function applyAvatar(userId, el) {
	const currentUrl = getAvatarUrl(el);
	const hash = cache.get(userId);
	if (!hash) {
		if (currentUrl && isOurUrl(currentUrl)) {
			const original = replacedElements.get(el);
			if (original) {
				setAvatarUrl(el, original);
				replacedElements.delete(el);
			}
		}
		return;
	}
	const url = avatarUrl(userId, hash);
	if (currentUrl === url) return;
	if (currentUrl && !isOurUrl(currentUrl) && !replacedElements.has(el)) replacedElements.set(el, currentUrl);
	setAvatarUrl(el, url);
}
function tryReplace(el) {
	const url = getAvatarUrl(el);
	if (!url) return;
	const userId = isOurUrl(url) ? url.match(/\/avatars\/(\d+)/)?.[1] ?? null : extractUserId(url);
	if (!userId) return;
	if (!synced) return;
	applyAvatar(userId, el);
}
function refreshNow() {
	for (const [el] of replacedElements) if (el.isConnected) tryReplace(el);
}
function scanAllAvatars() {
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const selector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	document.querySelectorAll(selector).forEach(tryReplace);
}
function connectWebSocket() {
	if (ws) {
		ws.onclose = null;
		ws.close();
	}
	clearInterval(pingTimer);
	ws = new WebSocket(WS_URL);
	ws.onopen = () => {
		reconnectDelay = 1e3;
		pingTimer = setInterval(() => {
			wsSend({ type: "ping" });
		}, PING_INTERVAL);
	};
	ws.onmessage = (event) => {
		let msg;
		try {
			msg = JSON.parse(event.data);
		} catch {
			return;
		}
		if (msg.type === "sync") {
			cache.clear();
			if (msg.changes) for (const { userId, hash } of msg.changes) cache.set(userId, hash);
			synced = true;
			scanAllAvatars();
			refreshNow();
		} else if (msg.type === "update" && msg.userId) {
			if (msg.hash) cache.set(msg.userId, msg.hash);
else cache.delete(msg.userId);
			invalidateUser(msg.userId);
		} else if (msg.type === "pong") {} else if (msg.type === "check" || msg.type === "verify") {
			const cb = pendingCallbacks.get(msg.type);
			if (cb) {
				pendingCallbacks.delete(msg.type);
				cb(msg);
			}
		}
	};
	ws.onclose = () => {
		clearInterval(pingTimer);
		ws = null;
		for (const [, cb] of pendingCallbacks) cb({
			valid: false,
			available: {}
		});
		pendingCallbacks.clear();
		reconnectTimer = setTimeout(() => {
			connectWebSocket();
		}, reconnectDelay);
		reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
	};
	ws.onerror = () => {};
}
async function onLoad() {
	store.userId = (await shelter.flux.awaitStore("UserStore")).getCurrentUser().id;
	const domains = [{
		url: "https://discordcdn.mapetr.moe",
		directives: ["connect-src", "img-src"]
	}, {
		url: "https://api.discordcdn.mapetr.moe",
		directives: ["connect-src"]
	}];
	let needsRestart = false;
	for (const { url, directives } of domains) {
		const allowed = await window.VencordNative.csp.isDomainAllowed(url);
		if (!allowed) {
			await window.VencordNative.csp.requestAddOverride(url, directives, "Profile Theming plugin");
			needsRestart = true;
		}
	}
	connectWebSocket();
	scanAllAvatars();
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const selector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	scoped.observeDom(selector, (elem) => {
		tryReplace(elem);
	});
}
function onUnload() {
	clearInterval(pingTimer);
	clearTimeout(reconnectTimer);
	if (ws) {
		ws.onclose = null;
		ws.close();
		ws = null;
	}
	pendingCallbacks.clear();
	for (const [el, originalUrl] of replacedElements) if (el.isConnected) setAvatarUrl(el, originalUrl);
	replacedElements.clear();
	cache.clear();
	synced = false;
}

//#endregion
exports.API_BASE = API_BASE
exports.clearCache = clearCache
exports.invalidateUser = invalidateUser
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.settings = settings
exports.wsCheck = wsCheck
exports.wsVerify = wsVerify
return exports;
})({});