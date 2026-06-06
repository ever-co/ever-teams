import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TeamsExtraTimer } from '@ever-teams/atoms';

const meta = {
	title: 'Time Trackers/Teams Extra Timer',
	component: TeamsExtraTimer,
	parameters: {
		layout: 'centered'
	},

	args: { onClick: fn() }
} satisfies Meta<typeof TeamsExtraTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultBasicTimer: Story = {
	args: {
		readonly: true
	}
};

export const BasicTimerBorder: Story = {
	args: {
		readonly: true,
		border: 'thick'
	}
};

export const BasicTimerBorderRounded: StoryObj = {
	args: {
		readonly: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const BasicTimerBorderFullRounded: StoryObj = {
	args: {
		readonly: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const BasicTimerGray: StoryObj = {
	args: {
		readonly: true,
		background: 'secondary'
	}
};

export const BasicTimerGrayRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const BasicTimerGrayFullRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const BasicTimerContained: StoryObj = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const BasicTimerContainedRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const BasicTimerContainedFullRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large'
	}
};

export const BasicTimerIcon: StoryObj = {
	args: {
		readonly: true,
		icon: true
	}
};

export const BasicTimerIconBorder: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick'
	}
};

export const BasicTimerIconBorderRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const BasicTimerIconBorderFullRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const BasicTimerIconGray: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary'
	}
};

export const BasicTimerIconGrayRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const BasicTimerIconGrayFullRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const BasicTimerIconContained: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const BasicTimerIconContainedRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const BasicTimerIconContainedFullRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large'
	}
};

export const BasicTimerIconProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		progress: true
	}
};

export const BasicTimerIconBorderProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true
	}
};

export const BasicTimerIconBorderRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true,
		rounded: 'small'
	}
};

export const BasicTimerIconBorderFullRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true,
		rounded: 'large'
	}
};

export const BasicTimerIconGrayProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true
	}
};

export const BasicTimerIconGrayRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true,
		rounded: 'small'
	}
};

export const BasicTimerIconGrayFullRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true,
		rounded: 'large'
	}
};

export const BasicTimerIconContainedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true
	}
};

export const BasicTimerIconContainedRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true,
		rounded: 'small'
	}
};

export const BasicTimerIconContainedFullRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true,
		rounded: 'large'
	}
};

export const BasicTimerIconProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true
	}
};

export const BasicTimerIconBorderProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		border: 'thick'
	}
};

export const BasicTimerIconBorderRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const BasicTimerIconBorderFullRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const BasicTimerIconGrayProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary'
	}
};

export const BasicTimerIconGrayRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const BasicTimerIconGrayFullRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const BasicTimerIconContainedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const BasicTimerIconContainedRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const BasicTimerIconContainedFullRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		// progress: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large',
		border: 'thick'
	}
};
