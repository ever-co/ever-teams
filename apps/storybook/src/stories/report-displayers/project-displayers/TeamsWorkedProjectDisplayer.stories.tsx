import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsWorkedProjectDisplayer } from '@ever-teams/atoms';

/**
 * TeamsWorkedProjectDisplayer provides worked project count display with progress visualization.
 *
 * ## Features
 *
 * - **Project Count Display**: Shows number of projects worked on from statistics
 * - **Progress Calculation**: Progress based on worked projects vs total organization projects
 * - **Progress Visualization**: Optional progress bar showing project completion ratio
 * - **Loading States**: Shows loading overlay during data fetching
 * - **Card Layout**: Clean card-based design with dark/light theme support
 * - **Internationalization**: Full i18n support for labels and text
 * - **Custom Styling**: Support for additional CSS classes
 *
 * ## Data Source
 *
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Worked projects count from `statisticsCounts.projectsCount`
 * - Total organization projects from `organizationProjects.length`
 * - Loading states from `statisticsCountsLoading`
 * - Internationalized labels from react-i18next
 *
 * ## Use Cases
 *
 * - **Project Dashboards**: Showing worked project metrics
 * - **Project Monitoring**: Tracking project engagement levels
 * - **Performance Analytics**: Project participation indicators
 * - **Portfolio Management**: Visual project involvement summary
 * - **Resource Allocation**: Understanding project distribution across team
 */
const meta: Meta<typeof TeamsWorkedProjectDisplayer> = {
	title: 'Report Displayers/Project Displayers/Teams Worked Project Displayer',
	component: TeamsWorkedProjectDisplayer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsWorkedProjectDisplayer is a specialized display component that shows the count of projects worked on with progress visualization based on total available projects. It provides insights into project engagement and participation levels.

### Key Capabilities

- **Project Count Display**: Shows the number of projects that have been worked on with clear numerical presentation
- **Progress Calculation**: Automatically calculates progress percentage based on worked projects vs total organization projects
- **Progress Bar Integration**: Optional progress bar that visually represents project engagement level
- **Loading State Management**: Displays overlay spinner during data fetching for better user experience
- **Theme Compatibility**: Seamless integration with dark and light themes using proper color schemes
- **Internationalization**: Full i18n support with localized labels from the common translation namespace
- **Responsive Design**: Card-based layout that adapts to different screen sizes and contexts

### Progress Logic

The component calculates progress as: (worked projects / total organization projects) × 100
This provides a meaningful percentage that represents project engagement across the organization's available projects.

### Technical Implementation

The component uses the TeamsProjectDisplayer base component with project count data from the TeamsProvider context. It automatically handles the progress calculation and provides internationalized labels through react-i18next integration.

### Data Flow

The component retrieves worked project count from \`statisticsCounts.projectsCount\` and total projects from \`organizationProjects.length\`, then displays the count with the label from \`t('COMMON.project')\`.
				`
			}
		}
	},
	argTypes: {
		showProgress: {
			control: 'boolean',
			description: 'Whether to show the progress bar below the project count',
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
 * Default worked project displayer with progress bar and standard styling.
 * Shows worked project count with visual progress indicator.
 */
export const Default: Story = {
	args: {
		showProgress: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsWorkedProjectDisplayer component with progress bar enabled. Displays the count of worked projects with internationalized label, loading states, and visual progress indicator based on total organization projects.'
			}
		}
	}
};

/**
 * Worked project displayer without progress bar for minimal display.
 * Shows only the project count without visual progress indicator.
 */
export const WithoutProgress: Story = {
	args: {
		showProgress: false
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsWorkedProjectDisplayer with progress bar disabled (showProgress=false). Ideal for minimal layouts where only the project count value is needed without visual progress indication.'
			}
		}
	}
};

/**
 * Worked project displayer with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		showProgress: true,
		className: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsWorkedProjectDisplayer with custom styling applied through the className prop. Features custom border and background colors while preserving all project display functionality and progress visualization.'
			}
		}
	}
};
