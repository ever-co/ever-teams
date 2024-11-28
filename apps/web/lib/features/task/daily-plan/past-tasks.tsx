import { formatDayPlanDate, handleDragAndDrop, yesterdayDate } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, FilterTabs, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import { HorizontalSeparator } from 'lib/components';
import { clsxm } from '@app/utils';
import TaskBlockCard from '../task-block-card';
import { filterDailyPlan } from '@app/hooks/useFilterDateRange';
import { useEffect, useState } from 'react';
import { IDailyPlan } from '@app/interfaces';
import { DragDropContext, Draggable, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';
import { useDateRange } from '@app/hooks/useDateRange';
import DailyPlanTasksTableView from './table-view';

export function PastTasks({ profile, currentTab = 'Past Tasks' }: { profile: any; currentTab?: FilterTabs }) {
	const { pastPlans } = useDailyPlan();

	const view = useAtomValue(dailyPlanViewHeaderTabs);
	const [pastTasks, setPastTasks] = useState<IDailyPlan[]>(pastPlans);
	const { date } = useDateRange(window.localStorage.getItem('daily-plan-tab'));

	useEffect(() => {
		setPastTasks(filterDailyPlan(date as any, pastPlans));
	}, [date, pastPlans]);

	return (
		<div className="flex flex-col gap-6">
			{pastTasks?.length > 0 ? (
				<DragDropContext onDragEnd={(result) => handleDragAndDrop(result, pastPlans, setPastTasks)}>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={[yesterdayDate.toISOString().split('T')[0]]}
					>
						{pastTasks?.map((plan) => (
							<AccordionItem
								value={plan.date.toString().split('T')[0]}
								key={plan.id}
								className="dark:border-slate-600 !border-none"
							>
								<AccordionTrigger className="!min-w-full text-start hover:no-underline">
									<div className="flex items-center justify-between gap-3 w-full">
										<div className="text-lg min-w-max">
											{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
										</div>
										<HorizontalSeparator />
									</div>
								</AccordionTrigger>
								<AccordionContent className="border-none dark:bg-dark--theme pb-6">
									{/* Plan header */}
									<PlanHeader plan={plan} planMode="Outstanding" />
									{view === 'TABLE' ? (
										<DailyPlanTasksTableView
											profile={profile}
											plan={plan}
											data={plan.tasks ?? []}
										/>
									) : (
										<Droppable
											droppableId={plan.id as string}
											key={plan.id}
											type="task"
											direction={view === 'CARDS' ? 'vertical' : 'horizontal'}
										>
											{(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
												<ul
													ref={provided.innerRef}
													{...provided.droppableProps}
													className={clsxm(
														'flex-wrap',
														view === 'CARDS' && 'flex-col',
														'flex gap-2 pb-[1.5rem]',
														view === 'BLOCKS' && 'overflow-x-auto',
														snapshot.isDraggingOver ? 'lightblue' : '#F7F7F8'
													)}
												>
													{plan.tasks?.map((task, index) =>
														view === 'CARDS' ? (
															<Draggable key={index} draggableId={task.id} index={index}>
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
																			key={`${task.id}${plan.id}`}
																			isAuthUser={true}
																			activeAuthTask={true}
																			viewType={'dailyplan'}
																			task={task}
																			profile={profile}
																			plan={plan}
																			type="HORIZONTAL"
																			taskBadgeClassName={`rounded-sm`}
																			taskTitleClassName="mt-[0.0625rem]"
																			planMode={
																				currentTab === 'Past Tasks'
																					? 'Past Tasks'
																					: undefined
																			}
																			className="shadow-[0px_0px_15px_0px_#e2e8f0]"
																		/>
																	</div>
																)}
															</Draggable>
														) : (
															<Draggable
																key={task.id}
																draggableId={task.id}
																index={index}
															>
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
														)
													)}
												</ul>
											)}
										</Droppable>
									)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</DragDropContext>
			) : (
				<EmptyPlans planMode="Past Tasks" />
			)}
		</div>
	);
}
