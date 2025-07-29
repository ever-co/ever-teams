import ThreeDotIcon from '@/core/components/svgs/three-dot';
import React, { RefObject, useMemo } from 'react';
import { useEffect, useState } from 'react';

import {
	Draggable,
	DraggableProvided,
	DraggableStateSnapshot,
	Droppable,
	DroppableProvided,
	DroppableStateSnapshot
} from '@hello-pangea/dnd';

import Item from './kanban-card';
import { TaskStatus } from '@/core/constants/config/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Button } from '@/core/components/duplicated-components/_button';
import { useTranslations } from 'next-intl';
import { AddIcon, ChevronLeftIcon } from 'assets/svg';

import { useModal } from '@/core/hooks';
import { Modal } from '../common/modal';
import Image from 'next/image';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { cn } from '../../lib/helpers';
import { useKanban } from '../../hooks/tasks/use-kanban';
import { Suspense } from 'react';
import { ModalSkeleton } from '../common/skeleton/modal-skeleton';
import { KanbanColumnLoadingSkeleton } from '../common/skeleton/kanban-column-loading-skeleton';
import { LazyCreateTaskModal, LazyEditStatusModal } from '@/core/components/optimized-components/tasks';
import { TTask } from '@/core/types/schemas/task/task.schema';

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

