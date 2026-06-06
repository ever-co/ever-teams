import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Progress } from '@ever-teams/toolkit-ui';

/**
 * Progress component provides visual feedback for task completion and loading states.
 *
 * ## Features
 *
 * - **Value Display**: Numeric progress representation from 0 to 100
 * - **Visual Feedback**: Animated progress bar with smooth transitions
 * - **Accessibility**: ARIA attributes for screen reader support
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Custom Styling**: Flexible className prop for color and size customization
 * - **Responsive Design**: Adapts to container width and different screen sizes
 * - **Animation Support**: Smooth transitions between progress values
 * - **Indeterminate State**: Support for unknown progress scenarios
 *
 * ## Progress States
 *
 * - **Determinate**: Known progress value (0-100%)
 * - **Indeterminate**: Unknown progress (loading animation)
 * - **Complete**: 100% progress with completion styling
 * - **Error**: Error state with appropriate visual feedback
 *
 * ## Use Cases
 *
 * - **File Uploads**: Show upload progress and completion status
 * - **Form Completion**: Multi-step form progress indication
 * - **Loading States**: Data fetching and processing feedback
 * - **Goal Tracking**: Achievement and target progress display
 * - **Task Management**: Project completion and milestone tracking
 */
const meta: Meta<typeof Progress> = {
	title: 'Foundation/Progress',
	component: Progress,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Progress is a visual indicator component that shows the completion status of tasks, processes, or goals. It provides clear feedback to users about ongoing operations and achievement levels.

### Key Capabilities

- **Percentage Display**: Visual representation of progress from 0% to 100%
- **Smooth Animations**: Fluid transitions between progress values for better UX
- **Accessibility Support**: Built-in ARIA attributes and screen reader compatibility
- **Theme Integration**: Consistent styling with dark and light theme support
- **Custom Styling**: Flexible color and size customization through className prop
- **Responsive Design**: Adapts to different container sizes and screen dimensions

### Visual Design

The component features:
- Clean, modern progress bar design
- Smooth fill animation with appropriate timing
- Clear visual distinction between completed and remaining progress
- Consistent spacing and proportions
- High contrast for accessibility compliance

### Progress Values

- **0-100**: Standard percentage values for determinate progress
- **Smooth Transitions**: Animated changes between values
- **Completion States**: Special styling for 100% completion
- **Custom Colors**: Override default colors through className prop

### Accessibility Features

- Proper ARIA role and attributes
- Screen reader announcements for progress changes
- High contrast support for visual accessibility
- Keyboard navigation support where applicable

### Best Practices

- Use for operations that take more than a few seconds
- Provide clear context about what is progressing
- Update progress values smoothly, not in large jumps
- Consider adding percentage text for precise feedback
- Use appropriate colors for different contexts (success, warning, error)
- Test with screen readers for accessibility compliance
				`
			}
		}
	},
	argTypes: {
		value: {
			control: { type: 'range', min: 0, max: 100, step: 1 },
			description: 'Progress value as a percentage (0-100)',
			table: {
				type: { summary: 'number' },
				defaultValue: { summary: '0' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes for custom styling',
			table: {
				type: { summary: 'string' }
			}
		},
		max: {
			control: 'number',
			description: 'Maximum value for progress calculation',
			table: {
				type: { summary: 'number' },
				defaultValue: { summary: '100' }
			}
		}
	}
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default progress bar showing 50% completion.
 * Standard progress indicator for general use cases.
 */
export const Default: Story = {
	args: {
		value: 50
	},
	parameters: {
		docs: {
			description: {
				story: 'The default progress component showing 50% completion. Use for general progress indication in forms, uploads, and task completion.'
			}
		}
	}
};

/**
 * Progress bar at the beginning of a task (10% completion).
 * Shows how the component appears in early stages.
 */
export const LowProgress: Story = {
	args: {
		value: 10
	},
	parameters: {
		docs: {
			description: {
				story: 'Progress bar showing 10% completion. Demonstrates how the component appears in the early stages of a task or process.'
			}
		}
	}
};

/**
 * Progress bar showing significant completion (75%).
 * Indicates a task that is mostly finished.
 */
export const HighProgress: Story = {
	args: {
		value: 75
	},
	parameters: {
		docs: {
			description: {
				story: 'Progress bar showing 75% completion. Indicates a task that is mostly finished and nearing completion.'
			}
		}
	}
};

/**
 * Completed progress bar (100%) showing task completion.
 * Final state indicating successful completion.
 */
export const Complete: Story = {
	args: {
		value: 100
	},
	parameters: {
		docs: {
			description: {
				story: 'Completed progress bar at 100%. Shows the final state indicating successful task completion.'
			}
		}
	}
};

/**
 * Progress bar with custom styling for different contexts.
 * Example of color customization for specific use cases.
 */
export const CustomStyling: Story = {
	args: {
		value: 60,
		className: 'h-3 bg-gradient-to-r from-blue-500 to-purple-500'
	},
	parameters: {
		docs: {
			description: {
				story: 'Progress bar with custom styling including height and gradient colors. Demonstrates customization capabilities for specific design requirements.'
			}
		}
	}
};

/**
 * Empty progress bar (0%) showing initial state.
 * Starting point before any progress has been made.
 */
export const Empty: Story = {
	args: {
		value: 0
	},
	parameters: {
		docs: {
			description: {
				story: 'Empty progress bar at 0%. Shows the initial state before any progress has been made on a task or process.'
			}
		}
	}
};
