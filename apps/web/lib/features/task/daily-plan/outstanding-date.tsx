import { formatDayPlanDate, handleDragAndDrop } from '@app/helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { EmptyPlans, PlanHeader } from 'lib/features/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@app/hooks';
import { HorizontalSeparator } from 'lib/components';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@app/utils';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@app/stores/header-tabs';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useState } from 'react';
import { IDailyPlan } from '@app/interfaces';

interface IOutstandingFilterDate {
	profile: any;
}
export function OutstandingFilterDate({ profile }: IOutstandingFilterDate) {
	const { outstandingPlans } = useDailyPlan();
	const view = useAtomValue(dailyPlanViewHeaderTabs);
	const [outstandingTasks, setOutstandingTasks] = useState<IDailyPlan[]>(outstandingPlans);
	return (
		<div className="flex flex-col gap-6">
			{outstandingTasks?.length > 0 ? (
				<DragDropContext
					onDragEnd={(result) => handleDragAndDrop(result, outstandingTasks, setOutstandingTasks)}
				>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={outstandingTasks?.map((plan) => new Date(plan.date).toISOString().split('T')[0])}
					>
						{outstandingTasks?.map((plan) => (
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
								<AccordionContent className="pb-12 bg-transparent border-none dark:bg-dark--theme">
									{/* Plan header */}
									<PlanHeader plan={plan} planMode="Outstanding" />
									<Droppable droppableId={plan.id as string} key={plan.id} type="task">
										{(provided) => (
											<ul
												ref={provided.innerRef}
												{...provided.droppableProps}
												className={clsxm(
													'flex-wrap',
													view === 'CARDS' && 'flex-col',
													view === 'TABLE' && 'flex-wrap',
													'flex gap-2 pb-[1.5rem]',
													view === 'BLOCKS' && 'overflow-x-auto'
												)}
											>
												{plan.tasks?.map((task, index) =>
													view === 'CARDS' ? (
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
																		planMode="Outstanding"
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
													)
												)}
											</ul>
										)}
										{/* <>{provided.placeholder}</> */}
										{/* Plan tasks list */}
									</Droppable>
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</DragDropContext>
			) : (
				<EmptyPlans planMode="Outstanding" />
			)}
		</div>
	);
}
