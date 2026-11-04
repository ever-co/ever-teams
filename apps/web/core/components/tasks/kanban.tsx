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
import { ChevronLeft, MoreHorizontal, Plus } from '@/core/components/icons';
import { MENU_ROW, MENU_SEPARATOR } from '@/core/components/common/menu-recipes';

import { useModal } from '@/core/hooks';
import { useTaskSettingsAccess } from '@/core/hooks/tasks/use-task-settings-access';
import { Modal } from '../common/modal';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { cn } from '../../lib/helpers';
import { Suspense } from 'react';
import { ModalSkeleton } from '../common/skeleton/modal-skeleton';
import { KanbanColumnLoadingSkeleton } from '../common/skeleton/kanban-column-loading-skeleton';
import { LazyCreateTaskModal, LazyEditStatusModal } from '@/core/components/optimized-components/tasks';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { dataColorChipStyle, dataColorDotStyle } from './task-data-color';
import { TaskPropertyIcon } from './task-property-icon';
import { LANE_SURFACE, LANE_WIDTH } from './kanban-lane-recipes';

const grid = 8;

const COLUMN_MENU_PANEL = 'w-auto min-w-48 p-1';

const columnIconButton =
	'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground';

const addTaskRow =
	'flex w-full flex-row items-center gap-2 rounded-lg hairline-border border-dashed border-foreground/15 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-foreground/[0.025] hover:text-foreground';

const inProgressCardStyle = {
	outline: '1.5px solid hsl(var(--success) / 0.55)',
	outlineOffset: '0px'
};

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

/**
 * An entry of a column menu that saves on the status (edit it, collapse or expand the column), read-only for a user
 * who may not change the status.
 */
function StatusMenuItem({
	label,
	canEdit,
	readOnlyHint,
	onClick
}: Readonly<{
	label: string;
	canEdit: boolean;
	readOnlyHint: string;
	onClick: () => void;
}>) {
	if (!canEdit) {
		return (
			<div className={cn(MENU_ROW, 'cursor-not-allowed opacity-40')} aria-disabled="true" title={readOnlyHint}>
				{label}
			</div>
		);
	}

	// A native button, so keyboard users reach it too; laid out like the other entries of the menu
	return (
		<button type="button" className={cn(MENU_ROW, 'w-full text-start')} onClick={onClick}>
			{label}
		</button>
	);
}

/** The chevron that collapses or expands a column: the collapsed state is saved on the status, for the whole team. */
function ColumnToggleButton({
	className,
	canEdit,
	readOnlyHint,
	onClick
}: Readonly<{
	className: string;
	canEdit: boolean;
	readOnlyHint: string;
	onClick: () => void;
}>) {
	if (!canEdit) {
		return (
			<button className={cn(className, 'cursor-not-allowed opacity-40')} disabled title={readOnlyHint}>
				<ChevronLeft className="size-4" />
			</button>
		);
	}

	return (
		<button className={className} onClick={onClick}>
			<ChevronLeft className="size-4" />
		</button>
	);
}

/**
 * wrapper to ensure the card is draggable
 * @param param0
 * @returns
 */
