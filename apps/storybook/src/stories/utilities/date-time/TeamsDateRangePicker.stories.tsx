import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React, { useState } from 'react';
import { TeamsDateRangePicker } from '@ever-teams/atoms';
import { DateRange } from 'react-day-picker';

const meta = {
	title: 'Utilities/Date & Time/Date Range Picker',
	component: TeamsDateRangePicker,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A date range picker component with dual calendar popup for selecting start and end dates. Integrated with Teams theming system and supports different sizes.'
			}
		}
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'icon'],
			description: 'Size variant of the date range picker'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		},
		date: {
			control: 'object',
			description: 'Selected date range with from and to dates'
		}
	}
} satisfies Meta<typeof TeamsDateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		size: 'default'
	}
};

export const Small: Story = {
	args: {
		size: 'sm'
	}
};

export const Large: Story = {
	args: {
		size: 'lg'
	}
};

export const IconSize: Story = {
	args: {
		size: 'icon'
	}
};

export const WithPreselectedRange: Story = {
	args: {
		size: 'default',
		date: {
			from: new Date(2024, 0, 1),
			to: new Date(2024, 0, 7)
		}
	}
};

export const CustomStyling: Story = {
	args: {
		size: 'default',
		className: 'border-blue-300 bg-blue-50'
	}
};

export const Interactive: Story = {
	render: () => {
		const [dateRange, setDateRange] = useState<DateRange | undefined>();

		return (
			<div className="space-y-4">
				<TeamsDateRangePicker size="default" date={dateRange} setDate={setDateRange} />
				{dateRange?.from && dateRange?.to && (
					<div className="text-sm text-gray-600 space-y-1">
						<p>From: {dateRange.from.toLocaleDateString()}</p>
						<p>To: {dateRange.to.toLocaleDateString()}</p>
						<p>
							Duration:{' '}
							{Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))}{' '}
							days
						</p>
					</div>
				)}
			</div>
		);
	}
};

export const ReportingForm: Story = {
	render: () => (
		<div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
			<h3 className="font-semibold text-gray-900 dark:text-white">Time Tracking Report</h3>
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Report Period</label>
					<TeamsDateRangePicker size="default" />
				</div>
				<div className="flex gap-2">
					<button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
						Generate Report
					</button>
					<button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">
						Clear Dates
					</button>
				</div>
			</div>
		</div>
	)
};

export const SizeComparison: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="space-y-2">
				<label className="text-sm font-medium">Small Size</label>
				<TeamsDateRangePicker size="sm" />
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Default Size</label>
				<TeamsDateRangePicker size="default" />
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Large Size</label>
				<TeamsDateRangePicker size="lg" />
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Icon Size</label>
				<TeamsDateRangePicker size="icon" />
			</div>
		</div>
	)
};

export const ProjectTimeframe: Story = {
	render: () => (
		<div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
			<h3 className="font-semibold text-gray-900 dark:text-white">Project Timeframe</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Development Phase</label>
					<TeamsDateRangePicker size="default" />
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Testing Phase</label>
					<TeamsDateRangePicker size="default" />
				</div>
			</div>
		</div>
	)
};
