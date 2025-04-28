import { FC, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
				<Card key={groupIndex} className="bg-white dark:bg-dark--theme-light">
					{/* Group Header */}
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center gap-4 text-[14px] text-[#71717A] dark:text-gray-300">
							<span className="text-base font-normal">{group.dateRange}</span>
							{group.headers.map((header, index) => (
								<div
									key={index}
									className="flex items-center gap-2 text-[14px] h-[30px] bg-white dark:bg-dark--theme-light border rounded-full p-2"
								>
									<span className="text-[#71717A] dark:text-gray-300 font-normal">
										{header.label}:
									</span>
									<span className="text-[#71717A] dark:text-gray-300 font-normal">
										{header.value}
									</span>
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
