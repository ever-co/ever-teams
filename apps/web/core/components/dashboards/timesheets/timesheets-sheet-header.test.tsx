/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { WeekSheet } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('@/core/components/tasks/detail/task-picker-menu', () => ({ TaskPickerMenu: () => null }));

import { SheetHeader } from './timesheets-sheet-tools';

const SHEET = { rows: [], logCount: 2 } as unknown as WeekSheet;

/**
 * The header of a member's sheet on a phone (#5697): beside the counts, the status gave way first and read "Pen...".
 */
describe("the header of a member's sheet", () => {
	it('never shrinks the status: the counts are cut first', () => {
		render(
			<SheetHeader
				lead={<span>Ruth Baker</span>}
				sheet={SHEET}
				status={ETimesheetStatus.PENDING}
				copyWeek={null}
			/>
		);

		const status = screen.getByText('dashboard.timesheets.STATUS.PENDING').parentElement as HTMLElement;
		const counts = status.previousElementSibling as HTMLElement;

		expect(status.className.split(/\s+/)).toContain('shrink-0');
		expect(counts.className.split(/\s+/)).toContain('truncate');
	});
});
