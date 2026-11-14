'use client';

import { useCallback, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Archive, Flag, MoreHorizontal, Pencil, Plus, Undo } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { GOALS_PATH } from '@/core/components/layouts/my-work-navigation';
import { type GoalsPageState, useGoalsPage } from '@/core/hooks/time-goals/use-goals-page';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { GOAL_PERIODS } from '@/core/lib/utils/time-goals';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import type { ETimeGoalPeriod, ITimeGoal } from '@/core/types/interfaces/timesheet/time-goal';
import { GoalDialog } from './goal-dialog';
import { GOAL_EMPTY_PERIOD_KEYS, GOAL_PERIOD_LABEL_KEYS } from './goal-labels';
import { GoalFacts, GoalProgressRow, GoalRows } from './goal-row';
import { GoalRowsSkeleton, GoalsBodySkeleton } from './goals-page-skeleton';

type DialogState = { mode: 'create' } | { mode: 'edit'; goal: ITimeGoal } | null;

function PeriodSwitch({ page }: Readonly<{ page: GoalsPageState }>) {
	const t = useTranslations();
	const items = useMemo<SegmentedControlItem<ETimeGoalPeriod>[]>(
		() =>
			GOAL_PERIODS.map((period) => ({
				value: period,
				label: t(GOAL_PERIOD_LABEL_KEYS[period]),
				count: page.counts[period] || undefined
			})),
		[page.counts, t]
	);
	return (
		<div className="-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1 [scrollbar-width:none]">
			<SegmentedControl
				items={items}
				value={page.period}
				onValueChange={page.pickPeriod}
				ariaLabel={t('dashboard.goals.PERIOD_LABEL')}
			/>
		</div>
	);
}

