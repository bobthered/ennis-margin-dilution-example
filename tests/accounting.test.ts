import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	calculateScenario,
	examples,
	priceAtGoals,
	validateScenario,
	withProfitShare
} from '../src/lib/accounting.ts';

const close = (actual: number | null, expected: number) => {
	assert.notEqual(actual, null);
	assert.ok(Math.abs(actual! - expected) < 1e-8, `${actual} should equal ${expected}`);
};

test('email example: added manufacturing preserves $15k seller profit and restores 30% GPM', () => {
	const result = calculateScenario(examples.manufacturing)!;
	close(result.transfer, 100000);
	close(result.producerProfit, 30000);
	close(result.sellerProfit, 15000);
	close(result.producerMargin, 30);
	close(result.currentSellerMargin, 10);
	close(result.proposedSellerMargin, 30);
	close(result.netRevenue, 50000);
	close(result.totalProfit, 45000);
});

test('email example: pass-through has 16.7% current GPM and 100% contribution GPM', () => {
	const result = calculateScenario(examples.passThrough)!;
	close(result.transfer, 100000);
	close(result.sellerProfit, 20000);
	close(result.currentSellerMargin, 100 / 6);
	close(result.proposedSellerMargin, 100);
});

test('every profit split reconciles both P&Ls and consolidated profit', () => {
	for (const producerShare of [0, 0.1, 25, 50, 66.6666666667, 99.9, 100]) {
		const result = calculateScenario(withProfitShare(examples.manufacturing, producerShare))!;
		close(result.producerShare, producerShare);
		close(result.producerProfit + result.sellerProfit, 45000);
		close(result.transfer - examples.manufacturing.producerCost!, result.producerProfit);
		close(examples.manufacturing.customerPrice! - result.currentSellerCogs, result.sellerProfit);
		close(result.netRevenue - examples.manufacturing.sellerCost!, result.sellerProfit);
		close(result.transfer + result.netRevenue, examples.manufacturing.customerPrice!);
	}
});

test('separate goal margins price contributions without compounded markup', () => {
	const s = priceAtGoals({ ...examples.manufacturing, producerGoal: 25, sellerGoal: 40 });
	const result = calculateScenario(s)!;
	close(s.customerPrice!, 70000 / 0.75 + 35000 / 0.6);
	close(result.producerMargin, 25);
	close(result.proposedSellerMargin, 40);
	assert.ok(result.currentSellerMargin! < 40);
	close(result.currentTargetPrice, (70000 / 0.75 + 35000) / 0.6);
});

test('zero revenue, zero-cost jobs and zero contribution do not yield NaN or Infinity', () => {
	const zero = calculateScenario({
		...examples.manufacturing,
		producerCost: 0,
		sellerCost: 0,
		customerPrice: 0,
		producerRevenue: 0
	})!;
	assert.equal(zero.producerMargin, null);
	assert.equal(zero.currentSellerMargin, null);
	assert.equal(zero.proposedSellerMargin, null);
	assert.equal(zero.pricePremium, null);
	const noSellerContribution = calculateScenario(withProfitShare(examples.passThrough, 100))!;
	assert.equal(noSellerContribution.proposedSellerMargin, null);
	assert.ok(
		Number.isFinite(
			priceAtGoals({ ...examples.manufacturing, producerCost: 0, sellerCost: 0 }).producerRevenue
		)
	);
});

test('loss allocation preserves actual losses and handles negative revenue denominators', () => {
	const result = calculateScenario(
		withProfitShare(
			{
				...examples.manufacturing,
				customerPrice: 50000
			},
			50
		)
	)!;
	close(result.totalProfit, -55000);
	close(result.producerProfit, -27500);
	close(result.sellerProfit, -27500);
	assert.ok(result.currentSellerMargin! < 0);
	const negativeTransfer = calculateScenario(
		withProfitShare(
			{
				...examples.manufacturing,
				producerCost: 0,
				customerPrice: 0
			},
			100
		)
	)!;
	assert.ok(negativeTransfer.transfer < 0);
	assert.equal(negativeTransfer.producerMargin, null);
});

test('invalid or empty inputs suspend calculations', () => {
	for (const patch of [
		{ producerCost: undefined },
		{ sellerCost: -1 },
		{ customerPrice: NaN },
		{ producerGoal: 100 },
		{ sellerGoal: -0.1 },
		{ sellerGoal: Infinity },
		{ producerRevenue: undefined },
		{ producerRevenue: Infinity }
	]) {
		const s = { ...examples.manufacturing, ...patch };
		assert.ok(validateScenario(s).length);
		assert.equal(calculateScenario(s), null);
	}
});

test('editing producing revenue updates profit shares without changing customer revenue', () => {
	const result = calculateScenario({ ...examples.manufacturing, producerRevenue: 92500 })!;
	close(result.producerShare, 50);
	close(result.sellerShare, 50);
	close(result.producerProfit, 22500);
	close(result.sellerProfit, 22500);
	close(result.transfer, 92500);
});

test('editing customer revenue holds the intercompany invoice and recalculates both shares', () => {
	const s = { ...examples.manufacturing, customerPrice: 165000 };
	const result = calculateScenario(s)!;
	close(result.transfer, 100000);
	close(result.producerProfit, 30000);
	close(result.sellerProfit, 30000);
	close(result.producerShare, 50);
	const changed = withProfitShare(s, 25);
	close(changed.producerRevenue!, 85000);
	close(changed.customerPrice!, 165000);
	close(calculateScenario(changed)!.producerShare, 25);
});

test('offsetting plant profit and loss preserve invoice values at zero combined profit', () => {
	const s = { ...examples.manufacturing, customerPrice: 105000 };
	const result = calculateScenario(s)!;
	close(result.totalProfit, 0);
	close(result.producerProfit, 30000);
	close(result.sellerProfit, -30000);
	assert.equal(result.producerShare, null);
	assert.equal(result.sellerShare, null);
	assert.deepEqual(withProfitShare(s, 50), s);
});

test('invoice edits may imply shares outside 0–100 without silently changing entered revenue', () => {
	for (const producerRevenue of [60000, 120000]) {
		const s = { ...examples.manufacturing, producerRevenue };
		const result = calculateScenario(s)!;
		assert.ok(result.producerShare! < 0 || result.producerShare! > 100);
		close(result.transfer, producerRevenue);
		close(result.producerProfit + result.sellerProfit, result.totalProfit);
		const roundTrip = withProfitShare(s, result.producerShare!);
		close(roundTrip.producerRevenue!, producerRevenue);
	}
});
