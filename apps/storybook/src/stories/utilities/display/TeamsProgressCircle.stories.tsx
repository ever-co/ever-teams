import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsProgressCircle } from '@ever-teams/atoms';
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
	title: 'Utilities/Display/Progress Circle',
	component: TeamsProgressCircle,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					"A circular progress indicator that displays progress percentage towards an 8-hour daily goal. Shows percentage value (e.g., '75%' for 6 hours worked). The component size is automatically calculated from radius and strokeWidth."
			}
		}
	},
	argTypes: {
		todayTrackedTime: {
			control: 'object',
			description:
				'TimeValues object containing tracked time. Used to calculate progress percentage (based on 8-hour daily goal).'
		},
		radius: {
			control: { type: 'range', min: 20, max: 100, step: 5 },
			description: 'Radius of the progress circle. Component size = (radius + strokeWidth) * 2'
		},
		strokeWidth: {
			control: { type: 'range', min: 2, max: 20, step: 1 },
			description: 'Width of the progress stroke'
		},
		duration: {
			control: { type: 'range', min: 100, max: 2000, step: 100 },
			description: 'Animation duration in milliseconds'
		}
	}
} satisfies Meta<typeof TeamsProgressCircle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {}
};

export const ThreeHoursWorked: Story = {
	args: {
		todayTrackedTime: createTimeValues(3, 0)
	}
};

export const SixHoursWorked: Story = {
	args: {
		todayTrackedTime: createTimeValues(6, 0)
	}
};

export const SmallCircle: Story = {
	args: {
		radius: 25,
		strokeWidth: 6,
		todayTrackedTime: createTimeValues(4, 30)
	}
};

export const LargeCircle: Story = {
	args: {
		radius: 55,
		strokeWidth: 12,
		todayTrackedTime: createTimeValues(5, 15)
	}
};

export const ThinStroke: Story = {
	args: {
		strokeWidth: 4,
		todayTrackedTime: createTimeValues(4, 48)
	}
};

export const ThickStroke: Story = {
	args: {
		strokeWidth: 16,
		todayTrackedTime: createTimeValues(6, 24)
	}
};

export const FastAnimation: Story = {
	args: {
		duration: 200,
		todayTrackedTime: createTimeValues(7, 12)
	}
};

export const SlowAnimation: Story = {
	args: {
		duration: 1500,
		todayTrackedTime: createTimeValues(3, 36)
	}
};

export const ProgressStates: Story = {
	render: () => (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
			<div className="text-center space-y-2">
				<TeamsProgressCircle todayTrackedTime={createTimeValues(0, 0)} />
				<p className="text-sm text-gray-600">0% (0h)</p>
			</div>
			<div className="text-center space-y-2">
				<TeamsProgressCircle todayTrackedTime={createTimeValues(2, 0)} />
				<p className="text-sm text-gray-600">25% (2h)</p>
			</div>
			<div className="text-center space-y-2">
				<TeamsProgressCircle todayTrackedTime={createTimeValues(4, 0)} />
				<p className="text-sm text-gray-600">50% (4h)</p>
			</div>
			<div className="text-center space-y-2">
				<TeamsProgressCircle todayTrackedTime={createTimeValues(8, 0)} />
				<p className="text-sm text-gray-600">100% (8h)</p>
			</div>
		</div>
	)
};
