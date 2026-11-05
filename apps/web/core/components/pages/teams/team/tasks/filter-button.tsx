import { Table } from '@tanstack/react-table';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { SlidersHorizontal } from '@/core/components/icons';

interface FilterButtonProps<TData> {
	table: Table<TData>;
}

export default function FilterButton<TData>({ table }: Readonly<FilterButtonProps<TData>>) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="default" className="gap-2 text-foreground">
					<SlidersHorizontal className="size-4" />
					<span className="font-medium">Filter</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{table.getAllColumns().map((column) => {
					if (column.getCanFilter()) {
						return (
							<DropdownMenuCheckboxItem
								key={column.id}
								className="capitalize"
								checked={column.getIsVisible()}
								onCheckedChange={(value) => column.toggleVisibility(!!value)}
							>
								{column.id}
							</DropdownMenuCheckboxItem>
						);
					}
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
