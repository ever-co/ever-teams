import React, { FC } from 'react';
import { cn } from '@/core/lib/helpers';

interface SettingsSkeletonProps {
	className?: string;
}

const PULSE = 'bg-[#F0F0F0] dark:bg-white/8 animate-pulse';
// A settings row: a label column on the left and a 36px control on the right.
const ROW =
	'grid grid-cols-1 gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4';

const SettingRowSkeleton: FC<{ labelWidth?: string; control?: React.ReactNode }> = ({
	labelWidth = 'w-24',
	control
}) => (
	<div className={ROW}>
		<div className={cn('h-4 rounded', labelWidth, PULSE)} />
		{control ?? <div className={cn('h-9 w-full max-w-md rounded-md', PULSE)} />}
	</div>
);

const TableSkeleton: FC<{ columns: number; rows: number; avatar?: boolean }> = ({ columns, rows, avatar }) => (
	<div className="w-full">
		{/* Header */}
		<div
			className="grid gap-4 border-b border-border py-2.5"
			style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
		>
			{[...Array(columns)].map((_, i) => (
				<div key={i} className={cn('h-3 w-16 rounded', PULSE)} />
			))}
		</div>

		{/* Rows */}
		{[...Array(rows)].map((_, i) => (
			<div
				key={i}
				className="grid items-center gap-4 border-b border-border py-2.5 last:border-b-0"
				style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
			>
				{[...Array(columns)].map((_, col) => (
					<div key={col} className="flex items-center gap-3">
						{avatar && col === 0 ? <div className={cn('size-8 shrink-0 rounded-full', PULSE)} /> : null}
						<div className={cn('h-4 rounded', col === columns - 1 ? 'h-7 w-20 rounded-md' : 'w-24', PULSE)} />
					</div>
				))}
			</div>
		))}
	</div>
);

/**
 * Skeleton for TeamSettingForm component
 * Matches exact structure: the settings rows under the team avatar
 */
export const TeamSettingFormSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col', className)}>
			<SettingRowSkeleton labelWidth="w-20" />
			<SettingRowSkeleton labelWidth="w-20" />
			<SettingRowSkeleton labelWidth="w-12" />
			<SettingRowSkeleton labelWidth="w-16" />
			<SettingRowSkeleton
				labelWidth="w-16"
				control={
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
							<div className={cn('size-4 rounded-full', PULSE)} />
							<div className={cn('h-4 w-20 rounded', PULSE)} />
						</div>
						<div className="flex items-center gap-2">
							<div className={cn('size-4 rounded-full', PULSE)} />
							<div className={cn('h-4 w-20 rounded', PULSE)} />
						</div>
					</div>
				}
			/>
			{[...Array(3)].map((_, i) => (
				<SettingRowSkeleton
					key={i}
					labelWidth="w-28"
					control={
						<div className="flex items-center gap-2.5">
							<div className={cn('h-[38px] w-[74px] rounded-full', PULSE)} />
							<div className={cn('h-4 w-16 rounded', PULSE)} />
						</div>
					}
				/>
			))}
		</div>
	);
};

/**
 * Skeleton for InvitationSetting component
 * Matches exact structure: search + invite toolbar, then the invitation table
 */
export const InvitationSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-2">
				<div className={cn('h-9 w-full max-w-xs rounded-lg', PULSE)} />
				<div className={cn('h-9 w-24 rounded-md', PULSE)} />
			</div>

			{/* Invitations Table */}
			<TableSkeleton columns={4} rows={3} avatar />
		</div>
	);
};

/**
 * Skeleton for MemberSetting component
 * Matches exact structure: sub-heading, search, then the member table
 */
export const MemberSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-3', className)}>
			<div className={cn('h-4 w-32 rounded', PULSE)} />
			<div className={cn('h-9 w-full max-w-xs rounded-lg', PULSE)} />

			{/* Members Table */}
			<TableSkeleton columns={5} rows={5} avatar />
		</div>
	);
};

/**
 * Skeleton for IntegrationSetting component
 * Matches exact structure: the GitHub row (logo, name, description, action)
 */
export const IntegrationSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className={cn('size-9 shrink-0 rounded-md', PULSE)} />
					<div className="flex flex-col gap-2">
						<div className={cn('h-4 w-20 rounded', PULSE)} />
						<div className={cn('h-3 w-64 rounded', PULSE)} />
					</div>
				</div>
				<div className={cn('h-9 w-20 rounded-md', PULSE)} />
			</div>
		</div>
	);
};

/**
 * Skeleton for IssuesSettings component
 * Matches exact structure: one section per list (versions, statuses, priorities, sizes, labels)
 */
export const IssuesSettingsSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col divide-y divide-border', className)}>
			{[...Array(5)].map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
				>
					<div className={cn('h-4 w-24 rounded sm:mt-2', PULSE)} />
					<div className="flex flex-col gap-3">
						<div className={cn('h-9 w-44 rounded-md', PULSE)} />
						<div className={cn('h-3 w-20 rounded', PULSE)} />
						<div className="flex flex-wrap gap-2">
							{[...Array(4)].map((_, chip) => (
								<div key={chip} className={cn('h-9 w-36 rounded-md', PULSE)} />
							))}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

/**
 * Skeleton for DangerZoneTeam component
 * Matches exact structure: three rows of title + description with an outline action
 */
export const DangerZoneTeamSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col', className)}>
			{[...Array(3)].map((_, i) => (
				<div
					key={i}
					className="flex items-center justify-between gap-3 border-t border-border py-4 first:border-t-0 first:pt-0"
				>
					<div className="flex flex-col gap-2">
						<div className={cn('h-4 w-32 rounded', PULSE)} />
						<div className={cn('h-3 w-64 rounded', PULSE)} />
					</div>
					<div className={cn('h-9 w-24 rounded-md', PULSE)} />
				</div>
			))}
		</div>
	);
};

/**
 * Skeleton for the Ever Platform section: a heading, a line of text and a switch row
 */
export const EverPlatformSectionSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			<div className={cn('h-4 w-48 rounded', PULSE)} />
			<div className={cn('h-3 w-full rounded', PULSE)} />
			<div className="flex items-center justify-between">
				<div className={cn('h-4 w-40 rounded', PULSE)} />
				<div className={cn('h-6 w-11 rounded-full', PULSE)} />
			</div>
		</div>
	);
};
