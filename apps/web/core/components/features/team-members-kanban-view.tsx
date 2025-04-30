import { useTaskStatus } from '@/core/hooks';
import { useKanban } from '@/core/hooks/features/useKanban';
import { ITaskStatusItemList, ITeamTask } from '@app/interfaces';
import { IKanban } from '@app/interfaces/IKanban';
import KanbanDraggable, { EmptyKanbanDroppable } from '@/core/components/Kanban';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
	DragDropContext,
	DraggableLocation,
	DropResult,
	Droppable,
	DroppableProvided,
	DroppableStateSnapshot
} from '@hello-pangea/dnd';
import { ScrollArea, ScrollBar } from '@/core/components/ui/scroll-area';
import { cn } from '@/core/lib/helpers';

export const KanbanView = ({ kanbanBoardTasks, isLoading }: { kanbanBoardTasks: IKanban; isLoading: boolean }) => {
	const {
		data: items,
		columns: kanbanColumns,
		updateKanbanBoard,
		updateTaskStatus,
		isColumnCollapse,
		reorderStatus,
		addNewTask
	} = useKanban();
	const [columns, setColumn] = useState<any[]>(
		Object.keys(kanbanBoardTasks).map((key) => {
			const columnInfo = kanbanColumns.find((item) => item.name === key);
			return {
				id: columnInfo?.id,
				name: key,
				icon: columnInfo ? columnInfo.fullIconUrl : '',
				color: columnInfo?.color
			};
		})
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const { taskStatuses } = useTaskStatus();
	const reorderTask = (list: ITeamTask[], startIndex: number, endIndex: number) => {
		const tasks = Array.from(list);
		const [removedTask] = tasks.splice(startIndex, 1);
		tasks.splice(endIndex, 0, removedTask);
		return tasks;
	};

	const reorderKanbanTasks = ({
		kanbanTasks,
		source,
		destination
	}: {
		kanbanTasks: IKanban;
		source: DraggableLocation;
		destination: DraggableLocation;
	}) => {
		const sourceDroppableID = source.droppableId;
		const destinationDroppableID = destination.droppableId;
		const sourceIndex = source.index;
		const destinationIndex = destination.index;
		const currentTaskStatus = [...kanbanTasks[sourceDroppableID]];
		const nextTaskStatus = [...kanbanTasks[destinationDroppableID]];
		const targetStatus = currentTaskStatus[source.index];

		// Moving to the same list
		if (sourceDroppableID === destinationDroppableID) {
			const reorderedKanbanTasks = reorderTask(currentTaskStatus, sourceIndex, destinationIndex);
			const result = {
				...kanbanTasks,
				[sourceDroppableID]: reorderedKanbanTasks
			};
			return {
				kanbanBoard: result
			};
		}

		// Remove from original
		currentTaskStatus.splice(sourceIndex, 1);

		const taskstatus = destinationDroppableID as any;

		const updateTaskStatusData = {
			...targetStatus,
			status: taskstatus,
			taskStatusId: taskStatuses.find((v) => v.name?.toLowerCase() == taskstatus.toLowerCase())?.id
		};

		// update task status on the server
		updateTaskStatus(updateTaskStatusData);

		// insert into next
		nextTaskStatus.splice(destinationIndex, 0, updateTaskStatusData);

		const result = {
			...kanbanTasks,
			[sourceDroppableID]: currentTaskStatus,
			[destinationDroppableID]: nextTaskStatus
		};

		return {
			kanbanBoard: result
		};
	};

	const getHeaderBackground = (columns: ITaskStatusItemList[], column: string) => {
		const selectState = columns.find((item: ITaskStatusItemList) => {
			return item.name === column;
		});

		return selectState?.color ?? 'white';
	};

	const reorderColumn = (column: any[], sourceIndex: number, destinationIndex: number) => {
		const result = Array.from(column);
		const [removed] = result.splice(sourceIndex, 1);
		result.splice(destinationIndex, 0, removed);

		return result;
	};

	/**
	 * This function handles all drag & drop logic
	 * on the Kanban board.
	 * @param result
	 * @returns
	 */
	const onDragEnd = (result: DropResult) => {
		if (result.combine) {
			if (result.type === 'COLUMN') {
				const shallow = [...columns];
				shallow.splice(result.source.index, 1);
				setColumn(shallow);
				return;
			}

			const item = items[result.source.droppableId];

			const withItemRemoved = [...item];

			withItemRemoved.splice(result.source.index, 1);

			const orderedItems = {
				...items,
				[result.source.droppableId]: withItemRemoved
			};

			updateKanbanBoard(orderedItems);

			return;
		}
		// dropped nowhere
		if (!result.destination) {
			return;
		}

		const source = result.source;
		const destination = result.destination;

		// did not move anywhere - can bail early
		if (source.droppableId === destination.droppableId && source.index === destination.index) {
			return;
		}

		if (result.type === 'COLUMN') {
			const reorderedItem = reorderColumn(columns, source.index, destination.index);

			// Update column order on the server side
			reorderedItem.map((item: string, index: number) => {
				return reorderStatus(item, index);
			});

			setColumn(reorderedItem);

			return;
		}

		const data = reorderKanbanTasks({
			kanbanTasks: items,
			source,
			destination
		});

		updateKanbanBoard(() => data.kanbanBoard);
	};

	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		const animation = requestAnimationFrame(() => setEnabled(true));

		return () => {
			cancelAnimationFrame(animation);
			setEnabled(false);
		};
	}, []);

	if (!enabled) return null; // ['open','close']

	return (
		<ScrollArea
			className="max-w-[95svw] w-full relative bg-transparent dark:bg-[#181920] min-h-svh h-svh px-3"
			ref={containerRef}
		>
			<div className="w-max">
				{/* @ts-ignore */}

				<DragDropContext onDragEnd={onDragEnd}>
					{Array.isArray(columns) && columns.length > 0 && (
						// @ts-ignore
						<Droppable droppableId="droppable" type="COLUMN" direction="horizontal">
							{(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
								<div
									className={cn(
										'flex flex-1 flex-row gap-4 min-h-fit px-8 lg:px-0 w-full h-full',
										snapshot.isDraggingOver ? 'bg-slate-200 dark:bg-slate-800' : ''
									)}
									ref={provided.innerRef}
									{...provided.droppableProps}
								>
									{columns.length > 0
										? columns.map((column: any, index: number) => (
												<Fragment key={index}>
													{isColumnCollapse(column.name) ? (
														<EmptyKanbanDroppable
															index={index}
															title={column.name}
															status={column}
															setColumn={setColumn}
															items={items[column.name]}
															backgroundColor={getHeaderBackground(
																kanbanColumns,
																column.name
															)}
														/>
													) : (
														<KanbanDraggable
															key={index}
															status={column}
															setColumn={setColumn}
															isLoading={isLoading}
															index={index}
															icon={column.icon}
															addNewTask={addNewTask}
															title={column.name}
															items={items[column.name]}
															backgroundColor={getHeaderBackground(
																kanbanColumns,
																column.name
															)}
															// @ts-ignore
															containerRef={containerRef}
														/>
													)}
												</Fragment>
											))
										: null}
									{provided.placeholder as React.ReactElement}
								</div>
							)}
						</Droppable>
					)}
				</DragDropContext>
			</div>
			<ScrollBar className="fixed bottom-[90px] left-0 w-full bg-transparent" orientation="horizontal" />
		</ScrollArea>
	);
};
