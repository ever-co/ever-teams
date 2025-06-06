import { formatDayPlanDate, handleDragAndDrop } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { EmptyPlans, PlanHeader } from '@/core/components/users/user-profile-plans';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@/core/hooks';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@/core/lib/utils';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useEffect, useState } from 'react';
import { IDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { TUser } from '@/core/types/schemas';
import { HorizontalSeparator } from '../../duplicated-components/separator';
import { ITask } from '@/core/types/interfaces/task/task';
import { IEmployee } from '@/core/types/interfaces/organization/employee';

interface IOutstandingFilterDate {
	profile: any;
	user?: TUser;
}
export function OutstandingFilterDate({ profile, user }: IOutstandingFilterDate) {
	const { outstandingPlans } = useDailyPlan();
	const view = useAtomValue(dailyPlanViewHeaderTabs);
	const [plans, setPlans] = useState<IDailyPlan[]>(outstandingPlans);

	useEffect(() => {
		let data = [...outstandingPlans];

		// Filter plans for specific user if provided
		if (user) {
			data = data
				.map((plan) => ({
					...plan,
					tasks: plan.tasks?.filter((task: ITask) =>
						task.members?.some((member: IEmployee) => member.userId === user.id)
					)
				}))
				.filter((plan) => plan.tasks && plan.tasks.length > 0);

			setPlans(data);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	return (
		<div className="flex flex-col gap-6">
			{plans?.length > 0 ? (
				<DragDropContext onDragEnd={(result) => handleDragAndDrop(result, plans, setPlans)}>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={plans?.map((plan) => new Date(plan.date).toISOString().split('T')[0])}
					>
						{plans?.map((plan) => (
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
