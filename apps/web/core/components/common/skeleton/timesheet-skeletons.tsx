import { FC } from 'react';
import { clsxm } from '@/core/lib/utils';

interface TimesheetSkeletonProps {
	className?: string;
}

/**
 * Skeleton for CalendarView component
 * Mimics the monthly/weekly calendar structure with day cells
 */
export const CalendarViewSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme p-4', className)}>
			{/* Calendar Header */}
			<div className="flex justify-between items-center mb-4">
				<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="flex gap-2">
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="grid grid-cols-7 gap-1 mb-2">
				{/* Day headers */}
				{[...Array(7)].map((_, i) => (
					<div
						key={i}
						className="h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded text-center flex items-center justify-center"
					>
						<div className="w-8 h-4 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
					</div>
				))}
			</div>

			{/* Calendar Days */}
			<div className="grid grid-cols-7 gap-1">
				{[...Array(35)].map((_, i) => (
					<div
						key={i}
						className="h-24 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded p-2 border border-gray-200 dark:border-gray-700"
					>
						{/* Day number */}
						<div className="w-6 h-4 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded mb-2" />

						{/* Time entries */}
						{i % 3 === 0 && (
							<div className="space-y-1">
								<div className="w-full h-2 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
								<div className="w-3/4 h-2 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for TimesheetView/DataTableTimeSheet component
 * Mimics the table structure with rows and columns
 */
export const TimesheetViewSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme', className)}>
			{/* Date Groups */}
			{[...Array(3)].map((_, groupIndex) => (
				<div key={groupIndex} className="mb-6">
					{/* Date Header */}
					<div className="h-[48px] flex justify-between items-center w-full bg-[#ffffffcc] dark:bg-dark--theme rounded-md border border-gray-400 px-5 mb-2">
						<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Status Sections */}
					{[...Array(2)].map((_, statusIndex) => (
						<div key={statusIndex} className="mb-4">
							{/* Status Header */}
							<div className="h-12 flex justify-between items-center w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-sm px-2 mb-2">
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
									<div className="w-24 h-4 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
									<div className="w-16 h-6 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded-full" />
								</div>
								<div className="flex gap-2">
									<div className="w-16 h-6 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
									<div className="w-16 h-6 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
								</div>
							</div>

							{/* Table Header */}
							<div className="grid grid-cols-6 gap-4 p-2 bg-gray-50 dark:bg-gray-800 rounded">
								{[...Array(6)].map((_, colIndex) => (
									<div
										key={colIndex}
										className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded"
									/>
								))}
							</div>

							{/* Table Rows */}
							{[...Array(3)].map((_, rowIndex) => (
								<div
									key={rowIndex}
									className="grid grid-cols-6 gap-4 p-2 border-b border-gray-200 dark:border-gray-600 h-[60px] items-center"
								>
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									</div>
									<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="flex gap-1">
										<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>
							))}
						</div>
					))}
				</div>
			))}
		</div>
	);
};

/**
 * Skeleton for TimesheetDetailModal component
 */
export const TimesheetDetailModalSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('fixed inset-0 z-50 flex items-center justify-center bg-black/50', className)}>
			<div className="bg-white dark:bg-dark--theme rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
				{/* Modal Header */}
				<div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="w-48 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Modal Content */}
				<div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
					{/* Stats Cards */}
					<div className="grid grid-cols-3 gap-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
								<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						))}
					</div>

					{/* Content Area */}
					<div className="space-y-4">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded">
								<div className="flex justify-between items-center mb-2">
									<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
								<div className="space-y-2">
									<div className="w-full h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Modal Footer */}
				<div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
					<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for TimesheetFilter component
 */
export const TimesheetFilterSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('flex items-center gap-2.5 justify-between w-full', className)}>
			{/* Status Filters */}
			<div className="flex gap-2">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="h-8 px-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded flex items-center"
					>
						<div className="w-16 h-4 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
					</div>
				))}
			</div>

			{/* Filter Controls */}
			<div className="flex gap-2">
				<div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-40 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-28 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
};

/**
 * Skeleton for TimesheetCard component
 * Matches exact structure: EverCard with content + icon
 */
export const TimesheetCardSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div
			className={clsxm(
				'flex w-full gap-2 !p-5 border border-gray-200 rounded-md shadow min-h-40 h-fit dark:border-gray-600 shadow-gray-100 dark:shadow-transparent',
				className
			)}
		>
			{/* Main content area */}
			<div className="flex flex-col w-full gap-2">
				{/* Title, subtitle, description */}
				<div className="flex flex-col items-start justify-start gap-1">
					{/* Main number/hours (text-2xl md:text-[25px]) */}
					<div className="w-16 h-7 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					{/* Title (text-base md:text-[16px]) */}
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					{/* Description/date (text-sm md:text-[14px]) */}
					<div className="w-40 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Button (h-9 px-2 py-2 w-fit) */}
				<div className="h-9 w-48 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600 mt-auto" />
			</div>

			{/* Icon area (p-5 w-16 h-16) */}
			<div className="p-5 w-16 h-16 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg shadow-lg dark:shadow-gray-800 flex justify-center items-center">
				<div className="w-6 h-6 bg-[#E0E0E0] dark:bg-[#404040] animate-pulse rounded" />
			</div>
		</div>
	);
};

