/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import ProfilePage from './page';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const USER_EMPLOYEE_ID = '22222222-2222-4222-8222-222222222222';
const TEAMMATE_USER_ID = '33333333-3333-4333-8333-333333333333';
const TEAMMATE_EMPLOYEE_ID = '44444444-4444-4444-8444-444444444444';
const TEAM_ID = '55555555-5555-4555-8555-555555555555';
const TENANT_ID = '66666666-6666-4666-8666-666666666666';
const ORGANIZATION_ID = '77777777-7777-4777-8777-777777777777';

const mockUseProfileActivity = jest.fn();
let mockShareProfileView = false;
let mockIsAuthUser = false;
let mockManagers: Array<{ employee: { user: { id: string } } }> = [];

const mockUser = {
	id: USER_ID,
	timeZone: 'UTC',
	employeeId: USER_EMPLOYEE_ID,
	employee: { id: USER_EMPLOYEE_ID, userId: USER_ID }
};
const mockTeammate = {
	employeeId: TEAMMATE_EMPLOYEE_ID,
	employee: {
		id: TEAMMATE_EMPLOYEE_ID,
		userId: TEAMMATE_USER_ID,
		user: { id: TEAMMATE_USER_ID, name: 'Fixture Teammate' }
	}
};

jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (Component: React.ComponentType<any>) => Component
}));
jest.mock('@/core/hooks', () => ({
	useLocalStorageState: () => ['Tasks', jest.fn()],
	useUserProfilePage: () => ({
		isAuthUser: mockIsAuthUser,
		member: mockIsAuthUser
			? { employeeId: USER_EMPLOYEE_ID, employee: { id: USER_EMPLOYEE_ID, userId: USER_ID, user: mockUser } }
			: mockTeammate,
		userProfile: mockIsAuthUser ? mockUser : mockTeammate.employee.user,
		tasksGrouped: { assignedTasks: [], unassignedTasks: [], workedTasks: [], planned: 0 }
	})
}));
jest.mock('@/core/hooks/users/use-profile-validation', () => ({
	useProfileValidation: () => ({
		isValid: true,
		isAuthUser: mockIsAuthUser,
		member: mockIsAuthUser
			? { employeeId: USER_EMPLOYEE_ID, employee: { id: USER_EMPLOYEE_ID, userId: USER_ID, user: mockUser } }
			: mockTeammate,
		state: 'valid'
	})
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/tasks/use-task-filter', () => ({
	useTaskFilter: () => ({
		tab: 'worked',
		filterType: undefined,
		tabs: [],
		tasksFiltered: [],
		tasksGrouped: { unassignedTasks: [] },
		setTab: jest.fn()
	})
}));
jest.mock('@/core/hooks/activities/use-profile-activity', () => ({
	getProfileActivityMonthRange: () => ({ startDate: '2026-08-01', endDate: '2026-09-01' }),
	normalizeProfileActivityTimeZone: () => 'UTC',
	useProfileActivityMonthRange: () => ({ startDate: '2026-08-01', endDate: '2026-09-01' }),
	useProfileActivity: (...args: unknown[]) => mockUseProfileActivity(...args)
}));
jest.mock('@/core/hooks/bootstrap/use-fast-feature-data', () => ({ useFastTeamDailyPlansOwner: jest.fn() }));

jest.mock('@/core/stores', () => ({
	activeTeamManagersState: 'active-team-managers',
	activeTeamState: 'active-team',
	isTrackingEnabledState: 'tracking-enabled'
}));
jest.mock('@/core/stores/common/full-width', () => ({ fullWidthState: 'full-width' }));
jest.mock('@/core/stores/timer/activity-type', () => ({ activityTypeState: 'activity-type' }));
jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => {
		if (atom === 'active-team') {
			return {
				id: TEAM_ID,
				name: 'Fixture Team',
				tenantId: TENANT_ID,
				organizationId: ORGANIZATION_ID,
				shareProfileView: mockShareProfileView
			};
		}
		if (atom === 'active-team-managers') return mockManagers;
		if (atom === 'tracking-enabled') return false;
		if (atom === 'full-width') return false;
		return undefined;
	},
	useSetAtom: () => jest.fn()
}));

jest.mock('@/core/constants/config/constants', () => ({ FAST_APP_BOOTSTRAP: { value: true } }));
jest.mock('@/core/components', () => ({ Container: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	MainHeader: ({ children }: React.PropsWithChildren) => <header>{children}</header>,
	PageLayout: ({ children, mainHeaderSlot }: React.PropsWithChildren<{ mainHeaderSlot?: React.ReactNode }>) => (
		<main>
			{mainHeaderSlot}
			{children}
		</main>
	)
}));
jest.mock('@/core/components/optimized-components', () => ({
	LazyAppsTab: () => null,
	LazyScreenshootTab: () => null,
	LazyUserProfileTask: () => null,
	LazyUserProfileDetail: () => null,
	LazyVisitedSitesTab: () => null,
	LazyTimer: () => null,
	LazyTaskFilter: () => null
}));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('@/core/components/duplicated-components/separator', () => ({ VerticalSeparator: () => null }));
jest.mock('@/core/components/common/profile-error-boundary', () => ({ ProfileErrorBoundary: () => null }));
jest.mock('@/core/components/common/skeleton/profile-page-skeleton', () => ({ ProfilePageSkeleton: () => null }));
jest.mock('@/core/components/common/skeleton/timer-skeleton', () => ({ TimerSkeleton: () => null }));
jest.mock('@/core/lib/helpers', () => ({ cn: (...values: string[]) => values.filter(Boolean).join(' ') }));
jest.mock('assets/svg', () => ({ ArrowLeftIcon: () => null }), { virtual: true });
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => (key === 'pages.profile.BREADCRUMB' ? '"Profile"' : key)
}));

function renderProfile(memberId: string) {
	return render(<ProfilePage params={{ memberId } as any} />);
}

describe('profile activity access parity', () => {
	beforeEach(() => {
		mockShareProfileView = false;
		mockIsAuthUser = false;
		mockManagers = [];
		mockUseProfileActivity.mockReturnValue({ data: undefined });
		jest.spyOn(React, 'use').mockImplementation((value: any) => value);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('requests the current user activity when profile sharing is disabled', () => {
		mockIsAuthUser = true;

		renderProfile(USER_ID);

		expect(mockUseProfileActivity).toHaveBeenCalledWith(
			expect.objectContaining({ employeeId: USER_EMPLOYEE_ID, organizationTeamId: TEAM_ID }),
			{ enabled: true }
		);
	});

	it('requests teammate activity for a manager when profile sharing is disabled', () => {
		mockManagers = [{ employee: { user: { id: USER_ID } } }];

		renderProfile(TEAMMATE_USER_ID);

		expect(mockUseProfileActivity).toHaveBeenCalledWith(
			expect.objectContaining({ employeeId: TEAMMATE_EMPLOYEE_ID, organizationTeamId: TEAM_ID }),
			{ enabled: true }
		);
	});

	it('requests teammate activity when the active team enables profile sharing', () => {
		mockShareProfileView = true;

		renderProfile(TEAMMATE_USER_ID);

		expect(mockUseProfileActivity).toHaveBeenCalledWith(
			expect.objectContaining({ employeeId: TEAMMATE_EMPLOYEE_ID, organizationTeamId: TEAM_ID }),
			{ enabled: true }
		);
	});

	it('keeps teammate activity disabled when sharing is off and the user is not a manager', () => {
		renderProfile(TEAMMATE_USER_ID);

		expect(mockUseProfileActivity).toHaveBeenCalledWith(null, { enabled: false });
	});
});
