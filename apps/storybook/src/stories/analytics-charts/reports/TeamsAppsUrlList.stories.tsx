import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsAppsUrlList } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsAppsUrlList> = {
	title: 'Charts & Reports/Reports/Teams Apps URL List',
	component: TeamsAppsUrlList,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A specialized list component that displays applications and URLs usage statistics from time tracking data.

**Features:**
- Displays apps and URLs with usage duration and percentage
- Real-time data from TeamsProvider context (activitiesStats)
- Responsive design with multiple size variants
- Loading states with overlay spinner
- Scrollable list with custom styling
- Automatic data formatting and percentage calculations
- Empty state handling when no data is available

**Data Source:**
- Gets data from \`useTeamsContext().activitiesStats\` (IActivitiesStats[])
- Each item contains: duration, durationPercentage, sessions, title
- Loading state managed through \`activitiesStatsLoading\`

**Use Cases:**
- Time tracking dashboards
- Productivity analytics
- Application usage reports
- URL monitoring displays
- Team activity overviews
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
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default apps and URLs list with standard sizing and styling.
 * Shows application and website usage statistics from time tracking data.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default apps and URLs list displays time tracking statistics for applications and websites.
Data is automatically fetched from the TeamsProvider context.

**Default Configuration:**
- Size: 600px width
- Variant: Default styling
- Data: Real-time from activitiesStats
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
- Maintains readability
			`
			}
		}
	}
};

/**
 * Large size variant for prominent display.
 * Suitable for main content areas or detailed views.
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
Ideal for main content areas or when more space is available.

**Features:**
- Expanded 800px width
- Enhanced visibility
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
- Same functionality as default
			`
			}
		}
	}
};
