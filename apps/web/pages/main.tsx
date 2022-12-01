import { useQuery } from '@app/hooks/useQuery';
import { tasksTimesheetStatisticsAPI } from '@app/services/client/api';
import { withAuthentication } from '@components/authenticator';
import { useEffect } from 'react';
import TeamMemberSection from '../components/home/team-member';
import { TimerTasksSection } from '../components/home/timer-tasks';
import { AppLayout } from '../components/layout';

const Main = () => {
	const { queryCall } = useQuery(tasksTimesheetStatisticsAPI);
	useEffect(() => {
		// queryCall().then((res) => {
		// 	console.log(res.data);
		// });
	}, []);

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
