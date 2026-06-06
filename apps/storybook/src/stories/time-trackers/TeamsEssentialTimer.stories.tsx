import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { TeamsEssentialTimer } from '@ever-teams/atoms';

const meta = {
	title: 'Time Trackers/Teams Essential Timer',
	component: TeamsEssentialTimer,
	parameters: {
		layout: 'centered'
	},

	args: { onClick: fn() }
} satisfies Meta<typeof TeamsEssentialTimer>;

export default meta;

export const Default: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true
	}
};

export const Border: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		border: 'thick'
	}
};

export const BorderRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const BorderFullRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const Gray: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		background: 'secondary'
	}
};

export const GrayRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const GrayFullRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const Contained: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const ContainedRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const ContainedFullRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large'
	}
};

export const Icon: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true
	}
};

export const IconBorder: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick'
	}
};

export const IconBorderRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const IconBorderFullRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const IconGray: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary'
	}
};

export const IconGrayRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const IconGrayFullRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const IconContained: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const IconContainedRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const IconContainedFullRounded: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large'
	}
};

export const IconProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		progress: true
	}
};

export const IconBorderProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true
	}
};

export const IconBorderRoundedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true,
		rounded: 'small'
	}
};

export const IconBorderFullRoundedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		border: 'thick',
		progress: true,
		rounded: 'large'
	}
};

export const IconGrayProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true
	}
};

export const IconGrayRoundedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true,
		rounded: 'small'
	}
};

export const IconGrayFullRoundedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'secondary',
		progress: true,
		rounded: 'large'
	}
};

export const IconContainedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true
	}
};

export const IconContainedRoundedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true,
		rounded: 'small'
	}
};

export const IconContainedFullRoundedProgress: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		readonly: true,
		icon: true,
		background: 'primary',
		color: 'destructive',
		progress: true,
		rounded: 'large'
	}
};

export const IconProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true
	}
};

export const IconBorderProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		border: 'thick'
	}
};

export const IconBorderRoundedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		border: 'thick',
		rounded: 'small'
	}
};

export const IconBorderFullRoundedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		border: 'thick',
		rounded: 'large'
	}
};

export const IconGrayProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary'
	}
};

export const IconGrayRoundedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary',
		rounded: 'small'
	}
};

export const IconGrayFullRoundedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		background: 'secondary',
		rounded: 'large'
	}
};

export const IconContainedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'destructive'
	}
};

export const IconContainedRoundedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		progress: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'small'
	}
};

export const IconContainedFullRoundedProgressButton: StoryObj<typeof TeamsEssentialTimer> = {
	args: {
		icon: true,
		// progress: true,
		background: 'primary',
		color: 'destructive',
		rounded: 'large',
		border: 'thick'
	}
};
