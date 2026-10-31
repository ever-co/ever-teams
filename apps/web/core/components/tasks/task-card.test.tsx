/**
 * @jest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react';
import type { I_UserProfilePage } from '@/core/hooks';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TaskCard } from './task-card';

const TASK_ID = 'task-1';
const TENANT_ID = 'tenant-1';
const ORGANIZATION_ID = 'organization-1';
const VIEWER_USER_ID = 'viewer-user';
const VIEWER_EMPLOYEE_ID = 'viewer-employee';
const PROFILE_USER_ID = 'profile-user';
const PROFILE_EMPLOYEE_ID = 'profile-employee';

const mockCreateDailyPlan = jest.fn();

// A manager on a teammate's profile: the plan must target the profile member, never the viewer
const mockViewer = {
	id: VIEWER_USER_ID,
	tenantId: TENANT_ID,
	employee: { id: VIEWER_EMPLOYEE_ID, organizationId: ORGANIZATION_ID }
};
const mockProfileMember = {
	employeeId: PROFILE_EMPLOYEE_ID,
	employee: { id: PROFILE_EMPLOYEE_ID, userId: PROFILE_USER_ID, user: { id: PROFILE_USER_ID } }
};
const mockActiveTeam = { id: 'team-1', members: [mockProfileMember] };
const mockAtomValues: Record<string, unknown> = { 'active-team': mockActiveTeam };

jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => mockAtomValues[atom]
}));
jest.mock('@/core/stores', () => ({
	activeTaskStatisticsState: 'active-task-statistics',
	activeTeamState: 'active-team',
	activeTeamTaskState: 'active-team-task',
	timerSecondsState: 'timer-seconds'
}));
jest.mock('@/core/hooks', () => ({
	useCanSeeActivityScreen: () => false,
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useTMCardTaskEdit: () => ({}),
	useMemberIdentity: () => ({}),
	useMemberActiveTask: () => null,
	useTeamMemberMutations: () => ({}),
	useTeamMemberRoleActions: () => ({})
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({ myTodayPlan: [], myFuturePlans: [], ensureMyDailyPlans: jest.fn(), isLoading: false })
}));
jest.mock('@/core/hooks/daily-plans/use-create-daily-plan', () => ({
	useCreateDailyPlan: () => ({ createDailyPlan: mockCreateDailyPlan, createDailyPlanLoading: false })
}));
jest.mock('@/core/hooks/daily-plans/use-update-daily-plan', () => ({
	useUpdateDailyPlan: () => ({ removeTaskFromPlan: jest.fn(), removeManyTaskPlans: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockViewer }) }));
jest.mock('@/core/hooks/tasks/use-favorites-task', () => ({
	useFavoriteTasks: () => ({
		toggleFavoriteTask: jest.fn(),
		isFavoriteTask: () => false,
		addTaskToFavoriteLoading: false,
		deleteTaskFromFavoritesLoading: false
	})
}));
jest.mock('@/core/hooks/tasks/use-timer-button', () => ({ useTimerButtonLogic: jest.fn() }));

// The menu renders inline, so each layout keeps its entries inside its own card
jest.mock('@/core/components/common/dropdown-menu', () => ({
	DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
	DropdownMenuPortal: ({ children }: React.PropsWithChildren) => <>{children}</>,
	DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	DropdownMenuItem: ({ children }: React.PropsWithChildren) => <>{children}</>,
	DropdownMenuSeparator: () => null
}));
jest.mock('../common/ever-card', () => ({
	EverCard: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
		<section className={className}>{children}</section>
	)
}));
jest.mock('../features/daily-plan/create-daily-plan-form-modal', () => ({
	CreateDailyPlanFormModal: ({ employeeId }: { employeeId?: string }) => (
		<div data-testid="create-daily-plan-form" data-employee-id={employeeId} />
	)
}));
jest.mock('@/core/components', () => ({
	SpinnerLoader: () => null,
	Text: ({ children }: React.PropsWithChildren) => <span>{children}</span>
}));
jest.mock('@/core/components/common/image-overlapper', () => ({ __esModule: true, default: () => null }));
jest.mock('../common/tooltip', () => ({
	Tooltip: () => null,
	TooltipContent: () => null,
	TooltipProvider: () => null,
	TooltipTrigger: () => null
}));
jest.mock('../daily-plan', () => ({
	AddTasksEstimationHoursModal: () => null,
	EnforcePlanedTaskModal: () => null,
	SuggestDailyPlanModal: () => null
}));
jest.mock('../duplicated-components/separator', () => ({ VerticalSeparator: () => null }));
jest.mock('../features/daily-plan/add-task-to-plan', () => ({ AddTaskToPlan: () => null }));
jest.mock('../pages/teams/team/team-members-views/user-team-card/task-estimate', () => ({
	TaskEstimateInfo: () => null
}));
jest.mock('../timer/timer-button', () => ({ TimerButton: () => null }));
jest.mock('./task-all-status-type', () => ({ TaskAllStatusTypes: () => null }));
jest.mock('./task-displays', () => ({ TaskNameInfoDisplay: () => null }));
jest.mock('./task-items', () => ({ TaskAvatars: () => null }));
jest.mock('./task-status', () => ({ ActiveTaskStatusDropdown: () => null }));
jest.mock('./task-times', () => ({ TaskTimes: () => null }));
jest.mock('@/core/lib/helpers/index', () => ({
	getDailyPlanDay: jest.fn(),
	secondsToTime: () => ({ hours: 0, minutes: 0 })
}));
jest.mock('@/core/lib/utils', () => ({ clsxm: (...values: unknown[]) => values.filter(Boolean).join(' ') }));
jest.mock('assets/svg', () => ({ SixSquareGridIcon: () => null, ThreeCircleOutlineVerticalIcon: () => null }), {
	virtual: true
});
jest.mock('@radix-ui/react-icons', () => ({ ReloadIcon: () => null }));
jest.mock('lucide-react', () => ({ LoaderCircle: () => null }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const task = { id: TASK_ID, title: 'Fixture task' } as TTask;
const profile = { member: mockProfileMember, userProfile: { id: PROFILE_USER_ID } } as I_UserProfilePage;

type CardOptions = { viewType: 'default' | 'dailyplan'; planMode?: 'Outstanding' };

// Below the lg breakpoint (1024px) the visible card is the one hidden from lg up
function renderCompactCard({ viewType, planMode }: CardOptions) {
	const { container } = render(
		<TaskCard
			task={task}
			isAuthUser={false}
			activeAuthTask={false}
			viewType={viewType}
			profile={profile}
			planMode={planMode}
		/>
	);
	const compactCard = container.querySelector<HTMLElement>('section.lg\\:hidden');
	if (!compactCard) {
		throw new Error('The compact task card was not rendered');
	}
	return within(compactCard);
}

describe('TaskCard compact layout menu', () => {
	beforeEach(() => {
		mockCreateDailyPlan.mockResolvedValue(undefined);
	});

	it.each(['dailyPlan.PLAN_FOR_TODAY', 'dailyPlan.PLAN_FOR_TOMORROW'])(
		'%s plans the task for the profile member',
		async (label) => {
			const compactCard = renderCompactCard({ viewType: 'default' });
			const planButton = compactCard.getByRole('button', { name: label });

			await act(async () => {
				fireEvent.click(planButton);
			});

			const expectedPlan = expect.objectContaining({ taskId: TASK_ID, employeeId: PROFILE_EMPLOYEE_ID });
			expect(mockCreateDailyPlan).toHaveBeenCalledWith(expectedPlan);
		}
	);

	it('gives the selected day form the profile member', () => {
		const compactCard = renderCompactCard({ viewType: 'default' });
		const planForm = compactCard.getByTestId('create-daily-plan-form');

		expect(planForm.getAttribute('data-employee-id')).toBe(PROFILE_EMPLOYEE_ID);
	});

	it('offers the plan entries on the Outstanding tab', () => {
		const compactCard = renderCompactCard({ viewType: 'dailyplan', planMode: 'Outstanding' });
		const planButton = compactCard.queryByRole('button', { name: 'dailyPlan.PLAN_FOR_TODAY' });

		expect(planButton).not.toBeNull();
	});
});
