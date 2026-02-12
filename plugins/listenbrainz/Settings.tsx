const {
	TextBox,
	Header,
	HeaderTags,
} = shelter.ui;

const { store } = shelter.plugin;

export const settings = () => (
    <>
        <Header tag={HeaderTags.H3}>Username</Header>
		<TextBox
			value={store.username ?? ""}
			onInput={(v) => {
                store.username = v;
			}}
		/>

		<Header tag={HeaderTags.H3}>Application name</Header>
		<TextBox
			value={store.name ?? ""}
			onInput={(v) => {
				store.name = v;
			}}
		/>

		<Header tag={HeaderTags.H3}>Polling interval (in ms)</Header>
		<TextBox
			value={store.interval ?? ""}
			onInput={(v) => {
				const int = parseInt(v);
				if (!v || int < 5000 || isNaN(int)) {
					store.interval = 5000;
					return;
				}
				store.interval = int;
			}}
		/>
    </>
)