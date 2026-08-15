import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DateRangePicker } from '@ever-teams/toolkit-ui';

/**
 * DateRangePicker component provides an intuitive interface for selecting date ranges with dual calendar support.
 *
 * ## Features
 *
 * - **Range Selection**: Select start and end dates for comprehensive date ranges
 * - **Dual Calendar**: Side-by-side calendar display for easy range selection
 * - **Input Fields**: Text inputs for direct date entry with validation
 * - **Visual Feedback**: Clear indication of selected range with highlighting
 * - **Preset Ranges**: Quick selection options for common date ranges
 * - **Validation**: Built-in validation for logical date range constraints
 * - **Keyboard Support**: Full keyboard navigation and input capabilities
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Accessibility**: Screen reader support and ARIA attributes
 *
 * ## Selection Modes
 *
 * - **Click Selection**: Click start date, then end date for range selection
 * - **Drag Selection**: Click and drag across dates for quick range selection
 * - **Input Entry**: Type dates directly into start and end input fields
 * - **Preset Selection**: Choose from predefined ranges (last 7 days, month, etc.)
 *
 * ## Use Cases
 *
 * - **Analytics**: Date range selection for reports and data analysis
 * - **Booking**: Check-in and check-out date selection for reservations
 * - **Filtering**: Date range filters for data tables and search results
 * - **Planning**: Project timeline and milestone date range selection
 * - **Reporting**: Period selection for financial and performance reports
 */
const meta: Meta<typeof DateRangePicker> = {
	title: 'Foundation/Date Range Picker',
	component: DateRangePicker,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
DateRangePicker provides a comprehensive solution for selecting date ranges with both visual calendar interface and direct text input capabilities. It's designed for scenarios where users need to specify a period or duration.

### Key Capabilities

- **Dual Date Selection**: Intuitive start and end date selection with visual feedback
- **Multiple Input Methods**: Support for calendar selection, direct typing, and preset ranges
- **Range Validation**: Automatic validation ensuring end date is after start date
- **Visual Range Display**: Clear highlighting of selected date range in calendar
- **Flexible Formatting**: Customizable date format display and parsing
- **Preset Options**: Quick selection for common ranges (today, last week, last month, etc.)

### Interaction Patterns

- **Calendar Selection**: Click start date, then end date to define range
- **Drag Selection**: Click and drag across calendar dates for quick range selection
- **Input Fields**: Type dates directly with automatic formatting and validation
- **Preset Buttons**: One-click selection for common date ranges
- **Keyboard Navigation**: Arrow keys and shortcuts for accessibility

### Range Validation

The component provides:
- Automatic start/end date validation
- Minimum and maximum date constraints
- Invalid range detection and error states
- Required field validation support
- Custom validation rule integration

### Accessibility Features

- Proper ARIA labels and descriptions for range selection
- Keyboard navigation support for all interactive elements
- Screen reader announcements for range changes
- Focus management for complex popup interactions
- High contrast support for visual accessibility

### Best Practices

- Provide clear labels for start and end date inputs
- Use preset ranges for common selections to improve UX
- Implement proper validation with clear error messaging
- Consider date format based on user locale and preferences
- Test keyboard navigation and screen reader compatibility
- Ensure proper focus management in popup interactions
				`
			}
		}
	},
	argTypes: {
		date: {
			control: 'object',
			description: 'Currently selected date range with from and to dates',
			table: {
				type: { summary: 'DateRange' }
			}
		},
		setDate: {
			action: 'range-changed',
			description: 'Function called when a date range is selected',
			table: {
				type: { summary: '(range: DateRange | undefined) => void' }
			}
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'icon'],
			description: 'Size variant of the date range picker',
			table: {
				type: { summary: "'default' | 'sm' | 'lg' | 'icon'" },
				defaultValue: { summary: 'default' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes for custom styling',
			table: {
				type: { summary: 'string' }
			}
		}
	}
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default date range picker for general range selection needs.
 * Standard configuration for most date range selection scenarios.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default date range picker component for general range selection. Use for analytics, reporting, and filtering scenarios.'
			}
		}
	}
};

/**
 * Small size date range picker for compact layouts.
 * Provides a more compact interface for space-constrained designs.
 */
export const Small: Story = {
	args: {
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: 'Small size date range picker for compact layouts and space-constrained designs.'
			}
		}
	}
};

/**
 * Date range picker with pre-selected range for editing scenarios.
 * Shows how the component appears with existing range values.
 */
export const WithSelectedRange: Story = {
	args: {
		size: 'default',
		date: {
			from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
			to: new Date() // today
		}
	},
	parameters: {
		docs: {
			description: {
				story: 'Date range picker with a pre-selected range (last 7 days). Demonstrates how the component appears with existing values for editing scenarios.'
			}
		}
	}
};
