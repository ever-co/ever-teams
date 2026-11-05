import { FC, ReactNode } from 'react';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { TimeActivityTableSkeleton } from './time-activity-table-skeleton';

export interface Column<T> {
	header: string;
	accessorKey: keyof T;
	cell?: (value: any, row: T) => ReactNode;
	className?: string;
}

export interface GroupHeader {
	label: string;
	value: string | number;
}

interface TimeActivityTableAdapterProps<T> {
	data: {
		headers: GroupHeader[];
		dateRange: string;
		entries: T[];
	}[];
	columns: Column<T>[];
	loading?: boolean;
}

export const TimeActivityTableAdapter: FC<TimeActivityTableAdapterProps<any>> = <T extends Record<string, any>>({
	data,
	columns,
	loading = false
}: TimeActivityTableAdapterProps<T>) => {
	if (loading) {
		return <TimeActivityTableSkeleton />;
	}

	return (
		<div className="space-y-6">
			{data.map((group, groupIndex) => (
				<Card key={groupIndex} className="overflow-hidden">
					{/* Group Header */}
					<div className="px-4 py-3 hairline-b border-border bg-foreground/2.5">
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">{group.dateRange}</span>
							{group.headers.map((header, index) => (
								<div
									key={index}
									className="flex items-center gap-1.5 h-6 rounded-md bg-card px-2 text-xs hairline-ring ring-border"
								>
									<span className="text-muted-foreground">{header.label}:</span>
									<span className="font-medium tabular-nums text-foreground">{header.value}</span>
								</div>
							))}
						</div>
					</div>
					{/* Time Entries */}
					<Table>
						<TableHeader>
							<TableRow>
								{columns.map((column, index) => (
									<TableHead key={index} className={column.className}>
										{column.header}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{group.entries.map((entry, entryIndex) => (
								<TableRow key={entryIndex}>
									{columns.map((column, columnIndex) => (
										<TableCell key={columnIndex} className={column.className}>
											{column.cell
												? column.cell(entry[column.accessorKey], entry)
												: entry[column.accessorKey]}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			))}
		</div>
	);
};
