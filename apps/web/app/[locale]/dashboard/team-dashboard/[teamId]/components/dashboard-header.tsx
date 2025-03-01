/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from './date-range-picker';
import { DateRange } from 'react-day-picker';
import { ITimeLogReportDailyChartProps } from '@/app/interfaces/timer/ITimerLog';
import { TeamDashboardFilter } from './team-dashboard-filter';
import { GroupBySelect } from '../../../app-url/components/GroupBySelect';
import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { ExportDialog } from '@components/ui/export-dialog';

interface DashboardHeaderProps {
	onUpdateDateRange: (startDate: Date, endDate: Date) => void;
	onUpdateFilters: (filters: Partial<Omit<ITimeLogReportDailyChartProps, 'organizationId' | 'tenantId'>>) => void;
	title?: string;
	isManage?: boolean;
	showGroupBy?: boolean;
	groupByType?: GroupByType;
	onGroupByChange?: (value: GroupByType) => void;
	reportData?: any[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DashboardHeader({
	onUpdateDateRange,
	onUpdateFilters,
	title,
	isManage,
	showGroupBy,
	groupByType,
	onGroupByChange,
	reportData
}: DashboardHeaderProps) {
	const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
	const [selectedExportType, setSelectedExportType] = React.useState<string>('');

	const handleExportSelect = (value: string) => {
		if (value !== 'export') {
			setSelectedExportType(value);
			setExportDialogOpen(true);
		}
	};
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
				<div className="flex gap-2 items-center">
					<Select defaultValue="export" onValueChange={handleExportSelect}>
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
				<ExportDialog
					isOpen={exportDialogOpen}
					onClose={() => setExportDialogOpen(false)}
					exportType={selectedExportType}
					reportData={reportData}
				/>
			</div>
		</div>
	);
}
