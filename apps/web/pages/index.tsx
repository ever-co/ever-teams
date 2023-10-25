import { useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';
import NoTeam from '@components/pages/main/no-team';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import { PeopleIcon } from 'lib/components/svgs';
import {
	AuthUserTaskInput,
	TeamInvitations,
	TeamMembers,
	Timer,
	UnverifiedEmail,
	UserTeamCardHeader
} from 'lib/features';
import { MainHeader, MainLayout } from 'lib/layout';
import { useTranslation } from 'react-i18next';

function MainPage() {
	const { t } = useTranslation();
	const { isTeamMember, isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const breadcrumb = [...t('pages.home.BREADCRUMB', { returnObjects: true }), activeTeam?.name || ''];

	return (
		<MainLayout>
			<MainHeader className="pb-1">
				<div className="flex items-start justify-between h-5">
					<div className="flex items-center gap-8">
						<PeopleIcon className="stroke-dark dark:stroke-[#6b7280] h-6 w-6" />
						<Breadcrumb paths={breadcrumb} className="text-sm" />
					</div>

					{/* <Collaborative /> */}
				</div>

				<UnverifiedEmail />
				<TeamInvitations />
			</MainHeader>

			<div className="sticky top-20 z-50 bg-white dark:bg-[#191A20] pt-5">
				<Container>
					{isTeamMember ? <TaskTimerSection isTrackingEnabled={isTrackingEnabled} /> : null}
					{/* Header user card list */}
					{isTeamMember ? <UserTeamCardHeader /> : null}
				</Container>

				{/* Divider */}
				<div className="h-0.5 bg-[#FFFFFF14]"></div>
			</div>

			<Container>{isTeamMember ? <TeamMembers /> : <NoTeam />}</Container>
		</MainLayout>
	);
}

function TaskTimerSection({ isTrackingEnabled }: { isTrackingEnabled: boolean }) {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex md:flex-row flex-col-reverse justify-between items-center py-4',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			{/* Task inputs */}
			<AuthUserTaskInput className="w-4/5 md:w-1/2 2xl:w-full " />

			{/* Timer  */}
			{isTrackingEnabled ? <Timer /> : null}
		</Card>
	);
}
export default withAuthentication(MainPage, { displayName: 'MainPage' });
