export type Scenario = {
	producerCost: number | undefined;
	sellerCost: number | undefined;
	producerGoal: number | undefined;
	sellerGoal: number | undefined;
	customerPrice: number | undefined;
	producerRevenue: number | undefined;
};

export const examples: Record<string, Scenario> = {
	manufacturing: {
		producerCost: 70000,
		sellerCost: 35000,
		producerGoal: 30,
		sellerGoal: 30,
		customerPrice: 150000,
		producerRevenue: 100000
	},
	passThrough: {
		producerCost: 70000,
		sellerCost: 0,
		producerGoal: 30,
		sellerGoal: 30,
		customerPrice: 120000,
		producerRevenue: 100000
	}
};

export function validateScenario(s: Scenario): string[] {
	const errors: string[] = [];
	for (const [label, value] of [
		['Producing plant cost', s.producerCost],
		['Selling plant cost', s.sellerCost],
		['Customer invoice', s.customerPrice]
	] as const) {
		if (value === undefined || !Number.isFinite(value) || value < 0)
			errors.push(`${label} must be a number of zero or more.`);
	}
	for (const [label, value] of [
		['Producing plant goal', s.producerGoal],
		['Selling plant goal', s.sellerGoal]
	] as const) {
		if (value === undefined || !Number.isFinite(value) || value < 0 || value >= 100)
			errors.push(`${label} must be between 0% and less than 100%.`);
	}
	if (s.producerRevenue === undefined || !Number.isFinite(s.producerRevenue))
		errors.push('Producing plant revenue must be a number.');
	return errors;
}

/** A nonpositive revenue denominator has no meaningful gross margin. */
export function margin(profit: number, revenue: number): number | null {
	return revenue > 0 ? (profit / revenue) * 100 : null;
}

export function calculateScenario(s: Scenario) {
	if (validateScenario(s).length) return null;
	const producerCost = s.producerCost!;
	const sellerCost = s.sellerCost!;
	const customerPrice = s.customerPrice!;
	const totalCost = producerCost + sellerCost;
	const totalProfit = customerPrice - totalCost;
	// Invoice amounts are the source of truth; the profit split is derived from them.
	const transfer = s.producerRevenue!;
	const producerProfit = transfer - producerCost;
	const sellerProfit = totalProfit - producerProfit;
	const producerShare = totalProfit === 0 ? null : (producerProfit / totalProfit) * 100;
	const netRevenue = customerPrice - transfer;
	const producerGoalQuote = producerCost / (1 - s.producerGoal! / 100);
	const sellerGoalQuote = sellerCost / (1 - s.sellerGoal! / 100);
	const contributionPrice = producerGoalQuote + sellerGoalQuote;
	const currentTargetPrice = (producerGoalQuote + sellerCost) / (1 - s.sellerGoal! / 100);
	return {
		totalCost,
		totalProfit,
		producerProfit,
		producerShare,
		sellerShare: producerShare === null ? null : 100 - producerShare,
		sellerProfit,
		transfer,
		netRevenue,
		currentSellerCogs: transfer + sellerCost,
		producerMargin: margin(producerProfit, transfer),
		currentSellerMargin: margin(sellerProfit, customerPrice),
		proposedSellerMargin: margin(sellerProfit, netRevenue),
		consolidatedMargin: margin(totalProfit, customerPrice),
		producerGoalQuote,
		contributionPrice,
		currentTargetPrice,
		pricePremium: contributionPrice > 0 ? (currentTargetPrice / contributionPrice - 1) * 100 : null
	};
}

export function priceAtGoals(s: Scenario): Scenario {
	const result = calculateScenario(s);
	if (!result) return s;
	return {
		...s,
		customerPrice: result.contributionPrice,
		producerRevenue: result.producerGoalQuote
	};
}

/** Reallocate profit without changing the customer invoice or either plant's costs. */
export function withProfitShare(s: Scenario, producerShare: number): Scenario {
	const result = calculateScenario(s);
	if (!result || result.totalProfit === 0 || !Number.isFinite(producerShare)) return s;
	return {
		...s,
		producerRevenue: s.producerCost! + result.totalProfit * (producerShare / 100)
	};
}

export const money = (value: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(value);

export const percent = (value: number | null) => (value === null ? 'N/A' : `${value.toFixed(1)}%`);
