const {
	plugin: { scoped, store },
} = shelter;

store.cacheTtl ??= 5 * 60 * 1000; // 5 minutes default

// Cache: userId -> { available, expiry }
const cache = new Map<string, { available: boolean; expiry: number }>();

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
	cache.set(userId, { available, expiry: Date.now() + (store.cacheTtl as number) });
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

async function tryReplace(img: HTMLImageElement) {
	const userId = extractUserId(img.src);
	if (!userId) return;

	const localUrl = `https://discordcdn.mapetr.moe/avatars/${userId}`;

	// Already replaced
	if (img.src === localUrl) return;

	// Check cache first
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
	cache.clear();
}

export * from "./Settings";