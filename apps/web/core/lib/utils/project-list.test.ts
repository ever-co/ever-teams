import type { TOrganizationProject } from '@/core/types/schemas';
import {
	compareWithUnsetLast,
	isConsumptionColumn,
	isConsumptionOrderField,
	PROJECT_COLUMNS,
	sortProjects
} from './project-list';

function projectOf(id: string, overrides: Partial<TOrganizationProject> = {}): TOrganizationProject {
	return { id, name: id, public: null, owner: null, code: null, ...overrides };
}

function idsOf(projects: TOrganizationProject[]) {
	return projects.map((project) => project.id);
}

describe('compareWithUnsetLast', () => {
	it('orders two values by the direction asked', () => {
		expect(compareWithUnsetLast(1, 2, false)).toBeLessThan(0);
		expect(compareWithUnsetLast(1, 2, true)).toBeGreaterThan(0);
		expect(compareWithUnsetLast(2, 2, false)).toBeCloseTo(0);
		expect(compareWithUnsetLast(2, 2, true)).toBeCloseTo(0);
	});

	it('puts an unset value after a set one in both directions', () => {
		expect(compareWithUnsetLast(null, 2, false)).toBeGreaterThan(0);
		expect(compareWithUnsetLast(null, 2, true)).toBeGreaterThan(0);
		expect(compareWithUnsetLast(2, null, false)).toBeLessThan(0);
		expect(compareWithUnsetLast(2, null, true)).toBeLessThan(0);
	});

	it('leaves two unset values as they are', () => {
		expect(compareWithUnsetLast(null, null, false)).toBe(0);
		expect(compareWithUnsetLast(null, null, true)).toBe(0);
	});
});

describe('sortProjects', () => {
	const projects = [
		projectOf('undated'),
		projectOf('march', { startDate: new Date(2026, 2, 1) }),
		projectOf('january', { startDate: new Date(2026, 0, 1) }),
		projectOf('epoch', { startDate: new Date(1970, 0, 1) })
	];

	it('keeps the projects without a start date last when the dates ascend', () => {
		const sorted = sortProjects(projects, { id: 'startDate', desc: false });

		expect(idsOf(sorted)).toEqual(['january', 'march', 'undated', 'epoch']);
	});

	it('keeps them last when the dates descend too', () => {
		const sorted = sortProjects(projects, { id: 'startDate', desc: true });

		expect(idsOf(sorted)).toEqual(['march', 'january', 'undated', 'epoch']);
	});

	it('falls back on the name for an ordering that needs the budget report', () => {
		const sorted = sortProjects(projects, { id: 'timeSpent', desc: false });

		expect(idsOf(sorted)).toEqual(['epoch', 'january', 'march', 'undated']);
	});
});

describe('columns and orderings read from the budget report', () => {
	it('names the time spent column, and no other', () => {
		const consumptionColumns = PROJECT_COLUMNS.filter((column) => isConsumptionColumn(column));

		expect(consumptionColumns).toEqual(['timeSpent']);
	});

	it('names the two orderings by consumption', () => {
		expect(isConsumptionOrderField('timeSpent')).toBe(true);
		expect(isConsumptionOrderField('budgetUsed')).toBe(true);
		expect(isConsumptionOrderField('name')).toBe(false);
		expect(isConsumptionOrderField('startDate')).toBe(false);
	});
});
