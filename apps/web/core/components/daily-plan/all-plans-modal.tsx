'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { useFormatter, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import type { ActiveModifiers } from 'react-day-picker';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { Calendar } from '@/core/components/common/calendar';
import { EmptyState } from '@/core/components/common/empty-state';
import { BRAND_WASH_PANEL } from '@/core/components/common/surface-recipes';
import { Tabs, TabsList, TabsTrigger } from '@/core/components/common/tabs';
import { ChevronLeft, ChevronRight } from '@/core/components/icons';
import {
	AddTasksEstimationHoursModal,
	PlanDayChip
} from '@/core/components/features/daily-plan/add-task-estimation-hours-modal';
import { PAST_PLAN_DAY_MARK, PLANNED_DAY_MARK } from '@/core/components/features/daily-plan/plan-editor/plan-day-marks';
import { useCreateDailyPlan } from '@/core/hooks/daily-plans/use-create-daily-plan';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { checkPastDate, cn } from '@/core/lib/helpers';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { isSameDay } from '@/core/lib/utils/daily-plan-editor';
import { EDailyPlanStatus } from '@/core/types/generics/enums/daily-plan';
import { ERoleName } from '@/core/types/generics/enums/role';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

interface IAllPlansModal {
	closeModal: () => void;
	isOpen: boolean;
	/** Whose plans to show; the signed-in person's when absent. */
	employeeId?: string | null;
}

type PlanTab = 'today' | 'tomorrow' | 'calendar';

/** `day` is a plan opened from the calendar or reached with the arrows; it lives under the Calendar tab. */
type PlanView = PlanTab | 'day';

const PLAN_TABS: PlanTab[] = ['today', 'tomorrow', 'calendar'];

const TAB_LABEL_KEYS: Record<PlanTab, DottedLanguageObjectStringPaths> = {
	today: 'common.TODAY',
	tomorrow: 'common.TOMORROW',
	calendar: 'common.CALENDAR'
};

const ADMIN_ROLES = new Set<string>([ERoleName.ADMIN, ERoleName.SUPER_ADMIN]);

/** Two clicks on the same day within this delay open its plan, as the previous calendar did. */
const DOUBLE_CLICK_MS = 300;

function startOfToday() {
	return moment().startOf('day').toDate();
}

function startOfTomorrow() {
	return moment().add(1, 'day').startOf('day').toDate();
}

function dayOf(plan: TDailyPlan) {
	return moment(getDailyPlanDay(plan.date)).toDate();
}

function shiftedDay(date: Date, days: number) {
	return moment(date).add(days, 'day').startOf('day').toDate();
}

function viewForDate(date: Date): PlanView {
	if (isSameDay(date, startOfToday())) {
		return 'today';
	}
	if (isSameDay(date, startOfTomorrow())) {
		return 'tomorrow';
	}
	return 'day';
}

function tabOf(view: PlanView): PlanTab {
	if (view === 'day') {
		return 'calendar';
	}
	return view;
}

function sortedByDay(plans: TDailyPlan[]) {
	return [...plans].sort((first, second) => getDailyPlanDay(first.date).localeCompare(getDailyPlanDay(second.date)));
}

function lastPlanBefore(sortedPlans: TDailyPlan[], date: Date) {
	const dayKey = getDailyPlanDay(date);
	const earlier = sortedPlans.filter((plan) => getDailyPlanDay(plan.date) < dayKey);
	return earlier.at(-1);
}

function firstPlanAfter(sortedPlans: TDailyPlan[], date: Date) {
	const dayKey = getDailyPlanDay(date);
	return sortedPlans.find((plan) => getDailyPlanDay(plan.date) > dayKey);
}

function isAdminRole(roleName: string | null | undefined) {
	if (!roleName) {
		return false;
	}
	return ADMIN_ROLES.has(roleName);
}

function yearOf(plan: TDailyPlan | undefined, fallback: number) {
	if (!plan?.date) {
		return fallback;
	}
	return new Date(plan.date).getFullYear();
}

interface PlansCalendarProps {
	date: Date;
	plans: TDailyPlan[];
	pastPlans: TDailyPlan[];
	onSelect: (date: Date) => void;
	onOpenDay: (date: Date) => void;
}

const PLANS_CALENDAR_PANEL = cn('mx-auto w-full max-w-[22rem] px-4 pt-3 pb-3', BRAND_WASH_PANEL);

