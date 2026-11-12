/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ProjectConsumptionState } from '@/core/hooks/projects/use-project-consumption';
import { budgetRowsOf } from '@/core/lib/utils/dashboards/project-budget';
import { budgetRowsByProjectOf } from '@/core/lib/utils/project-consumption';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';
import { ProjectBudgetSummary } from './project-budget-summary';

const mockCanSeeConsumption = jest.fn();
const mockUseConsumption = jest.fn();

jest.mock('@/core/hooks/projects/use-project-consumption', () => ({
	useCanSeeProjectConsumption: () => mockCanSeeConsumption(),
	useProjectConsumption: (options: { isEnabled: boolean }) => mockUseConsumption(options)
}));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) => {
		if (!values) {
			return key;
		}
		const written = Object.values(values).join('|');
		return `${key}:${written}`;
	},
	useLocale: () => 'en'
}));

jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>
}));

// The orb of the failure notice reads `window.matchMedia`, which jsdom does not provide.
jest.mock('@/core/components/common/toast-orb', () => ({
	ToastOrb: () => <span />,
	orbToneColor: () => 'currentColor'
}));

function projectOf(id: string, overrides: Partial<TOrganizationProject> = {}): TOrganizationProject {
	return { id, name: id, public: null, owner: null, code: null, ...overrides };
}

function reportOf(id: string, budgetType: EProjectBudgetType, budget: number, spent: number): TProjectBudgetReport {
	return { project: { id, name: id }, budgetType, budget, spent, remainingBudget: 0, spentPercentage: 0 };
}

const HOURS_HALF = projectOf('hours-half', { budgetType: EProjectBudgetType.HOURS, budget: 80 });
const HOURS_OVER = projectOf('hours-over', { budgetType: EProjectBudgetType.HOURS, budget: 10 });
const HOURS_FREE = projectOf('hours-free', { budgetType: EProjectBudgetType.HOURS });
const COST_QUARTER = projectOf('cost-quarter', { budgetType: EProjectBudgetType.COST, budget: 4000, currency: 'USD' });
const COST_FREE = projectOf('cost-free', { budgetType: EProjectBudgetType.COST });
const BUDGET_IDLE = projectOf('budget-idle', { budgetType: EProjectBudgetType.HOURS, budget: 20 });
const UNTOUCHED = projectOf('untouched', { budgetType: EProjectBudgetType.HOURS });

const ROWS = budgetRowsOf({
	reports: [
		reportOf('hours-half', EProjectBudgetType.HOURS, 80, 40),
		reportOf('hours-over', EProjectBudgetType.HOURS, 10, 12.5),
		reportOf('hours-free', EProjectBudgetType.HOURS, 0, 3.25),
		reportOf('cost-quarter', EProjectBudgetType.COST, 4000, 1000),
		reportOf('cost-free', EProjectBudgetType.COST, 0, 250)
	],
	projects: [HOURS_HALF, HOURS_OVER, HOURS_FREE, COST_QUARTER, COST_FREE, BUDGET_IDLE, UNTOUCHED],
	organizationCurrency: 'EUR',
	unnamedLabel: 'Unnamed'
});

const ROWS_BY_PROJECT = budgetRowsByProjectOf(ROWS);

function consumptionOf(overrides: Partial<ProjectConsumptionState> = {}): ProjectConsumptionState {
	return {
		isAvailable: true,
		isLoading: false,
		hasFailed: false,
		rowOf: (projectId) => ROWS_BY_PROJECT.get(projectId),
		retry: () => undefined,
		...overrides
	};
}

function renderSummary(project: TOrganizationProject, consumption: ProjectConsumptionState = consumptionOf()) {
	mockCanSeeConsumption.mockReturnValue(consumption.isAvailable);
	mockUseConsumption.mockReturnValue(consumption);
	return render(<ProjectBudgetSummary project={project} />);
}

/** The figures of the strip as `label → value | hint`, in the order they are shown. */
function figuresOf(container: HTMLElement) {
	const cells = Array.from(container.querySelectorAll('[role="listitem"]'));
	return cells.map((cell) => {
		const parts = Array.from(cell.children).map((part) => part.textContent ?? '');
		return parts.filter(Boolean).join(' | ');
	});
}

const REPORT_LINK = 'pages.projects.consumption.OPEN_REPORT';

