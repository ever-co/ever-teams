'use client';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import React, { Suspense, use, useMemo, useState } from 'react';

import { PageLayout } from '@/core/components/layouts/default-layout';

import { useLocalStorageState, useModal } from '@/core/hooks';
import { useAtomValue } from 'jotai';

import { SelectedTimesheet } from '@/core/components/timesheet';
import { TimesheetDetailModalSkeleton } from '@/core/components/common/skeleton/timesheet-skeletons';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Calendar, Clock, ListView, Search, Task, Users } from '@/core/components/icons';
import { ViewToggleButton } from '@/core/components/timesheet/timesheet-toggle-view';
import { Tabs, TabsList } from '@/core/components/common/tabs';
import { Card } from '@/core/components/common/card';
import { controlGroupRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { useTimesheetQuery } from '@/core/hooks/timesheet/use-timesheet-query';
import { useTimesheetFilters } from '@/core/hooks/activities/use-timesheet-filters';
import { useTimesheetPagination } from '@/core/hooks/activities/use-timesheet-pagination';
import { useTimesheetViewData } from '@/core/hooks/activities/use-timesheet-view-data';
import { differenceBetweenHours, getGreeting, secondsToTime } from '@/core/lib/helpers/index';
import { type GroupedTimesheet, getStatusTimesheet } from '@/core/lib/helpers/timesheet-grouping';
import { activeTeamState } from '@/core/stores';
import {
	LazyCalendarView,
	LazyTimesheetView,
	LazyTimesheetDetailModal,
	LazyTimesheetFilter,
	LazyTimesheetCard,
	LazyTimesheetPagination
} from '@/core/components/optimized-components/calendar';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

type TimesheetViewMode = 'ListView' | 'CalendarView';
export type TimesheetDetailMode = 'Pending' | 'MenHours' | 'MemberWork';

// Stable empty values used in place of the stored logs when the current range failed to load
const NO_TIMESHEET_GROUPS: GroupedTimesheet[] = [];
const NO_STATUS_TIMESHEET = getStatusTimesheet();

export function TimeSheetPageContent({ params }: { params: { memberId: string } }) {
	const unwrappedParams = use(params as any) as { memberId: string };
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const [pageSize, setPageSize] = useState(10);

	const getPageSizeOptions = (total: number) => {
		if (total <= 10) return [10];
		if (total <= 20) return [10, 20];
		if (total <= 30) return [10, 20, 30];
		return [10, 20, 30, 50];
	};

	const activeTeam = useAtomValue(activeTeamState);

	const isTrackingEnabled = !!activeTeam?.members?.find(
		(member) => member.employee?.userId === user?.id && member.isTrackingEnabled
	);

	const [search, setSearch] = useState<string>('');
	const [timesheetDetailMode, setTimesheetDetailMode] = useLocalStorageState<TimesheetDetailMode>(
		'timesheet-detail-mode',
		'Pending'
	);
	const [timesheetNavigator, setTimesheetNavigator] = useLocalStorageState<TimesheetViewMode>(
		'timesheet-viewMode',
		'ListView'
	);

	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl ? paramsUrl.locale : null;
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{
				title: t('pages.timesheet.TIMESHEET_TITLE'),
				href: `/${currentLocale}/reports/timesheet/${unwrappedParams.memberId}`
			}
		],
		[activeTeam?.name, currentLocale, unwrappedParams.memberId, t]
	);

	/**
	 * Default date range for today
	 */
	const defaultDateRange = useMemo(() => {
		const today = new Date();
		// Set to start of day for "Today" filter
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		// Set to end of day for "Today" filter
		const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

		return {
			from: startOfToday,
			to: endOfToday
		};
	}, []);

	const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>(defaultDateRange);

	// Force default values on component mount
	React.useEffect(() => {
		// Force Today date range if it's not already set
		const isDefaultRange =
			dateRange.from?.getTime() === defaultDateRange.from.getTime() &&
			dateRange.to?.getTime() === defaultDateRange.to.getTime();

		if (!isDefaultRange) {
			setDateRange(defaultDateRange);
		}
	}, [defaultDateRange]); // Run only once on mount

	/**
	 * Memoized date range for timesheet
	 * Returns default dates if current dates are null
	 */
	const timesheetDateRange = useMemo(
		() => ({
			startDate: dateRange.from || defaultDateRange.from,
			endDate: dateRange.to || defaultDateRange.to
		}),
		[dateRange.from, dateRange.to, defaultDateRange]
	);

	const {
		timesheetElementGroup,
		statusTimesheet: loadedStatusTimesheet,
		loadingTimesheet,
		timesheetLogsQuery,
		isManage,
		timesheetGroupByDays,
		selectTimesheetId,
		setSelectTimesheetId
	} = useTimesheetQuery({
		startDate: timesheetDateRange.startDate,
		endDate: timesheetDateRange.endDate,
		timesheetViewMode: timesheetNavigator,
		inputSearch: search
	});
	// A failed load falls back to the logs left in the store, which belong to another range:
	// keep them out of the list, the summary cards, the status filter and the detail modal
	const hasLogsLoadError = timesheetLogsQuery.isLoadingError;
	const filterDataTimesheet = hasLogsLoadError ? NO_TIMESHEET_GROUPS : timesheetElementGroup;
	const statusTimesheet = hasLogsLoadError ? NO_STATUS_TIMESHEET : loadedStatusTimesheet;
	const {
		paginatedGroups,
		currentPage,
		totalPages,
		goToPage,
		nextPage,
		previousPage,
		getPageNumbers,
		totalGroups,
		dates
	} = useTimesheetPagination({
		data: filterDataTimesheet,
		pageSize
	});
	const viewData = useTimesheetViewData({
		timesheetNavigator,
		timesheetGroupByDays,
		paginatedGroups,
		filterDataTimesheet
	});

	const { activeStatus, setActiveStatus, filteredData, statusData } = useTimesheetFilters(viewData);

	const {
		isOpen: isManualTimeModalOpen,
		openModal: openManualTimeModal,
		closeModal: closeManualTimeModal
	} = useModal();

	const {
		isOpen: isTimesheetDetailOpen,
		openModal: openTimesheetDetail,
		closeModal: closeTimesheetDetail
	} = useModal();

	const username = user?.name || user?.firstName || user?.lastName || user?.username;

	const totalDuration = useMemo(() => {
		return statusTimesheet
			? Object.values(statusTimesheet)
					.flat()
					.map((entry) => {
						return differenceBetweenHours(
							entry.startedAt instanceof Date ? entry.startedAt : new Date(entry.startedAt || ''),
							entry.stoppedAt instanceof Date ? entry.stoppedAt : new Date(entry.stoppedAt || '')
						);
					})
					.reduce((total, current) => total + current, 0)
			: 0;
	}, [statusTimesheet]);
	const { hours: hours, minutes: minute } = secondsToTime(totalDuration || 0);

	const shouldRenderPagination =
		timesheetNavigator === 'ListView' ||
		(timesheetGroupByDays === 'Daily' && timesheetNavigator === 'CalendarView');

	let membersWorkedCount = 0;
	if (statusTimesheet) {
		membersWorkedCount = Object.values(statusTimesheet)
			.flat()
			.map((entry) => entry.employee?.id)
			.filter((id, index, array) => array.indexOf(id) === index).length;
	}

	const greetingTile = (
		<div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
			<h2 className="truncate text-base font-semibold text-foreground">
				{getGreeting(t)}, {username} !
			</h2>
			<p className="text-xs text-muted-foreground text-balance">{t('pages.timesheet.HEADING_DESCRIPTION')}</p>
		</div>
	);

	return (
		<>
			<PageLayout
				showTimer={isTrackingEnabled}
				breadcrumb={
					<div className="flex min-w-0 items-center gap-2">
						<Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						<Breadcrumb paths={breadcrumbPath} className="min-w-0 text-sm" />
					</div>
				}
				mainHeaderSlot={
					<div className="px-4">
						{/*  Use lazy loaded TimesheetFilter */}
						<LazyTimesheetFilter
							user={user}
							data={statusData}
							onChangeStatus={setActiveStatus}
							filterStatus={activeStatus}
							initDate={{
								initialRange: dateRange,
								onChange: React.useCallback((range: { from: Date | null; to: Date | null }) => {
									setDateRange(range);
								}, [])
							}}
							closeModal={closeManualTimeModal}
							openModal={openManualTimeModal}
							isOpen={isManualTimeModalOpen}
							t={t}
						>
							<h1 className="truncate text-lg font-semibold text-foreground">
								{t('pages.timesheet.TIMESHEET_TITLE')}
							</h1>
						</LazyTimesheetFilter>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
							<Tabs value={timesheetNavigator} activationMode="manual" className="gap-0">
								<TabsList className="border-b-0">
									<ViewToggleButton
										icon={<ListView />}
										mode="ListView"
										onClick={() => setTimesheetNavigator('ListView')}
										t={t}
									/>
									<ViewToggleButton
										icon={<Calendar />}
										mode="CalendarView"
										onClick={() => setTimesheetNavigator('CalendarView')}
										t={t}
									/>
								</TabsList>
							</Tabs>
							<div className={cn(controlGroupRecipe, 'mb-2 h-8 gap-x-2 px-2.5 sm:w-80 lg:w-96')}>
								<Search className="size-4 shrink-0 text-muted-foreground" />
								<input
									onChange={(v) => setSearch(v.target.value)}
									role="searchbox"
									aria-label="Search timesheet"
									type="search"
									name="timesheet-search"
									id="timesheet-search"
									className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
									placeholder={t('common.SEARCH')}
								/>
							</div>
						</div>
					</div>
				}
			>
				<div className="flex w-full flex-col gap-4">
					<Card className="flex flex-col hairline-divide-y divide-dashed divide-border overflow-hidden md:flex-row md:hairline-divide-x md:divide-y-0">
						{greetingTile}
						<LazyTimesheetCard
							count={statusTimesheet?.PENDING?.length || 0}
							title={t('common.PENDING_TASKS')}
							description={t('pages.timesheet.PENDING_TASKS_DESCRIPTION')}
							icon={<Task />}
							classNameIcon="bg-warning/10 text-warning-foreground"
							onClick={() => {
								setTimesheetDetailMode('Pending');
								openTimesheetDetail();
							}}
							key="pending-card"
						/>
						<LazyTimesheetCard
							hours={`${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
							title={t('common.MEN_HOURS')}
							date={`${moment(dateRange.from).format('YYYY-MM-DD')} - ${moment(dateRange.to).format('YYYY-MM-DD')}`}
							icon={<Clock />}
							onClick={() => {
								setTimesheetDetailMode('MenHours');
								openTimesheetDetail();
							}}
							key="hours-card"
						/>
						{isManage && (
							<LazyTimesheetCard
								count={membersWorkedCount}
								title={t('common.MEMBERS_WORKED')}
								description={t('pages.timesheet.MEMBERS_WORKED_DESCRIPTION')}
								icon={<Users />}
								onClick={() => {
									setTimesheetDetailMode('MemberWork');
									openTimesheetDetail();
								}}
								key="members-card"
							/>
						)}
					</Card>
					<Card className="overflow-x-auto">
						{/* Use lazy loaded components with conditional rendering */}
						{/* A failed load shows an error instead of an empty range */}
						{hasLogsLoadError && (
							<AnimatedEmptyState
								title={t('pages.error.HEADING_TITLE')}
								message={t('pages.error.HEADING_DESCRIPTION')}
								actionLabel={t('pages.unauthorized.TRY_AGAIN')}
								onAction={() => timesheetLogsQuery.refetch()}
								showBorder={false}
								noBg
							/>
						)}
						{!hasLogsLoadError && timesheetNavigator === 'ListView' && (
							<LazyTimesheetView
								user={user}
								data={filteredData}
								loading={loadingTimesheet}
								key={`listview-${dateRange.from?.getTime()}-${dateRange.to?.getTime()}`}
							/>
						)}
						{!hasLogsLoadError && timesheetNavigator !== 'ListView' && (
							<>
								<LazyCalendarView
									data={filteredData}
									loading={loadingTimesheet}
									key={`calendarview-${dateRange.from?.getTime()}-${dateRange.to?.getTime()}`}
								/>
								{selectTimesheetId.length > 0 && (
									<SelectedTimesheet
										selectTimesheetId={selectTimesheetId}
										setSelectTimesheetId={setSelectTimesheetId}
									/>
								)}
							</>
						)}
						{/*  Use lazy loaded TimesheetPagination */}
						{shouldRenderPagination && !hasLogsLoadError && (
							<LazyTimesheetPagination
								currentPage={currentPage}
								totalPages={totalPages}
								onPageChange={goToPage}
								getPageNumbers={getPageNumbers}
								goToPage={goToPage}
								nextPage={nextPage}
								previousPage={previousPage}
								dates={dates}
								totalGroups={totalGroups}
								pageSize={pageSize}
								onPageSizeChange={setPageSize}
								pageSizeOptions={getPageSizeOptions(totalGroups || 0)}
								key={`pagination-${currentPage}-${totalPages}`}
							/>
						)}
					</Card>
				</div>

				{/* Use lazy loaded modal with conditional rendering and Suspense */}
				{isTimesheetDetailOpen && (
					<Suspense fallback={<TimesheetDetailModalSkeleton />}>
						<LazyTimesheetDetailModal
							closeModal={closeTimesheetDetail}
							isOpen={isTimesheetDetailOpen}
							timesheet={statusTimesheet}
							timesheetDetailMode={timesheetDetailMode}
							key={`modal-${timesheetDetailMode}`}
						/>
					</Suspense>
				)}
			</PageLayout>
		</>
	);
}
