import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsReportDatesRangePicker } from '@ever-teams/atoms';

/**
 * TeamsReportDatesRangePicker provides global date range selection for reports.
 *
 * ## Features
 *
 * - **Date Range Selection**: Interactive calendar-based date range picker
 * - **Global State**: Updates reportDates in global context for all reports
 * - **Dual Calendar**: Two-month calendar view for easy range selection
 * - **Visual Feedback**: Clear start/end date indicators with custom styling
 * - **Theme Integration**: Automatically adapts to current theme colors
 * - **Responsive Design**: Adaptive layout for different screen sizes
 * - **Date Formatting**: Human-readable date format display
 * - **Custom Styling**: Support for className prop for custom CSS styling
 * - **Labels**: Optional label prop for displaying text above the picker
 * - **Date Constraints**: minDate and maxDate props for limiting selectable dates
 * - **Disabled State**: Support for disabling the date picker
 *
 * ## Data Source
 *
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Current reportDates state from global context
 * - setReportDates function for updating global state
 * - Applied theme for visual customization
 *
 * ## Use Cases
 *
 * - **Report Generation**: Setting date ranges for all types of reports
 * - **Analytics Filtering**: Filtering analytics data by date range
 * - **Time Period Analysis**: Selecting specific time periods for analysis
 * - **Dashboard Context**: Setting global date context for dashboard widgets
 * - **Data Export**: Defining date ranges for data export operations
 */
const meta: Meta<typeof TeamsReportDatesRangePicker> = {
	title: 'Inputs/Global Selectors/Teams Report Dates Range Picker',
	component: TeamsReportDatesRangePicker,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsReportDatesRangePicker is a specialized global date range selector that provides comprehensive date range selection capabilities for report generation and data filtering. It wraps the TeamsDateRangePicker component with global state management for report dates.

### Key Capabilities

- **Global Date Management**: Seamlessly integrates with global reportDates state for consistent date ranges across all reports
- **Interactive Calendar**: Dual-month calendar interface for intuitive date range selection
- **Theme Integration**: Automatically adapts visual styling to match the current application theme
- **Visual Indicators**: Clear start and end date highlighting with custom colors and styling
- **Date Formatting**: Human-readable date format display (e.g., "Jan 01, 2024 - Jan 07, 2024")
- **Responsive Layout**: Adaptive design that works across different screen sizes and contexts
- **Custom Styling**: Support for className prop to apply custom CSS classes
- **Labels**: Optional label prop for displaying descriptive text above the picker
- **Date Constraints**: minDate and maxDate props for limiting the range of selectable dates
- **Disabled State**: Support for disabling the entire date picker component

### Props

| Prop | Type | Description |
|------|------|-------------|
| className | string | Optional CSS class name for custom styling |
| label | string | Optional label to display above the date range picker |
| disabled | boolean | Whether the date range picker is disabled |
| minDate | Date | Minimum selectable date |
| maxDate | Date | Maximum selectable date |
| size | 'default' \\| 'sm' \\| 'lg' \\| 'icon' | Size variant of the date range picker button |

### Technical Implementation

The component serves as a wrapper around TeamsDateRangePicker, connecting it to the global reportDates state from TeamsProvider context. It inherits all the functionality of the underlying date range picker while providing seamless integration with the global reporting system.

### Integration with Reports

This component is designed to work seamlessly with all report components in the system, providing a consistent date range selection experience that automatically updates all connected reports and analytics when the date range changes.
				`
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Optional CSS class name for custom styling',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		label: {
			control: 'text',
			description: 'Optional label to display above the date range picker',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the date range picker is disabled',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		},
		minDate: {
			control: 'date',
			description: 'Minimum selectable date',
			table: {
				type: { summary: 'Date' },
				defaultValue: { summary: 'undefined' }
			}
		},
		maxDate: {
			control: 'date',
			description: 'Maximum selectable date',
			table: {
				type: { summary: 'Date' },
				defaultValue: { summary: 'undefined' }
			}
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'icon'],
			description: 'Size variant of the date range picker button',
			table: {
				type: { summary: "'default' | 'sm' | 'lg' | 'icon'" },
				defaultValue: { summary: 'default' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default report dates range picker with full functionality.
 * Shows the complete date range selection interface for reports.
 */
export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsReportDatesRangePicker component with full date range selection functionality. Displays an interactive calendar interface for selecting date ranges that automatically updates the global reportDates state for all connected reports and analytics.'
			}
		}
	}
};

/**
 * Report dates range picker with a label.
 * Demonstrates the label prop for displaying descriptive text above the picker.
 */
export const WithLabel: Story = {
	args: {
		label: 'Select Report Period'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker with a label displayed above the date picker. The label prop allows you to add descriptive text to help users understand the purpose of the date selection.'
			}
		}
	}
};

/**
 * Report dates range picker with custom className.
 * Demonstrates the className prop for custom styling via CSS classes.
 */
export const CustomStyling: Story = {
	args: {
		className: 'p-4 bg-gray-100 rounded-lg'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker demonstrating custom styling via the className prop. You can apply any CSS classes to customize the appearance of the component wrapper.'
			}
		}
	}
};

/**
 * Disabled report dates range picker.
 * Shows how the component appears when disabled.
 */
export const Disabled: Story = {
	args: {
		disabled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker in a disabled state. The date picker button is non-interactive and displays a muted appearance.'
			}
		}
	}
};

/**
 * Report dates range picker with date constraints.
 * Shows how to limit selectable dates using minDate and maxDate.
 */
export const WithDateConstraints: Story = {
	args: {
		label: 'Select dates within range',
		minDate: new Date(new Date().setDate(new Date().getDate() - 30)),
		maxDate: new Date()
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker with date constraints. The minDate and maxDate props limit the selectable date range, useful for restricting selection to valid periods.'
			}
		}
	}
};

/**
 * Small size variant of the date range picker.
 * Demonstrates the size prop with "sm" value.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm',
		label: 'Compact Date Picker'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker with small size variant. Useful for compact UI layouts where space is limited.'
			}
		}
	}
};

/**
 * Large size variant of the date range picker.
 * Demonstrates the size prop with "lg" value.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg',
		label: 'Large Date Picker'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker with large size variant. Useful for prominent date selection interfaces.'
			}
		}
	}
};

export const WithContainerClassName: Story = {
	args: {
		containerClassName: 'bg-gray-100 w-[250px] dark:bg-black p-4 rounded-md',
		label: 'Select Report Period'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsReportDatesRangePicker with custom styling applied through the containerClassName prop. Features enhanced visual design with gradient background, custom borders, and shadow effects while preserving all filtering functionality.'
			}
		}
	}
};
