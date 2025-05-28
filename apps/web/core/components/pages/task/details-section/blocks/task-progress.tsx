import { detailedTaskState } from '@/core/stores';
import { useAtom } from 'jotai';
import TaskRow from '../components/task-row';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useCallback, useEffect, useState } from 'react';
import ProfileInfoWithTime from '../components/profile-info-with-time';
import { useAuthenticateUser, useOrganizationTeams } from '@/core/hooks';
import { secondsToTime } from '@/core/lib/helpers/index';
import { ITime, IOrganizationTeamMember } from '@/core/types/interfaces/to-review';
import { ChevronDownIcon, ChevronUpIcon } from 'assets/svg';
import { useTranslations } from 'next-intl';
import { TaskProgressBar } from '@/core/components/tasks/task-progress-bar';
import { ITasksStatistics } from '@/core/types/interfaces/task/ITask';

const TaskProgress = () => {
	const [task] = useAtom(detailedTaskState);
	const { user } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const t = useTranslations();

	const [userTotalTime, setUserTotalTime] = useState<ITime>({
		hours: 0,
		minutes: 0
	});
	const [userTotalTimeToday, setUserTotalTimeToday] = useState<ITime>({
		hours: 0,
		minutes: 0
	});
	const [timeRemaining, setTimeRemaining] = useState<ITime>({
		hours: 0,
		minutes: 0
	});
	const [groupTotalTime, setGroupTotalTime] = useState<ITime>({
		hours: 0,
		minutes: 0
	});
	const [numMembersToShow, setNumMembersToShow] = useState<number>(5);

	const members = activeTeam?.members || [];

	const currentUser: IOrganizationTeamMember | undefined = members.find((m) => {
		return m.employee.user?.id === user?.id;
	});

	// const memberInfo = useTeamMemberCard(currentUser);

	const userTotalTimeOnTask = useCallback((): void => {
		const totalOnTaskInSeconds: number =
			currentUser?.totalWorkedTasks?.find((object) => object.id === task?.id)?.duration || 0;

		const { h, m } = secondsToTime(totalOnTaskInSeconds);

		setUserTotalTime({ hours: h, minutes: m });
	}, [currentUser?.totalWorkedTasks, task?.id]);

	useEffect(() => {
		userTotalTimeOnTask();
	}, [userTotalTimeOnTask]);

	const userTotalTimeOnTaskToday = useCallback((): void => {
		const totalOnTaskInSeconds: number =
			currentUser?.totalTodayTasks?.find((object) => object.id === task?.id)?.duration || 0;

		const { h, m } = secondsToTime(totalOnTaskInSeconds);

		setUserTotalTimeToday({ hours: h, minutes: m });
	}, [currentUser?.totalTodayTasks, task?.id]);

	useEffect(() => {
		userTotalTimeOnTaskToday();
	}, [userTotalTimeOnTaskToday]);

	useEffect(() => {
		const matchingMembers: IOrganizationTeamMember[] | undefined = activeTeam?.members.filter((member) =>
			task?.members.some((taskMember) => taskMember.id === member.employeeId)
		);

		const usersTaskArray: ITasksStatistics[] | undefined = matchingMembers
			?.flatMap((obj) => obj.totalWorkedTasks)
			.filter((taskObj) => taskObj?.id === task?.id);

		const usersTotalTimeInSeconds: number | undefined = usersTaskArray?.reduce(
			(totalDuration, item) => totalDuration + (item.duration ?? 0),
			0
		);

		const usersTotalTime: number =
			usersTotalTimeInSeconds === null || usersTotalTimeInSeconds === undefined ? 0 : usersTotalTimeInSeconds;

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
		<section className="flex flex-col gap-4 p-[0.9375rem]">
			<TaskRow labelTitle={t('pages.taskDetails.PROGRESS')}>
				<TaskProgressBar
					task={task}
					isAuthUser={true}
					activeAuthTask={true}
					showPercents={true}
					// memberInfo={memberInfo}
				/>
			</TaskRow>
			<TaskRow labelTitle={t('pages.taskDetails.TOTAL_TIME')}>
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{userTotalTime.hours}h : {userTotalTime.minutes}m
				</div>
			</TaskRow>
			<TaskRow labelTitle={t('pages.taskDetails.TIME_TODAY')}>
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{userTotalTimeToday.hours}h : {userTotalTimeToday.minutes}m
				</div>
			</TaskRow>
			<TaskRow labelTitle={t('pages.taskDetails.TOTAL_GROUP_TIME')}>
				<Disclosure>
					{({ open }) => (
						<div className="flex flex-col w-full mt-[0.1875rem]">
							{task?.members && task?.members.length > 1 ? (
								<DisclosureButton className="flex items-center justify-between w-full">
									<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
										{groupTotalTime.hours}h : {groupTotalTime.minutes}m
									</div>

									{open ? (
										<ChevronUpIcon className="text-[#292D32] dark:text-white w-4 h-4" />
									) : (
										<ChevronDownIcon className="text-[#292D32] dark:text-white w-4 h-4" />
									)}
								</DisclosureButton>
							) : (
								<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
									{groupTotalTime.hours}h : {groupTotalTime.minutes}m
								</div>
							)}
							{task?.members && task?.members.length > 0 && (
								<DisclosurePanel>
									<IndividualMembersTotalTime numMembersToShow={numMembersToShow} />
									{task?.members?.length > 0 && task?.members?.length - 1 >= numMembersToShow && (
										<div className="w-full flex justify-end my-1 text-[rgba(40,32,72,0.5)]">
											<button
												onClick={() => setNumMembersToShow((prev) => prev + 5)}
												className="text-xs"
											>
												{t('common.SHOW_MORE')}
											</button>
										</div>
									)}
								</DisclosurePanel>
							)}
						</div>
					)}
				</Disclosure>
			</TaskRow>
			<TaskRow labelTitle={t('pages.taskDetails.TIME_REMAINING')}>
				<div className="not-italic font-semibold text-xs leading-[140%] tracking-[-0.02em] text-[#282048] dark:text-white">
					{timeRemaining.hours}h : {timeRemaining.minutes}m
				</div>
			</TaskRow>
		</section>
	);
};

export default TaskProgress;

const IndividualMembersTotalTime = ({ numMembersToShow }: { numMembersToShow: number }) => {
	const [task] = useAtom(detailedTaskState);
	const { activeTeam } = useOrganizationTeams();

	const matchingMembers: IOrganizationTeamMember[] | undefined = activeTeam?.members.filter((member) =>
		task?.members.some((taskMember) => taskMember.id === member.employeeId)
	);

	const findUserTotalWorked = (user: IOrganizationTeamMember, id: string | undefined) => {
		return user?.totalWorkedTasks?.find((task: any) => task?.id === id)?.duration || 0;
	};

	return (
		<>
			{matchingMembers?.slice(0, numMembersToShow)?.map((member) => {
				const taskDurationInSeconds = findUserTotalWorked(member, task?.id);

				const { h, m } = secondsToTime(taskDurationInSeconds);

				const time = `${h}h : ${m}m`;

				return (
					<div key={member.id} className="mt-2">
						<ProfileInfoWithTime
							key={member.id}
							profilePicSrc={member.employee.user?.imageUrl}
							names={member.employee.fullName}
							time={time}
							userId={member.employee.userId}
						/>
					</div>
				);
			})}
		</>
	);
};
