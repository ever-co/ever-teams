import { useOrganizationTeams } from '@app/hooks/useOrganizationTeams';
import { AppLayout } from '@components/layout';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useState } from 'react';
import { Capitalize } from '@components/layout/header/profile';
import StatusDropdown from '@components/common/main/status-dropdown';
import { useTeamTasks } from '@app/hooks/useTeamTasks';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Timer from '@components/common/main/timer';
import ProfileCard from '@components/home/profile-card';
import {
	getAuthenticationProps,
	withAuthentication,
} from '@components/authenticator';
import { GetServerSideProps } from 'next';

const Profile = () => {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, tasks } = useTeamTasks();
	const router = useRouter();
	const { memberId } = router.query;
	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => {
		return m.employee.userId === memberId;
	});
	const user = currentUser?.employee.user;
	const [tab, setTab] = useState<'worked' | 'assigned' | 'unassigned'>(
		'worked'
	);

	const otherTasks = activeTeamTask
		? tasks.filter((t) => t.id !== activeTeamTask.id)
		: tasks;

	return (
		<div className="bg-[#F9FAFB] dark:bg-[#18181B]">
			<AppLayout>
				<div className="bg-[#FFFF] dark:bg-[#202023] mt-[100px] rounded-[20px] w-full flex items-center justify-between">
					<div className="ml-[16px] mb-[20px] flex flex-col space-y-[15px]">
						<div className="w-[171px] bg-[#ACB3BB] mt-[20px] mb-2 text-[18px] text-[#FFFFFF] rounded-[8px] px-[17px] py-[5px] flex items-center cursor-pointer hover:opacity-80">
							<ChevronLeftIcon className="w-[15px] mr-[10px]" />
							<Link href="/main">Back to Team</Link>
						</div>
						<div className="flex items-center mb-[100px]">
							<div className="relative">
								<Image
									src={user?.imageUrl || ''}
									alt="User Icon"
									width={137}
									height={137}
									className="rounded-full "
								/>

								<div className="absolute rounded-full bg-white p-[1px] top-[8px] right-[1px] flex items-center justify-center cursor-pointer">
									<Image
										src="/assets/png/edit.png"
										width={26}
										height={26}
										alt="edit icon"
									/>
								</div>
								<div className="absolute rounded-full bg-white p-[1px] top-[100px] right-[5px]">
									<div className="bg-[#02C536] w-[22px] h-[22px] rounded-full"></div>
								</div>
							</div>
							<div className="ml-[24px]">
								<div className="text-[30px] text-[#1B005D] dark:text-[#FFFFFF] font-bold flex items-center ">
									<span className="flex items-center">
										{user?.firstName && Capitalize(user.firstName)}
										{user?.lastName && ' ' + Capitalize(user.lastName)}
									</span>
									<span className="ml-[15px] flex items-center cursor-pointer">
										<Image
											src="/assets/png/edit.png"
											width={26}
											height={26}
											alt="edit icon"
										/>
									</span>
								</div>
								<div className="text-[#B0B5C7] flex items-center">
									<span className="flex items-center">{user?.email}</span>
									<span className="ml-[15px] flex items-center cursor-pointer">
										<Image
											src="/assets/png/edit.png"
											width={26}
											height={26}
											alt="edit icon"
										/>
									</span>
								</div>
							</div>
						</div>
					</div>
					<div className="flex justify-center items-center space-x-[27px] mr-[27px] w-1/2 ml-[48px]">
						<Timer />
					</div>
				</div>

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
						<div className="mr-4 h-full">
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
				<div>
					{activeTeamTask && (
						<ProfileCard now={true} task={activeTeamTask} current="00:00" />
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
				{otherTasks.map((ta) => (
					<div key={ta.id}>
						<ProfileCard task={ta} current="00:00" />
					</div>
				))}
			</AppLayout>
		</div>
	);
};

export default withAuthentication(Profile, 'ProfilePage');

export const getServerSideProps: GetServerSideProps = async (context) => {
	return {
		props: {
			...getAuthenticationProps(context),
		},
	};
};
