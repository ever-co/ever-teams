'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { DayPlanBlock, DoneOfPlanned } from '@/core/components/calendar/calendar-day-details';
import { DatePicker } from '@/core/components/common/date-picker';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { Calendar, Clock } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { WORK_DIARY_PATH } from '@/core/components/layouts/my-work-navigation';
import { TrackingSourceEmptyState } from '@/core/components/pages/profile/tracking-source-empty-state';
import { useWorkDiaryPage, type WorkDiaryPageState } from '@/core/hooks/dashboards/work-diary/use-work-diary-page';
import type { DiarySlot } from '@/core/lib/utils/dashboards/work-diary';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import { DiaryDayStrip } from './diary-day-strip';
import { DiaryBody, DiaryHoursSkeleton } from './diary-hours';
import { DiarySlotSheet } from './diary-slot-sheet';
import { DIARY_COLUMNS, DiaryAppRows, DiaryFigures, DiaryRowsSkeleton, DiaryTaskRows } from './work-diary-parts';
import { WorkDiaryPageSkeleton } from './work-diary-page-skeleton';

interface DayFormats {
	time: Intl.DateTimeFormat;
	hour: Intl.DateTimeFormat;
	short: Intl.DateTimeFormat;
	long: Intl.DateTimeFormat;
}

function useDayFormats(): DayFormats {
	const locale = useLocale();
	return useMemo(
		() => ({
			time: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }),
			hour: new Intl.DateTimeFormat(locale, { hour: 'numeric' }),
			short: new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
			long: new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
		}),
		[locale]
	);
}

/** The day's screenshots, hour by hour; a day of time added by hand or tracked in the browser has none, and says why. */
function ScreenshotsBody({
	page,
	dayText,
	formats,
	onOpen
}: Readonly<{ page: WorkDiaryPageState; dayText: string; formats: DayFormats; onOpen: (slot: DiarySlot) => void }>) {
	const t = useTranslations();
	const { diary } = page;
	if (diary.isLoading) {
		return <DiaryHoursSkeleton />;
	}
	if (diary.isError) {
		return <DashboardErrorNotice onRetry={() => void diary.refetch()} />;
	}
	const hasEntries = page.shownDay.entries.length > 0;
	const hasSlots = diary.diary.slotCount > 0;
	if (!hasSlots && hasEntries) {
		return (
			<div className="py-10">
				<TrackingSourceEmptyState label={t('dashboard.timesheets.diary.NO_SHOTS_TITLE', { day: dayText })} />
			</div>
		);
	}
	return (
		<DiaryBody
			diary={diary.diary}
			activities={diary.activities}
			dayText={dayText}
			timeFormat={formats.time}
			hourFormat={formats.hour}
			onOpen={onOpen}
		/>
	);
}

/** The day itself: its figures, then its tasks, plan and apps side by side, then its screenshots at full width. */
function DiaryDayView({
	page,
	formats,
	onOpenSlot
}: Readonly<{ page: WorkDiaryPageState; formats: DayFormats; onOpenSlot: (slot: DiarySlot) => void }>) {
	const t = useTranslations();
	const { diary, shownDay, tasks, taskCount } = page;
	const dayText = formats.short.format(page.day);
	const isFiguresLoading = page.isLogsLoading || diary.isLoading;
	const isSettled = !isFiguresLoading && !page.isLogsError && !diary.isError;
	const isDayEmpty = isSettled && shownDay.entries.length === 0 && diary.diary.slotCount === 0;
	const taskCountText = t('dashboard.timesheets.SHEET.TASK_COUNT', { count: taskCount });
	const shotCountText = t('dashboard.timesheets.diary.SHOT_COUNT', { count: diary.diary.shotCount });
	const isPlanSettled = !page.isPlanLoading && !page.isPlanError;

	const figures = (
		<DashboardSection ariaLabel={t('dashboard.workDiary.FIGURES_LABEL')}>
			<DiaryFigures day={shownDay} diary={diary.diary} taskCount={taskCount} isLoading={isFiguresLoading} />
		</DashboardSection>
	);
	const plan = (
		<DashboardSection
			title={t('dashboard.calendar.PLAN_TITLE')}
			actions={isPlanSettled && shownDay.plan && <DoneOfPlanned day={shownDay} plan={shownDay.plan} />}
			bodyClassName="px-4 pb-3"
		>
			{page.isPlanLoading && <DiaryRowsSkeleton />}
			{page.isPlanError && <DashboardErrorNotice onRetry={() => void page.refetchPlans()} />}
			{isPlanSettled && <DayPlanBlock day={shownDay} showsHeader={false} />}
		</DashboardSection>
	);

	if (isDayEmpty) {
		return (
			<>
				{figures}
				<DashboardSection>
					<BlockEmptyMessage
						title={t('dashboard.timesheets.diary.NO_TIME_TITLE', { day: dayText })}
						message={page.isToday ? t('dashboard.workDiary.NO_TIME_HINT') : undefined}
					/>
				</DashboardSection>
				{(shownDay.plan || !isPlanSettled) && plan}
			</>
		);
	}

	return (
		<>
			{figures}
			<div className={DIARY_COLUMNS}>
				<DashboardSection
					title={t('common.TASKS')}
					meta={page.isLogsLoading ? undefined : taskCountText}
					ariaLabel={t('common.TASKS')}
				>
					{page.isLogsLoading && <DiaryRowsSkeleton />}
					{!page.isLogsLoading && <DiaryTaskRows tasks={tasks} />}
				</DashboardSection>
				{plan}
				<DashboardSection
					title={t('dashboard.timesheets.diary.APPS')}
					ariaLabel={t('dashboard.timesheets.diary.APPS')}
				>
					<DiaryAppRows activities={diary.activities} isLoading={diary.isAppsLoading} dayText={dayText} />
				</DashboardSection>
			</div>
			<DashboardSection
				title={t('common.SCREENSHOTS')}
				meta={diary.isLoading ? undefined : shotCountText}
				ariaLabel={t('common.SCREENSHOTS')}
				bodyClassName="px-4 pb-4"
			>
				<ScreenshotsBody page={page} dayText={dayText} formats={formats} onOpen={onOpenSlot} />
			</DashboardSection>
		</>
	);
}

