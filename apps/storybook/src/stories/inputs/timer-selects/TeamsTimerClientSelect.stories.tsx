import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTimerClientSelect } from '@ever-teams/atoms';

/**
 * TeamsTimerClientSelect provides client selection functionality for timer operations.
 * 
 * ## Features
 * 
 * - **Client Selection**: Select from available organization clients for time tracking
 * - **Timer Integration**: Automatically disabled when timer is running with tooltip warning
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Loading States**: Shows loading indicator while fetching client data
 * - **State Management**: Updates currentTeamsState.clientId in global context
 * - **Internationalization**: Full i18n support for labels and placeholders
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Organization clients list from API
 * - Current timer state and running status
 * - Loading states for client data
 * - Global state management for selected client
 * 
 * ## Use Cases
 * 
 * - **Time Tracking**: Selecting client for billable time tracking
 * - **Project Management**: Associating time entries with specific clients
 * - **Billing Integration**: Ensuring accurate client-based time reporting
 * - **Timer Configuration**: Setting up timer context before starting work
 * - **Workflow Management**: Organizing work by client relationships
 */
const meta: Meta<typeof TeamsTimerClientSelect> = {
	title: 'Inputs/Timer Selects/Teams Timer Client Select',
	component: TeamsTimerClientSelect,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTimerClientSelect is a specialized input component designed for client selection within timer workflows. It provides seamless integration with the timer system, automatically handling disabled states when the timer is active and offering comprehensive client management capabilities.

### Key Capabilities

- **Client Management**: Displays all available organization clients with clear selection interface
- **Timer State Awareness**: Automatically disables selection when timer is running to prevent mid-session changes
- **Tooltip Integration**: Shows informative warning messages when selection is disabled
- **Loading Handling**: Provides visual feedback during client data fetching
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **State Synchronization**: Seamlessly updates global timer state with selected client

### Technical Implementation

The component integrates deeply with the TeamsProvider context to access organization clients, timer state, and loading indicators. It uses the currentTeamsState management system to ensure timer configuration remains consistent across the application.
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
 * Default client select component with standard sizing and functionality.
 * Shows the complete client selection interface with label and dropdown.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTimerClientSelect component with standard sizing. Displays the client selection dropdown with internationalized label and placeholder text, loading states, and timer integration.'
			}
		}
	}
};

/**
 * Small-sized client select component optimized for compact layouts.
 * Maintains full functionality while taking up less vertical space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerClientSelect with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full client selection functionality.'
			}
		}
	}
};

/**
 * Large-sized client select component for prominent placement.
 * Provides enhanced visibility and easier interaction for primary workflows.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerClientSelect with large size variant (size="lg"). Perfect for prominent placement in main workflows, onboarding flows, or when client selection is a primary action.'
			}
		}
	}
};