function GoalActions({
	goal,
	onEdit,
	onArchive
}: Readonly<{ goal: ITimeGoal; onEdit: (goal: ITimeGoal) => void; onArchive: (goal: ITimeGoal) => void }>) {
	const t = useTranslations();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t('dashboard.goals.ACTIONS', { name: goal.name })}
					className="size-7 text-muted-foreground [&_svg]:size-4"
				>
					<MoreHorizontal aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuItem onClick={() => onEdit(goal)}>
					<Pencil aria-hidden="true" />
					{t('dashboard.goals.EDIT')}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onArchive(goal)}>
					<Archive aria-hidden="true" />
					{t('dashboard.goals.ARCHIVE')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

interface RowHandlers {
	onEdit: (goal: ITimeGoal) => void;
	onArchive: (goal: ITimeGoal) => void;
}

function OwnGoals({ page, handlers }: Readonly<{ page: GoalsPageState; handlers: RowHandlers }>) {
	const t = useTranslations();
	const title = t('dashboard.goals.YOUR_GOALS');
	if (page.ownRows.length === 0) {
		return (
			<DashboardSection title={title} ariaLabel={title}>
				<BlockEmptyMessage
					title={t(GOAL_EMPTY_PERIOD_KEYS[page.period])}
					message={t('dashboard.goals.EMPTY_PERIOD_HINT')}
					className="py-10"
				/>
			</DashboardSection>
		);
	}
	return (
		<DashboardSection title={title} ariaLabel={title} bodyClassName="pb-1">
			<GoalRows label={title}>
				{page.ownRows.map((row) => {
					const canChange = page.mayChange(row.goal);
					return (
						<GoalProgressRow
							key={`${row.goalId}:${row.employeeId}`}
							row={row}
							actions={canChange && <GoalActions goal={row.goal} {...handlers} />}
						/>
					);
				})}
			</GoalRows>
		</DashboardSection>
	);
}

function TeamGoals({ page, handlers }: Readonly<{ page: GoalsPageState; handlers: RowHandlers }>) {
	const t = useTranslations();
	const title = t('dashboard.goals.TEAM_GOALS');
	const { team } = page;
	let body;
	if (team.isError) {
		body = <DashboardErrorNotice onRetry={team.retry} className="m-4" />;
	} else if (team.isLoading) {
		body = <GoalRowsSkeleton rows={3} />;
	} else if (team.groups.length === 0) {
		body = (
			<BlockEmptyMessage
				title={t('dashboard.goals.TEAM_EMPTY', { team: page.teamName ?? '' })}
				className="py-10"
			/>
		);
	} else {
		body = (
			<div className="flex flex-col">
				{team.groups.map((group) => (
					<section
						key={group.person.employeeId}
						aria-label={group.person.name}
						className="hairline-t border-border first:border-t-0"
					>
						<div className="flex items-center justify-between gap-3 bg-foreground/[0.02] px-4 py-2">
							<MemberCell name={group.person.name} imageUrl={group.person.imageUrl} />
							<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
								{t('dashboard.goals.GOAL_COUNT', { count: group.rows.length })}
							</span>
						</div>
						<GoalRows>
							{group.rows.map((row) => {
								const canChange = page.mayChange(row.goal);
								return (
									<GoalProgressRow
										key={`${row.goalId}:${row.employeeId}`}
										row={row}
										actions={canChange && <GoalActions goal={row.goal} {...handlers} />}
									/>
								);
							})}
						</GoalRows>
					</section>
				))}
			</div>
		);
	}
	return (
		<DashboardSection title={title} meta={page.teamName ?? undefined} ariaLabel={title} bodyClassName="pb-1">
			{body}
		</DashboardSection>
	);
}

function ArchivedGoals({ page, onRestore }: Readonly<{ page: GoalsPageState; onRestore: (goal: ITimeGoal) => void }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const goals = page.archivedGoals;
	if (goals.length === 0) {
		return null;
	}
	const title = t('dashboard.goals.ARCHIVED_TITLE');
	const toggle = (
		<Button type="button" variant="ghost" size="sm" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
			{isOpen ? t('dashboard.goals.HIDE') : t('dashboard.goals.SHOW')}
		</Button>
	);
	return (
		<DashboardSection
			title={title}
			meta={t('dashboard.goals.GOAL_COUNT', { count: goals.length })}
			actions={toggle}
			ariaLabel={title}
			bodyClassName="pb-1"
		>
			{isOpen && (
				<GoalRows label={title}>
					{goals.map((goal) => (
						<li key={goal.id} className="flex items-center justify-between gap-3 px-4 py-3">
							<div className="flex min-w-0 flex-col gap-0.5">
								<span
									className="truncate text-[13px] font-medium text-muted-foreground"
									title={goal.name}
								>
									{goal.name}
								</span>
								<GoalFacts goal={goal} />
							</div>
							{page.mayChange(goal) && (
								<Button type="button" variant="outline" size="sm" onClick={() => onRestore(goal)}>
									<Undo aria-hidden="true" />
									{t('dashboard.goals.RESTORE')}
								</Button>
							)}
						</li>
					))}
				</GoalRows>
			)}
		</DashboardSection>
	);
}

function NewGoalButton({ onClick }: Readonly<{ onClick: () => void }>) {
	const t = useTranslations();
	return (
		<Button type="button" size="sm" onClick={onClick}>
			<Plus aria-hidden="true" />
			{t('dashboard.goals.NEW_GOAL')}
		</Button>
	);
}

function GoalsBody({
	page,
	handlers,
	onCreate,
	onRestore
}: Readonly<{
	page: GoalsPageState;
	handlers: RowHandlers;
	onCreate: () => void;
	onRestore: (goal: ITimeGoal) => void;
}>) {
	const t = useTranslations();
	if (page.availability === 'unavailable') {
		return (
			<DashboardSection>
				<BlockEmptyMessage
					title={t('dashboard.goals.UNAVAILABLE_TITLE')}
					message={t('dashboard.goals.UNAVAILABLE_MESSAGE')}
					className="py-16"
				/>
			</DashboardSection>
		);
	}
	if (page.isMemberUnknown) {
		return (
			<DashboardSection>
				<BlockEmptyMessage
					title={t('dashboard.calendar.NO_MEMBER_TITLE')}
					message={t('dashboard.calendar.NO_MEMBER_MESSAGE')}
				/>
			</DashboardSection>
		);
	}
	if (page.showsError) {
		return <DashboardErrorNotice onRetry={page.retry} />;
	}
	if (page.isLoading) {
		return <GoalsBodySkeleton />;
	}
	const showsTeam = page.managesTeam;
	if (!page.hasAnyGoal && !showsTeam) {
		return (
			<>
				<DashboardSection>
					<BlockEmptyMessage
						title={t('dashboard.goals.EMPTY_TITLE')}
						message={t('dashboard.goals.EMPTY_MESSAGE')}
						action={<NewGoalButton onClick={onCreate} />}
						className="py-16"
					/>
				</DashboardSection>
				<ArchivedGoals page={page} onRestore={onRestore} />
			</>
		);
	}
	return (
		<>
			<OwnGoals page={page} handlers={handlers} />
			{showsTeam && <TeamGoals page={page} handlers={handlers} />}
			<ArchivedGoals page={page} onRestore={onRestore} />
		</>
	);
}

function rangeTextOf(range: GoalsPageState['shownRange'], locale: string) {
	if (!range) {
		return undefined;
	}
	return formatPeriod({ from: parseISO(range.startDate), to: parseISO(range.endDate) }, locale);
}

/**
 * `/goals`, under My work: the signed-in person's time goals and where she stands against each today, this week or
 * this month; the members of the team she manages, grouped by member; New goal, Edit, Archive and Restore.
 */
export function GoalsPage() {
	const t = useTranslations();
	const locale = useLocale();
	const showsTimer = useAtomValue(isTrackingEnabledState);
	const page = useGoalsPage();
	const [dialog, setDialog] = useState<DialogState>(null);
	const title = t('dashboard.goals.TITLE');
	const isAvailable = page.availability === 'available';

	const openCreate = useCallback(() => setDialog({ mode: 'create' }), []);
	const openEdit = useCallback((goal: ITimeGoal) => setDialog({ mode: 'edit', goal }), []);
	const closeDialog = useCallback(() => setDialog(null), []);

	const { archive, restore } = page;
	const restoreGoal = useCallback(
		async (goal: ITimeGoal) => {
			try {
				await restore(goal);
				toast.success(t('dashboard.goals.RESTORED', { name: goal.name }));
			} catch {
				toast.error(t('dashboard.goals.RESTORE_FAILED'));
			}
		},
		[restore, t]
	);
	const archiveGoal = useCallback(
		async (goal: ITimeGoal) => {
			try {
				await archive(goal);
				toast.success(t('dashboard.goals.ARCHIVED', { name: goal.name }), {
					action: { label: t('dashboard.goals.UNDO'), onClick: () => void restoreGoal(goal) }
				});
			} catch {
				toast.error(t('dashboard.goals.ARCHIVE_FAILED'));
			}
		},
		[archive, restoreGoal, t]
	);
	const handlers = useMemo<RowHandlers>(
		() => ({ onEdit: openEdit, onArchive: (goal) => void archiveGoal(goal) }),
		[archiveGoal, openEdit]
	);
	const onRestore = useCallback((goal: ITimeGoal) => void restoreGoal(goal), [restoreGoal]);

	const showsControls = isAvailable && !page.isMemberUnknown;
	let editedGoal: ITimeGoal | null = null;
	if (dialog?.mode === 'edit') {
		editedGoal = dialog.goal;
	}

	return (
		<PageLayout
			title={title}
			showTimer={showsTimer}
			className="min-h-0 flex-1"
			breadcrumb={
				<DashboardBreadcrumb
					icon={<Flag aria-hidden="true" />}
					paths={[{ title, href: `/${locale}${GOALS_PATH}` }]}
				/>
			}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={rangeTextOf(page.shownRange, locale)}
					isUpdating={page.isUpdating}
					updatingLabel={t('dashboard.goals.UPDATING')}
					actions={showsControls && <NewGoalButton onClick={openCreate} />}
					controls={showsControls && <PeriodSwitch page={page} />}
				/>
			}
		>
			<div className={DASHBOARD_STACK} aria-busy={page.isLoading}>
				<GoalsBody page={page} handlers={handlers} onCreate={openCreate} onRestore={onRestore} />
			</div>
			<GoalDialog
				open={dialog !== null}
				mode={dialog?.mode ?? 'create'}
				goal={editedGoal}
				owners={page.owners}
				ownerLabel={editedGoal ? page.ownerLabelOf(editedGoal) : null}
				projects={page.projects}
				clients={page.clients}
				onClose={closeDialog}
			/>
		</PageLayout>
	);
}
