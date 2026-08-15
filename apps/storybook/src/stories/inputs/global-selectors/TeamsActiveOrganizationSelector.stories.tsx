import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsActiveOrganizationSelector } from '@ever-teams/atoms';

/**
 * TeamsActiveOrganizationSelector provides global organization selection functionality.
 * 
 * ## Features
 * 
 * - **Organization Selection**: Select from user's available organizations
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Custom Labeling**: Configurable label text for different contexts
 * - **Loading States**: Shows loading indicator while fetching organization data
 * - **Global State**: Updates selectedOrganization in global context
 * - **Custom Styling**: Support for additional CSS classes
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - User organizations list from API
 * - Current selected organization state
 * - Loading states for organization data
 * 
 * ## Use Cases
 * 
 * - **Multi-organization Management**: Switching between different organizations
 * - **Organization Context**: Setting organizational context for data and operations
 * - **User Workflows**: Selecting active organization for user sessions
 * - **Administrative Controls**: Organization-specific administrative actions
 * - **Data Filtering**: Filtering content by organization scope
 */
const meta: Meta<typeof TeamsActiveOrganizationSelector> = {
	title: 'Inputs/Global Selectors/Teams Active Organization Selector',
	component: TeamsActiveOrganizationSelector,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsActiveOrganizationSelector is a global selector component that enables organization selection for users with access to multiple organizations. It provides seamless organization switching capabilities with comprehensive state management.

### Key Capabilities

- **Organization Management**: Displays all user-accessible organizations with clear selection interface
- **Custom Labeling**: Flexible label system allowing custom text for different use cases
- **Loading Handling**: Provides visual feedback during organization data fetching
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **Global State Management**: Seamlessly updates selectedOrganization across the entire application
- **Custom Styling**: Flexible className support for visual customization

### Technical Implementation

The component integrates with the TeamsProvider context to access user organizations, loading states, and global organization selection state. It provides efficient organization switching with immediate state updates across the application.
				`
			}
		}
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg'],
			description: 'Size variant of the select component',
			table: {
				type: { summary: "'default' | 'sm' | 'lg' | null" },
				defaultValue: { summary: "'default'" }
			}
		},
		label: {
			control: 'text',
			description: 'Custom label text to display above the select',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the select component',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '300px', height: '200px' }}>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default organization selector without label, showing clean selection interface.
 * Displays organization dropdown with standard styling and functionality.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsActiveOrganizationSelector component without label. Shows the organization selection dropdown with loading states and global state management.'
			}
		}
	}
};

/**
 * Organization selector with custom label for enhanced context.
 * Provides clear identification of the selection purpose.
 */
export const WithLabel: Story = {
	args: {
		size: 'default',
		label: 'Select Organization'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveOrganizationSelector with custom label text. Displays the specified label above the selection dropdown for clear visual identification and context.'
			}
		}
	}
};

/**
 * Small-sized organization selector optimized for compact layouts.
 * Maintains full functionality while taking up less space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm',
		label: 'Organization'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveOrganizationSelector with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full organization selection functionality.'
			}
		}
	}
};

/**
 * Large-sized organization selector for prominent placement.
 * Provides enhanced visibility and easier interaction.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg',
		label: 'Choose Your Organization'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveOrganizationSelector with large size variant (size="lg"). Perfect for prominent placement in main workflows, onboarding flows, or when organization selection is a primary action.'
			}
		}
	}
};

/**
 * Organization selector with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		size: 'default',
		label: 'Organization',
		className: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveOrganizationSelector with custom styling applied through the className prop. Features custom border and background colors while preserving all organization selection functionality.'
			}
		}
	}
};
