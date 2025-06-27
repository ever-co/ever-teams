import React, { FC } from 'react';

/**
 * Individual component skeletons for Profile page progressive loading
 * Used in dynamic imports and Suspense wrappers for optimal UX
 */

interface SkeletonProps {
	className?: string;
}

/**
 * Skeleton for UserProfileDetail component
 * Matches user profile information with avatar and details
 */
export const UserProfileDetailSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`flex items-center gap-4 ${className || ''}`}>
			{/* Avatar */}
			<div className="w-20 h-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />

			{/* Profile Info */}
			<div className="flex flex-col gap-2">
				<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
};

/**
 * Skeleton for TaskCard component - PIXEL PERFECT
 * Matches exact TaskCard structure with all sub-components
 */
export const TaskCardSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div
			className={`relative flex justify-between py-3 px-4 bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm ${className || ''}`}
		>
			{/* Large screen layout */}
			<div className="hidden justify-between items-center w-full lg:flex">
				{/* Task Info Section */}
				<div className="flex flex-row flex-1 justify-between min-w-36 max-w-64">
					<div className="px-4 w-full">
						{/* Task Issue Status + Task Number */}
						<div className="flex gap-2 items-center mb-2">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						{/* Task Title */}
						<div className="w-28 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-1" />
						{/* Task Status */}
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>

				{/* Vertical Separator */}
				<div className="w-px h-12 bg-gray-200 dark:bg-gray-600" />

				{/* Task Estimate Info Section */}
				<div className="flex items-center flex-col justify-center lg:flex-row w-[20%]">
					<div className="flex flex-col gap-2 items-center">
						{/* Estimate Progress Circle */}
						<div className="w-12 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
						{/* Estimate Text */}
						<div className="w-12 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>

				{/* Vertical Separator */}
				<div className="w-px h-12 bg-gray-200 dark:bg-gray-600" />

				{/* Users Assigned Section */}
				<div className="flex items-center justify-center gap-[1.125rem] min-w-fit px-5 w-max lg:px-3 2xl:max-w-52 3xl:max-w-72">
					<div className="flex -space-x-2">
						{[...Array(3)].map((_, index) => (
							<div
								key={index}
								className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full border-2 border-white dark:border-gray-800"
							/>
						))}
					</div>
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				</div>

				{/* Vertical Separator */}
				<div className="w-px h-12 bg-gray-200 dark:bg-gray-600" />

				{/* Task Times Section */}
				<div className="flex items-center justify-between gap-[1.125rem] min-w-fit px-5 w-max lg:px-3 2xl:max-w-52 3xl:max-w-72">
					<div className="flex flex-col gap-2">
						{/* Today Time */}
						<div className="flex gap-x-4 items-center">
							<div className="w-10 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						{/* Total Time */}
						<div className="flex gap-x-4 items-center">
							<div className="w-10 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
					{/* Timer Button */}
					<div className="w-9 h-9 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				</div>

				{/* Vertical Separator */}
				<div className="w-px h-12 bg-gray-200 dark:bg-gray-600" />

				{/* Status & Actions Section */}
				<div className="flex justify-center items-center w-1/5 h-full min-w-fit xl:justify-between lg:px-3 2xl:max-w-52 3xl:max-w-72">
					{/* Status Dropdown */}
					<div className="flex justify-center items-center">
						<div className="w-36 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					</div>
					{/* Task Menu */}
					<div className="flex justify-end items-end mt-2 shrink-0 xl:mt-0">
						<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>
			</div>

			{/* Small screen layout */}
			<div className="flex flex-col w-full lg:hidden">
				{/* Top Section */}
				<div className="flex justify-between mb-4 ml-2">
					<div className="flex flex-col gap-2">
						<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-10 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>

				{/* Task Info Section */}
				<div className="flex flex-wrap justify-between items-start pb-4 border-b border-gray-200 dark:border-gray-600">
					<div className="px-4 mb-4 w-full">
						<div className="flex gap-2 items-center mb-2">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						<div className="w-full h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-1" />
						<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
					<div className="flex items-end py-4 mx-auto space-x-2">
						<div className="w-36 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>

				{/* Bottom Section */}
				<div className="flex justify-between items-center mt-4 mb-4 space-x-5">
					<div className="flex space-x-4">
						<div className="flex flex-col gap-1">
							<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-10 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						<div className="w-9 h-9 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
					</div>
					<div className="w-28 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
					<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for UserProfileTask component - PIXEL PERFECT
 * Matches task list structure with TaskCard skeletons
 */
