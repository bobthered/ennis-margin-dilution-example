<script lang="ts">
	import './layout.css';
	import { ennisFavicon } from '#lib/components/EnnisLogo.svelte';
	import type { LayoutProps } from './$types';
	import { theme } from 'sveltewind/theme';
	import { minimal } from 'sveltewind/themes';

	theme.set.theme(structuredClone(minimal));

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={ennisFavicon} />
</svelte:head>

{@render children()}
