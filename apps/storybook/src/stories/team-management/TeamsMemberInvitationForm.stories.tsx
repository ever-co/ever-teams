import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsMemberInvitationForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsMemberInvitationForm> = {
	title: 'Team Management/Member Invitation Form',
	component: TeamsMemberInvitationForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive form component for inviting team members to join an organization. Includes email and name input fields with validation, team context integration, and loading states. Requires authenticated user and selected team context to function properly.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		}
	}
} satisfies Meta<typeof TeamsMemberInvitationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default member invitation form with standard styling and functionality.
 * Shows email and name input fields with send invitation button.
 */
export const Default: Story = {
	args: {}
};

/**
 * Member invitation form displayed within a modal context.
 * Demonstrates how the form appears in dialog overlays.
 */
export const InModal: Story = {
	render: () => (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite Team Member</h2>
				</div>
				<div className="p-6">
					<TeamsMemberInvitationForm className="border-0 bg-transparent p-0 shadow-none" />
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Member invitation form optimized for modal display with transparent background and removed borders.'
			}
		}
	}
};

/**
 * Member invitation form with custom styling applied via className prop.
 * Demonstrates visual customization capabilities.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with custom blue-themed styling applied through the className prop.'
			}
		}
	}
};
