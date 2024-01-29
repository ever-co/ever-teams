import { useKanban } from '@app/hooks/features/useKanban';
import { ITaskStatus, ITaskStatusItemList, ITeamTask } from '@app/interfaces';
import { IKanban } from '@app/interfaces/IKanban';
import { clsxm } from '@app/utils';
import KanbanDraggable, { EmptyKanbanDroppable } from 'lib/components/Kanban';
import React from 'react';
import { useEffect, useState } from 'react';
import {
	DragDropContext,
	DraggableLocation,
	DropResult,
	Droppable,
	DroppableProvided,
	DroppableStateSnapshot
} from 'react-beautiful-dnd';

export const KanbanView = ({ kanbanBoardTasks }: { kanbanBoardTasks: IKanban }) => {
	const {
		data: items,
		columns: kanbanColumns,
		updateKanbanBoard,
		updateTaskStatus,
		isColumnCollapse,
		reorderStatus,
		addNewTask
	} = useKanban();

	// const [items, setItems] = useState<IKanban>({
	// 	...kanbanBoardTasks,
	// 	open: [
	// 		{
	// 			id: '1',
	// 			createdAt: '2021-05-25T07:47:00.000Z',
	// 			updatedAt: '2021-05-25T07:47:00.000Z',
	// 			tenantId: '1',
	// 			organizationId: '1',
	// 			number: 1,
	// 			prefix: '1',
	// 			title: 'test',
	// 			description: 'test',
	// 			estimate: null,
	// 			dueDate: '2021-05-25T07:47:00.000Z',
	// 			startDate: null,
	// 			projectId: '1',
	// 			public: false,
	// 			creatorId: '1',
	// 			members: [],
	// 			tags: [],
	// 			teams: [],
	// 			linkedIssues: [],
	// 			creator: {
	// 				id: '1',
	// 				createdAt: '2021-05-25T07:47:00.000Z',
	// 				updatedAt: '2021-05-25T07:47:00.000Z',
	// 				tenantId: '1',
	// 				thirdPartyId: null,
	// 				firstName: 'Super',
	// 				lastName: 'Admin',
	// 				email: 'anish@gmail.com',
	// 				username: null,
	// 				hash: '$2b$10$2JQd3Y3J2mFZ3n9KXl9Z2e2J5z1aKv4mXJX3aYn1QjO6f3jZ6D6cG',
	// 				refreshToken: null,
	// 				imageUrl: 'null',
	// 				preferredLanguage: 'null',
	// 				preferredComponentLayout: 'null',
	// 				isActive: true,
	// 				roleId: '1',
	// 				name: 'Super Admin',
	// 				employeeId: null
	// 			},
	// 			taskNumber: '1',
	// 			label: 'test',
	// 			parentId: 'null',
	// 			issueType: 'Task',
	// 			rootEpic: null,
	// 			status: 'open',
	// 			size: 'Large',
	// 			priority: 'Highest',
	// 			version: '1',
	// 			epic: '1',
	// 			project: '1',
	// 			team: '1',
	// 			totalWorkedTime: 0,
	// 			estimateDays: 0,
	// 			estimateHours: 0,
	// 			estimateMinutes: 0
	// 		}
	// 	]
	// });
	console.log('kanbanBoardTaskskanbanBoardTasks', kanbanBoardTasks);
	const [columns, setColumn] = useState<string[]>(Object.keys(kanbanBoardTasks));

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

		// moving to same list
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

		// remove from original
		currentTaskStatus.splice(sourceIndex, 1);

		const taskstatus = destinationDroppableID as ITaskStatus;

		const updateTaskStatusData = { ...targetStatus, status: taskstatus };

		// update task status on server
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
		const selectState = columns.filter((item: ITaskStatusItemList) => {
			return item.name === column;
		});

		return selectState[0].color;
	};
	function reorderColumn(column: any[], sourceIndex: number, destinationIndex: number) {
		const result = Array.from(column);
		const [removed] = result.splice(sourceIndex, 1);
		result.splice(destinationIndex, 0, removed);

		return result;
	}
	/**
	 * This function handles all drag and drop logic
	 * on the kanban board.
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
			console.log('resultresult', result);

			//update column order in server side
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

		// setItems(data.kanbanBoard);
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

	if (!enabled) return null;

	console.log('column', columns);
	return (
		<>
			<DragDropContext onDragEnd={onDragEnd}>
				{columns.length > 0 && (
					<Droppable droppableId="droppable" type="COLUMN" direction="horizontal">
						{(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
							<div
								className={clsxm(
									'flex flex-row justify-start overflow-x-auto scro w-full min-h-[600px] p-[32px] bg-transparent dark:bg-[#181920]',
									snapshot.isDraggingOver ? 'lightblue' : '#F7F7F8'
								)}
								ref={provided.innerRef}
								{...provided.droppableProps}
							>
								{columns.length > 0 ? (
									<>
										{columns.map((column: string, index: number) => {
											return (
												<React.Fragment key={index}>
													<div className="flex flex-col " key={index}>
														{isColumnCollapse(column) ? (
															<EmptyKanbanDroppable
																index={index}
																title={column}
																items={items[column]}
																backgroundColor={getHeaderBackground(
																	kanbanColumns,
																	column
																)}
															/>
														) : (
															<>
																<KanbanDraggable
																	key={index}
																	index={index}
																	addNewTask={addNewTask}
																	title={column}
																	items={items[column]}
																	backgroundColor={getHeaderBackground(
																		kanbanColumns,
																		column
																	)}
																/>
															</>
														)}
													</div>
												</React.Fragment>
											);
										})}
									</>
								) : null}
								<>{provided.placeholder}</>
							</div>
						)}
					</Droppable>
				)}
			</DragDropContext>
		</>
	);
};
