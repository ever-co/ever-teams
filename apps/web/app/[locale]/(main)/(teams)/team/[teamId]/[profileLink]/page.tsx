'use client';
import { getActiveUserIdCookie } from '@/core/lib/helpers/index';

import { publicState } from '@/core/stores/common/public';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtom } from 'jotai';

import { IssuesView } from '@/core/constants/config/constants';
import { usePublicOrganizationTeams } from '@/core/hooks/organizations';
import { useRefreshIntervalV2 } from '@/core/hooks/common';
import { UserTeamCardHeader } from '@/core/components/pages/teams/team/team-members-views/team-members-header';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { UnverifiedEmail } from '@/core/components/common/unverified-email';
import { TeamMembersView } from '@/core/components/pages/teams/team/team-members';
import { PublicTeamPageSkeleton } from '@/core/components/pages/teams/team/public-team-page-skeleton';
import { Users } from '@/core/components/icons';
import { EntityTile } from '@/core/components/common/entity-tile';
import { teamImageOf } from '@/core/components/projects/project-cells';

const NOT_FOUND_STATUS = 404;

/** Gauzy answers an unknown or disabled public link with a 404 payload, not an error. */
function isMissingPublicTeam(response: unknown) {
	const isObject = typeof response === 'object' && response !== null;
	if (!isObject) {
		return false;
	}
	const status = (response as { status?: unknown }).status;
	return status === NOT_FOUND_STATUS;
}

const Team = () => {
	const router = useRouter();
	const params = useParams();

	const {
		loadPublicTeamData,
		loadPublicTeamMiscData,
		loading: teamsFetching,
		publicTeam: publicTeamData
	} = usePublicOrganizationTeams();
	const t = useTranslations();
	const [publicTeam, setPublic] = useAtom(publicState);
	const [isMissingTeam, setIsMissingTeam] = useState(false);

	useEffect(() => {
		const userId = getActiveUserIdCookie();

		if (userId && publicTeamData && publicTeamData.members?.find((member) => member.employee?.userId === userId)) {
			router.replace('/');
		}
	}, [publicTeamData, router]);

	const loadData = useCallback(() => {
		if (params?.teamId && params?.profileLink) {
			loadPublicTeamData(params?.profileLink as string, params?.teamId as string).then((response) => {
				if (isMissingPublicTeam(response)) {
					setIsMissingTeam(true);
				}
			});
			setPublic(true);
		}
	}, [loadPublicTeamData, setPublic, params?.teamId, params?.profileLink]);

	const loadMicsData = useCallback(() => {
		if (params?.teamId && params?.profileLink) {
			loadPublicTeamMiscData(params?.profileLink as string, params?.teamId as string);
		}
	}, [loadPublicTeamMiscData, params?.teamId, params?.profileLink]);

	useEffect(() => {
		loadData();
		return () => setPublic(false);
	}, [loadData]);

	useEffect(() => {
		loadMicsData();
	}, [loadMicsData]);

	useRefreshIntervalV2(loadData, 10 * 1000, true);
	useRefreshIntervalV2(loadMicsData, 30 * 1000, true);

	const breadcrumb = [...JSON.parse(t('pages.home.BREADCRUMB'))];

	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (isMissingTeam) {
		notFound();
	}

	if (teamsFetching || !publicTeamData) {
		return <PublicTeamPageSkeleton />;
	}

	const memberCount = publicTeamData.members?.length;
	const hasMemberCount = typeof memberCount === 'number';

	return (
		<PageLayout
			publicTeam={publicTeam}
			breadcrumb={
				<div className="flex gap-2 items-center min-w-0">
					<Users className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumb} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<div>
					<div className="px-4">
						<div className="flex flex-wrap gap-y-1 gap-x-3 items-center py-3 min-w-0">
							<EntityTile
								name={publicTeamData.name}
								color={publicTeamData.color}
								imageUrl={teamImageOf(publicTeamData)}
								className="size-6 text-[10px]"
							/>
							<h1 className="text-lg font-semibold truncate">{publicTeamData.name}</h1>
							{hasMemberCount && (
								<span className="text-xs tabular-nums text-muted-foreground">
									{t('pages.home.MEMBER_COUNT', { count: memberCount })}
								</span>
							)}
							<span className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs font-medium text-muted-foreground">
								{t('profile.page.PUBLIC_VIEW')}
							</span>
						</div>

						<UnverifiedEmail />
					</div>

					{/* Header user card list */}
					<UserTeamCardHeader />
				</div>
			}
		>
			<TeamMembersView
				teamsFetching={teamsFetching}
				members={publicTeamData?.members || []}
				view={IssuesView.CARDS}
				blockViewMembers={[]}
				publicTeam={publicTeam}
			/>

			{/* <TeamMembers publicTeam={publicTeam} /> */}
		</PageLayout>
	);
};

export default Team;
