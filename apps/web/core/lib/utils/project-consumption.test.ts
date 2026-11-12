import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';
import { budgetRowsOf, type BudgetRow } from './dashboards/project-budget';
import {
	budgetRowsByProjectOf,
	budgetUseOf,
	editsProjectBudget,
	hasProjectBudget,
	sortProjectsByBudgetUsed,
	sortProjectsByTimeSpent,
	sortProjectsWithConsumption,
	timeSpentOf,
	timeSpentTextOf
} from './project-consumption';

function projectOf(id: string, overrides: Partial<TOrganizationProject> = {}): TOrganizationProject {
	return { id, name: id, public: null, owner: null, code: null, ...overrides };
}

function reportOf(id: string, budgetType: EProjectBudgetType, budget: number, spent: number): TProjectBudgetReport {
	return { project: { id, name: id }, budgetType, budget, spent, remainingBudget: 0, spentPercentage: 0 };
}

const PROJECTS: TOrganizationProject[] = [
	projectOf('hours-half', { budgetType: EProjectBudgetType.HOURS, budget: 80 }),
	projectOf('hours-over', { budgetType: EProjectBudgetType.HOURS, budget: 10 }),
	projectOf('hours-free', { budgetType: EProjectBudgetType.HOURS }),
	projectOf('cost-quarter', { budgetType: EProjectBudgetType.COST, budget: 4000, currency: 'USD' }),
	projectOf('cost-free', { budgetType: EProjectBudgetType.COST }),
	projectOf('budget-idle', { budgetType: EProjectBudgetType.HOURS, budget: 20 }),
	projectOf('untouched')
];

const REPORTS: TProjectBudgetReport[] = [
	reportOf('hours-half', EProjectBudgetType.HOURS, 80, 40),
	reportOf('hours-over', EProjectBudgetType.HOURS, 10, 12.5),
	reportOf('hours-free', EProjectBudgetType.HOURS, 0, 3.25),
	reportOf('cost-quarter', EProjectBudgetType.COST, 4000, 1000),
	reportOf('cost-free', EProjectBudgetType.COST, 0, 250)
];

const ROWS = budgetRowsOf({
	reports: REPORTS,
	projects: PROJECTS,
	organizationCurrency: 'EUR',
	unnamedLabel: 'Unnamed'
});

const ROWS_BY_PROJECT = budgetRowsByProjectOf(ROWS);

function rowOf(projectId: string): BudgetRow | undefined {
	return ROWS_BY_PROJECT.get(projectId);
}

function idsOf(projects: TOrganizationProject[]) {
	return projects.map((project) => project.id);
}

describe('budgetRowsByProjectOf', () => {
	it('finds the row of each project the report or a budget gives one to', () => {
		expect(rowOf('hours-half')?.spent).toBe(40);
		expect(rowOf('budget-idle')?.budget).toBe(20);
	});

	it('has no row for a project without time and without a budget', () => {
		expect(rowOf('untouched')).toBeUndefined();
	});
});

describe('timeSpentOf', () => {
	it('reads the hours of a project whose budget type is hours, with or without a budget', () => {
		expect(timeSpentOf(rowOf('hours-half'))).toEqual({ kind: 'tracked', hours: 40 });
		expect(timeSpentOf(rowOf('hours-free'))).toEqual({ kind: 'tracked', hours: 3.25 });
	});

	it('says the time is stated as a cost for the other budget type, and gives no hours', () => {
		expect(timeSpentOf(rowOf('cost-quarter'))).toEqual({ kind: 'asCost', hours: null });
		expect(timeSpentOf(rowOf('cost-free'))).toEqual({ kind: 'asCost', hours: null });
	});

	it('says no time for a budgeted project nobody tracked on, and for a project the report does not know', () => {
		expect(timeSpentOf(rowOf('budget-idle'))).toEqual({ kind: 'none', hours: null });
		expect(timeSpentOf(rowOf('untouched'))).toEqual({ kind: 'none', hours: null });
		expect(timeSpentOf(undefined)).toEqual({ kind: 'none', hours: null });
	});
});

describe('timeSpentTextOf', () => {
	it('writes the hours as the report writes a spent time', () => {
		expect(timeSpentTextOf(40, 'en')).toBe('40h 0m');
		expect(timeSpentTextOf(3.25, 'en')).toBe('3h 15m');
		expect(timeSpentTextOf(1204.5, 'en')).toBe('1,204h 30m');
	});
});

describe('budgetUseOf', () => {
	it('keeps the report row of a project with a budget, over it or not yet tracked', () => {
		expect(budgetUseOf(rowOf('hours-over'))?.verdict).toBe('over');
		expect(budgetUseOf(rowOf('cost-quarter'))?.share).toBe(25);
		expect(budgetUseOf(rowOf('budget-idle'))?.share).toBe(0);
	});

	it('gives nothing to meter for a project without a budget', () => {
		expect(budgetUseOf(rowOf('hours-free'))).toBeNull();
		expect(budgetUseOf(rowOf('cost-free'))).toBeNull();
		expect(budgetUseOf(undefined)).toBeNull();
	});
});

