'use client';

import { getActiveUserIdCookie } from '@app/helpers';
import { useRefreshInterval } from '@app/hooks';
import { usePublicOrganizationTeams } from '@app/hooks/features/usePublicOrganizationTeams';
import { publicState } from '@app/stores/public';
import { Breadcrumb, Container } from 'lib/components';
import { TeamMembers, UnverifiedEmail, UserTeamCardHeader } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRecoilState } from 'recoil';

const Team = () => {
	const router = useRouter();
	const params = useParams();

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
		if (params?.teamId && params?.profileLink) {
			loadPublicTeamData(params?.profileLink as string, params?.teamId as string).then((res) => {
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
