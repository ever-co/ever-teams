import { withAuthentication } from '@components/authenticator';
import TeamMemberSection from '../components/home/team-member';
import { TimerTasksSection } from '../components/home/timer-tasks';
import { AppLayout } from '../components/layout';

const Main = () => {
	return (
		<div className="bg-[#F9FAFB] dark:bg-[#18181B]">
			<AppLayout>
				<div className="">
					<TimerTasksSection />
					<TeamMemberSection />
				</div>
			</AppLayout>
		</div>
	);
};

export default withAuthentication(Main, 'MainPage');
