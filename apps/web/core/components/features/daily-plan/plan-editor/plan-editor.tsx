'use client';

import { useCallback, useMemo, type KeyboardEvent } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialogShortcut } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { ADD_ROW_RECIPE } from '@/core/components/common/surface-recipes';
import { EmptyState } from '@/core/components/common/empty-state';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { Clock, Plus } from '@/core/components/icons';
import { UnplanActiveTaskModal } from '@/core/components/features/daily-plan/unplan-active-task-modal';
import { usePendingAdditionsForPlan, usePendingPlanDays } from '@/core/hooks/daily-plans/use-pending-plan-additions';
import { usePlanTaskActions } from '@/core/hooks/daily-plans/use-plan-task-actions';
import type { PlanEditorState, PlanPrimaryAction } from '@/core/hooks/daily-plans/use-plan-editor';
import { cn } from '@/core/lib/helpers';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { todayKey } from '@/core/lib/utils/daily-plan-editor';
import type { PendingPlanAddition } from '@/core/stores/daily-plan/pending-plan-additions';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { PlanEditorPendingBlock } from '../pending-plan-tasks';
import { ActiveTaskSwitchPanel } from './active-task-switch';
import { PlanTaskDetailsDialog } from './plan-task-details';
import { PlanTaskList } from './plan-task-list';
import { PlanTaskSearch } from './plan-task-search';
import { PlanHoursStepper, PlanHoursValue, PlanRow, PlanTimeBar, PlanWarning } from './plan-time';

const PRIMARY_LABEL_KEYS: Record<PlanPrimaryAction, DottedLanguageObjectStringPaths> = {
	start: 'timer.todayPlanSettings.START_WORKING_BUTTON',
	save: 'common.SAVE_CHANGES',
	edit: 'common.plan.EDIT_PLAN',
	workDiary: 'sidebar.WORK_DIARY',
	timesheets: 'common.timesheets.PLURAL'
};

function isSubmitShortcut(event: KeyboardEvent<HTMLElement>) {
	const hasModifier = event.metaKey || event.ctrlKey;
	return event.key === 'Enter' && hasModifier;
}

function emptyMessageKey(isPast: boolean): DottedLanguageObjectStringPaths {
	if (isPast) {
		return 'dailyPlan.editor.EMPTY_PAST';
	}
	return 'dailyPlan.editor.EMPTY_HINT';
}

function secondaryLabelKey(isRenderedInSoftFlow: boolean): DottedLanguageObjectStringPaths {
	if (isRenderedInSoftFlow) {
		return 'common.SKIP_ADD_LATER';
	}
	return 'common.CANCEL';
}

interface PlanEditorProps {
	editor: PlanEditorState;
	canEdit: boolean;
	selectedDate: Date | undefined;
	employeeId: string | null | undefined;
	isRenderedInSoftFlow: boolean;
}

function PlanTimeSection({ editor, canEdit }: Readonly<Pick<PlanEditorProps, 'editor' | 'canEdit'>>) {
	const t = useTranslations();
	const { isPast, plannedHours } = editor;
	let barValue = editor.estimateHours;
	let barLabelKey: DottedLanguageObjectStringPaths = 'dailyPlan.editor.ESTIMATED_LABEL';
	if (isPast) {
		barValue = editor.trackedHours;
		barLabelKey = 'dailyPlan.editor.TRACKED_LABEL';
	}
	return (
		<section className="flex flex-col gap-2">
			<PlanRow icon={<Clock />} label={t('dailyPlan.PLANNED_TIME')}>
				{isPast && <PlanHoursValue hours={plannedHours} />}
				{!isPast && (
					<PlanHoursStepper hours={plannedHours} canEdit={canEdit} onChange={editor.setPlannedHours} />
				)}
			</PlanRow>
			<PlanTimeBar value={barValue} plannedHours={plannedHours} valueLabelKey={barLabelKey} />
		</section>
	);
}

/** The confirmation exists only while there is a plan and an active task to take out of it. */
function UnplanActiveConfirm({ editor }: Readonly<{ editor: PlanEditorState }>) {
	const { plan, activeTeamTask } = editor;
	if (!plan || !activeTeamTask) {
		return null;
	}
	return (
		<UnplanActiveTaskModal
			open={editor.isUnplanActiveOpen}
			task={activeTeamTask}
			plan={plan}
			closeModal={editor.closeUnplanActive}
			stopTimer={editor.stopTimer}
		/>
	);
}

