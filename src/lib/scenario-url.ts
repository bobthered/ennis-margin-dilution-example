import { examples, type Scenario } from './accounting.ts';

export type ScenarioState = {
	scenario: Scenario;
	preset: string;
	view: 'visual' | 'table';
};

const fields = Object.keys(examples.manufacturing) as (keyof Scenario)[];
const isExample = (key: string) => Object.hasOwn(examples, key);

export function readScenarioParams(params: Pick<URLSearchParams, 'get'>): ScenarioState {
	const requestedPreset = params.get('preset') ?? 'manufacturing';
	const base = examples[isExample(requestedPreset) ? requestedPreset : 'manufacturing'];
	const scenario = { ...base };
	for (const field of fields) {
		const raw = params.get(field);
		if (raw === null) continue;
		const value = Number(raw);
		scenario[field] = raw.trim() !== '' && Number.isFinite(value) ? value : undefined;
	}
	const matchesExample = fields.every((field) => scenario[field] === base[field]);
	return {
		scenario,
		preset: isExample(requestedPreset) && matchesExample ? requestedPreset : 'custom',
		view: params.get('view') === 'table' ? 'table' : 'visual'
	};
}

export function writeScenarioParams(url: URL, state: ScenarioState): URL {
	const next = new URL(url);
	for (const field of fields) {
		next.searchParams.set(field, state.scenario[field]?.toString() ?? '');
	}
	next.searchParams.set('preset', state.preset);
	next.searchParams.set('view', state.view);
	return next;
}
