import React, { FC } from 'react';

/**
 * Individual component skeletons for Reports page progressive loading
 * Used in dynamic imports and Suspense wrappers for optimal UX
 */

interface SkeletonProps {
	className?: string;
}

/**
 * Skeleton for TimeReportTable component
 * Matches time report table structure with employee data
 */
export const TimeReportTableSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full p-1 ${className || ''}`}>
			{/* Table Header */}
			<div className="flex items-center h-12 px-4 border rounded-md bg-slate-100 dark:bg-gray-800 dark:text-white">
				<div className="w-48 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
			
			{/* Data Table */}
			<div className="bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
				{/* Table Header */}
				<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600">
					<div className="flex">
						{['Member', 'Limit', 'Time Spent', 'Percentage Used', 'Remaining'].map((header, index) => (
							<div key={index} className="px-6 py-3 flex-1">
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						))}
					</div>
				</div>

				{/* Table Rows */}
				{[...Array(6)].map((_, rowIndex) => (
					<div key={rowIndex} className="border-b border-gray-200 dark:border-gray-600">
						<div className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50">
							{/* Member Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>

							{/* Limit Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Time Spent Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Percentage Used Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="flex gap-2 items-center">
									<div className="w-32 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>

							{/* Remaining Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for TimeReportTableByMember component
 * Matches member-grouped time report table structure
 */
export const TimeReportTableByMemberSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full p-1 ${className || ''}`}>
			{/* Member Header */}
			<div className="flex items-center h-12 px-4 border rounded-md bg-slate-100 dark:bg-gray-800 dark:text-white">
				<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
			
			{/* Data Table */}
			<div className="bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
				{/* Table Header */}
				<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600">
					<div className="flex">
						{['Date/Week', 'Limit', 'Time Spent', 'Percentage Used', 'Remaining'].map((header, index) => (
							<div key={index} className="px-6 py-3 flex-1">
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						))}
					</div>
				</div>

				{/* Table Rows */}
				{[...Array(4)].map((_, rowIndex) => (
					<div key={rowIndex} className="border-b border-gray-200 dark:border-gray-600">
						<div className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50">
							{/* Date/Week Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Limit Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Time Spent Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Percentage Used Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="flex gap-2 items-center">
									<div className="w-32 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>

							{/* Remaining Cell */}
							<div className="px-6 py-4 flex-1">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for MembersSelect component
 * Matches member selection dropdown structure
 */
export const MembersSelectSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600 ${className || ''}`} />
	);
};

/**
 * Skeleton for GroupBySelect component
 * Matches group by selection dropdown structure
 */
export const GroupBySelectSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-32 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600 ${className || ''}`} />
	);
};

/**
 * Skeleton for DatePickerWithRange component
 * Matches date range picker structure
 */
export const DatePickerWithRangeSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-64 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600 ${className || ''}`} />
	);
};

/**
 * Skeleton for WeeklyLimitExportMenu component
 * Matches export menu dropdown structure
 */
export const WeeklyLimitExportMenuSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600 ${className || ''}`} />
	);
};

/**
 * Skeleton for Paginate component
 * Matches pagination controls structure
 */
export const PaginateSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`flex items-center justify-between p-4 bg-white dark:bg-dark--theme ${className || ''}`}>
			{/* Left Info */}
			<div className="flex items-center gap-2">
				<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
			
			{/* Right Navigation */}
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
			</div>
		</div>
	);
};

/**
 * Skeleton for Reports content area
 * Matches the main content structure with multiple tables
 */
export const ReportsContentSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`flex flex-col w-full gap-6 p-4 mt-6 bg-white dark:bg-dark--theme ${className || ''}`}>
			{/* Multiple report tables */}
			{[...Array(3)].map((_, index) => (
				<TimeReportTableSkeleton key={index} />
			))}
		</div>
	);
};

export default {
	TimeReportTableSkeleton,
	TimeReportTableByMemberSkeleton,
	MembersSelectSkeleton,
	GroupBySelectSkeleton,
	DatePickerWithRangeSkeleton,
	WeeklyLimitExportMenuSkeleton,
	PaginateSkeleton,
	ReportsContentSkeleton
};
