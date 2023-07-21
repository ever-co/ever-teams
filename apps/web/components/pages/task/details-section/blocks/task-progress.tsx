import { detailedTaskState } from '@app/stores';
import { TaskProgressBar } from 'lib/features';
import { useRecoilState } from 'recoil';
import TaskRow from '../components/task-row';
import { Disclosure } from '@headlessui/react';
import { useEffect, useState } from 'react';
import ProfileInfoWithTime from '../components/profile-info-with-time';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import {
	useAuthenticateUser,
	useOrganizationTeams,
	// useTeamMemberCard,
	//useTaskStatistics,
} from '@app/hooks';
import { useTranslation } from 'lib/i18n';
import { secondsToTime } from '@app/helpers';
import { OT_Member } from '@app/interfaces';
import { ITasksTimesheet, ITime } from '@app/interfaces';

const TaskProgress = () => {
	const [task] = useRecoilState(detailedTaskState);
	const { user } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const { trans } = useTranslation('taskDetails');

	const [userTotalTime, setUserTotalTime] = useState<ITime>({
		hours: 0,
		minutes: 0,
	});
	const [userTotalTimeToday, setUserTotalTimeToday] = useState<ITime>({
		hours: 0,
		minutes: 0,
	});
	const [timeRemaining, setTimeRemaining] = useState<ITime>({
		hours: 0,
		minutes: 0,
	});
	const [groupTotalTime, setGroupTotalTime] = useState<ITime>({
		hours: 0,
		minutes: 0,
	});
	const [numMembersToShow, setNumMembersToShow] = useState<number>(5);

	const members = activeTeam?.members || [];

	const currentUser: OT_Member | undefined = members.find((m) => {
		return m.employee.user?.id === user?.id;
	});

	// const memberInfo = useTeamMemberCard(currentUser);

	useEffect(() => {
		const userTotalTimeOnTask = (): void => {
			const totalOnTaskInSeconds: number =
				currentUser?.totalWorkedTasks.find((object) => object.id === task?.id)
					?.duration || 0;

			const { h, m } = secondsToTime(totalOnTaskInSeconds);

			setUserTotalTime({ hours: h, minutes: m });
		};
		userTotalTimeOnTask();
	}, [currentUser?.totalWorkedTasks, task?.id]);

	useEffect(() => {
		const userTotalTimeOnTaskToday = (): void => {
			const totalOnTaskInSeconds: number =
				currentUser?.totalTodayTasks.find((object) => object.id === task?.id)
					?.duration || 0;

			const { h, m } = secondsToTime(totalOnTaskInSeconds);

			setUserTotalTimeToday({ hours: h, minutes: m });
		};
		userTotalTimeOnTaskToday();
	}, [currentUser?.totalTodayTasks, task?.id]);

	useEffect(() => {
		const matchingMembers: OT_Member[] | undefined = activeTeam?.members.filter(
			(member) =>
				task?.members.some((taskMember) => taskMember.id === member.employeeId)
		);

		const usersTaskArray: ITasksTimesheet[] | undefined = matchingMembers
			?.flatMap((obj) => obj.totalWorkedTasks)
			.filter((taskObj) => taskObj.id === task?.id);

		const usersTotalTimeInSeconds: number | undefined = usersTaskArray?.reduce(
			(totalDuration, item) => totalDuration + item.duration,
			0
		);

		const usersTotalTime: number =
			usersTotalTimeInSeconds === null || usersTotalTimeInSeconds === undefined
				? 0
				: usersTotalTimeInSeconds;

		const timeObj = secondsToTime(usersTotalTime);
		const { h: hoursTotal, m: minutesTotal } = timeObj;
		setGroupTotalTime({ hours: hoursTotal, minutes: minutesTotal });

		const remainingTime: number =
			task?.estimate === null ||
			task?.estimate === 0 ||
			task?.estimate === undefined ||
			usersTotalTimeInSeconds === undefined
				? 0
				: task?.estimate - usersTotalTimeInSeconds;

		const { h, m } = secondsToTime(remainingTime);
		setTimeRemaining({ hours: h, minutes: m });
		if (remainingTime <= 0) {
			setTimeRemaining({ hours: 0, minutes: 0 });
		}
	}, [activeTeam?.members, task?.members, task?.id, task?.estimate]);

	return (
		<section className="flex flex-col p-[15px]">
			<TaskRow labelTitle={trans.PROGRESS} wrapperClassName="mb-3">
				<TaskProgressBar
					task={task}
					isAuthUser={true}
					activeAuthTask={true}
					showPercents={true}
					// memberInfo={memberInfo}
				/>
			</TaskRow>
			<TaskRow labelTitle={trans.TOTAL_TIME} wrapperClassName="mb-3">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{userTotalTime.hours}h : {userTotalTime?.minutes}m
				</div>
			</TaskRow>
			<TaskRow labelTitle={trans.TIME_TODAY} wrapperClassName="mb-3">
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{userTotalTimeToday.hours}h : {userTotalTimeToday.minutes}m
				</div>
			</TaskRow>
			<TaskRow labelTitle={trans.TOTAL_GROUP_TIME} wrapperClassName="mb-3">
				<Disclosure>
					{({ open }) => (
						<div className="flex flex-col w-full">
							{task?.members && task?.members.length > 1 ? (
								<Disclosure.Button className="flex justify-between items-center w-full">
									<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
										{groupTotalTime.hours}h : {groupTotalTime.minutes}m
									</div>

									<ChevronUpIcon
										className={clsx(
											open ? 'rotate-180 transform' : '',
											'h-5 w-5 text-[#292D32] dark:text-white'
										)}
									/>
								</Disclosure.Button>
							) : (
								<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
									{groupTotalTime.hours}h : {groupTotalTime.minutes}m
								</div>
							)}
							{task?.members && task?.members.length && (
								<Disclosure.Panel>
									<IndividualMembersTotalTime
										numMembersToShow={numMembersToShow}
									/>
									{task?.members?.length &&
										task?.members?.length - 1 >= numMembersToShow && (
											<div className="w-full flex justify-end my-1 text-[rgba(40,32,72,0.5)]">
												<button
													onClick={() =>
														setNumMembersToShow((prev) => prev + 5)
													}
													className="text-xs"
												>
													Show More
												</button>
											</div>
										)}
								</Disclosure.Panel>
							)}
						</div>
					)}
				</Disclosure>
			</TaskRow>
			<TaskRow labelTitle={trans.TIME_REMAINING}>
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{timeRemaining.hours}h : {timeRemaining.minutes}m
				</div>
			</TaskRow>
		</section>
	);
};

export default TaskProgress;

const IndividualMembersTotalTime = ({ numMembersToShow }: any) => {
	const [task] = useRecoilState(detailedTaskState);
	const { activeTeam } = useOrganizationTeams();

	const matchingMembers: OT_Member[] | undefined = activeTeam?.members.filter(
		(member) =>
			task?.members.some((taskMember) => taskMember.id === member.employeeId)
	);

	const findUserTotalWorked = (user: any, id: any) => {
		return user.totalWorkedTasks.find((task: any) => task.id === id)?.duration;
	};

	return (
		<>
			{matchingMembers?.slice(0, numMembersToShow)?.map((member) => {
				const taskDurationInSeconds = findUserTotalWorked(member, task?.id)
					? findUserTotalWorked(member, task?.id)
					: 0;

				const { h, m } = secondsToTime(taskDurationInSeconds);

				const time = `${h}h : ${m}m`;

				return (
					<div key={member.id} className="mt-2.5">
						<ProfileInfoWithTime
							key={member.id}
							profilePicSrc={member?.employee.user?.imageUrl}
							names={member.employee?.fullName}
							time={time}
						/>
					</div>
				);
			})}
		</>
	);
};
