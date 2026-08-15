import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsFontToggle } from '@ever-teams/atoms';

const meta = {
	title: 'Utilities/Settings/Font Toggle',
	component: TeamsFontToggle,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A font selector component that allows users to switch between different font families for the time tracking interface. Integrates with the Teams font system and provides various typography options.'
			}
		}
	}
} satisfies Meta<typeof TeamsFontToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {}
};

export const InToolbar: Story = {
	render: () => (
		<div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
			<h3 className="font-semibold text-gray-900 dark:text-white">Typography</h3>
			<TeamsFontToggle />
			<button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Apply</button>
		</div>
	)
};

export const InSidebar: Story = {
	render: () => (
		<div className="w-64 p-4 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 space-y-4">
			<h3 className="font-semibold text-gray-900 dark:text-white">Typography Settings</h3>
			<div className="space-y-3">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Family</label>
					<TeamsFontToggle />
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Size</label>
					<select className="w-full p-2 border border-gray-300 rounded-md text-sm">
						<option>Small</option>
						<option>Medium</option>
						<option>Large</option>
					</select>
				</div>
			</div>
		</div>
	)
};

export const WithPreview: Story = {
	render: () => (
		<div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
			<h3 className="font-semibold text-gray-900 dark:text-white">Font Customization</h3>
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Font</label>
					<TeamsFontToggle />
				</div>
				<div className="p-4 border border-gray-200 dark:border-gray-600 rounded-md">
					<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
					<div className="space-y-2">
						<p className="text-lg">Timer Display: 02:45:30</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							This font will be applied to timers and time displays
						</p>
					</div>
				</div>
			</div>
		</div>
	)
};

export const SettingsPanel: Story = {
	render: () => (
		<div className="max-w-md p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
			<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Display Preferences</h2>
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timer Font</label>
					<TeamsFontToggle />
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Choose a font for timer displays and time-related text
					</p>
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
					<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border">
						<div className="text-2xl font-mono">08:45:23</div>
						<div className="text-sm text-gray-600 dark:text-gray-400">Working on Project Alpha</div>
					</div>
				</div>
				<div className="pt-4 border-t border-gray-200 dark:border-gray-600">
					<button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
						Save Preferences
					</button>
				</div>
			</div>
		</div>
	)
};

export const AccessibilityExample: Story = {
	render: () => (
		<div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
			<h3 className="font-semibold text-gray-900 dark:text-white">Accessibility Options</h3>
			<div className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Family</label>
					<TeamsFontToggle />
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Some fonts may be easier to read for users with dyslexia or visual impairments
					</p>
				</div>
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div className="space-y-1">
						<p className="font-medium">Recommended for readability:</p>
						<ul className="text-gray-600 dark:text-gray-400 space-y-1">
							<li>• Inter</li>
							<li>• Open Sans</li>
							<li>• Roboto</li>
						</ul>
					</div>
					<div className="space-y-1">
						<p className="font-medium">Monospace for timers:</p>
						<ul className="text-gray-600 dark:text-gray-400 space-y-1">
							<li>• Source Code Pro</li>
							<li>• Digital-7</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	)
};

export const CompactLayout: Story = {
	render: () => (
		<div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
			<span className="text-sm text-gray-600 dark:text-gray-400">Font:</span>
			<TeamsFontToggle />
		</div>
	)
};
