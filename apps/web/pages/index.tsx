import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, Container } from 'lib/components';
import {
	AuthUserTaskInput,
	TeamMembers,
	Timer,
	UserTeamCardHeader,
} from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';

function MainPage() {
	const { trans } = useTranslation('home');

	return (
		<MainLayout>
			<MainHeader>
				<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
				<TaskTimerSection />

				{/* Header user card list */}
				<UserTeamCardHeader />
			</MainHeader>

			<Container className="mb-10">
				<TeamMembers />
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
