import React, { FC } from 'react';

/**
 * Individual component skeletons for Calendar page progressive loading
 * Used in dynamic imports and Suspense wrappers for optimal UX
 */

interface SkeletonProps {
	className?: string;
}

/**
 * Skeleton for SetupFullCalendar component
 * Matches FullCalendar library structure with grid and events
 */
export const SetupFullCalendarSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			{/* SKELETON: FullCalendar Main Container */}
			<div className="flex h-full bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-dark--theme">
				{/* Main Calendar Area */}
				<div className="flex-1 p-4">
					{/* Calendar Toolbar */}
					<div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-200 dark:border-gray-600">
						{/* Left Navigation */}
						<div className="flex gap-4 items-center">
							<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
						</div>

						{/* Right Controls */}
						<div className="flex gap-2 items-center">
							<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							<div className="w-12 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
						</div>
					</div>

					{/* Calendar Header (Days of Week) */}
					<div className="grid grid-cols-7 gap-1 mb-4">
						{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
							<div key={index} className="p-3 text-center border-b border-gray-200 dark:border-gray-600">
								<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto" />
							</div>
						))}
					</div>

					{/* Calendar Body (6 weeks) */}
					<div className="grid grid-cols-7 gap-1">
						{[...Array(42)].map((_, index) => (
							<div
								key={index}
								className="p-2 bg-white border border-gray-100 aspect-square dark:border-gray-700 dark:bg-dark--theme-light hover:bg-gray-50 dark:hover:bg-gray-800"
							>
								{/* Day Number */}
								<div className="w-6 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />

								{/* Events (realistic pattern) */}
								{index % 4 === 0 && (
									<div className="space-y-1">
										<div className="w-full h-4 bg-[#dcfce7] animate-pulse rounded text-xs" />
										{index % 8 === 0 && (
											<div className="w-3/4 h-4 bg-[#ffedd5] animate-pulse rounded text-xs" />
										)}
									</div>
								)}
								{index % 6 === 0 && index % 4 !== 0 && (
									<div className="w-full h-4 bg-[#dbeafe] animate-pulse rounded text-xs" />
								)}
							</div>
						))}
					</div>
				</div>

				{/* Side Panel */}
				<div className="pl-5 m-5 w-1/5 h-full border-l border-gray-200 dark:border-gray-600">
					<div className="py-10">
						{/* Side Panel Header */}
						<div className="w-full h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-6" />

						{/* Event List */}
						<div className="space-y-4">
							{[...Array(5)].map((_, index) => (
								<div
									key={index}
									className="p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-600"
								>
									{/* Event Time */}
									<div className="w-16 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />

									{/* Event Title */}
									<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />

									{/* Event Details */}
									<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for SetupTimeSheet component
 * Matches timesheet table structure with filtering
 */
export const SetupTimeSheetSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			{/* SKELETON: TimeSheet Container */}
			<div className="bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
				{/* TimeSheet Header */}
				<div className="p-4 border-b border-gray-200 dark:border-gray-600">
					<div className="flex justify-between items-center">
						{/* Title */}
						<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

						{/* Filter Controls */}
						<div className="flex gap-4 items-center">
							<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							<div className="w-32 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
						</div>
					</div>
				</div>

				{/* TimeSheet Table */}
				<div className="overflow-x-auto">
					{/* Table Header */}
					<div className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-600">
						<div className="flex">
							{['Date', 'Project', 'Task', 'Hours', 'Status', 'Actions'].map((header, index) => (
								<div key={index} className="flex-1 px-6 py-3">
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							))}
						</div>
					</div>

					{/* Table Rows */}
					{[...Array(8)].map((_, rowIndex) => (
						<div key={rowIndex} className="border-b border-gray-200 dark:border-gray-600">
							<div className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50">
								{/* Date Cell */}
								<div className="flex-1 px-6 py-4">
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Project Cell */}
								<div className="flex-1 px-6 py-4">
									<div className="flex gap-3 items-center">
										<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>

								{/* Task Cell */}
								<div className="flex-1 px-6 py-4">
									<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Hours Cell */}
								<div className="flex-1 px-6 py-4">
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Status Cell */}
								<div className="flex-1 px-6 py-4">
									<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								</div>

								{/* Actions Cell */}
								<div className="flex-1 px-6 py-4">
									<div className="flex gap-2 items-center">
										<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
										<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-600">
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
	);
};

/**
 * Skeleton for AddManualTimeModal component
 * Matches modal structure with form fields
 */
export const AddManualTimeModalSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`fixed inset-0 z-50 flex items-center justify-center ${className || ''}`}>
			{/* Modal Backdrop */}
			<div className="fixed inset-0 animate-pulse bg-black/50" />

			{/* Modal Content */}
			<div className="relative mx-4 w-full max-w-md bg-white rounded-lg border border-gray-200 shadow-xl dark:bg-dark--theme-light dark:border-gray-600">
				{/* Modal Header */}
				<div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
					<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Modal Body */}
				<div className="p-6 space-y-4">
					{/* Form Fields */}
					{[...Array(5)].map((_, index) => (
						<div key={index} className="space-y-2">
							<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-full h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
						</div>
					))}
				</div>

				{/* Modal Footer */}
				<div className="flex gap-3 justify-end items-center p-6 border-t border-gray-200 dark:border-gray-600">
					<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
				</div>
			</div>
		</div>
	);
};

export default {
	SetupFullCalendarSkeleton,
	SetupTimeSheetSkeleton,
	AddManualTimeModalSkeleton
};
