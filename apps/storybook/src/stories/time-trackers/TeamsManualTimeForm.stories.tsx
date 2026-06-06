import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsManualTimeForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsManualTimeForm> = {
	title: 'Time Trackers/TeamsManualTimeForm',
	component: TeamsManualTimeForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A manual time entry form that allows users to select a date, start time, and end time. Includes validation for ensuring end time is after start time and restricts selections based on current time for "Today".'
			}
		}
	},
	argTypes: {
		className: { control: 'text' }
	}
} satisfies Meta<typeof TeamsManualTimeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		className: 'w-[400px]'
	}
};

export const InDarkContainer: Story = {
	render: (args) => (
		<div className="p-8 bg-gray-900 rounded-xl">
			<TeamsManualTimeForm {...args} />
		</div>
	),
	args: {
		className: 'w-[400px]'
	}
};
