import { ITeamTask } from '@app/interfaces';
import { TaskAllStatusTypes } from './task-all-status-type';
import MenuKanbanCard from '@components/pages/kanban/menu-kanban-card';
import { TaskInput } from './task-input';
import { useRecoilState } from 'recoil';
import { activeTeamTaskId } from '@app/stores';
import Link from 'next/link';
import { useAuthenticateUser, useOrganizationTeams, useTaskStatistics, useTeamMemberCard } from '@app/hooks';
import ImageComponent, { ImageOverlapperProps } from '../../components/image-overlapper';
import { TaskIssueStatus } from './task-issue';
import { Priority, setCommentIconColor } from 'lib/components/kanban-card';
import CircularProgress from '@components/ui/svgs/circular-progress';
import { HorizontalSeparator } from 'lib/components';
import { TaskStatus } from '@app/constants';
import { secondsToTime } from '@app/helpers';

interface TaskItemProps {
	task: ITeamTask;
}

export default function TaskBlockCard(props: TaskItemProps) {
	const { task } = props;
	const [activeTask, setActiveTask] = useRecoilState(activeTeamTaskId);
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { getEstimation } = useTaskStatistics(0);
	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => m.employee.userId === user?.id);

	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((i) => i.id === task?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration;
		}
	});

	const memberInfo = useTeamMemberCard(currentUser);

	const taskAssignee: ImageOverlapperProps[] = task.members?.map((member: any) => {
		return {
			id: member.user?.id,
			url: member.user?.imageUrl,
			alt: member.user?.firstName
		};
	});

	const progress = getEstimation(null, task, totalWorkedTasksTimer || 1, task.estimate || 0);

	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo.member?.id || task?.id);

	const { h, m, s } = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t) => t.id === task?.id)
				.reduce((previousValue, currentValue) => previousValue + currentValue.duration, 0)) ||
			0
	);

	return (
		<div className="flex flex-col my-2.5 rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative">
			<div className="w-full justify-between h-fit">
				<div className="w-full flex justify-between">
					<span className="!w-64">
						<TaskAllStatusTypes className="justify-start" task={task} showStatus={false} />
					</span>
					<span>
						<MenuKanbanCard member={currentMember} item={task} />
					</span>
				</div>
				<div className="w-full flex justify-between my-3">
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
								<div className="w-64 relative overflow-hidden">
									{task.issueType && (
										<span className="h-5 w-6 inline-block ">
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
									<span className="text-grey text-normal mx-1">#{task.number}</span>
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
				<div className="w-full h-10 flex items-center justify-between">
					<div>
						{task.status === TaskStatus.INPROGRESS ? (
							<div className="flex items-center gap-2">
								<small className="text-grey text-xs text-normal">Live:</small>
								<p className="text-[#219653] font-medium text-sm">
									{h}h : {m}m : {s}s
								</p>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<small className="text-grey text-xs text-normal">Worked:</small>
								<p className="text-black dark:text-white font-medium w-20 text-sm">
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
