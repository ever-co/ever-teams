import { Button } from '@/core/components';
import { useModal, useUserProfilePage } from '@/core/hooks';
import { taskBlockFilterState, blockViewSearchQueryState } from '@/core/stores/tasks/task-filter';
import { useAtom, useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useMemo, useEffect } from 'react';
import { activeTeamState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import {
	SearchNormalIcon,
	TimerPlayIcon,
	CheckCircleTickIcon,
	CrossCircleIcon,
	StopCircleIcon,
	PauseIcon
} from 'assets/svg';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { TaskNameFilter } from '@/core/components/pages/profile/task-filters';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { useProcessedTeamMembers } from '@/core/hooks/teams/use-processed-team-members';
import { useTeamMemberFilterStatsForUI } from '@/core/hooks/teams/use-team-member-filter-stats';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useCanInviteToActiveTeam } from '@/core/hooks/invitations/use-can-invite-to-active-team';
import { TeamMemberFilterType } from '@/core/lib/utils/team-members.utils';

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

	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const { openModal, isOpen, closeModal } = useModal();
	const canInvite = useCanInviteToActiveTeam();
	const [activeFilter, setActiveFilter] = useAtom<TeamMemberFilterType>(taskBlockFilterState);
	const [, setSearchQuery] = useAtom(blockViewSearchQueryState);

	const profile = useUserProfilePage();
	const hook = useTaskFilter(profile);

	// Sync search query to global state for member filtering
	useEffect(() => {
		setSearchQuery(hook.taskName);
	}, [hook.taskName, setSearchQuery]);

	// Use refactored hooks for member processing and stats
	const processedMembers = useProcessedTeamMembers(activeTeam, user!);
	const filterStats = useTeamMemberFilterStatsForUI(processedMembers.allMembersWithCurrent, user!);

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
				className="hidden items-center justify-between gap-3 pt-2 font-normal sm:flex"
			>
				<div className="flex min-w-0 flex-1 items-center overflow-x-auto">
					{statusButtons(t, membersStatusNumber, totalMembersCount).map((button) => (
						<div
							key={button.status}
							className={clsxm(
								'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground',
								activeFilter === button.status &&
									'border-primary text-foreground dark:border-white'
							)}
							onClick={() => setActiveFilter(button.status)}
						>
							<button.icon
								className={clsxm(
									'size-4 !text-muted-foreground',
									activeFilter === button.status && '!text-foreground'
								)}
							/>
							<p>{button.label}</p>
							<span
								className={clsxm(
									'rounded-md bg-muted px-1.5 py-0.5 text-xs',
									activeFilter === button.status && 'bg-primary text-white dark:bg-muted'
								)}
							>
								{button.count}
							</span>
						</div>
					))}
				</div>

				<div className="flex shrink-0 items-center justify-end gap-2 pr-1">
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
						<div className="flex items-center gap-3">
							<button
								ref={hook.outclickFilterCard.ignoreElementRef}
								className={clsxm('outline-none')}
								onClick={() => hook.toggleFilterType('search')}
							>
								<SearchNormalIcon className={clsxm('w-4 dark:stroke-white')} />
							</button>

							{canInvite && (
								<>
									<VerticalSeparator />

									<Button
										className="h-9 rounded-md px-4 py-0 text-sm font-medium outline-hidden"
										onClick={openModal}
									>
										Invite
									</Button>
								</>
							)}
						</div>
					)}
				</div>
			</div>
			<InviteFormModal open={isOpen && !!user?.isEmailVerified} closeModal={closeModal} />
		</>
	);
}
