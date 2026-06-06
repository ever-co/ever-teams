import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTrackingClickInsight } from '@ever-teams/atoms';

/**
 * TeamsTrackingClickInsight displays comprehensive click analytics and insights from user session data.
 * 
 * ## Features
 * 
 * - **Click Analytics**: Total clicks, click rate, and click density metrics
 * - **Element Tracking**: Unique elements tracking with spatial distribution analysis
 * - **Top Elements**: List of most clicked elements with percentage breakdown
 * - **Real-time Updates**: Live data updates with loading and error state handling
 * - **Manual Refresh**: Built-in refresh functionality for data updates
 * - **Responsive Design**: Adapts to different screen sizes and layouts
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
 * - **UX Analysis**: Understanding user interaction patterns and click behavior
 * - **Element Performance**: Identifying most and least engaged page elements
 * - **Conversion Optimization**: Analyzing click paths and user engagement
 * - **A/B Testing**: Comparing click patterns across different page versions
 * - **Dashboard Integration**: Embedding click insights in analytics dashboards
 */
const meta: Meta<typeof TeamsTrackingClickInsight> = {
	title: 'Tracking & Insights/Teams Tracking Click Insight',
	component: TeamsTrackingClickInsight,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsTrackingClickInsight is a comprehensive analytics component that provides detailed insights into user click behavior and interaction patterns. It processes session data from Microsoft Clarity to deliver actionable metrics about user engagement.

### Key Capabilities

- **Click Metrics**: Displays total clicks, click rate per session, and click density analysis
- **Element Analysis**: Tracks unique elements clicked and provides spatial distribution insights
- **Top Elements List**: Shows most clicked elements with percentage breakdown and engagement scores
- **Real-time Data**: Automatically updates when new session data is available
- **Error Handling**: Graceful error states with retry functionality
- **Performance Optimized**: Efficient payload decoding and data processing

### Technical Implementation

The component uses the TrackingProvider context to access session data and automatically decodes Clarity payloads to extract click events. It provides comprehensive analytics while maintaining optimal performance through memoized calculations.
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
 * Default click insight component showing comprehensive analytics with standard styling.
 * Displays click metrics, element tracking, and top clicked elements in a clean interface.
 */
export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsTrackingClickInsight component with standard styling and full analytics display. Shows click metrics, unique element tracking, and top clicked elements list with percentage breakdowns.'
			}
		}
	}
};

/**
 * Click insight component with custom styling applied through className prop.
 * Demonstrates how to customize the appearance while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		className: 'shadow-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsTrackingClickInsight with custom styling applied through the className prop. Features enhanced visual design with gradient background, custom borders, and shadow effects while preserving all analytics functionality.'
			}
		}
	}
};
