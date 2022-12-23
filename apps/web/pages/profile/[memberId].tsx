import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { AppLayout } from '@components/layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import TaskDetailCard from '@components/shared/tasks/task-card';
import { withAuthentication } from '@components/app/authenticator';
import useAuthenticateUser from '@app/hooks/features/useAuthenticateUser';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { Header } from '@components/pages/profile/header';
import {
	IProfileTabs,
	ProfileTabs,
} from '@components/pages/profile/profile-tabs';

const Profile = () => {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, tasks } = useTeamTasks();
	const { user: auth } = useAuthenticateUser();
	const { getAllTasksStatsData } = useTaskStatistics();
	const router = useRouter();
	const { memberId } = router.query;
	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => {
		return m.employee.userId === memberId;
	});
	const user =
		auth?.employee.id === memberId ? auth : currentUser?.employee.user;

	const [tab, setTab] = useState<IProfileTabs>('worked');

	const otherTasks = activeTeamTask
		? tasks.filter((t) => t.id !== activeTeamTask.id)
		: tasks;

	useEffect(() => {
		getAllTasksStatsData();
	}, [getAllTasksStatsData]);

	return (
		<AppLayout>
			<Header user={user} />
			<div className="relative z-10">
				<ProfileTabs tab={tab} setTab={setTab} />
				<div className="flex items-center justify-between">
					<div className="text-[#ACB3BB] text-[16px] w-[35px] font-normal">
						Now
					</div>
					<div className="bg-[#D7E1EB] dark:bg-gray-600 w-full h-[1px] mx-[10px]" />
					<div className="text-[#ACB3BB] text-[16px] w-[164px] font-normal">
						Total time: 03:31
					</div>
				</div>
				<div className="relative">
					{activeTeamTask && (
						<TaskDetailCard now={true} task={activeTeamTask} current="00:00" />
					)}
				</div>
				<div className="flex items-center justify-between mt-[40px]">
					<div className="text-[#ACB3BB] text-[16px] w-[130px] font-normal">
						Last 24 hours
					</div>
					<div className="bg-[#D7E1EB] dark:bg-gray-600 w-full h-[1px] mx-[10px]" />
					<div className="text-[#ACB3BB] text-[16px] w-[164px] font-normal">
						Total time: 03:31
					</div>
				</div>
				{otherTasks.map((ta, i) => (
					<div key={ta.id} className="relative" style={{ zIndex: `-${i + 1}` }}>
						<TaskDetailCard task={ta} current="00:00" />
					</div>
				))}
			</div>
		</AppLayout>
	);
};

export default withAuthentication(Profile, { displayName: 'ProfilePage' });
