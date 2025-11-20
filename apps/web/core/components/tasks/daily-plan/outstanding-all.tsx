import { EmptyPlans } from '@/core/components/daily-plan';

import { LazyTaskCard } from '@/core/components/optimized-components';
import { TaskEstimatedCount } from '.';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@/core/lib/utils';
import { DragDropContext, Draggable, Droppable, DroppableProvided } from '@hello-pangea/dnd';
import { useState, useMemo, useEffect } from 'react';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { handleDragAndDropDailyOutstandingAll } from '@/core/lib/helpers/index';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { filterDailyPlansByEmployee } from '@/core/hooks/daily-plans/use-filter-date-range';

interface OutstandingAllProps {
	profile: any;
	user?: TUser;
	outstandingPlans: TDailyPlan[];
	filterByEmployee?: boolean; // Filter tasks by employee (default: false = show all tasks)
}
export function OutstandingAll({ profile, user, outstandingPlans, filterByEmployee = false }: OutstandingAllProps) {
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	// Memoized task deduplication to prevent unnecessary recalculations
	// This fixes the bug where duplicate tasks caused count/display mismatch
	const uniqueTasks = useMemo(() => {
		// Early return for empty data to avoid unnecessary processing
		if (!outstandingPlans.length) return [];

		// Filter plans by employee if flag is enabled
		const filteredPlans = filterByEmployee ? filterDailyPlansByEmployee(outstandingPlans, user) : outstandingPlans;

		// Flatten all tasks from filtered plans
		const allTasks = filteredPlans.flatMap((plan) => plan.tasks ?? []);

		// Use Map for deduplication by task ID to handle large datasets efficiently
		const taskMap = new Map<string, TTask>();
		allTasks.forEach((task) => {
			if (task?.id && !taskMap.has(task.id)) {
				taskMap.set(task.id, task);
			}
		});

		return Array.from(taskMap.values());
	}, [outstandingPlans, user, filterByEmployee]);

	// State for drag & drop functionality only
	const [dragTasks, setDragTasks] = useState<TTask[]>(uniqueTasks);

	// Sync drag state only when source data changes
	useEffect(() => {
		setDragTasks(uniqueTasks);
	}, [uniqueTasks]);

	// Create filtered plans for TaskEstimatedCount to match the displayed tasks
	const filteredPlansForCount = useMemo(() => {
		return filterByEmployee ? filterDailyPlansByEmployee(outstandingPlans, user) : outstandingPlans;
	}, [outstandingPlans, user, filterByEmployee]);

	return (
		<div className="flex flex-col gap-6">
			<TaskEstimatedCount outstandingPlans={filteredPlansForCount} />

			{uniqueTasks.length > 0 ? (
				<>
					<DragDropContext
						onDragEnd={(result) => handleDragAndDropDailyOutstandingAll(result, dragTasks, setDragTasks)}
					>
						<Droppable
							droppableId="droppableId"
							type="COLUMN"
							direction={view === 'CARDS' ? 'vertical' : 'horizontal'}
						>
							{(provided: DroppableProvided) => (
								<ul
									ref={provided.innerRef}
									{...provided.droppableProps}
									className={clsxm(
										'flex-wrap',
										view === 'CARDS' && 'flex-col',
										view === 'TABLE' || (view === 'BLOCKS' && 'flex-wrap'),
										'flex gap-2 pb-[1.5rem] overflow-x-auto !flex-wrap'
									)}
								>
									{uniqueTasks?.map((taskItem, index) => {
										return view === 'CARDS' ? (
											<Draggable key={taskItem.id} draggableId={taskItem.id} index={index}>
												{(provided) => (
													<div
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
														style={{
															...provided.draggableProps.style,
															marginBottom: 4
														}}
													>
														<LazyTaskCard
															key={`${taskItem.id}`}
															isAuthUser={true}
															activeAuthTask={true}
															viewType={'dailyplan'}
															task={taskItem}
															profile={profile}
															type="HORIZONTAL"
															taskBadgeClassName={`rounded-sm`}
															taskTitleClassName="mt-[0.0625rem]"
															planMode="Outstanding"
															className="shadow-[0px_0px_15px_0px_#e2e8f0]"
														/>
													</div>
												)}
											</Draggable>
										) : (
											<Draggable key={taskItem.id} draggableId={taskItem.id} index={index}>
												{(provided) => (
													<div
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
														style={{
															...provided.draggableProps.style,
															marginBottom: 8
														}}
													>
														<TaskBlockCard key={taskItem.id} task={taskItem} />
													</div>
												)}
											</Draggable>
										);
									})}
								</ul>
							)}
						</Droppable>
					</DragDropContext>
				</>
			) : (
				<EmptyPlans planMode="Outstanding" />
			)}
		</div>
	);
}
