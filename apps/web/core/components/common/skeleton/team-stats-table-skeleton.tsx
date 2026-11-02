import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { cn } from '@/core/lib/helpers';
import { PaginateSkeleton } from './reports-component-skeletons';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const MEMBER_ROWS = 10;

const DURATION_COLUMNS = [
	{ key: 'total', width: 'w-[100px]', barWidth: 'w-16' },
	{ key: 'tracked', width: 'w-[80px]', barWidth: 'w-12' },
	{ key: 'manual', width: 'w-[120px]', barWidth: 'w-20' },
	{ key: 'active', width: 'w-[100px]', barWidth: 'w-16' },
	{ key: 'idle', width: 'w-[80px]', barWidth: 'w-12' },
	{ key: 'unknown', width: 'w-[120px]', barWidth: 'w-20' }
];

interface TeamStatsTableSkeletonProps {
	className?: string;
}

function MemberRowSkeleton() {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell className="w-[320px]">
				<div className="flex items-center gap-2">
					<div className={cn(BAR, 'size-8 shrink-0 rounded-full')} />
					<div className={cn(BAR, 'h-4 w-32')} />
				</div>
			</TableCell>
			{DURATION_COLUMNS.map((column) => (
				<TableCell key={column.key} className={column.width}>
					<div className={cn(BAR, 'ml-auto h-4', column.barWidth)} />
				</TableCell>
			))}
			<TableCell className="w-[200px]">
				<div className="flex items-center gap-2">
					<div className={cn(BAR, 'h-1.5 w-full rounded-full')} />
					<div className={cn(BAR, 'h-4 w-12 shrink-0')} />
				</div>
			</TableCell>
			<TableCell className="w-[10px]">
				<div className={cn(BAR, 'size-8')} />
			</TableCell>
		</TableRow>
	);
}

/** The member table of the team dashboard: the head, the day row, ten member rows, the pagination under a hairline. */
export function TeamStatsTableSkeleton({ className }: TeamStatsTableSkeletonProps) {
	const rowKeys = Array.from({ length: MEMBER_ROWS }, (_, index) => index);
	return (
		<Card className={cn('w-full overflow-hidden', className)}>
			<div className="overflow-x-auto">
				<Table className="w-full">
					<TableHeader>
						<TableRow className="bg-foreground/2.5 hover:bg-foreground/2.5">
							<TableHead className="w-[320px] py-3">
								<div className={cn(BAR, 'h-3 w-20')} />
							</TableHead>
							{DURATION_COLUMNS.map((column) => (
								<TableHead key={column.key} className={column.width}>
									<div className={cn(BAR, 'ml-auto h-3', column.barWidth)} />
								</TableHead>
							))}
							<TableHead className="w-[200px]">
								<div className={cn(BAR, 'h-3 w-24')} />
							</TableHead>
							<TableHead className="w-[10px]" />
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow className="bg-foreground/2.5 hover:bg-foreground/2.5">
							<TableCell colSpan={9} className="py-2.5">
								<div className={cn(BAR, 'h-4 w-44')} />
							</TableCell>
						</TableRow>
						{rowKeys.map((key) => (
							<MemberRowSkeleton key={key} />
						))}
					</TableBody>
				</Table>
			</div>
			<div className="hairline-t border-border px-4 py-3">
				<PaginateSkeleton className="w-full px-1" />
			</div>
		</Card>
	);
}
