import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsMemberInvitationFormDialog } from '@ever-teams/atoms';
import { ThemedButton } from '@ever-teams/toolkit-ui';
import { UserPlus, Mail } from 'lucide-react';

const meta: Meta<typeof TeamsMemberInvitationFormDialog> = {
	title: 'Team Management/Member Invitation Form Dialog',
	component: TeamsMemberInvitationFormDialog,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A dialog wrapper component for the member invitation form. Provides a modal interface for inviting team members with customizable trigger elements. Automatically handles dialog state and form submission within the modal context.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the dialog content'
		},
		trigger: {
			control: false,
			description: 'Custom trigger element to open the dialog. If not provided, uses default button.'
		}
	}
} satisfies Meta<typeof TeamsMemberInvitationFormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default member invitation dialog with standard trigger button.
 * Uses the built-in "Invite Member" button to open the dialog.
 */
export const Default: Story = {
	args: {}
};

/**
 * Member invitation dialog with custom trigger button styling.
 * Demonstrates how to customize the dialog appearance.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-green-200 dark:border-green-800'
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog with custom green-themed border styling applied to the form content.'
			}
		}
	}
};

/**
 * Member invitation dialog with custom trigger element.
 * Shows how to provide a custom button or element to trigger the dialog.
 */
export const CustomTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton className="bg-purple-600 hover:bg-purple-700 text-white">
				<UserPlus size={16} className="mr-2" />
				Add Team Member
			</ThemedButton>
		)
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by a custom purple-themed button with UserPlus icon.'
			}
		}
	}
};

/**
 * Member invitation dialog with icon-only trigger.
 * Demonstrates a compact trigger for toolbar or header usage.
 */
export const IconTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton size="sm" className="p-2">
				<Mail size={16} />
			</ThemedButton>
		)
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by a compact icon-only button, suitable for toolbars or headers.'
			}
		}
	}
};
