import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Calendar } from '@ever-teams/toolkit-ui';
import type { CalendarProps } from '@ever-teams/toolkit-types';

/**
 * Calendar component provides a comprehensive date selection interface with flexible display options.
 *
 * ## Features
 *
 * - **Date Selection**: Single and multiple date selection capabilities
 * - **Month Navigation**: Easy navigation between months and years
 * - **Outside Days**: Configurable display of days from adjacent months
 * - **Accessibility**: Full keyboard navigation and screen reader support
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Localization**: Support for different locales and date formats
 * - **Custom Styling**: Flexible className prop for additional customization
 * - **Range Selection**: Support for date range selection (when configured)
 * - **Disabled Dates**: Ability to disable specific dates or date ranges
 *
 * ## Display Options
 *
 * - **Show Outside Days**: Display days from previous/next months for context
 * - **Hide Outside Days**: Clean view showing only current month days
 * - **Week Numbers**: Optional week number display
 * - **Multiple Months**: Display multiple months simultaneously
 *
 * ## Use Cases
 *
 * - **Date Pickers**: Form date selection and input fields
 * - **Event Scheduling**: Calendar views for appointments and events
 * - **Date Ranges**: Period selection for reports and filters
 * - **Availability**: Showing available/unavailable dates
 * - **Planning**: Project timelines and milestone planning
 */
const meta = {
	title: 'Foundation/Calendar',
	component: Calendar,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Calendar is a comprehensive date selection component that provides intuitive navigation and flexible display options. It's designed for various date-related interactions from simple date picking to complex scheduling interfaces.

### Key Capabilities

- **Flexible Date Selection**: Support for single dates, multiple dates, and date ranges
- **Navigation Controls**: Intuitive month/year navigation with keyboard support
- **Display Customization**: Configurable outside days, week numbers, and multiple month views
- **Accessibility First**: Full keyboard navigation, ARIA attributes, and screen reader support
- **Theme Compatibility**: Seamless integration with dark and light themes
- **Localization Ready**: Support for different locales, languages, and date formats

### Display Modes

The calendar supports various display configurations:
- **Outside Days**: Show/hide days from adjacent months for better context
- **Week Numbers**: Optional display of ISO week numbers
- **Multiple Months**: Display several months simultaneously for range selection
- **Custom Styling**: Flexible theming and custom CSS class support

### Interaction Patterns

- **Mouse Navigation**: Click to select dates, navigate months
- **Keyboard Navigation**: Arrow keys for date navigation, Enter/Space for selection
- **Touch Support**: Mobile-friendly touch interactions
- **Range Selection**: Click and drag or click start/end dates for ranges

### Integration

Works seamlessly with:
- Form libraries for date input validation
- Date picker components as the core calendar interface
- Event systems for appointment and scheduling applications
- Filter systems for date-based data filtering

### Best Practices

- Consider showing outside days for better month context
- Implement proper date validation and constraints
- Provide clear visual feedback for selected dates
- Test keyboard navigation thoroughly
- Ensure proper contrast for accessibility
- Use appropriate date formats for target locale
				`
			}
		}
	},
	argTypes: {
		showOutsideDays: {
			control: 'boolean',
			description: 'Whether to show days from adjacent months',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'true' }
			}
		},
		selected: {
			control: 'date',
			description: 'Currently selected date',
			table: {
				type: { summary: 'Date' }
			}
		},
		onSelect: {
			action: 'date-selected',
			description: 'Function called when a date is selected',
			table: {
				type: { summary: '(date: Date) => void' }
			}
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the calendar is disabled',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
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
} satisfies Meta<CalendarProps>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default calendar with outside days shown for better month context.
 * Provides full month view with adjacent month days for navigation clarity.
 */
export const Default: Story = {
	args: {
		showOutsideDays: true
	},
	parameters: {
		docs: {
			description: {
				story: 'The default calendar component with outside days visible. Shows days from adjacent months for better context and navigation clarity.'
			}
		}
	}
};

/**
 * Clean calendar view with only current month days displayed.
 * Provides focused view without adjacent month distractions.
 */
export const WithoutOutsideDays: Story = {
	args: {
		showOutsideDays: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Calendar with outside days hidden for a clean, focused view. Shows only the current month days without adjacent month distractions.'
			}
		}
	}
};

/**
 * Calendar with pre-selected date for form integration.
 * Shows how the calendar appears with an initial date selection.
 */
export const WithSelectedDate: Story = {
	args: {
		showOutsideDays: true,
		selected: new Date()
	},
	parameters: {
		docs: {
			description: {
				story: 'Calendar with a pre-selected date (today). Demonstrates how the calendar appears with an initial selection for form integration.'
			}
		}
	}
};

/**
 * Disabled calendar state for read-only or unavailable contexts.
 * Use when date selection should be temporarily unavailable.
 */
export const Disabled: Story = {
	args: {
		showOutsideDays: true,
		disabled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Disabled calendar state with reduced opacity and no interaction. Use when date selection should be temporarily unavailable.'
			}
		}
	}
};
