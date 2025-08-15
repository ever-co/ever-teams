import { TTaskStatistics } from '@/core/types/interfaces/task/task';
import { TaskAllStatusTypes } from './task-all-status-type';
import MenuKanbanCard from '@/core/components/pages/kanban/menu-kanban-card';
import { TaskInput } from './task-input';
import { useAtom, useAtomValue } from 'jotai';
import { activeTeamState, activeTeamTaskId } from '@/core/stores';
import Link from 'next/link';
import { useTaskStatistics, useTeamMemberCard, useTimerView } from '@/core/hooks';
import ImageComponent, { ImageOverlapperProps } from '@/core/components/common/image-overlapper';
import { TaskIssueStatus } from './task-issue';
import { Priority, setCommentIconColor } from '@/core/components/tasks/kanban-card';
import CircularProgress from '@/core/components/svgs/circular-progress';
import { secondsToTime } from '@/core/lib/helpers/index';
import React from 'react';
import { HorizontalSeparator } from '../duplicated-components/separator';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

interface TaskItemProps {
	task: TTask;
}

export default function TaskBlockCard(props: TaskItemProps) {
	const { task } = props;
	const [activeTask, setActiveTask] = useAtom(activeTeamTaskId);
	const activeTeam = useAtomValue(activeTeamState);

	const { timerStatus, activeTeamTask } = useTimerView();

	const { data: user } = useUserQuery();
	const { getEstimation } = useTaskStatistics(0);
	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => m.employee?.userId === user?.id);

	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((i: TTask) => i.id === task?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration || 0;
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

	const currentMember = activeTeam?.members?.find((member) => member.id === memberInfo.member?.id || task?.id);

	const {
		hours: h,
		minutes: m,
		seconds: s
	} = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t: TTask) => t.id === task?.id)
				.reduce(
					(previousValue: number, currentValue: TTaskStatistics) =>
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
		<div className="flex flex-col my-2.5 rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative border border-[#F7F7F8] dark:border-gray-700">
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
				<div className="flex justify-between my-3 w-full">
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
								<div className="overflow-hidden relative w-[250px] text-ellipsis">
									{task.issueType && (
										<span className="inline-block w-6 h-5">
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
									<span className="text-[13px]">
										<span className="mx-1 text-grey text-normal">#{task.number}</span>
										{task.title}
									</span>
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
				<div className="flex justify-between items-center w-full h-10">
					<div>
						{activeTaskStatus ? (
							<div className="flex gap-2 items-center">
								<small className="text-xs text-grey text-normal">Live:</small>
								<p className="text-[#219653] font-medium text-sm">
									{h}h : {m}m : {s}s
								</p>
							</div>
						) : (
							<div className="flex gap-2 items-center">
								<small className="text-xs text-grey text-normal">Worked:</small>
								<p className="text-sm font-medium text-black whitespace-nowrap text-nowrap min-w-20 dark:text-white">
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
