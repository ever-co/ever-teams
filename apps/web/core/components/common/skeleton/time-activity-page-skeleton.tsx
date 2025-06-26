import React, { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { Card } from '@/core/components/common/card';

interface TimeActivityPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Time and Activity page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (breadcrumb + filters + cards) + main content (table)
 */
export const TimeActivityPageSkeleton: FC<TimeActivityPageSkeletonProps> = ({
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
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark-high">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 items-center w-full')}>
						{/* SKELETON: Breadcrumb Section */}
						<div className="flex items-center pt-6 w-full">
							{/* Back Arrow Skeleton */}
							<div className="p-1 mr-2">
								<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Breadcrumb Skeleton */}
							<div className="flex gap-2 items-center">
								<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* SKELETON: Complex Header Section */}
						<div className="flex flex-col gap-6 w-full">
							{/* TimeActivityHeader Skeleton */}
							<div className="flex justify-between items-center w-full">
								{/* Title Skeleton */}
								<div className="w-48 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Filters Container */}
								<div className="flex gap-4 items-center">
									{/* GroupBy Select Skeleton */}
									<div className="w-32 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

									{/* Filter Popover Skeleton */}
									<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

									{/* View Select Skeleton */}
									<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

									{/* Date Range Picker Skeleton */}
									<div className="w-40 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

									{/* Export Select Skeleton */}
									<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
								</div>
							</div>

							{/* SKELETON: Statistics Cards Section */}
							<div className="grid grid-cols-3 gap-[30px] w-full">
								{/* Card 1: Total Hours */}
								<Card className="p-6 bg-white dark:bg-dark--theme-light">
									<div className="flex flex-col gap-4">
										<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</Card>

								{/* Card 2: Average Activity (with progress) */}
								<Card className="p-6 bg-white dark:bg-dark--theme-light">
									<div className="flex flex-col gap-4">
										<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-full h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									</div>
								</Card>

								{/* Card 3: Total Earnings */}
								<Card className="p-6 bg-white dark:bg-dark--theme-light">
									<div className="flex flex-col gap-4">
										<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</Card>
							</div>
						</div>
					</Container>
				</div>
			}
		>
			{/* SKELETON: Main Content Area */}
			<Container fullWidth={fullWidth} className={cn('flex flex-col gap-8 !px-4 py-6 w-full')}>
				<Card className="w-full dark:bg-dark--theme-light min-h-[600px]">
					{/* SKELETON: Data Table Content */}
					<div className="p-6">
						{/* Table Loading Content */}
						<div className="space-y-6">
							{/* Daily Sections */}
							{[...Array(3)].map((_, dayIndex) => (
								<div
									key={dayIndex}
									className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-dark--theme-light dark:border-gray-600"
								>
									{/* Day Header */}
									<div className="p-4 border-b border-gray-200 dark:border-gray-600">
										<div className="flex gap-8 items-center">
											{/* Date Skeleton */}
											<div className="w-48 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

											{/* Hours Badge Skeleton */}
											<div className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 rounded-lg py-1.5 px-2">
												<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>
									</div>

									{/* Table Content */}
									<div className="overflow-x-auto">
										{/* Table Header */}
										<div className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-600">
											<div className="flex">
												{[
													'Member',
													'Project',
													'Task',
													'Tracked Hours',
													'Earnings',
													'Activity Level'
												].map((header, index) => (
													<div key={index} className="flex-1 px-6 py-3">
														<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
													</div>
												))}
											</div>
										</div>

										{/* Table Rows */}
										{[...Array(4)].map((_, rowIndex) => (
											<div
												key={rowIndex}
												className="border-b border-gray-200 dark:border-gray-600"
											>
												<div className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50">
													{/* Member Cell */}
													<div className="flex-1 px-6 py-4">
														<div className="flex gap-3 items-center">
															<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
															<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
														</div>
													</div>

													{/* Project Cell */}
													<div className="flex-1 px-6 py-4">
														<div className="flex gap-3 items-center">
															<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
															<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
														</div>
													</div>

													{/* Task Cell */}
													<div className="flex-1 px-6 py-4">
														<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
													</div>

													{/* Tracked Hours Cell */}
													<div className="flex-1 px-6 py-4">
														<div className="flex gap-2 justify-end items-center">
															<div className="w-2 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
															<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
														</div>
													</div>

													{/* Earnings Cell */}
													<div className="flex-1 px-6 py-4">
														<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded ml-auto" />
													</div>

													{/* Activity Level Cell */}
													<div className="flex-1 px-6 py-4">
														<div className="flex gap-3 items-center">
															<div className="w-16 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
															<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							))}

							{/* Pagination Skeleton */}
							<div className="flex justify-between items-center mt-6">
								<div className="flex gap-2 items-center">
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								<div className="flex gap-2 items-center">
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
								</div>
							</div>
						</div>
					</div>
				</Card>
			</Container>
		</MainLayout>
	);
};

export default TimeActivityPageSkeleton;
