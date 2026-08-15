import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTimerTeamSelect } from '@ever-teams/atoms';

/**
 * TeamsTimerTeamSelect provides team selection functionality for timer operations.
 * 
 * ## Features
 * 
 * - **Team Selection**: Select from available organization teams for time tracking
 * - **Timer Integration**: Automatically disabled when timer is running with tooltip warning
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Loading States**: Shows loading indicator while fetching team data
 * - **State Management**: Updates currentTeamsState.organizationTeamId in global context
 * - **Internationalization**: Full i18n support for labels and placeholders
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Organization teams list from API
 * - Current timer state and running status
 * - Loading states for team data
 * - Global state management for selected team
 * 
 * ## Use Cases
 * 
 * - **Time Tracking**: Selecting team for collaborative time tracking
 * - **Team Management**: Associating time entries with specific teams
 * - **Resource Allocation**: Tracking time spent on team-based initiatives
 * - **Timer Configuration**: Setting up timer context before starting work
 * - **Team Reporting**: Ensuring accurate team-based time reporting
 */
const meta: Meta<typeof TeamsTimerTeamSelect> = {
	title: 'Inputs/Timer Selects/Teams Timer Team Select',
	component: TeamsTimerTeamSelect,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTimerTeamSelect is a specialized input component designed for team selection within timer workflows. It provides seamless integration with the timer system, automatically handling disabled states when the timer is active and offering comprehensive team management capabilities.

### Key Capabilities

- **Team Management**: Displays all available organization teams with clear selection interface
- **Timer State Awareness**: Automatically disables selection when timer is running to prevent mid-session changes
- **Tooltip Integration**: Shows informative warning messages when selection is disabled with auto placement
- **Loading Handling**: Provides visual feedback during team data fetching
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **State Synchronization**: Seamlessly updates global timer state with selected team

### Technical Implementation

The component integrates deeply with the TeamsProvider context to access organization teams, timer state, and loading indicators. It uses the currentTeamsState management system to ensure timer configuration remains consistent across the application. The tooltip placement is automatically optimized for better user experience.
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
 * Default team select component with standard sizing and functionality.
 * Shows the complete team selection interface with label and dropdown.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTimerTeamSelect component with standard sizing. Displays the team selection dropdown with internationalized label and placeholder text, loading states, and timer integration.'
			}
		}
	}
};

/**
 * Small-sized team select component optimized for compact layouts.
 * Maintains full functionality while taking up less vertical space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerTeamSelect with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full team selection functionality.'
			}
		}
	}
};

/**
 * Large-sized team select component for prominent placement.
 * Provides enhanced visibility and easier interaction for primary workflows.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerTeamSelect with large size variant (size="lg"). Perfect for prominent placement in main workflows, onboarding flows, or when team selection is a primary action.'
			}
		}
	}
};
