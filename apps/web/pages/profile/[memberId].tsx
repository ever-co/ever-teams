import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { AppLayout } from '@components/layout';
import { useRouter } from 'next/router';
import Image from 'next/legacy/image';
import { useEffect, useState } from 'react';
import { Capitalize } from '@components/layout/header/profile';
import StatusDropdown from '@components/common/main/status-dropdown';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import Link from 'next/link';
import Timer from '@components/common/main/timer';
import TaskDetailCard from '@components/home/task-card';
import { withAuthentication } from '@components/authenticator';
import useAuthenticateUser from '@app/hooks/features/useAuthenticateUser';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { IUser } from '@app/interfaces/IUserData';
import { LeftArrow } from '@components/common/main/leftArrow';
import { RightArrow } from '@components/common/main/rightArrow';

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
	const [tab, setTab] = useState<'worked' | 'assigned' | 'unassigned'>(
		'worked'
	);

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
				<div className="my-[41px] text-[18px] text-[#ACB3BB] font-light flex justify-between items-center w-full">
					<div className="flex">
						<div
							className={`mr-10 ${
								tab === 'worked' && 'font-medium'
							} cursor-pointer`}
							onClick={() => setTab('worked')}
						>
							Worked
							{tab === 'worked' && (
								<div className="w-[65px] h-[2px] bg-[#ACB3BB]" />
							)}
						</div>
						<div
							className={`mr-10 ${
								tab === 'assigned' && 'font-medium'
							} cursor-pointer`}
							onClick={() => setTab('assigned')}
						>
							Assigned
							{tab === 'assigned' && (
								<div className="w-[78px] h-[2px] bg-[#ACB3BB]" />
							)}
						</div>
						<div
							className={`mr-10 ${
								tab === 'unassigned' && 'font-medium'
							} cursor-pointer`}
							onClick={() => setTab('unassigned')}
						>
							Unassigned
							{tab === 'unassigned' && (
								<div className="w-[98px] h-[2px] bg-[#ACB3BB]" />
							)}
						</div>
					</div>
					<div className="flex items-center">
						<div className="mr-4 h-full relative z-10">
							<StatusDropdown />
						</div>
						<button className="rounded-[7px] hover:bg-opacity-80 w-[140px] text-md h-[36px] bg-primary text-white dark:bg-[#1B1B1E] dark:text-[#ACB3BB] dark:border-white dark:hover:text-white">
							Assign Task
						</button>
					</div>
				</div>
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

function Header({ user }: { user: IUser | undefined }) {
	return (
		<div className="bg-[#FFFF] dark:bg-[#202023] mt-[100px] rounded-[20px] w-full flex items-center justify-between">
			<div className="ml-[16px] mb-[20px] flex flex-col space-y-[15px]">
				<div className="flex flex-row space-x-4">
					<div>
						<Link href="/main">
							<LeftArrow />
						</Link>
					</div>
					<div className="text-[14px] text-[#B1AEBC]">
						<Link href="/main">Dashboard</Link>
					</div>
					<div className="mt-1">
						<RightArrow />
					</div>
					<div className="text-[#282048] text-[14px] font-semibold">
						Task Profile
					</div>
				</div>
				<div className="flex items-center mb-[100px]">
					<div className="relative h-[137px] w-[137px]">
						{user?.imageUrl && (
							<Image
								src={user?.imageUrl}
								alt="User Icon"
								className="rounded-full h-full w-full z-20"
								layout="fill"
								objectFit="cover"
							/>
						)}

						<div className="absolute z-10 inset-0 w-full h-full shadow animate-pulse dark:divide-gray-700 dark:border-gray-700">
							<div className="w-full h-full rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
						</div>

						<div className="absolute z-30 rounded-full bg-white p-[1px] top-[100px] right-[5px]">
							<div className="bg-[#02C536] w-[22px] h-[22px] rounded-full"></div>
						</div>
					</div>
					<div className="ml-[24px]">
						<div className="text-[30px] text-[#1B005D] dark:text-[#FFFFFF] font-bold flex items-center ">
							<span className="flex items-center">
								{user?.firstName && Capitalize(user.firstName)}
								{user?.lastName && ' ' + Capitalize(user.lastName)}
							</span>
						</div>
						<div className="text-[#B0B5C7] flex items-center">
							<span className="flex items-center">{user?.email}</span>
						</div>
					</div>
				</div>
			</div>
			<div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
				<Timer />
			</div>
		</div>
	);
}

export default withAuthentication(Profile, 'ProfilePage');
