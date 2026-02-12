const {
	plugin: { scoped, store },
} = shelter;

const CDN_BASE = "https://discordcdn.mapetr.moe";
const API_BASE = "https://api.discordcdn.mapetr.moe";
const POSITIVE_TTL = 60 * 60 * 1000; // 60 min - check for updates reasonably often
const NEGATIVE_TTL = 120 * 60 * 1000; // 120 min - most users won't have one

// Cache: userId -> { available, expiry }
const cache = new Map<string, { available: boolean; expiry: number }>();

// Batch queue: userId -> img elements waiting for result
const pendingQueue = new Map<string, HTMLImageElement[]>();
// Tracks userIds with an in-flight request so they don't get re-queued
const inFlight = new Map<string, HTMLImageElement[]>();
let debounceTimer: number | undefined;

export function clearCache() {
	cache.clear();
}

export function invalidateUser(userId: string) {
	cache.delete(userId);
}

function getCached(userId: string): boolean | undefined {
	const entry = cache.get(userId);
	if (!entry) return undefined;
	if (Date.now() > entry.expiry) {
		cache.delete(userId);
		return undefined;
	}
	return entry.available;
}

function setCache(userId: string, available: boolean) {
	const ttl = available ? POSITIVE_TTL : NEGATIVE_TTL;
	cache.set(userId, { available, expiry: Date.now() + ttl });
}

function extractUserId(src: string): string | null {
	// Regular avatar: /avatars/{userId}/{hash}
	const regular = src.match(/\/avatars\/(\d+)\//);
	if (regular) return regular[1];

	// Guild avatar: /users/{userId}/avatars/{hash}
	const guild = src.match(/\/users\/(\d+)\/avatars\//);
	if (guild) return guild[1];

	return null;
}

async function flushQueue() {
	const batch = new Map(pendingQueue);
	pendingQueue.clear();

	const ids = [...batch.keys()];
	if (ids.length === 0) return;

	// Move to in-flight so new elements for these IDs don't trigger another request
	for (const [id, imgs] of batch) {
		const existing = inFlight.get(id);
		if (existing) existing.push(...imgs);
		else inFlight.set(id, [...imgs]);
	}

	try {
		const res = await fetch(`${API_BASE}/avatars/check`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids }),
		});

		const { available }: { available: string[] } = await res.json();
		const availableSet = new Set(available);

		for (const id of ids) {
			const has = availableSet.has(id);
			setCache(id, has);
			if (has) {
				// Apply to all imgs that arrived while in-flight
				for (const img of inFlight.get(id)!)
					img.src = `${CDN_BASE}/avatars/${id}`;
			}
			inFlight.delete(id);
		}
	} catch {
		// On failure clear in-flight so they can retry
		for (const id of ids) inFlight.delete(id);
	}
}

function queueCheck(userId: string, img: HTMLImageElement) {
	const localUrl = `${CDN_BASE}/avatars/${userId}`;

	// Already replaced
	if (img.src === localUrl) return;

	// Check cache first
	const cached = getCached(userId);
	if (cached !== undefined) {
		if (cached) img.src = localUrl;
		return;
	}

	// Already in-flight — just append the img, no new request needed
	const flying = inFlight.get(userId);
	if (flying) {
		flying.push(img);
		return;
	}

	// Add to batch queue
	const existing = pendingQueue.get(userId);
	if (existing) {
		existing.push(img);
		return;
	}
	pendingQueue.set(userId, [img]);

	// Debounce the batch request
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(flushQueue, 150) as unknown as number;
}

function tryReplace(img: HTMLImageElement) {
	const userId = extractUserId(img.src);
	if (!userId) return;
	queueCheck(userId, img);
}

export async function onLoad() {
	store.userId = (await shelter.flux.awaitStore("UserStore")).getCurrentUser().id;

	const selector = `img[src*="cdn.discordapp.com/avatars/"], img[src*="/users/"][src*="/avatars/"]`;

	// Replace avatars already in the DOM
	document.querySelectorAll<HTMLImageElement>(selector).forEach(tryReplace);

	// Watch for new avatar images
	scoped.observeDom(selector, (elem) => {
		tryReplace(elem as HTMLImageElement);
	});

	window.VencordNative.csp.requestAddOverride("https://discordcdn.mapetr.moe", ["connect-src", "img-src"], "Profile Theming plugin");
	window.VencordNative.csp.requestAddOverride("https://api.discordcdn.mapetr.moe", ["connect-src"], "Profile Theming plugin");
}

export function onUnload() {
	clearTimeout(debounceTimer);
	cache.clear();
	pendingQueue.clear();
	inFlight.clear();
}

export * from "./Settings";