const NO_PLANS: never[] = [];

/** Picked tasks whose request has not started yet, drawn like the ones on their way. */
function queuedAdditionsOf(tasks: TTask[], planId: string | null, day: string): PendingPlanAddition[] {
	return tasks.map((task) => ({ key: `queued-${task.id}`, taskId: task.id, task, planId, day, employeeId: null }));
}

function editorDayOf(editor: PlanEditorState, selectedDate: Date | undefined) {
	if (editor.plan) {
		return getDailyPlanDay(editor.plan.date);
	}
	if (selectedDate) {
		return getDailyPlanDay(selectedDate);
	}
	return todayKey();
}

/** A task joining the plan, or the plan being created, holds the start: it would begin before the task is in. */
function PrimaryButton({ editor, isWaiting }: Readonly<{ editor: PlanEditorState; isWaiting: boolean }>) {
	const t = useTranslations();
	const isDisabled = editor.isPrimaryDisabled || isWaiting;
	const button = (
		<Button
			type="button"
			size="default"
			onClick={editor.runPrimary}
			disabled={isDisabled}
			loading={editor.isSubmitting}
		>
			{t(PRIMARY_LABEL_KEYS[editor.primaryAction])}
		</Button>
	);
	if (!editor.showsTimerRunningHint) {
		return button;
	}
	return (
		<Tooltip label={t('timer.todayPlanSettings.TIMER_RUNNING')} placement="top">
			{button}
		</Tooltip>
	);
}

/**
 * The body of a day's plan, shared by the timer's "Today's plan" dialog and the plans dialog: the planned hours
 * against the estimate, what the plan still needs, the tasks, and the way out. Adding a task and changing the active
 * task take the dialog's place instead of stacking another dialog.
 */
