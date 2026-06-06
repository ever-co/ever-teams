import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@ever-teams/toolkit-ui';
import { ChevronLeft } from 'lucide-react';

/**
 * Button component provides a comprehensive set of interactive button variants for user actions.
 *
 * ## Features
 *
 * - **Multiple Variants**: Default, destructive, outline, secondary, ghost, and link styles
 * - **Size Options**: Small, default, large, and icon-specific sizing
 * - **Accessibility**: Full keyboard navigation and screen reader support
 * - **Theme Integration**: Seamless dark/light theme compatibility
 * - **Icon Support**: Built-in support for icons with proper spacing
 * - **Loading States**: Optional loading indicators for async actions
 * - **Disabled States**: Visual and functional disabled state handling
 * - **Custom Styling**: Flexible className prop for additional customization
 *
 * ## Variants
 *
 * - **Default**: Primary action button with solid background
 * - **Destructive**: Warning/danger actions with red styling
 * - **Outline**: Secondary actions with border styling
 * - **Secondary**: Subtle actions with muted background
 * - **Ghost**: Minimal styling for tertiary actions
 * - **Link**: Text-only styling that looks like a link
 *
 * ## Use Cases
 *
 * - **Primary Actions**: Form submissions, confirmations, main CTAs
 * - **Secondary Actions**: Cancel, back, alternative options
 * - **Navigation**: Links, menu items, breadcrumbs
 * - **Icon Actions**: Toolbar buttons, compact interfaces
 * - **Destructive Actions**: Delete, remove, dangerous operations
 */
const meta: Meta<typeof Button> = {
	title: 'Foundation/Button',
	component: Button,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Button is a fundamental UI component that provides consistent styling and behavior for user interactions. It supports multiple variants, sizes, and states to cover all common use cases in modern web applications.

### Key Capabilities

- **Comprehensive Variant System**: Six distinct visual styles (default, destructive, outline, secondary, ghost, link)
- **Flexible Sizing**: Four size options including specialized icon button sizing
- **Accessibility First**: Built-in ARIA attributes, keyboard navigation, and screen reader support
- **Theme Compatibility**: Seamless integration with dark and light themes
- **Icon Integration**: Proper spacing and alignment for icons with text or standalone
- **State Management**: Loading, disabled, and active states with appropriate visual feedback

### Styling System

The component uses a class-variance-authority (CVA) based styling system that provides:
- Consistent spacing and typography across all variants
- Proper color contrast for accessibility compliance
- Smooth transitions and hover effects
- Responsive design considerations

### Best Practices

- Use \`default\` variant for primary actions
- Use \`destructive\` for dangerous or irreversible actions
- Use \`outline\` or \`secondary\` for secondary actions
- Use \`ghost\` for subtle actions in dense interfaces
- Use \`link\` variant for navigation that should look like text links
- Use \`icon\` size for toolbar buttons and compact interfaces
				`
			}
		}
	},
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
			description: 'Visual style variant of the button',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'default' }
			}
		},
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg', 'icon'],
			description: 'Size variant of the button',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'default' }
			}
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the button is disabled',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		},
		children: {
			control: 'text',
			description: 'Button content (text, icons, or other elements)',
			table: {
				type: { summary: 'ReactNode' }
			}
		},
		onClick: {
			action: 'clicked',
			description: 'Function called when button is clicked',
			table: {
				type: { summary: '() => void' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes for custom styling',
			table: {
				type: { summary: 'string' }
			}
		}
	},
	// Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked
	args: { onClick: fn() }
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default button variant with solid background for primary actions.
 * Use for main call-to-action buttons and primary user interactions.
 */
export const Default: Story = {
	args: {
		variant: 'default',
		size: 'default',
		children: 'Default Button'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default button variant with solid background styling. Ideal for primary actions, form submissions, and main call-to-action buttons.'
			}
		}
	}
};

/**
 * Destructive button for dangerous or irreversible actions.
 * Use for delete operations, permanent changes, or warning actions.
 */
export const Destructive: Story = {
	args: {
		variant: 'destructive',
		size: 'default',
		children: 'Delete Item'
	},
	parameters: {
		docs: {
			description: {
				story: 'Destructive button variant with red styling for dangerous actions like delete, remove, or other irreversible operations.'
			}
		}
	}
};

/**
 * Outline button for secondary actions with border styling.
 * Use for alternative actions, cancel buttons, or secondary CTAs.
 */
export const Outline: Story = {
	args: {
		variant: 'outline',
		size: 'default',
		children: 'Cancel'
	},
	parameters: {
		docs: {
			description: {
				story: 'Outline button variant with border styling for secondary actions, cancel operations, or alternative choices.'
			}
		}
	}
};

/**
 * Secondary button with muted background for subtle actions.
 * Use for less prominent actions or supporting functionality.
 */
export const Secondary: Story = {
	args: {
		variant: 'secondary',
		size: 'default',
		children: 'Secondary Action'
	},
	parameters: {
		docs: {
			description: {
				story: 'Secondary button variant with muted background for less prominent actions and supporting functionality.'
			}
		}
	}
};

/**
 * Ghost button with minimal styling for tertiary actions.
 * Use in dense interfaces or for subtle interactive elements.
 */
export const Ghost: Story = {
	args: {
		variant: 'ghost',
		size: 'default',
		children: 'Ghost Button'
	},
	parameters: {
		docs: {
			description: {
				story: 'Ghost button variant with minimal styling for tertiary actions and subtle interactions in dense interfaces.'
			}
		}
	}
};

/**
 * Link-styled button that appears as text with underline.
 * Use for navigation or actions that should look like links.
 */
export const Link: Story = {
	args: {
		variant: 'link',
		size: 'default',
		children: 'Link Button'
	},
	parameters: {
		docs: {
			description: {
				story: 'Link button variant that appears as text with underline styling for navigation or actions that should look like links.'
			}
		}
	}
};

/**
 * Small size button for compact interfaces and secondary actions.
 * Use in toolbars, forms, or space-constrained layouts.
 */
export const Small: Story = {
	args: {
		variant: 'default',
		size: 'sm',
		children: 'Small Button'
	},
	parameters: {
		docs: {
			description: {
				story: 'Small size button variant for compact interfaces, toolbars, and space-constrained layouts.'
			}
		}
	}
};

/**
 * Large size button for prominent actions and hero sections.
 * Use for main CTAs, landing pages, or important actions.
 */
export const Large: Story = {
	args: {
		variant: 'default',
		size: 'lg',
		children: 'Large Button'
	},
	parameters: {
		docs: {
			description: {
				story: 'Large size button variant for prominent actions, hero sections, and important call-to-action buttons.'
			}
		}
	}
};

/**
 * Icon-only button for toolbar actions and compact interfaces.
 * Use for actions that can be represented clearly with just an icon.
 */
export const Icon: Story = {
	args: {
		variant: 'default',
		size: 'icon',
		children: <ChevronLeft className="h-4 w-4" />
	},
	parameters: {
		docs: {
			description: {
				story: 'Icon-only button variant for toolbar actions and compact interfaces where space is limited.'
			}
		}
	}
};

/**
 * Disabled button state showing non-interactive appearance.
 * Use to indicate unavailable actions or form validation states.
 */
export const Disabled: Story = {
	args: {
		variant: 'default',
		size: 'default',
		children: 'Disabled Button',
		disabled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Disabled button state with reduced opacity and no interaction. Use for unavailable actions or form validation states.'
			}
		}
	}
};
