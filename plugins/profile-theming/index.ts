const {
	plugin: { scoped, store },
} = shelter;

const CDN_BASE = "https://discordcdn.mapetr.moe";
export const API_BASE = "https://api.discordcdn.mapetr.moe";
const POSITIVE_TTL = 60 * 60 * 1000; // 60 min
const NEGATIVE_TTL = 120 * 60 * 1000; // 120 min
const REFRESH_INTERVAL = 5 * 60 * 1000; // re-check hashes every 5 min

interface CacheEntry {
	hash: string | null; // null = not available
	expiry: number;
}

// Cache: userId -> { hash, expiry }
const cache = new Map<string, CacheEntry>();

// Batch queue: userId -> elements waiting for result
const pendingQueue = new Map<string, HTMLElement[]>();
// Tracks userIds with an in-flight request so they don't get re-queued
const inFlight = new Map<string, HTMLElement[]>();
let debounceTimer: number | undefined;
let refreshTimer: number | undefined;
let rateLimitedUntil = 0;
// Track replaced elements so we can revert on unload
const replacedElements = new Map<HTMLElement, string>();

export function clearCache() {
	cache.clear();
	refreshNow();
}

export function invalidateUser(userId: string) {
	cache.delete(userId);
	// Re-check all replaced elements for this user so they fetch the new image
	for (const [el] of replacedElements) {
		if (!el.isConnected) continue;
		const url = getAvatarUrl(el);
		if (!url) continue;
		const id = isOurUrl(url)
			? url.match(/\/avatars\/(\d+)/)?.[1] ?? null
			: extractUserId(url);
		if (id === userId) queueCheck(userId, el);
	}
}

function getCached(userId: string): CacheEntry | undefined {
	const entry = cache.get(userId);
	if (!entry) return undefined;
	if (Date.now() > entry.expiry) {
		cache.delete(userId);
		return undefined;
	}
	return entry;
}

function setCache(userId: string, hash: string | null) {
	const ttl = hash ? POSITIVE_TTL : NEGATIVE_TTL;
	cache.set(userId, { hash, expiry: Date.now() + ttl });
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

async function flushQueue() {
	const batch = new Map(pendingQueue);
	pendingQueue.clear();

	const ids = [...batch.keys()];
	if (ids.length === 0) return;

	// Move to in-flight so new elements for these IDs don't trigger another request
	for (const [id, els] of batch) {
		const existing = inFlight.get(id);
		if (existing) existing.push(...els);
		else inFlight.set(id, [...els]);
	}

	try {
		const res = await fetch(`${API_BASE}/avatars/check`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids }),
		});

		if (res.status === 429) {
			rateLimitedUntil = Date.now() + 60_000;
			for (const id of ids) {
				const els = inFlight.get(id);
				if (els) {
					const existing = pendingQueue.get(id);
					if (existing) existing.push(...els);
					else pendingQueue.set(id, els);
				}
				inFlight.delete(id);
			}
			debounceTimer = setTimeout(flushQueue, 60_000) as unknown as number;
			return;
		}

		const { available }: { available: Record<string, string> } = await res.json();

		for (const id of ids) {
			const hash = available[id] ?? null;
			setCache(id, hash);
			if (hash) {
				const url = avatarUrl(id, hash);
				for (const el of inFlight.get(id)!) {
					const current = getAvatarUrl(el);
					if (current && !replacedElements.has(el)) replacedElements.set(el, current);
					setAvatarUrl(el, url);
				}
			}
			inFlight.delete(id);
		}
	} catch {
		for (const id of ids) inFlight.delete(id);
	}
}

function queueCheck(userId: string, el: HTMLElement) {
	const currentUrl = getAvatarUrl(el);

	// Already one of ours — check if hash is still current
	if (currentUrl && isOurUrl(currentUrl)) {
		const cached = getCached(userId);
		if (cached?.hash && currentUrl === avatarUrl(userId, cached.hash)) return;
		// Hash changed or cache expired — fall through to re-check
	}

	// Check cache first
	const cached = getCached(userId);
	if (cached !== undefined) {
		if (cached.hash) {
			const url = avatarUrl(userId, cached.hash);
			if (currentUrl !== url) {
				if (currentUrl && !isOurUrl(currentUrl) && !replacedElements.has(el))
					replacedElements.set(el, currentUrl);
				setAvatarUrl(el, url);
			}
		}
		return;
	}

	// Already in-flight
	const flying = inFlight.get(userId);
	if (flying) {
		flying.push(el);
		return;
	}

	// Add to batch queue
	const existing = pendingQueue.get(userId);
	if (existing) {
		existing.push(el);
		return;
	}
	pendingQueue.set(userId, [el]);

	// Debounce the batch request (respect rate limit cooldown)
	clearTimeout(debounceTimer);
	const delay = Math.max(150, rateLimitedUntil - Date.now());
	debounceTimer = setTimeout(flushQueue, delay) as unknown as number;
}

function tryReplace(el: HTMLElement) {
	const url = getAvatarUrl(el);
	if (!url) return;
	// For elements we already replaced, extract userId from our CDN url
	const userId = isOurUrl(url)
		? url.match(/\/avatars\/(\d+)/)?.[1] ?? null
		: extractUserId(url);
	if (!userId) return;
	queueCheck(userId, el);
}

// Re-check all replaced elements for hash changes
function refreshNow() {
	for (const [el] of replacedElements) {
		if (el.isConnected) tryReplace(el);
	}
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

	const imgSelector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;
	const bgSelector = `[style*="cdn.discordapp.com/avatars/"]`;
	const ourImgSelector = `img[src*="discordcdn.mapetr.moe/avatars/"]`;
	const ourBgSelector = `[style*="discordcdn.mapetr.moe/avatars/"]`;
	const selector = `${imgSelector}, ${bgSelector}, ${ourImgSelector}, ${ourBgSelector}`;

	// Replace avatars already in the DOM
	document.querySelectorAll<HTMLElement>(selector).forEach(tryReplace);

	// Watch for new avatar elements
	scoped.observeDom(selector, (elem) => {
		tryReplace(elem as HTMLElement);
	});

	// Periodically re-check hashes for replaced elements
	refreshTimer = setInterval(refreshNow, REFRESH_INTERVAL) as unknown as number;
}

export function onUnload() {
	clearTimeout(debounceTimer);
	clearInterval(refreshTimer);

	// Revert all replaced elements to their original Discord CDN url
	for (const [el, originalUrl] of replacedElements) {
		if (el.isConnected) setAvatarUrl(el, originalUrl);
	}

	replacedElements.clear();
	cache.clear();
	pendingQueue.clear();
	inFlight.clear();
}

export * from "./Settings";
