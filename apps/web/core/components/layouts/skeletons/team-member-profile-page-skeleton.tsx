import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout, MainHeader } from '@/core/components/layouts/default-layout';

interface TeamMemberProfilePageSkeletonProps {
	className?: string;
	fullWidth?: boolean;
	publicTeam?: boolean;
}

/**
 * Complete page-level skeleton for Team Member Profile page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: MainHeader (3 sections: breadcrumb + unverified email + user team card header) + main content (team members view)
 */
export const TeamMemberProfilePageSkeleton: FC<TeamMemberProfilePageSkeletonProps> = ({
	className,
	fullWidth = false,
	publicTeam = false
}) => {
	return (
		<MainLayout publicTeam={publicTeam}>
			{/* SKELETON: MainHeader with 3 sections */}
			<MainHeader fullWidth={fullWidth}>
				{/* SKELETON: Section 1 - Breadcrumb */}
				<div className="flex gap-2 items-center mb-4">
					<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* SKELETON: Section 2 - Unverified Email (conditional) */}
				<div className="mb-4 w-full">
					<div className="w-64 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* SKELETON: Section 3 - User Team Card Header */}
				<div className="w-full">
					{/* Team Header Info */}
					<div className="flex justify-between items-center p-4 w-full bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-700">
						{/* Left side - Team Info */}
						<div className="flex gap-4 items-center">
							<div className="w-16 h-16 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<div className="space-y-2">
								<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* Right side - Stats */}
						<div className="flex gap-6 items-center">
							<div className="text-center">
								<div className="w-8 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto mb-1" />
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="text-center">
								<div className="w-8 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto mb-1" />
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="text-center">
								<div className="w-8 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto mb-1" />
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>
				</div>
			</MainHeader>

			{/* Divider */}
			<div className="h-0.5 bg-[#FFFFFF14]"></div>

			{/* SKELETON: Main Content Area - Team Members View */}
			<Container fullWidth={fullWidth}>
				<div className="py-6">
					{/* Team Members Grid */}
					<div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
						{[...Array(6)].map((_, index) => (
							<div key={index} className="w-full">
								{/* Team Member Card Skeleton */}
								<div className="p-6 bg-white rounded-xl border border-gray-200 dark:bg-dark--theme-light dark:border-gray-700">
									{/* Header with Avatar and Info */}
									<div className="flex gap-4 items-center mb-4">
										<div className="w-14 h-14 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
										<div className="flex-1">
											<div className="w-36 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
											<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-1" />
											<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>
										<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>

									{/* Status and Timer */}
									<div className="flex justify-between items-center mb-4">
										<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
										<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>

									{/* Current Task */}
									<div className="mb-4 space-y-3">
										<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-4/5 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>

									{/* Progress and Stats */}
									<div className="space-y-3">
										<div className="w-full h-2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
										<div className="flex justify-between">
											<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>
									</div>

									{/* Action Buttons */}
									<div className="flex justify-between items-center mt-6">
										<div className="flex gap-2">
											<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
											<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										</div>
										<div className="w-28 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default TeamMemberProfilePageSkeleton;
