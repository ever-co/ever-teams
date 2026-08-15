import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTimeSelect } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsTimeSelect> = {
	title: 'Utilities/Date Time/TeamsTimeSelect',
	component: TeamsTimeSelect,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A time selection dropdown atom that generates options based on min, max, and step props. Internally uses the Select component for a consistent UI.'
			}
		}
	},
	argTypes: {
		min: { control: 'text', description: 'Minimum time (HH:mm)' },
		max: { control: 'text', description: 'Maximum time (HH:mm)' },
		step: { control: 'number', description: 'Step interval in seconds' },
		size: { control: 'select', options: ['default', 'sm', 'lg', null] },
		disabled: { control: 'boolean' }
	}
} satisfies Meta<typeof TeamsTimeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		value: '12:00',
		min: '00:00',
		max: '23:55',
		step: 1800 // 30 mins
	}
};

export const HighGranularity: Story = {
	args: {
		value: '09:00',
		min: '08:00',
		max: '10:00',
		step: 300 // 5 mins
	}
};

export const Disabled: Story = {
	args: {
		value: '14:30',
		disabled: true
	}
};
