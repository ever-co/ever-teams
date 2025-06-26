import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout, MainHeader } from '@/core/components/layouts/default-layout';
import { cn } from '@/core/lib/helpers';

interface ProfilePageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Profile page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (2 sections: breadcrumb + profile detail/timer/filter) + main content (activity tabs)
 */
export const ProfilePageSkeleton: FC<ProfilePageSkeletonProps> = ({ 
	className, 
	showTimer = false, 
	fullWidth = false 
}) => {
	return (
		<MainLayout
			mainHeaderSlot={
				<MainHeader fullWidth={fullWidth} className="!pt-14">
					<div className="space-y-4 w-full">
						{/* ✅ SKELETON: Section 1 - Back Button + Breadcrumb */}
						<div className="flex gap-8 items-center">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="flex items-center gap-2">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* ✅ SKELETON: Section 2 - User Profile Detail + Timer */}
						<div className="flex flex-col justify-between items-center md:flex-row">
							{/* User Profile Detail Skeleton */}
							<div className="flex items-center gap-4">
								{/* Avatar */}
								<div className="w-20 h-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								
								{/* Profile Info */}
								<div className="flex flex-col gap-2">
									<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>

							{/* Timer Skeleton (conditional) */}
							{showTimer && (
								<div className="p-5 rounded-2xl shadow-xl card dark:border-[0.125rem] dark:border-[#28292F] dark:bg-[#1B1D22]">
									<div className="flex flex-col items-center gap-3">
										<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="flex gap-2">
											<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>
									</div>
								</div>
							)}
						</div>

						{/* ✅ SKELETON: Task Filter Section */}
						<div className="flex flex-col gap-4">
							{/* Filter Tabs */}
							<div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
								{['Tasks', 'Screenshots', 'Apps', 'Visited Sites'].map((tab, index) => (
									<div key={index} className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								))}
							</div>

							{/* Filter Controls */}
							<div className="flex gap-4 items-center">
								{/* Status Filter */}
								<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
								
								{/* Priority Filter */}
								<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
								
								{/* Size Filter */}
								<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
								
								{/* Search */}
								<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
							</div>
						</div>
					</div>
				</MainHeader>
			}
		>
			{/* ✅ SKELETON: Main Content Area - Activity Content */}
			<Container fullWidth={fullWidth} className="mt-6 mb-10">
				<div className="w-full bg-white dark:bg-dark--theme-light rounded-lg border border-gray-200 dark:border-gray-600">
					{/* Content Header */}
					<div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-600 p-4">
						<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Content Body */}
					<div className="p-4">
						{/* Task/Activity Items */}
						{[...Array(8)].map((_, rowIndex) => (
							<div key={rowIndex} className="flex items-center gap-4 py-4 border-b border-gray-100 dark:border-gray-700">
								{/* Task Icon/Status */}
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								
								{/* Task Content */}
								<div className="flex-1 flex flex-col gap-2">
									<div className="w-64 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
								
								{/* Task Meta */}
								<div className="flex gap-4 items-center">
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						))}
					</div>

					{/* Content Footer - Pagination */}
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

export default ProfilePageSkeleton;
