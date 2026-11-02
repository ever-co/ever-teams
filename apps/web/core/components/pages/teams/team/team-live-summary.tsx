'use client';

import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { activeTeamState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useProcessedTeamMembers } from '@/core/hooks/teams/use-processed-team-members';
import { useTeamMemberFilterStatsForUI } from '@/core/hooks/teams/use-team-member-filter-stats';
import { Skeleton } from '@/core/components/common/skeleton';

/** The team name with its live figures: how many members, how many are tracking right now. */
export function TeamLiveSummary() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const processedMembers = useProcessedTeamMembers(activeTeam, user!);
	const stats = useTeamMemberFilterStatsForUI(processedMembers.allMembersWithCurrent, user!);

	if (!activeTeam) {
		return <TeamLiveSummarySkeleton />;
	}

	const memberCount = stats.all;
	const workingCount = stats.running;
	const hasWorkingMembers = workingCount > 0;

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
			<h1 className="truncate text-lg font-semibold">{activeTeam.name}</h1>
			<span className="text-xs text-muted-foreground tabular-nums">
				{t('pages.home.MEMBER_COUNT', { count: memberCount })}
			</span>
			{hasWorkingMembers && (
				<span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
					<span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
					{t('pages.home.WORKING_NOW', { count: workingCount })}
				</span>
			)}
		</div>
	);
}

/** Holds the place of the team name and its figures, so the view switch stays at the right while the team loads. */
export function TeamLiveSummarySkeleton() {
	return (
		<div role="status" className="flex h-7 items-center gap-3">
			<Skeleton className="h-5 w-32 bg-foreground/[0.06]" />
			<Skeleton className="h-3.5 w-20 bg-foreground/[0.06]" />
		</div>
	);
}
