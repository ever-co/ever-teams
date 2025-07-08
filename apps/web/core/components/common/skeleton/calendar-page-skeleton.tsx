import React, { FC } from 'react';
import { Container } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';

interface CalendarPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
	fullWidth?: boolean;
}

/**
 * Complete page-level skeleton for Calendar page
 * Integrates seamlessly with MainLayout structure without swallowing it up
 * Matches exact layout: fixed header (breadcrumb + tabs + calendar controls) + main content (FullCalendar)
 */
export const CalendarPageSkeleton: FC<CalendarPageSkeletonProps> = ({
	className,
	showTimer = false,
	fullWidth = false
}) => {
	return (
		<MainLayout showTimer={showTimer} footerClassName="hidden" className="h-full shadow-xl">
			{/* SKELETON: Fixed Header Section */}
			<div className="fixed top-20 flex flex-col border-b-[1px] dark:border-gray-800 z-10 mx-0 w-full bg-white dark:bg-dark-high shadow-lg shadow-gray-100 dark:shadow-gray-700">
				<Container fullWidth={fullWidth}>
					{/* SKELETON: Header Row with Breadcrumb + Tabs */}
					<div className="flex flex-row justify-between items-start mt-12 bg-white dark:bg-dark-high">
						{/* Left Side: Icon + Breadcrumb */}
						<div className="flex gap-8 justify-center items-center h-10">
							{/* Icon Skeleton */}
							<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Breadcrumb Skeleton */}
							<div className="flex gap-2 items-center">
								<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-1 h-1 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>

						{/* Right Side: Header Tabs */}
						<div className="flex gap-1 justify-center items-center w-max h-10">
							{/* Tab Buttons Skeleton */}
							<div className="flex gap-1">
								<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
								<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
								<div className="w-18 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							</div>
						</div>
					</div>

					{/* SKELETON: Calendar Header Controls */}
					<div className="flex flex-col w-full">
						<div className="flex justify-between items-center py-2 mt-10 bg-white dark:bg-dark-high">
							{/* Left Side: Title */}
							<div className="w-32 h-9 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

							{/* Right Side: Controls */}
							<div className="flex items-center space-x-3">
								{/* Toggle Buttons */}
								<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
								<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />

								{/* Add Time Button */}
								<div className="w-20 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							</div>
						</div>

						{/* Divider */}
						<div className="w-full border border-gray-100 dark:border-gray-800"></div>
					</div>
				</Container>
			</div>

			{/* SKELETON: Main Calendar Content */}
			<div className="mt-[15vh] mb-32">
				<Container fullWidth={fullWidth}>
					<div className="w-full">
						{/* SKELETON: Calendar Navigation Header */}
						<div className="flex justify-between items-center p-4 mb-6 bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
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

						{/* SKELETON: FullCalendar Grid */}
						<div className="flex h-full bg-white rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-dark--theme">
							{/* Main Calendar Area */}
							<div className="flex-1 p-4">
								{/* Calendar Header (Days of Week) */}
								<div className="grid grid-cols-7 gap-1 mb-4">
									{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
										<div
											key={index}
											className="p-3 text-center border-b border-gray-200 dark:border-gray-600"
										>
											<div className="w-8 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mx-auto" />
										</div>
									))}
								</div>

								{/* Calendar Body (6 weeks) */}
								<div className="grid grid-cols-7 gap-1">
									{[...Array(42)].map((_, index) => (
										<div
											key={index}
											className="p-2 bg-white border border-gray-100 aspect-square dark:border-gray-700 dark:bg-dark--theme-light"
										>
											{/* Day Number */}
											<div className="w-6 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />

											{/* Events (random pattern) */}
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

							{/* SKELETON: Side Panel (Conditional) */}
							<div className="pl-5 m-5 w-1/5 h-full border-l border-gray-200 dark:border-gray-600">
								<div className="py-10">
									{/* Side Panel Header */}
									<div className="w-full h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-6" />

									{/* Event List */}
									<div className="space-y-4">
										{[...Array(5)].map((_, index) => (
											<div key={index} className="p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
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

						{/* SKELETON: Calendar Footer Controls */}
						<div className="flex justify-between items-center p-4 mt-6 bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-gray-600">
							{/* Left Info */}
							<div className="flex gap-4 items-center">
								<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>

							{/* Right Actions */}
							<div className="flex gap-2 items-center">
								<div className="w-16 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
								<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded border border-gray-200 dark:border-gray-600" />
							</div>
						</div>
					</div>
				</Container>
			</div>
		</MainLayout>
	);
};

export default CalendarPageSkeleton;
