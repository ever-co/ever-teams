import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTokenLoginForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsTokenLoginForm> = {
	title: 'Authentication/Teams Token Login Form',
	component: TeamsTokenLoginForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A token-based authentication form component with a single token input field. Features form validation, loading states, error handling, and optional redirect functionality. Uses Theme-UI integration for consistent styling and supports various token authentication methods.'
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
			description: 'Function called after successful token authentication'
		}
	}
} satisfies Meta<typeof TeamsTokenLoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default token form with standard styling and functionality.
 * Shows token input field with sign-in button.
 */
export const Default: Story = {
	args: {}
};

/**
 * Token form with redirect handler for post-authentication navigation.
 * Shows how to handle successful token authentication events.
 */
export const WithRedirectHandler: Story = {
	args: {
		redirectHandler: () => console.log('Token authentication successful, redirecting...')
	},
	parameters: {
		docs: {
			description: {
				story: 'Token form with a redirect handler that executes after successful authentication.'
			}
		}
	}
};

/**
 * Token form with custom styling applied via className prop.
 * Demonstrates visual customization capabilities.
 */
export const CustomStyling: Story = {
	args: {
		className: 'p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'Form with custom purple-themed styling applied through the className prop.'
			}
		}
	}
};
