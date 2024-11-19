'use client';
import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import moment from 'moment';
import { useTranslations, TranslationHooks } from 'next-intl';

import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';

import { useAuthenticateUser, useLocalStorageState, useModal, useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';
import { fullWidthState } from '@app/stores/fullWidth';
import { useAtomValue } from 'jotai';

import { ArrowLeftIcon } from 'assets/svg';
import { CalendarView, FilterStatus, TimesheetCard, TimesheetFilter, TimesheetView } from './components';
import { CalendarDaysIcon, Clock, User2 } from 'lucide-react';
import { GrTask } from 'react-icons/gr';
import { GoSearch } from 'react-icons/go';

import { getGreeting } from '@/app/helpers';
import { useTimesheet } from '@/app/hooks/features/useTimesheet';
import { endOfDay, startOfDay } from 'date-fns';

type TimesheetViewMode = 'ListView' | 'CalendarView';

type ViewToggleButtonProps = {
	mode: TimesheetViewMode;
	active: boolean;
	icon: React.ReactNode;
	onClick: () => void;
	t: TranslationHooks;
};

const TimeSheet = React.memo(function TimeSheetPage({ params }: { params: { memberId: string } }) {
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const [search, setSearch] = useState<string>('');
	const [filterStatus, setFilterStatus] = useLocalStorageState<FilterStatus>('timesheet-filter-status', 'All Tasks');

	const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>({
		from: startOfDay(new Date()),
		to: endOfDay(new Date())
	});

	const { timesheet } = useTimesheet({
		startDate: dateRange.from ?? '',
		endDate: dateRange.to ?? ''
	});

	const lowerCaseSearch = useMemo(() => search?.toLowerCase() ?? '', [search]);
	const filterDataTimesheet = useMemo(
		() =>
			timesheet.filter((v) =>
				v.tasks.some(
					(task) =>
						task.task?.title?.toLowerCase()?.includes(lowerCaseSearch) ||
						task.employee?.fullName?.toLowerCase()?.includes(lowerCaseSearch) ||
						task.project?.name?.toLowerCase()?.includes(lowerCaseSearch)
				)
			),
		[timesheet, lowerCaseSearch]
	);

	const {
		isOpen: isManualTimeModalOpen,
		openModal: openManualTimeModal,
		closeModal: closeManualTimeModal
	} = useModal();
	const username = user?.name || user?.firstName || user?.lastName || user?.username;

	const [timesheetNavigator, setTimesheetNavigator] = useLocalStorageState<TimesheetViewMode>(
		'timesheet-viewMode',
		'ListView'
	);

	const fullWidth = useAtomValue(fullWidthState);
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();

	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl ? paramsUrl.locale : null;
	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('pages.timesheet.TIMESHEET_TITLE'), href: `/${currentLocale}/timesheet/${params.memberId}` }
		],
		[activeTeam?.name, currentLocale, t]
	);
	return (
		<>
			<MainLayout
				showTimer={isTrackingEnabled}
				className="items-start pb-1 !overflow-hidden w-full"
				childrenClassName="!overflow-y-auto w-full"
				isFooterFixed
				mainHeaderSlot={
					<div className="flex flex-col border-b-[1px] dark:border-gray-800 z-10 mx-0 w-full bg-white dark:bg-dark-high shadow-2xl shadow-transparent dark:shadow-transparent">
						<Container fullWidth={fullWidth} className="bg-white">
							<div className="flex flex-row items-start justify-between mt-12 bg-white dark:bg-dark-high">
								<div className="flex items-center justify-center h-10 gap-8">
									<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
									<Breadcrumb paths={breadcrumbPath} className="text-sm" />
								</div>
							</div>
						</Container>
					</div>
				}
			>
				<div className="h-full pb-4 pt-14">
					<Container fullWidth={fullWidth} className="h-full">
						<div className="pb-5">
							<div className="flex flex-col items-start justify-start gap-y-2">
								<h1 className="!text-[23px] font-bold text-[#282048] dark:text-white">
									{getGreeting(t)}, {username} !
								</h1>
								<span className="text-[16px] text-[#3D5A80] dark:text-gray-500">
									{t('pages.timesheet.HEADING_DESCRIPTION')}
								</span>
							</div>
							<div className="flex items-center justify-between w-full gap-6 pt-4">
								<TimesheetCard
									count={72}
									title="Pending Tasks"
									description="Tasks waiting for your approval"
									icon={<GrTask className="font-bold" />}
									classNameIcon="bg-[#FBB650] shadow-[#fbb75095]"
								/>
								<TimesheetCard
									hours="63:00h"
									title="Men Hours"
									date={`${moment(dateRange.from).format('YYYY-MM-DD')} - ${moment(dateRange.to).format('YYYY-MM-DD')}`}
									icon={<Clock className="font-bold" />}
									classNameIcon="bg-[#3D5A80] shadow-[#3d5a809c] "
								/>
								<TimesheetCard
									count={8}
									title="Members Worked"
									description="People worked since last time"
									icon={<User2 className="font-bold" />}
									classNameIcon="bg-[#30B366] shadow-[#30b3678f]"
								/>
							</div>
						</div>
						<div className="border-b-2 border-b-[#E2E8F0] dark:border-b-gray-700 w-full  flex justify-between pt-2 overflow-hidden">
							<div className="flex w-full">
								<ViewToggleButton
									icon={<GrTask className="text-sm" />}
									mode="ListView"
									active={timesheetNavigator === 'ListView'}
									onClick={() => setTimesheetNavigator('ListView')}
									t={t}
								/>
								<ViewToggleButton
									icon={<CalendarDaysIcon size={20} className="!text-sm" />}
									mode="CalendarView"
									active={timesheetNavigator === 'CalendarView'}
									onClick={() => setTimesheetNavigator('CalendarView')}
									t={t}
								/>
							</div>
							<div className="flex items-center !h-[2.2rem] w-[700px] bg-white dark:bg-dark--theme-light gap-x-2 px-2 border border-gray-200 dark:border-gray-700 rounded-sm mb-2">
								<GoSearch className="text-[#7E7991]" />
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
						{/* <DropdownMenuDemo /> */}
						<div className="flex flex-col overflow-y-auto  w-full border-1 rounded-lg bg-[#FFFFFF]  dark:bg-dark--theme p-4 mt-4">
							<TimesheetFilter
								onChangeStatus={setFilterStatus}
								filterStatus={filterStatus}
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
							<div className="h-[calc(100vh-_291px)] mt-3 overflow-y-auto border border-gray-200 rounded-lg dark:border-gray-800">
								{timesheetNavigator === 'ListView' ? (
									<TimesheetView data={filterDataTimesheet} />
								) : (
									<CalendarView />
								)}
							</div>
						</div>
					</Container>
				</div>
			</MainLayout>
		</>
	);
});

export default withAuthentication(TimeSheet, { displayName: 'TimeSheet' });

const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({ mode, active, icon, onClick, t }) => (
	<button
		onClick={onClick}
		className={clsxm(
			'text-[#7E7991]  font-medium w-[191px] h-[40px] flex items-center gap-x-4 text-[14px] px-2 rounded',
			active &&
				'border-b-primary text-primary border-b-2 dark:text-primary-light dark:border-b-primary-light bg-[#F1F5F9] dark:bg-gray-800 font-bold'
		)}
	>
		{icon}
		<span>{mode === 'ListView' ? t('pages.timesheet.VIEWS.LIST') : t('pages.timesheet.VIEWS.CALENDAR')}</span>
	</button>
);
