import { setPresence } from ".";

const { store } = shelter.plugin;

export async function getScrobble() {
    if (!store.username) return;

    const nowPlaying = await fetch(
		`https://shcors.uwu.network/https://api.listenbrainz.org/1/user/${store.username}/playing-now`
	).then((r) => r.json());

    if (!nowPlaying?.payload?.count) return;
    const track = nowPlaying.payload.listens[0].track_metadata;

    setPresence({
        name: track.track_name,
        artist: track.artist_name,
        album: "",
        url: ""
    });
}