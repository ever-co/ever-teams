/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import type { ProjectConsumptionState } from '@/core/hooks/projects/use-project-consumption';
import { budgetRowsOf } from '@/core/lib/utils/dashboards/project-budget';
import { budgetRowsByProjectOf } from '@/core/lib/utils/project-consumption';
import { EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';
import { ProjectBudgetRiskMark, ProjectBudgetUseCell, ProjectTimeSpentCell } from './project-consumption-cells';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));

jest.mock('@/core/components/common/tooltip', () => ({
	Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: ReactNode }) => <span>{children}</span>,
	TooltipContent: ({ children }: { children: ReactNode }) => <span role="tooltip">{children}</span>
}));

function projectOf(id: string, overrides: Partial<TOrganizationProject> = {}): TOrganizationProject {
	return { id, name: id, public: null, owner: null, code: null, ...overrides };
}

function reportOf(id: string, budgetType: EProjectBudgetType, budget: number, spent: number): TProjectBudgetReport {
	return { project: { id, name: id }, budgetType, budget, spent, remainingBudget: 0, spentPercentage: 0 };
}

const HOURS_HALF = projectOf('hours-half', { budgetType: EProjectBudgetType.HOURS, budget: 80 });
const HOURS_OVER = projectOf('hours-over', { budgetType: EProjectBudgetType.HOURS, budget: 10 });
const HOURS_NEAR = projectOf('hours-near', { budgetType: EProjectBudgetType.HOURS, budget: 100 });
const HOURS_FREE = projectOf('hours-free', { budgetType: EProjectBudgetType.HOURS });
const COST_QUARTER = projectOf('cost-quarter', { budgetType: EProjectBudgetType.COST, budget: 4000, currency: 'USD' });
const COST_FREE = projectOf('cost-free', { budgetType: EProjectBudgetType.COST });
const UNTOUCHED = projectOf('untouched');

