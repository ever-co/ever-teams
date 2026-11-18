import { computed, createApp, ref } from 'vue';

const app = createApp({
	setup() {
		const dark = ref(false);
		const colorScheme = computed(() => {
			if (dark.value) {
				return 'dark';
			}
			return 'light';
		});
		return { dark, colorScheme };
	},
	template: `
		<label><input type="checkbox" v-model="dark" /> Dark timer</label>
		<ever-teams-timer api-url="https://api.ever.team/api" :color-scheme="colorScheme"></ever-teams-timer>
	`
});

// Vue takes a tag it does not know for a component: the ever-teams- tags are custom elements. In a project built
// with single-file components, the same function goes to the Vue plugin's template.compilerOptions.isCustomElement.
app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ever-teams-');
app.mount('#app');
