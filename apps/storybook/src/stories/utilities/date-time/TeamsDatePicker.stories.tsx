import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React, { useState } from 'react';
import { TeamsDatePicker } from '@ever-teams/atoms';

const meta = {
	title: 'Utilities/Date & Time/Date Picker',
	component: TeamsDatePicker,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A date picker component with calendar popup, integrated with Teams theming system. Supports custom placeholder text and optional calendar icon.'
			}
		}
	},
	argTypes: {
		placeholder: {
			control: 'text',
			description: 'Placeholder text when no date is selected'
		},
		icon: {
			control: 'boolean',
			description: 'Whether to show the calendar icon'
		},
		date: {
			control: 'date',
			description: 'Currently selected date'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	}
} satisfies Meta<typeof TeamsDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'Pick a date',
		icon: true
	}
};

export const WithoutIcon: Story = {
	args: {
		placeholder: 'Select date',
		icon: false
	}
};

export const CustomPlaceholder: Story = {
	args: {
		placeholder: 'Choose your birthday',
		icon: true
	}
};

export const StartDate: Story = {
	args: {
		placeholder: 'Start date',
		icon: true
	}
};

export const EndDate: Story = {
	args: {
		placeholder: 'End date',
		icon: true
	}
};

export const DeadlineDate: Story = {
	args: {
		placeholder: 'Project deadline',
		icon: true
	}
};

export const CustomStyling: Story = {
	args: {
		placeholder: 'Custom styled picker',
		icon: true,
		className: 'w-[320px] border-blue-300'
	}
};

export const Interactive: Story = {
	render: () => {
		const [selectedDate, setSelectedDate] = useState<Date>();

		return (
			<div className="space-y-4">
				<TeamsDatePicker placeholder="Select a date" icon={true} date={selectedDate} setDate={setSelectedDate} />
				{selectedDate && <p className="text-sm text-gray-600">Selected: {selectedDate.toLocaleDateString()}</p>}
			</div>
		);
	}
};

export const FormExample: Story = {
	render: () => (
		<div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
			<h3 className="font-semibold text-gray-900 dark:text-white">Event Details</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
					<TeamsDatePicker placeholder="Event start date" icon={true} />
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
					<TeamsDatePicker placeholder="Event end date" icon={true} />
				</div>
			</div>
		</div>
	)
};

export const DifferentContexts: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="space-y-2">
				<h4 className="font-medium">Project Management</h4>
				<div className="flex gap-2">
					<TeamsDatePicker placeholder="Project start" icon={true} />
					<TeamsDatePicker placeholder="Deadline" icon={true} />
				</div>
			</div>
			<div className="space-y-2">
				<h4 className="font-medium">Time Tracking</h4>
				<div className="flex gap-2">
					<TeamsDatePicker placeholder="Report from" icon={true} />
					<TeamsDatePicker placeholder="Report to" icon={true} />
				</div>
			</div>
			<div className="space-y-2">
				<h4 className="font-medium">Personal</h4>
				<TeamsDatePicker placeholder="Birthday" icon={true} />
			</div>
		</div>
	)
};
