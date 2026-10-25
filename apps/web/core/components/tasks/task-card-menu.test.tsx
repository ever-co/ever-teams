/** @jest-environment jsdom */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskCardMenu } from './task-card';

const VIEWER_EMPLOYEE_ID = 'employee-viewer';
const TEAMMATE_EMPLOYEE_ID = 'employee-teammate';
const TASK_ID = 'task-x';

const mockEnsureMyDailyPlans = jest.fn(async () => undefined);
const mockEnsureEmployeeDailyPlans = jest.fn(async () => undefined);
const mockUser = {
	id: 'user-viewer',
	tenantId: 'tenant-a',
	employee: { id: VIEWER_EMPLOYEE_ID, organizationId: 'organization-a' }
};
let mockCanSeeActivity = false;
let mockPermissions: string[] = [];
let mockMyTodayPlans: unknown[] = [];
let mockTeammateTodayPlans: unknown[] = [];
let mockTeammateFuturePlans: unknown[] = [];

jest.mock('@/core/hooks', () => ({
	useCanSeeActivityScreen: () => mockCanSeeActivity,
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({
		myTodayPlan: mockMyTodayPlans,
		myFuturePlans: [],
		ensureMyDailyPlans: mockEnsureMyDailyPlans,
		isLoading: false
	})
}));
jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({
	useEmployeeDailyPlans: () => ({
		employeeTodayPlan: mockTeammateTodayPlans,
		employeeFuturePlans: mockTeammateFuturePlans,
		ensureEmployeeDailyPlans: mockEnsureEmployeeDailyPlans,
		isLoading: false
	})
}));
jest.mock('@/core/hooks/daily-plans/use-create-daily-plan', () => ({
	useCreateDailyPlan: () => ({ createDailyPlan: jest.fn(), createDailyPlanLoading: false })
}));
jest.mock('@/core/hooks/daily-plans/use-update-daily-plan', () => ({
	useUpdateDailyPlan: () => ({ removeTaskFromPlan: jest.fn(), removeManyTaskPlans: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser }) }));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));
jest.mock('@/core/hooks/tasks/use-favorites-task', () => ({
	useFavoriteTasks: () => ({
		toggleFavoriteTask: jest.fn(),
		isFavoriteTask: () => false,
		addTaskToFavoriteLoading: false,
		deleteTaskFromFavoritesLoading: false
	})
}));
jest.mock('@/core/hooks/tasks/use-timer-button', () => ({ useTimerButtonLogic: jest.fn() }));

// The menu content is always rendered, and the button stands for the trigger that opens it
jest.mock('@/core/components/common/dropdown-menu', () => ({
	DropdownMenu: ({ children, onOpenChange }: React.PropsWithChildren<{ onOpenChange?: (open: boolean) => void }>) => (
		<div>
			<button type="button" onClick={() => onOpenChange?.(true)}>
				open-menu
			</button>
			{children}
		</div>
	),
	DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
	DropdownMenuPortal: ({ children }: React.PropsWithChildren) => <>{children}</>,
	DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	DropdownMenuItem: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	DropdownMenuSeparator: () => <hr />
}));

