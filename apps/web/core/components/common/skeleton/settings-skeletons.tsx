import { FC, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { LIST_SURFACE_CLASS } from '@/core/components/teams/list-surface';
import { SETTINGS_ROW_CLASS, SETTINGS_ROWS_CLASS } from '@/core/components/pages/settings/settings-section';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const SWITCH = 'h-6 w-10.5 rounded-full';

const TOGGLE_ROWS = 3;

const ISSUE_SECTIONS = 5;

const ISSUE_CHIPS = 4;

const DANGER_ROWS = 3;

interface SettingsSkeletonProps {
	className?: string;
}

interface TableSkeletonProps {
	columns: number;
	rows: number;
	avatar?: boolean;
}

interface TableCellSkeletonProps {
	isFirst: boolean;
	isLast: boolean;
	showAvatar: boolean;
}

const SettingRowSkeleton: FC<{ labelWidth?: string; control?: ReactNode }> = ({ labelWidth = 'w-24', control }) => {
	return (
		<div className={SETTINGS_ROW_CLASS}>
			<div className={cn(BAR, 'h-4', labelWidth)} />
			{control ?? <div className={cn(BAR, 'h-9 w-full max-w-md')} />}
		</div>
	);
};

function TableCellSkeleton({ isFirst, isLast, showAvatar }: TableCellSkeletonProps) {
	const hasAvatar = showAvatar && isFirst;
	let barClass = 'h-4 w-24';
	if (isLast) {
		barClass = 'h-6 w-20';
	}
	return (
		<TableCell>
			<div className="flex items-center gap-3">
				{hasAvatar && <div className={cn(BAR, 'size-8 shrink-0 rounded-full')} />}
				<div className={cn(BAR, barClass)} />
			</div>
		</TableCell>
	);
}

const TableSkeleton: FC<TableSkeletonProps> = ({ columns, rows, avatar = false }) => {
	const columnKeys = Array.from({ length: columns }, (_, index) => index);
	const rowKeys = Array.from({ length: rows }, (_, index) => index);
	const lastColumn = columns - 1;
	return (
		<div className={LIST_SURFACE_CLASS}>
			<Table className="w-full">
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						{columnKeys.map((key) => (
							<TableHead key={key}>
								<div className={cn(BAR, 'h-3 w-16')} />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rowKeys.map((rowKey) => (
						<TableRow key={rowKey} className="hover:bg-transparent">
							{columnKeys.map((columnKey) => (
								<TableCellSkeleton
									key={columnKey}
									isFirst={columnKey === 0}
									isLast={columnKey === lastColumn}
									showAvatar={avatar}
								/>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
};

const ToggleControlSkeleton: FC = () => {
	return (
		<div className="flex items-center gap-2.5">
			<div className={cn(BAR, SWITCH)} />
			<div className={cn(BAR, 'h-4 w-16')} />
		</div>
	);
};

const TeamTypeControlSkeleton: FC = () => {
	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
			<div className="flex items-center gap-2">
				<div className={cn(BAR, 'size-4 rounded-full')} />
				<div className={cn(BAR, 'h-4 w-20')} />
			</div>
			<div className="flex items-center gap-2">
				<div className={cn(BAR, 'size-4 rounded-full')} />
				<div className={cn(BAR, 'h-4 w-20')} />
			</div>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<div className={cn(BAR, 'h-9 min-w-40 flex-1 sm:max-w-xs')} />
				<div className={cn(BAR, 'h-9 w-24 shrink-0')} />
			</div>
		</div>
	);
};

/** The team settings form: the label column and the control column, one row per setting. */
export const TeamSettingFormSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	const toggleKeys = Array.from({ length: TOGGLE_ROWS }, (_, index) => index);
	return (
		<div className={cn('w-full', SETTINGS_ROWS_CLASS, className)}>
			<SettingRowSkeleton labelWidth="w-24" />
			<SettingRowSkeleton labelWidth="w-24" />
			<SettingRowSkeleton labelWidth="w-14" />
			<SettingRowSkeleton labelWidth="w-20" />
			<SettingRowSkeleton labelWidth="w-20" control={<TeamTypeControlSkeleton />} />
			{toggleKeys.map((key) => (
				<SettingRowSkeleton key={key} labelWidth="w-32" control={<ToggleControlSkeleton />} />
			))}
		</div>
	);
};

/** The invitations block: the search and the one primary, then the table in its surface. */
export const InvitationSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			<div className="flex w-full flex-wrap items-center justify-between gap-3">
				<div className={cn(BAR, 'h-8 w-full sm:max-w-xs')} />
				<div className={cn(BAR, 'h-8 w-20 shrink-0')} />
			</div>
			<TableSkeleton columns={6} rows={3} avatar />
		</div>
	);
};

/** The members block: the sub-heading and the search, then the table in its surface. */
export const MemberSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			<div className="flex w-full flex-wrap items-center justify-between gap-3">
				<div className={cn(BAR, 'h-4 w-32')} />
				<div className={cn(BAR, 'h-8 w-full sm:max-w-xs')} />
			</div>
			<TableSkeleton columns={6} rows={5} avatar />
		</div>
	);
};

/** The integrations block: the GitHub row with its logo tile, name, description and action. */
export const IntegrationSettingSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col hairline-divide-y divide-border', className)}>
			<div className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
				<div className="flex min-w-0 items-center gap-3">
					<div className={cn(BAR, 'size-10 shrink-0 rounded-lg')} />
					<div className="flex flex-col gap-2">
						<div className={cn(BAR, 'h-4 w-20')} />
						<div className={cn(BAR, 'h-3 w-64')} />
					</div>
				</div>
				<div className={cn(BAR, 'h-8 w-20 shrink-0')} />
			</div>
		</div>
	);
};

/** The issue settings: one block per list (versions, statuses, priorities, sizes, labels) on the forms' 10rem label column. */
export const IssuesSettingsSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	const sectionKeys = Array.from({ length: ISSUE_SECTIONS }, (_, index) => index);
	const chipKeys = Array.from({ length: ISSUE_CHIPS }, (_, index) => index);
	return (
		<div className={cn('flex flex-col hairline-divide-y divide-border', className)}>
			{sectionKeys.map((sectionKey) => (
				<div
					key={sectionKey}
					className="grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
				>
					<div className={cn(BAR, 'h-4 w-24 sm:mt-2')} />
					<div className="flex flex-col gap-3">
						<div className={cn(BAR, 'h-9 w-44')} />
						<div className={cn(BAR, 'h-3 w-20')} />
						<div className="flex flex-wrap gap-2">
							{chipKeys.map((chipKey) => (
								<div key={chipKey} className={cn(BAR, 'h-9 w-36')} />
							))}
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

/** The team danger zone: three rows of title and description with an outline action at the end. */
export const DangerZoneTeamSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	const rowKeys = Array.from({ length: DANGER_ROWS }, (_, index) => index);
	return (
		<div className={cn('flex w-full flex-col', className)}>
			{rowKeys.map((key) => (
				<div
					key={key}
					className="flex flex-col gap-3 hairline-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
				>
					<div className="flex flex-col gap-2">
						<div className={cn(BAR, 'h-4 w-32')} />
						<div className={cn(BAR, 'h-3 w-64')} />
					</div>
					<div className={cn(BAR, 'h-8 w-24 shrink-0')} />
				</div>
			))}
		</div>
	);
};

/** The Ever Platform block: the description line, then a row with a switch. */
export const EverPlatformSectionSkeleton: FC<SettingsSkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-4', className)}>
			<div className={cn(BAR, 'h-3 w-full max-w-xl')} />
			<div className="flex items-center justify-between gap-3">
				<div className={cn(BAR, 'h-4 w-40')} />
				<div className={cn(BAR, SWITCH)} />
			</div>
		</div>
	);
};
