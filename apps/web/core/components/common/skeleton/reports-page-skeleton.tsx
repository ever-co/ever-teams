import React, { FC } from 'react';
import { MainLayout } from '@/core/components/layouts/default-layout';

interface ReportsPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Reports (Weekly Limit) page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (2 sections: breadcrumb + title/filters) + main content (tables + pagination)
 */
export const ReportsPageSkeleton: FC<ReportsPageSkeletonProps> = ({
	className,
	showTimer = false,
	fullWidth = false
}) => {
	return (
		<MainLayout
			showTimer={showTimer}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					{/* ✅ SKELETON: Section 1 - Breadcrumb Navigation */}
					<div className="flex flex-row justify-between items-start">
						<div className="flex gap-8 justify-center items-center h-10">
							{/* Breadcrumb Skeleton */}
							<div className="flex gap-2 items-center">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>

					{/* ✅ SKELETON: Section 2 - Complex Header with Title + Filters */}
					<div className="flex flex-col justify-between w-full h-24">
						<div className="flex h-[5rem] items-center justify-between">
							{/* Title Skeleton */}
							<div className="w-48 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Filters Container */}
							<div className="flex gap-4">
								{/* MembersSelect Skeleton */}
								<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* DatePickerWithRange Skeleton */}
								<div className="w-64 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* GroupBySelect Skeleton */}
								<div className="w-32 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* WeeklyLimitExportMenu Skeleton */}
								<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
							</div>
						</div>
					</div>
				</div>
			}
		>
			{/* ✅ SKELETON: Main Content Area */}
			<div className="flex flex-col gap-6 p-4 mt-6 w-full bg-white dark:bg-dark--theme">
				{/* ✅ SKELETON: Multiple Report Tables */}
				{[...Array(3)].map((_, tableIndex) => (
					<div key={tableIndex} className="p-1 w-full">
						{/* Table Header */}
						<div className="flex items-center px-4 h-12 rounded-md border bg-slate-100 dark:bg-gray-800 dark:text-white">
							<div className="w-48 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* Data Table */}
						<div className="bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
							{/* Table Header */}
							<div className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-600">
								<div className="flex">
									{['Member', 'Limit', 'Time Spent', 'Percentage Used', 'Remaining'].map(
										(header, index) => (
											<div key={index} className="flex-1 px-6 py-3">
												<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										)
									)}
								</div>
							</div>

							{/* Table Rows */}
							{[...Array(6)].map((_, rowIndex) => (
								<div key={rowIndex} className="border-b border-gray-200 dark:border-gray-600">
									<div className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50">
										{/* Member Cell */}
										<div className="flex-1 px-6 py-4">
											<div className="flex gap-3 items-center">
												<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Limit Cell */}
										<div className="flex-1 px-6 py-4">
											<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>

										{/* Time Spent Cell */}
										<div className="flex-1 px-6 py-4">
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>

										{/* Percentage Used Cell */}
										<div className="flex-1 px-6 py-4">
											<div className="flex gap-2 items-center">
												<div className="w-32 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Remaining Cell */}
										<div className="flex-1 px-6 py-4">
											<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* ✅ SKELETON: Pagination Section */}
			<div className="flex justify-between items-center p-4 bg-white dark:bg-dark--theme">
				{/* Left Info */}
				<div className="flex gap-2 items-center">
					<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Right Navigation */}
				<div className="flex gap-2 items-center">
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				</div>
			</div>
		</MainLayout>
	);
};

export default ReportsPageSkeleton;
