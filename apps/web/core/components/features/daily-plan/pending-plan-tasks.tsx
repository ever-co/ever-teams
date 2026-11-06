'use client';

import { useTranslations } from 'next-intl';
import { TaskCardSkeleton } from '@/core/components/common/skeleton/profile-component-skeletons';
import { Clock, Spinner } from '@/core/components/icons';
import { TaskNameInfoDisplay } from '@/core/components/tasks/task-displays';
import {
	DAY_GROUP_LIST_CLASS_NAME,
	dayGroupClassName,
	planTaskListClassName
} from '@/core/components/tasks/daily-plan/day-group';
import { usePlanDayLabel } from '@/core/components/tasks/daily-plan/plan-day-label';
import { IssuesView } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { usePendingAdditionsForPlan, type PendingPlanDay } from '@/core/hooks/daily-plans/use-pending-plan-additions';
import type { PendingPlanAddition } from '@/core/stores/daily-plan/pending-plan-additions';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { PlanRow } from './plan-editor/plan-time';

const PENDING_BAR = 'animate-pulse rounded-md bg-foreground/[0.06]';

const BLOCK_CARD_SKELETON = 'h-36 w-72 shrink-0 animate-pulse rounded-xl bg-foreground/[0.04]';

function PendingTaskName({ addition }: Readonly<{ addition: PendingPlanAddition }>) {
	if (addition.task) {
		return <TaskNameInfoDisplay task={addition.task} />;
	}
	return <span className={cn(PENDING_BAR, 'block h-3.5 w-3/5')} />;
}

/** A task joining the plan, as the editor lists it: its name, the estimate and the menu still waiting. */
export function PendingPlanTaskRow({
	addition,
	isToday
}: Readonly<{ addition: PendingPlanAddition; isToday: boolean }>) {
	const t = useTranslations();
	return (
		<li className="flex h-11 items-center gap-2" aria-busy="true">
			{isToday && (
				<span className="flex size-6 shrink-0 items-center justify-center">
					<span className={cn(PENDING_BAR, 'size-3.5 rounded-full')} />
				</span>
			)}
			<div className="min-w-0 flex-1 text-[13px]">
				<PendingTaskName addition={addition} />
			</div>
			<span className={cn(PENDING_BAR, 'h-7 w-24 shrink-0')} />
			<span className="flex size-7 shrink-0 items-center justify-center">
				<Spinner aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
			</span>
			<span className="sr-only">{t('common.LOADING')}</span>
		</li>
	);
}

/** The editor while the day's plan is being created: the hours and the bar waiting, the task that starts it named. */
export function PlanEditorPendingBlock({ additions }: Readonly<{ additions: PendingPlanAddition[] }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-4" aria-busy="true">
			<section className="flex flex-col gap-2">
				<PlanRow icon={<Clock />} label={t('dailyPlan.PLANNED_TIME')}>
					<span className={cn(PENDING_BAR, 'h-8 w-28')} />
				</PlanRow>
				<div className="flex flex-col gap-1.5">
					<span className={cn(PENDING_BAR, 'h-2 w-full rounded-[2px]')} />
					<span className={cn(PENDING_BAR, 'h-3 w-24')} />
				</div>
			</section>
			<section className="flex flex-col">
				<div className="flex h-9 items-center">
					<span className="text-[13px] font-medium text-foreground">{t('common.TASKS')}</span>
				</div>
				<ul className="flex flex-col hairline-divide-y divide-border">
					{additions.map((addition) => (
						<PendingPlanTaskRow key={addition.key} addition={addition} isToday={true} />
					))}
				</ul>
			</section>
		</div>
	);
}

/** Tasks joining a plan of the profile's lists, on the geometry of the cards they become. */
function PendingPlanTaskCards({
	additions,
	view
}: Readonly<{ additions: PendingPlanAddition[]; view: IssuesView }>) {
	const t = useTranslations();
	const isCardsView = view === IssuesView.CARDS;
	return (
		<>
			{additions.map((addition) => (
				<div key={addition.key} aria-busy="true">
					{isCardsView && <TaskCardSkeleton />}
					{!isCardsView && <div className={BLOCK_CARD_SKELETON} />}
					<span className="sr-only">{t('common.LOADING')}</span>
				</div>
			))}
		</>
	);
}

export function PendingPlanCardsFor({ plan, view }: Readonly<{ plan: TDailyPlan; view: IssuesView }>) {
	const additions = usePendingAdditionsForPlan(plan);
	return <PendingPlanTaskCards additions={additions} view={view} />;
}

/** A day whose plan a request is creating, drawn as the day group it becomes: its label line, then its rows. */
export function PendingPlanDayBlocks({ days, view }: Readonly<{ days: PendingPlanDay[]; view: IssuesView }>) {
	const dayLabelOf = usePlanDayLabel();
	if (days.length === 0) {
		return null;
	}
	return (
		<div className={DAY_GROUP_LIST_CLASS_NAME}>
			{days.map((pendingDay) => (
				<div key={pendingDay.day} className={dayGroupClassName(view)} aria-busy="true">
					<div className="flex min-h-9 items-center gap-2">
						<span className="truncate text-[13px] font-medium text-foreground">
							{dayLabelOf(pendingDay.day)}
						</span>
						<span className={cn(PENDING_BAR, 'h-4 w-6')} />
					</div>
					<div className={planTaskListClassName(view, false)}>
						<PendingPlanTaskCards additions={pendingDay.additions} view={view} />
					</div>
				</div>
			))}
		</div>
	);
}
