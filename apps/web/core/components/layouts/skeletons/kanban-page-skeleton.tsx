import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

interface KanbanPageSkeletonProps {
	className?: string;
	fullWidth?: boolean;
	showTimer?: boolean;
}

/**
 * Complete page-level skeleton for Kanban page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot (3 sections: breadcrumb + title/actions + tabs/filters) + main content (kanban board)
 */
export const KanbanPageSkeleton: FC<KanbanPageSkeletonProps> = ({
	className,
	fullWidth = false,
	showTimer = false
}) => {
	return (
		<MainLayout
			title="Kanban Board"
			showTimer={showTimer}
			footerClassName="pr-20"
			className="!px-0"
			childrenClassName="flex flex-col h-hull w-full !mx-0 !px-0 overflow-x-auto"
			mainHeaderSlot={
				<div className="flex flex-col min-h-fit border-b-[1px] dark:border-[#26272C] mx-[0px] w-full bg-white dark:bg-dark-high">
					<Container fullWidth={fullWidth} className="!pt-0">
						{/* SKELETON: Section 1 - Breadcrumb + Navigation */}
						<div className="flex flex-row justify-between items-start mt-4 bg-white dark:bg-dark-high">
							<div className="flex gap-8 justify-center items-center h-10">
								{/* People Icon */}
								<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								{/* Breadcrumb */}
								<div className="flex gap-2 items-center">
									<div className="w-12 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
							<div className="flex gap-1 justify-center items-center h-10 w-fit">
								{/* Header Tabs */}
								{[...Array(4)].map((_, index) => (
									<div
										key={index}
										className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded"
									/>
								))}
							</div>
						</div>

						{/* SKELETON: Section 2 - Title + Actions + Team Members */}
						<div className="flex justify-between items-center mt-4 bg-white dark:bg-dark-high">
							{/* Page Title */}
							<div className="w-64 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Actions Section */}
							<div className="flex gap-x-2 items-center min-w-fit">
								{/* Timezone */}
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

								{/* Separator */}
								<div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

								{/* Team Members Avatars */}
								<div className="flex -space-x-2">
									{[...Array(4)].map((_, index) => (
										<div
											key={index}
											className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full border-2 border-white dark:border-gray-800"
										/>
									))}
								</div>

								{/* Separator */}
								<div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

								{/* Add Button */}
								<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full border-2 border-gray-200 dark:border-gray-600" />
							</div>
						</div>

						{/* SKELETON: Section 3 - Tabs + Complex Filters */}
						<div className="flex flex-col-reverse justify-between items-center pt-6 -mb-1 bg-white xl:flex-row dark:bg-dark-high">
							{/* Date Tabs */}
							<div className="flex flex-row">
								{['Today', 'Yesterday', 'Tomorrow'].map((tab, index) => (
									<div key={index} className="cursor-pointer pt-2 px-5 pb-[30px]">
										<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										{/* Active tab indicator */}
										{index === 0 && (
											<div className="w-full h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mt-2" />
										)}
									</div>
								))}
							</div>

							{/* Complex Filters Section */}
							<div className="flex gap-5 mt-4 max-h-10 lg:mt-0 min-h-8">
								{/* Epic Properties Dropdown */}
								<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
									<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Issues Dropdown with Complex Structure */}
								<div className="relative z-10 flex items-center justify-center min-w-28 max-w-fit lg:mt-0 input-border flex-col bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-4 max-h-full rounded-[8px]">
									<div className="flex gap-2 items-center">
										<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
										<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
										<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									</div>
								</div>

								{/* Task Labels Dropdown */}
								<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
									<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Task Properties Dropdown */}
								<div className="min-w-fit lg:mt-0 input-border rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light flex flex-col justify-center">
									<div className="w-24 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-2" />
								</div>

								{/* Task Sizes Dropdown */}
								<div className="relative min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
									<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>

								{/* Separator */}
								<div className="w-px h-10 bg-gray-200 dark:bg-gray-600" />

								{/* Search Bar */}
								<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
									<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
							</div>
						</div>
					</Container>
				</div>
			}
		>
			{/* SKELETON: Main Content Area - Kanban Board */}
			<div className="container overflow-x-hidden px-0 mx-0 w-full">
				<div className="w-[1280px] xl:w-[1500px] 2xl:w-[1600px] mt-6 relative bg-transparent dark:bg-[#181920] min-h-svh h-svh px-3">
					<div className="flex flex-row flex-1 gap-4 px-8 w-full h-full min-h-fit lg:px-0">
						{/* Kanban Columns */}
						{[...Array(5)].map((_, index) => (
							<div key={index} className="flex flex-col gap-[10px] min-w-[325px]">
								{/* Column Header Skeleton */}
								<div className="h-10 w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />

								{/* Tasks Skeleton */}
								<div className="flex flex-col gap-[5px]">
									{[...Array(2)].map((_, taskIndex) => (
										<div
											key={taskIndex}
											className="h-[155px] w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg"
										/>
									))}

									{/* Add Task Button Skeleton */}
									<div className="h-14 w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</MainLayout>
	);
};

export default KanbanPageSkeleton;