describe('hasProjectBudget', () => {
	it('reads a zero or a missing budget as no budget', () => {
		expect(hasProjectBudget(projectOf('p', { budget: 80 }))).toBe(true);
		expect(hasProjectBudget(projectOf('p', { budget: 0 }))).toBe(false);
		expect(hasProjectBudget(projectOf('p'))).toBe(false);
	});
});

describe('editsProjectBudget', () => {
	it('is true for an edit that sends the budget, its type or its currency', () => {
		expect(editsProjectBudget({ budget: 120 })).toBe(true);
		expect(editsProjectBudget({ budgetType: EProjectBudgetType.COST })).toBe(true);
		expect(editsProjectBudget({ currency: 'EUR' })).toBe(true);
	});

	it('is false for an edit of anything else', () => {
		expect(editsProjectBudget({ description: 'New scope' })).toBe(false);
		expect(editsProjectBudget({ isArchived: true })).toBe(false);
		expect(editsProjectBudget({})).toBe(false);
	});

	it('is false for a key without a value, which the request leaves out', () => {
		expect(editsProjectBudget({ name: 'Website', budget: undefined })).toBe(false);
	});

	it("is false when a save sends the project's own budget, type and currency again", () => {
		const saved = { budget: 80, budgetType: EProjectBudgetType.HOURS, currency: 'USD' };
		const renamed = { name: 'New name', budget: 80, budgetType: EProjectBudgetType.HOURS, currency: 'USD' };

		expect(editsProjectBudget(renamed, saved)).toBe(false);
	});

	it("is true when the sent budget, type or currency differs from the project's", () => {
		const saved = { budget: 80, budgetType: EProjectBudgetType.HOURS, currency: 'USD' };

		expect(editsProjectBudget({ budget: 120 }, saved)).toBe(true);
		expect(editsProjectBudget({ budgetType: EProjectBudgetType.COST }, saved)).toBe(true);
		expect(editsProjectBudget({ currency: 'EUR' }, saved)).toBe(true);
	});

	it('reads no budget the same, written 0 or left out', () => {
		expect(editsProjectBudget({ budget: 0 }, {})).toBe(false);
		expect(editsProjectBudget({ budget: 0 }, { budget: 80 })).toBe(true);
	});
});

describe('sortProjectsByTimeSpent', () => {
	it('puts the most hours first when descending, then the projects without hours by name', () => {
		const sorted = sortProjectsByTimeSpent(PROJECTS, rowOf, true);

		expect(idsOf(sorted)).toEqual([
			'hours-half',
			'hours-over',
			'hours-free',
			'budget-idle',
			'cost-free',
			'cost-quarter',
			'untouched'
		]);
	});

	it('keeps the projects without hours last when ascending too', () => {
		const sorted = sortProjectsByTimeSpent(PROJECTS, rowOf, false);

		expect(idsOf(sorted)).toEqual([
			'hours-free',
			'hours-over',
			'hours-half',
			'budget-idle',
			'cost-free',
			'cost-quarter',
			'untouched'
		]);
	});

	it('does not reorder the list it is given', () => {
		const before = idsOf(PROJECTS);

		sortProjectsByTimeSpent(PROJECTS, rowOf, true);

		expect(idsOf(PROJECTS)).toEqual(before);
	});
});

describe('sortProjectsByBudgetUsed', () => {
	it('compares hours and money budgets by the share used, the projects without a budget last', () => {
		const sorted = sortProjectsByBudgetUsed(PROJECTS, rowOf, true);

		expect(idsOf(sorted)).toEqual([
			'hours-over',
			'hours-half',
			'cost-quarter',
			'budget-idle',
			'cost-free',
			'hours-free',
			'untouched'
		]);
	});

	it('starts from the least used budget when ascending, the projects without a budget still last', () => {
		const sorted = sortProjectsByBudgetUsed(PROJECTS, rowOf, false);

		expect(idsOf(sorted)).toEqual([
			'budget-idle',
			'cost-quarter',
			'hours-half',
			'hours-over',
			'cost-free',
			'hours-free',
			'untouched'
		]);
	});

	it('falls back on the names while the report has not answered', () => {
		const sorted = sortProjectsByBudgetUsed(PROJECTS, () => undefined, true);

		expect(idsOf(sorted)).toEqual([
			'budget-idle',
			'cost-free',
			'cost-quarter',
			'hours-free',
			'hours-half',
			'hours-over',
			'untouched'
		]);
	});
});

describe('sortProjectsWithConsumption', () => {
	it('sorts by time spent and by budget used', () => {
		const byTime = sortProjectsWithConsumption(PROJECTS, { id: 'timeSpent', desc: true }, rowOf);
		const byBudget = sortProjectsWithConsumption(PROJECTS, { id: 'budgetUsed', desc: true }, rowOf);

		expect(idsOf(byTime)[0]).toBe('hours-half');
		expect(idsOf(byBudget)[0]).toBe('hours-over');
	});

	it('leaves the other orderings to the list', () => {
		const byName = sortProjectsWithConsumption(PROJECTS, { id: 'name', desc: true }, rowOf);

		expect(idsOf(byName)[0]).toBe('untouched');
	});
});
