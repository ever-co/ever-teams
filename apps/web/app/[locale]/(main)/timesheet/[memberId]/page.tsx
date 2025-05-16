'use client';
import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import moment from 'moment';
import { useTranslations } from 'next-intl';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

import {
	useAuthenticateUser,
	useLocalStorageState,
	useModal,
	useOrganizationProjects,
	useOrganizationTeams
} from '@/core/hooks';
import { fullWidthState } from '@/core/stores/fullWidth';
import { useAtomValue } from 'jotai';

import { ArrowLeftIcon } from 'assets/svg';
import {
	CalendarView,
	CalendarViewIcon,
	ListViewIcon,
	MemberWorkIcon,
	MenHoursIcon,
	PendingTaskIcon,
	SelectedTimesheet,
	TimesheetCard,
	TimesheetFilter,
	TimesheetView
} from '@/core/components/timesheet';
import type { IconBaseProps } from 'react-icons';

import { differenceBetweenHours, getGreeting, secondsToTime } from '@/core/lib/helpers/index';
import { useTimesheet } from '@/core/hooks/activities/use-timesheet';
import { endOfMonth, startOfMonth } from 'date-fns';
import TimesheetDetailModal from '@/core/components/pages/timesheet/timesheet-detail-modal';
import { useTimesheetPagination } from '@/core/hooks/activities/use-timesheet-pagination';
import TimesheetPagination from '@/core/components/timesheet/timesheet-pagination';
import { useTimesheetFilters } from '@/core/hooks/activities/use-timesheet-filters';
import { useTimesheetViewData } from '@/core/hooks/activities/use-timesheet-view-data';
import { IconsSearch } from '@/core/components/icons';
import { ViewToggleButton } from '@/core/components/timesheet/timesheet-toggle-view';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

type TimesheetViewMode = 'ListView' | 'CalendarView';
export type TimesheetDetailMode = 'Pending' | 'MenHours' | 'MemberWork';

