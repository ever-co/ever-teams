import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsWeeklyActivityDisplayer } from '@ever-teams/atoms';

/**
 * TeamsWeeklyActivityDisplayer provides weekly activity percentage display with intelligent date range labeling.
 *
 * ## Features
 *
 * - **Weekly Activity Metrics**: Displays week's activity percentage from statistics
 * - **Smart Date Labeling**: Automatically switches between "week activity" and "activity over period"
 * - **Progress Visualization**: Optional progress bar showing activity completion
 * - **Loading States**: Shows loading overlay during data fetching
 * - **Date Range Intelligence**: Compares current week with selected report dates
 * - **Card Layout**: Clean card-based design with dark/light theme support
 * - **Internationalization**: Full i18n support for labels and text
 * - **Custom Styling**: Support for additional CSS classes
 *
 * ## Data Source
 *
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Week's activity percentage from `statisticsCounts.weekActivities`
 * - Report date range from `reportDates` for smart labeling
 * - Loading states from `statisticsCountsLoading`
 * - Date utilities from `getWeekStartAndEnd()` and `areDatesEqual()`
 *
 * ## Use Cases
 *
 * - **Weekly Dashboards**: Showing week's productivity metrics
 * - **Activity Monitoring**: Weekly activity percentage tracking
 * - **Performance Analytics**: Weekly activity performance indicators
 * - **Custom Period Reports**: Activity summary for selected date ranges
 * - **Productivity Trends**: Visual feedback on weekly activity patterns
 */
const meta: Meta<typeof TeamsWeeklyActivityDisplayer> = {
	title: 'Report Displayers/Activity Displayers/Teams Weekly Activity Displayer',
	component: TeamsWeeklyActivityDisplayer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsWeeklyActivityDisplayer is a sophisticated display component that shows weekly activity percentage with intelligent date range labeling. It automatically adapts its label based on whether the current report dates match the current week or represent a custom period.

### Key Capabilities

- **Weekly Activity Display**: Shows week's activity as a percentage value with clear visual presentation
- **Intelligent Labeling**: Automatically switches between "Week Activity" and "Activity Over Period" based on selected date range
- **Date Range Logic**: Uses \`getWeekStartAndEnd()\` and \`areDatesEqual()\` to determine appropriate labeling
- **Progress Bar Integration**: Optional progress bar that visually represents activity completion level
- **Loading State Management**: Displays overlay spinner during data fetching for better user experience
- **Theme Compatibility**: Seamless integration with dark and light themes using proper color schemes
- **Internationalization**: Full i18n support with localized labels for different contexts

### Smart Labeling System

The component intelligently determines the appropriate label:
- **Current Week**: Shows "Week Activity" when report dates match current week start/end
- **Custom Period**: Shows "Activity Over Period" when report dates represent a different time range

### Technical Implementation

The component uses the TeamsActivityDisplayer base component with weekly activity data from the TeamsProvider context. It includes sophisticated date comparison logic to provide contextually appropriate labels.
				`
			}
		}
	},
	argTypes: {
		showProgress: {
			control: 'boolean',
			description: 'Whether to show the progress bar below the activity percentage',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'true' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the card component',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '200px', height: '150px' }}>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default weekly activity displayer with progress bar and intelligent labeling.
 * Shows week's activity percentage with smart date range detection.
 */
export const Default: Story = {
	args: {
		showProgress: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsWeeklyActivityDisplayer component with progress bar enabled. Displays week\'s activity percentage with intelligent labeling that switches between "Week Activity" and "Activity Over Period" based on selected report dates.'
			}
		}
	}
};

/**
 * Weekly activity displayer without progress bar for minimal display.
 * Shows only the activity percentage without visual progress indicator.
 */
export const WithoutProgress: Story = {
	args: {
		showProgress: false
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsWeeklyActivityDisplayer with progress bar disabled (showProgress=false). Ideal for minimal layouts where only the activity percentage value is needed without visual progress indication, while maintaining smart date labeling.'
			}
		}
	}
};

/**
 * Weekly activity displayer with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining intelligent labeling.
 */
export const CustomStyling: Story = {
	args: {
		showProgress: true,
		className: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsWeeklyActivityDisplayer with custom styling applied through the className prop. Features custom border and background colors while preserving all activity display functionality, progress visualization, and intelligent date range labeling.'
			}
		}
	}
};
