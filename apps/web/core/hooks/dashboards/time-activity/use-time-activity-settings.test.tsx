/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';

const mockRouter = { replace: jest.fn() };
let mockSearchParams = new URLSearchParams();

interface Permissions {
	myPermissions: string[];
	isLoaded: boolean;
	isLoading: boolean;
}

const MAY_READ_CLIENTS: Permissions = { myPermissions: ['ORG_CONTACT_VIEW'], isLoaded: true, isLoading: false };
const MAY_NOT_READ_CLIENTS: Permissions = { myPermissions: ['ORG_PROJECT_VIEW'], isLoaded: true, isLoading: false };
const READING_PERMISSIONS: Permissions = { myPermissions: [], isLoaded: false, isLoading: true };

let mockPermissions = MAY_READ_CLIENTS;

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
	usePathname: () => '/reports/time-and-activity',
	useSearchParams: () => mockSearchParams
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));

import { useTimeActivitySettings } from './use-time-activity-settings';

// An API without labels on entries (#5368): the labels controls stay out, as before
jest.mock('@/core/hooks/timer/use-entry-labels-support', () => ({ useEntryLabelsSupport: () => false }));

const NOT_SCROLLING = { scroll: false };

const EVERYONE_GROUPINGS = ['date', 'member', 'project', 'task', 'week'];

function linkMovesTo(query: string) {
	mockSearchParams = new URLSearchParams(query);
}

function settingsUnder(query: string, permissions: Permissions) {
	linkMovesTo(query);
	mockPermissions = permissions;
	return renderHook(() => useTimeActivitySettings());
}

describe('useTimeActivitySettings', () => {
	beforeEach(() => {
		mockRouter.replace.mockReset();
		window.localStorage.clear();
	});

	it('opens on the date grouping when the link names none, and on the grouping a shared link names', () => {
		const withoutGrouping = settingsUnder('', MAY_READ_CLIENTS);
		const onMembers = settingsUnder('groupBy=member', MAY_READ_CLIENTS);

		expect(withoutGrouping.result.current.grouping).toBe('date');
		expect(onMembers.result.current.grouping).toBe('member');
	});

	it('offers Client last to a reader who may read the clients, and opens a link on it', () => {
		const { result } = settingsUnder('groupBy=client', MAY_READ_CLIENTS);

		expect(result.current.groupings).toEqual([...EVERYONE_GROUPINGS, 'client']);
		expect(result.current.grouping).toBe('client');
		expect(result.current.clientGroupingAccess).toBe('granted');
	});

	it('gives no client grouping to a reader who may not read the clients, a link on it opening on the date grouping', () => {
		const { result } = settingsUnder('groupBy=client', MAY_NOT_READ_CLIENTS);

		expect(result.current.groupings).toEqual(EVERYONE_GROUPINGS);
		expect(result.current.grouping).toBe('date');
		expect(result.current.clientGroupingAccess).toBe('refused');
	});

	it('keeps a link on the client grouping while the permissions are read', () => {
		const { result } = settingsUnder('groupBy=client', READING_PERMISSIONS);

		expect(result.current.grouping).toBe('client');
		expect(result.current.groupings).toEqual([...EVERYONE_GROUPINGS, 'client']);
		expect(result.current.clientGroupingAccess).toBe('unknown');
	});

	it('writes a picked grouping into the link, and takes the date grouping out of it', () => {
		const { result, rerender } = settingsUnder('clients=acme', MAY_READ_CLIENTS);

		act(() => result.current.setGrouping('client'));
		expect(mockRouter.replace).toHaveBeenLastCalledWith(
			'/reports/time-and-activity?clients=acme&groupBy=client',
			NOT_SCROLLING
		);
		expect(result.current.grouping).toBe('client');

		linkMovesTo('clients=acme&groupBy=client');
		rerender();
		act(() => result.current.setGrouping('date'));
		expect(mockRouter.replace).toHaveBeenLastCalledWith('/reports/time-and-activity?clients=acme', NOT_SCROLLING);
	});

	it('reads the filters the browser saved while the link names no period', () => {
		window.localStorage.setItem('ever-teams-activity-filters', JSON.stringify({ projectIds: ['saved-project'] }));
		const { result } = settingsUnder('groupBy=project', MAY_READ_CLIENTS);

		expect(result.current.holdsView).toBe(false);
		expect(result.current.linkedPeriod).toBeNull();
		expect(result.current.filters.projectIds).toEqual(['saved-project']);
	});

	it('reads every filter from a link that names a period, whatever the browser saved', () => {
		window.localStorage.setItem('ever-teams-activity-filters', JSON.stringify({ projectIds: ['saved-project'] }));
		const { result } = settingsUnder('period=lastMonth&members=ada&clients=acme', MAY_READ_CLIENTS);

		expect(result.current.holdsView).toBe(true);
		expect(result.current.filters.projectIds).toEqual([]);
		expect(result.current.filters.employeeIds).toEqual(['ada']);
		expect(result.current.filters.clientIds).toEqual(['acme']);
	});

	it('writes the period and the saved filters into the link the first time, so the link holds the view', () => {
		window.localStorage.setItem('ever-teams-activity-filters', JSON.stringify({ teamIds: ['team-1'] }));
		const { result } = settingsUnder('groupBy=project', MAY_READ_CLIENTS);

		act(() => result.current.setPeriod({ from: new Date(2025, 0, 3), to: new Date(2025, 0, 9, 23, 59) }));

		expect(mockRouter.replace).toHaveBeenLastCalledWith(
			'/reports/time-and-activity?groupBy=project&from=2025-01-03&to=2025-01-09&teams=team-1',
			NOT_SCROLLING
		);
	});

	it('writes a picked member into the link once it holds the view, and still saves it in the browser', () => {
		const { result } = settingsUnder('period=today', MAY_READ_CLIENTS);

		act(() => result.current.setFilterValues('employeeIds', ['ada']));

		expect(mockRouter.replace).toHaveBeenLastCalledWith(
			'/reports/time-and-activity?period=today&members=ada',
			NOT_SCROLLING
		);
		const saved = JSON.parse(window.localStorage.getItem('ever-teams-activity-filters') ?? '{}');
		expect(saved.employeeIds).toEqual(['ada']);
	});

	it('clears the linked filters with the others, and keeps the period', () => {
		const { result } = settingsUnder('period=today&members=ada&teams=t&clients=acme', MAY_READ_CLIENTS);

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).toHaveBeenLastCalledWith('/reports/time-and-activity?period=today', NOT_SCROLLING);
	});

	it('keeps the grouping in the link when the filters are cleared', () => {
		const { result } = settingsUnder('groupBy=client&clients=acme', MAY_READ_CLIENTS);

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?groupBy=client', NOT_SCROLLING);
		expect(result.current.grouping).toBe('client');
	});
});
