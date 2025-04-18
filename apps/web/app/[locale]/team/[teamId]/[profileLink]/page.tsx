'use client';

import { getActiveUserIdCookie } from '@app/helpers';
import { useRefreshIntervalV2 } from '@app/hooks';
import { usePublicOrganizationTeams } from '@app/hooks/features/usePublicOrganizationTeams';
import { publicState } from '@app/stores/public';
import { Breadcrumb, Container } from 'lib/components';
import { TeamMembersView, UnverifiedEmail, UserTeamCardHeader } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue } from 'jotai';

import { fullWidthState } from '@app/stores/fullWidth';
import { IssuesView } from '@app/constants';

const Team = () => {
	const router = useRouter();
	const params = useParams();

	const {
		loadPublicTeamData,
		loadPublicTeamMiscData,
		loading : teamsFetching,
		publicTeam: publicTeamData
	} = usePublicOrganizationTeams();
	const t = useTranslations();
	const [publicTeam, setPublic] = useAtom(publicState);
	const fullWidth = useAtomValue(fullWidthState);

	useEffect(() => {
		const userId = getActiveUserIdCookie();

		if (userId && publicTeamData && publicTeamData.members.find((member) => member.employee.userId === userId)) {
			router.replace('/');
		}
	}, [publicTeamData, router]);

	const loadData = useCallback(() => {
		if (params?.teamId && params?.profileLink) {
			loadPublicTeamData(params?.profileLink as string, params?.teamId as string).then((res: any) => {
				if (res?.data?.data?.status === 404) {
					notFound();
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
	}, [loadData]);

	useEffect(() => {
		loadMicsData();
	}, [loadMicsData]);

	useRefreshIntervalV2(loadData, 10 * 1000, true);
	useRefreshIntervalV2(loadMicsData, 30 * 1000, true);

	const breadcrumb = [...JSON.parse(t('pages.home.BREADCRUMB'))];

	return (
		<MainLayout publicTeam={publicTeam}>
			<MainHeader fullWidth={fullWidth}>
				<Breadcrumb paths={breadcrumb} className="text-sm" />

				<UnverifiedEmail />

				{/* Header user card list */}
				<UserTeamCardHeader />
			</MainHeader>

			{/* Divider */}
			<div className="h-0.5 bg-[#FFFFFF14]"></div>

			<Container fullWidth={fullWidth}>
				<TeamMembersView
					teamsFetching={teamsFetching}
					fullWidth={fullWidth}
					members={publicTeamData?.members || []}
					view={IssuesView.CARDS}
					blockViewMembers={[]}
					publicTeam={publicTeam}
				/>

				{/* <TeamMembers publicTeam={publicTeam} /> */}
			</Container>
		</MainLayout>
	);
};

export default Team;
