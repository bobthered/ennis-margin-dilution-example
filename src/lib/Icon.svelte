<script lang="ts">
	import { Svg, Path, Circle } from 'sveltewind/components';
	let { name, size = 20 }: { name: string; size?: number } = $props();
	const paths: Record<string, string> = {
		arrow: 'M4 12h16m-6-6 6 6-6 6',
		download: 'M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4',
		reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
		plant: 'M3 21V9l6 3V7l6 3V3h4l2 18H3Zm3-5h1m4 0h1m4 0h1',
		sliders: 'M4 7h5m4 0h7M4 17h9m4 0h3M9 4v6m4 4v6',
		chart: 'M4 3v17h17M8 15v-4m5 4V7m5 8v-7',
		info: 'M12 11v6m0-10v.01',
		check: 'm5 12 4 4L19 6',
		document: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h8',
		chevron: 'm9 5 7 7-7 7',
		equal: 'M5 8h14M5 16h14'
	};
</script>

<Svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class="shrink-0"
>
	{#if name === 'info'}<Circle cx="12" cy="12" r="9" />{/if}
	<Path d={paths[name] ?? paths.chart} />
</Svg>
