import { withAuthentication } from '@components/app/authenticator';
import TeamMemberSection from '@components/pages/main/team-member';
import { TimerTasksSection } from '@components/pages/main/timer-tasks';
import { AppLayout } from '@components/layout';

const Main = () => {
	return (
		<AppLayout>
			<TimerTasksSection />
			<TeamMemberSection />
		</AppLayout>
	);
};

export default withAuthentication(Main, 'MainPage');
