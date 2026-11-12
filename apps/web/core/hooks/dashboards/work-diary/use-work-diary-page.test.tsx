/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

const mockReplace = jest.fn();
const mockDayRead = jest.fn();
const mockWeekRead = jest.fn();
let mockSearch = '';
let mockWeekSheet = { hasLogs: true, isError: false, isUpdating: false };

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => new URLSearchParams(mockSearch)
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant',
	getOrganizationIdCookie: () => 'organization'
}));
// The module reaches the sign-in hooks, whose auth library ships as ES modules Jest does not read
jest.mock('@/core/lib/utils/dashboards/team', () => ({ timesheetPathOf: () => '/reports/timesheet/user' }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user', name: 'Mia Member', employee: { id: 'member' } } })
}));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: false })
}));
jest.mock('@/core/hooks/calendar/use-calendar-logs', () => ({
	useCalendarLogs: () => ({
		data: undefined,
		isPlaceholderData: false,
		dataUpdatedAt: 0,
		isError: false,
		isFetching: false,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({
	useEmployeeDailyPlans: () => ({
		employeeDailyPlans: { items: [] },
		isLoading: false,
		isError: false,
		loadEmployeeDailyPlans: jest.fn()
	})
}));
jest.mock('./use-work-diary-day', () => ({
	useWorkDiaryDay: (scope: unknown) => {
		mockDayRead(scope);
		return { activities: [], isLoading: false, isError: false };
	}
}));
jest.mock('./use-work-diary-week', () => ({
	useWorkDiaryWeek: (scope: unknown) => {
		mockWeekRead(scope);
		return { ...mockWeekSheet, source: { ownEmployeeId: 'member' }, refetch: jest.fn() };
	}
}));

import { useWorkDiaryPage } from './use-work-diary-page';

const NO_SCROLL = { scroll: false };

describe('useWorkDiaryPage, the view its link names', () => {
	beforeEach(() => {
		mockSearch = '';
		mockWeekSheet = { hasLogs: true, isError: false, isUpdating: false };
	});

	it("opens the week sheet on the week of the link's day, read for the member's own id, and leaves the day unread", () => {
		mockSearch = 'date=2024-01-09&view=week';
		const { result } = renderHook(() => useWorkDiaryPage());

		expect(result.current.view).toBe('week');
		expect(mockWeekRead).toHaveBeenLastCalledWith(
			expect.objectContaining({
				tenantId: 'tenant',
				organizationId: 'organization',
				employeeId: 'member',
				isEnabled: true
			})
		);
		const { week } = result.current;
		expect([week.from.getFullYear(), week.from.getMonth(), week.from.getDate()]).toEqual([2024, 0, 8]);
		expect([week.to.getFullYear(), week.to.getMonth(), week.to.getDate()]).toEqual([2024, 0, 14]);
		expect(mockDayRead).toHaveBeenLastCalledWith(expect.objectContaining({ isEnabled: false }));
	});

	it('opens the day without a view in the link, and leaves the week sheet unread', () => {
		mockSearch = 'date=2024-01-09';
		const { result } = renderHook(() => useWorkDiaryPage());

		expect(result.current.view).toBe('day');
		expect(mockWeekRead).toHaveBeenLastCalledWith(expect.objectContaining({ isEnabled: false }));
		expect(mockDayRead).toHaveBeenLastCalledWith(expect.objectContaining({ isEnabled: true }));
	});

	it('keeps the view when another day or today is picked, and the day when the view changes', () => {
		mockSearch = 'date=2024-01-09&view=week';
		const { result } = renderHook(() => useWorkDiaryPage());

		act(() => result.current.pickDay(new Date(2024, 0, 3)));
		expect(mockReplace).toHaveBeenLastCalledWith('/work-diary?date=2024-01-03&view=week', NO_SCROLL);

		act(() => result.current.showToday());
		expect(mockReplace).toHaveBeenLastCalledWith('/work-diary?view=week', NO_SCROLL);

		act(() => result.current.changeView('day'));
		expect(mockReplace).toHaveBeenLastCalledWith('/work-diary?date=2024-01-09', NO_SCROLL);
	});

	it('goes to the week sheet of the day on screen', () => {
		mockSearch = 'date=2024-01-09';
		const { result } = renderHook(() => useWorkDiaryPage());

		act(() => result.current.changeView('week'));

		expect(mockReplace).toHaveBeenLastCalledWith('/work-diary?date=2024-01-09&view=week', NO_SCROLL);
	});

	it('says the week sheet is loading until its logs are read or its read failed', () => {
		mockSearch = 'view=week';
		mockWeekSheet = { hasLogs: false, isError: false, isUpdating: false };
		const loading = renderHook(() => useWorkDiaryPage());
		expect(loading.result.current.weekSheet.isLoading).toBe(true);
		loading.unmount();

		mockWeekSheet = { hasLogs: false, isError: true, isUpdating: false };
		const failed = renderHook(() => useWorkDiaryPage());
		expect(failed.result.current.weekSheet.isLoading).toBe(false);
		expect(failed.result.current.weekSheet.isError).toBe(true);
	});
});
