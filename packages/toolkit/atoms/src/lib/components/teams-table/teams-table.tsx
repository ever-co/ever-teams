import { cn, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@ever-teams/toolkit-ui';

/**
 * Interface representing the footer data of the table.
 * @interface FooterData
 */
interface FooterData {
	label: string; // The label displayed in the footer cell.
	value: string; // The value displayed in the footer cell.
}

/**
 * Interface for the properties of the TeamsTable component.
 * @interface TeamsTableProps
 */
export interface TeamsTableProps {
	data: any[]; // The data to be displayed in the table.
	caption?: string; // The caption of the table, displayed at the top.
	footerData?: FooterData | null; // The footer data, displayed at the bottom of the table.
	renderHeader?: (column: string) => React.ReactNode; // Function to render table column headers.
	renderCell?: (row: any, column: string) => React.ReactNode; // Function to render table cells.
	tableClassName?: string; // CSS class for the table.
	headerClassName?: string; // CSS class for the table headers.
	rowClassName?: string; // CSS class for the table rows.
	cellClassName?: string; // CSS class for the table cells.
	footerClassName?: string; // CSS class for the table footer.
}

/**
 * Flexible table component using the provided properties.
 * Allows customization of header, cell, and footer display.
 *
 * @export
 * @param {TeamsTableProps} props - Properties to customize the table.
 * @return {*} The table component.
 */
export function TeamsTable({
	data = [],
	caption = '',
	footerData = null as FooterData | null,
	renderHeader = (column: string) => column,
	renderCell = (row: any, column: string) => row[column],
	tableClassName = '',
	headerClassName = 'dark:text-white',
	rowClassName = 'dark:text-white',
	cellClassName = 'dark:text-white',
	footerClassName = 'dark:text-white'
}: TeamsTableProps) {
	// Determine the columns of the table using the keys of the first data item.
	const columns = data.length > 0 ? Object.keys(data[0]) : [];

	return (
		<Table
			className={cn(
				'dark:text-white p-5 flex-col gap-3  dark:border-gray-700 rounded-xl border-2 bg-white dark:bg-gray-800 shadow-2xl',
				tableClassName
			)}
		>
			{/* Display the table caption if provided */}
			{caption && <TableCaption className="gap-5">{caption}</TableCaption>}

			<TableHeader>
				<TableRow>
					{/* Render column headers */}
					{columns.map((column, index) => (
						<TableHead key={index} className={headerClassName}>
							{renderHeader(column)}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>

			<TableBody className="text-slate-800 dark:text-white">
				{/* Render table rows */}
				{data.map((row, rowIndex) => (
					<TableRow key={rowIndex} className={rowClassName}>
						{columns.map((column, colIndex) => (
							<TableCell key={colIndex} className={cellClassName}>
								{renderCell(row, column)}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>

			{/* Display the footer if footer data is provided */}
			{footerData && (
				<TableFooter>
					<TableRow className={footerClassName}>
						<TableCell colSpan={columns.length - 1}>{footerData.label}</TableCell>
						<TableCell className="text-right">{footerData.value}</TableCell>
					</TableRow>
				</TableFooter>
			)}
		</Table>
	);
}

export const fakedataTable = [
	{
		invoice: 'INV001',
		paymentStatus: 'Paid',
		totalAmount: '$250.00',
		paymentMethod: 'Credit Card'
	},
	{
		invoice: 'INV002',
		paymentStatus: 'Pending',
		totalAmount: '$150.00',
		paymentMethod: 'PayPal'
	},
	{
		invoice: 'INV003',
		paymentStatus: 'Unpaid',
		totalAmount: '$350.00',
		paymentMethod: 'Bank Transfer'
	},
	{
		invoice: 'INV004',
		paymentStatus: 'Paid',
		totalAmount: '$450.00',
		paymentMethod: 'Credit Card'
	},
	{
		invoice: 'INV005',
		paymentStatus: 'Paid',
		totalAmount: '$550.00',
		paymentMethod: 'PayPal'
	},
	{
		invoice: 'INV006',
		paymentStatus: 'Pending',
		totalAmount: '$200.00',
		paymentMethod: 'Bank Transfer'
	},
	{
		invoice: 'INV007',
		paymentStatus: 'Unpaid',
		totalAmount: '$300.00',
		paymentMethod: 'Credit Card'
	}
];

export const fakeColumns = [
	{ label: 'Invoice', accessor: 'invoice', className: 'w-[100px]', cellClassName: 'font-medium' },
	{ label: 'Status', accessor: 'paymentStatus' },
	{ label: 'Method', accessor: 'paymentMethod' },
	{ label: 'Amount', accessor: 'totalAmount', className: 'text-right' }
];
