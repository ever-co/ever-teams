import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsPasswordUpdateForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsPasswordUpdateForm> = {
	title: 'User Account Management/Password Update Form',
	component: TeamsPasswordUpdateForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive password update form component with three-field validation (current password, new password, confirm new password). Features form validation, error handling, loading states with spinner animation, and orange-themed submit button. Requires authenticated user context to function properly.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		}
	}
} satisfies Meta<typeof TeamsPasswordUpdateForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default password update form with standard styling and functionality.
 * Shows current password, new password, and confirm password fields with update button.
 */
export const Default: Story = {
	args: {}
};

/**
 * Password update form with custom styling applied via className prop.
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
