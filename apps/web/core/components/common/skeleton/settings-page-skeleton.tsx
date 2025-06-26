'use client';
import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { Container } from '@/core/components';
import { TitleBlockSkeleton } from './task-details-page-skeleton';

interface SettingsPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Settings pages
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: mainHeaderSlot + LeftSideSettingMenu + content area
 */

const SettingsPageSkeleton: FC<SettingsPageSkeletonProps> = ({ className, fullWidth = false }) => {
	return (
		<div className={cn('flex flex-col w-full min-h-screen', className)}>
			<section className="flex gap-2.5 lg:items-start 3xl:gap-8">
				{/* Main Content Section */}
				<section className="md:max-w-[80rem] w-full 3xl:max-w-none xl:w-full mb-4 md:mb-0">
					{/* Task Title Block Skeleton */}
					<TitleBlockSkeleton />

					{/* Main Content Area */}
					<div className="bg-[#F9F9F9] dark:bg-dark--theme-light p-2 md:p-6 pt-0 flex flex-col gap-8 rounded-sm">
						<Container fullWidth={fullWidth} className="!p-0 w-full">
							<div className="w-full">
								<div
									className={cn(
										'overflow-y-auto px-5 mt-3 w-full h-[calc(100svh-_291px)]',
										className
									)}
								>
									<SettingsContentSkeleton />
								</div>
							</div>
						</Container>
					</div>
				</section>
			</section>
		</div>
	);
};
/**
 * Skeleton for LeftSideSettingMenu component
 * Matches exact structure: Personal + Team sections with navigation items
 */
export const LeftSideSettingMenuSkeleton: FC = () => {
	return (
		<div className="w-[320px] mt-[36px] mr-[56px]">
			{/* Personal Settings Section */}
			<div className="mb-8">
				{/* Section Header with Icon */}
				<div className="flex gap-3 items-center mb-4">
					<div className="w-5 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Navigation Items */}
				<div className="flex flex-col gap-2 ml-8">
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-36 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Team Settings Section */}
			<div className="mb-8">
				{/* Section Header with Icon */}
				<div className="flex gap-3 items-center mb-4">
					<div className="w-5 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-20 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Navigation Items */}
				<div className="flex flex-col gap-2 ml-8">
					<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-30 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-26 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for Settings Content Area
 * Matches exact structure: mobile button + accordion sections
 */
const SettingsContentSkeleton: FC = () => {
	return (
		<div className="overflow-auto pb-16">
			{/* Mobile Team Settings Button (lg:hidden) */}
			<div className="mb-4 w-full lg:hidden">
				<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-100 dark:border-gray-800" />
			</div>

			{/* Accordion Sections */}
			{[...Array(4)].map((_, index) => (
				<AccordionSectionSkeleton key={index} isDanger={index === 3} />
			))}
		</div>
	);
};

/**
 * Skeleton for individual Accordion Section
 * Matches exact structure: accordion header + content area
 */
const AccordionSectionSkeleton: FC<{ isDanger?: boolean }> = ({ isDanger = false }) => {
	return (
		<div
			className={cn(
				'p-4 mt-8 w-full rounded-lg max-w-[96vw]',
				isDanger ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-dark--theme'
			)}
		>
			{/* Accordion Header */}
			<div className="flex justify-between items-center mb-6">
				<div
					className={cn(
						'h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded',
						isDanger ? 'w-24' : 'w-32'
					)}
				/>
				<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Accordion Content */}
			<div className="space-y-6">
				{/* Form Fields or Content */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
					</div>
					<div className="flex flex-col gap-2">
						<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
					</div>
				</div>

				{/* Additional Content */}
				<div className="flex flex-col gap-4">
					<div className="w-40 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-full h-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3 justify-end">
					<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
					<div
						className={cn(
							'w-24 h-10 animate-pulse rounded-lg',
							isDanger ? 'bg-red-200 dark:bg-red-800' : 'bg-[#F0F0F0] dark:bg-[#353741]'
						)}
					/>
				</div>
			</div>
		</div>
	);
};

/**
 * Simplified Settings Content Skeleton for individual pages
 * Used with withAuthentication showPageSkeleton option
 */
export const SettingsContentPageSkeleton: FC<SettingsPageSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('overflow-auto pb-16', className)}>
			{/* Mobile Team Settings Button (lg:hidden) */}
			<div className="mb-4 w-full lg:hidden">
				<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl border border-gray-100 dark:border-gray-800" />
			</div>

			{/* Accordion Sections */}
			{[...Array(4)].map((_, index) => (
				<AccordionSectionSkeleton key={index} isDanger={index === 3} />
			))}
		</div>
	);
};

export default SettingsPageSkeleton;
