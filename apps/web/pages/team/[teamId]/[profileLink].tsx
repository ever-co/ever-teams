import { getActiveUserIdCookie } from '@app/helpers';
import { usePublicOrganizationTeams } from '@app/hooks/features/usePublicOrganizationTeams';
import { publicState } from '@app/stores/public';
import { Breadcrumb, Container } from 'lib/components';
import { TeamMembers, UnverifiedEmail, UserTeamCardHeader } from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

const Team = () => {
	const router = useRouter();
	const query = router.query;
	const { loadPublicTeamData, publicTeam: publicTeamData } =
		usePublicOrganizationTeams();
	const { trans } = useTranslation('home');
	const [publicTeam, setPublic] = useRecoilState(publicState);

	useEffect(() => {
		const userId = getActiveUserIdCookie();

		if (
			userId &&
			publicTeamData &&
			publicTeamData.members.find((member) => member.employee.userId === userId)
		) {
			router.replace('/');
		}
	}, [publicTeamData, router]);

	useEffect(() => {
		if (query && query.teamId && query.profileLink) {
			loadPublicTeamData(
				query.profileLink as string,
				query.teamId as string
			).then((res) => {
				if (res?.data?.data?.status === 404) {
					router.replace('/404');
				}
			});
			setPublic(true);
		}
	}, [loadPublicTeamData, query, router, setPublic]);

	return (
		<MainLayout publicTeam={publicTeam}>
			<MainHeader>
				<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />

				<UnverifiedEmail />

				{/* Header user card list */}
				<UserTeamCardHeader />
			</MainHeader>

			<Container className="mb-10">
				<TeamMembers publicTeam={publicTeam} />
			</Container>
		</MainLayout>
	);
};

export default Team;
