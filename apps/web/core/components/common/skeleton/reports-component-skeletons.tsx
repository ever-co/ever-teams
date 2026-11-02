import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const LIMIT_TABLE_ROWS = 4;

const REPORT_TABLES = 3;

interface SkeletonProps {
	className?: string;
}

interface LimitTableSkeletonProps {
	className?: string;
	headerWidth: string;
	indexWidth: string;
}

function LimitTableHeadSkeleton({ indexWidth }: { indexWidth: string }) {
	return (
		<TableHeader>
			<TableRow className="hover:bg-transparent">
				<TableHead>
					<div className={cn(BAR, 'h-3', indexWidth)} />
				</TableHead>
				<TableHead>
					<div className={cn(BAR, 'ml-auto h-3 w-20')} />
				</TableHead>
				<TableHead>
					<div className={cn(BAR, 'ml-auto h-3 w-12')} />
				</TableHead>
				<TableHead>
					<div className={cn(BAR, 'h-3 w-28')} />
				</TableHead>
				<TableHead>
					<div className={cn(BAR, 'ml-auto h-3 w-20')} />
				</TableHead>
			</TableRow>
		</TableHeader>
	);
}

function LimitTableRowSkeleton({ indexWidth }: { indexWidth: string }) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell>
				<div className={cn(BAR, 'h-4', indexWidth)} />
			</TableCell>
			<TableCell>
				<div className={cn(BAR, 'ml-auto h-4 w-16')} />
			</TableCell>
			<TableCell>
				<div className={cn(BAR, 'ml-auto h-4 w-12')} />
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<div className={cn(BAR, 'h-1.5 w-full max-w-40 rounded-full')} />
					<div className={cn(BAR, 'h-4 w-16 shrink-0')} />
				</div>
			</TableCell>
			<TableCell>
				<div className={cn(BAR, 'ml-auto h-4 w-16')} />
			</TableCell>
		</TableRow>
	);
}

function LimitTableSkeleton({ className, headerWidth, indexWidth }: LimitTableSkeletonProps) {
	const rowKeys = Array.from({ length: LIMIT_TABLE_ROWS }, (_, index) => index);
	return (
		<Card className={cn('w-full overflow-hidden', className)}>
			<div className="flex h-10 items-center hairline-b border-border bg-foreground/2.5 px-4">
				<div className={cn(BAR, 'h-3', headerWidth)} />
			</div>
			<Table>
				<LimitTableHeadSkeleton indexWidth={indexWidth} />
				<TableBody>
					{rowKeys.map((key) => (
						<LimitTableRowSkeleton key={key} indexWidth={indexWidth} />
					))}
				</TableBody>
			</Table>
		</Card>
	);
}

/** One period of the limit report: the date on a hairline header, then one row per member. */
export const TimeReportTableSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <LimitTableSkeleton className={className} headerWidth="w-24" indexWidth="w-32" />;
};

/** One member of the limit report: the name on a hairline header, then one row per period. */
export const TimeReportTableByMemberSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <LimitTableSkeleton className={className} headerWidth="w-32" indexWidth="w-40" />;
};

export const MembersSelectSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <div className={cn(BAR, 'h-8 w-48', className)} />;
};

export const GroupBySelectSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <div className={cn(BAR, 'h-8 w-32', className)} />;
};

export const DatePickerWithRangeSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <div className={cn(BAR, 'h-8 w-64', className)} />;
};

export const WeeklyLimitExportMenuSkeleton: FC<SkeletonProps> = ({ className }) => {
	return <div className={cn(BAR, 'h-8 w-24', className)} />;
};

/** The Paginate row: the page steps at the start, the page size and the entries line at the end. */
export const PaginateSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={cn('flex flex-col items-center justify-between gap-2 pt-4 md:flex-row', className)}>
			<div className="flex items-center gap-1">
				<div className={cn(BAR, 'size-8')} />
				<div className={cn(BAR, 'size-8')} />
				<div className={cn(BAR, 'size-8')} />
				<div className={cn(BAR, 'size-8')} />
			</div>
			<div className="flex items-center gap-5">
				<div className={cn(BAR, 'h-8 w-20')} />
				<div className={cn(BAR, 'h-4 w-48')} />
			</div>
		</div>
	);
};

/** The body of the limit report: one surface per period, then the pagination. */
export const ReportsContentSkeleton: FC<SkeletonProps> = ({ className }) => {
	const tableKeys = Array.from({ length: REPORT_TABLES }, (_, index) => index);
	return (
		<div className={cn('flex w-full flex-col gap-4', className)}>
			{tableKeys.map((key) => (
				<TimeReportTableSkeleton key={key} />
			))}
			<PaginateSkeleton className="pt-0" />
		</div>
	);
};

export default {
	TimeReportTableSkeleton,
	TimeReportTableByMemberSkeleton,
	MembersSelectSkeleton,
	GroupBySelectSkeleton,
	DatePickerWithRangeSkeleton,
	WeeklyLimitExportMenuSkeleton,
	PaginateSkeleton,
	ReportsContentSkeleton
};
