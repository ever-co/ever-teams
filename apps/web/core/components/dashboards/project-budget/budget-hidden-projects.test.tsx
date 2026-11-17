/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { budgetRowsOf } from '@/core/lib/utils/dashboards/project-budget';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => key
}));
// The kit's module reaches the app layout, which this list does not use
jest.mock('@/core/components/layouts/default-layout', () => ({ PageLayout: () => null }));
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: null, numberFormat: null })
}));

import { ProjectBudgetUnbudgeted } from './budget-unbudgeted';

/**
 * CORE-27 (ever-co/ever-teams#5370): ever-co/ever-gauzy#12035 keeps the time spent on a project hidden from the reader
 * in the budget report, answered as `{ id, projectHidden: true }` without its budget. The report names it "Private
 * project", with the lock, and never leads to its page, whose address would carry its id.
 */

const CLIENT_X = 'project-client-x-redesign';

const REPORTS = [
	{
		project: { id: CLIENT_X, projectHidden: true },
		budgetType: 'hours',
		budget: 0,
		spent: 12,
		remainingBudget: 0,
		spentPercentage: 0
	},
	{
		project: { id: 'project-website', name: 'Website' },
		budgetType: 'hours',
		budget: 0,
		spent: 3,
		remainingBudget: 0,
		spentPercentage: 0
	}
] as unknown as TProjectBudgetReport[];

function rowsOf() {
	return budgetRowsOf({
		reports: REPORTS,
		projects: [],
		organizationCurrency: 'EUR',
		unnamedLabel: 'Unnamed project',
		hiddenLabel: 'Private project'
	});
}

describe('the budget report of a reader who is not on a private project', () => {
	it('names the hidden project "Private project", with nothing else of it, and keeps its time', () => {
		const hidden = rowsOf().find((row) => row.project.isHidden);

		expect(hidden?.project).toMatchObject({
			name: 'Private project',
			imageUrl: null,
			color: null,
			membersCount: null,
			people: []
		});
		expect(hidden?.spent).toBe(12);
		expect(rowsOf().find((row) => row.project.name === 'Website')?.project).not.toHaveProperty('isHidden');
	});

	it('draws it with the lock, as text that leads nowhere, and names its id nowhere on the page', () => {
		const { container } = render(<ProjectBudgetUnbudgeted rows={rowsOf()} isOpenByDefault />);

		expect(screen.getByText('Private project').closest('a')).toBeNull();
		expect(screen.getByRole('img', { name: 'common.PRIVATE_PROJECT_HINT' })).toBeTruthy();
		expect(screen.getByText('Website').closest('a')?.getAttribute('href')).toBe('/projects/project-website');
		expect(container.innerHTML).not.toContain(CLIENT_X);
	});
});
