const {
	plugin: { scoped, store },
} = shelter;

const CDN_BASE = "https://discordcdn.mapetr.moe";
export const API_BASE = "https://api.discordcdn.mapetr.moe";
const WS_URL = "wss://api.discordcdn.mapetr.moe/avatars/ws";
const PING_INTERVAL = 30_000;
const MAX_RECONNECT_DELAY = 30_000;

// Cache: userId -> hash (authoritative after initial sync)
const cache = new Map<string, string>();
let synced = false;

// Track replaced elements so we can revert on unload
const replacedElements = new Map<HTMLElement, string>();

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
	cache.clear();
	synced = false;
	refreshNow();
}

export function invalidateUser(userId: string) {
	for (const [el] of replacedElements) {
		if (!el.isConnected) continue;
		const url = getAvatarUrl(el);
		if (!url) continue;
		const id = isOurUrl(url)
			? url.match(/\/avatars\/(\d+)/)?.[1] ?? null
			: extractUserId(url);
		if (id === userId) applyAvatar(userId, el);
	}
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

/** Check avatar availability for a list of user IDs via the WebSocket. */
export function wsCheck(ids: string[]): Promise<Record<string, string>> {
	return new Promise((resolve) => {
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			resolve({});
			return;
		}
		pendingCallbacks.set("check", (msg) => {
			resolve(msg.available ?? {});
		});
		wsSend({ type: "check", ids });
	});
}

function avatarUrl(userId: string, hash: string): string {
	return `${CDN_BASE}/avatars/${userId}?h=${hash}`;
}

function extractUserId(src: string): string | null {
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];
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

function applyAvatar(userId: string, el: HTMLElement) {
	const currentUrl = getAvatarUrl(el);
	const hash = cache.get(userId);

	if (!hash) {
		// No custom avatar — if we previously replaced this element, revert it
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

	if (currentUrl && !isOurUrl(currentUrl) && !replacedElements.has(el))
		replacedElements.set(el, currentUrl);
	setAvatarUrl(el, url);
}

function tryReplace(el: HTMLElement) {
	const url = getAvatarUrl(el);
	if (!url) return;
	const userId = isOurUrl(url)
		? url.match(/\/avatars\/(\d+)/)?.[1] ?? null
		: extractUserId(url);
	if (!userId) return;
	if (!synced) return; // wait for initial sync
	applyAvatar(userId, el);
}

function refreshNow() {
	for (const [el] of replacedElements) {
		if (el.isConnected) tryReplace(el);
	}
}

function scanAllAvatars() {
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const selector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	document.querySelectorAll<HTMLElement>(selector).forEach(tryReplace);
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
			cache.clear();
			if (msg.changes) {
				for (const { userId, hash } of msg.changes) {
					cache.set(userId, hash);
				}
			}
			synced = true;
			scanAllAvatars();
			refreshNow();
		} else if (msg.type === "update" && msg.userId) {
			if (msg.hash) {
				cache.set(msg.userId, msg.hash);
			} else {
				cache.delete(msg.userId);
			}
			invalidateUser(msg.userId);
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
		// Reject any pending callbacks
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

	// Replace avatars already in the DOM (if sync already arrived)
	scanAllAvatars();

	// Watch for new avatar elements
	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const selector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;
	scoped.observeDom(selector, (elem) => {
		tryReplace(elem as HTMLElement);
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

	// Revert all replaced elements to their original Discord CDN url
	for (const [el, originalUrl] of replacedElements) {
		if (el.isConnected) setAvatarUrl(el, originalUrl);
	}

	replacedElements.clear();
	cache.clear();
	synced = false;
}

export * from "./Settings";
