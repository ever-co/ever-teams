import { getActiveUserIdCookie } from '@app/helpers';
import { useRefreshInterval } from '@app/hooks';
import { usePublicOrganizationTeams } from '@app/hooks/features/usePublicOrganizationTeams';
import { publicState } from '@app/stores/public';
import { Breadcrumb, Container } from 'lib/components';
import { TeamMembers, UnverifiedEmail, UserTeamCardHeader } from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';

const Team = () => {
	const router = useRouter();
	const query = router.query;
	const { loadPublicTeamData, loadPublicTeamMiscData, publicTeam: publicTeamData } = usePublicOrganizationTeams();
	const { t } = useTranslation();
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

	return (
		<MainLayout publicTeam={publicTeam}>
			<MainHeader>
				<Breadcrumb paths={t('pages.home.BREADCRUMB', { returnObjects: true })} className="text-sm" />

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

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
	const { locale } = context;
	const translateProps = await serverSideTranslations(locale ?? 'en', ['default']);
	return {
		props: {
			...translateProps
		}
	};
};

export default Team;
