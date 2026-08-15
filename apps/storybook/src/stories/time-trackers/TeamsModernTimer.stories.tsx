import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsModernTimer } from '@ever-teams/atoms';

const meta = {
	title: 'Time Trackers/Teams Modern Timer',
	component: TeamsModernTimer,
	parameters: {
		layout: 'centered'
	}
} satisfies Meta<typeof TeamsModernTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
	args: {
		size: 'sm',
		separator: ':',
		expandable: true,
		showProgress: true
	}
};

export const SmallBordered: Story = {
	args: {
		size: 'sm',
		separator: ':',
		expandable: true,
		showProgress: true,
		variant: 'bordered'
	}
};

export const SmallCustomSeparator: Story = {
	args: {
		size: 'sm',
		separator: '-',
		expandable: true,
		showProgress: true
	}
};

export const SmallWithNoProgress: Story = {
	args: {
		size: 'sm',
		separator: ':',
		expandable: true,
		showProgress: false
	}
};

export const SmallNotExpandable: Story = {
	args: {
		size: 'sm',
		separator: ':',
		expandable: false,
		showProgress: true
	}
};

export const SmallNotExpandableBordered: Story = {
	args: {
		size: 'sm',
		separator: ':',
		expandable: false,
		showProgress: true,
		variant: 'bordered'
	}
};

export const Default: Story = {
	args: {
		separator: ':',
		showProgress: true,
		expandable: true
	}
};

export const DefaultNotExpandable: Story = {
	args: {
		separator: ':',
		showProgress: true,
		expandable: false
	}
};

export const DefaultBordered: Story = {
	args: {
		separator: ':',
		showProgress: true,
		expandable: true,
		variant: 'bordered'
	}
};

export const DefaultBorderedCustomTheme: Story = {
	args: {
		separator: ':',
		showProgress: true,
		expandable: true,
		variant: 'bordered'
	}
};

export const DefaultBorderedCustomTheme2: Story = {
	args: {
		separator: ':',
		showProgress: true,
		expandable: true,
		variant: 'bordered'
	}
};
