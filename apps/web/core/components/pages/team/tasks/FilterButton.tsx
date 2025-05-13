import { Button } from '@/core/components/common/button2';
import { Table } from '@tanstack/react-table';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';

interface FilterButtonProps<TData> {
	table: Table<TData>;
}

export default function FilterButton<TData>({ table }: Readonly<FilterButtonProps<TData>>) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="flex gap-2.5 items-center text-[#282048] dark:text-gray-300">
					<svg
						className="w-4 h-4"
						width={14}
						height={14}
						viewBox="0 0 14 14"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12.8334 3.79163H9.33337"
							stroke="#282048"
							strokeWidth="1.5"
							strokeMiterlimit={10}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M3.49996 3.79163H1.16663"
							stroke="#292D32"
							strokeWidth="1.5"
							strokeMiterlimit={10}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M5.83329 5.83333C6.96087 5.83333 7.87496 4.91925 7.87496 3.79167C7.87496 2.66409 6.96087 1.75 5.83329 1.75C4.70571 1.75 3.79163 2.66409 3.79163 3.79167C3.79163 4.91925 4.70571 5.83333 5.83329 5.83333Z"
							stroke="#292D32"
							strokeWidth="1.5"
							strokeMiterlimit={10}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M12.8333 10.2084H10.5"
							stroke="#292D32"
							strokeWidth="1.5"
							strokeMiterlimit={10}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M4.66663 10.2084H1.16663"
							stroke="#292D32"
							strokeWidth="1.5"
							strokeMiterlimit={10}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M8.16667 12.25C9.29425 12.25 10.2083 11.3359 10.2083 10.2083C10.2083 9.08071 9.29425 8.16663 8.16667 8.16663C7.03909 8.16663 6.125 9.08071 6.125 10.2083C6.125 11.3359 7.03909 12.25 8.16667 12.25Z"
							stroke="#292D32"
							strokeWidth="1.5"
							strokeMiterlimit={10}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
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
