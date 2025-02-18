// Taken from https://github.com/yellowsink/shelter-plugins/blob/master/plugins/lastfm/assets.ts

import { DISCORD_APP_ID } from "./index";
const { post } = shelter.http;

const cache = new Map<string, string | undefined>();

export async function getAsset(url: string) {
	if (cache.has(url)) {
		return cache.get(url);
	}

	const res = await post({
		url: `/applications/${DISCORD_APP_ID}/external-assets`,
		body: { urls: [url] },
		oldFormErrors: false,
	});

	if (res.ok) {
		const path = "mp:" + res.body[0].external_asset_path;
		cache.set(url, path);
		return path;
	}
	cache.set(url, undefined);
}