export const UserProfileTaskSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			{/* Task Cards */}
			<div className="space-y-4">
				{[...Array(5)].map((_, index) => (
					<TaskCardSkeleton key={index} />
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-between items-center p-4 mt-6">
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
		</div>
	);
};

/**
 * Skeleton for AppsTab component
 * Matches visited apps table structure
 */
export const AppsTabSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			{/* Table Header */}
			<div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-600">
				<div className="grid grid-cols-4 gap-4">
					{['Apps', 'Visited Dates', 'Percent Used', 'Time Spent'].map((header, index) => (
						<div key={index} className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					))}
				</div>
			</div>

			{/* Table Rows */}
			<div className="p-4">
				{[...Array(6)].map((_, rowIndex) => (
					<div
						key={rowIndex}
						className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 dark:border-gray-700"
					>
						{/* App Name with Icon */}
						<div className="flex gap-3 items-center">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* Visited Dates */}
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

						{/* Percent Used with Progress Bar */}
						<div className="flex gap-2 items-center">
							<div className="w-20 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* Time Spent */}
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for VisitedSitesTab component
 * Matches visited sites table structure
 */
export const VisitedSitesTabSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			{/* Table Header */}
			<div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-600">
				<div className="grid grid-cols-4 gap-4">
					{['Sites', 'Visited Dates', 'Percent Used', 'Time Spent'].map((header, index) => (
						<div key={index} className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					))}
				</div>
			</div>

			{/* Table Rows */}
			<div className="p-4">
				{[...Array(6)].map((_, rowIndex) => (
					<div
						key={rowIndex}
						className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 dark:border-gray-700"
					>
						{/* Site Name with Favicon */}
						<div className="flex gap-3 items-center">
							<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* Visited Dates */}
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

						{/* Percent Used with Progress Bar */}
						<div className="flex gap-2 items-center">
							<div className="w-20 h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>

						{/* Time Spent */}
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for ScreenshootTab component
 * Matches screenshots grid structure
 */
export const ScreenshootTabSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`w-full ${className || ''}`}>
			{/* Screenshots Grid */}
			<div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
				{[...Array(8)].map((_, index) => (
					<div key={index} className="flex flex-col gap-2">
						{/* Screenshot Image */}
						<div className="w-full h-32 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />

						{/* Screenshot Info */}
						<div className="flex flex-col gap-1">
							<div className="w-20 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-16 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for TaskFilter component - PIXEL PERFECT
 * Matches exact TaskFilter structure with tabs and input filters
 */
export const TaskFilterSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={`relative z-10 w-full ${className || ''}`}>
			<div className="flex flex-col flex-wrap-reverse justify-between items-center w-full xs:flex-row lg:flex-nowrap">
				{/* TabsNav Section */}
				<nav className="flex gap-1 justify-center items-center -mb-1 w-full md:justify-start md:gap-4 md:mt-0">
					{[...Array(5)].map((_, index) => (
						<div
							key={index}
							className="flex flex-col md:flex-row gap-1 items-center px-[1rem] relative mt-4 md:mt-0 w-full md:min-w-[10.625rem]"
						>
							{/* Tab Name */}
							<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							{/* Tab Count Badge */}
							<div className="w-8 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-md" />
							{/* Active Tab Indicator */}
							{index === 0 && (
								<div className="bg-[#F0F0F0] dark:bg-[#353741] animate-pulse h-[0.1875rem] absolute -bottom-8 left-0 right-0 w-full rounded" />
							)}
						</div>
					))}
				</nav>

				{/* InputFilters Section */}
				<div className="flex items-center mt-8 space-x-2 lg:space-x-5 xs:mt-4">
					{/* Search Icon */}
					<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

					{/* Vertical Separator */}
					<div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

					{/* Filter Button */}
					<div className="w-20 h-[2.75rem] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-200 dark:border-gray-600" />

					{/* Add Time Button */}
					<div className="w-[8.25rem] h-[2.75rem] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />

					{/* Assign Task Button */}
					<div className="w-[8.25rem] h-[2.75rem] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />
				</div>
			</div>

			{/* Filter Status Section (Conditional) */}
			<div className="mt-4 w-full">
				<div className="w-full h-px bg-gray-200 dark:bg-gray-600" />
				<div className="flex flex-col items-center pt-2 mt-4 space-x-2 md:justify-between md:flex-row">
					<div className="flex flex-wrap flex-1 justify-center space-x-3 md:justify-start">
						{/* Status Dropdown */}
						<div className="w-[170px] h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-200 dark:border-gray-600" />

						{/* Priority Dropdown */}
						<div className="w-[170px] h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-200 dark:border-gray-600" />

						{/* Size Dropdown */}
						<div className="w-[170px] h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-200 dark:border-gray-600" />

						{/* Labels Dropdown */}
						<div className="w-[170px] h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-200 dark:border-gray-600" />

						{/* Vertical Separator */}
						<div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

						{/* Apply Button */}
						<div className="w-[6.25rem] h-7 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />

						{/* Reset Button */}
						<div className="w-[6.25rem] h-7 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />

						{/* Close Button */}
						<div className="w-[6.25rem] h-7 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />
					</div>
				</div>
			</div>
		</div>
	);
};

export default {
	UserProfileDetailSkeleton,
	UserProfileTaskSkeleton,
	TaskCardSkeleton,
	AppsTabSkeleton,
	VisitedSitesTabSkeleton,
	ScreenshootTabSkeleton,
	TaskFilterSkeleton
};