const PlansCalendar = memo(function PlansCalendar({
	date,
	plans,
	pastPlans,
	onSelect,
	onOpenDay
}: Readonly<PlansCalendarProps>) {
	const t = useTranslations();
	const lastClickRef = useRef<{ day: string; at: number } | null>(null);
	const sortedPlans = useMemo(() => sortedByDay(plans), [plans]);
	const plannedDays = useMemo(() => plans.map(dayOf), [plans]);
	const pastPlanDays = useMemo(() => pastPlans.map(dayOf), [pastPlans]);
	const plannedKeys = useMemo(() => new Set(plans.map((plan) => getDailyPlanDay(plan.date))), [plans]);

	/** A day that is over and never had a plan has nothing to show or to plan. */
	const isUnreachable = useCallback(
		(day: Date) => {
			const isOver = checkPastDate(day);
			const hasPlan = plannedKeys.has(getDailyPlanDay(day));
			return isOver && !hasPlan;
		},
		[plannedKeys]
	);

	const handleDayClick = useCallback(
		(day: Date, modifiers: ActiveModifiers) => {
			if (modifiers.disabled) {
				return;
			}
			const dayKey = getDailyPlanDay(day);
			const now = Date.now();
			const lastClick = lastClickRef.current;
			const isSameDayClick = lastClick?.day === dayKey;
			const isQuick = now - (lastClick?.at ?? 0) < DOUBLE_CLICK_MS;
			const isDoubleClick = isSameDayClick && isQuick;
			lastClickRef.current = { day: dayKey, at: now };
			if (isDoubleClick) {
				lastClickRef.current = null;
				onOpenDay(day);
			}
		},
		[onOpenDay]
	);

	const currentYear = new Date().getFullYear();
	return (
		<div className="flex flex-col gap-3 py-2">
			<p className="text-center text-[13px] text-muted-foreground">{t('common.plan.CHOOSE_DATE')}</p>
			<div className={PLANS_CALENDAR_PANEL}>
				<Calendar
					mode="single"
					selected={date}
					onSelect={(day) => {
						if (day) {
							onSelect(day);
						}
					}}
					onDayClick={handleDayClick}
					captionLayout="dropdown"
					disabled={isUnreachable}
					modifiers={{ planned: plannedDays, pastPlan: pastPlanDays }}
					modifiersClassNames={{ planned: PLANNED_DAY_MARK, pastPlan: PAST_PLAN_DAY_MARK }}
					fromYear={yearOf(sortedPlans[0], currentYear)}
					toYear={yearOf(sortedPlans.at(-1), currentYear) + 5}
					className="bg-transparent p-0"
				/>
				<div className="-mx-4 mt-3 flex items-center justify-center gap-4 hairline-t border-border px-4 pt-3 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
						{t('dailyPlan.editor.PLANNED_DAY')}
					</span>
					<span className="flex items-center gap-1.5">
						<span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
						{t('dailyPlan.editor.PAST_PLAN')}
					</span>
				</div>
			</div>
		</div>
	);
});

function PlansSkeleton() {
	return (
		<div className="flex flex-col gap-3 py-2" aria-hidden="true">
			<div className="h-8 w-full animate-pulse rounded-md bg-foreground/5" />
			<div className="h-2 w-full animate-pulse rounded-md bg-foreground/5" />
			<div className="h-11 w-full animate-pulse rounded-md bg-foreground/5" />
			<div className="h-11 w-full animate-pulse rounded-md bg-foreground/5" />
		</div>
	);
}

/**
 * Every plan of one person in one dialog: today, tomorrow, or any day from the calendar, with arrows that jump
 * between plans (or between days while the calendar shows). Managers and admins edit the plans of their reports.
 */
