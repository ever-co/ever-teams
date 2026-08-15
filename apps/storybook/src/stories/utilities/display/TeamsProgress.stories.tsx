import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsProgress } from '@ever-teams/atoms';
import { TimeValues } from '@ever-teams/toolkit-types';

// Helper to create TimeValues from hours worked
const createTimeValues = (hours: number, minutes: number = 0): TimeValues => ({
	days: 0,
	hours,
	minutes,
	seconds: 0,
	milliseconds: 0,
	totalSeconds: hours * 3600 + minutes * 60
});

const meta = {
	title: 'Utilities/Display/Progress',
	component: TeamsProgress,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A progress bar component that calculates progress based on todayTrackedTime prop. Shows progress towards an 8-hour daily goal as a percentage.'
			}
		}
	},
	argTypes: {
		todayTrackedTime: {
			control: 'object',
			description:
				'TimeValues object containing tracked time. Used to calculate progress percentage (based on 8-hour daily goal).'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the progress bar'
		}
	}
} satisfies Meta<typeof TeamsProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		className: 'w-64',
		todayTrackedTime: createTimeValues(4, 0)
	}
};

export const NoProgress: Story = {
	args: {
		className: 'w-64',
		todayTrackedTime: createTimeValues(0, 0)
	}
};

export const QuarterProgress: Story = {
	args: {
		className: 'w-64',
		todayTrackedTime: createTimeValues(2, 0)
	}
};

export const HalfProgress: Story = {
	args: {
		className: 'w-64',
		todayTrackedTime: createTimeValues(4, 0)
	}
};

export const ThreeQuarterProgress: Story = {
	args: {
		className: 'w-64',
		todayTrackedTime: createTimeValues(6, 0)
	}
};

export const FullProgress: Story = {
	args: {
		className: 'w-64',
		todayTrackedTime: createTimeValues(8, 0)
	}
};

export const Small: Story = {
	args: {
		className: 'w-32 h-2',
		todayTrackedTime: createTimeValues(3, 0)
	}
};

export const Large: Story = {
	args: {
		className: 'w-96 h-4',
		todayTrackedTime: createTimeValues(6, 0)
	}
};

export const WithLabel: Story = {
	render: (args) => (
		<div className="space-y-2">
			<div className="flex justify-between text-sm text-gray-600">
				<span>Daily Progress</span>
				<span>4 hours worked (50%)</span>
			</div>
			<TeamsProgress {...args} />
		</div>
	),
	args: {
		className: 'w-80',
		todayTrackedTime: createTimeValues(4, 0)
	}
};

export const ProgressCard: Story = {
	render: (args) => (
		<div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm space-y-3">
			<h3 className="font-semibold text-gray-900 dark:text-white">Today's Work Progress</h3>
			<div className="space-y-2">
				<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
					<span>Progress towards 8-hour goal</span>
					<span>6h (75%)</span>
				</div>
				<TeamsProgress {...args} />
				<p className="text-xs text-gray-500 dark:text-gray-400">
					Progress is calculated based on todayTrackedTime (8 hours = 100%)
				</p>
			</div>
		</div>
	),
	args: {
		className: 'w-full',
		todayTrackedTime: createTimeValues(6, 0)
	}
};

export const ProgressStates: Story = {
	render: () => (
		<div className="space-y-4 w-80">
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<label className="font-medium">0%</label>
					<span className="text-gray-500">0 hours</span>
				</div>
				<TeamsProgress className="w-full" todayTrackedTime={createTimeValues(0, 0)} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<label className="font-medium">25%</label>
					<span className="text-gray-500">2 hours</span>
				</div>
				<TeamsProgress className="w-full" todayTrackedTime={createTimeValues(2, 0)} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<label className="font-medium">50%</label>
					<span className="text-gray-500">4 hours</span>
				</div>
				<TeamsProgress className="w-full" todayTrackedTime={createTimeValues(4, 0)} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<label className="font-medium">75%</label>
					<span className="text-gray-500">6 hours</span>
				</div>
				<TeamsProgress className="w-full" todayTrackedTime={createTimeValues(6, 0)} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-sm">
					<label className="font-medium">100%</label>
					<span className="text-gray-500">8 hours</span>
				</div>
				<TeamsProgress className="w-full" todayTrackedTime={createTimeValues(8, 0)} />
			</div>
		</div>
	)
};

export const DifferentSizes: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<label className="text-sm">Extra Small (h-1)</label>
				<TeamsProgress className="w-64 h-1" todayTrackedTime={createTimeValues(5, 0)} />
			</div>
			<div className="space-y-2">
				<label className="text-sm">Small (h-2)</label>
				<TeamsProgress className="w-64 h-2" todayTrackedTime={createTimeValues(5, 0)} />
			</div>
			<div className="space-y-2">
				<label className="text-sm">Default (h-3)</label>
				<TeamsProgress className="w-64" todayTrackedTime={createTimeValues(5, 0)} />
			</div>
			<div className="space-y-2">
				<label className="text-sm">Large (h-4)</label>
				<TeamsProgress className="w-64 h-4" todayTrackedTime={createTimeValues(5, 0)} />
			</div>
			<div className="space-y-2">
				<label className="text-sm">Extra Large (h-6)</label>
				<TeamsProgress className="w-64 h-6" todayTrackedTime={createTimeValues(5, 0)} />
			</div>
		</div>
	)
};
