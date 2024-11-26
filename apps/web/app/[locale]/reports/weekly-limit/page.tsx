'use client';

import { useOrganizationTeams } from '@/app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
import { Breadcrumb } from '@/lib/components';
import { MainLayout } from '@/lib/layout';
import { useEffect, useMemo, useState } from 'react';
import { DatePickerWithRange } from './components/date-range-select';
import { MembersSelect } from './components/members-select';
import { GroupBySelect, TGroupByOption } from './components/group-by-select';
import { ExportModeSelect } from './components/export-mode-select';
import { DataTableWeeklyLimits } from './components/data-table';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
import { useTimeLimits } from '@/app/hooks/features/useTimeLimits';
import { DateRange } from 'react-day-picker';
import { endOfMonth, startOfMonth } from 'date-fns';

function WeeklyLimitReport() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const { timeLimitsReport, getTimeLimitsReport } = useTimeLimits();
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const breadcrumbPath = useMemo(
		() => [
			{ title: 'Reports', href: '#' },
			{ title: 'Weekly Limit', href: '#' }
		],
		[]
	);
	const { activeTeam } = useOrganizationTeams();
	const [, setGroupBy] = useState<TGroupByOption>('Date');
	const [member, setMember] = useState<string>('all');
	const [dateRange, setDateRange] = useState<DateRange>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date())
	});
	const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

	useEffect(() => {
		getTimeLimitsReport({
			organizationId,
			tenantId,
			employeeIds: [...(member === 'all' ? activeTeam?.members.map((m) => m.employeeId) ?? [] : [member])],
			startDate: dateRange.from?.toISOString(),
			endDate: dateRange.to?.toISOString(),
			duration: 'week',
			timeZone
			//TODO : add groupBy query (when it is ready in the API side)
		});
	}, [
		activeTeam?.members,
		dateRange.from,
		dateRange.to,
		getTimeLimitsReport,
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
							<h2 className="text-3xl font-medium">Weekly Limit</h2>
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
							<span>Group by:</span>
							<GroupBySelect onChange={(option) => setGroupBy(option)} />
						</div>
					</div>
				</div>
			}
		>
			<div className="flex flex-col  p-4  w-full  bg-white  gap-6  dark:bg-dark--theme mt-6">
				{timeLimitsReport.map((report) => {
					return (
						<div className="w-full p-1" key={report.date}>
							<div className="h-12 px-4 bg-slate-100 dark:bg-gray-800 dark:text-white rounded-md flex border items-center">
								<h4 className=" text-xs font-medium ">{report.date}</h4>
							</div>
							<div>
								<DataTableWeeklyLimits
									data={report.employees?.map((item) => ({
										member: item.employee.fullName,
										limit: item.limit || 28_800,
										percentageUsed: (item.duration / 28_800) * 100,
										timeSpent: item.duration,
										remaining: 28_800 - item.duration
									}))}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</MainLayout>
	);
}

export default withAuthentication(WeeklyLimitReport, { displayName: 'WeeklyLimitReport' });
