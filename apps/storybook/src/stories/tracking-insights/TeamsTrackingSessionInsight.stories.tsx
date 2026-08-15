import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTrackingSessionInsight } from '@ever-teams/atoms';

/**
 * TeamsTrackingSessionInsight provides comprehensive session analytics and metrics from user behavior data.
 * 
 * ## Features
 * 
 * - **Session Metrics**: Duration tracking, engagement scoring, and interaction rate analysis
 * - **Event Analytics**: Comprehensive event count tracking and categorization
 * - **Device Detection**: Automatic device type identification and statistics
 * - **Time Analysis**: Time-based analytics with trend indicators and patterns
 * - **Real-time Updates**: Live data updates with loading and error state handling
 * - **Performance Insights**: Session quality scoring and engagement metrics
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTrackingContext()` hook, which provides:
 * - Session data with encoded Clarity payloads
 * - Loading states and error handling
 * - Session refresh capabilities
 * 
 * ## Use Cases
 * 
 * - **User Behavior Analysis**: Understanding session patterns and user engagement
 * - **Performance Monitoring**: Tracking session quality and interaction rates
 * - **Device Analytics**: Analyzing usage patterns across different device types
 * - **Engagement Optimization**: Identifying high and low engagement sessions
 * - **Business Intelligence**: Session-based insights for strategic decisions
 */
const meta: Meta<typeof TeamsTrackingSessionInsight> = {
	title: 'Tracking & Insights/Teams Tracking Session Insight',
	component: TeamsTrackingSessionInsight,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTrackingSessionInsight is a powerful analytics component that delivers comprehensive insights into user session behavior and engagement patterns. It processes Microsoft Clarity session data to provide actionable metrics about user interactions.

### Key Capabilities

- **Session Duration**: Tracks total session time, average duration, and time distribution patterns
- **Engagement Scoring**: Calculates engagement scores based on interaction frequency and quality
- **Interaction Analysis**: Measures interaction rates, event density, and user activity levels
- **Device Intelligence**: Automatically detects and categorizes device types with usage statistics
- **Event Tracking**: Comprehensive event count analysis with categorization and trends
- **Quality Metrics**: Session quality assessment based on multiple engagement factors

### Technical Implementation

The component leverages the TrackingProvider context to access session data and performs sophisticated analysis of decoded Clarity payloads. It provides real-time insights while maintaining optimal performance through efficient data processing and memoized calculations.
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
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '800px', height: '600px' }}>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default session insight component showing comprehensive analytics with standard styling.
 * Displays session metrics, engagement scoring, and device analytics in a clean interface.
 */
export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTrackingSessionInsight component with standard styling and full analytics display. Shows session duration metrics, engagement scoring, interaction rate analysis, and device type statistics.'
			}
		}
	}
};

/**
 * Session insight component with custom styling applied through className prop.
 * Demonstrates how to customize the appearance while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		className: 'shadow-xl border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingSessionInsight with custom styling applied through the className prop. Features enhanced visual design with gradient background, custom borders, and shadow effects while preserving all session analytics functionality.'
			}
		}
	}
};