/** This function changes column header color when dragged */
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
function InnerItemList({
	items,
	title,
	isLoading,
	allColumnsData
}: {
	title: string;
	items: TTask[];
	dropSnapshot: DroppableStateSnapshot;
	isLoading: boolean;
	allColumnsData?: { [key: string]: TTask[] };
}) {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();

	// Check if we're in a "false loading" state where isLoading=false but no data is actually available yet
	const isActuallyLoading = useMemo(() => {
		return isLoading || !Array.isArray(items);
	}, [isLoading, items]);
	return (
		<>
			<section className="flex relative flex-col items-center pb-2">
				{!isActuallyLoading &&
					Array.isArray(items) &&
					items.length > 0 &&
					items.map((item: TTask, index: number) => (
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

				{/* Determine what to show based on loading state and data availability */}
				{(() => {
					// Show loading skeleton if:
					// 1. Currently loading, OR
					// 2. Items is not a valid array (undefined/null), OR
					// 3. All columns are empty (indicating data hasn't loaded yet)
					if (isActuallyLoading) {
						return <KanbanColumnLoadingSkeleton />;
					}

					// At this point: !isLoading && Array.isArray(items)
					// Show empty state only if items array is empty
					if (items.length === 0) {
						return (
							<div className="bg-[#f2f2f2] dark:bg-[#191a20] absolute w-full">
								<div className="h-[180px] bg-transparent bg-white dark:bg-[#1e2025] mt-3 flex justify-center items-center my-2 rounded-xl">
									{t('common.NOT_FOUND')}!
								</div>
								<div
									onClick={openModal}
									className="h-[52px] mt-4 w-full flex flex-row items-center text-sm not-italic font-semibold rounded-2xl gap-4 bg-white dark:bg-dark--theme-light p-4"
								>
									<AddIcon className="w-5 h-5" />
									<p>{t('common.CREATE_TASK')}</p>
								</div>
							</div>
						);
					}

					// If we have items, they're already rendered above in the map
					return null;
				})()}
				{isOpen && (
					<Suspense fallback={<ModalSkeleton size="lg" />}>
						<Modal isOpen={isOpen} closeModal={closeModal}>
							<LazyCreateTaskModal
								onClose={closeModal}
								title={title}
								initEditMode={false}
								task={null}
								tasks={[]}
							/>
						</Modal>
					</Suspense>
				)}
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
	items: TTask[];
	dropProvided: DroppableProvided;
	dropSnapshot: DroppableStateSnapshot;
	isLoading: boolean;
	allColumnsData?: { [key: string]: TTask[] };
}) {
	const { items, dropProvided, dropSnapshot, title, isLoading, allColumnsData } = props;

	return (
		<div style={getBackgroundColor(dropSnapshot)} ref={dropProvided.innerRef}>
			<InnerItemList
				items={items}
				title={title}
				dropSnapshot={dropSnapshot}
				isLoading={isLoading}
				allColumnsData={allColumnsData}
			/>
			<>{dropProvided.placeholder as React.ReactElement}</>
		</div>
	);
}
/**
 * Calculates the dynamic height of a Kanban column based on the number of items
 *
 * @param {number} itemsLength - The number of items in the column
 * @param {RefObject<HTMLDivElement> | undefined} containerRef - Reference to the container element
 * @returns {string} The calculated height with 'px' unit
 *
 * Rules:
 * - 2 items or less: fixed height of 320px
 * - 3 items: fixed height of 520px
 * - More than 3 items: uses container height or fallback to 720px
 *
 * @example
 * // For 1 items or less
 * getKanbanColumnHeight(1, containerRef) // returns '320px'
 *
 * // For 3 items
 * getColumnHeight(3, containerRef) // returns '520px'
 *
 * // For more than 3 items
 * getColumnHeight(4, containerRef) // returns container height or '720px'
 */
const getKanbanColumnHeight = (itemsLength: number, containerRef: RefObject<HTMLDivElement> | undefined): string => {
	switch (true) {
		case itemsLength <= 1:
			return '320px';
		case itemsLength <= 3:
			return '520px';
		case itemsLength > 3:
			return `${containerRef?.current?.offsetHeight || 720}px`;
		default:
			return '320px';
	}
};
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
	content,
	isLoading,
	allColumnsData
}: {
	title: string;
	isLoading: boolean;
	droppableId: string;
	type: string;
	content: TTask[];
	allColumnsData?: { [key: string]: TTask[] };
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
							isLoading={isLoading}
							allColumnsData={allColumnsData}
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
	status,
	setColumn,
	items,
	backgroundColor
}: {
	index: number;
	title: string;
	status: any;
	setColumn: any;
	backgroundColor: any;
	items: TTask[];
}) => {
	const [enabled, setEnabled] = useState(false);
	const t = useTranslations();
	const { toggleColumn } = useKanban();

	useEffect(() => {
		const animation = requestAnimationFrame(() => setEnabled(true));

		return () => {
			cancelAnimationFrame(animation);
			setEnabled(false);
		};
	}, []);

	const { isOpen, closeModal, openModal } = useModal();
	const { isOpen: editIsOpen, closeModal: editCloseModal, openModal: editOpenModal } = useModal();

	if (!enabled) return null;

	return (
		<>
			{title.length > 0 && (
				// @ts-ignore
				<Draggable key={title} index={index} draggableId={title}>
					{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
						<div
							ref={provided.innerRef}
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
							className="flex flex-row px-2 h-40 w-fit"
						>
							{title.length > 0 ? (
								<>
									<header
										className={
											'flex relative flex-col gap-8 px-2 py-4 h-full text-center rounded-lg items-between w-fit bg-indianRed min-h-[20rem]'
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
														{t('hotkeys.CREATE_TASK')}
													</div>
													<div
														className="hover:font-medium p-1.5 text-sm cursor-pointer"
														onClick={() => toggleColumn(title, false)}
													>
														{t('common.EXPAND_COLUMN')}
													</div>
													<div
														className="hover:font-medium p-1.5 text-sm cursor-pointer"
														onClick={editOpenModal}
													>
														{t('common.EDIT_STATUS')}
													</div>
												</PopoverContent>
											</Popover>
										</div>
										{isOpen && (
											<Suspense fallback={<ModalSkeleton size="md" />}>
												<Modal isOpen={isOpen} closeModal={closeModal}>
													<LazyEditStatusModal
														status={status}
														onClose={closeModal}
														setColumn={setColumn}
													/>
												</Modal>
											</Suspense>
										)}
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
														className="flex flex-row h-full text-sm not-italic font-semibold text-black capitalize"
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
			{isOpen && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<Modal isOpen={isOpen} closeModal={closeModal}>
						<LazyCreateTaskModal
							onClose={closeModal}
							title={title}
							initEditMode={false}
							task={null}
							tasks={[]}
						/>
					</Modal>
				</Suspense>
			)}
			{editIsOpen && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<Modal className="z-[1002]" isOpen={editIsOpen} closeModal={editCloseModal}>
						<LazyEditStatusModal status={status} onClose={editCloseModal} setColumn={setColumn} />
					</Modal>
				</Suspense>
			)}
		</>
	);
};

const KanbanDraggableHeader = ({
	title,
	icon,
	setColumn,
	status,
	items,
	snapshot,
	createTask,
	provided,
	backgroundColor
}: {
	title: string;
	items: any;
	setColumn: any;
	status: any;
	icon: string;
	createTask: () => void;
	snapshot: DraggableStateSnapshot;
	backgroundColor: string;
	provided: DraggableProvided;
}) => {
	const { toggleColumn } = useKanban();
	const { isOpen, closeModal, openModal } = useModal();
	const t = useTranslations();
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
							className="text-sm not-italic font-semibold text-black capitalize"
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
							{items?.length ?? '0'}
						</div>
					</div>
					<div className="flex flex-row gap-2 items-center">
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
									{t('common.CREATE_TASK')}
								</div>
								<div
									className="hover:font-medium p-1.5 text-sm cursor-pointer"
									onClick={() => toggleColumn(title, true)}
								>
									{t('common.COLLAPSE_COLUMN')}
								</div>
								<div className="hover:font-medium p-1.5 text-sm cursor-pointer" onClick={openModal}>
									{t('common.EDIT_STATUS')}
								</div>
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
			{isOpen && (
				<Suspense fallback={<ModalSkeleton size="md" />}>
					<Modal isOpen={isOpen} closeModal={closeModal}>
						<LazyEditStatusModal status={status} onClose={closeModal} setColumn={setColumn} />
					</Modal>
				</Suspense>
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
	setColumn,
	status,
	isLoading,
	icon,
	items,
	backgroundColor,
	containerRef,
	allColumnsData
}: {
	index: number;
	setColumn: any;
	title: string;
	status: any;
	icon: string;
	isLoading: boolean;
	backgroundColor: any;
	items: TTask[];
	containerRef?: RefObject<HTMLDivElement>;
	addNewTask: (value: TTask, status: string) => void;
	allColumnsData?: { [key: string]: TTask[] };
}) => {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();
	//

	return (
		<>
			{title && (
				// @ts-ignore
				<Draggable key={title} index={index} draggableId={title}>
					{(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
						<ScrollArea
							ref={provided.innerRef}
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							// style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
							className={cn(
								'relative flex flex-col w-[355px] h-fit',
								items.length > 4 ? 'min-h-svh' : 'min-h-fit'
							)}
							style={{
								height:
									containerRef && items && items.length > 1
										? getKanbanColumnHeight(items.length, containerRef)
										: '320px',
								paddingBottom: `${containerRef && items && items.length > 1 ? 25 : '0'}px`
							}}
						>
							{title ? (
								<>
									<div>
										<KanbanDraggableHeader
											title={title}
											icon={icon}
											setColumn={setColumn}
											status={status}
											items={items}
											snapshot={snapshot}
											provided={provided}
											createTask={openModal}
											backgroundColor={backgroundColor}
										/>
									</div>
									<div className="flex flex-col">
										<KanbanDroppable
											isLoading={isLoading}
											title={title}
											droppableId={title}
											type={'TASK'}
											content={items}
											allColumnsData={allColumnsData}
										/>
										<button
											onClick={() => openModal()}
											className="flex flex-row gap-4 items-center p-4 text-sm not-italic font-semibold bg-white rounded-2xl dark:bg-dark--theme-light"
										>
											<AddIcon className="w-5 h-5" />
											<p>{t('common.CREATE_TASK')}</p>
										</button>
									</div>
								</>
							) : null}
						</ScrollArea>
					)}
				</Draggable>
			)}
			{isOpen && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<Modal isOpen={isOpen} closeModal={closeModal}>
						<LazyCreateTaskModal
							onClose={closeModal}
							title={title}
							initEditMode={false}
							task={null}
							tasks={[]}
						/>
					</Modal>
				</Suspense>
			)}
		</>
	);
};

export default KanbanDraggable;