/**
 * Skeleton for TimesheetPagination component
 * Matches exact structure: info + page size selector + pagination controls
 */
export const TimesheetPaginationSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div
			className={clsxm(
				'flex flex-row justify-between items-center gap-4 w-full h-[64px] rounded-b-[6px] p-2',
				className
			)}
		>
			{/* Left side - row info */}
			<div className="flex items-center gap-4">
				<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Right side - pagination controls */}
			<div className="flex justify-end w-full">
				<div className="flex gap-x-3 justify-start items-center pr-2">
					{/* "Rows per page" label */}
					<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

					{/* Page size selector */}
					<div className="w-[80px] h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-[6px] border border-gray-200 dark:border-gray-800" />

					{/* "Page X of Y" */}
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Pagination buttons */}
				<div className="flex gap-1">
					{/* Previous button */}
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-[6px] border border-gray-200 dark:border-gray-800" />

					{/* Page numbers (3-5 buttons) */}
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-[6px] border border-gray-200 dark:border-gray-800"
						/>
					))}

					{/* Next button */}
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-[6px] border border-gray-200 dark:border-gray-800" />
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for TimeSheetPageContent component
 * Matches exact structure of the main page content component
 */
export const TimeSheetPageContentSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('flex flex-col w-full min-h-screen', className)}>
			{/* MainLayout Header Slot Skeleton */}
			<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
				<div className="container mx-auto px-4 flex flex-col gap-y-3">
					{/* Breadcrumb area */}
					<div className="flex flex-row justify-between items-start">
						<div className="flex gap-8 justify-center items-center h-10">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Greeting section */}
					<div className="flex flex-col gap-y-2 justify-start items-start">
						<div className="w-64 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-80 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Stats Cards - 3 cards in a row */}
					<div className="flex gap-6 justify-between items-center mb-4 w-full">
						{[...Array(3)].map((_, i) => (
							<TimesheetCardSkeleton key={i} />
						))}
					</div>

					{/* View Toggle + Search */}
					<div className="flex overflow-hidden justify-between items-center w-full">
						<div className="flex w-full">
							{/* View toggle buttons */}
							<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mr-2" />
							<div className="w-28 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						{/* Search box */}
						<div className="flex items-center !h-[2.2rem] w-[700px] bg-white dark:bg-dark--theme-light gap-x-2 px-2 border border-gray-200 dark:border-gray-700 rounded-sm mb-2">
							<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Filters */}
					<TimesheetFilterSkeleton />
				</div>
			</div>

			{/* Content Section */}
			<div className="flex flex-col w-full border-1 rounded-lg bg-[#FFFFFF] dark:bg-dark--theme px-4">
				<div className="container mx-auto h-full py-5 mt-3">
					<div className="rounded-lg border border-gray-200 dark:border-gray-800">
						<TimesheetViewSkeleton />

						{/* Pagination skeleton */}
						<TimesheetPaginationSkeleton />
					</div>
				</div>
			</div>
		</div>
	);
};

/**
 * Complete skeleton for the entire timesheet page
 * Matches exact page structure with all sections
 */
export const TimesheetPageSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('flex flex-col w-full min-h-screen', className)}>
			{/* Header Section - matches MainLayout mainHeaderSlot */}
			<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
				<div className="container mx-auto px-4 flex flex-col gap-y-3">
					{/* Breadcrumb area */}
					<div className="flex flex-row items-start justify-between">
						<div className="flex items-center justify-center h-10 gap-8">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Greeting section */}
					<div className="flex flex-col items-start justify-start gap-y-2">
						<div className="w-64 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-80 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Stats Cards - 3 cards in a row */}
					<div className="flex items-center justify-between w-full gap-6 mb-4">
						{[...Array(3)].map((_, i) => (
							<TimesheetCardSkeleton key={i} />
						))}
					</div>

					{/* View Toggle + Search */}
					<div className="flex items-center justify-between w-full overflow-hidden">
						<div className="flex w-full">
							{/* View toggle buttons */}
							<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mr-2" />
							<div className="w-28 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						{/* Search box */}
						<div className="flex items-center !h-[2.2rem] w-[700px] bg-white dark:bg-dark--theme-light gap-x-2 px-2 border border-gray-200 dark:border-gray-700 rounded-sm mb-2">
							<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Filters */}
					<TimesheetFilterSkeleton />
				</div>
			</div>

			{/* Content Section */}
			<div className="flex flex-col w-full border-1 rounded-lg bg-[#FFFFFF] dark:bg-dark--theme px-4">
				<div className="container mx-auto h-full py-5 mt-3">
					<div className="border border-gray-200 rounded-lg dark:border-gray-800">
						<TimesheetViewSkeleton />

						{/* Pagination skeleton */}
						<TimesheetPaginationSkeleton />
					</div>
				</div>
			</div>
		</div>
	);
};
