'use client';

import { useAuthenticateUser, useOrganizationTeams } from '@/app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
import { Breadcrumb, Paginate } from '@/lib/components';
import { MainLayout } from '@/lib/layout';
import { useEffect, useMemo, useState } from 'react';
import { DatePickerWithRange } from '../../../../components/shared/date-range-select';
import { MembersSelect } from './components/members-select';
import { GroupBySelect, TGroupByOption } from './components/group-by-select';
import { ExportModeSelect } from '../../../../components/shared/export-mode-select';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
import { useTimeLimits } from '@/app/hooks/features/useTimeLimits';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth } from 'date-fns';
import moment from 'moment';
import { usePagination } from '@/app/hooks/features/usePagination';
import { ITimeLimitReport } from '@/app/interfaces/ITimeLimits';
import { getUserOrganizationsRequest } from '@/app/services/server/requests';
import { IOrganization } from '@/app/interfaces';
import { useTranslations } from 'next-intl';
import { groupDataByEmployee, TimeReportTable, TimeReportTableByMember } from './components/time-report-table';

function WeeklyLimitReport() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const { user } = useAuthenticateUser();
	const [organization, setOrganization] = useState<IOrganization>();
	const { timeLimitsReports, getTimeLimitsReport } = useTimeLimits();
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const [groupBy, setGroupBy] = useState<TGroupByOption[]>(['date']);
	const t = useTranslations();
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
				date: organization.standardWorkHoursPerDay * 3600,
				week: organization.standardWorkHoursPerDay * 3600 * 5
			},
		[organization]
	);
	const { activeTeam } = useOrganizationTeams();
	const [member, setMember] = useState<string>('all');
	const [dateRange, setDateRange] = useState<DateRange>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date())
	});
	const accessToken = useMemo(() => getAccessTokenCookie(), []);
	const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<ITimeLimitReport>(
			groupBy.includes('week')
				? timeLimitsReports.filter((report) =>
						moment(report.date).isSame(moment(report.date).startOf('isoWeek'), 'day')
					)
				: timeLimitsReports
		);

	const duration = useMemo(() => groupBy.find((el) => el == 'date' || el == 'week') ?? 'date', [groupBy]);
	const displayMode = (groupBy.find((el) => el === 'date' || el === 'week') ?? 'date') as 'week' | 'date';

	// Get the organization
	useEffect(() => {
		if (organizationId && tenantId) {
			getUserOrganizationsRequest({ tenantId, userId: user?.id ?? '' }, accessToken ?? '').then((org) => {
				setOrganization(org.data.items[0].organization);
			});
		}
	}, [organizationId, tenantId, user?.id, accessToken]);

	// Get Time limits data
	useEffect(() => {
		getTimeLimitsReport({
			organizationId,
			tenantId,
			employeeIds: [...(member === 'all' ? activeTeam?.members.map((m) => m.employeeId) ?? [] : [member])],
			startDate: dateRange.from?.toISOString(),
			endDate: dateRange.to?.toISOString(),
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

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-row items-start justify-between">
						<div className="flex items-center justify-center h-10 gap-8">
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
					</div>
					<div className=" h-24 w-full flex flex-col justify-between">
						<div className="flex h-[5rem] items-center justify-between">
							<h2 className="text-3xl font-medium">
								{groupBy.includes('week') ? t('common.WEEKLY_LIMIT') : t('common.DAILY_LIMIT')}
							</h2>
							<div className="flex gap-4">
								<MembersSelect onChange={(memberId) => setMember(memberId)} />
								<DatePickerWithRange
									defaultValue={dateRange}
									onChange={(rangeDate) => setDateRange(rangeDate)}
								/>
								<ExportModeSelect onChange={(value) => console.log(value)} />
							</div>
						</div>
						<div className="flex gap-2 items-center">
							<span>{t('common.GROUP_BY')}:</span>
							<GroupBySelect defaultValues={groupBy} onChange={(option) => setGroupBy(option)} />
						</div>
					</div>
				</div>
			}
		>
			<div className="flex flex-col p-4 w-full bg-white gap-6 dark:bg-dark--theme mt-6">
				{organization && organizationLimits ? (
					groupBy.includes('member') ? (
						groupDataByEmployee(timeLimitsReports).map((data) => {
							return (
								<TimeReportTableByMember
									header={<h4 className="text-xs font-medium">{data.employee.fullName}</h4>}
									indexTitle={displayMode}
									organizationLimits={organizationLimits}
									report={data}
									displayMode={displayMode}
									key={data.employee.fullName}
								/>
							);
						})
					) : (
						currentItems
							.filter((report) =>
								displayMode === 'week'
									? moment(report.date).isSame(moment(report.date).startOf('isoWeek'), 'date')
									: true
							)
							.map((report) => {
								return (
									<TimeReportTable
										header={
											displayMode === 'week' ? (
												<h4 className="text-xs font-medium">
													<span>{report.date}</span> <span>-</span>
													<span>
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
							})
					)
				) : (
					<div>{t('common.LOADING')}</div>
				)}
			</div>
			{
				// TODO : Improve the pagination accordingly to filtered data
			}
			<div className=" bg-white dark:bg-dark--theme px-4 py-4 flex">
				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
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
