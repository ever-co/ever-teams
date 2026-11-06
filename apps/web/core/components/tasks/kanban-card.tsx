import { useAtom, useAtomValue } from 'jotai';
import Link from 'next/link';
import { memo } from 'react';
import { useTranslations } from 'next-intl';

import { LazyImageComponent, LazyMenuKanbanCard } from '@/core/components/optimized-components/kanban';
import {
	LazyTaskAllStatusTypes,
	LazyTaskInput,
	LazyTaskIssueStatus
} from '@/core/components/optimized-components/tasks';
import CircularProgress from '@/core/components/svgs/circular-progress';
import PriorityIcon from '@/core/components/svgs/priority-icon';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { secondsToTime } from '@/core/lib/helpers/index';
import { getTaskEstimation } from '@/core/lib/utils/task.utils';
import {
	activeTeamState,
	activeTeamTaskId,
	activeTeamTaskState,
	activeTeamWorkedDurationByTaskState
} from '@/core/stores';
import { ETaskPriority } from '@/core/types/generics/enums/task';
import { ITag } from '@/core/types/interfaces/tag/tag';
import { TTaskStatistics } from '@/core/types/interfaces/task/task';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { DraggableProvided } from '@hello-pangea/dnd';

import { ImageOverlapperProps } from '../common/image-overlapper';
import { HorizontalSeparator } from '../duplicated-components/separator';
import { cn } from '@/core/lib/helpers';

function getStyle(provided: DraggableProvided, style: any) {
	if (!style) {
		return provided.draggableProps.style;
	}

	return {
		...provided.draggableProps.style,
		...style
	};
}

const KANBAN_AVATAR_COUNT = 3;

export function setCommentIconColor(commentType: 'tagged' | 'untagged') {
	let style;

	if (commentType === 'tagged') {
		style = {
			backgroundColor: 'hsl(var(--destructive))'
		};
	} else if (commentType === 'untagged') {
		style = {
			backgroundColor: 'hsl(var(--success))'
		};
	} else {
		style = {};
	}

	return style;
}

function TagCard({ title, backgroundColor, color }: { title: string; backgroundColor?: string | null; color: string }) {
	return (
		<>
			<div
				className="flex flex-row gap-2 items-center py-1 px-2.5 rounded-[10px]"
				style={{
					backgroundColor: backgroundColor || '#6B7280'
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

export function Priority({ level }: { level: ETaskPriority | string }) {
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
				{numberArray.map((_item: any, index: number) => {
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

// Memoized on the task alone: drag frames re-render the wrapper below, not this subtree.
const ItemContent = memo(function ItemContent({ item }: { item: TTask }) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const workedDurationByTask = useAtomValue(activeTeamWorkedDurationByTaskState);
	const { data: user } = useUserQuery();
	const [activeTask, setActiveTask] = useAtom(activeTeamTaskId);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	// The same filtered status useTimerApi exposes, read from an atom: a whole timer API per card cost
	// about twenty hooks for this one value.
	const timerStatus = useAtomValue(teamTimerStatusState);

	const members = activeTeam?.members || [];
	const currentMember = members.find((m) => m.employee?.userId === user?.id);
	const totalWorkedTasksTimer = workedDurationByTask.get(item.id) ?? 0;

	const taskAssignee: ImageOverlapperProps[] =
		item.members?.map((member: any) => {
			return {
				id: member.user.id,
				url: member.user.imageUrl,
				alt: member.user.firstName
			};
		}) || [];

	const progress = getTaskEstimation(null, item, totalWorkedTasksTimer || 1, item.estimate || 0);
	const isActiveTeamTask = item.id === activeTeamTask?.id;
	const isTimerRunning = Boolean(timerStatus?.running);
	const isLiveOnThisTask = isActiveTeamTask && isTimerRunning;
	const commentIconStyle = setCommentIconColor(item.issueType as any);
	const hasCommentIcon = 'backgroundColor' in commentIconStyle;

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
		<div className="flex flex-col gap-3 justify-between w-full h-fit">
			<div className="flex gap-2 justify-between items-start w-full">
				<span className="min-w-0 flex-1">
					<LazyTaskAllStatusTypes
						className="justify-start"
						task={item}
						showStatus={false}
						tab="default"
						dayPlanTab="All Tasks"
					/>
				</span>
				<span>
					<LazyMenuKanbanCard member={currentMember} item={item} />
				</span>
			</div>
			<div className="flex gap-3 justify-between items-start w-full">
				<div className="flex min-w-0 flex-1 items-center">
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
						<Link
							href={`/task/${item.id}`}
							className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<div className="overflow-hidden relative w-full text-sm font-medium leading-6 text-foreground line-clamp-2">
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
								<span className="mx-1 font-normal tabular-nums text-muted-foreground">
									#{item.number}
								</span>
								{item.title}
								<span className="inline-block ml-1">
									{item.priority && <Priority level={item.priority} />}
								</span>
							</div>
						</Link>
					)}
				</div>

				<div className="shrink-0">
					<CircularProgress percentage={progress} />
				</div>
			</div>
			<HorizontalSeparator className="bg-border" />
			<div className="flex h-8 w-full items-center justify-between gap-2">
				<LazyImageComponent
					radius={30}
					images={taskAssignee}
					item={item}
					displayImageCount={KANBAN_AVATAR_COUNT}
				/>
				<div className="shrink-0 whitespace-nowrap">
					{isLiveOnThisTask && (
						<div className="flex items-center gap-2">
							<small className="text-xs text-muted-foreground">{t('common.LIVE')}:</small>
							<p className="text-sm font-medium tabular-nums text-success-foreground">
								{h}h : {m}m : {s}s
							</p>
						</div>
					)}
					{!isLiveOnThisTask && (
						<div className="flex items-center gap-2">
							<small className="text-xs text-muted-foreground">{t('common.WORKED')}:</small>
							<p className="text-sm font-medium tabular-nums text-foreground">
								{h}h : {m}m
							</p>
						</div>
					)}
				</div>
				{hasCommentIcon && (
					<div className="flex flex-row items-center justify-center rounded-full size-5 z-[1] bg-foreground/5 absolute top-0 right-0">
						<div className="w-3.5 h-3.5 rounded-full" style={commentIconStyle}></div>
					</div>
				)}
			</div>
		</div>
	);
});

/**
 * Card that represents each task
 * @param props
 * @returns
 */
export default function Item(props: ItemProps) {
	const { item, isDragging, provided, style } = props;

	// @hello-pangea/dnd passes a new `provided` on every drag frame. Keep this wrapper unmemoized: a comparator
	// that skips `provided` freezes the card mid-drag and breaks keyboard dragging.
	return (
		<div
			draggable={isDragging}
			ref={provided.innerRef}
			{...provided.draggableProps}
			{...provided.dragHandleProps}
			style={getStyle(provided, style)}
			className={cn(
				'flex relative flex-col p-3 mb-2 w-full rounded-xl bg-card text-card-foreground hairline-ring ring-border shadow-sm shadow-black/6.5 transition-shadow',
				isDragging && 'rotate-2 shadow-md shadow-black/10 ring-primary/40'
			)}
			aria-label={item.title}
		>
			<ItemContent item={item} />
		</div>
	);
}
