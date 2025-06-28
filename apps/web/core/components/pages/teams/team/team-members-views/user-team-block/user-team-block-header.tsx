import { Button } from '@/core/components';
import { useAuthenticateUser, useModal, useOrganizationTeams, useUserProfilePage } from '@/core/hooks';
import { taskBlockFilterState } from '@/core/stores/tasks/task-filter';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { clsxm } from '@/core/lib/utils';
import { SearchNormalIcon, TimerPlayIcon } from 'assets/svg';
import { CheckCircleTickIcon, CrossCircleIcon, StopCircleIcon, PauseIcon } from 'assets/svg';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { TaskNameFilter } from '@/core/components/pages/profile/task-filters';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';

type TimerStatus = 'running' | 'online' | 'pause' | 'idle' | 'suspended';
type FilterType = 'all' | TimerStatus;

interface IStatusCount {
	[key: string]: number;
}

interface IFilter extends IStatusCount {
	running: number;
	online: number;
	pause: number;
	idle: number;
	suspended: number;
}

const initialFilter: IFilter = {
	running: 0,
	online: 0,
	pause: 0,
	idle: 0,
	suspended: 0
};

// Status buttons configuration for better maintainability
const statusButtons = (
	t: ReturnType<typeof useTranslations>,
	membersStatusNumber: IFilter,
	totalMembersCount: number
) => [
	{
		status: 'all' as const,
		label: t('common.ALL_MEMBERS'),
		icon: StopCircleIcon,
		count: totalMembersCount
	},
	{
		status: 'idle' as const,
		label: t('common.NOT_WORKING'),
		icon: CrossCircleIcon,
		count: membersStatusNumber.idle
	},
	{
		status: 'running' as const,
		label: t('common.WORKING'),
		icon: TimerPlayIcon,
		count: membersStatusNumber.running
	},
	{
		status: 'pause' as const,
		label: t('common.PAUSED'),
		icon: PauseIcon,
		count: membersStatusNumber.pause
	},
	{
		status: 'online' as const,
		label: t('common.ONLINE'),
		icon: CheckCircleTickIcon,
		count: membersStatusNumber.online
	}
];

export function UserTeamBlockHeader() {
	const t = useTranslations();
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { openModal, isOpen, closeModal } = useModal();
	const [activeFilter, setActiveFilter] = useAtom<FilterType>(taskBlockFilterState);

	const profile = useUserProfilePage();
	const hook = useTaskFilter(profile);

	// Enhanced members status count that includes current user (matching filter logic)
	const membersStatusNumber = useMemo(() => {
		const rawMembers = activeTeam?.members || [];

		// Create complete list including current user (same logic as team-members.tsx)
		const allMembers = [...rawMembers];

		// Add current user if not already included and exists
		const currentUserInMembers = rawMembers.find((m) => m.employee?.userId === user?.id);
		if (!currentUserInMembers && user && activeTeam) {
			// Create placeholder for current user (same as team-members.tsx)
			const currentUserPlaceholder = {
				id: `temp-${user.id}`,
				employeeId: user.employee?.id || `temp-employee-${user.id}`,
				employee: {
					id: user.employee?.id || `temp-employee-${user.id}`,
					userId: user.id,
					user: user,
					organizationId: user.employee?.organizationId || activeTeam.organizationId,
					tenantId: user.employee?.tenantId || activeTeam.tenantId,
					isActive: true,
					isArchived: false
				},
				role: null,
				isTrackingEnabled: user.employee?.isTrackingEnabled || false,
				activeTaskId: null,
				organizationTeamId: activeTeam.id,
				assignedAt: new Date(),
				isManager: false,
				isOwner: false,
				order: 0,
				timerStatus: undefined
			};
			allMembers.unshift(currentUserPlaceholder);
		}

		if (!allMembers.length) return initialFilter;

		return allMembers.reduce<IFilter>(
			(acc, item) => {
				// Enhanced status logic matching the filter conditions
				if (!item.timerStatus) {
					// New users without timer status are considered 'idle'
					acc.idle += 1;
				} else {
					const status = item.timerStatus as TimerStatus;
					// Safe increment with type checking
					if (status in acc) {
						acc[status] += 1;
					}
				}

				// FIXED: Current user should ALWAYS be counted as 'online' when authenticated
				// regardless of their timer status (matching the updated filter logic)
				if (item.employee?.userId === user?.id) {
					acc.online += 1;
				}

				return acc;
			},
			{ ...initialFilter }
		);
	}, [activeTeam?.members, activeTeam?.id, activeTeam?.organizationId, activeTeam?.tenantId, user]);

	// Calculate total members count (including current user)
	const totalMembersCount = useMemo(() => {
		const rawMembers = activeTeam?.members || [];
		const currentUserInMembers = rawMembers.find((m) => m.employee?.userId === user?.id);
		return rawMembers.length + (currentUserInMembers ? 0 : user && activeTeam ? 1 : 0);
	}, [activeTeam?.members, user?.id, user, activeTeam]);

	return (
		<>
			<div
				ref={profile.loadTaskStatsIObserverRef}
				className="hidden sm:flex dark:bg-dark-high font-normal pt-4 justify-between dark:text-[#7B8089]"
			>
				<div className="flex items-center w-9/12">
					{statusButtons(t, membersStatusNumber, totalMembersCount).map((button) => (
						<div
							key={button.status}
							className={clsxm(
								'w-1/6 text-center flex items-center justify-center gap-2 py-4 cursor-pointer text-sm border-b-4 border-transparent',
								activeFilter === button.status &&
									'border-primary dark:border-white text-primary dark:text-white'
							)}
							onClick={() => setActiveFilter(button.status)}
						>
							<button.icon
								className={clsxm(
									'w-7 h-7 p-1 !text-gray-300 dark:!text-white',
									activeFilter === button.status && 'text-primary dark:text-white'
								)}
							/>
							<p>{button.label}</p>
							<span
								className={clsxm(
									'bg-gray-500/40 p-1 px-2 text-xs rounded-md',
									activeFilter === button.status && 'bg-primary dark:bg-[#47484D] text-white'
								)}
							>
								{button.count}
							</span>
						</div>
					))}
				</div>

				<div className="flex gap-2 justify-end items-center pr-4 w-3/12">
					{hook.filterType === 'search' ? (
						<TaskNameFilter
							fullWidth={true}
							value={hook.taskName}
							setValue={hook.setTaskName}
							close={() => {
								hook.toggleFilterType('search');
							}}
						/>
					) : (
						<div className="flex gap-6">
							<button
								ref={hook.outclickFilterCard.ignoreElementRef}
								className={clsxm('outline-none')}
								onClick={() => hook.toggleFilterType('search')}
							>
								<SearchNormalIcon className={clsxm('w-4 dark:stroke-white')} />
							</button>

							<VerticalSeparator />

							<Button className="py-3.5 px-4 gap-3 rounded-xl outline-none w-44" onClick={openModal}>
								Invite
							</Button>
						</div>
					)}
				</div>
			</div>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
}
