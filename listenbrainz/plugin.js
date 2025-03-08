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

//#region plugins/listenbrainz/assets.ts
const { post } = shelter.http;
const cache = new Map();
async function getAsset(url) {
	if (cache.has(url)) return cache.get(url);
	const res = await post({
		url: `/applications/${DISCORD_APP_ID}/external-assets`,
		body: { urls: [url] },
		oldFormErrors: false
	});
	if (res.ok) {
		const path = "mp:" + res.body[0].external_asset_path;
		cache.set(url, path);
		return path;
	}
	cache.set(url, undefined);
}

//#endregion
//#region plugins/listenbrainz/listenbrainz.ts
const { store: store$2 } = shelter.plugin;
let last_track = "";
async function getScrobble() {
	if (!store$2.username) {
		setPresence(null);
		return;
	}
	const nowPlaying = await fetch(`https://shcors.uwu.network/https://api.listenbrainz.org/1/user/${store$2.username}/playing-now`).then((r) => r.json());
	if (!nowPlaying?.payload?.count) {
		setPresence(null);
		return;
	}
	const track = nowPlaying.payload.listens[0].track_metadata;
	const tract_id = track.track_name + track.artist_name + track.release_name;
	if (last_track === tract_id) return;
	last_track = tract_id;
	const url = await getArt(track.track_name, track.release_name, track.artist_name).catch((e) => {
		console.log("Couldn't get cover art");
		return undefined;
	});
	let convertedUrl = "";
	if (url) convertedUrl = await getAsset(url);
	setPresence({
		name: track.track_name,
		artist: track.artist_name,
		album: track.release_name,
		albumArt: convertedUrl,
		url: ""
	});
}
async function getArt(track, album, artist) {
	const metadata = await fetch(`https://shcors.uwu.network/https://api.listenbrainz.org/1/metadata/lookup/?${new URLSearchParams({
		recording_name: track,
		release_name: album,
		artist_name: artist,
		metadata: "true",
		inc: "artist tag release"
	})}`).then(async (result) => {
		return await result.json();
	});
	if (!metadata.release_mbid) return "";
	const url = await fetch(`https://coverartarchive.org/release/${metadata.release_mbid}`).then(async (result) => {
		if (result.status !== 200) return "";
		const json = await result.json();
		return json.images[0].thumbnails.small;
	});
	if (url) return url;
	const rg_url = await fetch(`https://coverartarchive.org/release-group/${metadata.metadata.release.release_group_mbid}`).then(async (result) => {
		if (result.status !== 200) return "";
		const json = await result.json();
		return json.images[0].thumbnails.small;
	});
	return rg_url;
}

//#endregion
//#region solid-js/web
var require_web = __commonJS({ "solid-js/web"(exports, module) {
	module.exports = shelter.solidWeb;
} });

//#endregion
//#region plugins/listenbrainz/Settings.tsx
var import_web = __toESM(require_web(), 1);
const { TextBox, Header, HeaderTags } = shelter.ui;
const { store: store$1 } = shelter.plugin;
const settings = () => [
	(0, import_web.createComponent)(Header, {
		get tag() {
			return HeaderTags.H3;
		},
		children: "Username"
	}),
	(0, import_web.createComponent)(TextBox, {
		get value() {
			return store$1.username ?? "";
		},
		onInput: (v) => {
			store$1.username = v;
		}
	}),
	(0, import_web.createComponent)(Header, {
		get tag() {
			return HeaderTags.H3;
		},
		children: "Application name"
	}),
	(0, import_web.createComponent)(TextBox, {
		get value() {
			return store$1.name ?? "";
		},
		onInput: (v) => {
			store$1.name = v;
		}
	}),
	(0, import_web.createComponent)(Header, {
		get tag() {
			return HeaderTags.H3;
		},
		children: "Polling interval (in ms)"
	}),
	(0, import_web.createComponent)(TextBox, {
		get value() {
			return store$1.interval ?? "";
		},
		onInput: (v) => {
			const int = parseInt(v);
			if (!v || int < 5e3 || isNaN(int)) {
				store$1.interval = 5e3;
				return;
			}
			store$1.interval = int;
		}
	})
];

//#endregion
//#region plugins/listenbrainz/index.ts
const { util: { log }, plugin: { store }, flux: { dispatcher } } = shelter;
const DISCORD_APP_ID = "1107251687984472144";
store.username ??= "";
store.interval ??= 1e4;
store.name ??= "music";
let interval;
function onLoad() {
	interval = setInterval(() => {
		getScrobble();
	}, 1e4);
}
function onUnload() {
	clearInterval(interval);
}
function setPresence(track) {
	dispatcher.dispatch({
		type: "LOCAL_ACTIVITY_UPDATE",
		activity: track ? {
			name: store.name,
			type: 2,
			details: track.name,
			state: track.artist,
			application_id: DISCORD_APP_ID,
			assets: {
				large_image: track.albumArt,
				large_text: track.album
			}
		} : null
	});
}

//#endregion
exports.DISCORD_APP_ID = DISCORD_APP_ID
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.setPresence = setPresence
exports.settings = settings
return exports;
})({});