describe('ProjectBudgetSummary', () => {
	it('shows time spent, budget, share used and what is left of an hours budget, with the report link', () => {
		const { container } = renderSummary(HOURS_HALF);

		expect(figuresOf(container)).toEqual([
			'common.TIME_SPENT | 40h 0m',
			'pages.projects.list.COLUMN_BUDGET | 80h | dashboard.projectBudget.TYPE_HOURS',
			'dashboard.projectBudget.COLUMN_USED | 50% | dashboard.projectBudget.RISK_WITHIN',
			'dashboard.projectBudget.COLUMN_REMAINING | dashboard.projectBudget.LEFT:40h 0m'
		]);
		const link = screen.getByRole('link', { name: REPORT_LINK });
		expect(link.getAttribute('href')).toBe('/reports/project-budget?project=hours-half');
	});

	it('marks a project over its budget on the share used and on what it is over by', () => {
		const { container } = renderSummary(HOURS_OVER);

		expect(figuresOf(container)).toEqual([
			'common.TIME_SPENT | 12h 30m',
			'pages.projects.list.COLUMN_BUDGET | 10h | dashboard.projectBudget.TYPE_HOURS',
			'dashboard.projectBudget.COLUMN_USED | 125% | dashboard.projectBudget.RISK_OVER',
			'dashboard.projectBudget.COLUMN_REMAINING | dashboard.projectBudget.OVER:2h 30m'
		]);
		const marked = Array.from(container.querySelectorAll('.text-destructive-ink'));
		expect(marked.map((element) => element.textContent)).toEqual(['125%', 'dashboard.projectBudget.OVER:2h 30m']);
		expect(container.querySelectorAll('.bg-destructive').length).toBeGreaterThan(0);
	});

	it('shows the time spent of a project without a budget, and no meter', () => {
		const { container } = renderSummary(HOURS_FREE);

		expect(figuresOf(container)).toEqual([
			'common.TIME_SPENT | 3h 15m',
			'pages.projects.list.COLUMN_BUDGET | – | dashboard.projectBudget.NO_BUDGET'
		]);
		expect(container.querySelector('.bg-primary')).toBeNull();
		expect(container.querySelector('.bg-destructive')).toBeNull();
		expect(screen.getByRole('link', { name: REPORT_LINK })).toBeTruthy();
	});

	it('names the first figure a spent amount when the report states the time as a cost, and says what a cost is', () => {
		const { container, unmount } = renderSummary(COST_QUARTER);

		expect(figuresOf(container)).toEqual([
			'dashboard.projectBudget.COLUMN_SPENT | $1,000.00',
			'pages.projects.list.COLUMN_BUDGET | $4,000.00 | dashboard.projectBudget.TYPE_COST_IN:USD',
			'dashboard.projectBudget.COLUMN_USED | 25% | dashboard.projectBudget.RISK_WITHIN',
			'dashboard.projectBudget.COLUMN_REMAINING | dashboard.projectBudget.LEFT:$3,000.00'
		]);
		expect(screen.getByText('dashboard.projectBudget.COST_NOTE')).toBeTruthy();
		unmount();

		const unbudgeted = renderSummary(COST_FREE);
		expect(figuresOf(unbudgeted.container)).toEqual([
			'dashboard.projectBudget.COLUMN_SPENT | €250.00',
			'pages.projects.list.COLUMN_BUDGET | – | dashboard.projectBudget.NO_BUDGET'
		]);
	});

	it('says no time yet for a budget nobody tracked on, and keeps its meter empty', () => {
		const { container } = renderSummary(BUDGET_IDLE);

		expect(figuresOf(container)).toEqual([
			'common.TIME_SPENT | – | dashboard.projectBudget.RISK_NO_TIME',
			'pages.projects.list.COLUMN_BUDGET | 20h | dashboard.projectBudget.TYPE_HOURS',
			'dashboard.projectBudget.COLUMN_USED | 0% | dashboard.projectBudget.RISK_NO_TIME',
			'dashboard.projectBudget.COLUMN_REMAINING | dashboard.projectBudget.LEFT:20h 0m'
		]);
		expect(container.querySelector('.bg-primary')).toBeNull();
	});

	it('offers no report link for a project the report has no line for', () => {
		const { container } = renderSummary(UNTOUCHED);

		expect(figuresOf(container)).toEqual([
			'common.TIME_SPENT | – | dashboard.projectBudget.RISK_NO_TIME',
			'pages.projects.list.COLUMN_BUDGET | – | dashboard.projectBudget.NO_BUDGET'
		]);
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('keeps the cells of the figures it will show while the report loads', () => {
		const loading = consumptionOf({ isLoading: true, rowOf: () => undefined });
		const { container } = renderSummary(HOURS_HALF, loading);

		const section = container.querySelector('section');
		expect(section?.getAttribute('aria-busy')).toBe('true');
		expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(4);
		expect(container.textContent).not.toContain('40h');
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('says the read failed and reads again on demand', () => {
		const retry = jest.fn();
		const failed = consumptionOf({ hasFailed: true, rowOf: () => undefined, retry });
		renderSummary(HOURS_HALF, failed);

		expect(screen.getByText('pages.projects.consumption.LOAD_ERROR')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));
		expect(retry).toHaveBeenCalledTimes(1);
	});

	it('shows nothing to someone who cannot open the report, and asks for nothing', () => {
		const hidden = consumptionOf({ isAvailable: false, rowOf: () => undefined });
		const { container } = renderSummary(HOURS_HALF, hidden);

		expect(container.textContent).toBe('');
		expect(mockUseConsumption).toHaveBeenCalledWith({ isEnabled: false });
	});
});
