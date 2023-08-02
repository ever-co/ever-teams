import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import {
	AuthUserTaskInput,
	TeamInvitations,
	TeamMembers,
	Timer,
	UnverifiedEmail,
	UserTeamCardHeader,
} from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';
import { useOrganizationTeams } from '@app/hooks';
import NoTeam from '@components/pages/main/no-team';
import { PeopleIcon } from 'lib/components/svgs';

function MainPage() {
	const { trans } = useTranslation('home');
	const { isTeamMember, isTrackingEnabled } = useOrganizationTeams();

	return (
		<MainLayout>
			<MainHeader>
				<div className="flex items-center space-x-3">
					<PeopleIcon className="stroke-dark dark:stroke-[#6b7280] h-5 w-5" />
					<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
				</div>

				<UnverifiedEmail />

				<TeamInvitations />

				{isTeamMember ? (
					<TaskTimerSection isTrackingEnabled={isTrackingEnabled} />
				) : null}

				{/* Header user card list */}
				{isTeamMember ? <UserTeamCardHeader /> : null}
			</MainHeader>

			<Container className="mb-10">
				{isTeamMember ? <TeamMembers /> : <NoTeam />}
			</Container>
		</MainLayout>
	);
}

function TaskTimerSection({
	isTrackingEnabled,
}: {
	isTrackingEnabled: boolean;
}) {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex md:flex-row flex-col-reverse justify-between items-center mt-6',
				'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			{/* Task inputs */}
			<AuthUserTaskInput className="w-4/5 md:w-1/2 xl:w-full" />

			{/* Timer  */}
			{isTrackingEnabled ? <Timer /> : null}
		</Card>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
