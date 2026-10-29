# Ennis Margin Explorer

An interactive, per-project comparison of current intercompany reporting and the proposed internal management presentation for plant-level reporting.

## Run locally

Requires Node.js 22.18+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

## Explore a scenario

- Load either sample project or enter each plant's own production costs and goal gross margin.
- Enter revenue to the selling plant in the producing plant section, and customer revenue in the selling plant section. Either revenue input updates the profit-sharing slider immediately through Svelte 5 `$derived` state.
- Move the slider to allocate total gross profit dollars between the producing and selling plants. The intercompany invoice changes while the customer price and consolidated profit stay fixed.
- Compare reported margins visually or open **P&L details** for both plants under both methods.
- Use **Price each plant's contribution at goal** to calculate the customer price and split from the separate plant targets.
- Export the current inputs and P&Ls as CSV.
- Share the current scenario by copying the browser URL. All six numeric inputs, the selected example, and the comparison view update automatically in the search parameters and are restored when the link is opened or refreshed.

For example, `/?producerCost=70000&sellerCost=35000&producerGoal=30&sellerGoal=30&customerPrice=180000&producerRevenue=110000&preset=custom&view=table` opens a custom scenario in P&L details. Omitted inputs use the selected example (manufacturing by default); an empty value preserves a cleared input. Slider changes are saved through `producerRevenue`, which determines the profit split.

The goal inputs are benchmarks until the pricing action is used; changing a target alone does not change the customer price or profit allocation.

## Accounting model

Let `A` and `B` be each plant's own production costs, `P` the customer invoice, and `s` the producing plant's fraction of combined gross profit.

```text
Combined gross profit = P - A - B
Intercompany invoice T = producing plant revenue input
Producing plant profit = T - A
s = producing plant profit / combined gross profit
When moving the slider: T = A + s * combined gross profit
Selling plant profit = P - T - B

Producing revenue = T; COGS = A (both presentations)
Current selling revenue = P; COGS = T + B
Proposed selling revenue = P - T; COGS = B
Gross margin = gross profit / reported revenue
```

Consolidation eliminates the transfer. Both presentations preserve each plant's gross profit dollars at a given allocation and preserve total customer revenue and consolidated gross profit.

For target margin fractions `mA` and `mB`:

```text
Contribution-based quote = A / (1 - mA) + B / (1 - mB)
Current quote to achieve both reported targets = (A / (1 - mA) + B) / (1 - mB)
```

A seller with no own production cost can have a 100% proposed contribution margin. Margins with zero or negative revenue are N/A. Loss-making projects allocate losses using the same slider. Zero combined gross profit has no defined percentage split, so the slider is disabled while invoice inputs remain editable. If one plant earns profit while the other loses, the slider extends beyond 0?100% to represent the entered invoices. Negative intercompany revenue represents a credit. Negative margins are shown numerically, with chart bars clipped at zero. Inputs must be finite, costs and price nonnegative, and goals below 100%. Calculations retain precision; displayed currency is rounded to whole dollars.

This model covers project gross profit. It does not model full-plant revenue, operating expenses, OPI, or changes to underlying accounting transactions.

## Sveltewind setup

The interface uses primitives and composed components from `sveltewind/components`, with the minimal theme. Setup follows the [official installation guide](https://sveltewind.com/getting-started/installation) and the package README: Tailwind CSS 4, the palette stylesheet, a source directive relative to `src/routes/layout.css`, and theme initialization in the root layout. `@lucide/svelte` is installed because Sveltewind's component exports reference it. Vite bundles those source Svelte components for server rendering.

## Verify

```sh
npm test
npm run check
npm run lint
npm run build
```

The calculation tests cover both sample projects, allocation endpoints and reconciliation, distinct targets, invalid inputs, zero denominators, and losses. The project retains its Vercel adapter; no hosting or publication is performed by these commands.

The Ennis logo artwork and SVG favicon share a single source in `src/lib/components/EnnisLogo.svelte`.
