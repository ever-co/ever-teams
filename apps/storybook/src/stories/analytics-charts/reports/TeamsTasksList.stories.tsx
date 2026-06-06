import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTasksList } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsTasksList> = {
	title: 'Charts & Reports/Reports/Teams Tasks List',
	component: TeamsTasksList,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A specialized list component that displays task-based time tracking statistics and productivity metrics.

**Features:**
- Displays tasks with time duration and percentage breakdown
- Real-time data from TeamsProvider context (tasksStats)
- Responsive design with multiple size variants
- Loading states with overlay spinner
- Scrollable list with custom styling
- Automatic time formatting and percentage calculations
- Empty state handling when no tasks are available

**Data Source:**
- Gets data from \`useTeamsContext().tasksStats\` (ITasksStats[])
- Each item contains: duration, durationPercentage, and task details
- Loading state managed through \`tasksStatsLoading\`

**Use Cases:**
- Task time tracking dashboards
- Individual productivity analytics
- Task performance reports
- Work breakdown displays
- Time allocation analysis
				`
			}
		}
	},
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['default', 'bordered'],
			description: 'Visual style variant of the list component',
			defaultValue: 'default'
		},
		size: {
			control: { type: 'select' },
			options: ['default', 'sm', 'lg'],
			description: 'Size variant controlling width and spacing',
			defaultValue: 'default'
		},
		className: {
			control: { type: 'text' },
			description: 'Additional CSS classes for custom styling'
		}
	}
} satisfies Meta<typeof TeamsTasksList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default tasks list with standard sizing and styling.
 * Shows task time tracking statistics and productivity metrics.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default tasks list displays time tracking statistics for all tasks.
Data is automatically fetched from the TeamsProvider context.

**Default Configuration:**
- Size: 600px width
- Variant: Default styling
- Data: Real-time from tasksStats
- Loading: Automatic overlay when fetching data
			`
			}
		}
	}
};

/**
 * Small size variant optimized for compact spaces.
 * Ideal for dashboard widgets or sidebar placement.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: `
Small size variant with reduced width (400px) for compact layouts.
Perfect for dashboard widgets or when space is limited.

**Features:**
- Compact 400px width
- Same functionality as default
- Optimized for smaller spaces
- Maintains task data visibility
			`
			}
		}
	}
};

/**
 * Large size variant for prominent display.
 * Suitable for main content areas or detailed task analysis.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: `
Large size variant with expanded width (800px) for detailed displays.
Ideal for main content areas or comprehensive task analysis.

**Features:**
- Expanded 800px width
- Enhanced task visibility
- Better for detailed analysis
- Suitable for main dashboards
			`
			}
		}
	}
};

/**
 * Bordered variant with enhanced visual definition.
 * Adds a prominent border for better visual separation.
 */
export const BorderedVariant: Story = {
	args: {
		variant: 'bordered'
	},
	parameters: {
		docs: {
			description: {
				story: `
Bordered variant adds a secondary color border for enhanced visual definition.
Useful when the component needs to stand out from surrounding content.

**Features:**
- Secondary color border (2px)
- Enhanced visual separation
- Better component definition
- Same task data functionality
			`
			}
		}
	}
};
