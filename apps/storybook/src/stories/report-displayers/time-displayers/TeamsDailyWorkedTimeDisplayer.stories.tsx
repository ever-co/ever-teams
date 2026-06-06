import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsDailyWorkedTimeDisplayer } from '@ever-teams/atoms';

/**
 * TeamsDailyWorkedTimeDisplayer provides daily worked time display with progress visualization against 8-hour target.
 *
 * ## Features
 *
 * - **Daily Time Display**: Shows today's worked time in formatted time display
 * - **8-Hour Target**: Progress calculation against standard 8-hour workday
 * - **Time Formatting**: Uses formatTime utility for human-readable time display
 * - **Progress Visualization**: Optional progress bar showing daily completion
 * - **Loading States**: Shows loading overlay during data fetching
 * - **Card Layout**: Clean card-based design with dark/light theme support
 * - **Internationalization**: Full i18n support for labels and text
 * - **Custom Styling**: Support for additional CSS classes
 *
 * ## Data Source
 *
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Today's worked time from `statisticsCounts.todayDuration` (in seconds)
 * - Loading states from `statisticsCountsLoading`
 * - Internationalized labels from react-i18next
 *
 * ## Use Cases
 *
 * - **Daily Dashboards**: Showing today's time tracking progress
 * - **Time Monitoring**: Real-time daily time accumulation
 * - **Performance Analytics**: Daily productivity time indicators
 * - **Goal Tracking**: Progress toward daily time targets
 * - **Work-Life Balance**: Visual feedback on daily work hours
 */
const meta: Meta<typeof TeamsDailyWorkedTimeDisplayer> = {
	title: 'Report Displayers/Time Displayers/Teams Daily Worked Time Displayer',
	component: TeamsDailyWorkedTimeDisplayer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsDailyWorkedTimeDisplayer is a specialized display component that shows today's worked time with progress visualization against a standard 8-hour workday target. It provides real-time insights into daily time tracking progress with comprehensive formatting and theme integration.

### Key Capabilities

- **Formatted Time Display**: Shows today's worked time using the \`formatTime()\` utility for human-readable format (e.g., "2h 30m")
- **8-Hour Target Progress**: Automatically calculates progress percentage against standard 8-hour workday (28,800 seconds)
- **Progress Bar Integration**: Optional progress bar that visually represents daily time completion level
- **Loading State Management**: Displays overlay spinner during data fetching for better user experience
- **Theme Compatibility**: Seamless integration with dark and light themes using proper color schemes
- **Internationalization**: Full i18n support with localized labels from the report translation namespace
- **Responsive Design**: Card-based layout that adapts to different screen sizes and contexts

### Progress Calculation

The component calculates progress as: (today's worked time in seconds / 28,800 seconds) × 100
This provides a meaningful percentage that represents daily progress toward a standard 8-hour workday target.

### Technical Implementation

The component uses the TeamsReportDisplayer base component with today's duration data from the TeamsProvider context. It automatically handles time formatting and progress calculation with a fixed 8-hour maximum work target.

### Data Flow

The component retrieves today's worked time from \`statisticsCounts.todayDuration\` and displays it with the label from \`t('REPORT.worked_today')\`. The time is formatted using the \`formatTime()\` utility for consistent presentation.
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
 * Default daily worked time displayer with progress bar and 8-hour target.
 * Shows today's worked time with visual progress indicator.
 */
export const Default: Story = {
	args: {
		showProgress: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsDailyWorkedTimeDisplayer component with progress bar enabled. Displays today\'s worked time in formatted format with internationalized label, loading states, and visual progress indicator against 8-hour workday target.'
			}
		}
	}
};

/**
 * Daily worked time displayer without progress bar for minimal display.
 * Shows only the worked time without visual progress indicator.
 */
export const WithoutProgress: Story = {
	args: {
		showProgress: false
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsDailyWorkedTimeDisplayer with progress bar disabled (showProgress=false). Ideal for minimal layouts where only the worked time value is needed without visual progress indication against daily targets.'
			}
		}
	}
};

/**
 * Daily worked time displayer with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining time formatting and progress calculation.
 */
export const CustomStyling: Story = {
	args: {
		showProgress: true,
		className: 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsDailyWorkedTimeDisplayer with custom styling applied through the className prop. Features custom border and background colors while preserving all time display functionality, formatting, and progress visualization against 8-hour target.'
			}
		}
	}
};
