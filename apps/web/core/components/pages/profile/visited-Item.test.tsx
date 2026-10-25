/** @jest-environment jsdom */

/**
 * The visited day of a daily activity row. Gauzy stores the UTC calendar day of an activity: its MikroORM and SQLite
 * branches send it as a date-only value, its TypeORM branch on PostgreSQL as UTC midnight. Parsed as an instant and
 * formatted in the zone of the viewer, that day showed as the day before for every viewer west of UTC.
 */
import { render, screen } from '@testing-library/react';
import VisitedItem from './visited-Item';

const RealDateTimeFormat = Intl.DateTimeFormat;

// Jest cannot switch the zone of the runner, so a formatter with no zone formats in New York, as a browser there does.
function viewFromNewYork() {
	jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
		(locales, options) => new RealDateTimeFormat(locales, { timeZone: 'America/New_York', ...options })
	);
}

function renderVisitedRow(date: string) {
	const row = { title: 'Visual Studio Code', date, time: '09:00:00', duration: 1260, sessions: 3 };
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

		expect(screen.getByText(/Sunday, October 25, 2026/)).toBeTruthy();
	});
});
