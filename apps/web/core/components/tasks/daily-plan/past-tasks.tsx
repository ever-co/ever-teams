import { formatDayPlanDate, yesterdayDate } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { FilterTabs } from '@/core/types/interfaces/task/task-card';

import { LazyTaskCard } from '@/core/components/optimized-components';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { clsxm, getDateString } from '@/core/lib/utils';
import TaskBlockCard from '../task-block-card';
import { filterDailyPlan, filterDailyPlansByEmployee } from '@/core/hooks/daily-plans/use-filter-date-range';
import { useMemo } from 'react';
import { TUser } from '@/core/types/schemas';
import { DragDropContext, Draggable, Droppable, DroppableProvided, DroppableStateSnapshot } from '@hello-pangea/dnd';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import DailyPlanTasksTableView from './table-view';
import { HorizontalSeparator } from '../../duplicated-components/separator';
import { EmptyPlans, PlanHeader } from '@/core/components/daily-plan';
import { useDailyPlan } from '@/core/hooks';

export function PastTasks({
	user,
	profile,
	currentTab = 'Past Tasks',
	employeeId: propsEmployeeId,
	filterByEmployee = false
}: {
	profile: any;
	currentTab?: FilterTabs;
	user?: TUser;
	employeeId?: string; // Accept employeeId directly from parent
	filterByEmployee?: boolean; // Filter tasks by employee (default: false = show all tasks)
}) {
	// Use employeeId from props if provided, otherwise calculate from user
	const employeeId = propsEmployeeId ?? user?.employee?.id ?? user?.employeeId ?? '';

	const { pastPlans } = useDailyPlan(employeeId);

	const view = useAtomValue(dailyPlanViewHeaderTabs);
	// Use a safe default instead of direct localStorage access
	const { date } = useDateRange('Past Tasks');

	// Use useMemo instead of useEffect to prevent infinite re-render loop
	// The previous useEffect was modifying pastPlans while depending on pastPlans, causing infinite loop
	const filteredPastPlans = useMemo(() => {
		// First apply date filtering
		let filteredData = filterDailyPlan(date as any, pastPlans);

		// Then filter tasks for specific user if filterByEmployee flag is enabled
		// By default (filterByEmployee = false), we show ALL tasks in the daily plan
		if (filterByEmployee && filteredData) {
			filteredData = filterDailyPlansByEmployee(filteredData, user);
		}

		return filteredData;
	}, [date, pastPlans, user, filterByEmployee]);
	if (!filteredPastPlans) return null;
	return (
		<div className="flex flex-col gap-6">
			{filteredPastPlans?.length > 0 ? (
				<DragDropContext
					onDragEnd={() => {
						/* TODO: Implement drag and drop for filtered plans */
					}}
				>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={[getDateString(yesterdayDate)]}
					>
						{filteredPastPlans?.map((plan) => (
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
								<AccordionContent className="pb-6 border-none bg-gray-100 dark:bg-dark--theme !px-4 !py-4 rounded-xl">
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
																		<LazyTaskCard
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
