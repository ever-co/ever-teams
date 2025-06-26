import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout, MainHeader } from '@/core/components/layouts/default-layout';
import { TimerSkeleton } from './timer-skeleton';
import { TaskFilterSkeleton, UserProfileTaskSkeleton, UserProfileDetailSkeleton } from './profile-component-skeletons';

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
				<MainHeader fullWidth={fullWidth} className="pt-14">
					<div className="space-y-4 w-full">
						{/* SKELETON: Section 1 - Back Button + Breadcrumb */}
						<div className="flex gap-8 items-center">
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="flex gap-2 items-center">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* User Profile Detail */}
						<div className="flex flex-col gap-4 justify-between items-center md:flex-row">
							<UserProfileDetailSkeleton />
							<TimerSkeleton />
						</div>
						{/* TaskFilter */}
						<TaskFilterSkeleton />
					</div>
				</MainHeader>
			}
		>
			{/* SKELETON: Main Content Area - Activity Content */}
			<Container fullWidth={fullWidth} className="mt-6 mb-10">
				<UserProfileTaskSkeleton />
			</Container>
		</MainLayout>
	);
};

export default ProfilePageSkeleton;
