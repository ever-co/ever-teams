import React, { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { Card } from '@/core/components/common/card';

interface TimeActivitySkeletonProps {
	className?: string;
}

/**
 * Skeleton for TimeActivityHeader component
 * Matches exact structure: title + filters (GroupBy, Filter, View, DateRange, Export)
 */
export const TimeActivityHeaderSkeleton: FC<TimeActivitySkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex items-center justify-between w-full dark:bg-dar', className)}>
			{/* Title Skeleton */}
			<div className="w-48 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			
			{/* Filters Container */}
			<div className="flex items-center gap-4">
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
	);
};

/**
 * Skeleton for CardTimeAndActivity component
 * Matches exact structure: title + value + optional progress bar
 */
export const CardTimeAndActivitySkeleton: FC<TimeActivitySkeletonProps & { showProgress?: boolean }> = ({ 
	className, 
	showProgress = false 
}) => {
	return (
		<Card className={cn('p-6 bg-white dark:bg-dark--theme-light', className)}>
			<div className="flex flex-col gap-4">
				{/* Title Skeleton */}
				<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				
				{/* Value Skeleton */}
				<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				
				{/* Progress Bar Skeleton (conditional) */}
				{showProgress && (
					<div className="w-full h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				)}
			</div>
		</Card>
	);
};

/**
 * Skeleton for ActivityTable component
 * Matches exact structure: daily sections with tables
 */
export const ActivityTableSkeleton: FC<TimeActivitySkeletonProps> = ({ className }) => {
	return (
		<div className={cn('space-y-6', className)}>
			{/* Daily Sections */}
			{[...Array(3)].map((_, dayIndex) => (
				<div
					key={dayIndex}
					className="overflow-hidden bg-white rounded-lg shadow-sm dark:bg-dark--theme-light"
				>
					{/* Day Header */}
					<div className="p-4 border-b border-gray-200 dark:border-gray-600">
						<div className="flex items-center gap-8 text-sm">
							{/* Date Skeleton */}
							<div className="w-48 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							
							{/* Hours Badge Skeleton */}
							<div className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-600 rounded-lg py-1.5 px-2">
								<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>

					{/* Table Skeleton */}
					<div className="overflow-x-auto">
						<div className="min-w-full">
							{/* Table Header */}
							<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600">
								<div className="flex">
									{['Member', 'Project', 'Task', 'Tracked Hours', 'Earnings', 'Activity Level'].map((header, index) => (
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
										{/* Member Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Project Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center gap-3">
												<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Task Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>

										{/* Tracked Hours Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center justify-end gap-2">
												<div className="w-2 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Earnings Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded ml-auto" />
										</div>

										{/* Activity Level Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center gap-3">
												<div className="w-16 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			))}

			{/* Pagination Skeleton */}
			<div className="flex items-center justify-between mt-6">
				<div className="flex items-center gap-2">
					<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for TimeActivityTable component (weekly view)
 * Matches exact structure: weekly sections with grouped data
 */
export const TimeActivityTableSkeleton: FC<TimeActivitySkeletonProps> = ({ className }) => {
	return (
		<div className={cn('space-y-6', className)}>
			{/* Weekly Sections */}
			{[...Array(2)].map((_, weekIndex) => (
				<Card key={weekIndex} className="p-6 bg-white dark:bg-dark--theme-light">
					{/* Week Header */}
					<div className="flex items-center justify-between mb-6">
						{/* Date Range */}
						<div className="w-64 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						
						{/* Summary Stats */}
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-2">
								<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="flex items-center gap-2">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="flex items-center gap-2">
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>

					{/* Table Skeleton */}
					<div className="overflow-x-auto">
						<div className="min-w-full">
							{/* Table Header */}
							<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600">
								<div className="flex">
									{['Member', 'Project', 'Tracked Hours', 'Earnings', 'Activity Level'].map((header, index) => (
										<div key={index} className="px-6 py-3 flex-1">
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>
									))}
								</div>
							</div>

							{/* Table Rows */}
							{[...Array(5)].map((_, rowIndex) => (
								<div key={rowIndex} className="border-b border-gray-200 dark:border-gray-600">
									<div className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50">
										{/* Member Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Project Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center gap-3">
												<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
												<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Tracked Hours Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center justify-end gap-2">
												<div className="w-2 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>

										{/* Earnings Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded ml-auto" />
										</div>

										{/* Activity Level Cell */}
										<div className="px-6 py-4 flex-1">
											<div className="flex items-center gap-3">
												<div className="w-16 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
												<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</Card>
			))}
		</div>
	);
};

export default {
	TimeActivityHeaderSkeleton,
	CardTimeAndActivitySkeleton,
	ActivityTableSkeleton,
	TimeActivityTableSkeleton
};
