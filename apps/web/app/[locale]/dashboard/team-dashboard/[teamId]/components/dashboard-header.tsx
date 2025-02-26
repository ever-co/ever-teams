/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from './date-range-picker';
import { DateRange } from 'react-day-picker';
import { ITimeLogReportDailyChartProps } from '@/app/interfaces/timer/ITimerLog';
import { TeamDashboardFilter } from './team-dashboard-filter';
import { GroupBySelect } from '../../../app-url/components/GroupBySelect';
import { GroupByType } from '@/app/hooks/features/useReportActivity';

interface DashboardHeaderProps {
	onUpdateDateRange: (startDate: Date, endDate: Date) => void;
	onUpdateFilters: (filters: Partial<Omit<ITimeLogReportDailyChartProps, 'organizationId' | 'tenantId'>>) => void;
	title?: string;
	isManage?: boolean;
	showGroupBy?: boolean;
	groupByType?: GroupByType;
	onGroupByChange?: (value: GroupByType) => void;

}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DashboardHeader({
	onUpdateDateRange,
	onUpdateFilters,
	title,
	isManage,
	showGroupBy,
	groupByType,
	onGroupByChange
}: DashboardHeaderProps) {
	const handleDateRangeChange = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			onUpdateDateRange(range.from, range.to);
		}
	};

	return (
		<div className="flex justify-between items-center w-full">
			<h1 className="text-2xl font-semibold">{title}</h1>
			<div className="flex gap-4 items-center">
				{showGroupBy && <GroupBySelect groupByType={groupByType} onGroupByChange={onGroupByChange} />}
				<DateRangePicker onDateRangeChange={handleDateRangeChange} />
				<TeamDashboardFilter isManage={isManage} />
				<Select defaultValue="export">
					<SelectTrigger className="w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
						<SelectValue placeholder="Export" />
					</SelectTrigger>
					<SelectContent className="dark:bg-dark--theme-light">
						<SelectItem value="export">Export</SelectItem>
						<SelectItem value="csv">CSV</SelectItem>
						<SelectItem value="pdf">PDF</SelectItem>
						<SelectItem value="xlsx">XLSX</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
