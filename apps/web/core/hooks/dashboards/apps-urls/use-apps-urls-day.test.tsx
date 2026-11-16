/**
 * @jest-environment jsdom
 *
 * The Apps & URLs day panel shows one member's day. Nobody picked and nobody filtered, it shows the member with the
 * most time; the report refreshes every minute on a period that runs through today, and when another member passed
 * that one, the panel went to the other member by itself and read their day behind its skeleton.
 */
import { act, renderHook } from '@testing-library/react';
import type { AppUsageRow } from '@/core/lib/utils/dashboards/apps-urls';
import { useAppsUrlsDay } from './use-apps-urls-day';

const mockDayRead = jest.fn();

jest.mock('@/core/hooks/dashboards/activity/use-member-day-activities', () => ({
	useMemberDayActivities: (options: unknown) => {
		mockDayRead(options);
		return { activities: [], isLoading: false, isError: false, refetch: jest.fn() };
	}
}));

function rowOf(employeeId: string, seconds: number, dateKey = '2026-11-16'): AppUsageRow {
	return {
		key: `${employeeId}-${dateKey}`,
		dateKey,
		title: 'Editor',
		employee: { id: employeeId, name: employeeId, imageUrl: null },
		project: { id: null, name: null, imageUrl: null, color: null },
		seconds
	};
}

type Props = { rows: AppUsageRow[]; selectedEmployeeIds: string[] };

function renderDay(rows: AppUsageRow[], selectedEmployeeIds: string[] = []) {
	return renderHook((props: Props) => useAppsUrlsDay({ ...props, ownEmployeeId: 'viewer-without-time' }), {
		initialProps: { rows, selectedEmployeeIds }
	});
}

describe("the Apps & URLs day panel's member, nobody picked", () => {
	beforeEach(() => {
		mockDayRead.mockClear();
	});

	it('starts on the member with the most time', () => {
		const { result } = renderDay([rowOf('ada', 3600), rowOf('bob', 1800)]);

		expect(result.current.member?.id).toBe('ada');
	});

	it('stays on that member when a refresh puts another one first', () => {
		const { result, rerender } = renderDay([rowOf('ada', 3600), rowOf('bob', 1800)]);

		rerender({ rows: [rowOf('ada', 3600), rowOf('bob', 5400)], selectedEmployeeIds: [] });

		expect(result.current.member?.id).toBe('ada');
		expect(mockDayRead).toHaveBeenLastCalledWith(expect.objectContaining({ employeeId: 'ada' }));
	});

	it('goes to the member with the most time once that member has no time left in the report', () => {
		const { result, rerender } = renderDay([rowOf('ada', 3600), rowOf('bob', 1800)]);

		rerender({ rows: [rowOf('bob', 1800), rowOf('cid', 900)], selectedEmployeeIds: [] });

		expect(result.current.member?.id).toBe('bob');
	});

	it('CONTROL: a member picked in the filter still wins', () => {
		const { result, rerender } = renderDay([rowOf('ada', 3600), rowOf('bob', 1800)]);

		rerender({ rows: [rowOf('ada', 3600), rowOf('bob', 1800)], selectedEmployeeIds: ['bob'] });

		expect(result.current.member?.id).toBe('bob');
	});

	it('CONTROL: a member picked in the panel still wins', () => {
		const { result, rerender } = renderDay([rowOf('ada', 3600), rowOf('bob', 1800)]);

		act(() => result.current.pickMember('bob'));
		rerender({ rows: [rowOf('ada', 3600), rowOf('bob', 1800)], selectedEmployeeIds: [] });

		expect(result.current.member?.id).toBe('bob');
	});
});
