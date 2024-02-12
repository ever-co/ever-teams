import { DraggableProvided } from 'react-beautiful-dnd';
import PriorityIcon from '@components/ui/svgs/priority-icon';
import { ITeamTask, Tag } from '@app/interfaces';
import {
	useAuthenticateUser,
	useCollaborative,
	useOrganizationTeams,
	useTMCardTaskEdit,
	useTeamMemberCard,
	useTimerView
} from '@app/hooks';
import ImageComponent, { ImageOverlapperProps } from './image-overlapper';
import { TaskInput, TaskIssueStatus } from 'lib/features';
import Link from 'next/link';
import CircularProgress from '@components/ui/svgs/circular-progress';
import { HorizontalSeparator } from './separator';
import { pad } from '@app/helpers';
import { TaskStatus } from '@app/constants';
import { UserTeamCardMenu } from 'lib/features/team/user-team-card/user-team-card-menu';

function getStyle(provided: DraggableProvided, style: any) {
	if (!style) {
		return provided.draggableProps.style;
	}

	return {
		...provided.draggableProps.style,
		...style
	};
}

// function setCommentIconColor(commentType: 'tagged' | 'untagged') {
// 	let style;

// 	if (commentType === 'tagged') {
// 		style = {
// 			backgroundColor: '#D95F5F'
// 		};
// 	} else if (commentType === 'untagged') {
// 		style = {
// 			backgroundColor: '#27AE60'
// 		};
// 	} else {
// 		style = {};
// 	}

// 	return style;
// }

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

function TagList({ tags }: { tags: Tag[] }) {
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

function Priority({ level }: { level: number }) {
	const numberArray = Array.from({ length: level }, (_, index) => index + 1);

	return (
		<>
			<div className="flex flex-col">
				{numberArray.map((item: any, index: number) => {
					return <PriorityIcon key={index} />;
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
 * card that represent each task
 * @param props
 * @returns
 */
export default function Item(props: ItemProps) {
	const { item, isDragging, provided, style, index } = props;

	const { hours, minutes, seconds } = useTimerView();
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const members = activeTeam?.members || [];
	const currentUser = members.find((m) => m.employee.userId === user?.id);

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

	return (
		<div
			draggable={isDragging}
			ref={provided.innerRef}
			{...provided.draggableProps}
			{...provided.dragHandleProps}
			style={getStyle(provided, style)}
			className="flex flex-col my-2.5 rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative"
			data-is-dragging={isDragging}
			data-testid={item.id}
			data-index={index}
			aria-label={item.label}
		>
			<div className=" w-full justify-between h-40">
				<div className="w-full flex justify-between">
					<span>{<TagList tags={[]} />}</span>
					{menu}
				</div>
				<div className="w-full flex justify-between my-3">
					<div className="flex items-center ">
						{!taskEdition.editMode ? (
							<>
								<TaskIssueStatus
									showIssueLabels={false}
									task={item}
									className="rounded-sm mr-1 h-6 w-6"
								/>
								<span className="text-grey text-normal mr-1">#{item.number}</span>
								<Link
									href={`/task/${item.id}`}
									className="text-black dark:text-white text-normal capitalize mr-2 bg-blue line-clamp-2"
								>
									{item.title}
								</Link>
								<Priority level={1} />
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
										console.log(e);
									}}
									onEnterKey={() => {
										taskEdition.setEditMode(false);
									}}
								/>
							</div>
						)}
					</div>
					<CircularProgress percentage={10} />
				</div>
				<div className="my-2">
					<HorizontalSeparator />
				</div>
				<div className="w-full flex items-center justify-between">
					<div className="mt-1">
						{item.status === TaskStatus.INPROGRESS ? (
							<div className="flex items-center gap-2">
								<small className="text-grey text-xs text-normal">Live:</small>
								<p className="text-[#219653] font-medium text-sm">
									{pad(hours)}:{pad(minutes)}:{pad(seconds)}{' '}
								</p>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<small className="text-grey text-xs text-normal">Worked:</small>
								<p className="text-black dark:text-white font-medium text-sm">
									{pad(hours)}:{pad(minutes)}:{pad(seconds)}{' '}
								</p>
							</div>
						)}
					</div>
					<ImageComponent images={taskAssignee} />
					{/* {item. && (
						<div className="flex flex-row items-center justify-center rounded-full w-5 h-5 z-10 bg-[#e5e7eb] dark:bg-[#181920] absolute top-0 right-0">
							<div
								className="w-3.5 h-3.5 rounded-full"
								style={setCommentIconColor(item.hasComment)}
							></div>
						</div>
					)} */}
				</div>
			</div>
		</div>
	);
}
