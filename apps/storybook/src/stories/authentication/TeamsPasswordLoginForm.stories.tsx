import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsPasswordLoginForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsPasswordLoginForm> = {
	title: 'Authentication/Teams Password Login Form',
	component: TeamsPasswordLoginForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A simple password-based authentication form component with email and password fields. Features basic form validation, loading states, error handling, and optional redirect functionality. Uses Theme-UI integration for consistent styling across the application.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the form container'
		},
		redirectHandler: {
			action: 'redirected',
			description: 'Function called after successful authentication'
		}
	}
} satisfies Meta<typeof TeamsPasswordLoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default password form with standard styling and functionality.
 * Shows email and password input fields with sign-in button.
 */
export const Default: Story = {
	args: {}
};

/**
 * Password form with redirect handler for post-authentication navigation.
 * Shows how to handle successful authentication events.
 */
export const WithRedirectHandler: Story = {
	args: {
		redirectHandler: () => console.log('Authentication successful, redirecting...')
	},
	parameters: {
		docs: {
			description: {
				story: 'Password form with a redirect handler that executes after successful authentication.'
			}
		}
	}
};

/**
 * Password form with custom styling applied via className prop.
 * Demonstrates visual customization capabilities.
 */
export const CustomStyling: Story = {
	args: {
		className: 'p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with custom blue-themed styling applied through the className prop.'
			}
		}
	}
};

/**
 * Password form in a login page layout.
 * Shows how the form appears within a complete authentication interface.
 */
export const InLoginPage: Story = {
	render: () => (
		<div className=" bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to your account</p>
				</div>
				<TeamsPasswordLoginForm />
				<div className="mt-6 text-center">
					<a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
						Forgot your password?
					</a>
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Password form within a complete login page layout with header and forgot password link.'
			}
		}
	}
};
