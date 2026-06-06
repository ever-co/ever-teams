import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TeamsButton } from '@ever-teams/atoms';

const meta = {
	title: 'Utilities/Buttons/Teams Button',
	component: TeamsButton,
	parameters: {
		layout: 'centered'
	},

	// Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
	args: {
		onClick: fn(),
		isRunning: false,
		timerLoading: false,
		startTimer: () => Promise.resolve(),
		stopTimer: () => Promise.resolve()
	}
} satisfies Meta<typeof TeamsButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SmallTeamsButton: Story = {
	args: {
		variant: 'default',
		size: 'sm'
	}
};

export const SmallStopButton: Story = {
	args: {
		variant: 'default',
		size: 'sm'
	}
};

export const SmallPauseButton: Story = {
	args: {
		variant: 'default',
		size: 'sm'
	}
};

export const DefaultTeamsButton: Story = {
	args: {
		variant: 'default',
		size: 'default'
	}
};

export const StopButton: Story = {
	args: {
		variant: 'default',
		size: 'default'
	}
};

export const PauseButton: Story = {
	args: {
		variant: 'default',
		size: 'default'
	}
};

export const LargeTeamsButton: Story = {
	args: {
		variant: 'default',
		size: 'lg'
	}
};

export const LargeStopButton: Story = {
	args: {
		variant: 'default',
		size: 'lg'
	}
};

export const LargePauseButton: Story = {
	args: {
		variant: 'default',
		size: 'lg'
	}
};

export const SmallBorderedPauseButton: Story = {
	args: {
		variant: 'bordered',
		size: 'sm'
	}
};

export const DefaultBorderedPauseButton: Story = {
	args: {
		variant: 'bordered',
		size: 'default'
	}
};

export const LargeBorderedPauseButton: Story = {
	args: {
		variant: 'bordered',
		size: 'lg'
	}
};
