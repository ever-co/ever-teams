import { detailedTaskState } from '@app/stores';
import { TaskProgressBar } from 'lib/features';
import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { Disclosure } from '@headlessui/react';
import { useEffect, useState } from 'react';
import ProfileInfoWithTime from '../components/profile-info-with-time';
import { IEmployee } from '@app/interfaces';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import {
	useAuthenticateUser,
	useOrganizationTeams,
	useTeamMemberCard,
	//useTaskStatistics,
} from '@app/hooks';
//import { secondsToTime } from '@app/helpers';
//import { useRecoilValue } from 'recoil';
//import { timerSecondsState } from '@app/stores';

const TaskProgress = () => {
	const [task] = useRecoilState(detailedTaskState);
	const [dummyProfiles, setDummyProfiles] = useState<IEmployee[]>([]);
	const { user } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	//const seconds = useRecoilValue(timerSecondsState);
	//const { activeTaskTotalStat, addSeconds } = useTaskStatistics(seconds);

	const members = activeTeam?.members || [];

	const currentUser = members.find((m) => {
		return m.employee.user?.id === user?.id;
	});

	const memberInfo = useTeamMemberCard(currentUser);

	/*const TotalWork = () => {
		if (memberInfo.isAuthUser) {
			const { h, m } = secondsToTime(
				//returns empty array
				((currentUser?.totalTodayTasks &&
					currentUser?.totalTodayTasks.reduce(
						(previousValue, currentValue) =>
							previousValue + currentValue.duration,
						0
					)) ||
					activeTaskTotalStat?.duration ||
					0) + addSeconds
			);
			return (

					<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
						{h}h : {m}m
					</div>

			);
		}
	};*/

	useEffect(() => {
		if (task && task?.members) {
			const profiles = Array.isArray(task?.members) ? [...task.members] : [];

			if (profiles) {
				profiles.push(profiles[0]);
				profiles.push(profiles[0]);
				profiles.push(profiles[0]);
			}

			setDummyProfiles(profiles);
		}
	}, [task]);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle="Progress" wrapperClassName="mb-3">
				<TaskProgressBar
					task={task}
					isAuthUser={true}
					activeAuthTask={true}
					showPercents={true}
					memberInfo={memberInfo}
				/>
			</TaskRow>
			<TaskRow labelTitle="Total Time" wrapperClassName="mb-3">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					2h : 12m
				</div>
			</TaskRow>
			<TaskRow labelTitle="Time Today" wrapperClassName="mb-3">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					1h : 10m
				</div>
			</TaskRow>
			<TaskRow labelTitle="Total Group Time" wrapperClassName="mb-3">
				<Disclosure>
					{({ open }) => (
						<div className="flex flex-col w-full">
							<Disclosure.Button className="flex justify-between items-center w-full">
								<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
									9h : 11m
								</div>
								<ChevronUpIcon
									className={clsx(
										open ? 'rotate-180 transform' : '',
										'h-5 w-5 text-[#292D32]'
									)}
								/>
							</Disclosure.Button>
							<Disclosure.Panel>
								{dummyProfiles?.map((profile) => (
									<div key={profile.id} className="mt-2.5">
										<ProfileInfoWithTime
											profilePicSrc={profile.user?.imageUrl}
											names={profile.fullName}
											time=" 3h : 4m"
										/>
									</div>
								))}
							</Disclosure.Panel>
						</div>
					)}
				</Disclosure>
			</TaskRow>
			<TaskRow labelTitle="Time Remains">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					2h : 12m
				</div>
			</TaskRow>
		</section>
	);
};

export default TaskProgress;
