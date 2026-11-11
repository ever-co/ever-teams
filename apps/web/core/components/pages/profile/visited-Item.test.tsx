/** @jest-environment jsdom */

/**
 * The visited day of a daily activity row. Gauzy stores the UTC calendar day of an activity: its MikroORM and SQLite
 * branches send it as a date-only value, its TypeORM branch on PostgreSQL as UTC midnight. Parsed as an instant and
 * formatted in the zone of the viewer, that day showed as the day before for every viewer west of UTC.
 */
import { render, screen } from '@testing-library/react';
import VisitedItem from './visited-Item';

jest.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => (key: string) => key }));

const RealDateTimeFormat = Intl.DateTimeFormat;

// Jest cannot switch the zone of the runner, so a formatter with no zone formats in New York, as a browser there does.
function viewFromNewYork() {
	jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
		(locales, options) => new RealDateTimeFormat(locales, { timeZone: 'America/New_York', ...options })
	);
}

function renderVisitedRow(date: string) {
	const row = {
		title: 'Visual Studio Code',
		date,
		time: '09:00:00',
		duration: 1260,
		sessions: 3,
		employeeId: 'employee-1'
	};
	render(<VisitedItem app={row} totalMilliseconds={1260} type="APP" />);
}

afterEach(() => {
	jest.restoreAllMocks();
});

describe('VisitedItem', () => {
	it.each([
		['a date-only value', '2026-10-25'],
		['UTC midnight', '2026-10-25T00:00:00.000Z']
	])('shows the day Gauzy stored when it comes as %s, west of UTC', (_shape, date) => {
		viewFromNewYork();

		renderVisitedRow(date);

		// The row names the day as "Sun, Oct 25" (weekday, day and month, short): never "Sat, Oct 24"
		expect(screen.getByText(/^Sun, Oct 25 · /)).toBeTruthy();
	});
});

describe('VisitedItem of a site recorded under its page title', () => {
	it("draws the site's icon and links the site from the address the row carries", () => {
		const row = {
			title: 'Pull requests · ever-co/ever-teams',
			date: '2026-11-11',
			time: '09:00:00',
			duration: 600,
			sessions: 2,
			employeeId: 'employee-1',
			url: 'https://github.com/ever-co/ever-teams/pulls'
		};

		const { container } = render(<VisitedItem app={row} totalMilliseconds={600} type="SITE" />);

		// GitHub's mark in its colour, not the generic globe a page title alone would get
		const mark = container.querySelector('span[aria-hidden="true"] svg');
		expect(mark?.getAttribute('style') ?? '').toContain('color: rgb(24, 23, 23)');
		expect(screen.getByRole('link').getAttribute('href')).toBe('https://github.com/ever-co/ever-teams/pulls');
	});
});
