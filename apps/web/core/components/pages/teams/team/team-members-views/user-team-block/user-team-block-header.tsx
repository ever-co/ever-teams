import { Button } from '@/core/components';
import { useModal, useUserProfilePage } from '@/core/hooks';
import { taskBlockFilterState, blockViewSearchQueryState } from '@/core/stores/tasks/task-filter';
import { useAtom, useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useMemo, useEffect } from 'react';
import { activeTeamState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { CrossCircleIcon } from 'assets/svg';
import { CircleCheck, Pause, Play, Search, StopCircle } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { InviteFormModal } from '@/core/components/features/teams/invite-form-modal';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { TaskNameFilter } from '@/core/components/pages/profile/task-filters';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { useProcessedTeamMembers } from '@/core/hooks/teams/use-processed-team-members';
import { useTeamMemberFilterStatsForUI } from '@/core/hooks/teams/use-team-member-filter-stats';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useCanInviteToActiveTeam } from '@/core/hooks/invitations/use-can-invite-to-active-team';
import { TeamMemberFilterType } from '@/core/lib/utils/team-members.utils';
import { Tabs, TabsList, TabsTrigger } from '@/core/components/common/tabs';
import { COUNT_CHIP_CLASS_NAME } from '@/core/components/tasks/daily-plan/day-group';

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
		icon: StopCircle,
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
		icon: Play,
		count: membersStatusNumber.running
	},
	{
		status: 'pause' as const,
		label: t('common.PAUSED'),
		icon: Pause,
		count: membersStatusNumber.pause
	},
	{
		status: 'online' as const,
		label: t('common.ONLINE'),
		icon: CircleCheck,
		count: membersStatusNumber.online
	}
];

export function UserTeamBlockHeader() {
	const t = useTranslations();

	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const { openModal, isOpen, closeModal } = useModal();
	// The API refuses an invitation into a team the user does not manage (403): show Invite only to who may send it.
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
	const isSearchOpen = hook.filterType === 'search';

	return (
		<>
			<div
				ref={profile.loadTaskStatsIObserverRef}
				className="hidden items-end justify-between gap-3 px-4 font-normal sm:flex"
			>
				<Tabs
					value={activeFilter}
					onValueChange={(status) => setActiveFilter(status as TeamMemberFilterType)}
					className="min-w-0 gap-0"
				>
					<TabsList className="w-auto border-b-0">
						{statusButtons(t, membersStatusNumber, totalMembersCount).map((button) => {
							const isActive = activeFilter === button.status;
							return (
								<TabsTrigger key={button.status} value={button.status}>
									<button.icon className="size-4 shrink-0" />
									<span>{button.label}</span>
									<span
										className={clsxm(
											COUNT_CHIP_CLASS_NAME,
											isActive && 'bg-primary/10 text-primary-ink'
										)}
									>
										{button.count}
									</span>
								</TabsTrigger>
							);
						})}
					</TabsList>
				</Tabs>

				<div className="flex h-11 shrink-0 items-center justify-end gap-2 pb-2">
					{isSearchOpen && (
						<TaskNameFilter
							className="w-72 py-0 md:w-72"
							value={hook.taskName}
							setValue={hook.setTaskName}
							close={() => {
								hook.toggleFilterType('search');
							}}
						/>
					)}
					{!isSearchOpen && (
						<div className="flex items-center gap-3">
							<button
								ref={hook.outclickFilterCard.ignoreElementRef}
								className={clsxm(
									buttonVariants({ variant: 'ghost', size: 'icon' }),
									'text-muted-foreground'
								)}
								onClick={() => hook.toggleFilterType('search')}
							>
								<Search className="size-4" />
							</button>

							{canInvite && (
								<>
									<VerticalSeparator className="my-auto h-4 self-auto" />

									<Button size="default" onClick={openModal}>
										{t('common.INVITE')}
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
