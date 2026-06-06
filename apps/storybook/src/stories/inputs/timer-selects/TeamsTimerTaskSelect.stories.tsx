import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTimerTaskSelect } from '@ever-teams/atoms';

/**
 * TeamsTimerTaskSelect provides task selection functionality for timer operations.
 * 
 * ## Features
 * 
 * - **Task Selection**: Select from available user tasks for time tracking
 * - **Timer Integration**: Automatically disabled when timer is running with tooltip warning
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Loading States**: Shows loading indicator while fetching task data
 * - **State Management**: Updates currentTeamsState.taskId in global context
 * - **Title Truncation**: Automatically truncates long task titles to 30 characters
 * - **Internationalization**: Full i18n support for labels and placeholders
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - User tasks list from API
 * - Current timer state and running status
 * - Loading states for task data
 * - Global state management for selected task
 * 
 * ## Use Cases
 * 
 * - **Time Tracking**: Selecting specific task for detailed time allocation
 * - **Task Management**: Associating time entries with individual tasks
 * - **Productivity Tracking**: Monitoring time spent on specific work items
 * - **Timer Configuration**: Setting up timer context before starting work
 * - **Detailed Reporting**: Ensuring granular task-based time reporting
 */
const meta: Meta<typeof TeamsTimerTaskSelect> = {
	title: 'Inputs/Timer Selects/Teams Timer Task Select',
	component: TeamsTimerTaskSelect,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTimerTaskSelect is a specialized input component designed for task selection within timer workflows. It provides seamless integration with the timer system, automatically handling disabled states when the timer is active and offering comprehensive task management capabilities.

### Key Capabilities

- **Task Management**: Displays all available user tasks with clear selection interface
- **Timer State Awareness**: Automatically disables selection when timer is running to prevent mid-session changes
- **Tooltip Integration**: Shows informative warning messages when selection is disabled
- **Loading Handling**: Provides visual feedback during task data fetching
- **Smart Truncation**: Automatically truncates long task titles to 30 characters for better UI consistency
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **State Synchronization**: Seamlessly updates global timer state with selected task

### Technical Implementation

The component integrates deeply with the TeamsProvider context to access user tasks, timer state, and loading indicators. It uses the currentTeamsState management system to ensure timer configuration remains consistent across the application. Task titles are intelligently truncated to maintain clean UI presentation.
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
 * Default task select component with standard sizing and functionality.
 * Shows the complete task selection interface with label and dropdown.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTimerTaskSelect component with standard sizing. Displays the task selection dropdown with internationalized label and placeholder text, loading states, and timer integration. Task titles are automatically truncated to 30 characters.'
			}
		}
	}
};

/**
 * Small-sized task select component optimized for compact layouts.
 * Maintains full functionality while taking up less vertical space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerTaskSelect with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full task selection functionality and title truncation.'
			}
		}
	}
};

/**
 * Large-sized task select component for prominent placement.
 * Provides enhanced visibility and easier interaction for primary workflows.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTimerTaskSelect with large size variant (size="lg"). Perfect for prominent placement in main workflows, onboarding flows, or when task selection is a primary action.'
			}
		}
	}
};
