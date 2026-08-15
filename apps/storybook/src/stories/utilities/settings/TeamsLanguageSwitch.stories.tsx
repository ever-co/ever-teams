import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsLanguageSwitch } from '@ever-teams/atoms';

/**
 * TeamsLanguageSwitch provides internationalization functionality for Teams components.
 *
 * ## Features
 *
 * - **Language Selection**: Switch between supported languages (English, French)
 * - **Persistent Storage**: Saves language preference to localStorage
 * - **Context Integration**: Updates all Teams components in the same provider
 * - **Size Variants**: Multiple size options for different interface contexts
 * - **Label Option**: Optional label display for better UX
 * - **Icon Support**: Country flags for visual language identification
 * - **Automatic Detection**: Uses browser language or stored preference
 * - **Real-time Updates**: Immediate language switching without page reload
 *
 * ## Supported Languages
 *
 * - **English (en)**: Default language with US flag
 * - **French (fr)**: French language with French flag
 * - More to be added soon
 *
 * ## Size Variants
 *
 * - **Default**: Standard size for most interface contexts
 * - **Small**: Compact size for dense interfaces and toolbars
 * - **Large**: Prominent size for settings pages and configuration
 *
 * ## Use Cases
 *
 * - **Application Settings**: User preference panels and configuration
 * - **Navigation Bars**: Global language switching in headers
 * - **User Profiles**: Language preference in account settings
 * - **Onboarding**: Language selection during user registration
 * - **Admin Panels**: Multi-language support for administrative interfaces
 */
const meta: Meta<typeof TeamsLanguageSwitch> = {
	title: 'Utilities/Settings/Language Switch',
	component: TeamsLanguageSwitch,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsLanguageSwitch is a specialized select component that enables internationalization (i18n) for Teams components. It provides seamless language switching with persistent storage and real-time updates across all components within the same TeamsProvider context.

### Key Capabilities

- **Multi-language Support**: Currently supports English and French with extensible architecture
- **Persistent Preferences**: Automatically saves selected language to localStorage for future sessions
- **Context Integration**: Updates all Teams components simultaneously through the shared i18n context
- **Visual Identification**: Country flag icons for intuitive language recognition
- **Size Flexibility**: Three size variants (sm, default, lg) for different interface contexts
- **Optional Labeling**: Configurable label display for enhanced user experience

### Language Management

The component integrates with react-i18next and provides:
- Automatic language detection from browser settings
- Fallback to stored preferences in localStorage
- Real-time language switching without page reload
- Consistent translation updates across all Teams components

### Technical Implementation

Uses the \`changeTeamsLanguage()\` utility function to:
1. Update the i18next language setting
2. Store the preference in localStorage
3. Trigger re-rendering of all connected components

### Integration Requirements

- Must be used within a TeamsProvider context
- Requires i18next configuration with supported locales
- Translation files must be available for all supported languages

### Best Practices

- Place in global navigation or settings areas for easy access
- Use appropriate size variant for the interface context
- Include label when the purpose isn't immediately clear
- Test with all supported languages to ensure proper functionality
				`
			}
		}
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'default', 'lg'],
			description: 'Size variant of the language switch component',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'default' }
			}
		},
		label: {
			control: 'boolean',
			description: 'Whether to show the "Language Switch :" label',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
			}
		}
	}
} satisfies Meta<typeof TeamsLanguageSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default language switch without label for clean, minimal appearance.
 * Use in navigation bars or compact interface areas.
 */
export const Default: Story = {
	args: {
		size: 'default',
		label: false
	},
	parameters: {
		docs: {
			description: {
				story: 'The default language switch component without label. Ideal for navigation bars and compact interface areas where space is limited.'
			}
		}
	}
};

/**
 * Language switch with descriptive label for better user understanding.
 * Use in settings pages or when the purpose isn't immediately clear.
 */
export const WithLabel: Story = {
	args: {
		size: 'default',
		label: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Language switch with descriptive label for enhanced user experience. Use in settings pages or configuration panels where clarity is important.'
			}
		}
	}
};

/**
 * Small size language switch for compact interfaces and toolbars.
 * Use in dense layouts or secondary navigation areas.
 */
export const Small: Story = {
	args: {
		size: 'sm',
		label: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Small size language switch for compact interfaces, toolbars, and dense layouts where space conservation is important.'
			}
		}
	}
};

/**
 * Large size language switch for prominent placement in settings.
 * Use in configuration pages or onboarding flows.
 */
export const Large: Story = {
	args: {
		size: 'lg',
		label: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Large size language switch for prominent placement in settings pages, configuration panels, or onboarding flows.'
			}
		}
	}
};

/**
 * Small size with label for compact but descriptive interface.
 * Use when space is limited but clarity is still important.
 */
export const SmallWithLabel: Story = {
	args: {
		size: 'sm',
		label: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Small size language switch with label for compact but descriptive interface. Balances space efficiency with user clarity.'
			}
		}
	}
};
