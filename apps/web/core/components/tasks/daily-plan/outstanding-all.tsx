import { EmptyPlans } from '@/core/components/daily-plan';

import { TaskEstimatedCount } from './task-estimated-count';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { DragDropContext, Droppable, DroppableProvided } from '@hello-pangea/dnd';
import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { I_UserProfilePage } from '@/core/hooks';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { handleDragAndDropDailyOutstandingAll } from '@/core/lib/helpers/index';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { filterDailyPlansByTasks } from '@/core/hooks/daily-plans/use-filter-date-range';
import { TASK_GROUP_STACK } from '@/core/components/tasks/task-row-recipes';
import { TaskListMemberProvider } from '@/core/components/tasks/task-list-member-context';
import { PlanTaskDraggable, droppableDirectionFor, planTaskListClassName } from './day-group';
import { keepPickedPlans } from './plan-picks';

interface OutstandingAllProps {
	profile: I_UserProfilePage;
	user?: TUser;
	outstandingPlans: TDailyPlan[];
	filteredTaskIds?: string[]; // Filter plans by taskIds (default undefined = show all)
	pickedPlanIds?: string[];
	emptyState?: ReactNode;
}

function uniqueTasksOf(plans: TDailyPlan[]) {
	const taskMap = new Map<string, TTask>();
	for (const task of plans.flatMap((plan) => plan.tasks ?? [])) {
		const isFirstSeen = Boolean(task?.id) && !taskMap.has(task.id);
		if (isFirstSeen) {
			taskMap.set(task.id, task);
		}
	}
	return Array.from(taskMap.values());
}

export function OutstandingAll({
	profile,
	user,
	outstandingPlans,
	filteredTaskIds,
	pickedPlanIds,
	emptyState
}: Readonly<OutstandingAllProps>) {
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	// This view lists one member's leftovers, so it keeps only the tasks that member is on whatever the caller asks
	const filterTasksByUser = useCallback(
		(tasks: TTask[]) => {
			if (!user?.id) return tasks;
			return tasks.filter((task) => task.members?.some((member) => member.userId === user.id));
		},
		[user?.id]
	);

	const filteredPlans = useMemo(() => {
		let filteredData = keepPickedPlans(outstandingPlans, pickedPlanIds);

		if (filteredTaskIds && filteredData) {
			filteredData = filterDailyPlansByTasks(filteredData, filteredTaskIds);
		}

		return filteredData
			.map((plan) => {
				let tasks = plan.tasks;
				if (user) {
					tasks = filterTasksByUser(plan.tasks ?? []);
				}
				return { ...plan, tasks };
			})
			.filter((plan) => plan.tasks && plan.tasks.length > 0);
	}, [outstandingPlans, filterTasksByUser, user, filteredTaskIds, pickedPlanIds]);

	// A task left in several past plans is listed once, so the count and the list agree
	const uniqueTasks = useMemo(() => uniqueTasksOf(filteredPlans), [filteredPlans]);

	const [dragTasks, setDragTasks] = useState<TTask[]>(uniqueTasks);

	useEffect(() => {
		setDragTasks(uniqueTasks);
	}, [uniqueTasks]);

	const hasTasks = uniqueTasks.length > 0;
	const showsDefaultEmpty = !hasTasks && !emptyState;

	return (
		<div className={TASK_GROUP_STACK}>
			<TaskEstimatedCount outstandingPlans={filteredPlans} />

			{hasTasks && (
				<DragDropContext
					onDragEnd={(result) => handleDragAndDropDailyOutstandingAll(result, dragTasks, setDragTasks)}
				>
					<TaskListMemberProvider profile={profile}>
						<Droppable droppableId="droppableId" type="COLUMN" direction={droppableDirectionFor(view)}>
							{(provided: DroppableProvided) => (
								<div
									ref={provided.innerRef}
									{...provided.droppableProps}
									className={planTaskListClassName(view, false)}
								>
									{uniqueTasks?.map((taskItem, index) => (
										<PlanTaskDraggable
											key={taskItem.id}
											task={taskItem}
											index={index}
											view={view}
											profile={profile}
											planMode="Outstanding"
										/>
									))}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</TaskListMemberProvider>
				</DragDropContext>
			)}
			{!hasTasks && emptyState}
			{showsDefaultEmpty && <EmptyPlans planMode="Outstanding" />}
		</div>
	);
}
