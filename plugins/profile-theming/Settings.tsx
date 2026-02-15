import { clearCache, API_BASE, wsVerify, deleteAsset, reportError, type VerifyResult, type AssetType } from ".";

const {
	Header,
	HeaderTags,
	Button,
	ButtonColors,
	ButtonSizes,
	SwitchItem,
	Text,
} = shelter.ui;

const { createSignal, onCleanup } = shelter.solid;
const { store } = shelter.plugin;

function randomState(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkToken(): Promise<VerifyResult> {
	if (!store.authToken) return { valid: false };
	try {
		const data = await wsVerify(store.authToken);

		if (!data.valid || data.expired) {
			store.authToken = undefined;
		}

		return data;
	} catch (e) {
		reportError(e instanceof Error ? e.message : String(e), "auth:checkToken");
		return { valid: false };
	}
}

async function uploadAsset(
	type: "avatar" | "banner",
	userId: string,
	file: File,
): Promise<"ok" | "expired" | "failed"> {
	const form = new FormData();
	form.append(type, file);

	const endpoint = type === "avatar" ? "avatars" : "banners";
	let res: Response;
	try {
		res = await fetch(`${API_BASE}/${endpoint}/${userId}`, {
			method: "POST",
			body: form,
			headers: {
				Authorization: `Bearer ${store.authToken}`,
			},
		});
	} catch (e) {
		reportError(e instanceof Error ? e.message : String(e), `uploadAsset:${type}`);
		return "failed";
	}

	if (res.ok) return "ok";

	if (res.status === 401) {
		store.authToken = undefined;
		return "expired";
	}

	reportError(`Upload failed with status ${res.status}`, `uploadAsset:${type}`);
	return "failed";
}

export const settings = () => {
	const [loggedIn, setLoggedIn] = createSignal(!!store.authToken);
	const [loggingIn, setLoggingIn] = createSignal(false);
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
			} catch (e) {
				reportError(e instanceof Error ? e.message : String(e), "auth:pollToken");
			}
		}, 2000) as unknown as number;
	};

	const logout = () => {
		store.authToken = undefined;
		setLoggedIn(false);
		shelter.ui.showToast({ title: "Logged out", duration: 2000 });
	};

	const removeAsset = async (type: AssetType) => {
		const userId = store.userId?.trim();
		if (!userId) {
			shelter.ui.showToast({ title: "no user id found", duration: 3000 });
			return;
		}
		const label = type === "avatar" ? "Avatar" : "Banner";
		const result = await deleteAsset(type, userId, store.authToken);
		if (result === "expired") {
			setLoggedIn(false);
			store.authToken = undefined;
			shelter.ui.showToast({ title: "Session expired, please log in again", duration: 3000 });
			return;
		}
		shelter.ui.showToast({
			title: result === "ok" ? `${label} removed` : "Remove failed",
			duration: 3000,
		});
	};

	const pickFile = (type: "avatar" | "banner") => {
		const fileInput = document.createElement("input");
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

			const label = type === "avatar" ? "Avatar" : "Banner";
			const result = await uploadAsset(type, userId, file);
			if (result === "expired") {
				setLoggedIn(false);
				shelter.ui.showToast({ title: "Session expired, please log in again", duration: 3000 });
				return;
			}
			shelter.ui.showToast({
				title: result === "ok" ? `${label} uploaded, it will appear once processing is done` : "Upload failed",
				duration: 3000,
			});
		};
		fileInput.click();
	};

	return (
		<>
			{loggingIn() ? <Text>Waiting for login...</Text> : null }

			<div style={{ "margin-top": "8px", display: "flex", gap: "8px" }}>
				{loggedIn() ? (
					<Button onClick={logout} size={ButtonSizes.MEDIUM} color={ButtonColors.RED} grow={true}>
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
			</div>

			<div style={{ "margin-top": "8px", display: "grid", "grid-template-columns": "1fr 1fr", gap: "8px" }}>
				<Button
					onClick={() => pickFile("avatar")}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.BRAND}
					disabled={!loggedIn()}
					grow={true}
				>
					Upload Avatar
				</Button>

				<Button
					onClick={() => pickFile("banner")}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.BRAND}
					disabled={!loggedIn()}
					grow={true}
				>
					Upload Banner
				</Button>

				<Button
					onClick={() => removeAsset("avatar")}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.RED}
					disabled={!loggedIn()}
					grow={true}
				>
					Remove Avatar
				</Button>

				<Button
					onClick={() => removeAsset("banner")}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.RED}
					disabled={!loggedIn()}
					grow={true}
				>
					Remove Banner
				</Button>
			</div>

			<div style={{ "margin-top": "8px", "margin-bottom": "16px" }}>
				<Button
					onClick={clearCache}
					size={ButtonSizes.MEDIUM}
					color={ButtonColors.RED}
				>
					Reset cache
				</Button>
			</div>

			<SwitchItem
				value={store.errorReporting !== false}
				onChange={(v: boolean) => { store.errorReporting = v; }}
				note="Send error reports to help improve the plugin"
			>
				Error Reporting
			</SwitchItem>
		</>
	);
};
