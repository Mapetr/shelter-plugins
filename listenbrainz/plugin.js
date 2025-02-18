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

//#region plugins/listenbrainz/listenbrainz.ts
const { store: store$2 } = shelter.plugin;
async function getScrobble() {
	if (!store$2.username) return;
	const nowPlaying = await fetch(`https://shcors.uwu.network/https://api.listenbrainz.org/1/user/${store$2.username}/playing-now`).then((r) => r.json());
	if (!nowPlaying?.payload?.count) return;
	const track = nowPlaying.payload.listens[0].track_metadata;
	setPresence({
		name: track.track_name,
		artist: track.artist_name,
		album: "",
		url: ""
	});
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
const settings = () => [(0, import_web.createComponent)(Header, {
	get tag() {
		return HeaderTags.H3;
	},
	children: "Username"
}), (0, import_web.createComponent)(TextBox, {
	get value() {
		return store$1.username ?? "";
	},
	onInput: (v) => {
		store$1.username = v;
	}
})];

//#endregion
//#region plugins/listenbrainz/index.ts
const { util: { log }, plugin: { store }, flux: { dispatcher } } = shelter;
const DISCORD_APP_ID = "1107251687984472144";
store.username ??= "";
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
			name: "music",
			type: 2,
			details: track.name,
			state: track.artist,
			application_id: DISCORD_APP_ID
		} : null
	});
}

//#endregion
exports.onLoad = onLoad
exports.onUnload = onUnload
exports.setPresence = setPresence
exports.settings = settings
return exports;
})({});