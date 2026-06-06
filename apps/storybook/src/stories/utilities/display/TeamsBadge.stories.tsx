import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsBadge } from '@ever-teams/atoms';

const meta = {
	title: 'Utilities/Display/Badge',
	component: TeamsBadge,
	parameters: {
		layout: 'centered'
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'secondary', 'destructive', 'outline'],
			description: 'The visual style variant of the badge'
		},
		children: {
			control: 'text',
			description: 'The content to display inside the badge'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply'
		}
	}
} satisfies Meta<typeof TeamsBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: 'Badge',
		variant: 'default'
	}
};

export const Secondary: Story = {
	args: {
		children: 'Secondary',
		variant: 'secondary'
	}
};

export const Destructive: Story = {
	args: {
		children: 'Destructive',
		variant: 'destructive'
	}
};

export const Outline: Story = {
	args: {
		children: 'Outline',
		variant: 'outline'
	}
};

export const WithNumbers: Story = {
	args: {
		children: '42',
		variant: 'default'
	}
};

export const LongText: Story = {
	args: {
		children: 'Very Long Badge Text',
		variant: 'secondary'
	}
};

export const StatusBadges: Story = {
	render: () => (
		<div className="flex gap-2 flex-wrap">
			<TeamsBadge variant="default">Active</TeamsBadge>
			<TeamsBadge variant="secondary">Pending</TeamsBadge>
			<TeamsBadge variant="destructive">Error</TeamsBadge>
			<TeamsBadge variant="outline">Draft</TeamsBadge>
		</div>
	)
};

export const CounterBadges: Story = {
	render: () => (
		<div className="flex gap-2 flex-wrap">
			<TeamsBadge variant="default">1</TeamsBadge>
			<TeamsBadge variant="secondary">99+</TeamsBadge>
			<TeamsBadge variant="destructive">!</TeamsBadge>
			<TeamsBadge variant="outline">NEW</TeamsBadge>
		</div>
	)
};

export const CustomStyling: Story = {
	args: {
		children: 'Custom',
		variant: 'default',
		className: 'bg-blue-500 text-white border-blue-600'
	}
};

export const AllVariants: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-4">
			<div className="space-y-2">
				<h3 className="text-sm font-medium">Light Theme</h3>
				<div className="flex gap-2 flex-wrap">
					<TeamsBadge variant="default">Default</TeamsBadge>
					<TeamsBadge variant="secondary">Secondary</TeamsBadge>
					<TeamsBadge variant="destructive">Destructive</TeamsBadge>
					<TeamsBadge variant="outline">Outline</TeamsBadge>
				</div>
			</div>
		</div>
	)
};
