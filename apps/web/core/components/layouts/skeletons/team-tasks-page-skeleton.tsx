import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

interface TeamTasksPageSkeletonProps {
	className?: string;
	fullWidth?: boolean;
	showTimer?: boolean;
}

/**
 * Complete page-level skeleton for Team Tasks page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (3 sections: breadcrumb + title/status + search/filters) + main content (task table)
 */
export const TeamTasksPageSkeleton: FC<TeamTasksPageSkeletonProps> = ({
	className,
	fullWidth = false,
	showTimer = false
}) => {
	return (
		<MainLayout
			title="Team Tasks"
			showTimer={showTimer}
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="mt-5">
					{/* SKELETON: Section 1 - Breadcrumb */}
					<div className="flex gap-2 items-center mb-5">
						<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* SKELETON: Section 2 - Title + Status Badges */}
					<div className="flex flex-col my-4 leading-snug">
						<div className="flex flex-wrap gap-10 justify-between items-center w-full max-md:max-w-full">
							{/* Page Title */}
							<div className="w-48 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Status Badges */}
							<div className="flex flex-wrap gap-3.5 items-center self-stretch my-auto text-sm font-medium min-w-[240px] max-md:max-w-full">
								<div className="flex gap-2.5 justify-center items-center self-stretch my-auto font-medium">
									<div className="flex gap-1 items-start self-stretch my-auto">
										{[...Array(4)].map((_, index) => (
											<div
												key={index}
												className="flex items-center gap-1 px-3 py-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full"
											>
												<div className="w-3 h-3 bg-[#E0E0E0] dark:bg-[#454651] animate-pulse rounded-full" />
												<div className="w-16 h-4 bg-[#E0E0E0] dark:bg-[#454651] animate-pulse rounded" />
												<div className="w-6 h-4 bg-[#E0E0E0] dark:bg-[#454651] animate-pulse rounded" />
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* SKELETON: Section 3 - Search + Filters + Column Visibility */}
					<div className="flex flex-wrap gap-4 justify-between items-center my-6">
						{/* Search Bar */}
						<div className="flex items-center gap-2 min-w-[300px]">
							<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="flex-1 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
						</div>

						{/* Filters and Actions */}
						<div className="flex gap-3 items-center">
							{/* Column Visibility Dropdown */}
							<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Additional Filter Buttons */}
							<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
				</Container>
			}
		>
			{/* SKELETON: Main Content Area - Task Table */}
			<Container fullWidth={fullWidth} className="mt-6">
				{/* Table Header */}
				<div className="bg-white rounded-t-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-700">
					<div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
						{/* Table Column Headers */}
						<div className="grid flex-1 grid-cols-5 gap-4">
							<div className="w-24 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-20 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-16 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-16 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Table Rows */}
					{[...Array(8)].map((_, index) => (
						<div
							key={index}
							className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
						>
							<div className="grid flex-1 grid-cols-5 gap-4 items-center">
								{/* Type and Number */}
								<div className="flex gap-2 items-center">
									<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Issue Title */}
								<div className="space-y-1">
									<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Assignee */}
								<div className="flex gap-2 items-center">
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Status */}
								<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />

								{/* Action */}
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="flex justify-between items-center p-4 mt-6 bg-white rounded-b-lg border border-t-0 border-gray-200 dark:bg-dark--theme-light dark:border-gray-700">
					{/* Items per page */}
					<div className="flex gap-2 items-center">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Page info */}
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

					{/* Pagination buttons */}
					<div className="flex gap-2 items-center">
						<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default TeamTasksPageSkeleton;
