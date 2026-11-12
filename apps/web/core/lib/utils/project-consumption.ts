import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TEditProjectRequest, TOrganizationProject } from '@/core/types/schemas';
import {
	amountTextOf,
	isHoursBudget,
	type BudgetRow,
	type BudgetScope
} from '@/core/lib/utils/dashboards/project-budget';
import { compareWithUnsetLast, sortProjects, type ProjectOrdering } from '@/core/lib/utils/project-list';

/** Projects quote the budget report over a project's whole life, the scope the report itself opens on. */
export const CONSUMPTION_SCOPE: BudgetScope = 'whole';

type ProjectTimeSpentKind = 'tracked' | 'none' | 'asCost';

interface ProjectTimeSpent {
	kind: ProjectTimeSpentKind;
	/** The tracked hours as the report states them; null without time, and when the report states a cost. */
	hours: number | null;
}

type BudgetRowLookup = (projectId: string) => BudgetRow | undefined;

const NO_TIME: ProjectTimeSpent = { kind: 'none', hours: null };

const TIME_AS_COST: ProjectTimeSpent = { kind: 'asCost', hours: null };

const HOURS_UNIT = { budgetType: EProjectBudgetType.HOURS, currency: null };

const BY_NAME: ProjectOrdering = { id: 'name', desc: false };

/**
 * The Project Budget report states a project's time in hours only when its budget type is hours. For any other
 * type it states what that time costs at each member's rate, and the hours themselves are not returned.
 */
export function timeSpentOf(row: BudgetRow | undefined): ProjectTimeSpent {
	if (!row) {
		return NO_TIME;
	}
	if (!row.hasTime) {
		return NO_TIME;
	}
	if (!isHoursBudget(row)) {
		return TIME_AS_COST;
	}
	return { kind: 'tracked', hours: row.spent };
}

export function timeSpentTextOf(hours: number, locale: string) {
	return amountTextOf(hours, HOURS_UNIT, locale);
}

export function budgetUseOf(row: BudgetRow | undefined): BudgetRow | null {
	if (!row) {
		return null;
	}
	if (!row.hasBudget) {
		return null;
	}
	return row;
}

/** Gauzy writes 0 when no budget was entered, so a zero budget reads as none. */
export function hasProjectBudget(project: Pick<TOrganizationProject, 'budget'>) {
	const budget = project.budget ?? 0;
	return budget > 0;
}

const BUDGET_FIELDS = ['budget', 'budgetType', 'currency'] as const;

type BudgetField = (typeof BUDGET_FIELDS)[number];

export type SavedProjectBudget = Partial<Pick<TOrganizationProject, BudgetField>>;

/** Gauzy writes no budget as 0 and no currency as null: a value that is not set reads the same however written. */
function budgetValueOf(value: unknown): string | null {
	const isUnset = value === undefined || value === null || value === '' || value === 0;
	if (isUnset) {
		return null;
	}
	return String(value);
}

function changesBudgetField(field: BudgetField, edit: TEditProjectRequest, saved: SavedProjectBudget | undefined) {
	const sent = edit[field];
	// A key without a value is left out of the request, so the API keeps what it has
	if (sent === undefined) {
		return false;
	}
	if (!saved) {
		return true;
	}
	return budgetValueOf(sent) !== budgetValueOf(saved[field]);
}

/**
 * Whether an edit changes what the budget report states of the project: its budget, its type or its currency. The
 * project wizard sends the three on every save, so they are compared with the project as it was. When the project
 * as it was is not known, a sent value counts as a change.
 */
export function editsProjectBudget(edit: TEditProjectRequest, saved?: SavedProjectBudget) {
	return BUDGET_FIELDS.some((field) => changesBudgetField(field, edit, saved));
}

export function budgetRowsByProjectOf(rows: ReadonlyArray<BudgetRow>): Map<string, BudgetRow> {
	const rowsByProject = new Map<string, BudgetRow>();
	for (const row of rows) {
		rowsByProject.set(row.project.id, row);
	}
	return rowsByProject;
}

type ProjectFigure = (row: BudgetRow | undefined) => number | null;

function hoursSpentOf(row: BudgetRow | undefined) {
	const timeSpent = timeSpentOf(row);
	return timeSpent.hours;
}

function shareUsedOf(row: BudgetRow | undefined) {
	const budgetUse = budgetUseOf(row);
	if (!budgetUse) {
		return null;
	}
	return budgetUse.share;
}

function figuresByProjectOf(projects: TOrganizationProject[], figureOf: ProjectFigure, rowOf: BudgetRowLookup) {
	const figures = new Map<string, number | null>();
	for (const project of projects) {
		const row = rowOf(project.id);
		const figure = figureOf(row);
		figures.set(project.id, figure);
	}
	return figures;
}

/** Names order the projects first, and the sort is stable: equal figures, and projects without one, stay by name. */
function sortedByFigure(
	projects: TOrganizationProject[],
	figureOf: ProjectFigure,
	rowOf: BudgetRowLookup,
	desc: boolean
) {
	const figures = figuresByProjectOf(projects, figureOf, rowOf);
	const sorted = sortProjects(projects, BY_NAME);
	sorted.sort((first, second) => {
		const firstFigure = figures.get(first.id) ?? null;
		const secondFigure = figures.get(second.id) ?? null;
		return compareWithUnsetLast(firstFigure, secondFigure, desc);
	});
	return sorted;
}

export function sortProjectsByTimeSpent(projects: TOrganizationProject[], rowOf: BudgetRowLookup, desc: boolean) {
	return sortedByFigure(projects, hoursSpentOf, rowOf, desc);
}

/** By the share of the budget used, a figure without a unit: hours and money budgets compare with each other. */
export function sortProjectsByBudgetUsed(projects: TOrganizationProject[], rowOf: BudgetRowLookup, desc: boolean) {
	return sortedByFigure(projects, shareUsedOf, rowOf, desc);
}

export function sortProjectsWithConsumption(
	projects: TOrganizationProject[],
	ordering: ProjectOrdering,
	rowOf: BudgetRowLookup
) {
	if (ordering.id === 'timeSpent') {
		return sortProjectsByTimeSpent(projects, rowOf, ordering.desc);
	}
	if (ordering.id === 'budgetUsed') {
		return sortProjectsByBudgetUsed(projects, rowOf, ordering.desc);
	}
	return sortProjects(projects, ordering);
}
