/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';

type Crumb = { title: string | string[] };

let mockUser: Record<string, unknown> | undefined;
let mockIsTeamMember = true;
let mockTeams: unknown[] = [];
const mockActiveTeam = { id: 'team-1', name: 'Platform' };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => (key === 'pages.home.BREADCRUMB' ? '["Home"]' : key)
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
jest.mock('@/core/stores', () => ({
	activeTeamState: 'activeTeam',
	isTeamMemberState: 'isTeamMember',
	organizationTeamsState: 'teams',
	isTrackingEnabledState: 'isTrackingEnabled'
}));
jest.mock('@/core/stores/common/header-tabs', () => ({ headerTabs: 'headerTabs' }));
jest.mock('jotai', () => ({
	useAtom: () => ['CARDS', jest.fn()],
	useAtomValue: (atom: string) => {
		if (atom === 'activeTeam') return mockActiveTeam;
		if (atom === 'isTeamMember') return mockIsTeamMember;
		if (atom === 'teams') return mockTeams;
		return true;
	}
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
// The page asks the API whether to ask for a verified address (#5677): every user here has one, so it is not asked
jest.mock('@/core/hooks/auth/use-email-verification-status', () => ({ useAsksForEmailVerification: () => false }));
jest.mock('@/core/hooks', () => ({ useIsMemberManager: () => ({ isTeamManager: false }) }));
jest.mock('@/core/hooks/invitations/use-my-invitations-query', () => ({
	useMyInvitationsQuery: () => ({ myInvitations: [], refetchMyInvitations: jest.fn() })
}));
jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({
	useEmployeeDailyPlans: () => ({ employeeOutstandingPlans: [], employeeSortedPlans: [] })
}));
jest.mock('@/core/lib/utils', () => ({ clsxm: (...classes: string[]) => classes.filter(Boolean).join(' ') }));
jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (Component: React.ComponentType) => Component
}));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({
		breadcrumb,
		mainHeaderSlot,
		children
	}: {
		breadcrumb: React.ReactNode;
		mainHeaderSlot: React.ReactNode;
		children: React.ReactNode;
	}) => (
		<div>
			{breadcrumb}
			{mainHeaderSlot}
			{children}
		</div>
	)
}));
jest.mock('@/core/constants/config/constants', () => ({
	IssuesView: { CARDS: 'CARDS', TABLE: 'TABLE', BLOCKS: 'BLOCKS', KANBAN: 'KANBAN' },
	LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE: 'last-selected-team-members-view-mode'
}));
jest.mock('@/core/components/common/header-tabs', () => () => <div>view-tabs</div>);
jest.mock('@/core/components/icons', () => ({ Users: () => null }));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({
	Breadcrumb: ({ paths }: { paths: Crumb[] }) => (
		<nav aria-label="breadcrumb">
			{paths.map((path) => [path.title].flat().join('') || 'empty-crumb').join(' > ')}
		</nav>
	)
}));
jest.mock('@/core/components/pages/teams/team/team-live-summary', () => ({
	TeamLiveSummary: () => <div>team-live-summary</div>
}));
jest.mock('@/core/components/common/skeleton/team-members-skeleton', () => () => null);
jest.mock('@/core/components/common/skeleton/team-invitations-skeleton', () => () => null);
jest.mock('@/core/components/common/skeleton/team-notifications-skeleton', () => () => null);
jest.mock('@/core/components/common/skeleton/unverified-email-skeleton', () => () => null);
jest.mock('@/core/components/common/skeleton/task-timer-section-skeleton', () => ({
	TaskTimerSectionSkeleton: () => null
}));
jest.mock('@/core/components/common/skeleton/team-member-header-skeleton', () => ({
	TeamMemberHeaderSkeleton: () => null
}));
jest.mock('@/core/components/common/skeleton/no-team-skeleton', () => ({ NoTeamSkeleton: () => null }));
jest.mock('@/core/components/pages/teams/team/home-page-skeleton', () => ({ HomePageSkeleton: () => null }));
jest.mock('@/core/components/pages/dashboard/task-timer-section', () => ({
	TaskTimerSection: () => <div>task-timer-section</div>
}));
jest.mock('@/core/components/common/animated-height', () => ({
	AnimatedHeight: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('@/core/components/optimized-components/teams', () => ({
	LazyTeamOutstandingNotifications: () => null,
	LazyTeamMembers: () => <div>team-members</div>,
	LazyTeamInvitations: () => null,
	LazyTeamMemberHeader: () => <div>team-member-header</div>
}));
jest.mock('@/core/components/optimized-components/common', () => ({
	LazyChatwootWidget: () => null,
	LazyUnverifiedEmail: () => null,
	LazyNoTeam: () => <div>no-team</div>
}));

import MainPage from './page-component';

describe('Home page', () => {
	beforeEach(() => {
		mockIsTeamMember = true;
		mockTeams = [];
	});

	it('shows the team, its timer and its members to a user with a member profile, as before', () => {
		mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1' } };

		render(<MainPage />);

		expect(screen.getByRole('navigation', { name: 'breadcrumb' }).textContent).toBe(
			'Home > Platform > common.CARDS'
		);
		expect(screen.getByText('team-live-summary')).toBeTruthy();
		expect(screen.getByText('task-timer-section')).toBeTruthy();
		expect(screen.getByText('team-member-header')).toBeTruthy();
		expect(screen.getByText('team-members')).toBeTruthy();
		expect(screen.queryByText('no-team')).toBeNull();
	});

	// ever-co/ever-teams#5678: an admin invited without an employee record waited on placeholders forever
	it('shows a user without a member profile the no-team screen, with no team part left waiting', () => {
		mockUser = { id: 'user-1', isEmailVerified: true };
		mockIsTeamMember = false;

		render(<MainPage />);

		expect(screen.getByText('no-team')).toBeTruthy();
		expect(screen.getByRole('navigation', { name: 'breadcrumb' }).textContent).toBe('Home');
		expect(screen.queryByText('team-live-summary')).toBeNull();
		expect(screen.queryByText('task-timer-section')).toBeNull();
		expect(screen.queryByText('team-member-header')).toBeNull();
		expect(screen.queryByText('team-members')).toBeNull();
	});

	it('does not start on the member rows before the shell says she is in no team', () => {
		mockUser = { id: 'user-1', isEmailVerified: true };

		render(<MainPage />);

		expect(screen.getByText('no-team')).toBeTruthy();
		expect(screen.queryByText('team-members')).toBeNull();
	});

	it('keeps the team this tab already shows when a later read of /user/me misses the employee', () => {
		mockUser = { id: 'user-1', isEmailVerified: true };
		mockTeams = [mockActiveTeam];

		render(<MainPage />);

		expect(screen.getByRole('navigation', { name: 'breadcrumb' }).textContent).toBe(
			'Home > Platform > common.CARDS'
		);
		expect(screen.getByText('team-live-summary')).toBeTruthy();
		expect(screen.getByText('task-timer-section')).toBeTruthy();
		expect(screen.getByText('team-member-header')).toBeTruthy();
		expect(screen.getByText('team-members')).toBeTruthy();
		expect(screen.queryByText('no-team')).toBeNull();
	});
});