export function PlanEditor({ editor, canEdit, selectedDate, employeeId, isRenderedInSoftFlow }: PlanEditorProps) {
	const t = useTranslations();
	const actions = usePlanTaskActions({
		plan: editor.plan,
		selectedDate,
		employeeId,
		canEdit,
		isActiveTaskPlannedToday: editor.isActiveTaskPlannedToday,
		otherPlanIdsOf: editor.otherPlanIdsOf,
		onActiveTaskBlocked: editor.openUnplanActive
	});
	const { setScreen } = editor;
	const { addTasks, queuedTasks } = actions;

	const plannedTaskIds = useMemo(() => new Set(editor.sortedTasks.map((task) => task.id)), [editor.sortedTasks]);
	const pendingAdditions = usePendingAdditionsForPlan(editor.plan);
	const editorDay = editorDayOf(editor, selectedDate);
	const showsEditorDay = useCallback((day: string) => day === editorDay, [editorDay]);
	const pendingDays = usePendingPlanDays(NO_PLANS, employeeId, showsEditorDay);
	const planId = editor.plan?.id ?? null;
	const queuedAdditions = useMemo(
		() => queuedAdditionsOf(queuedTasks, planId, editorDay),
		[editorDay, planId, queuedTasks]
	);
	const creationAdditions = [...(pendingDays[0]?.additions ?? []), ...queuedAdditions];
	const rowAdditions = [...pendingAdditions, ...queuedAdditions];
	const isCreatingPlan = !editor.hasPlan && creationAdditions.length > 0;
	const hasPendingAdditions = editor.hasPlan && rowAdditions.length > 0;
	const isWaiting = isCreatingPlan || hasPendingAdditions;

	const openSearch = useCallback(() => setScreen('search'), [setScreen]);
	const closeSearch = useCallback(() => setScreen('plan'), [setScreen]);

	const addSelected = useCallback(
		(tasks: TTask[]) => {
			setScreen('plan');
			void addTasks(tasks);
		},
		[addTasks, setScreen]
	);

	const isPlanScreen = editor.screen === 'plan';
	const isSearchScreen = editor.screen === 'search';
	const isSwitchScreen = editor.screen === 'switchTask';
	const hasTasks = editor.sortedTasks.length > 0;
	const hasRows = hasTasks || hasPendingAdditions;
	const canAddTasks = canEdit && !editor.isPast;
	const showsAddButton = canAddTasks && hasRows;

	let emptyActionLabel: string | undefined;
	let emptyAction: (() => void) | undefined;
	if (canAddTasks) {
		emptyActionLabel = t('dailyPlan.editor.ADD_TASK');
		emptyAction = openSearch;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const canRunPrimary = isPlanScreen && editor.hasPlan;
		const isPrimaryReady = !editor.isPrimaryDisabled && !isWaiting;
		const runsPrimary = canRunPrimary && isPrimaryReady;
		if (!isSubmitShortcut(event) || !runsPrimary) {
			return;
		}
		event.preventDefault();
		editor.runPrimary();
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col" onKeyDown={handleKeyDown}>
			{isSearchScreen && (
				<div className={APP_DIALOG_BODY}>
					<PlanTaskSearch
						plannedTaskIds={plannedTaskIds}
						canEdit={canEdit}
						isCreatingTask={actions.isCreatingTask}
						onBack={closeSearch}
						onAddMany={addSelected}
						onCreate={(title) => void actions.createTeamTask(title)}
					/>
				</div>
			)}

			{isSwitchScreen && (
				<ActiveTaskSwitchPanel plannedTask={editor.defaultTask} onFinish={editor.finishTaskSwitch} />
			)}

			{isPlanScreen && (
				<>
					<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pt-1 pb-5')}>
						{isCreatingPlan && <PlanEditorPendingBlock additions={creationAdditions} />}
						{editor.hasPlan && <PlanTimeSection editor={editor} canEdit={canEdit} />}
						{editor.warningKey && !isCreatingPlan && <PlanWarning messageKey={editor.warningKey} />}
						{!isCreatingPlan && (
							<section className="flex flex-col">
								<div className="flex h-9 items-center justify-between gap-2">
									<h3 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
										{t('common.TASKS')}
										{hasTasks && (
											<span className="tabular-nums text-muted-foreground">
												{editor.sortedTasks.length}
											</span>
										)}
									</h3>
								</div>
								{hasRows && (
									<PlanTaskList
										tasks={editor.sortedTasks}
										pendingAdditions={rowAdditions}
										isToday={editor.isToday}
										isPast={editor.isPast}
										canEdit={canEdit}
										defaultTaskId={editor.defaultTask?.id}
										pendingTaskId={actions.pendingTaskId}
										onChooseDefault={editor.chooseDefaultTask}
										onView={actions.viewTask}
										onRemove={(task) => void actions.removeFromPlan(task)}
										onRemoveEverywhere={(task) => void actions.removeFromAllPlans(task)}
										otherPlanIdsOf={editor.otherPlanIdsOf}
									/>
								)}
								{showsAddButton && (
									<button type="button" onClick={openSearch} className={cn(ADD_ROW_RECIPE, 'mt-2')}>
										<Plus aria-hidden="true" />
										{t('dailyPlan.editor.ADD_TASK')}
									</button>
								)}
								{!hasRows && (
									<EmptyState
										type="tasks"
										size="sm"
										variant="subtle"
										title={t('dailyPlan.editor.EMPTY_TITLE')}
										message={t(emptyMessageKey(editor.isPast))}
										actionLabel={emptyActionLabel}
										onAction={emptyAction}
									/>
								)}
							</section>
						)}
					</div>
					<div className={APP_DIALOG_FOOTER}>
						<span className="mr-auto">
							{editor.hasPlan && (
								<AppDialogShortcut
									keys={['⌘', '↵']}
									label={t(PRIMARY_LABEL_KEYS[editor.primaryAction])}
								/>
							)}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="default"
							onClick={editor.runSecondary}
							disabled={editor.isSubmitting}
						>
							{t(secondaryLabelKey(isRenderedInSoftFlow))}
						</Button>
						{editor.hasPlan && <PrimaryButton editor={editor} isWaiting={isWaiting} />}
					</div>
				</>
			)}

			<UnplanActiveConfirm editor={editor} />

			{actions.viewedTask && (
				<PlanTaskDetailsDialog task={actions.viewedTask} onClose={actions.closeViewedTask} />
			)}
		</div>
	);
}
