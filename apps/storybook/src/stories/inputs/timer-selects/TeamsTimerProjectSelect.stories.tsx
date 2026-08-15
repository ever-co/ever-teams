import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTimerProjectSelect } from '@ever-teams/atoms';

/**
 * TeamsTimerProjectSelect provides project selection functionality for timer operations.
 * 
 * ## Features
 * 
 * - **Project Selection**: Select from available organization projects for time tracking
 * - **Timer Integration**: Automatically disabled when timer is running with tooltip warning
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Loading States**: Shows loading indicator while fetching project data
 * - **State Management**: Updates currentTeamsState.projectId in global context
 * - **Internationalization**: Full i18n support for labels and placeholders
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Organization projects list from API
 * - Current timer state and running status
 * - Loading states for project data
 * - Global state management for selected project
 * 
 * ## Use Cases
 * 
 * - **Time Tracking**: Selecting project for accurate time allocation
 * - **Project Management**: Associating time entries with specific projects
 * - **Resource Planning**: Tracking time spent on different project initiatives
 * - **Timer Configuration**: Setting up timer context before starting work
 * - **Reporting Integration**: Ensuring accurate project-based time reporting
 */
const meta: Meta<typeof TeamsTimerProjectSelect> = {
	title: 'Inputs/Timer Selects/Teams Timer Project Select',
	component: TeamsTimerProjectSelect,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTimerProjectSelect is a specialized input component designed for project selection within timer workflows. It provides seamless integration with the timer system, automatically handling disabled states when the timer is active and offering comprehensive project management capabilities.

### Key Capabilities

- **Project Management**: Displays all available organization projects with clear selection interface
- **Timer State Awareness**: Automatically disables selection when timer is running to prevent mid-session changes
- **Tooltip Integration**: Shows informative warning messages when selection is disabled
- **Loading Handling**: Provides visual feedback during project data fetching
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **State Synchronization**: Seamlessly updates global timer state with selected project

### Technical Implementation

The component integrates deeply with the TeamsProvider context to access organization projects, timer state, and loading indicators. It uses the currentTeamsState management system to ensure timer configuration remains consistent across the application.
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
 * Default project select component with standard sizing and functionality.
 * Shows the complete project selection interface with label and dropdown.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTimerProjectSelect component with standard sizing. Displays the project selection dropdown with internationalized label and placeholder text, loading states, and timer integration.'
			}
		}
	}
};

/**
 * Small-sized project select component optimized for compact layouts.
 * Maintains full functionality while taking up less vertical space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerProjectSelect with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full project selection functionality.'
			}
		}
	}
};

/**
 * Large-sized project select component for prominent placement.
 * Provides enhanced visibility and easier interaction for primary workflows.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerProjectSelect with large size variant (size="lg"). Perfect for prominent placement in main workflows, onboarding flows, or when project selection is a primary action.'
			}
		}
	}
};
