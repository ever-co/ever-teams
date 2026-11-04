import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Draggable, type DraggableProvided, type DraggableStateSnapshot } from '@hello-pangea/dnd';
import { IssuesView } from '@/core/constants/config/constants';
import { I_UserProfilePage } from '@/core/hooks';
import { cn } from '@/core/lib/helpers';
import { DragHandle } from '@/core/components/icons';
import { LazyTaskCard } from '@/core/components/optimized-components';
import {
	DRAGGABLE_TASK_LIST_SURFACE,
	DRAGGABLE_TASK_ROW_CONTAINER,
	TASK_GROUP_STACK
} from '@/core/components/tasks/task-row-recipes';
import TaskBlockCard from '../task-block-card';
import { FilterTabs } from '@/core/types/daily-plan-types';
import { TDailyPlan } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

export const DAY_GROUP_SURFACE_CLASS_NAME =
	'overflow-hidden rounded-xl border-none bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

export const DAY_GROUP_TRIGGER_CLASS_NAME = 'h-12 px-4 py-0 text-start hover:no-underline';

export const DAY_GROUP_CONTENT_CLASS_NAME = 'hairline-t border-border p-0';

export const DAY_GROUP_LIST_CLASS_NAME = 'flex flex-col gap-3 text-sm';

export const COUNT_CHIP_CLASS_NAME =
	'rounded-sm bg-foreground/5 px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground';

/** Turns a task card into a hairline row of the group surface. */
export const FLAT_TASK_ROW_CLASS_NAME = 'rounded-none bg-transparent shadow-none ring-0';

/** Blocks lie on a tinted lane, since each block card carries its own ring. */
const BLOCKS_LANE_CLASS_NAME = 'flex flex-wrap gap-2 overflow-x-auto rounded-xl bg-foreground/[0.03] p-3';

const DRAGGING_OVER_CLASS_NAME = 'bg-primary/[0.04] ring-primary/30';

const LIFTED_ROW_CLASS_NAME = 'rounded-lg shadow-md shadow-black/10 hairline-ring ring-border';

const DRAG_GRIP_CLASS_NAME =
	'flex w-5 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground/70 opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 group-hover/plan-row:opacity-100 data-[dragging=true]:opacity-100 [@media(hover:none)]:opacity-100 [&_svg]:size-3.5';

export function dayGroupClassName(_view: IssuesView) {
	return TASK_GROUP_STACK;
}

export function droppableDirectionFor(view: IssuesView) {
	if (view === IssuesView.CARDS) {
		return 'vertical' as const;
	}
	return 'horizontal' as const;
}

export function planTaskListClassName(view: IssuesView, isDraggingOver: boolean) {
	const isCardsView = view === IssuesView.CARDS;
	return cn(
		isCardsView && DRAGGABLE_TASK_LIST_SURFACE,
		!isCardsView && BLOCKS_LANE_CLASS_NAME,
		isDraggingOver && DRAGGING_OVER_CLASS_NAME
	);
}

export function DayGroupHeading({ date, count }: Readonly<{ date: ReactNode; count: number | undefined }>) {
	const hasCount = typeof count === 'number';
	return (
		<div className="flex min-w-0 flex-1 items-center gap-2">
			<span className="truncate text-sm font-semibold tabular-nums text-foreground">{date}</span>
			{hasCount && <span className={COUNT_CHIP_CLASS_NAME}>{count}</span>}
		</div>
	);
}

type PlanTaskDraggableProps = {
	task: TTask;
	index: number;
	view: IssuesView;
	profile: I_UserProfilePage;
	plan?: TDailyPlan;
	planMode?: FilterTabs;
	taskContentClassName?: string;
};

function draggableItemStyle(provided: DraggableProvided, isCardsView: boolean) {
	if (isCardsView) {
		return provided.draggableProps.style;
	}
	return { ...provided.draggableProps.style, marginBottom: 8 };
}

/** A block card is dragged by its whole body; a row is dragged by its grip, so its own controls stay plain. */
function blockHandlePropsOf(provided: DraggableProvided, isCardsView: boolean) {
	if (isCardsView) {
		return undefined;
	}
	return provided.dragHandleProps ?? undefined;
}

function rowClassNameOf(isDragging: boolean) {
	return cn(
		'group/plan-row flex items-stretch bg-card',
		DRAGGABLE_TASK_ROW_CONTAINER,
		isDragging && LIFTED_ROW_CLASS_NAME
	);
}

function PlanRowGrip({
	provided,
	snapshot
}: Readonly<{ provided: DraggableProvided; snapshot: DraggableStateSnapshot }>) {
	const t = useTranslations();
	return (
		<span
			{...provided.dragHandleProps}
			aria-label={t('settings.taskProperties.DRAG')}
			data-dragging={snapshot.isDragging}
			className={DRAG_GRIP_CLASS_NAME}
		>
			<DragHandle aria-hidden="true" />
		</span>
	);
}

export function PlanTaskDraggable({
	task,
	index,
	view,
	profile,
	plan,
	planMode,
	taskContentClassName
}: Readonly<PlanTaskDraggableProps>) {
	const isCardsView = view === IssuesView.CARDS;

	return (
		<Draggable draggableId={task.id} index={index}>
			{(provided, snapshot) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...blockHandlePropsOf(provided, isCardsView)}
					style={draggableItemStyle(provided, isCardsView)}
					className={cn(isCardsView && rowClassNameOf(snapshot.isDragging))}
				>
					{isCardsView && <PlanRowGrip provided={provided} snapshot={snapshot} />}
					{isCardsView && (
						<div className="min-w-0 flex-1">
							<LazyTaskCard
								isAuthUser={true}
								activeAuthTask={true}
								viewType={'dailyplan'}
								task={task}
								profile={profile}
								type="HORIZONTAL"
								taskBadgeClassName={`rounded-sm`}
								taskTitleClassName="mt-[0.0625rem]"
								plan={plan}
								planMode={planMode}
								taskContentClassName={taskContentClassName}
								className={FLAT_TASK_ROW_CLASS_NAME}
							/>
						</div>
					)}
					{!isCardsView && <TaskBlockCard task={task} />}
				</div>
			)}
		</Draggable>
	);
}
