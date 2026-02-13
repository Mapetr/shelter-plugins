const {
	plugin: { scoped, store },
} = shelter;

const CDN_BASE = "https://discordcdn.mapetr.moe";
// export const API_BASE = "https://api.discordcdn.mapetr.moe";
// const WS_URL = "wss://api.discordcdn.mapetr.moe/avatars/ws";
export const API_BASE = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/avatars/ws";
const PING_INTERVAL = 30_000;
const MAX_RECONNECT_DELAY = 30_000;

export type AssetType = "avatar" | "banner";

// Caches: userId -> hash (authoritative after initial sync)
const avatarCache = new Map<string, string>();
const bannerCache = new Map<string, string>();
let synced = false;

function getCache(asset: AssetType) {
	return asset === "avatar" ? avatarCache : bannerCache;
}

// Track replaced elements so we can revert on unload
// For avatars: stores original src/backgroundImage URL
// For banners: stores "" (banner had no background-image originally)
const replacedAvatars = new Map<HTMLElement, string>();
const replacedBanners = new Map<HTMLElement, string>();

let ws: WebSocket | null = null;
let pingTimer: number | undefined;
let reconnectTimer: number | undefined;
let reconnectDelay = 1000;

// Pending response callbacks for request/response messages
type WsCallback = (msg: any) => void;
const pendingCallbacks = new Map<string, WsCallback>();

function wsSend(msg: object) {
	if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function clearCache() {
	avatarCache.clear();
	bannerCache.clear();
	synced = false;
	refreshNow();
}

export function invalidateUser(userId: string, asset?: AssetType) {
	if (!asset || asset === "avatar") {
		for (const [el] of replacedAvatars) {
			if (!el.isConnected) continue;
			const url = getAvatarUrl(el);
			if (!url) continue;
			const id = isOurUrl(url)
				? url.match(/\/(avatars|banners)\/(\d+)/)?.[2] ?? null
				: extractUserId(url);
			if (id === userId) applyAvatar(userId, el);
		}
	}
	if (!asset || asset === "banner") {
		for (const [el] of replacedBanners) {
			if (!el.isConnected) continue;
			const id = extractUserIdFromBanner(el);
			if (id === userId) applyBanner(userId, el);
		}
	}
	// Also scan for new unreplaced elements for this user
	scanAll();
}

export interface VerifyResult {
	valid: boolean;
	expired?: boolean;
	userId?: string;
	expiresAt?: string;
}

/** Verify a JWT token via the WebSocket. */
export function wsVerify(token: string): Promise<VerifyResult> {
	return new Promise((resolve) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			resolve({ valid: false });
			return;
		}
		pendingCallbacks.set("verify", (msg) => {
			resolve({ valid: msg.valid, expired: msg.expired, userId: msg.userId, expiresAt: msg.expiresAt });
		});
		wsSend({ type: "verify", token });
	});
}

/** Check asset availability for a list of user IDs via the WebSocket. */
export function wsCheck(ids: string[], asset: AssetType = "avatar"): Promise<Record<string, string>> {
	return new Promise((resolve) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			resolve({});
			return;
		}
		pendingCallbacks.set("check", (msg) => {
			resolve(msg.available ?? {});
		});
		wsSend({ type: "check", asset, ids });
	});
}

