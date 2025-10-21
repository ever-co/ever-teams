'use client';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useEffect, useMemo, useState } from 'react';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { useTimeLimits } from '@/core/hooks/activities/use-time-limits';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth } from 'date-fns';
import moment from 'moment';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { getUserOrganizationsRequest } from '@/core/services/server/requests';
import { useTranslations } from 'next-intl';
import { groupDataByEmployee } from '@/core/components/pages/reports/weekly-limit/time-report-table';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { IOrganization } from '@/core/types/interfaces/organization/organization';
import { TTimeLimitReportList } from '@/core/types/schemas';
import { TGroupByOption } from '@/core/components/pages/reports/weekly-limit/group-by-select';
import { ReportsPageSkeleton } from '@/core/components/common/skeleton/reports-page-skeleton';
// Skeletons are now handled by optimized components

// Import optimized components from centralized location
import {
	LazyGroupBySelect,
	LazyWeeklyLimitExportMenu,
	LazyTimeReportTable,
	LazyDatePickerWithRange,
	LazyMembersSelect,
	LazyTimeReportTableByMember,
	LazyPaginate
} from '@/core/components/optimized-components/reports';
import { activeTeamState, isTrackingEnabledState, myPermissionsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

function WeeklyLimitReport() {
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { data: user } = useUserQuery();
	const [organization, setOrganization] = useState<IOrganization>();
	const { timeLimitsReports, getTimeLimitsReport, getTimeLimitReportLoading } = useTimeLimits();
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const [groupBy, setGroupBy] = useState<TGroupByOption[]>(['date']);
	const t = useTranslations();
	const myPermissions = useAtomValue(myPermissionsState);
	const breadcrumbPath = useMemo(
		() => [
			{ title: t('common.REPORTS'), href: '/' },
			{ title: t('common.WEEKLY_LIMIT'), href: '/' }
		],
		[t]
	);
	// Default organization time limits
	const organizationLimits = useMemo(
		() =>
			organization && {
				date: (organization.standardWorkHoursPerDay ?? 8) * 3600,
				week: (organization.standardWorkHoursPerDay ?? 8) * 3600 * 5
			},
		[organization]
	);
	const activeTeam = useAtomValue(activeTeamState);
	const [member, setMember] = useState<string>('all');
	const [dateRange, setDateRange] = useState<DateRange>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date())
	});
	const accessToken = useMemo(() => getAccessTokenCookie(), []);
	const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems, pageCount } =
		usePagination<TTimeLimitReportList>({
			items: groupBy.includes('week')
				? timeLimitsReports.filter((report) =>
						moment(report.date).isSame(moment(report.date).startOf('isoWeek'), 'day')
					)
				: timeLimitsReports
		});

	const duration = useMemo(() => groupBy.find((el) => el == 'date' || el == 'week') ?? 'date', [groupBy]);
	const displayMode = (groupBy.find((el) => el === 'date' || el === 'week') ?? 'date') as 'week' | 'date';

	// Get the organization
	useEffect(() => {
		if (organizationId && tenantId) {
			getUserOrganizationsRequest(
				{ tenantId, userId: user?.id ?? '', userPermissions: myPermissions },
				accessToken ?? ''
			).then((org) => {
				setOrganization(org.data.items[0].organization);
			});
		}
	}, [organizationId, tenantId, user?.id, accessToken]);

	// Get Time limits data
	useEffect(() => {
		getTimeLimitsReport({
			employeeIds: [
				...(member === 'all' ? (activeTeam?.members?.map((m: any) => m.employeeId) ?? []) : [member])
			],
			startDate: dateRange.from,
			endDate: dateRange.to,
			duration: duration == 'date' ? 'day' : duration,
			timeZone
		});
	}, [
		activeTeam?.members,
		dateRange.from,
		dateRange.to,
		duration,
		getTimeLimitsReport,
		groupBy,
		member,
		organizationId,
		tenantId,
		timeZone
	]);
	// IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks than expected" error
	if (!organization || !organizationLimits || getTimeLimitReportLoading) {
		return <ReportsPageSkeleton showTimer={isTrackingEnabled} fullWidth={false} />;
	}

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-row justify-between items-start">
						<div className="flex gap-8 justify-center items-center h-10">
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
					</div>
					<div className="flex flex-col justify-between w-full h-24">
						<div className="flex h-[5rem] items-center justify-between">
							<h2 className="text-3xl font-medium">
								{groupBy.includes('week') ? t('common.WEEKLY_LIMIT') : t('common.DAILY_LIMIT')}
							</h2>
							<div className="flex gap-4">
								<LazyMembersSelect onChange={(memberId) => setMember(memberId)} />
								<LazyDatePickerWithRange
									defaultValue={dateRange}
									onChange={(rangeDate) => setDateRange(rangeDate)}
								/>
								<LazyWeeklyLimitExportMenu
									dataByEmployee={groupDataByEmployee(timeLimitsReports)}
									isGroupedByEmployee={groupBy.includes('member')}
									data={
										groupBy.includes('week')
											? timeLimitsReports.filter((report) =>
													moment(report.date).isSame(
														moment(report.date).startOf('isoWeek'),
														'day'
													)
												)
											: timeLimitsReports
									}
									displayMode={displayMode}
									organizationLimits={organizationLimits}
									activeTeam={activeTeam}
								/>
							</div>
						</div>
						<div className="flex gap-2 items-center">
							<span>{t('common.GROUP_BY')}:</span>
							<LazyGroupBySelect defaultValues={groupBy} onChange={(option) => setGroupBy(option)} />
						</div>
					</div>
				</div>
			}
		>
			<div className="flex flex-col gap-6 p-4 mt-6 w-full bg-white dark:bg-dark--theme">
				{/* Data is guaranteed to be available here due to skeleton check above */}
				{groupBy.includes('member')
					? groupDataByEmployee(timeLimitsReports).map((data) => {
							return (
								<LazyTimeReportTableByMember
									header={<h4 className="text-xs font-medium">{data.employee.fullName}</h4>}
									indexTitle={displayMode}
									organizationLimits={organizationLimits}
									report={data}
									displayMode={displayMode}
									key={data.employee.fullName}
								/>
							);
						})
					: currentItems
							.filter((report) =>
								displayMode === 'week'
									? moment(report.date).isSame(moment(report.date).startOf('isoWeek'), 'date')
									: true
							)
							.map((report) => {
								return (
									<LazyTimeReportTable
										header={
											displayMode === 'week' ? (
												<h4 className="text-xs">
													<span className="font-medium">{report.date}</span>{' '}
													<span className="mx-2">-</span>
													<span className="font-medium">
														{moment(report.date).endOf('week').format('YYYY-MM-DD')}
													</span>
												</h4>
											) : (
												<h4 className="text-xs font-medium">{report.date}</h4>
											)
										}
										indexTitle={t('common.MEMBER')}
										organizationLimits={organizationLimits}
										report={report}
										displayMode={displayMode}
										key={report.date}
									/>
								);
							})}
			</div>
			{
				// TODO : Improve the pagination accordingly to filtered data
			}
			<div className="flex px-4 py-4 bg-white dark:bg-dark--theme">
				<LazyPaginate
					total={total}
					onPageChange={onPageChange}
					pageCount={pageCount}
					itemsPerPage={itemsPerPage}
					itemOffset={itemOffset}
					endOffset={endOffset}
					setItemsPerPage={setItemsPerPage}
					className="pt-0"
				/>
			</div>
		</MainLayout>
	);
}

export default withAuthentication(WeeklyLimitReport, { displayName: 'WeeklyLimitReport' });
