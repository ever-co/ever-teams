import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';

interface TeamDashboardPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Team Dashboard page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (3 sections: breadcrumb + header + stats/chart) + main content (table)
 */
export const TeamDashboardPageSkeleton: FC<TeamDashboardPageSkeletonProps> = ({ 
	className, 
	showTimer = false, 
	fullWidth = false 
}) => {
	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={showTimer}
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 w-full')}>
						{/* ✅ SKELETON: Section 1 - Back Button + Breadcrumb */}
						<div className="flex items-center pt-6 dark:bg-dark--theme">
							<div className="p-1 rounded-full">
								<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="flex items-center gap-2 ml-2">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* ✅ SKELETON: Section 2 - Dashboard Header */}
						<div className="flex flex-col gap-3">
							{/* Dashboard Header Skeleton */}
							<div className="flex justify-between items-center w-full">
								<div className="w-48 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="flex gap-4 items-center">
									{/* Group By Select */}
									<div className="w-32 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
									{/* Date Range Picker */}
									<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
									{/* Team Filter */}
									<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
									{/* Export Button */}
									<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
								</div>
							</div>

							{/* ✅ SKELETON: Section 3 - Team Stats Grid */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
								{[...Array(5)].map((_, index) => (
									<div key={index} className="p-6 bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
										<div className="flex flex-col">
											<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
											<div className="mt-2 h-9">
												<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>
									</div>
								))}
							</div>

							{/* ✅ SKELETON: Chart Toggle Area */}
							<div className="w-full">
								{/* Chart Toggle Button */}
								<div className="flex items-center justify-center bg-gradient-to-t from-gray-50/60 dark:from-gray-900/60 to-transparent py-0.5">
									<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						</div>
					</Container>
				</div>
			}
		>
			{/* ✅ SKELETON: Main Content Area - Team Stats Table */}
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<div className="w-full bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
					{/* Table Header */}
					<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600 p-4">
						<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Table Content */}
					<div className="p-4">
						{/* Table Headers */}
						<div className="grid grid-cols-6 gap-4 mb-4">
							{['Employee', 'Project', 'Task', 'Time Spent', 'Activity', 'Status'].map((header, index) => (
								<div key={index} className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							))}
						</div>

						{/* Table Rows */}
						{[...Array(8)].map((_, rowIndex) => (
							<div key={rowIndex} className="grid grid-cols-6 gap-4 py-3 border-b border-gray-100 dark:border-gray-700">
								{/* Employee Cell with Avatar */}
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Project Cell */}
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Task Cell */}
								<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Time Spent Cell */}
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Activity Cell */}
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Status Cell */}
								<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							</div>
						))}
					</div>

					{/* Table Footer - Pagination */}
					<div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-600 p-4">
						<div className="flex items-center justify-between">
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
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default TeamDashboardPageSkeleton;
