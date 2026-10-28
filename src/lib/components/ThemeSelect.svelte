<script lang="ts">
	import { onMount } from 'svelte';
	import { Div, Label, Select } from 'sveltewind/components';

	let preference = $state('os');
	onMount(() => {
		const syncPreference = () => {
			preference = document.documentElement.dataset.themePreference ?? 'os';
		};
		syncPreference();
		window.addEventListener('theme-preference-updated', syncPreference);
		return () => window.removeEventListener('theme-preference-updated', syncPreference);
	});

	function changePreference(event: Event & { currentTarget: HTMLSelectElement }) {
		window.dispatchEvent(
			new CustomEvent('theme-preference-change', { detail: event.currentTarget.value })
		);
	}
</script>

<Div class="theme-control">
	<Label for="theme-preference" class="theme-label">Theme</Label>
	<Select
		id="theme-preference"
		class="theme-select"
		bind:value={preference}
		onchange={changePreference}
		options={[
			{ label: 'Dark', value: 'dark' },
			{ label: 'Light', value: 'light' },
			{ label: 'OS', value: 'os' }
		]}
	/>
</Div>
