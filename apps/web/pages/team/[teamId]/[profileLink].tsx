import { usePublicOrganizationTeams } from '@app/hooks/features/usePublicOrganizationTeams';
import { Breadcrumb, Container } from 'lib/components';
import { PublicUserTeamCardHeader } from 'lib/features';
import { PublicTeamMembers } from 'lib/features/team/public/team-members';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';

import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Team = () => {
	const router = useRouter();
	const query = router.query;
	const { loadPublicTeamData } = usePublicOrganizationTeams();
	const { trans } = useTranslation('home');

	useEffect(() => {
		if (query && query?.teamId && query?.profileLink) {
			loadPublicTeamData(query?.profileLink as string, query?.teamId as string);
		}
	}, [query]);

	return (
		<MainLayout isPublic>
			<MainHeader>
				<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />

				{/* Header user card list */}
				<PublicUserTeamCardHeader />
			</MainHeader>

			<Container className="mb-10">
				<PublicTeamMembers />
			</Container>
		</MainLayout>
	);
};

export default Team;