function WorkDiaryPageContent() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const page = useWorkDiaryPage();
	const formats = useDayFormats();
	const [openSlot, setOpenSlot] = useState<DiarySlot | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const openSlotSheet = useCallback((slot: DiarySlot) => {
		setOpenSlot(slot);
		setIsSheetOpen(true);
	}, []);
	const closeSlotSheet = useCallback(() => setIsSheetOpen(false), []);
	const pickDay = (next: Date) => {
		setIsSheetOpen(false);
		page.pickDay(next);
	};

	const title = t('sidebar.WORK_DIARY');
	const pickDayLabel = t('dashboard.workDiary.PICK_DAY');
	const showsDay = !page.isMemberUnknown;

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			className="min-h-0 flex-1"
			breadcrumb={
				<DashboardBreadcrumb
					icon={<Clock aria-hidden="true" />}
					paths={[{ title, href: `/${locale}${WORK_DIARY_PATH}` }]}
				/>
			}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={formats.long.format(page.day)}
					isUpdating={page.isUpdating}
					updatingLabel={t('dashboard.workDiary.UPDATING')}
					actions={
						page.timesheetsPath && (
							<Button asChild variant="outline" size="default">
								<Link href={page.timesheetsPath}>{t('dashboard.workDiary.OPEN_TIMESHEETS')}</Link>
							</Button>
						)
					}
					controls={
						<DiaryDayStrip
							days={page.stripDays}
							day={page.day}
							trackedKeys={page.trackedKeys}
							period={page.history}
							onPick={pickDay}
						/>
					}
					trailingControls={
						<>
							<Button
								type="button"
								variant="outline"
								size="default"
								disabled={page.isToday}
								onClick={page.showToday}
							>
								{t('common.TODAY')}
							</Button>
							<DatePicker
								mode="single"
								selected={page.day}
								defaultMonth={page.day}
								onSelect={(value) => value && pickDay(value)}
								disabled={[{ after: page.history.to }, { before: page.history.from }]}
								buttonVariant="outline"
								buttonClassName="w-auto gap-2 px-2.5"
								customInput={
									<>
										<Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
										<span className="sr-only">{pickDayLabel}</span>
									</>
								}
							/>
						</>
					}
				/>
			}
		>
			<div className={DASHBOARD_STACK} aria-busy={page.isLogsLoading}>
				{page.isLogsError && <DashboardErrorNotice onRetry={() => void page.refetchLogs()} />}
				{page.isMemberUnknown && (
					<DashboardSection>
						<BlockEmptyMessage
							title={t('dashboard.calendar.NO_MEMBER_TITLE')}
							message={t('dashboard.calendar.NO_MEMBER_MESSAGE')}
						/>
					</DashboardSection>
				)}
				{showsDay && <DiaryDayView page={page} formats={formats} onOpenSlot={openSlotSheet} />}
			</div>
			<DiarySlotSheet
				slot={openSlot}
				day={page.day}
				activities={page.diary.activities}
				isAppsLoading={page.diary.isAppsLoading}
				isOpen={isSheetOpen}
				onClose={closeSlotSheet}
			/>
		</PageLayout>
	);
}

/**
 * `/work-diary`: the signed-in person's own day of work, under My work. The day's figures, the tasks the time went to
 * (each opens), the day's plan against what was done, the apps and sites, and the screenshots hour by hour; the days
 * of its week sit in the toolbar, with Today and a day picker for any earlier day. The team's time, with approvals,
 * stays in Reports › Timesheets, which a manager opens from here.
 */
export function WorkDiaryPage() {
	return (
		<Suspense fallback={<WorkDiaryPageSkeleton />}>
			<WorkDiaryPageContent />
		</Suspense>
	);
}
