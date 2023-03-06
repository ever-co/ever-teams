import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import {
	AuthUserTaskInput,
	TeamMembers,
	Timer,
	UnverifiedEmail,
	UserTeamCardHeader,
} from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';
import { useOrganizationTeams } from '@app/hooks';
import NoTeam from '@components/pages/main/no-team';

function MainPage() {
	const { trans } = useTranslation('home');
	const { isTeamMember } = useOrganizationTeams();

	return (
		<MainLayout>
			<MainHeader>
				<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />

				<UnverifiedEmail />

				{ isTeamMember ? <TaskTimerSection /> : null }

				{/* Header user card list */}
				<UserTeamCardHeader />
			</MainHeader>

			<Container className="mb-10">
				{isTeamMember  ? <TeamMembers /> : <NoTeam />} 
			</Container>
		</MainLayout>
	);
}

function TaskTimerSection() {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row flex-col-reverse justify-between items-center mt-6',
				'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			{/* Task inputs */}
			<AuthUserTaskInput />

			{/* Timer  */}
			<Timer />
		</Card>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
