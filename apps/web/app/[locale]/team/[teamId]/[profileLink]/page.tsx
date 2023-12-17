'use client';

import { getActiveUserIdCookie } from '@app/helpers';
import { useRefreshInterval } from '@app/hooks';
import { usePublicOrganizationTeams } from '@app/hooks/features/usePublicOrganizationTeams';
import { publicState } from '@app/stores/public';
import { Breadcrumb, Container } from 'lib/components';
import { TeamMembers, UnverifiedEmail, UserTeamCardHeader } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRecoilState } from 'recoil';

const Team = () => {
	const router = useRouter();
	const query = router.query;
	const { loadPublicTeamData, loadPublicTeamMiscData, publicTeam: publicTeamData } = usePublicOrganizationTeams();
	const t = useTranslations();
	const [publicTeam, setPublic] = useRecoilState(publicState);

	useEffect(() => {
		const userId = getActiveUserIdCookie();

		if (userId && publicTeamData && publicTeamData.members.find((member) => member.employee.userId === userId)) {
			router.replace('/');
		}
	}, [publicTeamData, router]);

	const loadData = useCallback(() => {
		if (query && query.teamId && query.profileLink) {
			loadPublicTeamData(query.profileLink as string, query.teamId as string).then((res) => {
				if (res?.data?.data?.status === 404) {
					router.replace('/404');
				}
			});
			setPublic(true);
		}
	}, [loadPublicTeamData, query, router, setPublic]);
	const loadMicsData = useCallback(() => {
		if (query && query.teamId && query.profileLink) {
			loadPublicTeamMiscData(query.profileLink as string, query.teamId as string);
		}
	}, [loadPublicTeamMiscData, query]);

	useEffect(() => {
		loadData();
	}, [loadData]);
	useEffect(() => {
		loadMicsData();
	}, [loadMicsData]);

	useRefreshInterval(loadData, 10 * 1000, true);
	useRefreshInterval(loadMicsData, 30 * 1000, true);

	const breadcrumb = [...JSON.parse(t('pages.home.BREADCRUMB'))];
	return (
		<MainLayout publicTeam={publicTeam}>
			<MainHeader>
				<Breadcrumb paths={breadcrumb} className="text-sm" />

				<UnverifiedEmail />

				{/* Header user card list */}
				<UserTeamCardHeader />
			</MainHeader>

			{/* Divider */}
			<div className="h-0.5 bg-[#FFFFFF14]"></div>

			<Container>
				<TeamMembers publicTeam={publicTeam} />
			</Container>
		</MainLayout>
	);
};

export default Team;
