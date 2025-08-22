import { DraggableProvided } from '@hello-pangea/dnd';
import PriorityIcon from '@/core/components/svgs/priority-icon';
import { useTaskStatistics, useTeamMemberCard, useTimerView } from '@/core/hooks';
import { ImageOverlapperProps } from '../common/image-overlapper';
import Link from 'next/link';
import CircularProgress from '@/core/components/svgs/circular-progress';
import { secondsToTime } from '@/core/lib/helpers/index';
import { activeTeamState, activeTeamTaskId, activeTeamTaskState } from '@/core/stores';
import { useAtom, useAtomValue } from 'jotai';
import { HorizontalSeparator } from '../duplicated-components/separator';
import { ITag } from '@/core/types/interfaces/tag/tag';
import { ETaskPriority } from '@/core/types/generics/enums/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';

import { LazyImageComponent, LazyMenuKanbanCard } from '@/core/components/optimized-components/kanban';
import {
	LazyTaskAllStatusTypes,
	LazyTaskInput,
	LazyTaskIssueStatus
} from '@/core/components/optimized-components/tasks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

function getStyle(provided: DraggableProvided, style: any) {
	if (!style) {
		return provided.draggableProps.style;
	}

	return {
		...provided.draggableProps.style,
		...style
	};
}

export function setCommentIconColor(commentType: 'tagged' | 'untagged') {
	let style;

	if (commentType === 'tagged') {
		style = {
			backgroundColor: '#D95F5F'
		};
	} else if (commentType === 'untagged') {
		style = {
			backgroundColor: '#27AE60'
		};
	} else {
		style = {};
	}

	return style;
}

function TagCard({ title, backgroundColor, color }: { title: string; backgroundColor: string; color: string }) {
	return (
		<>
			<div
				className="flex flex-row gap-2 items-center py-1 px-2.5 rounded-[10px]"
				style={{
					backgroundColor: `${backgroundColor}`
				}}
			>
				<p
					className={`text-xs`}
					style={{
						color: `${color}`
					}}
				>
					{title}
				</p>
			</div>
		</>
	);
}
// TODO: remove this component, it is using only in kanban and now we uses the previous component
// added export to remove lint error
export function TagList({ tags }: { tags: ITag[] }) {
	return (
		<>
			<div className="flex flex-wrap gap-1 items-center">
				{tags.map((tag: ITag, index: number) => {
					return <TagCard key={index} title={tag.name} backgroundColor={tag.color} color={'#FFFFFF'} />;
				})}
			</div>
		</>
	);
}

export function Priority({ level }: { level: ETaskPriority }) {
	const levelSmallCase = level.toString().toLowerCase();
	const levelIntoNumber =
		levelSmallCase === 'low' ? 1 : levelSmallCase === 'medium' ? 2 : levelSmallCase === 'high' ? 3 : 4;
	const numberArray = Array.from({ length: levelIntoNumber }, (_, index) => index + 1);

	return (
		<>
			<div
				style={{
					marginTop: -4.5 * levelIntoNumber
				}}
				className="flex relative flex-col"
			>
				{numberArray.map((item: any, index: number) => {
					return (
						<span
							key={index}
							style={{
								top: `${index * 4}px`
							}}
							className="absolute"
						>
							<PriorityIcon />
						</span>
					);
				})}
			</div>
		</>
	);
}
type ItemProps = {
	item: TTask;
	isDragging: boolean;
	isGroupedOver: boolean;
	provided: DraggableProvided;
	style: any;
	isClone: boolean;
	index: number;
};

/**
 * Card that represents each task
 * @param props
 * @returns
 */
export default function Item(props: ItemProps) {
	const { item, isDragging, provided, style } = props;
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const { getEstimation } = useTaskStatistics(0);
	const [activeTask, setActiveTask] = useAtom(activeTeamTaskId);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { timerStatus } = useTimerView();

	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => m.employee?.userId === user?.id);
	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((i: TTask) => i.id === item?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration || 0;
		}
	});

	const memberInfo = useTeamMemberCard(currentUser);

	const taskAssignee: ImageOverlapperProps[] =
		item.members?.map((member: any) => {
			return {
				id: member.user.id,
				url: member.user.imageUrl,
				alt: member.user.firstName
			};
		}) || [];

	const progress = getEstimation(null, item, totalWorkedTasksTimer || 1, item.estimate || 0);
	const currentMember = activeTeam?.members?.find((member) => member.id === memberInfo.member?.id || item?.id);

	const {
		hours: h,
		minutes: m,
		seconds: s
	} = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t: TTask) => t.id === item?.id)
				.reduce(
					(previousValue: number, currentValue: TTaskStatistics) =>
						previousValue + (currentValue.duration || 0),
					0
				)) ||
			0
	);
	return (
		<div
			draggable={isDragging}
			ref={provided.innerRef}
			{...provided.draggableProps}
			{...provided.dragHandleProps}
			style={getStyle(provided, style)}
			className="flex flex-col my-2.5 rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative"
			aria-label={item.title}
		>
			<div className="justify-between w-full h-fit">
				<div className="flex justify-between w-full">
					<span className="!w-64">
						<LazyTaskAllStatusTypes
							className="justify-start"
							task={item}
							showStatus={false}
							tab="default"
							dayPlanTab="All Tasks"
						/>
					</span>
					<span>
						<LazyMenuKanbanCard member={currentMember} item={props.item} />
					</span>
				</div>
				<div className="flex justify-between my-3 w-full">
					<div className="flex items-center w-64">
						{activeTask?.id == item.id ? (
							<>
								<div className="w-56">
									<LazyTaskInput
										task={item}
										initEditMode={true}
										keepOpen={true}
										showCombobox={false}
										autoFocus={true}
										autoInputSelectText={true}
										onTaskClick={(e: any) => {
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
							<Link href={`/task/${item.id}`}>
								<div className="overflow-hidden relative w-64">
									{item.issueType && (
										<span className="inline-block w-6 h-5">
											<span className="absolute top-1">
												<LazyTaskIssueStatus
													showIssueLabels={false}
													type="HORIZONTAL"
													task={item}
													className="rounded-sm mr-1 h-6 w-6 !p-0 flex justify-center items-center"
												/>
											</span>
										</span>
									)}
									<span className="mx-1 text-grey text-normal">#{item.number}</span>
									{item.title}
									<span className="inline-block ml-1">
										{item.priority && <Priority level={item.priority} />}
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
						{item.id === activeTeamTask?.id && timerStatus?.running ? (
							<div className="flex gap-2 items-center">
								<small className="text-xs text-grey text-normal">Live:</small>
								<p className="text-[#219653] font-medium text-sm">
									{h}h : {m}m : {s}s
								</p>
							</div>
						) : (
							<div className="flex gap-2 items-center">
								<small className="text-xs text-grey text-normal">Worked:</small>
								<p className="text-sm font-medium text-black dark:text-white">
									{h}h : {m}m
								</p>
							</div>
						)}
					</div>
					<LazyImageComponent radius={30} images={taskAssignee} item={item} />
					{item.issueType && (
						<div className="flex flex-row items-center justify-center rounded-full w-5 h-5 z-[1] bg-[#e5e7eb] dark:bg-[#181920] absolute top-0 right-0">
							<div
								className="w-3.5 h-3.5 rounded-full"
								style={setCommentIconColor(item.issueType as any)}
							></div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