jest.mock('@/core/lib/helpers/index', () => ({
	getDailyPlanDay: jest.requireActual('@/core/lib/helpers/daily-plan-day').getDailyPlanDay,
	secondsToTime: () => ({ hours: 0, minutes: 0, seconds: 0 })
}));
jest.mock('@/core/lib/utils', () => ({ clsxm: (...values: string[]) => values.filter(Boolean).join(' ') }));
jest.mock('@/core/stores', () => ({
	activeTaskStatisticsState: 'active-task-statistics',
	activeTeamState: 'active-team',
	activeTeamTaskState: 'active-team-task',
	timerSecondsState: 'timer-seconds'
}));
jest.mock('@/core/components', () => ({ SpinnerLoader: () => null, Text: () => null }));
jest.mock('@/core/components/common/image-overlapper', () => ({ __esModule: true, default: () => null }));
jest.mock('../timer/timer-button', () => ({ TimerButton: () => null }));
jest.mock('./task-all-status-type', () => ({ TaskAllStatusTypes: () => null }));
jest.mock('./task-displays', () => ({ TaskNameInfoDisplay: () => null }));
jest.mock('./task-items', () => ({ TaskAvatars: () => null }));
jest.mock('./task-status', () => ({ ActiveTaskStatusDropdown: () => null }));
jest.mock('./task-times', () => ({ TaskTimes: () => null }));
jest.mock('../features/daily-plan/create-daily-plan-form-modal', () => ({ CreateDailyPlanFormModal: () => null }));
jest.mock('../daily-plan', () => ({
	AddTasksEstimationHoursModal: () => null,
	EnforcePlanedTaskModal: () => null,
	SuggestDailyPlanModal: () => null
}));
jest.mock('../pages/teams/team/team-members-views/user-team-card/task-estimate', () => ({
	TaskEstimateInfo: () => null
}));
jest.mock('../common/ever-card', () => ({ EverCard: () => null }));
jest.mock('../duplicated-components/separator', () => ({ VerticalSeparator: () => null }));
jest.mock('../common/tooltip', () => ({
	Tooltip: () => null,
	TooltipContent: () => null,
	TooltipProvider: () => null,
	TooltipTrigger: () => null
}));
jest.mock('../features/daily-plan/add-task-to-plan', () => ({ AddTaskToPlan: () => null }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('assets/svg', () => ({ SixSquareGridIcon: () => null, ThreeCircleOutlineVerticalIcon: () => null }), {
	virtual: true
});
jest.mock('@radix-ui/react-icons', () => ({ ReloadIcon: () => null }));
jest.mock('lucide-react', () => ({ LoaderCircle: () => null }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

type MenuProps = React.ComponentProps<typeof TaskCardMenu>;

const task = { id: TASK_ID, title: 'Task X', members: [] } as unknown as MenuProps['task'];
const teammateProfile = {
	isAuthUser: false,
	member: { employeeId: TEAMMATE_EMPLOYEE_ID }
} as unknown as MenuProps['profile'];
const ownProfile = { isAuthUser: true, member: { employeeId: VIEWER_EMPLOYEE_ID } } as unknown as MenuProps['profile'];

function planHoldingTask(id: string, date: moment.Moment) {
	return { id, date: date.format('YYYY-MM-DD'), tasks: [{ id: TASK_ID }] };
}

function renderMenu(props: Partial<MenuProps> = {}) {
	return render(<TaskCardMenu task={task} viewType="default" profile={teammateProfile} {...props} />);
}

function isShown(label: string): boolean {
	return screen.queryByText(label) !== null;
}

describe('TaskCardMenu plan entries on a profile', () => {
	beforeEach(() => {
		mockCanSeeActivity = false;
		mockPermissions = [];
		mockMyTodayPlans = [];
		mockTeammateTodayPlans = [];
		mockTeammateFuturePlans = [];
	});

	it("offers Plan for today from the teammate's plans when only the viewer planned the task", () => {
		mockCanSeeActivity = true;
		mockMyTodayPlans = [planHoldingTask('plan-viewer-today', moment())];

		renderMenu();

		expect(isShown('dailyPlan.PLAN_FOR_TODAY')).toBe(true);
	});

	it('hides Plan for today when the teammate already planned the task', () => {
		mockCanSeeActivity = true;
		mockTeammateTodayPlans = [planHoldingTask('plan-teammate-today', moment())];

		renderMenu();

		expect(isShown('dailyPlan.PLAN_FOR_TODAY')).toBe(false);
		expect(isShown('dailyPlan.PLAN_FOR_TOMORROW')).toBe(true);
	});

	it('shows no plan entry to a member who may not plan for the teammate', () => {
		renderMenu();

		expect(isShown('dailyPlan.PLAN_FOR_TODAY')).toBe(false);
		expect(isShown('dailyPlan.PLAN_FOR_TOMORROW')).toBe(false);
		expect(isShown('dailyPlan.PLAN_FOR_SOME_DAY')).toBe(false);
	});

	it('offers the plan entries to a holder of CHANGE_SELECTED_EMPLOYEE', () => {
		mockPermissions = ['CHANGE_SELECTED_EMPLOYEE'];

		renderMenu();

		expect(isShown('dailyPlan.PLAN_FOR_TODAY')).toBe(true);
		expect(isShown('dailyPlan.PLAN_FOR_SOME_DAY')).toBe(true);
	});

	it("lets a holder of CHANGE_SELECTED_EMPLOYEE remove the task from the teammate's plans", () => {
		mockPermissions = ['CHANGE_SELECTED_EMPLOYEE'];
		const todayPlan = planHoldingTask('plan-teammate-today', moment());
		const nextWeekPlan = planHoldingTask('plan-teammate-next-week', moment().add(7, 'days'));
		mockTeammateTodayPlans = [todayPlan];
		mockTeammateFuturePlans = [nextWeekPlan];

		const plan = todayPlan as unknown as MenuProps['plan'];
		renderMenu({ viewType: 'dailyplan', planMode: 'Today Tasks', plan });

		expect(isShown('dailyPlan.REMOVE_FROM_THIS_PLAN')).toBe(true);
		expect(isShown('Remove from all plans')).toBe(true);
	});

	it("refreshes the teammate's plans when the menu opens", () => {
		mockCanSeeActivity = true;
		renderMenu();

		fireEvent.click(screen.getByText('open-menu'));

		expect(mockEnsureEmployeeDailyPlans).toHaveBeenCalledTimes(1);
		expect(mockEnsureMyDailyPlans).not.toHaveBeenCalled();
	});

	it("keeps reading and refreshing the viewer's own plans on their own profile", () => {
		mockCanSeeActivity = true;
		mockMyTodayPlans = [planHoldingTask('plan-viewer-today', moment())];
		renderMenu({ profile: ownProfile });

		fireEvent.click(screen.getByText('open-menu'));

		expect(isShown('dailyPlan.PLAN_FOR_TODAY')).toBe(false);
		expect(isShown('dailyPlan.PLAN_FOR_TOMORROW')).toBe(true);
		expect(mockEnsureMyDailyPlans).toHaveBeenCalledTimes(1);
		expect(mockEnsureEmployeeDailyPlans).not.toHaveBeenCalled();
	});
});
