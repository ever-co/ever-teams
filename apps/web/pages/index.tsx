import { withAuthentication } from '@components/app/authenticator';
import TeamMemberSection from '../components/home/team-member';
import { TimerTasksSection } from '../components/home/timer-tasks';
import { AppLayout } from '../components/layout';

const Main = () => {
	return (
		<AppLayout>
			<TimerTasksSection />
			<TeamMemberSection />
		</AppLayout>
	);
};

export default withAuthentication(Main, 'MainPage');
