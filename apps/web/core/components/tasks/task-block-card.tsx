import { ITask, ITasksStatistics } from '@/core/types/interfaces/task/ITask';
import { TaskAllStatusTypes } from './task-all-status-type';
import MenuKanbanCard from '@/core/components/pages/kanban/menu-kanban-card';
import { TaskInput } from './task-input';
import { useAtom } from 'jotai';
import { activeTeamTaskId } from '@/core/stores';
import Link from 'next/link';
import {
	useAuthenticateUser,
	useOrganizationTeams,
	useTaskStatistics,
	useTeamMemberCard,
	useTimerView
} from '@/core/hooks';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { TaskIssueStatus } from './task-issue';
import { Priority, setCommentIconColor } from '@/core/components/tasks/kanban-card';
import CircularProgress from '@/core/components/svgs/circular-progress';
import { secondsToTime } from '@/core/lib/helpers/index';
import React from 'react';
import { HorizontalSeparator } from '../duplicated-components/separator';
import { IEmployee } from '@/core/types/interfaces/organization/employee/IEmployee';

interface TaskItemProps {
	task: ITask;
}

export default function TaskBlockCard(props: TaskItemProps) {
	const { task } = props;
	const [activeTask, setActiveTask] = useAtom(activeTeamTaskId);
	const { activeTeam } = useOrganizationTeams();
	const { timerStatus, activeTeamTask } = useTimerView();

	const { user } = useAuthenticateUser();
	const { getEstimation } = useTaskStatistics(0);
	const members = activeTeam?.members || [];
	const currentUser = members.find((m: IEmployee) => m.employee.userId === user?.id);

	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member: IEmployee) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((i: ITask) => i.id === task?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration;
		}
	});

	const memberInfo = useTeamMemberCard(currentUser);

	const taskAssignee: ImageOverlapperProps[] =
		task.members?.map((member: any) => {
			return {
				id: member.user?.id,
				url: member.user?.imageUrl,
				alt: member.user?.firstName
			};
		}) ?? [];

	const progress = getEstimation(null, task, totalWorkedTasksTimer || 1, task.estimate || 0);

	const currentMember = activeTeam?.members.find(
		(member: IEmployee) => member.id === memberInfo.member?.id || task?.id
	);

	const { h, m, s } = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t: ITask) => t.id === task?.id)
				.reduce(
					(previousValue: number, currentValue: ITasksStatistics) =>
						previousValue + (currentValue.duration || 0),
					0
				)) ||
			0
	);

	const activeTaskStatus = React.useMemo(
		() => (activeTeamTask?.id === task.id ? timerStatus : undefined),
		[activeTeamTask?.id, task.id, timerStatus]
	);

	return (
		<div className="flex flex-col my-2.5 rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative">
			<div className="justify-between w-full h-fit">
				<div className="flex justify-between w-full">
					<span className="!w-64">
						<TaskAllStatusTypes
							className="justify-start"
							task={task}
							showStatus={false}
							tab="default"
							dayPlanTab="All Tasks"
						/>
					</span>
					<span>
						<MenuKanbanCard member={currentMember} item={task} />
					</span>
				</div>
				<div className="flex justify-between w-full my-3">
					<div className="flex items-center w-64">
						{activeTask?.id == task.id ? (
							<>
								<div className="w-56">
									<TaskInput
										task={task}
										initEditMode={true}
										keepOpen={true}
										showCombobox={false}
										autoFocus={true}
										autoInputSelectText={true}
										onTaskClick={(e) => {
											// TODO: implement
											console.log(e);
										}}
										onEnterKey={() => {
											setActiveTask({ id: '' });
										}}
									/>
								</div>
							</>
						) : (
							<Link href={`/task/${task.id}`}>
								<div className="relative w-64 overflow-hidden">
									{task.issueType && (
										<span className="inline-block w-6 h-5 ">
											<span className="absolute top-1">
												<TaskIssueStatus
													showIssueLabels={false}
													type="HORIZONTAL"
													task={task}
													className="rounded-sm mr-1 h-6 w-6 !p-0 flex justify-center items-center"
												/>
											</span>
										</span>
									)}
									<span className="mx-1 text-grey text-normal">#{task.number}</span>
									{task.title}
									<span className="inline-block ml-1">
										{task.priority && <Priority level={task.priority} />}
									</span>
								</div>
							</Link>
						)}
					</div>

					<CircularProgress percentage={progress} />
				</div>
				<div className="my-2">
					<HorizontalSeparator />
				</div>
				<div className="flex items-center justify-between w-full h-10">
					<div>
						{activeTaskStatus ? (
							<div className="flex items-center gap-2">
								<small className="text-xs text-grey text-normal">Live:</small>
								<p className="text-[#219653] font-medium text-sm">
									{h}h : {m}m : {s}s
								</p>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<small className="text-xs text-grey text-normal">Worked:</small>
								<p className="w-20 text-sm font-medium text-black dark:text-white">
									{h}h : {m}m : {s}s
								</p>
							</div>
						)}
					</div>
					<ImageComponent radius={30} images={taskAssignee} item={task} />
					{task.issueType && (
						<div className="flex flex-row items-center justify-center rounded-full w-5 h-5 z-[1] bg-[#e5e7eb] dark:bg-[#181920] absolute top-0 right-0">
							<div
								className="w-3.5 h-3.5 rounded-full"
								style={setCommentIconColor(task.issueType as any)}
							></div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
