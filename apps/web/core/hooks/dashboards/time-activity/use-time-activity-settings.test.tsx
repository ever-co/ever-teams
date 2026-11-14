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

	it('keeps the grouping in the link when the filters are cleared', () => {
		const { result } = settingsUnder('groupBy=client&clients=acme', MAY_READ_CLIENTS);

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?groupBy=client', NOT_SCROLLING);
		expect(result.current.grouping).toBe('client');
	});
});
