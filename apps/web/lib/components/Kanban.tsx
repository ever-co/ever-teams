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
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { Button } from '@components/ui/button';
import { useTranslations } from 'next-intl';
import { AddIcon, ChevronLeftIcon } from 'assets/svg';

import { useModal } from '@app/hooks';
import { Modal } from './modal';
import CreateTaskModal from '@components/pages/kanban/create-task-modal';
import Image from 'next/image';

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
 * wrapper to ensure the card is draggable
 * @param param0
 * @returns
 */
function InnerItemList({ items, title }: { title: string; items: ITeamTask[]; dropSnapshot: DroppableStateSnapshot }) {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();

	return (
		<>
			<section className="flex flex-col pb-2 relative">
				{items.map((item: ITeamTask, index: number) => (
					<Draggable key={item.id} draggableId={item.id} index={index}>
						{(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
							<Item
								isClone={false}
								index={index}
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
				{items.length == 0 && (
					<div className="bg-[#f2f2f2] dark:bg-[#191a20] absolute">
						<div className="h-[180px] bg-transparent bg-white dark:bg-[#1e2025] w-[340px] mt-3 flex justify-center items-center my-2 rounded-xl">
							not found!
						</div>
						<div
							onClick={openModal}
							className="h-[52px] mt-4 w-[340px] flex flex-row items-center text-sm not-italic font-semibold rounded-2xl gap-4 bg-white dark:bg-dark--theme-light p-4"
						>
							<AddIcon className=" h-5 w-5" />
							<p>{t('common.CREATE_TASK')}</p>
						</div>
					</div>
				)}
				<Modal isOpen={isOpen} closeModal={closeModal}>
					<CreateTaskModal title={title} initEditMode={false} task={null} tasks={[]} />
				</Modal>
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
 * wrapper to allow the inner column to act as
 * a droppable area for cards being dragged
 * @param param0
 * @returns
 */
export const KanbanDroppable = ({
	title,
	droppableId,
	type,
	isLoading,
	content
}: {
	title: string;
	isLoading: boolean;
	droppableId: string;
	type: string;
	content: ITeamTask[];
}) => {
	return (
		<>
			<Droppable droppableId={droppableId} type={type}>
				{(dropProvided: DroppableProvided, dropSnapshot: DroppableStateSnapshot) => (
					<div style={getBackgroundColor(dropSnapshot)} {...dropProvided.droppableProps}>
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
 * wrapper to allow the inner column to act as
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

	const { isOpen, closeModal, openModal } = useModal();

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
							className="flex flex-row px-2 w-fit h-full"
						>
							{title.length > 0 ? (
								<>
									<header
										className={
											'relative flex flex-col gap-8 items-between text-center rounded-lg w-fit h-full px-2 py-4 bg-indianRed min-h-[20rem]'
										}
										style={headerStyleChanger(snapshot, backgroundColor)}
									>
										<div className="flex flex-col items-center space-2">
											<button
												className="hover:bg-[#0000001A] w-8 h-8 p-2 rounded-md rotate-180"
												onClick={() => toggleColumn(title, false)}
											>
												<ChevronLeftIcon className="text-[#1B1D22]" />
											</button>
											<Popover>
												<PopoverTrigger className="mt-1" asChild>
													<Button
														variant="ghost"
														className="hover:bg-[#0000001A] p-0 w-8 h-8 rounded-md"
													>
														<ThreeDotIcon color="black" />
													</Button>
												</PopoverTrigger>
												<PopoverContent
													align="start"
													className="md:p-1 rounded-x dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C] w-40"
												>
													<div
														className="hover:font-medium p-1.5 text-sm cursor-pointer"
														onClick={() => openModal()}
													>
														Create Task
													</div>
													<div
														className="hover:font-medium p-1.5 text-sm cursor-pointer"
														onClick={() => toggleColumn(title, false)}
													>
														Collapse Column
													</div>
												</PopoverContent>
											</Popover>
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
			<Modal isOpen={isOpen} closeModal={closeModal}>
				<CreateTaskModal title={title} initEditMode={false} task={null} tasks={[]} />
			</Modal>
		</>
	);
};

const KanbanDraggableHeader = ({
	title,
	icon,
	items,
	snapshot,
	createTask,
	provided,
	backgroundColor
}: {
	title: string;
	items: any;
	icon: string;
	createTask: () => void;
	snapshot: DraggableStateSnapshot;
	backgroundColor: string;
	provided: DraggableProvided;
}) => {
	const { toggleColumn } = useKanban();
	return (
		<>
			{title && (
				<header
					className={'flex flex-row justify-between items-center rounded-lg px-[15px] py-[7px] z-[500]'}
					style={headerStyleChanger(snapshot, backgroundColor)}
				>
					<div className="flex flex-row gap-2.5 items-center">
						<Image alt={title} src={icon} width={20} height={20} />
						<h2
							className="text-sm font-semibold not-italic text-black font-poppins capitalize"
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
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="ghost" className="hover:bg-[#0000001A] p-0 w-8 h-8 rounded-md">
									<ThreeDotIcon color="black" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="md:p-1 rounded-x dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C] w-40"
							>
								<div
									className="hover:font-medium p-1.5 text-sm cursor-pointer"
									onClick={() => createTask()}
								>
									Create Task
								</div>
								<div
									className="hover:font-medium p-1.5 text-sm cursor-pointer"
									onClick={() => toggleColumn(title, true)}
								>
									Collapse Column
								</div>
								{/* <div
									className="hover:font-medium p-1.5 text-sm cursor-pointer"
									onClick={() => toggleColumn(title, true)}
								>
									Edit Status
								</div> */}
							</PopoverContent>
						</Popover>
						<button
							className="hover:bg-[#0000001A] w-8 h-8 p-2 rounded-md"
							onClick={() => toggleColumn(title, true)}
						>
							<ChevronLeftIcon className="text-[#1B1D22]" />
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
	isLoading,
	icon,
	items,
	backgroundColor
}: {
	index: number;
	title: string;
	icon: string;
	isLoading: boolean;
	backgroundColor: any;
	items: ITeamTask[];
	addNewTask: (value: ITeamTask, status: string) => void;
}) => {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();
	//

	return (
		<>
			{title && (
				<Draggable key={title} index={index} draggableId={title}>
					{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
						<div
							ref={provided.innerRef}
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							// style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
							className="relative flex flex-col px-2 h-fit w-[355px]"
						>
							{title ? (
								<>
									<div>
										<KanbanDraggableHeader
											title={title}
											icon={icon}
											items={items}
											snapshot={snapshot}
											provided={provided}
											createTask={openModal}
											backgroundColor={backgroundColor}
										/>
									</div>
									<div className="flex flex-col ">
										<KanbanDroppable
											isLoading={isLoading}
											title={title}
											droppableId={title}
											type={'TASK'}
											content={items}
										/>
										<button
											onClick={() => openModal()}
											className="flex flex-row items-center text-sm not-italic font-semibold rounded-2xl gap-4 bg-white dark:bg-dark--theme-light p-4"
										>
											<AddIcon className=" h-5 w-5" />
											<p>{t('common.CREATE_TASK')}</p>
										</button>
									</div>
								</>
							) : null}
						</div>
					)}
				</Draggable>
			)}
			<Modal isOpen={isOpen} closeModal={closeModal}>
				<CreateTaskModal title={title} initEditMode={false} task={null} tasks={[]} />
			</Modal>
		</>
	);
};

export default KanbanDraggable;
