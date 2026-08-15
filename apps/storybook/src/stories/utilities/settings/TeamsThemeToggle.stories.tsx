import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsThemeToggle } from '@ever-teams/atoms';
import { ThemedButton } from '@ever-teams/toolkit-ui';

const meta = {
	title: 'Utilities/Settings/Theme Toggle',
	component: TeamsThemeToggle,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A theme selector component that allows users to switch between different Teams themes. Includes various color schemes and styling options for the time tracking interface.'
			}
		}
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg'],
			description: 'Size variant of the theme toggle'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	}
} satisfies Meta<typeof TeamsThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		size: 'default'
	}
};

export const Small: Story = {
	args: {
		size: 'sm'
	}
};

export const Large: Story = {
	args: {
		size: 'lg'
	}
};

export const CustomStyling: Story = {
	args: {
		size: 'default',
		className: 'border-2 border-blue-300 rounded-lg'
	}
};

export const InToolbar: Story = {
	render: () => (
		<div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
			<h3 className="font-semibold text-gray-900 dark:text-white">Settings</h3>
			<TeamsThemeToggle size="default" />
		</div>
	)
};

export const InSidebar: Story = {
	render: () => (
		<div className="w-64 p-4 bg-white rounded-lg dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-4">
			<h3 className="font-semibold text-gray-900 dark:text-white">Preferences</h3>
			<div className="space-y-3">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
					<TeamsThemeToggle className="w-[90%]" />
				</div>
			</div>
		</div>
	)
};

export const WithPreview: Story = {
	render: () => (
		<div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
			<h3 className="font-semibold text-gray-900 dark:text-white">Theme Customization</h3>
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Theme</label>
					<TeamsThemeToggle size="default" />
				</div>
				<div className="p-4 border border-gray-200 dark:border-gray-600 rounded-md">
					<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
					<div className="flex items-center gap-2">
						<ThemedButton className="w-8 h-8 rounded-full "></ThemedButton>
						<span className="text-sm text-gray-600 dark:text-gray-400">
							Theme colors will be applied to timers and charts
						</span>
					</div>
				</div>
			</div>
		</div>
	)
};

export const SizeComparison: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="space-y-2">
				<label className="text-sm font-medium">Small Size</label>
				<TeamsThemeToggle size="sm" />
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Default Size</label>
				<TeamsThemeToggle size="default" />
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Large Size</label>
				<TeamsThemeToggle size="lg" />
			</div>
		</div>
	)
};

export const SettingsPanel: Story = {
	render: () => (
		<div className="max-w-md p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
			<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance Settings</h2>
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Theme</label>
					<TeamsThemeToggle size="default" />
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Choose a color scheme for your time tracking interface
					</p>
				</div>
				<div className="pt-4 border-t border-gray-200 dark:border-gray-600">
					<ThemedButton className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
						Apply Changes
					</ThemedButton>
				</div>
			</div>
		</div>
	)
};
