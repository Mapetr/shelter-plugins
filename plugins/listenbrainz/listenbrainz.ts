import { setPresence } from ".";
import { getAsset } from "./assets";

const { store } = shelter.plugin;

let last_track = "";

export async function getScrobble() {
    if (!store.username) {
        setPresence(null);
        return;
    }

    const nowPlaying = await fetch(
		`https://shcors.uwu.network/https://api.listenbrainz.org/1/user/${store.username}/playing-now`
	).then((r) => r.json());

    if (!nowPlaying?.payload?.count) {
        setPresence(null);
        return;
    };
    const track = nowPlaying.payload.listens[0].track_metadata;
    const tract_id = track.track_name + track.artist_name + track.release_name;
    if (last_track === tract_id) return;
    last_track = tract_id;

    const url = await getArt(track.track_name, track.release_name, track.artist_name).catch(e => {
        console.log("Couldn't get cover art");
        return undefined;
    });

    let convertedUrl = "";
    if (url) {
        convertedUrl = await getAsset(url);
    }

    setPresence({
        name: track.track_name,
        artist: track.artist_name,
        album: track.release_name,
        albumArt: convertedUrl,
        url: ""
    });
}

async function getArt(track: string, album: string, artist: string) {
    const metadata = await fetch(`https://shcors.uwu.network/https://api.listenbrainz.org/1/metadata/lookup/?${new URLSearchParams({
        recording_name: track,
        release_name: album,
        artist_name: artist,
        metadata: "true",
        inc: "artist tag release"
    })}`).then(async (result) => {
        return await result.json()
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