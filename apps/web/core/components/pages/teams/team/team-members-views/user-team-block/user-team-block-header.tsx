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
import { useProcessedTeamMembers } from '@/core/hooks/teams/use-processed-team-members';
import { useTeamMemberFilterStatsForUI } from '@/core/hooks/teams/use-team-member-filter-stats';
import { TeamMemberFilterType } from '@/core/utils/team-members.utils';

// Interface for filter stats (kept for UI compatibility)
interface IFilter {
	running: number;
	online: number;
	pause: number;
	idle: number;
	suspended: number;
}

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
	const [activeFilter, setActiveFilter] = useAtom<TeamMemberFilterType>(taskBlockFilterState);

	const profile = useUserProfilePage();
	const hook = useTaskFilter(profile);

	// Use refactored hooks for member processing and stats
	const processedMembers = useProcessedTeamMembers(activeTeam || undefined, user || undefined);
	const filterStats = useTeamMemberFilterStatsForUI(processedMembers.allMembersWithCurrent, user || undefined);

	// Convert filter stats to the format expected by the UI
	const membersStatusNumber = useMemo(
		() => ({
			running: filterStats.running,
			online: filterStats.online,
			pause: filterStats.pause,
			idle: filterStats.idle,
			suspended: filterStats.suspended
		}),
		[filterStats]
	);

	const totalMembersCount = filterStats.all;

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
