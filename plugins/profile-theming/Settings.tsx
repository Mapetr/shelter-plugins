import { clearCache, invalidateUser, API_BASE } from ".";

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

function randomState(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface VerifyResult {
	valid: boolean;
	expired?: boolean;
	userId?: string;
	expiresAt?: string;
	error?: string;
}

async function checkToken(): Promise<VerifyResult> {
	if (!store.authToken) return { valid: false, error: "no token" };
	try {
		const res = await fetch(`${API_BASE}/auth/verify`, {
			headers: { Authorization: `Bearer ${store.authToken}` },
		});
		const data: VerifyResult = await res.json();

		if (!data.valid || data.expired) {
			store.authToken = undefined;
		}

		return data;
	} catch {
		return { valid: false, error: "network error" };
	}
}

async function uploadAvatar(userId: string, file: File): Promise<"ok" | "expired" | "failed"> {
	const form = new FormData();
	form.append("avatar", file);

	const res = await fetch(`${API_BASE}/avatars/${userId}`, {
		method: "POST",
		body: form,
		headers: {
			Authorization: `Bearer ${store.authToken}`,
		},
	});

	if (res.ok) {
		invalidateUser(userId);
		return "ok";
	}

	if (res.status === 401) {
		store.authToken = undefined;
		return "expired";
	}

	return "failed";
}

export const settings = () => {
	const [loggedIn, setLoggedIn] = createSignal(!!store.authToken);
	const [loggingIn, setLoggingIn] = createSignal(false);
	let fileInput: HTMLInputElement | undefined;
	let pollTimer: number | undefined;

	// Verify stored token on settings open
	if (store.authToken) {
		checkToken().then((result) => {
			if (!result.valid) {
				setLoggedIn(false);
				shelter.ui.showToast({ title: "Invalid session, please log in again", duration: 3000 });
			} else if (result.expired) {
				setLoggedIn(false);
				shelter.ui.showToast({ title: "Session expired, please log in again", duration: 3000 });
			}
		});
	}

	onCleanup(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	const login = () => {
		const state = randomState();
		setLoggingIn(true);

		window.open(`${API_BASE}/auth/discord?state=${state}`);

		pollTimer = setInterval(async () => {
			try {
				const res = await fetch(`${API_BASE}/auth/token?state=${state}`);
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

			const result = await uploadAvatar(userId, file);
			if (result === "expired") {
				setLoggedIn(false);
				shelter.ui.showToast({ title: "Session expired, please log in again", duration: 3000 });
				return;
			}
			shelter.ui.showToast({
				title: result === "ok" ? "Avatar uploaded" : "Upload failed",
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

			<div style={{ "margin-top": "8px", display: "flex", gap: "8px", "justify-content": "space-between" }}>
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
						grow={true}
					>
						Login with Discord
					</Button>
				)}

				<Button
					onClick={pickFile}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.BRAND}
					disabled={!loggedIn()}
					grow={true}
				>
					Upload Avatar
				</Button>
			</div>

			<div style={{ "margin-top": "16px", "margin-bottom": "16px", display: "flex", gap: "8px" }}>
				<Button
					onClick={clearCache}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.RED}
				>
					Reset cache
				</Button>
			</div>
		</>
	);
};
