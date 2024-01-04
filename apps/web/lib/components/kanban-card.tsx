import VerticalThreeDot from '@components/ui/svgs/vertical-three-dot';
import { DraggableProvided } from 'react-beautiful-dnd';
import CircularProgress from '@components/ui/svgs/circular-progress';
import PriorityIcon from '@components/ui/svgs/priority-icon';
import { Tag } from '@app/interfaces';
import { useTimerView } from '@app/hooks';
import { pad } from '@app/helpers';
import { TaskStatus } from '@app/constants';
import { TaskIssueStatus } from 'lib/features';
import Link from 'next/link';
import ImageOverlapper, { IImageOverlapper } from './image-overlapper';

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

/**
 * card that represent each task
 * @param props
 * @returns
 */
export default function Item(props: any) {
	const { item, isDragging, isGroupedOver, provided, style, isClone, index } = props;

	const { hours, minutes, seconds } = useTimerView();

	const taskAssignee: IImageOverlapper[] = [];

	item.members.map((member: any)=> {
		taskAssignee.push({
			id: member.user.id,
			url: member.user.imageUrl,
			alt: member.user.firstname
		})
	});

	// const handleTime = () => {
	// 	if (item.status === TaskStatus.INPROGRESS) {
	// 		startTimer();
	// 	} else {
	// 		stopTimer();
	// 	}
	// };

	// useEffect(() => {
	// 	handleTime();
	// }, [timerStatus?.running]);

	return (
		<section
			href={``}
			isDragging={isDragging}
			isGroupedOver={isGroupedOver}
			isClone={isClone}
			ref={provided.innerRef}
			{...provided.draggableProps}
			{...provided.dragHandleProps}
			style={getStyle(provided, style)}
			className="flex flex-col rounded-2xl bg-white dark:bg-dark--theme-light p-4 relative"
			data-is-dragging={isDragging}
			data-testid={item.id}
			data-index={index}
			aria-label={`${item.status.name} ${item.content}`}
		>
			<div className="grid grid-cols-4 w-full justify-between border-b border-b-gray-200 pb-4">
				<div className="col-span-3 flex flex-col gap-5 grow w-full">
					{item.tags && <TagList tags={item.tags} />}

					<div className="flex flex-row flex-wrap text-wrap items-center text-sm not-italic font-semibold">
						<TaskIssueStatus
							showIssueLabels={false}
							task={item}
							className={`${
								item.issueType === 'Bug'
									? '!px-[0.3312rem] py-[0.2875rem]'
									: '!px-[0.375rem] py-[0.375rem]'
							} rounded-sm mr-1`}
						/>

						<span className="text-grey text-normal mr-1">#{item.number}</span>
						<Link href={`/task/${item.id}`} className="text-black dark:text-white text-normal capitalize mr-2 bg-blue line-clamp-2">
							{item.title}
						</Link>
						<Priority level={1} />
					</div>
				</div>
				<div className="flex flex-col justify-between items-end">
					<VerticalThreeDot />

					<CircularProgress percentage={10} />
				</div>
			</div>
			<div className="flex flex-row justify-between items-center pt-4 h-fit">
				{item.status === TaskStatus.INPROGRESS ? (
					<div className="flex flex-row items-center gap-2">
						<small className="text-grey text-xs text-normal">Live:</small>
						<p className="text-[#219653] font-medium text-sm">
							{pad(hours)}:{pad(minutes)}:{pad(seconds)}{' '}
						</p>
					</div>
				) : (
					<div className="flex flex-row items-center gap-2">
						<small className="text-grey text-xs text-normal">Worked:</small>
						<p className="text-black dark:text-white font-medium text-sm">
							{pad(hours)}:{pad(minutes)}:{pad(seconds)}{' '}
						</p>
					</div>
				)}
				<ImageOverlapper images={taskAssignee}/>
				
			</div>
			{item.hasComment && (
				<div className="flex flex-row items-center justify-center rounded-full w-5 h-5 z-10 bg-[#e5e7eb] dark:bg-[#181920] absolute top-0 right-0">
					<div className="w-3.5 h-3.5 rounded-full" style={setCommentIconColor(item.hasComment)}></div>
				</div>
			)}
		</section>
	);
}
