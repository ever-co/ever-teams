/**
 * @jest-environment jsdom
 *
 * The expanded member row on the team page (#5335): a background re-read of the member's plans (after a task or plan
 * edit, or from a task menu) must keep the activity panel, its tab and its list on screen. Only the first read of the
 * plans shows the panel's skeleton.
 */
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { ExpandedMemberDetails } from './index';

const mockPlans = { isLoading: false, isFetching: false };
const mockMounts = { list: 0 };

function MockProfileTaskList() {
	useEffect(() => {
		mockMounts.list += 1;
	}, []);
	return <div data-testid="member-task-list" />;
}

jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({ useEmployeeDailyPlans: () => mockPlans }));
jest.mock('@/core/hooks', () => ({
	useCollaborative: jest.fn(),
	useTMCardTaskEdit: jest.fn(),
	useMemberIdentity: jest.fn(),
	useMemberActiveTask: jest.fn(),
	useTeamMemberMutations: jest.fn(),
	useTeamMemberRoleActions: jest.fn(),
	useUserProfilePage: () => ({ loadTaskStatsIObserverRef: undefined })
}));
jest.mock('@/core/hooks/tasks/use-task-filter', () => ({ useTaskFilter: () => ({ tasksFiltered: [] }) }));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({ useIsListedTeamManager: jest.fn() }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: jest.fn() }));
jest.mock('@/core/hooks/activities/use-profile-activity', () => ({ normalizeProfileActivityTimeZone: jest.fn() }));
jest.mock('@/core/components/optimized-components', () => ({
	LazyUserProfileTask: () => <MockProfileTaskList />,
	LazyUserTeamActivity: () => null
}));
jest.mock('@/core/components/teams/member-row-skeleton', () => ({
	MemberActivityPanelSkeleton: () => <div data-testid="panel-skeleton" />,
	MemberEstimateCellSkeleton: () => null,
	MemberTaskCellSkeleton: () => null,
	MemberTimesCellSkeleton: () => null,
	MemberTotalCellSkeleton: () => null
}));
jest.mock('@/core/components/common/segmented-control', () => ({ SegmentedControl: () => <div data-testid="tabs" /> }));
jest.mock('@/core/components/activities/activity-tab-labels', () => ({
	ACTIVITY_TAB_LABEL_KEYS: { Tasks: 'Tasks', Screenshots: 'Screenshots', Apps: 'Apps', 'Visited Sites': 'Sites' }
}));
jest.mock('@/core/components/pages/profile/apps', () => ({ AppsTab: () => null }));
jest.mock('@/core/components/pages/profile/visited-sites', () => ({ VisitedSitesTab: () => null }));
jest.mock('@/core/components/pages/profile/screenshots/screenshoots', () => ({ ScreenshootTab: () => null }));
jest.mock('@/app/[locale]/(main)/profile/[memberId]/page', () => ({}));
jest.mock('@/core/components', () => ({ Button: () => null, Text: () => null }));
jest.mock('@/core/components/icons', () => ({
	Analytics: () => null,
	ChevronDown: () => null,
	ChevronsDown: () => null,
	DragHandle: () => null,
	Spinner: () => null
}));
jest.mock('@/core/components/tasks/task-property-trigger', () => ({ TASK_PROPERTY_PILL_RECIPE: '' }));
jest.mock('@/core/components/tasks/task-times', () => ({ TaskTimes: () => null, TodayWorkedTime: () => null }));
jest.mock('@/core/components/duplicated-components/_input', () => ({ InputField: () => null }));
jest.mock('@/core/components/common/skeleton/profile-component-skeletons', () => ({
	UserTeamActivitySkeleton: () => null
}));
jest.mock('./task-estimate', () => ({ TaskEstimateInfo: () => null }));
jest.mock('./task-info', () => ({ TaskInfo: () => null }));
jest.mock('./user-info', () => ({ UserInfo: () => null }));
jest.mock('./user-team-card-menu', () => ({ UserTeamCardMenu: () => null }));
jest.mock('@/core/stores', () => ({
	activeTaskStatisticsState: {},
	activeTeamScopeState: {},
	timerSecondsState: {},
	userDetailAccordion: {}
}));
jest.mock('@/core/stores/timer/activity-type', () => ({ activityTypeState: {} }));
jest.mock('@/core/stores/teams/team-tasks', () => ({ teamTasksPagesLoadingState: {} }));
jest.mock('@/core/lib/helpers/index', () => ({ secondsToTime: jest.fn() }));
jest.mock('@/core/lib/helpers', () => ({ cn: (...values: unknown[]) => values.filter(Boolean).join(' ') }));
jest.mock('@/core/lib/utils', () => ({ clsxm: (...values: unknown[]) => values.filter(Boolean).join(' ') }));
jest.mock('@/core/constants/config/constants', () => ({ ITEMS_LENGTH_TO_VIRTUALIZED: 15 }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const panel = () => (
	<ExpandedMemberDetails
		employeeId="employee-1"
		showsActivityPanel
		member={{ employeeId: 'employee-1' }}
		activityFilter="Tasks"
		onActivityFilterChange={jest.fn()}
	/>
);

describe('ExpandedMemberDetails', () => {
	beforeEach(() => {
		mockPlans.isLoading = false;
		mockPlans.isFetching = false;
		mockMounts.list = 0;
	});

	it('shows the skeleton while the member plans are read for the first time', () => {
		mockPlans.isLoading = true;
		mockPlans.isFetching = true;

		render(panel());

		expect(screen.getByTestId('panel-skeleton')).toBeTruthy();
		expect(screen.queryByTestId('member-task-list')).toBeNull();
	});

	it('keeps the tabs and the task list mounted while the plans are read again in the background', () => {
		const { rerender } = render(panel());
		const list = screen.getByTestId('member-task-list');

		// A task edit, a plan change or a task menu re-reads the mockPlans: the query fetches while its data stays
		mockPlans.isFetching = true;
		rerender(panel());

		expect(screen.queryByTestId('panel-skeleton')).toBeNull();
		expect(screen.getByTestId('tabs')).toBeTruthy();
		expect(screen.getByTestId('member-task-list')).toBe(list);
		expect(mockMounts.list).toBe(1);
	});
});
