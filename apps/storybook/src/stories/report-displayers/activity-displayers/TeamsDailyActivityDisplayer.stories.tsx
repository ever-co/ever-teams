import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsDailyActivityDisplayer } from '@ever-teams/atoms';

/**
 * TeamsDailyActivityDisplayer provides daily activity percentage display with progress visualization.
 *
 * ## Features
 *
 * - **Daily Activity Metrics**: Displays today's activity percentage from statistics
 * - **Progress Visualization**: Optional progress bar showing activity completion
 * - **Loading States**: Shows loading overlay during data fetching
 * - **Card Layout**: Clean card-based design with dark/light theme support
 * - **Internationalization**: Full i18n support for labels and text
 * - **Custom Styling**: Support for additional CSS classes
 *
 * ## Data Source
 *
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Today's activity percentage from `statisticsCounts.todayActivities`
 * - Loading states from `statisticsCountsLoading`
 * - Internationalized labels from react-i18next
 *
 * ## Use Cases
 *
 * - **Daily Dashboards**: Showing today's productivity metrics
 * - **Activity Monitoring**: Real-time activity percentage tracking
 * - **Performance Analytics**: Daily activity performance indicators
 * - **Productivity Reports**: Today's activity summary displays
 * - **User Engagement**: Visual feedback on daily activity levels
 */
const meta: Meta<typeof TeamsDailyActivityDisplayer> = {
	title: 'Report Displayers/Activity Displayers/Teams Daily Activity Displayer',
	component: TeamsDailyActivityDisplayer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsDailyActivityDisplayer is a specialized display component that shows today's activity percentage with optional progress visualization. It provides real-time insights into daily productivity metrics with comprehensive loading states and theme integration.

### Key Capabilities

- **Activity Percentage Display**: Shows today's activity as a percentage value with clear visual presentation
- **Progress Bar Integration**: Optional progress bar that visually represents activity completion level
- **Loading State Management**: Displays overlay spinner during data fetching for better user experience
- **Theme Compatibility**: Seamless integration with dark and light themes using proper color schemes
- **Internationalization**: Full i18n support with localized labels and text content
- **Responsive Design**: Card-based layout that adapts to different screen sizes and contexts

### Technical Implementation

The component uses the TeamsActivityDisplayer base component with today's activity data from the TeamsProvider context. It automatically handles loading states and provides internationalized labels through react-i18next integration.

### Data Flow

The component retrieves today's activity percentage from \`statisticsCounts.todayActivities\` and displays it with the label from \`t('REPORT.today_activity')\`. Loading states are managed through \`statisticsCountsLoading\` to provide visual feedback during data updates.
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
 * Default daily activity displayer with progress bar and standard styling.
 * Shows today's activity percentage with visual progress indicator.
 */
export const Default: Story = {
	args: {
		showProgress: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsDailyActivityDisplayer component with progress bar enabled. Displays today\'s activity percentage with internationalized label, loading states, and visual progress indicator.'
			}
		}
	}
};

/**
 * Daily activity displayer without progress bar for minimal display.
 * Shows only the activity percentage without visual progress indicator.
 */
export const WithoutProgress: Story = {
	args: {
		showProgress: false
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsDailyActivityDisplayer with progress bar disabled (showProgress=false). Ideal for minimal layouts where only the activity percentage value is needed without visual progress indication.'
			}
		}
	}
};

/**
 * Daily activity displayer with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		showProgress: true,
		className: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsDailyActivityDisplayer with custom styling applied through the className prop. Features custom border and background colors while preserving all activity display functionality and progress visualization.'
			}
		}
	}
};
