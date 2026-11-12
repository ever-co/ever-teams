import { billableFieldOf, isBillableByDefault } from './project-billable';

describe('isBillableByDefault', () => {
	it('is true for a project that chose billable', () => {
		expect(isBillableByDefault({ billable: true })).toBe(true);
	});

	it.each([
		['chose not billable', { billable: false }],
		['never chose, the API holding null', { billable: null }],
		['came without the field', {}]
	])('reads a project that %s as not billable', (_case, project) => {
		expect(isBillableByDefault(project)).toBe(false);
	});

	it('reads a project that is not loaded as not billable', () => {
		expect(isBillableByDefault(null)).toBe(false);
		expect(isBillableByDefault(undefined)).toBe(false);
	});
});

describe('billableFieldOf', () => {
	it.each([true, false])('names the choice %s in the save', (billable) => {
		expect(billableFieldOf(billable)).toStrictEqual({ billable });
	});

	it('leaves the field out when no choice was made', () => {
		expect(billableFieldOf(null)).toStrictEqual({});
	});
});
