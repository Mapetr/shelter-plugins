import { getScrobble } from "./listenbrainz";

const {
	util: { log },
	plugin: { store },
	flux: { dispatcher }
} = shelter;

// Taken from https://github.com/yellowsink/shelter-plugins/blob/master/plugins/lastfm/cfg.ts
export const DISCORD_APP_ID = "1107251687984472144";

store.username ??= "";

let interval: number;

export function onLoad() {
	interval = setInterval(() => {getScrobble()}, 10000);
}

export function onUnload() {
	clearInterval(interval);
}

export interface Track {
	name: string;
	artist: string;
	album: string;
	albumArt?: string;
	url: string;
}

export function setPresence(track: Track | null) {
	dispatcher.dispatch({
		type: "LOCAL_ACTIVITY_UPDATE",
		activity: track ? {
			name: "music",
			type: 2,
			details: track.name,
			state: track.artist,
			application_id: DISCORD_APP_ID,
			assets: {
				large_image: track.albumArt,
				large_text: track.album
			}
		} : null
	})
}

export * from "./Settings";
