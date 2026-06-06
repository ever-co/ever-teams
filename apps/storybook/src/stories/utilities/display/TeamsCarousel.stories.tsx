import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { CarouselSpacing } from '@ever-teams/atoms';

const meta = {
	title: 'Utilities/Display/Carousel',
	component: CarouselSpacing,
	parameters: {
		layout: 'centered'
	},
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
			description: 'The orientation of the carousel'
		},
		itemWidth: {
			control: 'text',
			description: 'CSS class for item width (e.g., "basis-1/2", "basis-1/3")'
		},
		items: {
			control: 'object',
			description: 'Array of items to display in the carousel'
		}
	}
} satisfies Meta<typeof CarouselSpacing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		items: ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'],
		orientation: 'horizontal',
		itemWidth: 'basis-1/2'
	}
};

export const WithNumbers: Story = {
	args: {
		items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		orientation: 'horizontal',
		itemWidth: 'basis-1/3'
	}
};

export const Vertical: Story = {
	args: {
		items: ['Vertical 1', 'Vertical 2', 'Vertical 3', 'Vertical 4'],
		orientation: 'vertical',
		itemWidth: 'basis-1/2'
	}
};

export const CustomItemWidth: Story = {
	args: {
		items: ['Wide 1', 'Wide 2', 'Wide 3'],
		orientation: 'horizontal',
		itemWidth: 'basis-2/3'
	}
};

export const ManyItems: Story = {
	args: {
		items: Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`),
		orientation: 'horizontal',
		itemWidth: 'basis-1/4'
	}
};

export const WithCustomRender: Story = {
	args: {
		items: ['Task 1: completed', 'Task 2: pending', 'Task 3: in-progress', 'Task 4: completed'],
		orientation: 'horizontal',
		itemWidth: 'basis-1/2',
		renderItem: (item: any) => {
			const [title, status] = item.split(': ');
			return (
				<div className="text-center">
					<div className="font-semibold">{title}</div>
					<div
						className={`text-sm ${
							status === 'completed'
								? 'text-green-600'
								: status === 'pending'
									? 'text-yellow-600'
									: 'text-blue-600'
						}`}
					>
						{status}
					</div>
				</div>
			);
		}
	}
};

export const TimerCards: Story = {
	args: {
		items: ['02:30:45|Project A', '01:15:20|Project B', '03:45:10|Project C', '00:45:30|Project D'],
		orientation: 'horizontal',
		itemWidth: 'basis-1/2',
		renderItem: (item: any) => {
			const [time, project] = item.split('|');
			return (
				<div className="text-center space-y-2">
					<div className="text-2xl font-mono font-bold text-blue-600">{time}</div>
					<div className="text-sm text-gray-600">{project}</div>
				</div>
			);
		}
	}
};

export const SmallItems: Story = {
	args: {
		items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
		orientation: 'horizontal',
		itemWidth: 'basis-1/6'
	}
};
