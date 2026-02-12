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
const BASE_URL = "https://api.discordcdn.mapetr.moe";
function randomState() {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function uploadAvatar(userId, file) {
	const form = new FormData();
	form.append("avatar", file);
	const res = await fetch(`${BASE_URL}/avatars/${userId}`, {
		method: "POST",
		body: form,
		headers: { Authorization: `Bearer ${store$1.authToken}` }
	});
	if (res.ok) invalidateUser(userId);
	return res.ok;
}
const settings = () => {
	const [loggedIn, setLoggedIn] = createSignal(!!store$1.authToken);
	const [loggingIn, setLoggingIn] = createSignal(false);
	let fileInput;
	let pollTimer;
	onCleanup(() => {
		if (pollTimer) clearInterval(pollTimer);
	});
	const login = () => {
		const state = randomState();
		setLoggingIn(true);
		window.open(`${BASE_URL}/auth/discord?state=${state}`);
		pollTimer = setInterval(async () => {
			try {
				const res = await fetch(`${BASE_URL}/auth/token?state=${state}`);
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
			const ok = await uploadAvatar(userId, file);
			shelter.ui.showToast({
				title: ok ? "Avatar uploaded" : "Upload failed",
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
const POSITIVE_TTL = 36e5;
const NEGATIVE_TTL = 72e5;
const cache = new Map();
const pendingQueue = new Map();
const inFlight = new Map();
let debounceTimer;
let rateLimitedUntil = 0;
function clearCache() {
	cache.clear();
}
function invalidateUser(userId) {
	cache.delete(userId);
}
function getCached(userId) {
	const entry = cache.get(userId);
	if (!entry) return undefined;
	if (Date.now() > entry.expiry) {
		cache.delete(userId);
		return undefined;
	}
	return entry.available;
}
function setCache(userId, available) {
	const ttl = available ? POSITIVE_TTL : NEGATIVE_TTL;
	cache.set(userId, {
		available,
		expiry: Date.now() + ttl
	});
}
function extractUserId(src) {
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];
	return null;
}
async function flushQueue() {
	const batch = new Map(pendingQueue);
	pendingQueue.clear();
	const ids = [...batch.keys()];
	if (ids.length === 0) return;
	for (const [id, imgs] of batch) {
		const existing = inFlight.get(id);
		if (existing) existing.push(...imgs);
else inFlight.set(id, [...imgs]);
	}
	try {
		const res = await fetch(`${API_BASE}/avatars/check`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids })
		});
		if (res.status === 429) {
			rateLimitedUntil = Date.now() + 6e4;
			for (const id of ids) {
				const imgs = inFlight.get(id);
				if (imgs) {
					const existing = pendingQueue.get(id);
					if (existing) existing.push(...imgs);
else pendingQueue.set(id, imgs);
				}
				inFlight.delete(id);
			}
			debounceTimer = setTimeout(flushQueue, 6e4);
			return;
		}
		const { available } = await res.json();
		const availableSet = new Set(available);
		for (const id of ids) {
			const has = availableSet.has(id);
			setCache(id, has);
			if (has) for (const img of inFlight.get(id)) img.src = `${CDN_BASE}/avatars/${id}`;
			inFlight.delete(id);
		}
	} catch {
		for (const id of ids) inFlight.delete(id);
	}
}
function queueCheck(userId, img) {
	const localUrl = `${CDN_BASE}/avatars/${userId}`;
	if (img.src === localUrl) return;
	const cached = getCached(userId);
	if (cached !== undefined) {
		if (cached) img.src = localUrl;
		return;
	}
	const flying = inFlight.get(userId);
	if (flying) {
		flying.push(img);
		return;
	}
	const existing = pendingQueue.get(userId);
	if (existing) {
		existing.push(img);
		return;
	}
	pendingQueue.set(userId, [img]);
	clearTimeout(debounceTimer);
	const delay = Math.max(150, rateLimitedUntil - Date.now());
	debounceTimer = setTimeout(flushQueue, delay);
}
function tryReplace(img) {
	const userId = extractUserId(img.src);
	if (!userId) return;
	queueCheck(userId, img);
}
async function onLoad() {
	store.userId = (await shelter.flux.awaitStore("UserStore")).getCurrentUser().id;
	const selector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	document.querySelectorAll(selector).forEach(tryReplace);
	scoped.observeDom(selector, (elem) => {
		tryReplace(elem);
	});
	window.VencordNative.csp.requestAddOverride("https://discordcdn.mapetr.moe", ["connect-src", "img-src"], "Profile Theming plugin");
	window.VencordNative.csp.requestAddOverride("https://api.discordcdn.mapetr.moe", ["connect-src"], "Profile Theming plugin");
}
function onUnload() {
	clearTimeout(debounceTimer);
	cache.clear();
	pendingQueue.clear();
	inFlight.clear();
}

//#endregion
exports.clearCache = clearCache
exports.invalidateUser = invalidateUser
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.settings = settings
return exports;
})({});