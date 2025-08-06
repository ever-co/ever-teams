'use client';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import React, { Suspense, use, useMemo, useState } from 'react';

import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

import { useLocalStorageState, useModal } from '@/core/hooks';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useAtomValue } from 'jotai';

import {
	CalendarViewIcon,
	ListViewIcon,
	MemberWorkIcon,
	MenHoursIcon,
	PendingTaskIcon,
	SelectedTimesheet
} from '@/core/components/timesheet';
import { ArrowLeftIcon } from 'assets/svg';
import type { IconBaseProps } from 'react-icons';
import { TimesheetDetailModalSkeleton } from '@/core/components/common/skeleton/timesheet-skeletons';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { IconsSearch } from '@/core/components/icons';
import { ViewToggleButton } from '@/core/components/timesheet/timesheet-toggle-view';
import { useTimesheet } from '@/core/hooks/activities/use-timesheet';
import { useTimesheetFilters } from '@/core/hooks/activities/use-timesheet-filters';
import { useTimesheetPagination } from '@/core/hooks/activities/use-timesheet-pagination';
import { useTimesheetViewData } from '@/core/hooks/activities/use-timesheet-view-data';
import { differenceBetweenHours, getGreeting, secondsToTime } from '@/core/lib/helpers/index';
import { activeTeamState, userState } from '@/core/stores';
import {
	LazyCalendarView,
	LazyTimesheetView,
	LazyTimesheetDetailModal,
	LazyTimesheetFilter,
	LazyTimesheetCard,
	LazyTimesheetPagination
} from '@/core/components/optimized-components/calendar';

type TimesheetViewMode = 'ListView' | 'CalendarView';
export type TimesheetDetailMode = 'Pending' | 'MenHours' | 'MemberWork';
export function TimeSheetPageContent({ params }: { params: { memberId: string } }) {
	const unwrappedParams = use(params as any) as { memberId: string };
	const t = useTranslations();
	const user = useAtomValue(userState);
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
		timesheet: filterDataTimesheet,
		statusTimesheet,
		loadingTimesheet,
		isManage,
		timesheetGroupByDays,
		selectTimesheetId,
		setSelectTimesheetId,
		updateTimesheetStatus,
		deleteTaskTimesheet
	} = useTimesheet({
		startDate: timesheetDateRange.startDate,
		endDate: timesheetDateRange.endDate,
		timesheetViewMode: timesheetNavigator,
		inputSearch: search
	});

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

	const fullWidth = useAtomValue(fullWidthState);

	const shouldRenderPagination =
		timesheetNavigator === 'ListView' ||
		(timesheetGroupByDays === 'Daily' && timesheetNavigator === 'CalendarView');

	const SearchIcon: React.FC<IconBaseProps> = (props) => {
		return <IconsSearch {...props} />;
	};

	return (
		<>
			<MainLayout
				showTimer={isTrackingEnabled}
				className="items-start pb-1 !overflow-hidden w-full"
				childrenClassName="w-full"
				mainHeaderSlot={
					<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
						<Container fullWidth={fullWidth} className="flex flex-col gap-y-3">
							<div className="flex flex-row justify-between items-start">
								<div className="flex gap-8 justify-center items-center h-10">
									<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
							</div>
							<div className="flex flex-col gap-y-2 justify-start items-start">
								<h1 className="!text-[23px] font-bold text-[#282048] dark:text-white">
									{getGreeting(t)}, {username} !
								</h1>
								<span className="text-sm text-[#3D5A80] dark:text-gray-500">
									{t('pages.timesheet.HEADING_DESCRIPTION')}
								</span>
							</div>
							<div className="flex gap-6 justify-between items-center mb-4 w-full">
								<LazyTimesheetCard
									count={statusTimesheet?.PENDING?.length || 0}
									title={t('common.PENDING_TASKS')}
									description="Tasks waiting for your approval"
									icon={<PendingTaskIcon />}
									classNameIcon="bg-[#FBB650] shadow-[#fbb75095]"
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
									icon={<MenHoursIcon />}
									classNameIcon="bg-[#3D5A80] shadow-[#3d5a809c] "
									onClick={() => {
										setTimesheetDetailMode('MenHours');
										openTimesheetDetail();
									}}
									key="hours-card"
								/>
								{isManage && (
									<LazyTimesheetCard
										count={
											statusTimesheet
												? Object.values(statusTimesheet)
														.flat()
														.map((entry) => entry.employee?.id)
														.filter((id, index, array) => array.indexOf(id) === index)
														.length
												: 0
										}
										title={t('common.MEMBERS_WORKED')}
										description="People worked since last time"
										icon={<MemberWorkIcon />}
										classNameIcon="bg-[#30B366] shadow-[#30b3678f]"
										onClick={() => {
											setTimesheetDetailMode('MemberWork');
											openTimesheetDetail();
										}}
										key="members-card"
									/>
								)}
							</div>
							<div className="flex overflow-hidden justify-between items-center w-full">
								<div className="flex w-full">
									<ViewToggleButton
										icon={<ListViewIcon />}
										mode="ListView"
										active={timesheetNavigator === 'ListView'}
										onClick={() => setTimesheetNavigator('ListView')}
										t={t}
									/>
									<ViewToggleButton
										icon={<CalendarViewIcon />}
										mode="CalendarView"
										active={timesheetNavigator === 'CalendarView'}
										onClick={() => setTimesheetNavigator('CalendarView')}
										t={t}
									/>
								</div>
								<div className="flex items-center !h-[2.2rem] w-[700px] bg-white dark:bg-dark--theme-light gap-x-2 px-2 border border-gray-200 dark:border-gray-700 rounded-sm mb-2">
									<SearchIcon className="text-[#7E7991]" />
									<input
										onChange={(v) => setSearch(v.target.value)}
										role="searchbox"
										aria-label="Search timesheet"
										type="search"
										name="timesheet-search"
										id="timesheet-search"
										className="!h-[2.2rem] w-full bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent placeholder-gray-500 placeholder:font-medium shadow-sm outline-none"
										placeholder={t('common.SEARCH')}
									/>
								</div>
							</div>
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
							/>
						</Container>
					</div>
				}
			>
				<div className="flex flex-col w-full border-1 rounded-lg bg-[#FFFFFF] dark:bg-dark--theme mt-6">
					<div className="rounded-lg border border-gray-200 dark:border-gray-800">
						{/* Use lazy loaded components with conditional rendering */}
						{timesheetNavigator === 'ListView' ? (
							<LazyTimesheetView
								user={user}
								data={filteredData}
								loading={loadingTimesheet}
								key={`listview-${dateRange.from?.getTime()}-${dateRange.to?.getTime()}`}
							/>
						) : (
							<>
								<LazyCalendarView
									data={filteredData}
									loading={loadingTimesheet}
									key={`calendarview-${dateRange.from?.getTime()}-${dateRange.to?.getTime()}`}
								/>
								{selectTimesheetId.length > 0 && (
									<SelectedTimesheet
										deleteTaskTimesheet={deleteTaskTimesheet}
										fullWidth={fullWidth}
										selectTimesheetId={selectTimesheetId}
										setSelectTimesheetId={setSelectTimesheetId}
										updateTimesheetStatus={updateTimesheetStatus}
									/>
								)}
							</>
						)}
						{/*  Use lazy loaded TimesheetPagination */}
						{shouldRenderPagination && (
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
					</div>
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
			</MainLayout>
		</>
	);
}
