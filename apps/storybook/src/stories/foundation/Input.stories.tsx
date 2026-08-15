import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '@ever-teams/toolkit-ui';

/**
 * Input component provides a consistent text input field with comprehensive styling and state management.
 *
 * ## Features
 *
 * - **Flexible Input Types**: Text, email, password, number, and other HTML input types
 * - **State Management**: Focus, disabled, error, and validation states
 * - **Accessibility**: Full ARIA support and keyboard navigation
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Placeholder Support**: Built-in placeholder text functionality
 * - **Custom Styling**: Flexible className prop for additional customization
 * - **Form Integration**: Works seamlessly with form libraries and validation
 * - **Responsive Design**: Adapts to different screen sizes and containers
 *
 * ## Input Types
 *
 * - **Text**: Standard text input for general text entry
 * - **Email**: Email input with built-in validation
 * - **Password**: Password input with hidden text
 * - **Number**: Numeric input with number validation
 * - **Search**: Search input with appropriate styling
 * - **URL**: URL input with validation
 * - **Tel**: Telephone number input
 *
 * ## Use Cases
 *
 * - **Forms**: User registration, login, contact forms
 * - **Search**: Search bars and filter inputs
 * - **Data Entry**: Configuration panels, settings forms
 * - **User Profiles**: Profile editing and account management
 * - **Content Creation**: Text editors, comment forms
 */
const meta: Meta<typeof Input> = {
	title: 'Foundation/Input',
	component: Input,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Input is a fundamental form component that provides consistent styling and behavior for text input fields. It supports various input types, states, and accessibility features for comprehensive form building.

### Key Capabilities

- **Multiple Input Types**: Support for text, email, password, number, search, URL, and telephone inputs
- **State Management**: Visual feedback for focus, disabled, error, and validation states
- **Accessibility First**: Built-in ARIA attributes, proper labeling, and keyboard navigation
- **Theme Compatibility**: Seamless integration with dark and light themes
- **Form Integration**: Works with popular form libraries like React Hook Form and Formik
- **Validation Ready**: Easy integration with validation libraries and custom validation logic

### Styling System

The component uses consistent styling that provides:
- Clean, modern appearance with proper spacing
- Clear focus indicators for accessibility
- Smooth transitions between states
- Responsive design for different screen sizes
- Proper color contrast for readability

### Best Practices

- Always provide meaningful placeholder text
- Use appropriate input types for better mobile experience
- Implement proper validation and error messaging
- Ensure labels are properly associated with inputs
- Consider using autocomplete attributes for better UX
- Test with keyboard navigation and screen readers
				`
			}
		}
	},
	argTypes: {
		type: {
			control: 'select',
			options: ['text', 'email', 'password', 'number', 'search', 'url', 'tel'],
			description: 'HTML input type attribute',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'text' }
			}
		},
		placeholder: {
			control: 'text',
			description: 'Placeholder text displayed when input is empty',
			table: {
				type: { summary: 'string' }
			}
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the input is disabled',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		},
		value: {
			control: 'text',
			description: 'Current value of the input',
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
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default text input for general text entry and form fields.
 * The most common input variant for user text input.
 */
export const Default: Story = {
	args: {
		placeholder: 'Enter text...'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default text input component for general text entry. Use for names, titles, descriptions, and other text-based form fields.'
			}
		}
	}
};

/**
 * Email input with built-in validation and appropriate mobile keyboard.
 * Use for email address collection and user authentication.
 */
export const Email: Story = {
	args: {
		type: 'email',
		placeholder: 'Enter your email...'
	},
	parameters: {
		docs: {
			description: {
				story: 'Email input type with built-in validation and optimized mobile keyboard. Use for email collection, login forms, and contact information.'
			}
		}
	}
};

/**
 * Password input with hidden text for secure data entry.
 * Use for passwords, PINs, and other sensitive information.
 */
export const Password: Story = {
	args: {
		type: 'password',
		placeholder: 'Enter password...'
	},
	parameters: {
		docs: {
			description: {
				story: 'Password input type with hidden text display for secure data entry. Use for passwords, PINs, and sensitive information.'
			}
		}
	}
};

/**
 * Number input with numeric validation and spinner controls.
 * Use for quantities, ages, prices, and other numeric data.
 */
export const Number: Story = {
	args: {
		type: 'number',
		placeholder: 'Enter number...'
	},
	parameters: {
		docs: {
			description: {
				story: 'Number input type with numeric validation and spinner controls. Use for quantities, ages, prices, and other numeric data entry.'
			}
		}
	}
};

/**
 * Search input optimized for search functionality.
 * Use for search bars, filters, and query inputs.
 */
export const Search: Story = {
	args: {
		type: 'search',
		placeholder: 'Search...'
	},
	parameters: {
		docs: {
			description: {
				story: 'Search input type optimized for search functionality with appropriate styling and behavior. Use for search bars and filter inputs.'
			}
		}
	}
};

/**
 * Disabled input state showing non-interactive appearance.
 * Use to indicate unavailable fields or read-only data.
 */
export const Disabled: Story = {
	args: {
		placeholder: 'Disabled input...',
		disabled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Disabled input state with reduced opacity and no interaction. Use for unavailable fields or read-only data display.'
			}
		}
	}
};
