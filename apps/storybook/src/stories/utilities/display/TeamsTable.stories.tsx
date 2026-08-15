import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsTable, fakedataTable } from '@ever-teams/atoms';

const meta = {
	title: 'Utilities/Display/Table',
	component: TeamsTable,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A flexible table component with customizable headers, cells, and footer. Supports custom rendering functions and styling.'
			}
		}
	},
	argTypes: {
		data: {
			control: 'object',
			description: 'Array of data objects to display in the table'
		},
		caption: {
			control: 'text',
			description: 'Table caption displayed at the top'
		},
		footerData: {
			control: 'object',
			description: 'Footer data with label and value'
		},
		tableClassName: {
			control: 'text',
			description: 'CSS classes for the table element'
		},
		headerClassName: {
			control: 'text',
			description: 'CSS classes for table headers'
		},
		rowClassName: {
			control: 'text',
			description: 'CSS classes for table rows'
		},
		cellClassName: {
			control: 'text',
			description: 'CSS classes for table cells'
		}
	}
} satisfies Meta<typeof TeamsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		data: fakedataTable.slice(0, 3)
	}
};

export const WithCaption: Story = {
	args: {
		data: fakedataTable.slice(0, 4),
		caption: 'Invoice Summary Report'
	}
};

export const WithFooter: Story = {
	args: {
		data: fakedataTable.slice(0, 5),
		caption: 'Monthly Invoices',
		footerData: {
			label: 'Total Amount',
			value: '$1,750.00'
		}
	}
};

export const CustomHeaders: Story = {
	args: {
		data: fakedataTable.slice(0, 3),
		renderHeader: (column: string) => {
			const headerMap: Record<string, string> = {
				invoice: '📄 Invoice ID',
				paymentStatus: '💳 Payment Status',
				totalAmount: '💰 Total Amount',
				paymentMethod: '🏦 Payment Method'
			};
			return headerMap[column] || column;
		}
	}
};

export const CustomCells: Story = {
	args: {
		data: fakedataTable.slice(0, 4),
		renderCell: (row: any, column: string) => {
			if (column === 'paymentStatus') {
				const statusColors = {
					Paid: 'bg-green-100 text-green-800',
					Pending: 'bg-yellow-100 text-yellow-800',
					Unpaid: 'bg-red-100 text-red-800'
				};
				const colorClass = statusColors[row[column] as keyof typeof statusColors] || '';
				return (
					<span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{row[column]}</span>
				);
			}
			if (column === 'totalAmount') {
				return <span className="font-mono font-semibold">{row[column]}</span>;
			}
			return row[column];
		}
	}
};

export const TimeTrackingData: Story = {
	args: {
		data: [
			{ project: 'Website Redesign', task: 'UI Design', hours: '4.5', status: 'In Progress' },
			{ project: 'Mobile App', task: 'Backend API', hours: '6.2', status: 'Completed' },
			{ project: 'Dashboard', task: 'Data Visualization', hours: '3.8', status: 'In Progress' },
			{ project: 'E-commerce', task: 'Payment Integration', hours: '5.1', status: 'Completed' }
		],
		caption: 'Weekly Time Tracking Report',
		footerData: {
			label: 'Total Hours Worked',
			value: '19.6 hours'
		},
		renderHeader: (column: string) => {
			const headers = {
				project: 'Project',
				task: 'Task',
				hours: 'Hours',
				status: 'Status'
			};
			return headers[column as keyof typeof headers] || column;
		},
		renderCell: (row: any, column: string) => {
			if (column === 'status') {
				const isCompleted = row[column] === 'Completed';
				return (
					<span
						className={`px-2 py-1 rounded-full text-xs font-medium ${
							isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
						}`}
					>
						{row[column]}
					</span>
				);
			}
			if (column === 'hours') {
				return <span className="font-mono">{row[column]}h</span>;
			}
			return row[column];
		}
	}
};

export const EmptyTable: Story = {
	args: {
		data: [],
		caption: 'No Data Available'
	}
};

export const SingleRow: Story = {
	args: {
		data: [fakedataTable[0]],
		caption: 'Single Invoice Record'
	}
};

export const CustomStyling: Story = {
	args: {
		data: fakedataTable.slice(0, 3),
		tableClassName: 'border-blue-200 bg-blue-50',
		headerClassName: 'text-blue-900 font-bold',
		rowClassName: 'hover:bg-blue-100',
		cellClassName: 'text-blue-800'
	}
};
