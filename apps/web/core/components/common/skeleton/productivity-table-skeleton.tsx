import { FC, Fragment } from 'react';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { cn } from '@/core/lib/helpers';
import { PaginateSkeleton } from './reports-component-skeletons';

const DATE_GROUPS = 2;

const ROWS_PER_GROUP = 5;

const HEAD_BAR_WIDTHS = ['w-16', 'w-16', 'w-20', 'w-20', 'w-24'];

interface ProductivityTableSkeletonProps {
	className?: string;
}

function ProductivityRowSkeleton() {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell>
				<div className="flex items-center gap-2">
					<Skeleton className="size-8 shrink-0 rounded-full" />
					<Skeleton className="h-4 w-24" />
				</div>
			</TableCell>
			<TableCell>
				<Skeleton className="h-4 w-24" />
			</TableCell>
			<TableCell>
				<Skeleton className="h-4 w-32" />
			</TableCell>
			<TableCell>
				<Skeleton className="h-4 w-16" />
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Skeleton className="h-1.5 w-full rounded-full" />
					<Skeleton className="h-4 w-10 shrink-0" />
				</div>
			</TableCell>
		</TableRow>
	);
}

/** The productivity table grouped by date: a sortable head, one day row per group, member rows, the pagination. */
export const ProductivityTableSkeleton: FC<ProductivityTableSkeletonProps> = ({ className }) => {
	const groupKeys = Array.from({ length: DATE_GROUPS }, (_, index) => index);
	const rowKeys = Array.from({ length: ROWS_PER_GROUP }, (_, index) => index);
	return (
		<Card className={cn('min-h-[600px] overflow-hidden', className)}>
			<Table>
				<TableHeader className="bg-foreground/2.5">
					<TableRow className="hover:bg-transparent">
						{HEAD_BAR_WIDTHS.map((width, index) => (
							<TableHead key={index}>
								<div className="flex items-center gap-2">
									<Skeleton className={cn('h-3', width)} />
									<Skeleton className="size-4" />
								</div>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{groupKeys.map((groupKey) => (
						<Fragment key={groupKey}>
							<TableRow className="hover:bg-transparent">
								<TableCell colSpan={5} className="bg-foreground/2.5 px-4 py-2.5">
									<Skeleton className="h-4 w-44" />
								</TableCell>
							</TableRow>
							{rowKeys.map((rowKey) => (
								<ProductivityRowSkeleton key={rowKey} />
							))}
						</Fragment>
					))}
				</TableBody>
			</Table>
			<div className="hairline-t border-border px-4 py-3">
				<PaginateSkeleton className="pt-0" />
			</div>
		</Card>
	);
};
