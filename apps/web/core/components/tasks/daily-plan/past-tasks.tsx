import { formatDayPlanDate, handleDragAndDrop, yesterdayDate } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { FilterTabs } from '@/core/types/interfaces/task/task-card';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@/core/hooks';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { clsxm } from '@/core/lib/utils';
import TaskBlockCard from '../task-block-card';
import { filterDailyPlan } from '@/core/hooks/daily-plans/use-filter-date-range';
import { useEffect, useState } from 'react';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { DragDropContext, Draggable, Droppable, DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import DailyPlanTasksTableView from './table-view';
import { HorizontalSeparator } from '../../duplicated-components/separator';
import { EmptyPlans, PlanHeader } from '@/core/components/daily-plan';

export function PastTasks({
	user,
	profile,
	currentTab = 'Past Tasks'
}: {
	profile: any;
	currentTab?: FilterTabs;
	user?: TUser;
}) {
	const { pastPlans: _pastPlans } = useDailyPlan();

	const view = useAtomValue(dailyPlanViewHeaderTabs);
	const [pastPlans, setPastPlans] = useState<TDailyPlan[]>(_pastPlans);
	// Use a safe default instead of direct localStorage access
	const { date } = useDateRange('Past Tasks');

	useEffect(() => {
		setPastPlans(filterDailyPlan(date as any, pastPlans));
	}, [date, pastPlans]);

	useEffect(() => {
		let filteredData = pastPlans;

		// Filter tasks for specific user if provided
		if (user) {
			filteredData = filteredData
				.map((plan) => ({
					...plan,
					tasks: plan.tasks?.filter((task) => task.members?.some((member) => member.userId === user.id))
				}))
				.filter((plan) => plan.tasks && plan.tasks.length > 0);
		}

		setPastPlans(filteredData);
	}, [date, pastPlans, user]);

	return (
		<div className="flex flex-col gap-6">
			{pastPlans?.length > 0 ? (
				<DragDropContext onDragEnd={(result) => handleDragAndDrop(result, pastPlans, setPastPlans)}>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={[yesterdayDate.toISOString().split('T')[0]]}
					>
						{pastPlans?.map((plan) => (
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
								<AccordionContent className="pb-6 border-none dark:bg-dark--theme">
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
														snapshot.isDraggingOver
															? 'border-[lightblue] lightblue'
															: '#F7F7F8 border-[#F7F7F8]'
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
																			taskContentClassName="!w-72 !max-w-80"
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
