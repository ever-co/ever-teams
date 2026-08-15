import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsActiveTeamSelector } from '@ever-teams/atoms';

/**
 * TeamsActiveTeamSelector provides global team selection with member count display.
 * 
 * ## Features
 * 
 * - **Team Selection**: Select from organization teams with "All teams" option
 * - **Member Count Display**: Shows team member count in selection labels
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Custom Labeling**: Configurable label text for different contexts
 * - **Loading States**: Shows loading indicator while fetching team data
 * - **Global State**: Updates selectedTeam in global context
 * - **Internationalization**: Full i18n support for labels and placeholders
 * - **Custom Styling**: Support for additional CSS classes
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Organization teams list from API
 * - Current selected team state
 * - Loading states for team data
 * 
 * ## Use Cases
 * 
 * - **Team Management**: Switching between different teams for management tasks
 * - **Team Context**: Setting team context for data filtering and operations
 * - **Multi-team Workflows**: Selecting active team for collaborative work
 * - **Team Reporting**: Filtering reports and analytics by team
 * - **Administrative Controls**: Team-specific administrative actions
 */
const meta: Meta<typeof TeamsActiveTeamSelector> = {
	title: 'Inputs/Global Selectors/Teams Active Team Selector',
	component: TeamsActiveTeamSelector,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsActiveTeamSelector is a global selector component that enables team selection with intelligent member count display and comprehensive team management capabilities. It provides seamless team switching with "All teams" option for broader scope operations.

### Key Capabilities

- **Team Management**: Displays all organization teams with clear selection interface and member counts
- **All Teams Option**: Includes "All teams" option for comprehensive team-wide operations
- **Member Count Display**: Shows team member count in format "Team Name (X)" for better context
- **Custom Labeling**: Flexible label system allowing custom text for different use cases
- **Loading Handling**: Provides visual feedback during team data fetching
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **Global State Management**: Seamlessly updates selectedTeam across the entire application
- **Internationalization**: Full i18n support for placeholder text and labels

### Technical Implementation

The component integrates with the TeamsProvider context to access organization teams, loading states, and global team selection state. It provides intelligent team member counting and graceful fallback to "All teams" when no teams are available.
				`
			}
		}
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg'],
			description: 'Size variant of the select component',
			table: {
				type: { summary: "'default' | 'sm' | 'lg' | null" },
				defaultValue: { summary: "'default'" }
			}
		},
		label: {
			control: 'text',
			description: 'Custom label text to display above the select',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the select component',
			table: {
				type: { summary: 'string' },
				defaultValue: { summary: 'undefined' }
			}
		}
	},
	decorators: [
		(Story) => (
			<div style={{ width: '300px', height: '200px' }}>
				<Story />
			</div>
		)
	]
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default team selector without label, showing clean selection interface.
 * Displays team dropdown with "All teams" option and member counts.
 */
export const Default: Story = {
	args: {
		size: 'default'
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsActiveTeamSelector component without label. Shows the team selection dropdown with "All teams" option, member counts in team labels, loading states, and internationalized placeholder text.'
			}
		}
	}
};

/**
 * Team selector with custom label for enhanced context.
 * Provides clear identification of the selection purpose.
 */
export const WithLabel: Story = {
	args: {
		size: 'default',
		label: 'Select Team'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveTeamSelector with custom label text. Displays the specified label above the selection dropdown for clear visual identification and context, along with team member counts.'
			}
		}
	}
};

/**
 * Small-sized team selector optimized for compact layouts.
 * Maintains full functionality while taking up less space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm',
		label: 'Team'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveTeamSelector with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full team selection functionality and member count display.'
			}
		}
	}
};

/**
 * Large-sized team selector for prominent placement.
 * Provides enhanced visibility and easier interaction.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg',
		label: 'Choose Your Team'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveTeamSelector with large size variant (size="lg"). Perfect for prominent placement in main workflows, onboarding flows, or when team selection is a primary action.'
			}
		}
	}
};

/**
 * Team selector with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		size: 'default',
		label: 'Team',
		className: 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveTeamSelector with custom styling applied through the className prop. Features custom border and background colors while preserving all team selection functionality and member count display.'
			}
		}
	}
};