export async function deleteAsset(asset: AssetType, userId: string, token: string): Promise<"ok" | "expired" | "failed"> {
	const endpoint = asset === "avatar" ? "avatars" : "banners";
	try {
		const res = await fetch(`${API_BASE}/${endpoint}/${userId}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.ok) return "ok";
		if (res.status === 401) return "expired";
		return "failed";
	} catch {
		return "failed";
	}
}

function assetUrl(asset: AssetType, userId: string, hash: string): string {
	return `${CDN_BASE}/${asset === "avatar" ? "avatars" : "banners"}/${userId}?h=${hash}`;
}

function extractUserId(src: string): string | null {
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];
	return null;
}

function extractUserIdFromBanner(bannerEl: HTMLElement): string | null {
	// Check if we already set a custom banner — extract userId from our URL
	const bg = bannerEl.style.backgroundImage;
	const bgMatch = bg?.match(/url\(["']?(.+?)["']?\)/);
	if (bgMatch?.[1]?.startsWith(`${CDN_BASE}/banners/`)) {
		return bgMatch[1].match(/\/banners\/(\d+)/)?.[1] ?? null;
	}

	// Walk up the DOM to find a nearby avatar img to get the userId
	let container = bannerEl.parentElement;
	while (container) {
		const avatarImg = container.querySelector<HTMLImageElement>(
			'img[src*="cdn.discordapp.com/avatars/"], img[src*="discordcdn.mapetr.moe/avatars/"]',
		);
		if (avatarImg) {
			const src = avatarImg.src;
			if (src.startsWith(`${CDN_BASE}/`)) return src.match(/\/avatars\/(\d+)/)?.[1] ?? null;
			return extractUserId(src);
		}
		container = container.parentElement;
	}
	return null;
}

function isOurUrl(src: string): boolean {
	return src.startsWith(`${CDN_BASE}/`);
}

function getAvatarUrl(el: HTMLElement): string | null {
	if (el instanceof HTMLImageElement) return el.src;
	const bg = el.style.backgroundImage;
	const match = bg?.match(/url\(["']?(.+?)["']?\)/);
	return match ? match[1] : null;
}

function setAvatarUrl(el: HTMLElement, url: string) {
	if (el instanceof HTMLImageElement) el.src = url;
	else el.style.backgroundImage = `url("${url}")`;
}

function setBannerImage(el: HTMLElement, url: string) {
	el.style.backgroundImage = `url("${url}")`;
	el.style.backgroundSize = "cover";
	el.style.backgroundPosition = "center";
}

function revertBanner(el: HTMLElement) {
	el.style.backgroundImage = "";
	el.style.backgroundSize = "";
	el.style.backgroundPosition = "";
}

function applyAvatar(userId: string, el: HTMLElement) {
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

	if (currentUrl && !isOurUrl(currentUrl) && !replacedAvatars.has(el))
		replacedAvatars.set(el, currentUrl);
	setAvatarUrl(el, url);
}

function applyBanner(userId: string, el: HTMLElement) {
	const hash = bannerCache.get(userId);
	const bg = el.style.backgroundImage;
	const currentBgUrl = bg?.match(/url\(["']?(.+?)["']?\)/)?.[1] ?? null;

	if (!hash) {
		// No custom banner — revert if we replaced it
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

function tryReplaceAvatar(el: HTMLElement) {
	const url = getAvatarUrl(el);
	if (!url) return;
	const userId = isOurUrl(url)
		? url.match(/\/avatars\/(\d+)/)?.[1] ?? null
		: extractUserId(url);
	if (!userId) return;
	if (!synced) return;
	applyAvatar(userId, el);
}

function tryReplaceBanner(el: HTMLElement) {
	if (!synced) return;
	const userId = extractUserIdFromBanner(el);
	if (!userId) return;
	applyBanner(userId, el);
}

function refreshNow() {
	for (const [el] of replacedAvatars) {
		if (el.isConnected) tryReplaceAvatar(el);
	}
	for (const [el] of replacedBanners) {
		if (el.isConnected) tryReplaceBanner(el);
	}
}

function scanAll() {
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const avatarSelector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	document.querySelectorAll<HTMLElement>(avatarSelector).forEach(tryReplaceAvatar);

	document.querySelectorAll<HTMLElement>('[class*="banner_"]').forEach(tryReplaceBanner);
}

function connectWebSocket() {
	if (ws) {
		ws.onclose = null;
		ws.close();
	}
	clearInterval(pingTimer);

	ws = new WebSocket(WS_URL);

	ws.onopen = () => {
		reconnectDelay = 1000;
		pingTimer = setInterval(() => {
			wsSend({ type: "ping" });
		}, PING_INTERVAL) as unknown as number;
	};

	ws.onmessage = (event) => {
		let msg: any;
		try {
			msg = JSON.parse(event.data);
		} catch {
			return;
		}

		if (msg.type === "sync") {
			avatarCache.clear();
			bannerCache.clear();
			if (msg.avatars?.changes) {
				for (const { userId, hash } of msg.avatars.changes) {
					avatarCache.set(userId, hash);
				}
			}
			if (msg.banners?.changes) {
				for (const { userId, hash } of msg.banners.changes) {
					bannerCache.set(userId, hash);
				}
			}
			synced = true;
			scanAll();
			refreshNow();
		} else if (msg.type === "update" && msg.userId) {
			const asset: AssetType = msg.asset ?? "avatar";
			const cache = getCache(asset);
			if (msg.hash) {
				cache.set(msg.userId, msg.hash);
			} else {
				cache.delete(msg.userId);
			}
			invalidateUser(msg.userId, asset);
		} else if (msg.type === "pong") {
			// keep-alive acknowledged
		} else if (msg.type === "check" || msg.type === "verify") {
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
		for (const [, cb] of pendingCallbacks) {
			cb({ valid: false, available: {} });
		}
		pendingCallbacks.clear();
		reconnectTimer = setTimeout(() => {
			connectWebSocket();
		}, reconnectDelay) as unknown as number;
		reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
	};

	ws.onerror = () => {
		// onclose will fire after onerror, triggering reconnect
	};
}

export async function onLoad() {
	store.userId = (await shelter.flux.awaitStore("UserStore")).getCurrentUser().id;

	const domains = [
		{ url: "https://discordcdn.mapetr.moe", directives: ["connect-src", "img-src"] },
		{ url: "https://api.discordcdn.mapetr.moe", directives: ["connect-src"] },
	];

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

	// Watch for new avatar elements
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const avatarSelector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	scoped.observeDom(avatarSelector, (elem) => {
		tryReplaceAvatar(elem as HTMLElement);
	});

	// Watch for banner elements
	scoped.observeDom('[class*="banner_"]', (elem) => {
		tryReplaceBanner(elem as HTMLElement);
	});
}

export function onUnload() {
	clearInterval(pingTimer);
	clearTimeout(reconnectTimer);

	if (ws) {
		ws.onclose = null;
		ws.close();
		ws = null;
	}

	pendingCallbacks.clear();

	// Revert all replaced avatar elements
	for (const [el, originalUrl] of replacedAvatars) {
		if (el.isConnected) setAvatarUrl(el, originalUrl);
	}

	// Revert all replaced banner elements
	for (const [el] of replacedBanners) {
		if (el.isConnected) revertBanner(el);
	}

	replacedAvatars.clear();
	replacedBanners.clear();
	avatarCache.clear();
	bannerCache.clear();
	synced = false;
}

export * from "./Settings";
