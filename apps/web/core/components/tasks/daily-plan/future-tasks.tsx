import { formatDayPlanDate, handleDragAndDrop, tomorrowDate } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { EmptyPlans, PlanHeader } from '@/core/components/daily-plan';

import { LazyTaskCard } from '@/core/components/optimized-components';
import { useDailyPlan } from '@/core/hooks';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@/core/lib/utils';
import { useEffect, useState } from 'react';
import { filterDailyPlan } from '@/core/hooks/daily-plans/use-filter-date-range';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import DailyPlanTasksTableView from './table-view';
import { HorizontalSeparator } from '../../duplicated-components/separator';
import { IEmployee } from '@/core/types/interfaces/organization/employee';

export function FutureTasks({ profile, user }: { profile: any; user?: TUser }) {
	const { futurePlans } = useDailyPlan();
	// Use a safe default instead of direct localStorage access
	const { setDate, date } = useDateRange('Future Tasks');
	const [futureDailyPlanTasks, setFutureDailyPlanTasks] = useState<TDailyPlan[]>(futurePlans);
	useEffect(() => {
		setFutureDailyPlanTasks(filterDailyPlan(date as any, futurePlans));
	}, [date, setDate, futurePlans]);
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	useEffect(() => {
		let filteredData = futurePlans;

		// Filter tasks for specific user if provided
		if (user) {
			filteredData = filteredData
				.map((plan) => ({
					...plan,
					tasks: plan.tasks?.filter((task) =>
						task.members?.some((member: IEmployee) => member.userId === user.id)
					)
				}))
				.filter((plan) => plan.tasks && plan.tasks.length > 0);

			setFutureDailyPlanTasks(filterDailyPlan(date as any, filteredData));
		}
	}, [date, futurePlans, user]);

	return (
		<div className="flex flex-col gap-6">
			{futureDailyPlanTasks?.length > 0 ? (
				<DragDropContext
					onDragEnd={(result) => handleDragAndDrop(result, futureDailyPlanTasks, setFutureDailyPlanTasks)}
				>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={[tomorrowDate.toISOString().split('T')[0]]}
					>
						{futureDailyPlanTasks.map((plan, index) => (
							<AccordionItem
								value={plan.date.toString().split('T')[0]}
								key={plan.id}
								className="dark:border-slate-600 !border-none"
							>
								<AccordionTrigger className="!min-w-full text-start hover:no-underline">
									<div className="flex gap-3 justify-between items-center w-full">
										<div className="min-w-max text-lg">
											{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
										</div>
										<HorizontalSeparator />
									</div>
								</AccordionTrigger>
								<AccordionContent className="border-none bg-gray-100 dark:bg-dark--theme !px-4 !py-4 rounded-xl">
									<PlanHeader plan={plan} planMode="Future Tasks" />
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
											{(provided, snapshot) => (
												<ul
													ref={provided.innerRef}
													{...provided.droppableProps}
													className={clsxm(
														'flex-wrap border border-transparent',
														view === 'CARDS' && 'flex-col',
														'flex gap-2 pb-[1.5rem] flex-wrap',
														view === 'BLOCKS' && 'overflow-x-auto',
														snapshot.isDraggingOver ? 'bg-[lightblue]' : 'bg-transparent'
													)}
												>
													{plan.tasks?.map((task, index) =>
														view === 'CARDS' ? (
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
																			marginBottom: 4
																		}}
																	>
																		<LazyTaskCard
																			key={`${task.id}${plan.id}`}
																			isAuthUser={true}
																			activeAuthTask={true}
																			viewType={'dailyplan'}
																			task={task}
																			profile={profile}
																			type="HORIZONTAL"
																			taskBadgeClassName={`rounded-sm`}
																			taskTitleClassName="mt-[0.0625rem]"
																			plan={plan}
																			planMode="Future Tasks"
																			taskContentClassName="!w-72 !max-w-80" // UX: consistent card width across all tabs
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
																		<TaskBlockCard task={task} />
																	</div>
																)}
															</Draggable>
														)
													)}
													<>{provided.placeholder as React.ReactElement}</>
													{/*
													 * DELETE PLAN BUTTON MOVED TO PLAN HEADER
													 *
													 * The delete functionality for Future Tasks has been moved to
													 * the PlanHeader component to maintain consistency with the
													 * requested UX where the button appears at the header level
													 * with justify-between layout.
													 */}
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
