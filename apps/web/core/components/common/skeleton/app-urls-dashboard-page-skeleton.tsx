import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';

interface AppUrlsDashboardPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for App URLs Dashboard page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (3 sections: breadcrumb + header + productivity card) + main content (tables)
 */
export const AppUrlsDashboardPageSkeleton: FC<AppUrlsDashboardPageSkeletonProps> = ({
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
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 items-center w-full')}>
						{/* SKELETON: Section 1 - Back Button + Breadcrumb */}
						<div className="flex items-center pt-6 w-full">
							<div className="p-1 rounded-full">
								<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="flex items-center gap-2 ml-2">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* SKELETON: Section 2 - Dashboard Header */}
						<div className="flex flex-col gap-6 w-full">
							{/* Dashboard Header Skeleton */}
							<div className="flex justify-between items-center w-full">
								<div className="w-56 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
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

							{/* SKELETON: Section 3 - Productivity Card */}
							<div className="bg-white rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light h-[403px] p-8 py-0 px-0">
								<div className="flex flex-col gap-6 w-full">
									{/* Productivity Header */}
									<div className="flex justify-between items-center h-[105px] w-full border-b border-b-gray-200 dark:border-b-gray-700 pl-8">
										{/* Month/Year Header */}
										<div className="flex flex-col gap-2">
											<div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>

										{/* Productivity Stats */}
										<div className="flex gap-6 pr-8">
											{/* Productive */}
											<div className="flex flex-col items-center gap-2">
												<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
											{/* Neutral */}
											<div className="flex flex-col items-center gap-2">
												<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
											{/* Unproductive */}
											<div className="flex flex-col items-center gap-2">
												<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>
									</div>

									{/* Productivity Chart */}
									<div className="flex flex-col px-8 w-full">
										<div className="w-full h-[250px] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
									</div>
								</div>
							</div>
						</div>
					</Container>
				</div>
			}
		>
			{/* SKELETON: Main Content Area - Productivity Tables */}
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<div className="w-full bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
					{/* Table Header */}
					<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600 p-4">
						<div className="w-40 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Table Content */}
					<div className="p-4">
						{/* Table Headers */}
						<div className="grid grid-cols-5 gap-4 mb-4">
							{['Date', 'Application', 'Duration', 'Productivity', 'Sessions'].map((header, index) => (
								<div
									key={index}
									className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded"
								/>
							))}
						</div>

						{/* Table Rows */}
						{[...Array(10)].map((_, rowIndex) => (
							<div
								key={rowIndex}
								className="grid grid-cols-5 gap-4 py-3 border-b border-gray-100 dark:border-gray-700"
							>
								{/* Date Cell */}
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Application Cell with Icon */}
								<div className="flex items-center gap-3">
									<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Duration Cell */}
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Productivity Cell with Progress Bar */}
								<div className="flex items-center gap-2">
									<div className="w-20 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Sessions Cell */}
								<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
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

export default AppUrlsDashboardPageSkeleton;
