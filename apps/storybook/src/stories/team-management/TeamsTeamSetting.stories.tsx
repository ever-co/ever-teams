import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsTeamSetting } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsTeamSetting> = {
	title: 'Team Management/Team Setting',
	component: TeamsTeamSetting,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive team settings form component for configuring team properties. Features team avatar upload with preview, color picker for branding, team size selection, and public/private visibility settings. Includes loading overlays during submission and comprehensive form validation.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		}
	}
} satisfies Meta<typeof TeamsTeamSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default team settings form with standard styling and functionality.
 * Shows all team configuration options including avatar, name, color, size, and visibility.
 */
export const Default: Story = {
	args: {}
};

/**
 * Team settings form displayed within a modal context.
 * Demonstrates how the form appears in dialog overlays.
 */
export const InModal: Story = {
	render: () => (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team Settings</h2>
				</div>
				<div className="p-6">
					<TeamsTeamSetting className="border-0 bg-transparent p-0 shadow-none" />
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Team settings form optimized for modal display with transparent background and removed borders.'
			}
		}
	}
};

/**
 * Team settings form with custom styling applied via className prop.
 * Demonstrates visual customization capabilities.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with custom orange-themed styling applied through the className prop.'
			}
		}
	}
};

/**
 * Team settings form in a settings page layout.
 * Shows how the form appears within a comprehensive settings interface.
 */
export const InSettingsPage: Story = {
	render: () => (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
					<div className="border-b border-gray-200 dark:border-gray-700 p-6">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-1">
							Configure your team settings and preferences
						</p>
					</div>
					<div className="p-6">
						<TeamsTeamSetting />
					</div>
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Team settings form within a comprehensive settings page layout with header and description.'
			}
		}
	}
};
