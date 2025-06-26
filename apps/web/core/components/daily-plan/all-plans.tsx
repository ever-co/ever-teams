'use client';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';

import { formatDayPlanDate } from '@/core/lib/helpers/index';
import { handleDragAndDrop } from '@/core/lib/helpers/drag-and-drop';
import { FilterTabs, useDailyPlan } from '@/core/hooks';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { filterDailyPlan } from '@/core/hooks/daily-plans/use-filter-date-range';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common';
import { clsxm } from '@/core/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import TaskBlockCard from '@/core/components/tasks/task-block-card';
import { LazyTaskCard } from '@/core/components/tasks/optimized-tasks-components';
import DailyPlanTasksTableView from '@/core/components/tasks/daily-plan/table-view';
import { HorizontalSeparator } from '@/core/components/duplicated-components/separator';
import { PlanHeader } from './plan-header';
import { EmptyPlans } from './empty-plans';

/**
 *
 *
 * @param {{ profile: any; currentTab?: FilterTabs }} { profile, currentTab = 'All Tasks' }
 * @return {*}
 */
export function AllPlans({
	profile,
	currentTab = 'All Tasks',
	user
}: {
	profile: any;
	currentTab?: FilterTabs;
	user?: TUser;
}) {
	// Filter plans
	const filteredPlans = useRef<TDailyPlan[]>([]);
	const { sortedPlans, todayPlan } = useDailyPlan();
	const { date } = useDateRange(currentTab);

	if (currentTab === 'Today Tasks') {
		filteredPlans.current = todayPlan;
	} else {
		filteredPlans.current = sortedPlans;
	}

	const view = useAtomValue(dailyPlanViewHeaderTabs);

	const [plans, setPlans] = useState(filteredPlans.current);

	useEffect(() => {
		setPlans(filterDailyPlan(date as any, filteredPlans.current));
	}, [date, todayPlan]);

	useEffect(() => {
		let filteredData = filterDailyPlan(date as any, filteredPlans.current);

		// Filter tasks for specific user if provided
		if (user) {
			filteredData = filteredData
				.map((plan) => ({
					...plan,
					tasks: plan.tasks?.filter((task) => task.members?.some((member) => member.userId === user.id))
				}))
				.filter((plan) => plan.tasks && plan.tasks.length > 0);
		}

		setPlans(filteredData);
	}, [date, todayPlan, user]);

	return (
		<div className="flex flex-col gap-6">
			{Array.isArray(plans) && plans?.length > 0 ? (
				// @ts-ignore
				<DragDropContext onDragEnd={(result) => handleDragAndDrop(result, plans, setPlans)}>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={
							currentTab === 'Today Tasks'
								? [new Date().toISOString().split('T')[0]]
								: [plans?.map((plan) => new Date(plan.date).toISOString().split('T')[0])[0]]
						}
					>
						{plans.map((plan) => (
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
								<AccordionContent className="bg-transparent border-none dark:bg-dark--theme">
									<PlanHeader plan={plan} planMode={currentTab as any} />

									{view === 'TABLE' ? (
										<DailyPlanTasksTableView
											profile={profile}
											plan={plan}
											data={plan.tasks ?? []}
										/>
									) : (
										// @ts-ignore
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
														'flex-wrap border border-transparent',
														view === 'CARDS' && 'flex-col',
														'flex gap-2 pb-[1.5rem] flex-wrap',
														view === 'BLOCKS' && 'overflow-x-auto',
														snapshot.isDraggingOver ? 'bg-[lightblue]' : 'bg-transparent'
													)}
												>
													{plan.tasks?.map((task, index) =>
														view === 'CARDS' ? (
															// @ts-ignore
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
																			marginBottom: 6
																		}}
																	>
																		<LazyTaskCard
																			isAuthUser={true}
																			activeAuthTask={true}
																			viewType={'dailyplan'}
																			task={task}
																			profile={profile}
																			type="HORIZONTAL"
																			taskBadgeClassName={`rounded-sm`}
																			taskTitleClassName="mt-[0.0625rem]"
																			planMode={
																				currentTab === 'Today Tasks'
																					? 'Today Tasks'
																					: undefined
																			}
																			plan={plan}
																			className="shadow-[0px_0px_15px_0px_#e2e8f0]"
																		/>
																	</div>
																)}
															</Draggable>
														) : (
															///@ts-ignore
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
													{provided.placeholder as React.ReactElement}
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
