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
const _tmpl$ = /*#__PURE__*/ (0, import_web.template)(`<div></div>`, 2);
const { Header, HeaderTags, Button, ButtonColors, ButtonSizes, Text } = shelter.ui;
const { createSignal, onCleanup } = shelter.solid;
const { store: store$1 } = shelter.plugin;
const BASE_URL = "https://api.discordcdn.mapetr.moe";
store$1.userId = shelter.flux.stores.UserStore.getCurrentUser().id;
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
		(0, import_web$4.createComponent)(Header, {
			get tag() {
				return HeaderTags.H3;
			},
			children: "Discord Login"
		}),
		(0, import_web$4.createComponent)(Text, { get children() {
			return (0, import_web$3.memo)(() => !!loggingIn())() ? "Waiting for login..." : loggedIn() ? "Logged in" : "Not logged in";
		} }),
		(() => {
			const _el$ = (0, import_web$1.getNextElement)(_tmpl$);
			_el$.style.setProperty("margin-top", "8px");
			_el$.style.setProperty("display", "flex");
			_el$.style.setProperty("gap", "8px");
			(0, import_web$2.insert)(_el$, (() => {
				const _c$ = (0, import_web$3.memo)(() => !!loggedIn());
				return () => _c$() ? (0, import_web$4.createComponent)(Button, {
					onClick: logout,
					get size() {
						return ButtonSizes.MEDIUM;
					},
					get color() {
						return ButtonColors.RED;
					},
					children: "Logout"
				}) : (0, import_web$4.createComponent)(Button, {
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
					children: "Login with Discord"
				});
			})());
			return _el$;
		})(),
		(() => {
			const _el$2 = (0, import_web$1.getNextElement)(_tmpl$);
			_el$2.style.setProperty("margin-top", "16px");
			_el$2.style.setProperty("display", "flex");
			_el$2.style.setProperty("gap", "8px");
			(0, import_web$2.insert)(_el$2, (0, import_web$4.createComponent)(Button, {
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
				children: "Upload Avatar"
			}));
			return _el$2;
		})()
	];
};

//#endregion
//#region plugins/profile-theming/index.ts
const { plugin: { scoped, store } } = shelter;
store.cacheTtl ??= 3e5;
const cache = new Map();
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
	cache.set(userId, {
		available,
		expiry: Date.now() + store.cacheTtl
	});
}
function extractUserId(src) {
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];
	return null;
}
async function tryReplace(img) {
	const userId = extractUserId(img.src);
	if (!userId) return;
	const localUrl = `https://discordcdn.mapetr.moe/avatars/${userId}`;
	if (img.src === localUrl) return;
	const cached = getCached(userId);
	if (cached !== undefined) {
		if (cached) img.src = localUrl;
		return;
	}
	try {
		const res = await fetch(localUrl, { method: "HEAD" });
		setCache(userId, res.ok);
		if (res.ok) img.src = localUrl;
	} catch {
		setCache(userId, false);
	}
}
function onLoad() {
	const selector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	document.querySelectorAll(selector).forEach(tryReplace);
	scoped.observeDom(selector, (elem) => {
		tryReplace(elem);
	});
}
function onUnload() {
	cache.clear();
}

//#endregion
exports.clearCache = clearCache
exports.invalidateUser = invalidateUser
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.settings = settings
return exports;
})({});