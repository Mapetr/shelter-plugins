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
    </>
)