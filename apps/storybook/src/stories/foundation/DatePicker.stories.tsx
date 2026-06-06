import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DatePicker } from '@ever-teams/toolkit-ui';

/**
 * DatePicker component provides an intuitive date selection interface with calendar popup.
 *
 * ## Features
 *
 * - **Calendar Integration**: Built-in calendar popup for date selection
 * - **Input Field**: Text input with date formatting and validation
 * - **Icon Support**: Optional calendar icon for visual clarity
 * - **Placeholder Text**: Customizable placeholder for empty states
 * - **Keyboard Support**: Full keyboard navigation and input
 * - **Date Formatting**: Automatic date formatting and parsing
 * - **Validation**: Built-in date validation and error handling
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Accessibility**: Screen reader support and ARIA attributes
 *
 * ## Input Modes
 *
 * - **Calendar Popup**: Click to open calendar for visual date selection
 * - **Direct Input**: Type dates directly with automatic formatting
 * - **Keyboard Navigation**: Arrow keys and shortcuts for date entry
 *
 * ## Use Cases
 *
 * - **Forms**: Birth dates, appointment scheduling, event dates
 * - **Filters**: Date range filters for data tables and reports
 * - **Booking**: Reservation systems and availability selection
 * - **Planning**: Project deadlines and milestone dates
 * - **Reporting**: Date selection for analytics and reports
 */
const meta: Meta<typeof DatePicker> = {
	title: 'Foundation/Date Picker',
	component: DatePicker,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
DatePicker combines a text input field with a calendar popup to provide flexible date selection. Users can either type dates directly or use the visual calendar interface for intuitive date picking.

### Key Capabilities

- **Dual Input Methods**: Support for both direct text input and visual calendar selection
- **Smart Formatting**: Automatic date formatting and parsing with validation
- **Calendar Integration**: Built-in calendar popup with month/year navigation
- **Icon Customization**: Optional calendar icon for enhanced visual clarity
- **Keyboard Friendly**: Full keyboard support for accessibility and power users
- **Validation Ready**: Built-in date validation with error state handling

### Interaction Patterns

- **Click to Open**: Click input field or icon to open calendar popup
- **Direct Typing**: Type dates directly with automatic formatting
- **Calendar Selection**: Click dates in calendar for visual selection
- **Keyboard Navigation**: Use arrow keys and Enter for date selection
- **Outside Click**: Click outside to close calendar popup

### Input Validation

The component provides:
- Automatic date format validation
- Invalid date detection and error states
- Range validation (when min/max dates are set)
- Required field validation support

### Accessibility Features

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- Focus management for popup interactions
- High contrast support for visual accessibility

### Best Practices

- Provide clear placeholder text indicating expected format
- Use calendar icon when space allows for better UX
- Implement proper validation and error messaging
- Consider date format based on user locale
- Test keyboard navigation thoroughly
- Ensure proper focus management in popup interactions
				`
			}
		}
	},
	argTypes: {
		placeholder: {
			control: 'text',
			description: 'Placeholder text displayed when no date is selected',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'Pick a date' }
			}
		},
		icon: {
			control: 'boolean',
			description: 'Whether to show the calendar icon',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'true' }
			}
		},
		date: {
			control: 'date',
			description: 'Currently selected date',
			table: {
				type: { summary: 'Date' }
			}
		},
		setDate: {
			action: 'date-changed',
			description: 'Function called when a date is selected',
			table: {
				type: { summary: '(date: Date | undefined) => void' }
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
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default date picker with calendar icon and standard placeholder.
 * The most common configuration for general date selection needs.
 */
export const Default: Story = {
	args: {
		placeholder: 'Pick a date'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default date picker with calendar icon and standard placeholder. Use for general date selection in forms and applications.'
			}
		}
	}
};

/**
 * Date picker without calendar icon for minimal, clean appearance.
 * Use when space is limited or for a more subtle interface.
 */
export const WithoutIcon: Story = {
	args: {
		placeholder: 'Choose a date',
		icon: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Date picker without calendar icon for a minimal, clean appearance. Use when space is limited or for subtle interface design.'
			}
		}
	}
};

/**
 * Date picker with custom placeholder text for specific contexts.
 * Use to provide context-specific guidance to users.
 */
export const CustomPlaceholder: Story = {
	args: {
		placeholder: 'Select your birthday'
	},
	parameters: {
		docs: {
			description: {
				story: 'Date picker with custom placeholder text for specific contexts. Provides clear guidance about the expected date type.'
			}
		}
	}
};

/**
 * Date picker with pre-selected date for form editing scenarios.
 * Shows how the component appears with an existing date value.
 */
export const WithSelectedDate: Story = {
	args: {
		placeholder: 'Pick a date',
		date: new Date()
	},
	parameters: {
		docs: {
			description: {
				story: 'Date picker with a pre-selected date (today). Demonstrates how the component appears with an existing value for form editing.'
			}
		}
	}
};
