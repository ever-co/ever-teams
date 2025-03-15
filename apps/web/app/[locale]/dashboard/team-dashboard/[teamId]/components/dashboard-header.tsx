'use client';

import React from 'react';
import { DateRangePicker } from './date-range-picker';
import { DateRange } from 'react-day-picker';

import { TeamDashboardFilter } from './team-dashboard-filter';
import { GroupBySelect } from '../../../app-url/components/GroupBySelect';
import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { ExportMenu } from '@/components/export-menu';
import { TeamStatsPDF } from './pdf';

interface DashboardHeaderProps {
	onUpdateDateRange: (startDate: Date, endDate: Date) => void;
	title?: string;
	isManage?: boolean;
	showGroupBy?: boolean;
	groupByType?: GroupByType;
	onGroupByChange?: (value: GroupByType) => void;
	reportData?: any[];
	teamName?: string;
	startDate?: Date;
	endDate?: Date;
	onUpdateFilters?: (filters: any) => void;
}

export function DashboardHeader({
	onUpdateDateRange,
	title,
	isManage,
	showGroupBy,
	groupByType,
	onGroupByChange,
	reportData,
	teamName,
	startDate,
	endDate
}: DashboardHeaderProps) {
	const handleDateRangeChange = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			onUpdateDateRange(range.from, range.to);
		}
	};

	const handleCSVExport = () => {
		// CSV export functionality will be implemented later
		console.log('CSV export clicked');
	};

	return (
		<div className="flex justify-between items-center w-full">
			<h1 className="text-2xl font-semibold">{title}</h1>
			<div className="flex gap-4 items-center">
				{showGroupBy && <GroupBySelect groupByType={groupByType} onGroupByChange={onGroupByChange} />}
				<DateRangePicker onDateRangeChange={handleDateRangeChange} />
				<TeamDashboardFilter isManage={isManage} />
				<ExportMenu
					pdfDocument={
						<TeamStatsPDF
							rapportDailyActivity={reportData || []}
							title={`${teamName || 'Team'} Activity Report for ${startDate?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} - ${endDate?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
							startDate={startDate?.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
							endDate={endDate?.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
						/>
					}
					fileName={`${(teamName || 'team')}-activity-report-for-${startDate?.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}-${endDate?.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}.pdf`}
					onCSVExport={handleCSVExport}
					csvDisabled={true}
				/>
			</div>
		</div>
	);
}
