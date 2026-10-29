import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examples, withProfitShare } from '../src/lib/accounting.ts';
import { readScenarioParams, writeScenarioParams } from '../src/lib/scenario-url.ts';

test('links round-trip full precision, zero, negative and empty inputs', () => {
	const state = {
		scenario: {
			...withProfitShare(examples.manufacturing, 33.33333333333333),
			sellerCost: 0,
			producerGoal: undefined,
			customerPrice: -1
		},
		preset: 'custom',
		view: 'table' as const
	};
	const url = writeScenarioParams(new URL('https://example.com/?campaign=demo#methodology'), state);
	assert.deepEqual(readScenarioParams(url.searchParams), state);
	assert.equal(url.searchParams.get('campaign'), 'demo');
	assert.equal(url.hash, '#methodology');
});

test('missing values use the selected example and overrides mark it custom', () => {
	assert.deepEqual(readScenarioParams(new URLSearchParams()).scenario, examples.manufacturing);
	const passThrough = readScenarioParams(new URLSearchParams('preset=passThrough'));
	assert.deepEqual(passThrough.scenario, examples.passThrough);
	assert.equal(passThrough.preset, 'passThrough');
	const custom = readScenarioParams(new URLSearchParams('preset=passThrough&sellerCost=123'));
	assert.equal(custom.scenario.sellerCost, 123);
	assert.equal(custom.preset, 'custom');
});

test('malformed parameters cannot inject non-finite values or unknown presets/views', () => {
	const state = readScenarioParams(
		new URLSearchParams(
			'preset=__proto__&view=unknown&producerCost=NaN&sellerCost=Infinity&producerGoal=abc'
		)
	);
	assert.equal(state.scenario.producerCost, undefined);
	assert.equal(state.scenario.sellerCost, undefined);
	assert.equal(state.scenario.producerGoal, undefined);
	assert.equal(state.scenario.customerPrice, examples.manufacturing.customerPrice);
	assert.equal(state.preset, 'custom');
	assert.equal(state.view, 'visual');
});
