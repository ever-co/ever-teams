import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTrackingFilter } from '@ever-teams/atoms';

/**
 * TeamsTrackingFilter provides comprehensive filtering capabilities for tracking session data.
 * 
 * ## Features
 * 
 * - **Date/Time Filtering**: Timezone-aware date and time range selection
 * - **Employee Selection**: Employee selector for users with appropriate permissions
 * - **Auto-refresh**: Configurable automatic data refresh functionality
 * - **Timezone Handling**: 3-tier timezone priority (user.timezone → browser → UTC)
 * - **Time Validation**: Real-time validation of time ranges and inputs
 * - **Permission-based**: Adaptive UI based on user permissions and roles
 * 
 * ## Data Source
 * 
 * This component gets its data from multiple context sources:
 * - `useTrackingContext()` for session data and filter state management
 * - `useTeamsContext()` for user data, permissions, and timezone settings
 * 
 * ## Use Cases
 * 
 * - **Session Filtering**: Filtering tracking data by date, time, and employee
 * - **Real-time Monitoring**: Auto-refresh for live session monitoring
 * - **Multi-user Analytics**: Employee-specific session analysis for managers
 * - **Time-based Analysis**: Analyzing user behavior patterns across time periods
 * - **Dashboard Integration**: Providing filter controls for tracking dashboards
 */
const meta: Meta<typeof TeamsTrackingFilter> = {
	title: 'Tracking & Insights/Teams Tracking Filter',
	component: TeamsTrackingFilter,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTrackingFilter is a sophisticated filtering component that provides comprehensive controls for tracking session data. It offers timezone-aware date/time filtering, employee selection, and auto-refresh capabilities with intelligent permission handling.

### Key Capabilities

- **Timezone-Aware Filtering**: Intelligent timezone handling with 3-tier priority system
- **Date/Time Controls**: Separate date picker and time inputs for precise range selection
- **Employee Selection**: Permission-based employee selector for multi-user analytics
- **Auto-refresh**: Configurable automatic refresh with customizable intervals
- **Time Validation**: Real-time validation ensuring start time is before end time
- **Permission Integration**: Adaptive UI based on user roles and permissions

### Timezone Handling

The component implements a sophisticated timezone priority system:
1. **User Timezone**: Uses user.timezone field if available
2. **Browser Timezone**: Falls back to browser-detected timezone
3. **UTC Fallback**: Uses UTC as final fallback for consistency

### Technical Implementation

The component integrates with both TrackingProvider and TeamsProvider contexts to access session data, user information, and permissions. It provides efficient state management and real-time validation while maintaining optimal performance.
				`
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the component container',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		autoRefresh: {
			control: 'boolean',
			description: 'Whether to enable automatic refresh of session data',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		},
		refreshInterval: {
			control: 'number',
			description: 'Refresh interval in milliseconds when auto-refresh is enabled',
			table: {
				type: { summary: 'number' },
				defaultValue: { summary: '30000' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '800px', height: '400px' }}>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default filter component without auto-refresh functionality.
 * Provides basic date/time filtering and employee selection capabilities.
 */
export const Default: Story = {
	args: {
		autoRefresh: false
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTrackingFilter component without auto-refresh enabled. Provides timezone-aware date/time filtering and employee selection with manual refresh control.'
			}
		}
	}
};

/**
 * Filter component with auto-refresh enabled using default 30-second interval.
 * Automatically updates session data at regular intervals.
 */
export const WithAutoRefresh: Story = {
	args: {
		autoRefresh: true
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingFilter with auto-refresh enabled using the default 30-second interval. Automatically refreshes session data at regular intervals for real-time monitoring scenarios.'
			}
		}
	}
};

/**
 * Filter component with custom refresh interval for high-frequency monitoring.
 * Updates session data every 10 seconds for real-time analysis.
 */
export const CustomRefreshInterval: Story = {
	args: {
		autoRefresh: true,
		refreshInterval: 10000
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingFilter with auto-refresh enabled and a custom 10-second refresh interval. Provides high-frequency data updates for real-time monitoring and analysis scenarios.'
			}
		}
	}
};

/**
 * Filter component with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		autoRefresh: false,
		className: 'shadow-xl border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingFilter with custom styling applied through the className prop. Features enhanced visual design with gradient background, custom borders, and shadow effects while preserving all filtering functionality.'
			}
		}
	}
};
