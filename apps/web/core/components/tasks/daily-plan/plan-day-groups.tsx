'use client';

import { useState } from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Accordion, AccordionContent, AccordionItem } from '@/core/components/common/accordion';
import { ChevronRight } from '@/core/components/icons';
import { PlanHeader } from '@/core/components/daily-plan/plan-header';
import { PendingPlanCardsFor } from '@/core/components/features/daily-plan/pending-plan-tasks';
import { TASK_GROUP_COUNT, TASK_LIST_SURFACE } from '@/core/components/tasks/task-row-recipes';
import { TaskListMemberProvider } from '@/core/components/tasks/task-list-member-context';
import { IssuesView } from '@/core/constants/config/constants';
import { I_UserProfilePage } from '@/core/hooks';
import { FilterTabs } from '@/core/types/daily-plan-types';
import { TDailyPlan } from '@/core/types/schemas';
import DailyPlanTasksTableView from './table-view';
import {
	DAY_GROUP_LIST_CLASS_NAME,
	PlanTaskDraggable,
	droppableDirectionFor,
	planTaskListClassName
} from './day-group';
import { usePlanDayLabel } from './plan-day-label';
import { planDayKeyOf } from './plan-picks';

const LABEL_LINE_CLASS_NAME = 'flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1';

const TOGGLE_CLASS_NAME =
	'-ml-1.5 inline-flex h-7 min-w-0 items-center gap-2 rounded-md px-1.5 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground [&>svg]:transition-transform [&>svg]:duration-200 data-panel-open:[&>svg]:rotate-90';

interface PlanDayGroupModes {
	headerMode: FilterTabs;
	rowPlanMode?: FilterTabs;
	tablePlanMode?: FilterTabs;
	/** The outstanding view gives its rows no plan, so their menu offers no plan actions. */
	passesPlanToRows?: boolean;
	showsPendingCards?: boolean;
}

interface PlanDayGroupListProps extends PlanDayGroupModes {
	plans: TDailyPlan[];
	onDragEnd: (result: DropResult) => void;
	defaultOpenDays: string[];
	view: IssuesView;
	profile: I_UserProfilePage;
}

interface PlanDayGroupProps extends PlanDayGroupModes {
	plan: TDailyPlan;
	isOpen: boolean;
	view: IssuesView;
	profile: I_UserProfilePage;
}

function rowPlanOf(plan: TDailyPlan, passesPlanToRows: boolean) {
	if (passesPlanToRows) {
		return plan;
	}
	return undefined;
}

function PlanDayRows({
	plan,
	view,
	profile,
	rowPlanMode,
	tablePlanMode,
	passesPlanToRows = true,
	showsPendingCards = false
}: Readonly<Omit<PlanDayGroupProps, 'isOpen' | 'headerMode'>>) {
	const isTableView = view === IssuesView.TABLE;
	const rowPlan = rowPlanOf(plan, passesPlanToRows);

	if (isTableView) {
		return (
			<div className={TASK_LIST_SURFACE}>
				<DailyPlanTasksTableView
					profile={profile}
					plan={plan}
					data={plan.tasks ?? []}
					planMode={tablePlanMode}
				/>
			</div>
		);
	}

	return (
		<TaskListMemberProvider profile={profile}>
			<Droppable droppableId={plan.id as string} type="task" direction={droppableDirectionFor(view)}>
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={planTaskListClassName(view, snapshot.isDraggingOver)}
					>
						{plan.tasks?.map((task, index) => (
							<PlanTaskDraggable
								key={task.id}
								task={task}
								index={index}
								view={view}
								profile={profile}
								plan={rowPlan}
								planMode={rowPlanMode}
								taskContentClassName="!w-72 !max-w-80"
							/>
						))}
						{showsPendingCards && <PendingPlanCardsFor plan={plan} view={view} />}
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</TaskListMemberProvider>
	);
}

function PlanDayGroup({ plan, isOpen, headerMode, ...rowsProps }: Readonly<PlanDayGroupProps>) {
	const dayLabelOf = usePlanDayLabel();
	const hasCount = typeof plan.tasks?.length === 'number';

	return (
		<AccordionItem value={planDayKeyOf(plan)} className="flex flex-col border-none">
			<div className={LABEL_LINE_CLASS_NAME}>
				<AccordionPrimitive.Header className="flex min-w-0">
					<AccordionPrimitive.Trigger className={TOGGLE_CLASS_NAME}>
						<ChevronRight aria-hidden="true" />
						<span className="truncate text-[13px] font-medium text-foreground">
							{dayLabelOf(plan.date)}
						</span>
						{hasCount && <span className={TASK_GROUP_COUNT}>{plan.tasks?.length}</span>}
					</AccordionPrimitive.Trigger>
				</AccordionPrimitive.Header>
				<PlanHeader plan={plan} planMode={headerMode} isOpen={isOpen} />
			</div>
			<AccordionContent className="p-0 pt-2">
				<PlanDayRows plan={plan} {...rowsProps} />
			</AccordionContent>
		</AccordionItem>
	);
}

export function PlanDayGroupList({
	plans,
	onDragEnd,
	defaultOpenDays,
	...groupProps
}: Readonly<PlanDayGroupListProps>) {
	const [openDays, setOpenDays] = useState<string[]>(defaultOpenDays);
	// A new day (after midnight) opens its plan again; renders of the same day keep what the user opened or closed.
	const defaultDaysKey = defaultOpenDays.join(',');
	const [openDaysKey, setOpenDaysKey] = useState(defaultDaysKey);
	const isNewDefaultDay = openDaysKey !== defaultDaysKey;
	if (isNewDefaultDay) {
		setOpenDaysKey(defaultDaysKey);
		setOpenDays(defaultOpenDays);
	}

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<Accordion
				type="multiple"
				value={openDays}
				onValueChange={setOpenDays}
				className={DAY_GROUP_LIST_CLASS_NAME}
			>
				{plans.map((plan) => (
					<PlanDayGroup
						key={plan.id}
						plan={plan}
						isOpen={openDays.includes(planDayKeyOf(plan))}
						{...groupProps}
					/>
				))}
			</Accordion>
		</DragDropContext>
	);
}
