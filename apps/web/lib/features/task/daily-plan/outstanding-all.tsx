import { EmptyPlans } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';
import { TaskEstimatedCount } from '.';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@app/utils';
import { DragDropContext, Draggable, Droppable, DroppableProvided } from 'react-beautiful-dnd';
import { useState } from 'react';
import { ITeamTask } from '@app/interfaces';
import { handleDragAndDropDailyOutstandingAll } from '@app/helpers';

interface OutstandingAll {
	profile: any;
}
export function OutstandingAll({ profile }: OutstandingAll) {
	const { outstandingPlans } = useDailyPlan();
	const view = useAtomValue(dailyPlanViewHeaderTabs);
	const displayedTaskId = new Set();

	const tasks = outstandingPlans.map((plan) => plan.tasks).reduce((red, curr) => red?.concat(curr || []), []);
	const [task, setTask] = useState<ITeamTask[]>(() => tasks ?? []);

	return (
		<div className="flex flex-col gap-6">
			<TaskEstimatedCount outstandingPlans={outstandingPlans} />

			{tasks && tasks?.length > 0 ? (
				<>
					<DragDropContext
						onDragEnd={(result) => handleDragAndDropDailyOutstandingAll(result, task, setTask)}
					>
						{/* <PlanHeader plan={plan} planMode="Outstanding" /> */}
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
									{tasks?.map((task, index) => {
										//If the task is already displayed, skip it
										if (displayedTaskId.has(task.id)) {
											return null;
										}
										// Add the task to the Set to avoid displaying it again
										displayedTaskId.add(task.id);
										return view === 'CARDS' ? (
											<Draggable key={task.id} draggableId={task.id} index={index}>
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
														<TaskCard
															key={`${task.id}`}
															isAuthUser={true}
															activeAuthTask={true}
															viewType={'dailyplan'}
															task={task}
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
											<Draggable key={task.id} draggableId={task.id} index={index}>
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
														<TaskBlockCard key={task.id} task={task} />
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
