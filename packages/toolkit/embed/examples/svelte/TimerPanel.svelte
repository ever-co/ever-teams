<script>
	// Loads <ever-teams-timer> once for the whole app.
	import '@ever-teams/embed';

	// The Ever Teams API address, ending in /api.
	export let apiUrl = 'https://api.ever.team/api';

	let dark = false;
	let colorScheme = 'light';
	$: if (dark) {
		colorScheme = 'dark';
	} else {
		colorScheme = 'light';
	}
</script>

<label><input type="checkbox" bind:checked={dark} /> Dark timer</label>
<ever-teams-timer api-url={apiUrl} color-scheme={colorScheme}></ever-teams-timer>
