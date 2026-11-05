import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { PaginateSkeleton } from './reports-component-skeletons';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const HEADER_CONTROL_WIDTHS = ['w-32', 'w-24', 'w-20', 'w-56', 'w-24'];

const ACTIVITY_DAYS = 2;

const ACTIVITY_ROWS_PER_DAY = 5;

const WEEKLY_SECTIONS = 2;

const WEEKLY_ROWS_PER_SECTION = 5;

interface TimeActivitySkeletonProps {
	className?: string;
}

/** The title row of the report: the title, then group-by, filter, view, date range and export. */
export const TimeActivityHeaderSkeleton: FC<TimeActivitySkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex w-full flex-wrap items-center justify-between gap-3', className)}>
			<div className={cn(BAR, 'h-5 w-44')} />
			<div className="flex flex-wrap items-center gap-2">
				{HEADER_CONTROL_WIDTHS.map((width, index) => (
					<div key={index} className={cn(BAR, 'h-8', width)} />
				))}
			</div>
		</div>
	);
};

/** One cell of the statistics strip; the strip surface belongs to the page. */
export const CardTimeAndActivitySkeleton: FC<TimeActivitySkeletonProps & { showProgress?: boolean }> = ({
	className,
	showProgress = false
}) => {
	return (
		<div className={cn('flex min-w-0 flex-col gap-1 p-4', className)}>
			<div className="flex h-4 items-center">
				<div className={cn(BAR, 'h-3 w-24')} />
			</div>
			<div className="flex h-8 items-center">
				<div className={cn(BAR, 'h-6 w-20')} />
			</div>
			{showProgress && <div className={cn(BAR, 'h-1.5 w-28 rounded-full')} />}
		</div>
	);
};

function ActivityRowSkeleton() {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell className="px-4 py-2.5">
				<div className="flex items-center gap-3">
					<div className={cn(BAR, 'size-8 shrink-0 rounded-full')} />
					<div className={cn(BAR, 'h-4 w-28')} />
				</div>
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className="flex items-center gap-3">
					<div className={cn(BAR, 'size-6 shrink-0 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-24')} />
				</div>
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className={cn(BAR, 'ml-auto h-4 w-16')} />
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className={cn(BAR, 'ml-auto h-4 w-20')} />
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className="flex items-center gap-3">
					<div className={cn(BAR, 'h-1.5 w-24 rounded-full')} />
					<div className={cn(BAR, 'h-4 w-10')} />
				</div>
			</TableCell>
		</TableRow>
	);
}

function ActivityTableHeadSkeleton() {
	return (
		<TableHeader>
			<TableRow className="hover:bg-transparent">
				<TableHead className="px-4">
					<div className={cn(BAR, 'h-3 w-16')} />
				</TableHead>
				<TableHead className="px-4">
					<div className={cn(BAR, 'h-3 w-16')} />
				</TableHead>
				<TableHead className="px-4">
					<div className={cn(BAR, 'ml-auto h-3 w-24')} />
				</TableHead>
				<TableHead className="px-4">
					<div className={cn(BAR, 'ml-auto h-3 w-16')} />
				</TableHead>
				<TableHead className="px-4">
					<div className={cn(BAR, 'h-3 w-24')} />
				</TableHead>
			</TableRow>
		</TableHeader>
	);
}

function ActivityDaySkeleton() {
	const rowKeys = Array.from({ length: ACTIVITY_ROWS_PER_DAY }, (_, index) => index);
	return (
		<div className="overflow-hidden hairline-b border-border last:border-b-0">
			<div className="flex flex-wrap items-center gap-x-6 gap-y-2 hairline-b border-border bg-foreground/2.5 px-4 py-3">
				<div className={cn(BAR, 'h-4 w-44')} />
				<div className={cn(BAR, 'h-4 w-24')} />
				<div className={cn(BAR, 'h-4 w-28')} />
				<div className={cn(BAR, 'h-4 w-32')} />
			</div>
			<Table>
				<ActivityTableHeadSkeleton />
				<TableBody>
					{rowKeys.map((key) => (
						<ActivityRowSkeleton key={key} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

/** The daily activity table: one hairline section per day with its totals row and member rows, then the pagination. */
export const ActivityTableSkeleton: FC<TimeActivitySkeletonProps> = ({ className }) => {
	const dayKeys = Array.from({ length: ACTIVITY_DAYS }, (_, index) => index);
	return (
		<div className={cn('flex flex-col', className)}>
			{dayKeys.map((key) => (
				<ActivityDaySkeleton key={key} />
			))}
			<div className="px-4 py-3">
				<PaginateSkeleton className="pt-0" />
			</div>
		</div>
	);
};

function WeeklyRowSkeleton() {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell className="px-4 py-2.5">
				<div className="flex items-center gap-3">
					<div className={cn(BAR, 'size-8 shrink-0 rounded-full')} />
					<div className={cn(BAR, 'h-4 w-28')} />
				</div>
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className={cn(BAR, 'h-4 w-24')} />
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className={cn(BAR, 'ml-auto h-4 w-16')} />
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className={cn(BAR, 'ml-auto h-4 w-20')} />
			</TableCell>
			<TableCell className="px-4 py-2.5">
				<div className="flex items-center gap-3">
					<div className={cn(BAR, 'h-1.5 w-24 rounded-full')} />
					<div className={cn(BAR, 'h-4 w-10')} />
				</div>
			</TableCell>
		</TableRow>
	);
}

function WeeklySectionSkeleton() {
	const rowKeys = Array.from({ length: WEEKLY_ROWS_PER_SECTION }, (_, index) => index);
	return (
		<div className="overflow-hidden hairline-b border-border last:border-b-0">
			<div className="flex flex-wrap items-center justify-between gap-3 hairline-b border-border bg-foreground/2.5 px-4 py-3">
				<div className={cn(BAR, 'h-4 w-56')} />
				<div className="flex items-center gap-6">
					<div className={cn(BAR, 'h-4 w-24')} />
					<div className={cn(BAR, 'h-4 w-28')} />
					<div className={cn(BAR, 'h-4 w-20')} />
				</div>
			</div>
			<Table>
				<ActivityTableHeadSkeleton />
				<TableBody>
					{rowKeys.map((key) => (
						<WeeklyRowSkeleton key={key} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

/** The weekly report: one hairline section per week with its totals row and member rows; the surface belongs to the page. */
export const TimeActivityTableSkeleton: FC<TimeActivitySkeletonProps> = ({ className }) => {
	const sectionKeys = Array.from({ length: WEEKLY_SECTIONS }, (_, index) => index);
	return (
		<div className={cn('flex flex-col', className)}>
			{sectionKeys.map((key) => (
				<WeeklySectionSkeleton key={key} />
			))}
		</div>
	);
};

export default {
	TimeActivityHeaderSkeleton,
	CardTimeAndActivitySkeleton,
	ActivityTableSkeleton,
	TimeActivityTableSkeleton
};
