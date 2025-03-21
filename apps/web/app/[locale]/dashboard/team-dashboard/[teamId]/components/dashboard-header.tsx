/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use client';

import React from 'react';
import { DateRangePicker } from './date-range-picker';
import { DateRange } from 'react-day-picker';

import { TeamDashboardFilter } from './team-dashboard-filter';
import { GroupBySelect } from '../../../app-url/components/GroupBySelect';
import { GroupByType } from '@/app/hooks/features/useReportActivity';
import { ExportMenu } from '@/components/export-menu';
import { TeamStatsPDF } from './pdf';
import { ExportDialog } from '@components/ui/export-dialog';

const formatDate = (date: Date | undefined): string => {
	if (!date) return '';
	return date.toLocaleDateString('en-US', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	});
};

interface DashboardHeaderProps {
	onUpdateDateRange: (startDate: Date, endDate: Date) => void;
	title?: string;
	isManage?: boolean;
	showGroupBy?: boolean;
	groupByType?: GroupByType;
	onGroupByChange?: (value: GroupByType) => void;
	reportData?: any[];
	teamName?: 'TEAM-DASHBOARD' | 'APPS-URLS' | 'TIME-AND-ACTIVITY';
	startDate?: Date;
	endDate?: Date;
	onUpdateFilters?: (filters: any) => void;
	closeModal?: () => void;
	openModal?: () => void;
	isOpen?: boolean;
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
	endDate,
	closeModal,
	openModal,
	isOpen
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
		<>
			{isOpen && (
				<ExportDialog
					reportData={reportData}
					isOpen={isOpen!}
					groupByType={groupByType}
					onClose={closeModal}
					startDate={formatDate(startDate)}
					endDate={formatDate(endDate)}
					exportType="pdf"
				/>
			)}

			<div className="flex justify-between items-center w-full">
				<h1 className="text-2xl font-semibold">{title}</h1>
				<div className="flex gap-4 items-center">
					{showGroupBy && <GroupBySelect groupByType={groupByType} onGroupByChange={onGroupByChange} />}
					<DateRangePicker onDateRangeChange={handleDateRangeChange} data={reportData} />
					<TeamDashboardFilter isManage={isManage} />
					<ExportMenu
						pdfDocument={
							<>
								{teamName === 'TEAM-DASHBOARD' && (
									<TeamStatsPDF
										rapportDailyActivity={reportData || []}
										title={`${teamName.toLowerCase() || 'Team'} Activity Report for ${formatDate(startDate)} - ${formatDate(endDate)}`}
										startDate={formatDate(startDate)}
										endDate={formatDate(endDate)}
									/>
								)}
							</>
						}
						fileName={`${teamName || 'team'}-activity-report-for-${formatDate(startDate)}-${formatDate(endDate)}.pdf`}
						onCSVExport={handleCSVExport}
						csvDisabled={true}
						showModal={teamName === 'APPS-URLS' ? false : true}
						openModal={openModal}
						startDate={formatDate(startDate)}
						endDate={formatDate(endDate)}
						groupByType={groupByType}
						reportData={reportData}
					/>
				</div>
			</div>
		</>
	);
}
