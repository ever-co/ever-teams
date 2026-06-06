import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsWeeklyWorkedTimeDisplayer } from '@ever-teams/atoms';

/**
 * TeamsWeeklyWorkedTimeDisplayer provides weekly worked time display with intelligent date range labeling and 40-hour target.
 *
 * ## Features
 *
 * - **Weekly Time Display**: Shows week's worked time in formatted time display
 * - **40-Hour Target**: Progress calculation against standard 40-hour work week
 * - **Smart Date Labeling**: Automatically switches between "worked this week" and "worked over period"
 * - **Time Formatting**: Uses formatTime utility for human-readable time display
 * - **Progress Visualization**: Optional progress bar showing weekly completion
 * - **Loading States**: Shows loading overlay during data fetching
 * - **Date Range Intelligence**: Compares current week with selected report dates
 * - **Card Layout**: Clean card-based design with dark/light theme support
 * - **Internationalization**: Full i18n support for labels and text
 * - **Custom Styling**: Support for additional CSS classes
 *
 * ## Data Source
 *
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Week's worked time from `statisticsCounts.weekDuration` (in seconds)
 * - Report date range from `reportDates` for smart labeling
 * - Loading states from `statisticsCountsLoading`
 * - Date utilities from `getWeekStartAndEnd()` and `areDatesEqual()`
 *
 * ## Use Cases
 *
 * - **Weekly Dashboards**: Showing week's time tracking progress
 * - **Time Monitoring**: Weekly time accumulation tracking
 * - **Performance Analytics**: Weekly productivity time indicators
 * - **Goal Tracking**: Progress toward weekly time targets
 * - **Custom Period Reports**: Time summary for selected date ranges
 * - **Work-Life Balance**: Visual feedback on weekly work hours
 */
const meta: Meta<typeof TeamsWeeklyWorkedTimeDisplayer> = {
	title: 'Report Displayers/Time Displayers/Teams Weekly Worked Time Displayer',
	component: TeamsWeeklyWorkedTimeDisplayer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsWeeklyWorkedTimeDisplayer is a sophisticated display component that shows weekly worked time with intelligent date range labeling and progress visualization against a standard 40-hour work week target. It automatically adapts its label based on whether the current report dates match the current week or represent a custom period.

### Key Capabilities

- **Formatted Time Display**: Shows week's worked time using the \`formatTime()\` utility for human-readable format (e.g., "25h 30m")
- **40-Hour Target Progress**: Automatically calculates progress percentage against standard 40-hour work week (144,000 seconds)
- **Intelligent Labeling**: Automatically switches between "Worked This Week" and "Worked Over Period" based on selected date range
- **Date Range Logic**: Uses \`getWeekStartAndEnd()\` and \`areDatesEqual()\` to determine appropriate labeling
- **Progress Bar Integration**: Optional progress bar that visually represents weekly time completion level
- **Loading State Management**: Displays overlay spinner during data fetching for better user experience
- **Theme Compatibility**: Seamless integration with dark and light themes using proper color schemes
- **Internationalization**: Full i18n support with localized labels for different contexts

### Smart Labeling System

The component intelligently determines the appropriate label:
- **Current Week**: Shows "Worked This Week" when report dates match current week start/end
- **Custom Period**: Shows "Worked Over Period" when report dates represent a different time range

### Progress Calculation

The component calculates progress as: (week's worked time in seconds / 144,000 seconds) × 100
This provides a meaningful percentage that represents weekly progress toward a standard 40-hour work week target.

### Technical Implementation

The component uses the TeamsReportDisplayer base component with weekly duration data from the TeamsProvider context. It includes sophisticated date comparison logic to provide contextually appropriate labels and uses a fixed 40-hour maximum work target.
				`
			}
		}
	},
	argTypes: {
		showProgress: {
			control: 'boolean',
			description: 'Whether to show the progress bar below the worked time',
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
 * Default weekly worked time displayer with progress bar and intelligent labeling.
 * Shows week's worked time with smart date range detection and 40-hour target.
 */
export const Default: Story = {
	args: {
		showProgress: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsWeeklyWorkedTimeDisplayer component with progress bar enabled. Displays week\'s worked time in formatted format with intelligent labeling that switches between "Worked This Week" and "Worked Over Period" based on selected report dates, with progress against 40-hour target.'
			}
		}
	}
};

/**
 * Weekly worked time displayer without progress bar for minimal display.
 * Shows only the worked time without visual progress indicator.
 */
export const WithoutProgress: Story = {
	args: {
		showProgress: false
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsWeeklyWorkedTimeDisplayer with progress bar disabled (showProgress=false). Ideal for minimal layouts where only the worked time value is needed without visual progress indication against weekly targets, while maintaining smart date labeling.'
			}
		}
	}
};

/**
 * Weekly worked time displayer with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining intelligent labeling and time formatting.
 */
export const CustomStyling: Story = {
	args: {
		showProgress: true,
		className: 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsWeeklyWorkedTimeDisplayer with custom styling applied through the className prop. Features custom border and background colors while preserving all time display functionality, formatting, progress visualization against 40-hour target, and intelligent date range labeling.'
			}
		}
	}
};
