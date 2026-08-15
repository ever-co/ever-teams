import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Select } from '@ever-teams/toolkit-ui';

/**
 * Select component provides a dropdown selection interface with comprehensive options and state management.
 *
 * ## Features
 *
 * - **Multiple Options**: Support for extensive option lists with labels and values
 * - **Icon Support**: Built-in icon display for enhanced visual identification
 * - **Loading States**: Loading indicators for async data fetching
 * - **Disabled States**: Individual option and component-level disabled states
 * - **Placeholder Support**: Customizable placeholder text for empty states
 * - **Size Variants**: Multiple size options for different interface contexts
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Accessibility**: Full keyboard navigation and screen reader support
 * - **Custom Styling**: Flexible className prop for additional customization
 *
 * ## Size Variants
 *
 * - **Default**: Standard size for most form contexts
 * - **Small**: Compact size for dense interfaces and toolbars
 * - **Large**: Prominent size for important selections
 *
 * ## Use Cases
 *
 * - **Forms**: User preferences, categories, status selection
 * - **Filters**: Data filtering and sorting options
 * - **Navigation**: Menu selections and routing options
 * - **Configuration**: Settings panels and option selection
 * - **Data Entry**: Predefined value selection in forms
 */
const meta: Meta<typeof Select> = {
	title: 'Foundation/Select',
	component: Select,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Select is a comprehensive dropdown component that provides intuitive option selection with support for icons, loading states, and various sizing options. It's designed for consistent user experience across different contexts.

### Key Capabilities

- **Rich Option Support**: Options with labels, values, and optional icons for enhanced visual identification
- **State Management**: Loading, disabled, and selection states with appropriate visual feedback
- **Size Flexibility**: Three size variants (sm, default, lg) for different interface contexts
- **Accessibility First**: Full keyboard navigation, ARIA attributes, and screen reader support
- **Theme Compatibility**: Seamless integration with dark and light themes
- **Icon Integration**: Built-in support for option icons with proper spacing and alignment

### Option Structure

Options are provided as an array of objects with the following structure:
- \`label\`: Display text for the option
- \`value\`: Actual value used for selection
- \`icon\`: Optional icon identifier for visual enhancement

### Styling System

The component uses consistent styling that provides:
- Clean dropdown appearance with proper spacing
- Clear selection indicators and hover states
- Smooth animations for opening/closing
- Responsive design for different screen sizes
- Proper color contrast for accessibility

### Best Practices

- Provide clear, descriptive labels for all options
- Use icons consistently when they add value
- Implement loading states for async data
- Group related options when dealing with large lists
- Ensure proper keyboard navigation support
- Test with screen readers for accessibility
				`
			}
		}
	},
	argTypes: {
		values: {
			control: 'object',
			description: 'Array of option objects with label, value, and optional icon',
			table: {
				type: { summary: 'Array<{label: string, value: string, icon?: string}>' }
			}
		},
		placeholder: {
			control: 'text',
			description: 'Placeholder text displayed when no option is selected',
			table: {
				type: { summary: 'string' }
			}
		},
		size: {
			control: 'select',
			options: ['sm', 'default', 'lg'],
			description: 'Size variant of the select component',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'default' }
			}
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the select is disabled',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		},
		loading: {
			control: 'boolean',
			description: 'Whether the select is in loading state',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		},
		value: {
			control: 'text',
			description: 'Currently selected value',
			table: {
				type: { summary: 'string' }
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
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleOptions = [
	{ label: 'Option 1', value: 'option1' },
	{ label: 'Option 2', value: 'option2' },
	{ label: 'Option 3', value: 'option3' },
	{ label: 'Option 4', value: 'option4' }
];

const optionsWithIcons = [
	{ label: 'United States', value: 'us', icon: 'us' },
	{ label: 'France', value: 'fr', icon: 'fr' },
	{ label: 'Germany', value: 'de', icon: 'de' },
	{ label: 'Japan', value: 'jp', icon: 'jp' }
];

/**
 * Default select component with basic options for general selection needs.
 * The most common select variant for standard form fields.
 */
export const Default: Story = {
	args: {
		placeholder: 'Select an option...',
		values: sampleOptions
	},
	parameters: {
		docs: {
			description: {
				story: 'The default select component with basic options. Use for standard form fields, filters, and general option selection.'
			}
		}
	}
};

/**
 * Select with icons for enhanced visual identification of options.
 * Use when options benefit from visual representation like countries or categories.
 */
export const WithIcons: Story = {
	args: {
		placeholder: 'Select a country...',
		values: optionsWithIcons
	},
	parameters: {
		docs: {
			description: {
				story: 'Select component with icons for enhanced visual identification. Use for countries, categories, or any options that benefit from visual representation.'
			}
		}
	}
};

/**
 * Small size select for compact interfaces and dense layouts.
 * Use in toolbars, table filters, or space-constrained areas.
 */
export const Small: Story = {
	args: {
		placeholder: 'Select...',
		values: sampleOptions,
		size: 'sm'
	},
	parameters: {
		docs: {
			description: {
				story: 'Small size select variant for compact interfaces, toolbars, and space-constrained layouts.'
			}
		}
	}
};

/**
 * Large size select for prominent selections and important choices.
 * Use for main configuration options or primary form fields.
 */
export const Large: Story = {
	args: {
		placeholder: 'Select an important option...',
		values: sampleOptions,
		size: 'lg'
	},
	parameters: {
		docs: {
			description: {
				story: 'Large size select variant for prominent selections and important choices in forms or configuration panels.'
			}
		}
	}
};

/**
 * Loading state select showing spinner while fetching options.
 * Use when options are loaded asynchronously from an API.
 */
export const Loading: Story = {
	args: {
		placeholder: 'Loading options...',
		values: [],
		loading: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Loading state select with spinner indicator. Use when options are being fetched asynchronously from an API or database.'
			}
		}
	}
};

/**
 * Disabled select state showing non-interactive appearance.
 * Use to indicate unavailable selections or read-only data.
 */
export const Disabled: Story = {
	args: {
		placeholder: 'Disabled select...',
		values: sampleOptions,
		disabled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Disabled select state with reduced opacity and no interaction. Use for unavailable selections or read-only data display.'
			}
		}
	}
};