const TimeSheet = React.memo(function TimeSheetPage({ params }: { params: { memberId: string } }) {
	const unwrappedParams = React.use(params as any) as { memberId: string };
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const [pageSize, setPageSize] = useState(10);

	const getPageSizeOptions = (total: number) => {
		if (total <= 10) return [10];
		if (total <= 20) return [10, 20];
		if (total <= 30) return [10, 20, 30];
		return [10, 20, 30, 50];
	};
	const { getOrganizationProjects } = useOrganizationProjects();

	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const [search, setSearch] = useState<string>('');
	const [timesheetDetailMode, setTimesheetDetailMode] = useLocalStorageState<TimesheetDetailMode>(
		'timesheet-detail-mode',
		'Pending'
	);
	const [timesheetNavigator, setTimesheetNavigator] = useLocalStorageState<TimesheetViewMode>(
		'timesheet-viewMode',
		'ListView'
	);

	/**
	 * Default date range for the current month
	 */
	const defaultDateRange = useMemo(
		() => ({
			from: startOfMonth(new Date()),
			to: endOfMonth(new Date())
		}),
		[]
	);

	const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>(defaultDateRange);

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

	React.useEffect(() => {
		getOrganizationProjects();
	}, [getOrganizationProjects]);

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

	const totalDuration = Object.values(statusTimesheet)
		.flat()
		.map((entry) => {
			return differenceBetweenHours(
				entry.startedAt instanceof Date ? entry.startedAt : new Date(entry.startedAt),
				entry.stoppedAt instanceof Date ? entry.stoppedAt : new Date(entry.stoppedAt)
			);
		})
		.reduce((total, current) => total + current, 0);
	const { h: hours, m: minute } = secondsToTime(totalDuration || 0);

	const fullWidth = useAtomValue(fullWidthState);

	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl ? paramsUrl.locale : null;
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{
				title: t('pages.timesheet.TIMESHEET_TITLE'),
				href: `/${currentLocale}/timesheet/${unwrappedParams.memberId}`
			}
		],
		[activeTeam?.name, currentLocale, unwrappedParams.memberId, t]
	);
	const shouldRenderPagination =
		timesheetNavigator === 'ListView' ||
		(timesheetGroupByDays === 'Daily' && timesheetNavigator === 'CalendarView');

	const SearchIcon: React.FC<IconBaseProps> = (props) => {
		return <IconsSearch {...props} />;
	};

	return (
		<>
			{isTimesheetDetailOpen && (
				<TimesheetDetailModal
					closeModal={closeTimesheetDetail}
					isOpen={isTimesheetDetailOpen}
					timesheet={statusTimesheet}
					timesheetDetailMode={timesheetDetailMode}
				/>
			)}
			<MainLayout
				showTimer={isTrackingEnabled}
				className="items-start pb-1 !overflow-hidden w-full"
				childrenClassName="w-full"
				mainHeaderSlot={
					<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
						<Container fullWidth={fullWidth} className="flex flex-col gap-y-2">
							<div className="flex flex-row items-start justify-between">
								<div className="flex items-center justify-center h-10 gap-8">
									<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
							</div>

							<div className="flex flex-col items-start justify-start gap-y-2">
								<h1 className="!text-[23px] font-bold text-[#282048] dark:text-white">
									{getGreeting(t)}, {username} !
								</h1>
								<span className="text-sm text-[#3D5A80] dark:text-gray-500">
									{t('pages.timesheet.HEADING_DESCRIPTION')}
								</span>
							</div>
							<div className="flex items-center justify-between w-full gap-6 pt-4">
								<TimesheetCard
									count={statusTimesheet.PENDING.length}
									title={t('common.PENDING_TASKS')}
									description="Tasks waiting for your approval"
									icon={<PendingTaskIcon />}
									classNameIcon="bg-[#FBB650] shadow-[#fbb75095]"
									onClick={() => {
										setTimesheetDetailMode('Pending');
										openTimesheetDetail();
									}}
								/>
								<TimesheetCard
									hours={`${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
									title={t('common.MEN_HOURS')}
									date={`${moment(dateRange.from).format('YYYY-MM-DD')} - ${moment(dateRange.to).format('YYYY-MM-DD')}`}
									icon={<MenHoursIcon />}
									classNameIcon="bg-[#3D5A80] shadow-[#3d5a809c] "
									onClick={() => {
										setTimesheetDetailMode('MenHours');
										openTimesheetDetail();
									}}
								/>
								{isManage && (
									<TimesheetCard
										count={
											Object.values(statusTimesheet)
												.flat()
												.map((entry) => entry.employee.id)
												.filter((id, index, array) => array.indexOf(id) === index).length
										}
										title={t('common.MEMBERS_WORKED')}
										description="People worked since last time"
										icon={<MemberWorkIcon />}
										classNameIcon="bg-[#30B366] shadow-[#30b3678f]"
										onClick={() => {
											setTimesheetDetailMode('MemberWork');
											openTimesheetDetail();
										}}
									/>
								)}
							</div>
							<div className="flex justify-between w-full overflow-hidden">
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
							<TimesheetFilter
								user={user}
								data={statusData}
								onChangeStatus={setActiveStatus}
								filterStatus={activeStatus}
								initDate={{
									initialRange: dateRange,
									onChange(range) {
										setDateRange(range);
									}
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
				<div className="flex flex-col w-full border-1 rounded-lg bg-[#FFFFFF] dark:bg-dark--theme px-4">
					<Container fullWidth={fullWidth} className="h-full py-5 mt-3">
						<div className="border border-gray-200 rounded-lg dark:border-gray-800">
							{timesheetNavigator === 'ListView' ? (
								<TimesheetView user={user} data={filteredData} loading={loadingTimesheet} />
							) : (
								<>
									<CalendarView data={filteredData} loading={loadingTimesheet} />
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
							{shouldRenderPagination && (
								<TimesheetPagination
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
								/>
							)}
						</div>
					</Container>
				</div>
			</MainLayout>
		</>
	);
});

export default withAuthentication(TimeSheet, { displayName: 'TimeSheet', showPageSkeleton: true });
