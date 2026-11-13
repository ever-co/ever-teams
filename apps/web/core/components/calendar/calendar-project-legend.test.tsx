/** @jest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { memberToneOf } from '@/core/components/dashboards/team/team-series-tone';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import type { CalendarProjectTotal } from '@/core/lib/utils/calendar-view';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

import { CalendarProjectLegend } from './calendar-project-legend';

const API: CalendarProjectTotal = { key: 'project-api', name: 'API', color: null, seconds: 9000 };
const WEBSITE: CalendarProjectTotal = { key: 'project-web', name: 'Website', color: '#123456', seconds: 5400 };
const WITHOUT_PROJECT: CalendarProjectTotal = { key: null, name: null, color: null, seconds: 1200 };

function legendItems() {
	const legend = screen.getByRole('list', { name: 'dashboard.calendar.PROJECTS_LABEL' });
	return within(legend).getAllByRole('listitem');
}

function dotToneOf(item: HTMLElement) {
	const dot = item.querySelector<HTMLElement>('span[aria-hidden="true"]');
	return dot?.style.getPropertyValue('--entry');
}

describe('CalendarProjectLegend', () => {
	it('draws nothing for a range without time', () => {
		const { container } = render(<CalendarProjectLegend totals={[]} />);

		expect(container.firstChild).toBeNull();
	});

	it('shows each project with its name and the time it took, in the order given', () => {
		render(<CalendarProjectLegend totals={[API, WEBSITE]} />);

		const [first, second, ...others] = legendItems();

		expect(others).toHaveLength(0);
		expect(within(first).getByText('API')).toBeTruthy();
		expect(within(first).getByText('2h 30m')).toBeTruthy();
		expect(within(second).getByText('Website')).toBeTruthy();
		expect(within(second).getByText('1h 30m')).toBeTruthy();
	});

	it('names the time without a project', () => {
		render(<CalendarProjectLegend totals={[WEBSITE, WITHOUT_PROJECT]} />);

		const [, withoutProject] = legendItems();

		expect(within(withoutProject).getByText('dashboard.timesheets.NO_PROJECT')).toBeTruthy();
		expect(within(withoutProject).getByText('0h 20m')).toBeTruthy();
	});

	it('gives each dot the colour the blocks of its project are drawn in', () => {
		render(<CalendarProjectLegend totals={[API, WEBSITE, WITHOUT_PROJECT]} />);

		const [derived, own, neutral] = legendItems();

		expect(dotToneOf(derived)).toBe(memberToneOf('project-api'));
		expect(dotToneOf(own)).toBe(dataColorHue('#123456'));
		expect(dotToneOf(neutral)).toContain('var(--foreground)');
	});
});
