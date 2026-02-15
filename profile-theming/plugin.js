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
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div></div>`, 2), _tmpl$2 = /*#__PURE__*/ (0, import_web.template)(`<div><!#><!/><!#><!/><!#><!/><!#><!/></div>`, 10);
const { Header, HeaderTags, Button, ButtonColors, ButtonSizes, SwitchItem, Text } = shelter.ui;
const { createSignal, onCleanup } = shelter.solid;
const { store: store$1 } = shelter.plugin;
function randomState() {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function checkToken() {
	if (!store$1.authToken) return { valid: false };
	try {
		const data = await wsVerify(store$1.authToken);
		if (!data.valid || data.expired) store$1.authToken = undefined;
		return data;
	} catch (e) {
		reportError(e, "auth:checkToken");
		return { valid: false };
	}
}
async function uploadAsset(type, userId, file) {
	const form = new FormData();
	form.append(type, file);
	const endpoint = type === "avatar" ? "avatars" : "banners";
	let res;
	try {
		res = await fetch(`${API_BASE}/${endpoint}/${userId}`, {
			method: "POST",
			body: form,
			headers: { Authorization: `Bearer ${store$1.authToken}` }
		});
	} catch (e) {
		reportError(e, `uploadAsset:${type}`);
		return "failed";
	}
	if (res.ok) return "ok";
	if (res.status === 401) {
		store$1.authToken = undefined;
		return "expired";
	}
	reportError(new Error(`Upload failed with status ${res.status}`), `uploadAsset:${type}`);
	return "failed";
}
const settings = () => {
	const [loggedIn, setLoggedIn] = createSignal(!!store$1.authToken);
	const [loggingIn, setLoggingIn] = createSignal(false);
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
			} catch (e) {
				reportError(e, "auth:pollToken");
			}
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
	const removeAsset = async (type) => {
		const userId = store$1.userId?.trim();
		if (!userId) {
			shelter.ui.showToast({
				title: "no user id found",
				duration: 3e3
			});
			return;
		}
		const label = type === "avatar" ? "Avatar" : "Banner";
		const result = await deleteAsset(type, userId, store$1.authToken);
		if (result === "expired") {
			setLoggedIn(false);
			store$1.authToken = undefined;
			shelter.ui.showToast({
				title: "Session expired, please log in again",
				duration: 3e3
			});
			return;
		}
		shelter.ui.showToast({
			title: result === "ok" ? `${label} removed` : "Remove failed",
			duration: 3e3
		});
	};
	const pickFile = (type) => {
		const fileInput = document.createElement("input");
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
			const label = type === "avatar" ? "Avatar" : "Banner";
			const result = await uploadAsset(type, userId, file);
			if (result === "expired") {
				setLoggedIn(false);
				shelter.ui.showToast({
					title: "Session expired, please log in again",
					duration: 3e3
				});
				return;
			}
			shelter.ui.showToast({
				title: result === "ok" ? `${label} uploaded, it will appear once processing is done` : "Upload failed",
				duration: 3e3
			});
		};
		fileInput.click();
	};
	return [
		(0, import_web$5.memo)((() => {
			const _c$ = (0, import_web$5.memo)(() => !!loggingIn());
			return () => _c$() ? (0, import_web$2.createComponent)(Text, { children: "Waiting for login..." }) : null;
		})()),
		(() => {
			const _el$ = (0, import_web$3.getNextElement)(_tmpl$);
			_el$.style.setProperty("margin-top", "8px");
			_el$.style.setProperty("display", "flex");
			_el$.style.setProperty("gap", "8px");
			(0, import_web$4.insert)(_el$, (() => {
				const _c$2 = (0, import_web$5.memo)(() => !!loggedIn());
				return () => _c$2() ? (0, import_web$2.createComponent)(Button, {
					onClick: logout,
					get size() {
						return ButtonSizes.MEDIUM;
					},
					get color() {
						return ButtonColors.RED;
					},
					grow: true,
					children: "Logout"
				}) : (0, import_web$2.createComponent)(Button, {
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
			})());
			return _el$;
		})(),
		(() => {
			const _el$2 = (0, import_web$3.getNextElement)(_tmpl$2), _el$3 = _el$2.firstChild, [_el$4, _co$] = (0, import_web$1.getNextMarker)(_el$3.nextSibling), _el$5 = _el$4.nextSibling, [_el$6, _co$2] = (0, import_web$1.getNextMarker)(_el$5.nextSibling), _el$7 = _el$6.nextSibling, [_el$8, _co$3] = (0, import_web$1.getNextMarker)(_el$7.nextSibling), _el$9 = _el$8.nextSibling, [_el$10, _co$4] = (0, import_web$1.getNextMarker)(_el$9.nextSibling);
			_el$2.style.setProperty("margin-top", "8px");
			_el$2.style.setProperty("display", "grid");
			_el$2.style.setProperty("grid-template-columns", "1fr 1fr");
			_el$2.style.setProperty("gap", "8px");
			(0, import_web$4.insert)(_el$2, (0, import_web$2.createComponent)(Button, {
				onClick: () => pickFile("avatar"),
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
			}), _el$4, _co$);
			(0, import_web$4.insert)(_el$2, (0, import_web$2.createComponent)(Button, {
				onClick: () => pickFile("banner"),
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
				children: "Upload Banner"
			}), _el$6, _co$2);
			(0, import_web$4.insert)(_el$2, (0, import_web$2.createComponent)(Button, {
				onClick: () => removeAsset("avatar"),
				get size() {
					return ButtonSizes.MEDIUM;
				},
				get color() {
					return ButtonColors.RED;
				},
				get disabled() {
					return !loggedIn();
				},
				grow: true,
				children: "Remove Avatar"
			}), _el$8, _co$3);
			(0, import_web$4.insert)(_el$2, (0, import_web$2.createComponent)(Button, {
				onClick: () => removeAsset("banner"),
				get size() {
					return ButtonSizes.MEDIUM;
				},
				get color() {
					return ButtonColors.RED;
				},
				get disabled() {
					return !loggedIn();
				},
				grow: true,
				children: "Remove Banner"
			}), _el$10, _co$4);
			return _el$2;
		})(),
		(() => {
			const _el$11 = (0, import_web$3.getNextElement)(_tmpl$);
			_el$11.style.setProperty("margin-top", "8px");
			_el$11.style.setProperty("margin-bottom", "16px");
			(0, import_web$4.insert)(_el$11, (0, import_web$2.createComponent)(Button, {
				onClick: clearCache,
				get size() {
					return ButtonSizes.MEDIUM;
				},
				get color() {
					return ButtonColors.RED;
				},
				children: "Reset cache"
			}));
			return _el$11;
		})(),
		(0, import_web$2.createComponent)(SwitchItem, {
			get value() {
				return store$1.errorReporting !== false;
			},
			onChange: (v) => {
				store$1.errorReporting = v;
			},
			note: "Send error reports to help improve the plugin",
			children: "Error Reporting"
		})
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
const avatarCache = new Map();
const bannerCache = new Map();
let synced = false;
function getCache(asset) {
	return asset === "avatar" ? avatarCache : bannerCache;
}
const replacedAvatars = new Map();
const replacedBanners = new Map();
let ws = null;
let pingTimer;
let reconnectTimer;
let reconnectDelay = 1e3;
const pendingCallbacks = new Map();
function wsSend(msg) {
	if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function extractLocation(err) {
	if (!(err instanceof Error) || !err.stack) return undefined;
	const lines = err.stack.split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("at ")) continue;
		if (trimmed.includes("reportError")) continue;
		const match = trimmed.match(/\((.+):(\d+):(\d+)\)$/) ?? trimmed.match(/at (.+):(\d+):(\d+)$/);
		if (match) return `${match[1]}:${match[2]}:${match[3]}`;
	}
	return undefined;
}
function reportError(err, context) {
	if (store.errorReporting === false) return;
	const message = err instanceof Error ? err.message : String(err);
	const location = extractLocation(err);
	const body = { error: message };
	if (context) body.context = context;
	if (location) body.location = location;
	if (err instanceof Error && err.stack) body.stack = err.stack;
	if (store.userId) body.userId = store.userId;
	fetch(`${API_BASE}/errors`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	}).catch(() => {});
}
function clearCache() {
	avatarCache.clear();
	bannerCache.clear();
	synced = false;
	refreshNow();
}
function invalidateUser(userId, asset) {
	if (!asset || asset === "avatar") for (const [el] of replacedAvatars) {
		if (!el.isConnected) continue;
		const url = getAvatarUrl(el);
		if (!url) continue;
		const id = isOurUrl(url) ? url.match(/\/(avatars|banners)\/(\d+)/)?.[2] ?? null : extractUserId(url);
		if (id === userId) applyAvatar(userId, el);
	}
	if (!asset || asset === "banner") for (const [el] of replacedBanners) {
		if (!el.isConnected) continue;
		const id = extractUserIdFromBanner(el);
		if (id === userId) applyBanner(userId, el);
	}
	scanAll();
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
function wsCheck(ids, asset = "avatar") {
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
			asset,
			ids
		});
	});
}
async function deleteAsset(asset, userId, token) {
	const endpoint = asset === "avatar" ? "avatars" : "banners";
	try {
		const res = await fetch(`${API_BASE}/${endpoint}/${userId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` }
		});
		if (res.ok) return "ok";
		if (res.status === 401) return "expired";
		return "failed";
	} catch (e) {
		reportError(e, `deleteAsset:${asset}`);
		return "failed";
	}
}
function assetUrl(asset, userId, hash) {
	return `${CDN_BASE}/${asset === "avatar" ? "avatars" : "banners"}/${userId}?h=${hash}`;
}
function extractUserId(src) {
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];
	return null;
}
function extractUserIdFromBanner(bannerEl) {
	const bg = bannerEl.style.backgroundImage;
	const bgMatch = bg?.match(/url\(["']?(.+?)["']?\)/);
	if (bgMatch?.[1]?.startsWith(`${CDN_BASE}/banners/`)) return bgMatch[1].match(/\/banners\/(\d+)/)?.[1] ?? null;
	let container = bannerEl.parentElement;
	while (container) {
		const avatarImg = container.querySelector("img[src*=\"cdn.discordapp.com/avatars/\"], img[src*=\"discordcdn.mapetr.moe/avatars/\"]");
		if (avatarImg) {
			const src = avatarImg.src;
			if (src.startsWith(`${CDN_BASE}/`)) return src.match(/\/avatars\/(\d+)/)?.[1] ?? null;
			return extractUserId(src);
		}
		container = container.parentElement;
	}
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
function setBannerImage(el, url) {
	el.style.backgroundImage = `url("${url}")`;
	el.style.backgroundSize = "cover";
	el.style.backgroundPosition = "center";
}
function revertBanner(el) {
	el.style.backgroundImage = "";
	el.style.backgroundSize = "";
	el.style.backgroundPosition = "";
}
function applyAvatar(userId, el) {
	const currentUrl = getAvatarUrl(el);
	const hash = avatarCache.get(userId);
	if (!hash) {
		if (currentUrl && isOurUrl(currentUrl)) {
			const original = replacedAvatars.get(el);
			if (original) {
				setAvatarUrl(el, original);
				replacedAvatars.delete(el);
			}
		}
		return;
	}
	const url = assetUrl("avatar", userId, hash);
	if (currentUrl === url) return;
	if (currentUrl && !isOurUrl(currentUrl) && !replacedAvatars.has(el)) replacedAvatars.set(el, currentUrl);
	setAvatarUrl(el, url);
}
function applyBanner(userId, el) {
	const hash = bannerCache.get(userId);
	const bg = el.style.backgroundImage;
	const currentBgUrl = bg?.match(/url\(["']?(.+?)["']?\)/)?.[1] ?? null;
	if (!hash) {
		if (replacedBanners.has(el)) {
			revertBanner(el);
			replacedBanners.delete(el);
		}
		return;
	}
	const url = assetUrl("banner", userId, hash);
	if (currentBgUrl === url) return;
	if (!replacedBanners.has(el)) replacedBanners.set(el, "");
	setBannerImage(el, url);
}
function tryReplaceAvatar(el) {
	const url = getAvatarUrl(el);
	if (!url) return;
	const userId = isOurUrl(url) ? url.match(/\/avatars\/(\d+)/)?.[1] ?? null : extractUserId(url);
	if (!userId) return;
	if (!synced) return;
	applyAvatar(userId, el);
}
function isBannerInSvg(el) {
	return el.parentElement?.tagName === "foreignObject";
}
function tryReplaceBanner(el) {
	if (!synced) return;
	if (!isBannerInSvg(el)) return;
	const userId = extractUserIdFromBanner(el);
	if (!userId) return;
	applyBanner(userId, el);
}
function refreshNow() {
	for (const [el] of replacedAvatars) if (el.isConnected) tryReplaceAvatar(el);
	for (const [el] of replacedBanners) if (el.isConnected) tryReplaceBanner(el);
}
function scanAll() {
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const avatarSelector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	document.querySelectorAll(avatarSelector).forEach(tryReplaceAvatar);
	document.querySelectorAll("foreignObject > [class*=\"banner_\"]").forEach(tryReplaceBanner);
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
		} catch (e) {
			reportError(e, "ws:parseMessage");
			return;
		}
		if (msg.type === "sync") {
			avatarCache.clear();
			bannerCache.clear();
			if (msg.avatars?.changes) for (const { userId, hash } of msg.avatars.changes) avatarCache.set(userId, hash);
			if (msg.banners?.changes) for (const { userId, hash } of msg.banners.changes) bannerCache.set(userId, hash);
			synced = true;
			scanAll();
			refreshNow();
		} else if (msg.type === "update" && msg.userId) {
			const asset = msg.asset ?? "avatar";
			const cache = getCache(asset);
			if (msg.hash) cache.set(msg.userId, msg.hash);
else cache.delete(msg.userId);
			invalidateUser(msg.userId, asset);
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
	ws.onerror = (event) => {
		const target = event.target;
		const url = target?.url ?? WS_URL;
		reportError(new Error(`WebSocket error on ${url}`), "connectWebSocket");
	};
}
async function onLoad() {
	try {
		const userStore = await shelter.flux.awaitStore("UserStore");
		let currentUser = userStore.getCurrentUser();
		if (!currentUser) currentUser = await new Promise((resolve) => {
			const onChange = () => {
				const user = userStore.getCurrentUser();
				if (user) {
					userStore.removeChangeListener(onChange);
					resolve(user);
				}
			};
			userStore.addChangeListener(onChange);
		});
		store.userId = currentUser.id;
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
		scanAll();
		const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
		const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
		const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
		const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
		const avatarSelector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
		scoped.observeDom(avatarSelector, (elem) => {
			tryReplaceAvatar(elem);
		});
		scoped.observeDom("foreignObject > [class*=\"banner_\"]", (elem) => {
			tryReplaceBanner(elem);
		});
	} catch (e) {
		reportError(e, "onLoad");
	}
}
function onUnload() {
	try {
		clearInterval(pingTimer);
		clearTimeout(reconnectTimer);
		if (ws) {
			ws.onclose = null;
			ws.close();
			ws = null;
		}
		pendingCallbacks.clear();
		for (const [el, originalUrl] of replacedAvatars) if (el.isConnected) setAvatarUrl(el, originalUrl);
		for (const [el] of replacedBanners) if (el.isConnected) revertBanner(el);
		replacedAvatars.clear();
		replacedBanners.clear();
		avatarCache.clear();
		bannerCache.clear();
		synced = false;
	} catch (e) {
		reportError(e, "onUnload");
	}
}

//#endregion
exports.API_BASE = API_BASE
exports.clearCache = clearCache
exports.deleteAsset = deleteAsset
exports.invalidateUser = invalidateUser
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.reportError = reportError
exports.settings = settings
exports.wsCheck = wsCheck
exports.wsVerify = wsVerify
return exports;
})({});