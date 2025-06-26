import React, { FC } from 'react';
import { cn } from '@/core/lib/helpers';

interface SettingsSkeletonProps {
	className?: string;
}

/**
 * Skeleton for TeamSettingForm component
 * Matches exact structure: TeamAvatar + form fields
 */
export const TeamSettingFormSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-6', className)}>
			{/* Team Avatar Section */}
			<div className="flex gap-4 items-center mb-6">
				<div className="w-20 h-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				<div className="flex flex-col gap-2">
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>

			{/* Form Fields */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				{/* Team Name */}
				<div className="flex flex-col gap-2">
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
				</div>

				{/* Team Description */}
				<div className="flex flex-col gap-2">
					<div className="w-28 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
				</div>
			</div>

			{/* Additional Settings */}
			<div className="flex flex-col gap-4">
				<div className="w-40 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-full h-32 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
			</div>

			{/* Save Button */}
			<div className="flex justify-end">
				<div className="w-24 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
			</div>
		</div>
	);
};

/**
 * Skeleton for InvitationSetting component
 * Matches exact structure: invitation table with actions
 */
export const InvitationSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			{/* Invitation Form */}
			<div className="flex gap-4 items-end">
				<div className="flex-1">
					<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
					<div className="w-full h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
				</div>
				<div className="w-24 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
			</div>

			{/* Invitations Table */}
			<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
				{/* Table Header */}
				<div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-600">
					<div className="grid grid-cols-4 gap-4">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>

				{/* Table Rows */}
				{[...Array(3)].map((_, i) => (
					<div key={i} className="p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
						<div className="grid grid-cols-4 gap-4 items-center">
							<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="flex gap-2">
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for MemberSetting component
 * Matches exact structure: member management table
 */
export const MemberSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			{/* Search and Filters */}
			<div className="flex gap-4 items-center">
				<div className="flex-1 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
				<div className="w-32 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg border border-gray-200 dark:border-gray-600" />
			</div>

			{/* Members Table */}
			<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
				{/* Table Header */}
				<div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-600">
					<div className="grid grid-cols-5 gap-4">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>

				{/* Table Rows */}
				{[...Array(5)].map((_, i) => (
					<div key={i} className="p-4 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
						<div className="grid grid-cols-5 gap-4 items-center">
							{/* Avatar + Name */}
							<div className="flex gap-3 items-center">
								<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
								<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
							<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-20 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="flex gap-2">
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for IntegrationSetting component
 * Matches exact structure: integration cards with toggles
 */
export const IntegrationSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3', className)}>
			{[...Array(6)].map((_, i) => (
				<div
					key={i}
					className="p-6 bg-white rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800"
				>
					{/* Integration Icon + Name */}
					<div className="flex gap-4 items-center mb-4">
						<div className="w-12 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
						<div className="flex flex-col gap-2">
							<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>

					{/* Description */}
					<div className="mb-4">
						<div className="w-full h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
						<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>

					{/* Toggle Switch */}
					<div className="flex justify-between items-center">
						<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-12 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
					</div>
				</div>
			))}
		</div>
	);
};

/**
 * Skeleton for IssuesSettings component
 * Matches exact structure: issue type configurations
 */
export const IssuesSettingsSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-6', className)}>
			{/* Issue Types Section */}
			<div className="flex flex-col gap-4">
				<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

				{/* Issue Type Cards */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800"
						>
							<div className="flex justify-between items-center">
								<div className="flex gap-3 items-center">
									<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
									<div className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
								<div className="w-12 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Priority Settings */}
			<div className="flex flex-col gap-4">
				<div className="w-28 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />

				{/* Priority Cards */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800"
						>
							<div className="flex justify-between items-center">
								<div className="flex gap-3 items-center">
									<div className="w-6 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
									<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
								</div>
								<div className="w-8 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for DangerZoneTeam component
 * Matches exact structure: danger actions with confirmations
 */
export const DangerZoneTeamSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-6', className)}>
			{/* Warning Message */}
			<div className="p-4 bg-red-50 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800">
				<div className="w-full h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
				<div className="w-3/4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Danger Actions */}
			{[...Array(3)].map((_, i) => (
				<div
					key={i}
					className="p-4 bg-red-50 rounded-lg border border-red-200 dark:border-red-800 dark:bg-red-900/10"
				>
					<div className="flex justify-between items-center">
						<div className="flex flex-col gap-2">
							<div className="w-32 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
							<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
						<div className="w-24 h-10 bg-red-200 rounded-lg animate-pulse dark:bg-red-800" />
					</div>
				</div>
			))}
		</div>
	);
};
