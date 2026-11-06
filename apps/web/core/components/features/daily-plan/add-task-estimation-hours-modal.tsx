'use client';

import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import moment from 'moment';
import { useFormatter, useTranslations } from 'next-intl';
import { AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { DateGlyph } from '@/core/components/common/value-glyphs';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { usePlanEditor } from '@/core/hooks/daily-plans/use-plan-editor';
import { usePlanTaskActions } from '@/core/hooks/daily-plans/use-plan-task-actions';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { PlanEditor } from './plan-editor/plan-editor';
import { PlanTaskSearch } from './plan-editor/plan-task-search';

interface IAddTasksEstimationHoursModalProps {
	closeModal: () => void;
	isOpen: boolean;
	plan?: TDailyPlan;
	tasks: TTask[];
	/** The timer's own dialog; false when the plans dialog hosts the editor and draws the frame itself. */
	isRenderedInSoftFlow?: boolean;
	selectedDate?: Date;
	employeeId?: string | null;
	canEdit?: boolean;
}

const NO_OTHER_PLANS: string[] = [];

function noOtherPlans() {
	return NO_OTHER_PLANS;
}

function ignoreBlockedActiveTask() {
	return undefined;
}

export function PlanDayChip({ date }: Readonly<{ date: Date }>) {
	const format = useFormatter();
	return (
		<>
			<DateGlyph date={date} />
			<span className="truncate">
				{format.dateTime(date, { weekday: 'short', month: 'short', day: 'numeric' })}
			</span>
		</>
	);
}

function dayOfPlan(plan: TDailyPlan | undefined) {
	if (!plan?.date) {
		return null;
	}
	return moment(getDailyPlanDay(plan.date)).toDate();
}

function PlanEditorFrame(props: Readonly<IAddTasksEstimationHoursModalProps>) {
	const {
		isOpen,
		closeModal,
		plan,
		tasks,
		isRenderedInSoftFlow = true,
		selectedDate,
		employeeId,
		canEdit = true
	} = props;
	const t = useTranslations();
	const editor = usePlanEditor({
		plan,
		tasks,
		selectedDate,
		employeeId,
		canEdit,
		isOpen,
		isRenderedInSoftFlow,
		closeModal
	});
	const { closeAndSave } = editor;
	const closeSaving = useCallback(() => void closeAndSave(), [closeAndSave]);
	const planDay = dayOfPlan(editor.plan);

	const body = (
		<PlanEditor
			editor={editor}
			canEdit={canEdit}
			selectedDate={selectedDate}
			employeeId={employeeId}
			isRenderedInSoftFlow={isRenderedInSoftFlow}
		/>
	);
	if (!isRenderedInSoftFlow) {
		return body;
	}
	return (
		<AppDialog open={isOpen} onClose={closeSaving} width="md" keepOpenOnOutsideClick>
			<AppDialogHeader
				title={t('common.plan.FOR_TODAY')}
				context={planDay && <PlanDayChip date={planDay} />}
				onClose={closeSaving}
			/>
			{body}
		</AppDialog>
	);
}

/**
 * A day's plan: the planned hours, the tasks and their estimates, and starting work on it. The timer opens it on
 * its own ("Today's plan"); the plans dialog embeds it for any day. Nothing mounts before the first opening, since
 * timer cards keep it in their tree.
 */
export function AddTasksEstimationHoursModal(props: Readonly<IAddTasksEstimationHoursModalProps>) {
	const hasBeenOpen = useHasBeenOpen(props.isOpen);
	if (!hasBeenOpen) {
		return null;
	}
	return <PlanEditorFrame {...props} />;
}

interface ISearchTaskInputProps {
	selectedPlan?: TDailyPlan;
	setShowSearchInput: Dispatch<SetStateAction<boolean>>;
	setDefaultTask: Dispatch<SetStateAction<TTask | null>>;
	stopTimer: () => void;
	defaultTask: TTask | null;
	selectedDate?: Date;
	employeeId?: string | null;
	canEdit?: boolean;
}

/** The plan's task search on its own, for a host that shows it in place of its content. */
export function SearchTaskInput(props: Readonly<ISearchTaskInputProps>) {
	const { selectedPlan, setShowSearchInput, selectedDate, employeeId, canEdit = true } = props;
	const actions = usePlanTaskActions({
		plan: selectedPlan,
		selectedDate,
		employeeId,
		canEdit,
		isActiveTaskPlannedToday: false,
		otherPlanIdsOf: noOtherPlans,
		onActiveTaskBlocked: ignoreBlockedActiveTask
	});
	const { addTasks } = actions;
	const plannedTaskIds = useMemo(() => {
		const ids = new Set<string>();
		for (const task of selectedPlan?.tasks ?? []) {
			ids.add(task.id);
		}
		return ids;
	}, [selectedPlan?.tasks]);

	const addAndClose = useCallback(
		async (tasks: TTask[]) => {
			const addedCount = await addTasks(tasks);
			if (addedCount > 0) {
				setShowSearchInput(false);
			}
		},
		[addTasks, setShowSearchInput]
	);

	return (
		<PlanTaskSearch
			plannedTaskIds={plannedTaskIds}
			canEdit={canEdit}
			isCreatingTask={actions.isCreatingTask}
			onBack={() => setShowSearchInput(false)}
			onAddMany={(tasks) => void addAndClose(tasks)}
			onCreate={(title) => void actions.createTeamTask(title)}
		/>
	);
}
