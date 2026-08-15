import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsTeamCreationForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsTeamCreationForm> = {
	title: 'Team Management/Team Creation Form',
	component: TeamsTeamCreationForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive form component for creating new teams within an organization. Features team name and description input fields with validation, organization context integration, and loading states. Includes tooltip guidance for authentication requirements and comprehensive error handling.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		}
	}
} satisfies Meta<typeof TeamsTeamCreationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default team creation form with standard styling and functionality.
 * Shows team name input, description textarea, and create button.
 */
export const Default: Story = {
	args: {}
};

/**
 * Team creation form displayed within a modal context.
 * Demonstrates how the form appears in dialog overlays.
 */
export const InModal: Story = {
	render: () => (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Team</h2>
				</div>
				<div className="p-6">
					<TeamsTeamCreationForm className="border-0 bg-transparent p-0 shadow-none" />
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Team creation form optimized for modal display with transparent background and removed borders.'
			}
		}
	}
};

/**
 * Team creation form with custom styling applied via className prop.
 * Demonstrates visual customization capabilities.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with custom indigo-themed styling applied through the className prop.'
			}
		}
	}
};

/**
 * Team creation form in an onboarding flow context.
 * Shows how the form appears during initial team setup.
 */
export const OnboardingFlow: Story = {
	render: () => (
		<div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-2xl">
				<div className="text-center mb-8">
					<div className="flex justify-center mb-4">
						<div className="flex space-x-2">
							<div className="w-3 h-3 bg-blue-600 rounded-full"></div>
							<div className="w-3 h-3 bg-blue-600 rounded-full"></div>
							<div className="w-3 h-3 bg-blue-600 rounded-full"></div>
							<div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
						</div>
					</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Your First Team</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Set up your team to start collaborating and tracking time together
					</p>
				</div>
				<TeamsTeamCreationForm />
				<div className="flex justify-between mt-8">
					<button className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
						Skip for now
					</button>
					<button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
						Continue
					</button>
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Team creation form within an onboarding flow, showing step progress and contextual guidance.'
			}
		}
	}
};
