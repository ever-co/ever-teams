import { formatDayPlanDate, handleDragAndDrop } from '@/core/lib/helpers/index';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { EmptyPlans, PlanHeader } from '@/core/components/daily-plan';
import { TaskCard } from '../task-card';
import { useDailyPlan } from '@/core/hooks';
import TaskBlockCard from '../task-block-card';
import { clsxm } from '@/core/lib/utils';
import { useAtomValue } from 'jotai';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useMemo, useCallback } from 'react';
import { TUser } from '@/core/types/schemas';
import { HorizontalSeparator } from '../../duplicated-components/separator';
import DailyPlanTasksTableView from './table-view';
import { TTask } from '@/core/types/schemas/task/task.schema';

interface IOutstandingFilterDate {
	profile: any;
	user?: TUser;
}
export function OutstandingFilterDate({ profile, user }: IOutstandingFilterDate) {
	const { outstandingPlans } = useDailyPlan();
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	// Optimized plans filtering with useMemo to prevent unnecessary recalculations
	const filteredPlans = useMemo(() => {
		if (!user) return outstandingPlans;

		return outstandingPlans
			.map((plan) => ({
				...plan,
				tasks: plan.tasks?.filter((task) => task.members?.some((member) => member.userId === user.id))
			}))
			.filter((plan) => plan.tasks && plan.tasks.length > 0);
	}, [outstandingPlans, user]);

	// Optimized style objects - created once, not on every render
	const draggableStyle = useMemo(() => ({ marginBottom: 8 }), []);

	// Optimized task rendering function
	const renderTask = useCallback(
		(task: TTask, index: number, planId: string) => {
			const TaskComponent =
				view === 'CARDS' ? (
					<TaskCard
						key={`${task.id}${planId}`}
						isAuthUser={true}
						activeAuthTask={true}
						viewType={'dailyplan'}
						task={task}
						profile={profile}
						type="HORIZONTAL"
						taskBadgeClassName="rounded-sm"
						taskTitleClassName="mt-[0.0625rem]"
						planMode="Outstanding"
						taskContentClassName="!w-72 !max-w-80"
					/>
				) : (
					<TaskBlockCard key={task.id} task={task} />
				);

			return (
				<Draggable key={task.id} draggableId={task.id} index={index}>
					{(provided) => (
						<div
							ref={provided.innerRef}
							{...provided.draggableProps}
							{...provided.dragHandleProps}
							style={{
								...provided.draggableProps.style,
								...draggableStyle
							}}
						>
							{TaskComponent}
						</div>
					)}
				</Draggable>
			);
		},
		[view, profile, draggableStyle]
	);

	// No useEffect needed - filteredPlans is already optimized with useMemo

	return (
		<div className="flex flex-col gap-6">
			{filteredPlans?.length > 0 ? (
				<DragDropContext onDragEnd={(result) => handleDragAndDrop(result, filteredPlans, () => {})}>
					<Accordion
						type="multiple"
						className="text-sm"
						defaultValue={filteredPlans?.map((plan) => new Date(plan.date).toISOString().split('T')[0])}
					>
						{filteredPlans?.map((plan) => (
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
								<AccordionContent className="pb-12 bg-transparent border-none dark:bg-dark--theme">
									<PlanHeader plan={plan} planMode="Outstanding" />
									{view === 'TABLE' ? (
										<DailyPlanTasksTableView
											profile={profile}
											plan={plan}
											data={plan.tasks ?? []}
											planMode="Outstanding"
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
														renderTask(task, index, plan.id as string)
													)}
													{provided.placeholder}
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
				<EmptyPlans planMode="Outstanding" />
			)}
		</div>
	);
}
