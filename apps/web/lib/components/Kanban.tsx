import LeftArrowTailessIcon from '@components/ui/svgs/left-arrow-tailess';
import ThreeDotIcon from '@components/ui/svgs/three-dot';
import React from 'react';
import { useEffect, useState } from 'react';
import {
	Draggable,
	DraggableProvided,
	DraggableStateSnapshot,
	Droppable,
	DroppableProvided,
	DroppableStateSnapshot
} from 'react-beautiful-dnd';
import Item from './kanban-card';
import { ITeamTask } from '@app/interfaces';
import { TaskStatus } from '@app/constants';
import { useKanban } from '@app/hooks/features/useKanban';
import { AddIcon } from './svgs';

const grid = 8;

const getItemStyle = (isDragging: any, draggableStyle: any) => ({
	userSelect: 'none',
	margin: `0 0 ${grid}px 0`,
	background: isDragging ? '' : null,
	...draggableStyle
});

const getBackgroundColor = (dropSnapshot: DroppableStateSnapshot) => {
	if (dropSnapshot.isDraggingOver) {
		return {
			backgroundColor: ''
		};
	}
	if (dropSnapshot.draggingFromThisWith) {
		return {
			backgroundColor: ''
		};
	}
	return {
		backgroundColor: ''
	};
};

// this function changes column header color when dragged
function headerStyleChanger(snapshot: DraggableStateSnapshot, bgColor: any) {
	const backgroundColor = snapshot.isDragging ? '#3826a6' : bgColor;

	return {
		backgroundColor
	};
}

/**
 * wrapper to ensure card is draggable
 * @param param0
 * @returns
 */
function InnerItemList({
	items,
	title,
	dropSnapshot
}: {
	title: string;
	items: ITeamTask[];
	dropSnapshot: DroppableStateSnapshot;
}) {
	return (
		<>
			<section
				style={{
					minHeight: items.length < 0 && dropSnapshot.isDraggingOver ? '120px' : '20px',
					marginTop: items.length > 0 ? '20px' : '0px'
				}}
				className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto overflow-x-hidden"
			>
				{items.map((item: ITeamTask, index: number) => (
					<Draggable key={item.id} draggableId={item.id} index={index}>
						{(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
							<Item
								key={item.id}
								item={item}
								isDragging={dragSnapshot.isDragging}
								isGroupedOver={Boolean(dragSnapshot.combineTargetFor)}
								provided={dragProvided}
								style={
									title === TaskStatus.INPROGRESS && {
										borderWidth: '2px',
										borderColor: '#6FCF97',
										borderStyle: 'solid'
									}
								}
							/>
						)}
					</Draggable>
				))}
			</section>
		</>
	);
}

/**
 * inner column within a kanban column,
 * it holds all cards underneath the name of the column
 * @param props
 * @returns
 */
function InnerList(props: {
	title: string;
	items: ITeamTask[];
	dropProvided: DroppableProvided;
	dropSnapshot: DroppableStateSnapshot;
}) {
	const { items, dropProvided, dropSnapshot, title } = props;

	return (
		<div style={getBackgroundColor(dropSnapshot)} ref={dropProvided.innerRef}>
			<InnerItemList items={items} title={title} dropSnapshot={dropSnapshot} />
			<>{dropProvided.placeholder}</>
		</div>
	);
}

/**
 * wrapper to allow inner column act as
 * a droppable area for cards being dragged
 * @param param0
 * @returns
 */
export const KanbanDroppable = ({
	title,
	droppableId,
	type,
	content
}: {
	title: string;
	droppableId: string;
	type: string;
	content: ITeamTask[];
}) => {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		const animation = requestAnimationFrame(() => setEnabled(true));

		return () => {
			cancelAnimationFrame(animation);
			setEnabled(false);
		};
	}, []);

	if (!enabled) return null;

	return (
		<>
			<Droppable droppableId={droppableId} type={type}>
				{(dropProvided: DroppableProvided, dropSnapshot: DroppableStateSnapshot) => (
					<div
						style={getBackgroundColor(dropSnapshot)}
						data-isdragging={dropSnapshot.isDraggingOver}
						data-isdropdisabled={false}
						data-isdraggingfrom={Boolean(dropSnapshot.draggingFromThisWith)}
						{...dropProvided.droppableProps}
					>
						<InnerList
							items={content}
							title={title}
							dropProvided={dropProvided}
							dropSnapshot={dropSnapshot}
						/>
					</div>
				)}
			</Droppable>
		</>
	);
};

/**
 * wrapper to allow inner column act as
 * a droppable area for cards being dragged
 * @param param0
 * @returns
 */
