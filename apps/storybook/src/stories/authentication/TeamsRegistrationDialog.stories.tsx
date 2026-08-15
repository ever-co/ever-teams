import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsRegistrationDialog } from '@ever-teams/atoms';
import { ThemedButton } from '@ever-teams/toolkit-ui';
import { UserPlus, Mail, Users } from 'lucide-react';

const meta: Meta<typeof TeamsRegistrationDialog> = {
	title: 'Authentication/Teams Registration Dialog',
	component: TeamsRegistrationDialog,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A dialog wrapper component for the registration form. Provides a modal interface for user registration with customizable trigger elements. Automatically handles dialog state and form submission within the modal context.'
			}
		}
	},
	argTypes: {
		trigger: {
			control: false,
			description: 'Custom trigger element to open the dialog. If not provided, uses default "REGISTER NOW" button.'
		},
		signInLink: {
			control: 'text',
			description: 'URL for the sign-in page link displayed within the registration form'
		}
	}
} satisfies Meta<typeof TeamsRegistrationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default registration dialog with standard trigger button.
 * Uses the built-in "REGISTER NOW" button to open the dialog.
 */
export const Default: Story = {
	args: {}
};

/**
 * Registration dialog with sign-in link for existing users.
 * Demonstrates the complete registration flow with navigation options.
 */
export const WithSignInLink: Story = {
	args: {
		signInLink: '/login'
	},
	parameters: {
		docs: {
			description: {
				story: 'Registration dialog with a sign-in link for existing users to navigate to the login page.'
			}
		}
	}
};

/**
 * Registration dialog with custom trigger element.
 * Shows how to provide a custom button or element to trigger the dialog.
 */
export const CustomTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton className="bg-blue-600 hover:bg-blue-700 text-white">
				<UserPlus size={16} className="mr-2" />
				Create Account
			</ThemedButton>
		),
		signInLink: '/login'
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by a custom blue-themed button with UserPlus icon.'
			}
		}
	}
};

/**
 * Registration dialog with email-themed trigger.
 * Demonstrates a trigger styled for email signup contexts.
 */
export const EmailSignupTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton className="bg-green-600 hover:bg-green-700 text-white">
				<Mail size={16} className="mr-2" />
				Sign Up with Email
			</ThemedButton>
		),
		signInLink: '/login'
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by an email-themed button, suitable for email signup flows.'
			}
		}
	}
};

/**
 * Registration dialog with team invitation trigger.
 * Shows how the dialog can be used in team invitation contexts.
 */
export const TeamInviteTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton className="bg-purple-600 hover:bg-purple-700 text-white">
				<Users size={16} className="mr-2" />
				Join Team
			</ThemedButton>
		),
		signInLink: '/login'
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by a team-themed button, suitable for team invitation flows.'
			}
		}
	}
};
