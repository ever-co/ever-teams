import { describe, expect, it } from '@jest/globals';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';
import {
	BUDGET_PROJECT_PARAM,
	budgetFiltersOfLink,
	budgetRowsOf,
	EMPTY_BUDGET_FILTERS,
	filteredBudgetRowsOf,
	projectBudgetPathOf,
	projectNamesByIdOf
} from './project-budget';

function projectOf(id: string, overrides: Partial<TOrganizationProject> = {}): TOrganizationProject {
	return { id, name: id, public: null, owner: null, code: null, ...overrides };
}

function reportOf(id: string, budgetType: EProjectBudgetType, budget: number, spent: number): TProjectBudgetReport {
	return { project: { id, name: id }, budgetType, budget, spent, remainingBudget: 0, spentPercentage: 0 };
}

function rowsOf(reports: TProjectBudgetReport[], projects: TOrganizationProject[]) {
	return budgetRowsOf({ reports, projects, organizationCurrency: 'EUR', unnamedLabel: 'Unnamed' });
}

describe('projectBudgetPathOf', () => {
	it('names the project in the address of the report', () => {
		expect(projectBudgetPathOf('p-1')).toBe('/reports/project-budget?project=p-1');
	});

	it('keeps an id with reserved characters as one value', () => {
		const path = projectBudgetPathOf('a&b=c');
		const query = path.split('?')[1];
		const params = new URLSearchParams(query);

		expect(params.get(BUDGET_PROJECT_PARAM)).toBe('a&b=c');
	});
});

describe('budgetFiltersOfLink', () => {
	it('filters the report on the project its link names', () => {
		expect(budgetFiltersOfLink('p-1')).toEqual({ projects: ['p-1'], budgetTypes: [], statuses: [] });
		expect(budgetFiltersOfLink('  p-1  ').projects).toEqual(['p-1']);
	});

	it('applies no filter when the link names no project', () => {
		expect(budgetFiltersOfLink(null)).toBe(EMPTY_BUDGET_FILTERS);
		expect(budgetFiltersOfLink(undefined)).toBe(EMPTY_BUDGET_FILTERS);
		expect(budgetFiltersOfLink('   ')).toBe(EMPTY_BUDGET_FILTERS);
	});

	it('leaves the project of the link alone on the report', () => {
		const rows = rowsOf(
			[reportOf('p-1', EProjectBudgetType.HOURS, 80, 40), reportOf('p-2', EProjectBudgetType.HOURS, 10, 2)],
			[]
		);
		const shown = filteredBudgetRowsOf(rows, budgetFiltersOfLink('p-2'));

		expect(shown.map((row) => row.project.id)).toEqual(['p-2']);
	});
});

describe('projectNamesByIdOf', () => {
	it('names the projects that have a name', () => {
		const names = projectNamesByIdOf([projectOf('p-1', { name: 'Website' }), projectOf('p-2', { name: '  ' })]);

		expect(names).toEqual({ 'p-1': 'Website' });
	});
});

describe('budgetRowsOf', () => {
	it('states the time of an hours project in hours, against its budget', () => {
		const [row] = rowsOf([reportOf('p-1', EProjectBudgetType.HOURS, 80, 60)], []);

		expect(row.budgetType).toBe(EProjectBudgetType.HOURS);
		expect(row.currency).toBeNull();
		expect(row.hasBudget).toBe(true);
		expect(row.hasTime).toBe(true);
		expect(row.share).toBe(75);
		expect(row.remaining).toBe(20);
		expect(row.verdict).toBe('within');
	});

	it('marks a project past its budget and counts what it is over by', () => {
		const [row] = rowsOf([reportOf('p-1', EProjectBudgetType.HOURS, 10, 12.5)], []);

		expect(row.verdict).toBe('over');
		expect(row.risk).toBe('over');
		expect(row.remaining).toBe(-2.5);
	});

	it('states a cost in the currency of the project, else of the organisation', () => {
		const projects = [projectOf('p-1', { currency: 'USD' }), projectOf('p-2')];
		const rows = rowsOf(
			[
				reportOf('p-1', EProjectBudgetType.COST, 4000, 1000),
				reportOf('p-2', EProjectBudgetType.COST, 4000, 1000)
			],
			projects
		);

		expect(rows.map((row) => row.currency)).toEqual(['USD', 'EUR']);
	});

	it('keeps a tracked project without a budget, with nothing to measure against', () => {
		const [row] = rowsOf([reportOf('p-1', EProjectBudgetType.HOURS, 0, 3)], []);

		expect(row.hasBudget).toBe(false);
		expect(row.risk).toBe('noBudget');
		expect(row.spent).toBe(3);
	});

	it('adds a budgeted project nobody tracked on, and leaves out one with neither time nor budget', () => {
		const projects = [projectOf('idle', { budgetType: EProjectBudgetType.HOURS, budget: 20 }), projectOf('bare')];
		const rows = rowsOf([], projects);

		expect(rows).toHaveLength(1);
		expect(rows[0].project.id).toBe('idle');
		expect(rows[0].hasTime).toBe(false);
		expect(rows[0].risk).toBe('noTime');
		expect(rows[0].spent).toBe(0);
	});
});