export const EmptyKanbanDroppable = ({
	index,
	title,
	items,
	backgroundColor
}: {
	index: number;
	title: string;
	backgroundColor: any;
	items: ITeamTask[];
}) => {
	const [enabled, setEnabled] = useState(false);

	const { toggleColumn } = useKanban();

	useEffect(() => {
		const animation = requestAnimationFrame(() => setEnabled(true));

		return () => {
			cancelAnimationFrame(animation);
			setEnabled(false);
		};
	}, []);

	if (!enabled) return null;

	return (
		<>
			{title.length > 0 && (
				<Draggable key={title} index={index} draggableId={title}>
					{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
						<div
							ref={provided.innerRef}
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
							className="flex flex-row w-fit h-full"
						>
							{title.length > 0 ? (
								<>
									<header
										className={
											'relative flex flex-col gap-8 items-between text-center rounded-lg w-fit h-full px-2 py-4 bg-indianRed'
										}
										style={headerStyleChanger(snapshot, backgroundColor)}
										data-isDragging={snapshot.isDragging}
									>
										<div className="flex flex-col items-center  gap-2">
											<button className="rotate-180" onClick={() => toggleColumn(title, false)}>
												<LeftArrowTailessIcon />
											</button>
											<ThreeDotIcon color="black" />
										</div>
										<div className="relative  w-7 flex flex-col items-center justify-end gap-2.5 mt-20">
											<div className="relative flex flex-row-reverse gap-2.5 w-[200px] -rotate-90 justify-start">
												<div
													className="
                                                    flex flex-col items-center justify-center px-2.5 text-xs py-1 text-black
                                                    bg-transparentWhite rounded-xl"
												>
													{items.length}
												</div>
												<div>
													<h2
														className="flex flex-row font-semibold text-sm not-italic h-full text-black capitalize font-poppins"
														data-isDragging={snapshot.isDragging}
														{...provided.dragHandleProps}
														aria-label={`${title}`}
													>
														<span>{title.split('-').join(' ')}</span>
													</h2>
												</div>
											</div>
										</div>
									</header>
								</>
							) : null}
						</div>
					)}
				</Draggable>
			)}
		</>
	);
};

const KanbanDraggableHeader = ({
	title,
	items,
	snapshot,
	provided,
	backgroundColor
}: {
	title: string;
	items: any;
	snapshot: DraggableStateSnapshot;
	backgroundColor: string;
	provided: DraggableProvided;
}) => {
	const { toggleColumn } = useKanban();

	return (
		<>
			{title && (
				<header
					className={'flex flex-row justify-between items-center rounded-lg px-[15px] py-[7px]'}
					style={headerStyleChanger(snapshot, backgroundColor)}
					data-isDragging={snapshot.isDragging}
				>
					<div className="flex flex-row gap-2.5 items-center">
						<h2
							className="text-sm font-semibold not-italic text-black font-poppins capitalize"
							data-isDragging={snapshot.isDragging}
							{...provided.dragHandleProps}
							aria-label={`${title} quote list`}
						>
							{title.split('-').join(' ')}
						</h2>
						<div
							className="
                        flex flex-col items-center justify-center px-2.5 text-xs py-1 text-black
                        bg-transparentWhite rounded-xl"
						>
							{items.length}
						</div>
					</div>
					<div className="flex flex-row items-center gap-2">
						<ThreeDotIcon color="black" />
						<button onClick={() => toggleColumn(title, true)}>
							<LeftArrowTailessIcon />
						</button>
					</div>
				</header>
			)}
		</>
	);
};

/**
 * column within the kanban board
 * @param param0
 * @returns
 */
const KanbanDraggable = ({
	index,
	title,
	items,
	backgroundColor
}: {
	index: number;
	title: string;
	backgroundColor: any;
	items: ITeamTask[];
}) => {
	return (
		<>
			{title && (
				<Draggable key={title} index={index} draggableId={title}>
					{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
						<div
							ref={provided.innerRef}
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
							className="flex flex-col w-[325px]"
						>
							{title ? (
								<>
									<KanbanDraggableHeader
										title={title}
										items={items}
										snapshot={snapshot}
										provided={provided}
										backgroundColor={backgroundColor}
									/>
									<div className="flex flex-col gap-3">
										<KanbanDroppable
											title={title}
											droppableId={title}
											type={'TASK'}
											content={items}
										/>
										<div className="flex flex-row items-center text-sm not-italic font-semibold rounded-2xl gap-4 bg-white dark:bg-dark--theme-light p-4">
											<AddIcon height={20} width={20} className="dark:stroke-white" />
											<p>Create Issues</p>
										</div>
									</div>
								</>
							) : null}
						</div>
					)}
				</Draggable>
			)}
		</>
	);
};

export default KanbanDraggable;
