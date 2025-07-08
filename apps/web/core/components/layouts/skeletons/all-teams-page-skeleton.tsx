import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

interface AllTeamsPageSkeletonProps {
	className?: string;
	fullWidth?: boolean;
	showTimer?: boolean;
}

/**
 * Complete page-level skeleton for All Teams page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (3 sections: breadcrumb + tabs/filter + header) + main content (team members grid)
 */
export const AllTeamsPageSkeleton: FC<AllTeamsPageSkeletonProps> = ({
	className,
	fullWidth = false,
	showTimer = false
}) => {
	return (
		<MainLayout
			title="All Teams"
			showTimer={showTimer}
			className="items-start"
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="mx-auto">
					<div className="flex flex-col justify-between items-start w-full">
						{/* SKELETON: Section 1 - Breadcrumb */}
						<div className="flex justify-between items-center px-4 py-2 w-full">
							{/* Breadcrumb */}
							<div className="flex gap-2 items-center">
								<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* SKELETON: Section 2 - Header Tabs + Member Filter */}
							<div className="flex gap-2 items-center self-end">
								{/* Header Tabs */}
								<div className="flex gap-1 justify-center items-center w-max h-10">
									{[...Array(2)].map((_, index) => (
										<div
											key={index}
											className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-md"
										/>
									))}
								</div>

								{/* Member Filter */}
								<div className="min-w-[170px] h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
							</div>
						</div>

						{/* SKELETON: Section 3 - Team Member Header (conditional) */}
						<div className="px-4 w-full">
							{/* Team Member Header Skeleton */}
							<div className="flex justify-between items-center py-4 w-full">
								<div className="flex gap-4 items-center">
									<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
								<div className="flex gap-2 items-center">
									<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						</div>
					</div>
				</Container>
			}
		>
			{/* SKELETON: Main Content Area - Team Members Grid */}
			<Container fullWidth={fullWidth} className="mx-auto mt-5">
				<div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
					{/* Team Member Cards Skeleton */}
					{[...Array(6)].map((_, index) => (
						<div key={index} className="w-full">
							{/* User Team Card Skeleton */}
							<div className="p-6 bg-white rounded-xl border border-gray-200 dark:bg-dark--theme-light dark:border-gray-700">
								{/* Header with Avatar and Info */}
								<div className="flex gap-4 items-center mb-4">
									<div className="w-12 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="flex-1">
										<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
										<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Status and Timer */}
								<div className="flex justify-between items-center mb-4">
									<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Task Info */}
								<div className="space-y-3">
									<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-3/4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Progress Bar */}
								<div className="mt-4">
									<div className="w-full h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								</div>

								{/* Action Buttons */}
								<div className="flex justify-between items-center mt-4">
									<div className="flex gap-2">
										<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
									<div className="w-24 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Invite Team Card Skeleton */}
				<div className="mt-4">
					<div className="p-6 text-center bg-white rounded-xl border border-gray-300 border-dashed dark:bg-dark--theme-light dark:border-gray-600">
						<div className="w-12 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full mx-auto mb-4" />
						<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto mb-2" />
						<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto" />
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default AllTeamsPageSkeleton;
