import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsAccountDeletionForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsAccountDeletionForm> = {
	title: 'User Account Management/Account Deletion Form',
	component: TeamsAccountDeletionForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A critical account deletion form component with password confirmation and double-confirmation dialog. Features destructive action styling with red theming, loading states, error handling, and AlertDialog confirmation to prevent accidental deletions. Requires authenticated user context to function properly.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		}
	}
} satisfies Meta<typeof TeamsAccountDeletionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default account deletion form with standard destructive styling.
 * Shows password confirmation field and delete button with confirmation dialog.
 */
export const Default: Story = {
	args: {}
};

/**
 * Account deletion form displayed within a modal context.
 * Demonstrates how the form appears in dialog overlays.
 */
export const InModal: Story = {
	render: () => (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
				<div className="p-6">
					<TeamsAccountDeletionForm className="border-0 bg-transparent p-0 shadow-none" />
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Account deletion form optimized for modal display with transparent background and removed borders.'
			}
		}
	}
};

/**
 * Account deletion form with custom styling applied via className prop.
 * Demonstrates visual customization while maintaining destructive action context.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with enhanced red-themed styling to emphasize the destructive nature of the action.'
			}
		}
	}
};
