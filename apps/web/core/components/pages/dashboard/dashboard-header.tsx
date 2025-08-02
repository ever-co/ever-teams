/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use client';

import { DateRange } from 'react-day-picker';
import { GroupByType } from '@/core/hooks/activities/use-report-activity';
import { Suspense } from 'react';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
// import { ExportPDFSkeleton } from '@/core/components/common/skeleton/export-pdf-skeleton';
import { ExportMenu } from './export-menu';
import { TeamStatsPDF } from './pdf';
import { ExportPDFSkeleton } from '../../common/skeleton/export-pdf-skeleton';

// Import optimized components from centralized location
import {
	LazyDateRangePicker,
	LazyTeamDashboardFilter,
	LazyExportDialog,
	LazyGroupBySelectTimeActivity
} from '@/core/components/optimized-components';

const formatDate = (date: Date | undefined): string => {
	if (!date) return '';
	return date.toLocaleDateString('en-US', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	});
};

interface DashboardHeaderProps {
	onUpdateDateRangeAction: (startDate: Date, endDate: Date) => void;
	title?: string;
	isManage?: boolean | null;
	showGroupBy?: boolean;
	groupByType?: GroupByType;
	onGroupByChange?: (value: GroupByType) => void;
	reportData?: any[];
	teamName?: 'TEAM-DASHBOARD' | 'APPS-URLS' | 'TIME-AND-ACTIVITY';
	startDate?: Date;
	endDate?: Date;
	onUpdateFilters?: (filters: any) => void;
	onFiltersApply?: () => void;
	closeModal?: () => void;
	openModal?: () => void;
	isOpen?: boolean;
}

export function DashboardHeader({
	onUpdateDateRangeAction,
	title,
	isManage,
	showGroupBy,
	groupByType,
	onGroupByChange,
	reportData,
	teamName,
	startDate,
	endDate,
	onFiltersApply,
	closeModal,
	openModal,
	isOpen
}: DashboardHeaderProps) {
	const handleDateRangeChange = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			onUpdateDateRangeAction(range.from, range.to);
		}
	};

	const handleCSVExport = () => {
		// CSV export functionality will be implemented later
		console.log('CSV export clicked');
	};

	return (
		<>
			{isOpen && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<LazyExportDialog
						reportData={reportData}
						isOpen={isOpen!}
						groupByType={groupByType}
						onClose={closeModal}
						startDate={formatDate(startDate)}
						endDate={formatDate(endDate)}
						exportType="pdf"
					/>
				</Suspense>
			)}

			<div className="flex justify-between items-center w-full">
				<h1 className="text-2xl font-semibold">{title}</h1>
				<div className="flex gap-4 items-center">
					{showGroupBy && (
						<LazyGroupBySelectTimeActivity groupByType={groupByType} onGroupByChange={onGroupByChange} />
					)}
					<LazyDateRangePicker onDateRangeChange={handleDateRangeChange} data={reportData} />
					<LazyTeamDashboardFilter isManage={isManage} onFiltersApply={onFiltersApply} />

					<ExportMenu
						pdfDocument={
							<>
								{teamName === 'TEAM-DASHBOARD' && (
									<Suspense fallback={<ExportPDFSkeleton />}>
										<TeamStatsPDF
											rapportDailyActivity={reportData || []}
											title={`${teamName.toLowerCase() || 'Team'} Activity Report for ${formatDate(startDate)} - ${formatDate(endDate)}`}
											startDate={formatDate(startDate)}
											endDate={formatDate(endDate)}
										/>
									</Suspense>
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
