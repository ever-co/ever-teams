'use client';

import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { BreadcrumbSkeleton } from '@/core/components/layouts/page-skeleton';
import { UserTeamCardHeader } from '@/core/components/pages/teams/team/team-members-views/team-members-header';
import TeamMembersSkeleton from '@/core/components/common/skeleton/team-members-skeleton';
import { IssuesView } from '@/core/constants/config/constants';
import { TeamLiveSummarySkeleton } from './team-live-summary';

interface PublicTeamPageSkeletonProps {
	className?: string;
}

/** The public team toolbar while it loads: the team name and member count, then the column labels. */
function PublicTeamToolbarSkeleton() {
	return (
		<div>
			<div className="px-4">
				<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-3">
					<TeamLiveSummarySkeleton />
				</div>
			</div>
			<UserTeamCardHeader />
		</div>
	);
}

/**
 * The public team page while it loads. It keeps the public top bar (the join request instead of the member
 * controls), which `PageSkeletonFrame` cannot draw, so it sets the same frame up on `PageLayout` itself.
 */
export const PublicTeamPageSkeleton: FC<PublicTeamPageSkeletonProps> = ({ className }) => {
	const t = useTranslations();
	return (
		<PageLayout
			publicTeam
			title={t('common.LOADING')}
			breadcrumb={<BreadcrumbSkeleton />}
			mainHeaderSlot={<PublicTeamToolbarSkeleton />}
			className={className}
		>
			<div role="status" aria-live="polite" aria-busy="true" className="contents">
				<span className="sr-only">{t('common.LOADING')}</span>
				<TeamMembersSkeleton view={IssuesView.CARDS} />
			</div>
		</PageLayout>
	);
};

export default PublicTeamPageSkeleton;
