import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TeamsBasicTimer } from '@ever-teams/atoms';

const meta = {
	title: 'Time Trackers/Teams Basic Timer',
	component: TeamsBasicTimer,
	parameters: {
		layout: 'centered'
	},
	// tags: ['autodocs'],
	// Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
	args: { onClick: fn() }
} satisfies Meta<typeof TeamsBasicTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		readonly: true
	}
};

export const Border: Story = {
	args: {
		readonly: true,
		border: 'thick'
	}
};

export const BorderRounded: StoryObj = {
	args: {
		readonly: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const BorderFullRounded: StoryObj = {
	args: {
		readonly: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const Gray: StoryObj = {
	args: {
		readonly: true,
		background: 'secondary'
	}
};

export const GrayRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const GrayFullRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const Contained: StoryObj = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const ContainedRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const ContainedFullRounded: StoryObj = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large'
	}
};

export const Icon: StoryObj = {
	args: {
		readonly: true,
		icon: true
	}
};

export const IconBorder: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick'
	}
};

export const IconBorderRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const IconBorderFullRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const IconGray: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary'
	}
};

export const IconGrayRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const IconGrayFullRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const IconContained: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const IconContainedRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const IconContainedFullRounded: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large'
	}
};

export const IconProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		progress: true
	}
};

export const IconBorderProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true
	}
};

export const IconBorderRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true,
		rounded: 'small'
	}
};

export const IconBorderFullRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true,
		rounded: 'large'
	}
};

export const IconGrayProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true
	}
};

export const IconGrayRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true,
		rounded: 'small'
	}
};

export const IconGrayFullRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true,
		rounded: 'large'
	}
};

export const IconContainedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true
	}
};

export const IconContainedRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true,
		rounded: 'small'
	}
};

export const IconContainedFullRoundedProgress: StoryObj = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true,
		rounded: 'large'
	}
};

export const IconProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true
	}
};

export const IconBorderProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		border: 'thick'
	}
};

export const IconBorderRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const IconBorderFullRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const IconGrayProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary'
	}
};

export const IconGrayRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const IconGrayFullRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const IconContainedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const IconContainedRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const IconContainedFullRoundedProgressButton: StoryObj = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'secondary',
		rounded: 'large',
		border: 'thick'
	}
};
