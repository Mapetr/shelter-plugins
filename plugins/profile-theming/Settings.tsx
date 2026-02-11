import { clearCache, invalidateUser } from ".";

const {
	Header,
	HeaderTags,
	Button,
	ButtonColors,
	ButtonSizes,
	Text,
} = shelter.ui;

const { createSignal, onCleanup } = shelter.solid;
const { store } = shelter.plugin;

const BASE_URL = "https://api.discordcdn.mapetr.moe";

store.userId = shelter.flux.stores.UserStore.getCurrentUser().id;

function randomState(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function uploadAvatar(userId: string, file: File) {
	const form = new FormData();
	form.append("avatar", file);

	const res = await fetch(`${BASE_URL}/avatars/${userId}`, {
		method: "POST",
		body: form,
		headers: {
			Authorization: `Bearer ${store.authToken}`,
		},
	});

	if (res.ok) invalidateUser(userId);

	return res.ok;
}

export const settings = () => {
	const [loggedIn, setLoggedIn] = createSignal(!!store.authToken);
	const [loggingIn, setLoggingIn] = createSignal(false);
	let fileInput: HTMLInputElement | undefined;
	let pollTimer: number | undefined;

	onCleanup(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	const login = () => {
		const state = randomState();
		setLoggingIn(true);

		window.open(`${BASE_URL}/auth/discord?state=${state}`);

		pollTimer = setInterval(async () => {
			try {
				const res = await fetch(`${BASE_URL}/auth/token?state=${state}`);
				if (!res.ok) return;

				const data = await res.json();
				if (data.token) {
					clearInterval(pollTimer);
					pollTimer = undefined;
					store.authToken = data.token;
					setLoggedIn(true);
					setLoggingIn(false);
					shelter.ui.showToast({ title: "Logged in", duration: 2000 });
				}
			} catch {
				// server not ready yet, keep polling
			}
		}, 2000) as unknown as number;
	};

	const logout = () => {
		store.authToken = undefined;
		setLoggedIn(false);
		shelter.ui.showToast({ title: "Logged out", duration: 2000 });
	};

	const pickFile = () => {
		fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = "image/*";
		fileInput.onchange = async () => {
			const file = fileInput?.files?.[0];
			if (!file) return;

			const userId = store.userId?.trim();
			if (!userId) {
				shelter.ui.showToast({ title: "no user id found", duration: 3000 });
				return;
			}

			const ok = await uploadAvatar(userId, file);
			shelter.ui.showToast({
				title: ok ? "Avatar uploaded" : "Upload failed",
				duration: 3000,
			});
		};
		fileInput.click();
	};

	return (
		<>
			<Header tag={HeaderTags.H3}>Discord Login</Header>
			<Text>
				{loggingIn()
					? "Waiting for login..."
					: loggedIn()
						? "Logged in"
						: "Not logged in"}
			</Text>

			<div style={{ "margin-top": "8px", display: "flex", gap: "8px" }}>
				{loggedIn() ? (
					<Button onClick={logout} size={ButtonSizes.MEDIUM} color={ButtonColors.RED}>
						Logout
					</Button>
				) : (
					<Button
						onClick={login}
						size={ButtonSizes.MEDIUM}
						color={ButtonColors.BRAND}
						disabled={loggingIn()}
					>
						Login with Discord
					</Button>
				)}
			</div>

			<div style={{ "margin-top": "16px", display: "flex", gap: "8px" }}>
				<Button
					onClick={pickFile}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.BRAND}
					disabled={!loggedIn()}
				>
					Upload Avatar
				</Button>
			</div>
		</>
	);
};
