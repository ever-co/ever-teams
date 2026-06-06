import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsProjectsList } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsProjectsList> = {
	title: 'Charts & Reports/Reports/Teams Projects List',
	component: TeamsProjectsList,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A specialized list component that displays worked project-based time tracking statistics and analytics.

**Features:**
- Displays projects with time duration and percentage breakdown
- Real-time data from TeamsProvider context (projectsStats)
- Responsive design with multiple size variants
- Loading states with overlay spinner
- Scrollable list with custom styling
- Automatic time formatting and percentage calculations
- Empty state handling when no projects are available

**Data Source:**
- Gets data from \`useTeamsContext().projectsStats\` (IProjectsStats[])
- Each item contains: name, id, duration, durationPercentage
- Loading state managed through \`projectsStatsLoading\`

**Use Cases:**
- Project time tracking dashboards
- Team productivity analytics
- Project performance reports
- Resource allocation displays
- Client billing summaries
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
} satisfies Meta<typeof TeamsProjectsList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default projects list with standard sizing and styling.
 * Shows project time tracking statistics and performance metrics.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default projects list displays time tracking statistics for all projects.
Data is automatically fetched from the TeamsProvider context.

**Default Configuration:**
- Size: 600px width
- Variant: Default styling
- Data: Real-time from projectsStats
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
- Maintains project data visibility
			`
			}
		}
	}
};

/**
 * Large size variant for prominent display.
 * Suitable for main content areas or detailed project analysis.
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
Ideal for main content areas or comprehensive project analysis.

**Features:**
- Expanded 800px width
- Enhanced project visibility
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
- Same project data functionality
			`
			}
		}
	}
};
