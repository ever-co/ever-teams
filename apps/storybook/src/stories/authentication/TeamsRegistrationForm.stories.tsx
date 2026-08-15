import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsRegistrationForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsRegistrationForm> = {
	title: 'Authentication/Teams Registration Form',
	component: TeamsRegistrationForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive user registration form component with full name, email, password, and password confirmation fields. Includes terms and conditions acceptance checkbox, form validation, error handling, and optional sign-in link integration. Features loading states and redirect functionality upon successful registration.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		},
		signInLink: {
			control: 'text',
			description: 'URL for the sign-in page link displayed at the bottom of the form'
		},
		redirectHandler: {
			action: 'redirected',
			description: 'Function called after successful registration'
		}
	}
} satisfies Meta<typeof TeamsRegistrationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default registration form with standard styling and functionality.
 * Shows all registration fields including name, email, password, and terms acceptance.
 */
export const Default: Story = {
	args: {}
};

/**
 * Registration form with sign-in link for users who already have accounts.
 * Demonstrates the complete registration flow with navigation options.
 */
export const WithSignInLink: Story = {
	args: {
		signInLink: '/login'
	},
	parameters: {
		docs: {
			description: {
				story: 'Registration form with a sign-in link for existing users to navigate to the login page.'
			}
		}
	}
};

/**
 * Registration form with redirect handler for post-registration navigation.
 * Shows how to handle successful registration events.
 */
export const WithRedirectHandler: Story = {
	args: {
		redirectHandler: () => console.log('Registration successful, redirecting...')
	},
	parameters: {
		docs: {
			description: {
				story: 'Registration form with a redirect handler that executes after successful registration.'
			}
		}
	}
};

/**
 * Registration form with custom styling applied via className prop.
 * Demonstrates visual customization capabilities.
 */
export const CustomStyling: Story = {
	args: {
		className: 'p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950',
		signInLink: '/login'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with custom green-themed styling applied through the className prop.'
			}
		}
	}
};
