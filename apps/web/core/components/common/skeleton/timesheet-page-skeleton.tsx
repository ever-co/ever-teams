import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

interface TimesheetPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Timesheet page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (5 sections: breadcrumb + greeting + cards + toggle+search + filters) + main content (calendar/table)
 */
export const TimesheetPageSkeleton: FC<TimesheetPageSkeletonProps> = ({
	className,
	showTimer = false,
	fullWidth = false
}) => {
	return (
		<MainLayout
			showTimer={showTimer}
			className="items-start pb-1 !overflow-hidden w-full"
			footerClassName="!hidden"
			childrenClassName="w-full"
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className="flex flex-col gap-y-3">
						{/* SKELETON: Section 1 - Breadcrumb Navigation */}
						<div className="flex flex-row justify-between items-start">
							<div className="flex gap-8 justify-center items-center h-10">
								{/* Back Arrow Skeleton */}
								<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Breadcrumb Skeleton */}
								<div className="flex gap-2 items-center">
									<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						</div>

						{/* SKELETON: Section 2 - Greeting & Description */}
						<div className="flex flex-col gap-y-2 justify-start items-start">
							{/* Greeting Title Skeleton */}
							<div className="w-64 h-7 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Description Skeleton */}
							<div className="w-80 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* SKELETON: Section 3 - Statistics Cards */}
						<div className="flex gap-6 justify-between items-center mb-4 w-full">
							{/* Card 1: Pending Tasks */}
							<div className="flex-1 p-4 bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
								<div className="flex gap-4 items-center">
									{/* Icon Skeleton */}
									<div className="w-12 h-12 bg-[#FBB650] animate-pulse rounded-lg" />

									<div className="flex flex-col gap-2">
										{/* Count Skeleton */}
										<div className="w-8 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

										{/* Title Skeleton */}
										<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

										{/* Description Skeleton */}
										<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>
							</div>

							{/* Card 2: Men Hours */}
							<div className="flex-1 p-4 bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
								<div className="flex gap-4 items-center">
									{/* Icon Skeleton */}
									<div className="w-12 h-12 bg-[#3D5A80] animate-pulse rounded-lg" />

									<div className="flex flex-col gap-2">
										{/* Hours Skeleton */}
										<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

										{/* Title Skeleton */}
										<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

										{/* Date Range Skeleton */}
										<div className="w-40 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>
							</div>

							{/* Card 3: Members Worked (conditional) */}
							<div className="flex-1 p-4 bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
								<div className="flex gap-4 items-center">
									{/* Icon Skeleton */}
									<div className="w-12 h-12 bg-[#30B366] animate-pulse rounded-lg" />

									<div className="flex flex-col gap-2">
										{/* Count Skeleton */}
										<div className="w-8 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

										{/* Title Skeleton */}
										<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

										{/* Description Skeleton */}
										<div className="w-36 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>
							</div>
						</div>

						{/* SKELETON: Section 4 - View Toggle + Search */}
						<div className="flex overflow-hidden justify-between items-center w-full">
							{/* View Toggle Buttons */}
							<div className="flex w-full">
								{/* ListView Toggle Skeleton */}
								<div className="flex gap-2 items-center px-4 py-2 bg-white rounded-l-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
									<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* CalendarView Toggle Skeleton */}
								<div className="flex gap-2 items-center px-4 py-2 bg-white rounded-r-lg border border-l-0 border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
									<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>

							{/* Search Input Skeleton */}
							<div className="flex items-center !h-[2.2rem] w-[700px] bg-white dark:bg-dark--theme-light gap-x-2 px-2 border border-gray-200 dark:border-gray-700 rounded-sm mb-2">
								{/* Search Icon Skeleton */}
								<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Search Input Skeleton */}
								<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* SKELETON: Section 5 - Complex Filter Component */}
						<div className="flex flex-col gap-4">
							{/* Filter Controls Row */}
							<div className="flex gap-4 items-center">
								{/* Status Filter Skeleton */}
								<div className="w-32 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* Date Range Picker Skeleton */}
								<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* Manual Time Button Skeleton */}
								<div className="w-28 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* Additional Filter Skeleton */}
								<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
							</div>
						</div>
					</Container>
				</div>
			}
		>
			{/* SKELETON: Main Content Area */}
			<div className="flex flex-col w-full border-1 rounded-lg bg-[#FFFFFF] dark:bg-dark--theme px-4">
				<Container fullWidth={fullWidth} className="py-5 mt-3 h-full">
					<div className="rounded-lg border border-gray-200 dark:border-gray-800">
						{/* SKELETON: Calendar/Table View Content */}
						<div className="p-6">
							{/* Calendar Header Skeleton */}
							<div className="flex justify-between items-center mb-6">
								{/* Navigation Skeleton */}
								<div className="flex gap-4 items-center">
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
								</div>

								{/* View Controls Skeleton */}
								<div className="flex gap-2 items-center">
									<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
								</div>
							</div>

							{/* Calendar Grid Skeleton */}
							<div className="grid grid-cols-7 gap-1 mb-4">
								{/* Week Headers */}
								{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
									<div key={index} className="p-2 text-center">
										<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto" />
									</div>
								))}

								{/* Calendar Days */}
								{[...Array(35)].map((_, index) => (
									<div
										key={index}
										className="p-2 rounded border border-gray-200 aspect-square dark:border-gray-600"
									>
										{/* Day Number */}
										<div className="w-6 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />

										{/* Time Entries */}
										{index % 3 === 0 && (
											<div className="space-y-1">
												<div className="w-full h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-3/4 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										)}
									</div>
								))}
							</div>

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
				</Container>
			</div>
		</MainLayout>
	);
};

export default TimesheetPageSkeleton;
