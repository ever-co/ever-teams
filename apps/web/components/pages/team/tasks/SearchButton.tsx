import { Search } from 'lucide-react';
import { Input } from '@components/ui/input';

import { Table } from '@tanstack/react-table';
interface SearchButtonProps<TData> {
	table: Table<TData>;
}

export default function SearchButton<TData>({ table }: Readonly<SearchButtonProps<TData>>) {
	return (
		<div className="flex gap-2.5 items-center relative min-w-[122px] border border-gray-200 dark:border-gray-300 rounded-lg">
			<Search className="absolute w-4 h-4 left-3" />

			<Input
				placeholder="Search tasks..."
				value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
				onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
				className="max-w-sm pl-10 bg-transparent border-none placeholder:font-normal"
			/>
		</div>
	);
}