function InnerItemList({
	items,
	title,
	isLoading
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
									style={title === TaskStatus.INPROGRESS && inProgressCardStyle}
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
							<div className={cn(LANE_SURFACE, 'absolute flex w-full flex-col gap-2')}>
								<div className="flex h-[180px] items-center justify-center rounded-lg hairline-border border-dashed border-foreground/10 text-sm text-muted-foreground">
									{t('common.NOT_FOUND')}!
								</div>
								<button
									type="button"
									onClick={openModal}
									className={cn(addTaskRow, 'w-full cursor-pointer text-start')}
								>
									<Plus className="size-4" />
									<span>{t('common.CREATE_TASK')}</span>
								</button>
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
		<div
			style={getBackgroundColor(dropSnapshot)}
			ref={dropProvided.innerRef}
			className={cn(
				'rounded-lg transition-colors',
				dropSnapshot.isDraggingOver && 'bg-primary/[0.04] hairline-ring ring-primary/30'
			)}
		>
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
	backgroundColor,
	toggleColumn
}: {
	index: number;
	title: string;
	status: any;
	setColumn: any;
	backgroundColor: any;
	items: TTask[];
	toggleColumn: (column: string, status: boolean) => Promise<void>;
}) => {
	const [enabled, setEnabled] = useState(false);
	const t = useTranslations();
	// toggleColumn is now passed as prop instead of using useKanban hook

	useEffect(() => {
		const animation = requestAnimationFrame(() => setEnabled(true));

		return () => {
			cancelAnimationFrame(animation);
			setEnabled(false);
		};
	}, []);

	const { isOpen, closeModal, openModal } = useModal();
	const { isOpen: editIsOpen, closeModal: editCloseModal, openModal: editOpenModal } = useModal();
	const { canWriteRow, readOnlyHint } = useTaskSettingsAccess();
	const canEditStatus = canWriteRow(status);
	// The Create task entry also opens the status form of the header: only for a user who may save it
	const showsEditFormOnCreate = isOpen && canEditStatus;

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
							className="flex h-40 w-fit flex-row"
						>
							{title.length > 0 ? (
								<>
									<header
										className={cn(
											'flex relative flex-col gap-8 px-2 py-3 h-full text-center rounded-xl items-between w-fit min-h-[20rem] transition-colors',
											LANE_SURFACE,
											snapshot.isDragging &&
												'bg-card shadow-md shadow-black/6.5 hairline-ring ring-primary/40'
										)}
									>
										<div className="flex flex-col items-center gap-1">
											<ColumnToggleButton
												className={cn(columnIconButton, 'size-8 rotate-180')}
												canEdit={canEditStatus}
												readOnlyHint={readOnlyHint}
												onClick={() => toggleColumn(title, false)}
											/>
											<Popover>
												<PopoverTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="text-muted-foreground"
														aria-label={t('common.MORE_OPTIONS')}
													>
														<MoreHorizontal />
													</Button>
												</PopoverTrigger>
												<PopoverContent align="start" className={COLUMN_MENU_PANEL}>
													<button
														type="button"
														className={cn(MENU_ROW, 'w-full text-start')}
														onClick={() => openModal()}
													>
														<Plus />
														{t('hotkeys.CREATE_TASK')}
													</button>
													<hr className={cn(MENU_SEPARATOR, 'border-0')} />
													<StatusMenuItem
														label={t('common.EXPAND_COLUMN')}
														canEdit={canEditStatus}
														readOnlyHint={readOnlyHint}
														onClick={() => toggleColumn(title, false)}
													/>
													<StatusMenuItem
														label={t('common.EDIT_STATUS')}
														canEdit={canEditStatus}
														readOnlyHint={readOnlyHint}
														onClick={editOpenModal}
													/>
												</PopoverContent>
											</Popover>
										</div>
										{showsEditFormOnCreate && (
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
												<div className="flex items-center justify-center rounded-md bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
													{items.length}
												</div>
												<div>
													<h2
														className="flex flex-row items-center gap-2 h-full text-sm font-semibold capitalize text-foreground"
														{...provided.dragHandleProps}
														aria-label={`${title}`}
													>
														<span
															className="size-2 shrink-0 rounded-full"
															style={dataColorDotStyle(backgroundColor)}
														/>
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
	setColumn,
	status,
	items,
	snapshot,
	createTask,
	provided,
	backgroundColor,
	toggleColumn
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
	toggleColumn: (column: string, status: boolean) => Promise<void>;
}) => {
	// toggleColumn is now passed as prop instead of using useKanban hook
	const { isOpen, closeModal, openModal } = useModal();
	const t = useTranslations();
	const { canWriteRow, readOnlyHint } = useTaskSettingsAccess();
	const canEditStatus = canWriteRow(status);
	return (
		<>
			{title && (
				<header
					className={cn(
						'flex sticky inset-x-0 top-0 z-10 flex-row justify-between items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
						LANE_SURFACE,
						snapshot.isDragging && 'bg-card shadow-md shadow-black/6.5 hairline-ring ring-primary/40'
					)}
				>
					<div className="flex min-w-0 flex-row gap-2 items-center">
						<span
							className="chip-3d flex size-6 shrink-0 items-center justify-center rounded-md"
							style={dataColorChipStyle(backgroundColor)}
						>
							<TaskPropertyIcon kind="status" name={title} color={backgroundColor} className="size-3.5" />
						</span>
						<h2
							className="truncate text-sm font-semibold capitalize text-foreground"
							{...provided.dragHandleProps}
							aria-label={`${title} quote list`}
						>
							{title.split('-').join(' ')}
						</h2>
						<div className="flex items-center justify-center rounded-md bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
							{items?.length ?? '0'}
						</div>
					</div>
					<div className="flex flex-row gap-0.5 items-center">
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-muted-foreground"
									aria-label={t('common.MORE_OPTIONS')}
								>
									<MoreHorizontal />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className={COLUMN_MENU_PANEL}>
								<button
									type="button"
									className={cn(MENU_ROW, 'w-full text-start')}
									onClick={() => createTask()}
								>
									<Plus />
									{t('common.CREATE_TASK')}
								</button>
								<hr className={cn(MENU_SEPARATOR, 'border-0')} />
								<StatusMenuItem
									label={t('common.COLLAPSE_COLUMN')}
									canEdit={canEditStatus}
									readOnlyHint={readOnlyHint}
									onClick={() => toggleColumn(title, true)}
								/>
								<StatusMenuItem
									label={t('common.EDIT_STATUS')}
									canEdit={canEditStatus}
									readOnlyHint={readOnlyHint}
									onClick={openModal}
								/>
							</PopoverContent>
						</Popover>
						<ColumnToggleButton
							className={columnIconButton}
							canEdit={canEditStatus}
							readOnlyHint={readOnlyHint}
							onClick={() => toggleColumn(title, true)}
						/>
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
	allColumnsData,
	toggleColumn
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
	toggleColumn: (column: string, status: boolean) => Promise<void>;
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
							contentClassName="w-full min-w-0! px-1"
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							// style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
							className={cn(
								'relative flex h-fit min-h-[840px] flex-col rounded-xl px-1 py-2',
								LANE_WIDTH,
								LANE_SURFACE
							)}
							style={{
								height: `840px`,
								paddingBottom: `${containerRef && items && items.length > 1 ? 25 : '0'}px`
							}}
						>
							{title ? (
								<>
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
										toggleColumn={toggleColumn}
									/>
									<div className="flex flex-col">
										<KanbanDroppable
											isLoading={isLoading}
											title={title}
											droppableId={title}
											type={'TASK'}
											content={items}
											allColumnsData={allColumnsData}
										/>
										<button onClick={() => openModal()} className={addTaskRow}>
											<Plus className="size-4" />
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