const ROWS = budgetRowsOf({
	reports: [
		reportOf('hours-half', EProjectBudgetType.HOURS, 80, 40),
		reportOf('hours-over', EProjectBudgetType.HOURS, 10, 12.5),
		reportOf('hours-near', EProjectBudgetType.HOURS, 100, 95),
		reportOf('hours-free', EProjectBudgetType.HOURS, 0, 3.25),
		reportOf('cost-quarter', EProjectBudgetType.COST, 4000, 1000),
		reportOf('cost-free', EProjectBudgetType.COST, 0, 250)
	],
	projects: [HOURS_HALF, HOURS_OVER, HOURS_NEAR, HOURS_FREE, COST_QUARTER, COST_FREE, UNTOUCHED],
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

const LOADED = consumptionOf();
const LOADING = consumptionOf({ isLoading: true, rowOf: () => undefined });
const FAILED = consumptionOf({ hasFailed: true, rowOf: () => undefined });
const NOT_AVAILABLE = consumptionOf({ isAvailable: false, rowOf: () => undefined });

describe('ProjectTimeSpentCell', () => {
	it('writes the hours of a project whose time the report states in hours, with or without a budget', () => {
		const { container, rerender } = render(<ProjectTimeSpentCell projectId="hours-half" consumption={LOADED} />);
		expect(container.textContent).toBe('40h 0m');

		rerender(<ProjectTimeSpentCell projectId="hours-free" consumption={LOADED} />);
		expect(container.textContent).toBe('3h 15m');
	});

	it('says the time is counted as a cost, and why, when the report states a cost', () => {
		render(<ProjectTimeSpentCell projectId="cost-free" consumption={LOADED} />);

		expect(screen.getByText('pages.projects.consumption.AS_COST')).toBeTruthy();
		expect(screen.getByRole('tooltip').textContent).toBe('pages.projects.consumption.AS_COST_HINT');
	});

	it('shows no figure for a project nobody tracked on', () => {
		const { container } = render(<ProjectTimeSpentCell projectId="untouched" consumption={LOADED} />);

		expect(container.textContent).toBe('-');
	});

	it('shows no figure while the report loads, and none when it failed', () => {
		const { container, rerender } = render(<ProjectTimeSpentCell projectId="hours-half" consumption={LOADING} />);
		expect(container.textContent).toBe('');

		rerender(<ProjectTimeSpentCell projectId="hours-half" consumption={FAILED} />);
		expect(container.textContent).toBe('-');
	});
});

describe('ProjectBudgetUseCell', () => {
	it('shows the amount used, the budget and the share of a project within its budget', () => {
		const { container } = render(<ProjectBudgetUseCell project={HOURS_HALF} consumption={LOADED} />);

		expect(container.textContent).toContain('40h 0m / 80h');
		expect(container.textContent).toContain('50%');
		expect(screen.getByText('dashboard.projectBudget.RISK_WITHIN')).toBeTruthy();
		expect(container.querySelector('.text-destructive-ink')).toBeNull();
	});

	it('marks a project over its budget with the destructive tone and names the state', () => {
		const { container } = render(<ProjectBudgetUseCell project={HOURS_OVER} consumption={LOADED} />);

		expect(container.textContent).toContain('12h 30m / 10h');
		expect(container.textContent).toContain('125%');
		expect(screen.getByText('dashboard.projectBudget.RISK_OVER')).toBeTruthy();
		expect(container.querySelector('.text-destructive-ink')?.textContent).toBe('125%');
		expect(container.querySelector('.text-destructive-ink svg')).not.toBeNull();
	});

	it('gives a project near its budget the warning tone', () => {
		const { container } = render(<ProjectBudgetUseCell project={HOURS_NEAR} consumption={LOADED} />);

		expect(container.querySelector('.text-warning-foreground')?.textContent).toBe('95%');
		expect(screen.getByText('dashboard.projectBudget.RISK_NEAR')).toBeTruthy();
	});

	it('states a money budget in its currency', () => {
		const { container } = render(<ProjectBudgetUseCell project={COST_QUARTER} consumption={LOADED} />);

		expect(container.textContent).toContain('$1,000.00 / $4,000.00');
		expect(container.textContent).toContain('25%');
	});

	it('draws no meter for a project without a budget', () => {
		const { container } = render(<ProjectBudgetUseCell project={HOURS_FREE} consumption={LOADED} />);

		expect(container.textContent).toBe('-');
	});

	it('keeps the plain budget for someone who cannot read its use, and when the read failed', () => {
		const { container, rerender } = render(
			<ProjectBudgetUseCell project={HOURS_HALF} consumption={NOT_AVAILABLE} />
		);
		expect(container.textContent).toBe('80pages.projects.list.HOURS_UNIT');

		rerender(<ProjectBudgetUseCell project={HOURS_HALF} consumption={FAILED} />);
		expect(container.textContent).toBe('80pages.projects.list.HOURS_UNIT');
	});

	it('keeps the budget on screen while its use loads', () => {
		const { container } = render(<ProjectBudgetUseCell project={HOURS_HALF} consumption={LOADING} />);

		expect(container.textContent).toBe('80pages.projects.list.HOURS_UNIT');
	});
});

describe('ProjectBudgetRiskMark', () => {
	it('marks a project over its budget and one near it', () => {
		const { rerender } = render(<ProjectBudgetRiskMark projectId="hours-over" consumption={LOADED} />);
		expect(screen.getByRole('img', { name: 'dashboard.projectBudget.RISK_OVER' })).toBeTruthy();

		rerender(<ProjectBudgetRiskMark projectId="hours-near" consumption={LOADED} />);
		expect(screen.getByRole('img', { name: 'dashboard.projectBudget.RISK_NEAR' })).toBeTruthy();
	});

	it('marks nothing within the budget, without a budget, or before the report answers', () => {
		const { container, rerender } = render(<ProjectBudgetRiskMark projectId="hours-half" consumption={LOADED} />);
		expect(container.textContent).toBe('');
		expect(screen.queryByRole('img')).toBeNull();

		rerender(<ProjectBudgetRiskMark projectId="hours-free" consumption={LOADED} />);
		expect(screen.queryByRole('img')).toBeNull();

		rerender(<ProjectBudgetRiskMark projectId="hours-over" consumption={LOADING} />);
		expect(screen.queryByRole('img')).toBeNull();
	});
});
