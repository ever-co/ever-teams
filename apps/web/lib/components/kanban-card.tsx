import { DraggableProvided } from 'react-beautiful-dnd';
import PriorityIcon from '@components/ui/svgs/priority-icon';
import { ITaskPriority, ITeamTask, Tag } from '@app/interfaces';
import {
	useAuthenticateUser,
	useCollaborative,
	useOrganizationTeams,
	useTMCardTaskEdit,
	useTaskStatistics,
	useTeamMemberCard
} from '@app/hooks';
import ImageComponent, { ImageOverlapperProps } from './image-overlapper';
import { TaskAllStatusTypes, TaskInput, TaskIssueStatus } from 'lib/features';
import Link from 'next/link';
import CircularProgress from '@components/ui/svgs/circular-progress';
import { HorizontalSeparator } from './separator';
import { secondsToTime } from '@app/helpers';
import { UserTeamCardMenu } from 'lib/features/team/user-team-card/user-team-card-menu';
import { TaskStatus } from '@app/constants';

function getStyle(provided: DraggableProvided, style: any) {
	if (!style) {
		return provided.draggableProps.style;
	}

	return {
		...provided.draggableProps.style,
		...style
	};
}

function setCommentIconColor(commentType: 'tagged' | 'untagged') {
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
					className={`text-xs `}
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
export function TagList({ tags }: { tags: Tag[] }) {
	return (
		<>
			<div className="flex flex-wrap gap-1 items-center">
				{tags.map((tag: Tag, index: number) => {
					return <TagCard key={index} title={tag.name} backgroundColor={tag.color} color={'#FFFFFF'} />;
				})}
			</div>
		</>
	);
}

function Priority({ level }: { level: ITaskPriority }) {
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
				className="flex flex-col relative "
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
	item: ITeamTask;
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
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const { getEstimation } = useTaskStatistics(0);

	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => m.employee.userId === user?.id);
	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((i) => i.id === item?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration;
		}
	});

	const memberInfo = useTeamMemberCard(currentUser);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	const taskAssignee: ImageOverlapperProps[] = item.members.map((member: any) => {
		return {
			id: member.user.id,
			url: member.user.imageUrl,
			alt: member.user.firstName
		};
	});
	const { collaborativeSelect } = useCollaborative(memberInfo.memberUser);

	const menu = <>{!collaborativeSelect && <UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />}</>;
	const progress = getEstimation(null, item, totalWorkedTasksTimer || 1, item.estimate || 0);
	const currentMember = activeTeam?.members.find((member) => member.id === memberInfo.member?.id || item?.id);

	const { h, m, s } = secondsToTime(
		(currentMember?.totalWorkedTasks &&
			currentMember?.totalWorkedTasks?.length &&
			currentMember?.totalWorkedTasks
				.filter((t) => t.id === item?.id)
				.reduce((previousValue, currentValue) => previousValue + currentValue.duration, 0)) ||
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
			aria-label={item.label}
		>
			<div className="w-full justify-between h-fit">
				<div className="w-full flex justify-between">
					<span className="!w-64">
						<TaskAllStatusTypes className="justify-start" task={item} showStatus={false} />
					</span>
					<span>{menu}</span>
				</div>
				<div className="w-full flex justify-between my-3">
					<div className="flex items-center w-64">
						{!taskEdition.editMode ? (
							<>
								<Link href={`/task/${item.id}`}>
									<div className="w-64 relative overflow-hidden">
										{item.issueType && (
											<span className="h-5 w-6 inline-block ">
												<span className="absolute top-1">
													<TaskIssueStatus
														showIssueLabels={false}
														type="HORIZONTAL"
														task={item}
														className="rounded-sm mr-1 h-6 w-6 !p-0 flex justify-center items-center"
													/>
												</span>
											</span>
										)}
										<span className="text-grey text-normal mx-1">#{item.number}</span>
										{item.title}
										<span className="inline-block ml-1">
											{item.priority && <Priority level={item.priority} />}
										</span>
									</div>
								</Link>
							</>
						) : (
							<div className="w-56">
								<TaskInput
									task={taskEdition.task}
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
										taskEdition.setEditMode(false);
									}}
								/>
							</div>
						)}
					</div>

					<CircularProgress percentage={progress} />
				</div>
				<div className="my-2">
					<HorizontalSeparator />
				</div>
				<div className="w-full h-10 flex items-center justify-between">
					<div>
						{item.status === TaskStatus.INPROGRESS ? (
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
					<ImageComponent radius={30} images={taskAssignee} />
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