export const AllPlansModal = memo(function AllPlansModal({ isOpen, closeModal, employeeId }: IAllPlansModal) {
	const t = useTranslations();
	const format = useFormatter();
	const { employeeDailyPlans, employeePastPlans, isLoading, isError } = useEmployeeDailyPlans(employeeId ?? null);
	const { createDailyPlan, createDailyPlanLoading } = useCreateDailyPlan();
	const { data: user } = useUserQuery();
	const { isTeamManager } = useIsMemberManager(user);
	const [view, setView] = useState<PlanView>('today');
	const [date, setDate] = useState<Date>(startOfToday);

	const plans = employeeDailyPlans.items;
	const sortedPlans = useMemo(() => sortedByDay(plans ?? []), [plans]);
	const planOfDate = useMemo(() => sortedPlans.find((plan) => isSameDay(plan.date, date)), [date, sortedPlans]);
	const previousPlan = useMemo(() => lastPlanBefore(sortedPlans, date), [date, sortedPlans]);
	const nextPlan = useMemo(() => firstPlanAfter(sortedPlans, date), [date, sortedPlans]);

	const targetEmployeeId = employeeId ?? user?.employee?.id ?? null;
	const organizationId = user?.employee?.organizationId as string;
	const tenantId = user?.tenantId ?? '';
	const isSelf = !targetEmployeeId || targetEmployeeId === user?.employee?.id;
	const canEditPlans = isSelf || isTeamManager || isAdminRole(user?.role?.name);

	const isCalendarView = view === 'calendar';
	const hasPlanOnDate = Boolean(planOfDate);
	const isDateOver = checkPastDate(date);
	const canCreatePlan = canEditPlans && !isDateOver;
	const hasNoPlans = sortedPlans.length === 0;
	const isFirstLoad = isLoading && hasNoPlans;
	const showsError = isError && hasNoPlans;
	const isReady = !isFirstLoad && !showsError;
	const showsCalendar = isReady && isCalendarView;
	const showsPlan = isReady && !isCalendarView;

	const showDate = useCallback((next: Date) => {
		setDate(next);
		setView(viewForDate(next));
	}, []);

	const selectTab = (tab: PlanTab) => {
		if (tab === 'today') {
			showDate(startOfToday());
			return;
		}
		if (tab === 'tomorrow') {
			showDate(startOfTomorrow());
			return;
		}
		setView('calendar');
	};

	const goToPrevious = () => {
		if (isCalendarView) {
			setDate(shiftedDay(date, -1));
			return;
		}
		if (previousPlan) {
			showDate(dayOf(previousPlan));
		}
	};

	const goToNext = () => {
		if (isCalendarView) {
			setDate(shiftedDay(date, 1));
			return;
		}
		if (nextPlan) {
			showDate(dayOf(nextPlan));
		}
	};

	const createEmptyPlan = useCallback(
		async (day: Date) => {
			if (!canEditPlans) {
				return;
			}
			try {
				await createDailyPlan({
					workTimePlanned: 0,
					date: moment(day).format('YYYY-MM-DD'),
					status: EDailyPlanStatus.OPEN,
					tenantId,
					employeeId: targetEmployeeId ?? undefined,
					organizationId
				});
				showDate(day);
			} catch (error) {
				console.error(error);
			}
		},
		[canEditPlans, createDailyPlan, organizationId, showDate, targetEmployeeId, tenantId]
	);

	const openDay = useCallback(
		(day: Date) => {
			const hasPlan = sortedPlans.some((plan) => isSameDay(plan.date, day));
			if (hasPlan) {
				showDate(day);
				return;
			}
			void createEmptyPlan(day);
		},
		[createEmptyPlan, showDate, sortedPlans]
	);

	let title = t('common.plan.PLURAL');
	if (view === 'today') {
		title = t('common.plan.FOR_TODAY');
	}
	if (view === 'tomorrow') {
		title = t('common.plan.FOR_TOMORROW');
	}
	if (view === 'day') {
		title = t('dailyPlan.editor.PLAN_FOR_DATE', { date: format.dateTime(date, { dateStyle: 'long' }) });
	}

	let previousLabel = t('dailyPlan.editor.PREVIOUS_PLAN');
	let nextLabel = t('dailyPlan.editor.NEXT_PLAN');
	if (isCalendarView) {
		previousLabel = t('dailyPlan.editor.PREVIOUS_DAY');
		nextLabel = t('dailyPlan.editor.NEXT_DAY');
	}
	const canGoPrevious = isCalendarView || Boolean(previousPlan);
	const canGoNext = isCalendarView || Boolean(nextPlan);

	let calendarActionLabel = t('common.plan.ADD_PLAN');
	if (hasPlanOnDate) {
		calendarActionLabel = t('common.SELECT');
	}
	const isCalendarActionDisabled = !hasPlanOnDate && !canCreatePlan;

	return (
		<AppDialog open={isOpen} onClose={closeModal} width="lg" keepOpenOnOutsideClick>
			<AppDialogHeader
				title={title}
				context={!isCalendarView && <PlanDayChip date={date} />}
				onClose={closeModal}
			/>
			<div className="flex shrink-0 items-end justify-between gap-3 hairline-b border-border px-5">
				<Tabs value={tabOf(view)} onValueChange={(tab) => selectTab(tab as PlanTab)} className="min-w-0 gap-0">
					<TabsList className="w-auto gap-5 border-b-0">
						{PLAN_TABS.map((tab) => (
							<TabsTrigger key={tab} value={tab}>
								{t(TAB_LABEL_KEYS[tab])}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className="mb-1.5 flex items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={goToPrevious}
						disabled={!canGoPrevious}
						aria-label={previousLabel}
						title={previousLabel}
						className="text-muted-foreground"
					>
						<ChevronLeft />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={goToNext}
						disabled={!canGoNext}
						aria-label={nextLabel}
						title={nextLabel}
						className="text-muted-foreground"
					>
						<ChevronRight />
					</Button>
				</div>
			</div>

			{isFirstLoad && (
				<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
					<PlansSkeleton />
				</div>
			)}

			{showsError && (
				<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
					<EmptyState type="error" size="sm" variant="subtle" />
				</div>
			)}

			{showsCalendar && (
				<>
					<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
						<PlansCalendar
							date={date}
							plans={sortedPlans}
							pastPlans={employeePastPlans}
							onSelect={setDate}
							onOpenDay={openDay}
						/>
					</div>
					<div className={APP_DIALOG_FOOTER}>
						<Button type="button" variant="ghost" size="default" onClick={closeModal} className="ml-auto">
							{t('common.CANCEL')}
						</Button>
						<Button
							type="button"
							size="default"
							onClick={() => openDay(date)}
							disabled={isCalendarActionDisabled}
							loading={createDailyPlanLoading}
						>
							{calendarActionLabel}
						</Button>
					</div>
				</>
			)}

			{showsPlan && (
				<AddTasksEstimationHoursModal
					key={getDailyPlanDay(date)}
					plan={planOfDate}
					tasks={planOfDate?.tasks ?? []}
					isRenderedInSoftFlow={false}
					isOpen={isOpen}
					closeModal={closeModal}
					selectedDate={date}
					employeeId={employeeId}
					canEdit={canEditPlans}
				/>
			)}
		</AppDialog>
	);
});
