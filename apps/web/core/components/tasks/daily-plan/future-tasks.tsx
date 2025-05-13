import { formatDayPlanDate, handleDragAndDrop, tomorrowDate } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { EmptyPlans, PlanHeader } from '@/core/components/users/user-profile-plans';
import { TaskCard } from '../task-card';
import { Button } from '@/core/components/common/button2';
import { useCanSeeActivityScreen, useDailyPlan } from '@/core/hooks';
import { ReloadIcon } from '@radix-ui/react-icons';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/header-tabs';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@/core/lib/utils';
import { HorizontalSeparator, AlertPopup } from '@/core/components';
import { useEffect, useState } from 'react';
import { filterDailyPlan } from '@/core/hooks/daily-plans/use-filter-date-range';
import { IDailyPlan, IUser } from '@/core/types/interfaces';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import DailyPlanTasksTableView from './table-view';

export function FutureTasks({ profile, user }: { profile: any; user?: IUser }) {
	const { deleteDailyPlan, deleteDailyPlanLoading, futurePlans } = useDailyPlan();
	const canSeeActivity = useCanSeeActivityScreen();
	const [popupOpen, setPopupOpen] = useState(false);

	const [currentDeleteIndex, setCurrentDeleteIndex] = useState(0);
	const { setDate, date } = useDateRange(window.localStorage.getItem('daily-plan-tab'));
	const [futureDailyPlanTasks, setFutureDailyPlanTasks] = useState<IDailyPlan[]>(futurePlans);
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
					tasks: plan.tasks?.filter((task) => task.members?.some((member) => member.userId === user.id))
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
									<div className="flex items-center justify-between w-full gap-3">
										<div className="text-lg min-w-max">
											{formatDayPlanDate(plan.date.toString())} ({plan.tasks?.length})
										</div>
										<HorizontalSeparator />
									</div>
								</AccordionTrigger>
								<AccordionContent className="border-none dark:bg-dark--theme">
									<PlanHeader plan={plan} planMode="Future Tasks" />
									{view === 'TABLE' ? (
										<DailyPlanTasksTableView
											profile={profile}
											plan={plan}
											data={plan.tasks ?? []}
										/>
									) : (
										<Droppable droppableId={plan.id as string} key={plan.id} type="task">
											{(provided) => (
												<ul
													ref={provided.innerRef}
													{...provided.droppableProps}
													className={clsxm(
														'flex-wrap',
														view === 'CARDS' && 'flex-col',
														'flex gap-2 pb-[1.5rem]',
														view === 'BLOCKS' && 'overflow-x-auto'
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
																		<TaskCard
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
													{canSeeActivity ? (
														<div className="flex justify-end shrink-0">
															<AlertPopup
																open={currentDeleteIndex === index && popupOpen}
																buttonOpen={
																	//button open popup
																	<Button
																		onClick={() => {
																			setPopupOpen((prev) => !prev);
																			setCurrentDeleteIndex(index);
																		}}
																		variant="outline"
																		className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
																	>
																		Delete this plan
																	</Button>
																}
															>
																{/*button confirm*/}
																<Button
																	disabled={deleteDailyPlanLoading}
																	onClick={() => {
																		deleteDailyPlan(plan.id ?? '');
																	}}
																	variant="destructive"
																	className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
																>
																	{deleteDailyPlanLoading && (
																		<ReloadIcon className="w-4 h-4 mr-2 animate-spin" />
																	)}
																	Delete
																</Button>
																{/*button cancel*/}
																<Button
																	onClick={() => setPopupOpen(false)}
																	variant="outline"
																	className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md bg-light--theme-light dark:!bg-dark--theme-light"
																>
																	Cancel
																</Button>
															</AlertPopup>
														</div>
													) : (
														<></>
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
