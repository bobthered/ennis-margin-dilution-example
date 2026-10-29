<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { readScenarioParams, writeScenarioParams } from '#lib/scenario-url.ts';
	import {
		A,
		Accordion,
		Alert,
		Aside,
		Badge,
		Button,
		Card,
		Div,
		Footer,
		H1,
		H2,
		H3,
		Header,
		Input,
		Label,
		Main,
		Nav,
		P,
		Range,
		Section,
		Select,
		Span,
		Strong,
		Table,
		Tbody,
		Td,
		Th,
		Thead,
		Tr
	} from 'sveltewind/components';
	import Icon from '#lib/Icon.svelte';
	import EnnisLogo from '#lib/components/EnnisLogo.svelte';
	import ThemeSelect from '#lib/components/ThemeSelect.svelte';
	import {
		calculateScenario,
		examples,
		money,
		percent,
		priceAtGoals,
		validateScenario,
		withProfitShare,
		type Scenario
	} from '#lib/accounting.ts';

	let scenario: Scenario = $state({ ...examples.manufacturing });
	let preset = $state('manufacturing');
	let view = $state<'visual' | 'table'>('visual');
	let urlReady = $state(false);

	$effect(() => {
		const restored = readScenarioParams(page.url.searchParams);
		untrack(() => {
			scenario = restored.scenario;
			preset = restored.preset;
			view = restored.view;
			urlReady = true;
		});
	});

	$effect(() => {
		if (!urlReady) return;
		const state = { scenario: { ...scenario }, preset, view };
		untrack(() => {
			const current = new URL(window.location.href);
			const next = writeScenarioParams(current, state);
			if (next.href !== current.href) {
				// The URL already includes the base path from window.location.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				void replaceState(next, page.state);
			}
		});
	});
	const errors = $derived(validateScenario(scenario));
	const result = $derived(calculateScenario(scenario));
	const pnlRows = $derived(
		result
			? [
					{
						label: 'Customer revenue',
						values: [0, 0, scenario.customerPrice!, scenario.customerPrice!]
					},
					{ label: 'Intercompany revenue', values: [result.transfer, result.transfer, 0, 0] },
					{ label: 'Intercompany revenue offset', values: [0, 0, 0, -result.transfer] },
					{
						label: 'Reported revenue',
						values: [result.transfer, result.transfer, scenario.customerPrice!, result.netRevenue],
						total: true
					},
					{
						label: 'Own production COGS',
						values: [
							scenario.producerCost!,
							scenario.producerCost!,
							scenario.sellerCost!,
							scenario.sellerCost!
						]
					},
					{ label: 'Intercompany COGS', values: [0, 0, result.transfer, 0] },
					{
						label: 'Total COGS',
						values: [
							scenario.producerCost!,
							scenario.producerCost!,
							result.currentSellerCogs,
							scenario.sellerCost!
						],
						total: true
					},
					{
						label: 'Gross profit',
						values: [
							result.producerProfit,
							result.producerProfit,
							result.sellerProfit,
							result.sellerProfit
						],
						total: true
					}
				]
			: []
	);
	const sliderMin = $derived(Math.min(0, Math.floor((result?.producerShare ?? 50) / 100) * 100));
	const sliderMax = $derived(Math.max(100, Math.ceil((result?.producerShare ?? 50) / 100) * 100));
	const marginLift = $derived(
		result?.proposedSellerMargin != null && result.currentSellerMargin != null
			? result.proposedSellerMargin - result.currentSellerMargin
			: null
	);
	const maxMargin = $derived(
		Math.max(
			40,
			scenario.producerGoal ?? 0,
			scenario.sellerGoal ?? 0,
			result?.producerMargin ?? 0,
			result?.currentSellerMargin ?? 0,
			result?.proposedSellerMargin ?? 0
		)
	);
	const plotWidth = (value: number | null) => `${Math.max(0, ((value ?? 0) / maxMargin) * 100)}%`;

	function loadExample(key: string) {
		preset = key;
		if (examples[key]) scenario = { ...examples[key] };
	}
	function markCustom() {
		preset = 'custom';
	}
	function setProfitShare(value: number) {
		scenario = withProfitShare(scenario, value);
		markCustom();
	}
	function exportCsv() {
		if (!result) return;
		const rows = [
			[
				'Line item',
				'Producing current',
				'Producing proposed',
				'Selling current',
				'Selling proposed'
			],
			['Customer invoice', 0, 0, scenario.customerPrice, scenario.customerPrice],
			['Intercompany revenue', result.transfer, result.transfer, 0, 0],
			['Intercompany revenue offset', 0, 0, 0, -result.transfer],
			[
				'Reported revenue',
				result.transfer,
				result.transfer,
				scenario.customerPrice,
				result.netRevenue
			],
			[
				'Own production COGS',
				scenario.producerCost,
				scenario.producerCost,
				scenario.sellerCost,
				scenario.sellerCost
			],
			['Intercompany COGS', 0, 0, result.transfer, 0],
			[
				'Total COGS',
				scenario.producerCost,
				scenario.producerCost,
				result.currentSellerCogs,
				scenario.sellerCost
			],
			[
				'Gross profit',
				result.producerProfit,
				result.producerProfit,
				result.sellerProfit,
				result.sellerProfit
			],
			[
				'Gross margin (%)',
				result.producerMargin,
				result.producerMargin,
				result.currentSellerMargin,
				result.proposedSellerMargin
			],
			[],
			['Assumptions', 'Value'],
			['Producing plant target (%)', scenario.producerGoal],
			['Selling plant target (%)', scenario.sellerGoal],
			['Producing plant profit share (%)', result.producerShare],
			['Consolidated revenue', scenario.customerPrice],
			['Consolidated cost', result.totalCost],
			['Consolidated gross profit', result.totalProfit],
			['Consolidated gross margin (%)', result.consolidatedMargin],
			['Internal management reporting illustration; not a change to underlying transactions.']
		];
		const csv = rows
			.map((row) =>
				row.map((value) => `"${String(value ?? 'N/A').replaceAll('"', '""')}"`).join(',')
			)
			.join('\r\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'ennis-margin-scenario.csv';
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
</script>

<svelte:head>
	<title>Margin Explorer · Ennis</title>
	<meta
		name="description"
		content="Explore how intercompany accounting affects plant margins. Compare current and proposed management reporting in real time."
	/>
</svelte:head>

<Header class="app-header">
	<Div class="header-inner">
		<A href="/" class="brand" aria-label="Ennis Margin Explorer home">
			<EnnisLogo width={144} height={56} class="brand-logo" />
		</A>
		<Span class="header-divider" /><Span class="app-name">Plant performance tools</Span>
		<Badge class="internal-badge"><Span class="status-dot" /> Internal management reporting</Badge>
		<ThemeSelect />
	</Div>
</Header>

<Main class="workspace">
	<Nav class="breadcrumb" aria-label="Breadcrumb"
		><Span>Finance & operations</Span><Icon name="chevron" size={12} /><Span
			class="breadcrumb-current">Margin explorer</Span
		></Nav
	>
	<Div class="page-heading">
		<Div
			><Div class="eyebrow">A CLEARER PICTURE OF COLLABORATION</Div><H1 class="page-title"
				>Same profit. Different perspective.</H1
			><P class="page-description"
				>Explore how intercompany reporting changes the story behind your plant’s margin.</P
			></Div
		>
		<Button class="export-button" onclick={exportCsv} disabled={!result}
			><Icon name="download" size={17} /> Export scenario</Button
		>
	</Div>
	<Div class="explorer-grid">
		<Aside class="input-column" aria-label="Scenario inputs">
			<Card class="panel input-panel">
				<Div class="section-title"
					><Div class="title-with-icon"
						><Icon name="sliders" size={18} /><H2 class="panel-title">Build your scenario</H2></Div
					><Badge class="live-badge"><Span class="status-dot" /> Live</Badge></Div
				>
				<Label for="example" class="field-label">Start with an example</Label>
				<Select
					id="example"
					class="scenario-select"
					bind:value={preset}
					onchange={(event) => loadExample(event.currentTarget.value)}
					options={[
						{ value: 'manufacturing', label: 'Additional manufacturing' },
						{ value: 'passThrough', label: 'Pass-through · no added work' },
						{ value: 'custom', label: 'Custom scenario' }
					]}
				/>
				<P class="field-hint">Explore two sample project scenarios.</P>
				<Div class="plant-input-group">
					<Div class="plant-label"
						><Span class="plant-tag producer-tag">A</Span><H3 class="plant-title"
							>Producing plant</H3
						></Div
					>
					<Label for="producer-revenue" class="field-label">Revenue to selling plant</Label>
					<Div class="input-wrap"
						><Span class="input-prefix">$</Span><Input
							id="producer-revenue"
							type="number"
							step="1000"
							bind:value={scenario.producerRevenue}
							oninput={markCustom}
							class="number-input money-input invoice-input"
						/></Div
					>
					<Label for="producer-cost" class="field-label">Own production cost</Label>
					<Div class="input-wrap"
						><Span class="input-prefix">$</Span><Input
							id="producer-cost"
							type="number"
							min="0"
							step="1000"
							bind:value={scenario.producerCost}
							oninput={markCustom}
							class="number-input money-input"
						/></Div
					>
					<Label for="producer-goal" class="field-label">Goal gross margin</Label>
					<Div class="input-wrap"
						><Input
							id="producer-goal"
							type="number"
							min="0"
							max="99.99"
							step="1"
							bind:value={scenario.producerGoal}
							oninput={markCustom}
							class="number-input percent-input"
						/><Span class="input-suffix">%</Span></Div
					>
				</Div>
				<Div class="plant-input-group">
					<Div class="plant-label"
						><Span class="plant-tag seller-tag">B</Span><H3 class="plant-title">Selling plant</H3
						></Div
					>
					<Label for="customer-price" class="field-label">Revenue from customer</Label>
					<Div class="input-wrap"
						><Span class="input-prefix">$</Span><Input
							id="customer-price"
							type="number"
							min="0"
							step="1000"
							bind:value={scenario.customerPrice}
							oninput={markCustom}
							class="number-input money-input invoice-input"
						/></Div
					>
					<Label for="seller-cost" class="field-label">Own production cost</Label>
					<Div class="input-wrap"
						><Span class="input-prefix">$</Span><Input
							id="seller-cost"
							type="number"
							min="0"
							step="1000"
							bind:value={scenario.sellerCost}
							oninput={markCustom}
							class="number-input money-input"
						/></Div
					>
					<Label for="seller-goal" class="field-label">Goal gross margin</Label>
					<Div class="input-wrap"
						><Input
							id="seller-goal"
							type="number"
							min="0"
							max="99.99"
							step="1"
							bind:value={scenario.sellerGoal}
							oninput={markCustom}
							class="number-input percent-input"
						/><Span class="input-suffix">%</Span></Div
					>
				</Div>
				<Div class="invoice-input-group">
					<Button
						class="goal-button"
						disabled={!result}
						onclick={() => {
							scenario = priceAtGoals(scenario);
							markCustom();
						}}>Price each plant’s contribution at goal <Icon name="arrow" size={14} /></Button
					>
				</Div>
				<Button class="reset-button" onclick={() => loadExample('manufacturing')}
					><Icon name="reset" size={15} /> Reset to original example</Button
				>
			</Card>
			<Div class="input-note"
				><Icon name="info" size={16} /><P class="note-text"
					>All amounts are per project, in USD. Change any input to see the impact instantly.</P
				></Div
			>
		</Aside>
		<Div class="results-column">
			{#if errors.length}
				<Alert class="validation-alert" role="alert"
					><H2 class="panel-title">Check your inputs</H2>{#each errors as error (error)}<P
							>{error}</P
						>{/each}</Alert
				>
			{:else if result}
				<Div class="metric-grid" aria-label="Scenario summary">
					<Card class="panel metric-card"
						><Div class="metric-label">TOTAL CUSTOMER REVENUE<Icon name="document" size={17} /></Div
						><P class="metric-value">{money(scenario.customerPrice!)}</P><P class="metric-foot"
							>One customer. Two collaborating plants.</P
						></Card
					>
					<Card class="panel metric-card"
						><Div class="metric-label">COMBINED GROSS PROFIT<Icon name="chart" size={17} /></Div><P
							class="metric-value"
							>{money(result.totalProfit)}<Badge class="neutral-badge"
								>{percent(result.consolidatedMargin)} margin</Badge
							></P
						><P class="metric-foot"
							><Span class="mini-check">✓</Span> Unchanged by the reporting method</P
						></Card
					>
					<Card class="panel metric-card impact-metric"
						><Div class="metric-label"
							>SELLING PLANT MARGIN IMPACT<Icon name="arrow" size={17} /></Div
						><P class="metric-value"
							>{marginLift === null
								? 'N/A'
								: `${marginLift >= 0 ? '+' : ''}${marginLift.toFixed(1)}`}<Span class="metric-unit"
								>{marginLift === null ? '' : 'pts'}</Span
							></P
						><P class="metric-foot"
							>{percent(result.currentSellerMargin)} current <Span class="inline-arrow">→</Span>
							{percent(result.proposedSellerMargin)} proposed</P
						></Card
					>
				</Div>
				<Card class="panel allocation-panel">
					<Div class="allocation-heading"
						><Div
							><H2 class="panel-title">How is the profit shared?</H2><P class="panel-description"
								>Move the split to explore the trade-off between plants.</P
							></Div
						><Badge class="fixed-badge">Customer price stays fixed</Badge></Div
					>
					<Div class="share-labels"
						><Div
							><Span class="dot producer-dot" /><Span>Producing plant</Span><Strong
								class="share-percentage">{percent(result.producerShare)}</Strong
							></Div
						><Div
							><Strong class="share-percentage">{percent(result.sellerShare)}</Strong><Span
								>Selling plant</Span
							><Span class="dot seller-dot" /></Div
						></Div
					>
					<Range
						id="profit-share"
						aria-label="Producing plant share of total gross profit"
						aria-valuetext={`${percent(result.producerShare)} producing plant, ${percent(result.sellerShare)} selling plant`}
						min={sliderMin}
						max={sliderMax}
						step={0.1}
						bind:value={() => result?.producerShare ?? 50, setProfitShare}
						disabled={result.producerShare === null}
						isLabelVisible={false}
						class="profit-slider"
					>
						{#snippet track()}<Div class="slider-track" />{/snippet}
						{#snippet fill()}<Div class="slider-fill" />{/snippet}
						{#snippet thumb()}<Div class="slider-thumb"><Span /><Span /></Div>{/snippet}
					</Range>
					<Div class="share-amounts"
						><Span>{money(result.producerProfit)} gross profit</Span><Button
							class="split-button"
							disabled={result.producerShare === null}
							onclick={() => setProfitShare(50)}>Split equally</Button
						><Span>{money(result.sellerProfit)} gross profit</Span></Div
					>
					{#if result.producerShare === null}
						<P class="allocation-note"
							>Combined gross profit is zero, so percentage shares are undefined. Edit either
							plant’s revenue to explore another split.</P
						>
					{:else if result.producerShare < 0 || result.producerShare > 100}
						<P class="allocation-note"
							>One plant earns a profit while the other takes a loss. The slider extends beyond
							0–100% to show this allocation.</P
						>
					{/if}
					<Div class="transfer-line"
						><Icon name="plant" size={17} /><Span>Intercompany invoice</Span><Span
							class="transfer-arrow">A <Icon name="arrow" size={15} /> B</Span
						><Strong>{money(result.transfer)}</Strong><Span class="transfer-formula"
							>Production cost + allocated profit</Span
						></Div
					>
				</Card>
				{#if result.totalProfit < 0 || result.transfer < 0 || result.netRevenue <= 0}
					<Alert class="edge-alert" role="status"
						><Icon name="info" size={18} /><P
							>{result.totalProfit < 0
								? 'This project has a loss. The slider allocates that loss between plants. '
								: ''}{result.transfer < 0
								? 'The allocation creates a negative intercompany invoice. '
								: ''}{result.netRevenue <= 0
								? 'Selling plant net revenue is zero or negative. Its proposed margin is N/A. '
								: ''}Margins on zero or negative revenue are shown as N/A.</P
						></Alert
					>
				{/if}
				<Card class="panel comparison-panel">
					<Div class="comparison-heading"
						><Div
							><H2 class="panel-title">The margin perspective</H2><P class="panel-description"
								>Same transaction, viewed through two reporting methods.</P
							></Div
						><Div class="view-switch" role="group" aria-label="Comparison view"
							><Button
								class={view === 'visual' ? 'view-button active' : 'view-button'}
								aria-pressed={view === 'visual'}
								onclick={() => (view = 'visual')}><Icon name="chart" size={14} /> Visual</Button
							><Button
								class={view === 'table' ? 'view-button active' : 'view-button'}
								aria-pressed={view === 'table'}
								onclick={() => (view = 'table')}>P&L details</Button
							></Div
						></Div
					>
					{#if view === 'visual'}
						<Div class="chart-legend"
							><Span><Span class="legend-swatch current-swatch" /> Current reporting</Span><Span
								><Span class="legend-swatch proposed-swatch" /> Proposed reporting</Span
							><Span><Span class="legend-target" /> Plant goal</Span></Div
						>
						<Div class="margin-chart">
							{#each [{ name: 'Producing plant', tag: 'A', goal: scenario.producerGoal!, current: result.producerMargin, proposed: result.producerMargin }, { name: 'Selling plant', tag: 'B', goal: scenario.sellerGoal!, current: result.currentSellerMargin, proposed: result.proposedSellerMargin }] as plant (plant.tag)}
								<Div class="chart-plant"
									><Div class="chart-plant-heading"
										><Span
											class={plant.tag === 'A' ? 'plant-tag producer-tag' : 'plant-tag seller-tag'}
											>{plant.tag}</Span
										><H3 class="plant-title">{plant.name}</H3><Span class="chart-goal"
											>Goal: {percent(plant.goal)}</Span
										></Div
									>
									<Div class="bar-group">
										<Div
											class="bar-row"
											aria-label={`${plant.name} current margin: ${percent(plant.current)}`}
											><Span class="bar-caption">Current</Span><Div class="bar-track"
												><Div class="goal-marker" style={`left: ${plotWidth(plant.goal)}`} /><Div
													class="margin-bar current-bar"
													style={`width: ${plotWidth(plant.current)}`}
												/></Div
											><Strong
												class={plant.current !== null && plant.current + 0.00001 < plant.goal
													? 'bar-value below-goal'
													: 'bar-value'}>{percent(plant.current)}</Strong
											></Div
										>
										<Div
											class="bar-row"
											aria-label={`${plant.name} proposed margin: ${percent(plant.proposed)}`}
											><Span class="bar-caption">Proposed</Span><Div class="bar-track"
												><Div class="goal-marker" style={`left: ${plotWidth(plant.goal)}`} /><Div
													class="margin-bar proposed-bar"
													style={`width: ${plotWidth(plant.proposed)}`}
												/></Div
											><Strong class="bar-value">{percent(plant.proposed)}</Strong></Div
										>
									</Div>
									<Div class="chart-plant-foot"
										>{plant.tag === 'A'
											? 'Reporting is unchanged for the producing plant.'
											: `Gross profit stays ${money(result.sellerProfit)} under both methods.`}</Div
									>
								</Div>
							{/each}
						</Div>
						<Div class="chart-insight"
							><Span class="insight-icon"><Icon name="info" size={18} /></Span><P
								>{#if marginLift !== null && marginLift > 0.00001}The selling plant’s margin rises
									by <Strong>{marginLift.toFixed(1)} percentage points</Strong> simply by moving the intercompany
									invoice from COGS to a revenue offset.{:else}Reporting changes the revenue
									denominator. It preserves each plant’s gross profit dollars at the selected split.{/if}</P
							></Div
						>
					{:else}
						<Div class="table-scroll"
							><Table class="pnl-table"
								><Thead
									><Tr
										><Th rowspan={2} scope="col">Per-project P&L</Th><Th
											colspan={2}
											scope="colgroup">A · Producing plant</Th
										><Th colspan={2} scope="colgroup">B · Selling plant</Th></Tr
									><Tr
										><Th scope="col">Current</Th><Th scope="col" class="proposed-col">Proposed</Th
										><Th scope="col">Current</Th><Th scope="col" class="proposed-col">Proposed</Th
										></Tr
									></Thead
								><Tbody>
									{#each pnlRows as row (row.label)}<Tr class={row.total ? 'total-row' : ''}
											><Th scope="row">{row.label}</Th>{#each row.values as value, i (i)}<Td
													class={i % 2 === 1 ? 'proposed-col' : ''}>{money(value)}</Td
												>{/each}</Tr
										>{/each}
									<Tr class="margin-total"
										><Th scope="row">Gross margin</Th><Td>{percent(result.producerMargin)}</Td><Td
											class="proposed-col">{percent(result.producerMargin)}</Td
										><Td>{percent(result.currentSellerMargin)}</Td><Td class="proposed-col"
											>{percent(result.proposedSellerMargin)}</Td
										></Tr
									>
								</Tbody></Table
							></Div
						>
						<P class="table-note"
							>Plant revenues include intercompany activity. Consolidation eliminates the transfer;
							customer revenue and combined profit stay unchanged.</P
						>
					{/if}
				</Card>
				<Div class="bottom-grid">
					<Card class="panel pricing-panel"
						><Span class="eyebrow">THE PRICING PRESSURE</Span><H3 class="small-card-title"
							>What if both plants hit their goals?</H3
						><P class="pricing-description"
							>With the producer at its goal, current reporting requires a customer price of:</P
						><Div class="pricing-value"
							>{money(result.currentTargetPrice)}{#if result.pricePremium !== null}<Badge
									class="premium-badge">+{result.pricePremium.toFixed(1)}%</Badge
								>{/if}</Div
						><P class="pricing-foot"
							>vs. {money(result.contributionPrice)} when pricing each plant’s own contribution at goal.</P
						></Card
					>
					<Card class="reconciliation-panel"
						><Span class="reconciliation-icon"><Icon name="check" size={21} /></Span><H3
							class="small-card-title">The business hasn’t changed.</H3
						><P
							>The proposal changes internal presentation. At the same split, both plants keep the
							same profit dollars.</P
						><Div class="reconciliation-totals"
							><Span>Consolidated gross profit</Span><Strong>{money(result.totalProfit)}</Strong
							></Div
						><Div class="reconciliation-totals"
							><Span>Change from reporting method</Span><Strong>$0</Strong></Div
						></Card
					>
				</Div>
			{/if}
		</Div>
	</Div>
	<Section class="methodology" id="methodology" aria-label="Model methodology"
		><Accordion
			summary="Understand the model & accounting assumptions"
			class="methodology-accordion"
			><Div class="methodology-grid"
				><Div
					><H3 class="plant-title">Current reporting</H3><P
						>The producer records its intercompany invoice as revenue and its own production costs
						as COGS. The seller records the full customer invoice as revenue, with both the
						intercompany purchase and its own production costs in COGS.</P
					></Div
				><Div
					><H3 class="plant-title">Proposed presentation</H3><P
						>The producer’s P&L stays the same. The seller deducts the intercompany invoice from
						reported revenue and includes only its own production costs in COGS. This is an internal
						management reporting proposal.</P
					></Div
				><Div
					><H3 class="plant-title">Profit allocation & targets</H3><P
						>Total gross profit = customer invoice − both plants’ own costs. The slider allocates
						these dollars; the transfer is producer cost + its allocated profit. Goal margins are
						percentages of revenue, not markups on cost. “Price at goal” uses cost ÷ (1 − goal) for
						each contribution.</P
					></Div
				><Div
					><H3 class="plant-title">Reading the results</H3><P
						>Figures model a single project’s gross profit, not a plant’s entire P&L or OPI. No
						operating expenses are included. A pass-through seller with no own COGS has a 100%
						proposed gross margin when net revenue is positive. Zero or negative revenue gives N/A.
						Negative chart bars are clipped at zero; exact loss margins are shown numerically.
						Calculations retain full precision; displayed dollars are rounded.</P
					></Div
				></Div
			></Accordion
		></Section
	>
	<Footer class="app-footer"
		><Span class="footer-brand"
			><EnnisLogo width={70} height={28} class="footer-logo" /> Working better, together.</Span
		><Span>Scenario planning · Internal management reporting</Span></Footer
	>
</Main>
