import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsActiveEmployeeSelector } from '@ever-teams/atoms';

/**
 * TeamsActiveEmployeeSelector provides global employee selection with permission-based visibility.
 * 
 * ## Features
 * 
 * - **Employee Selection**: Select from organization members with "All employees" option
 * - **Permission-based Visibility**: Only visible to users with CHANGE_SELECTED_EMPLOYEE permission
 * - **Size Variants**: Support for default, small, and large sizes
 * - **Optional Labeling**: Configurable label with Users icon
 * - **Loading States**: Shows loading indicator while fetching member data
 * - **Global State**: Updates selectedEmployee in global context
 * - **Custom Styling**: Support for additional CSS classes
 * 
 * ## Data Source
 * 
 * This component gets its data from the `useTeamsContext()` hook, which provides:
 * - Organization members list from API
 * - Current selected employee state
 * - User permissions for visibility control
 * - Loading states for member data
 * 
 * ## Use Cases
 * 
 * - **Multi-user Management**: Selecting active employee for managers and admins
 * - **Employee Filtering**: Filtering data and reports by specific employee
 * - **Delegation Workflows**: Managing work on behalf of other employees
 * - **Administrative Controls**: Employee-specific administrative actions
 * - **Reporting Context**: Setting employee context for reports and analytics
 */
const meta: Meta<typeof TeamsActiveEmployeeSelector> = {
	title: 'Inputs/Global Selectors/Teams Active Employee Selector',
	component: TeamsActiveEmployeeSelector,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
TeamsActiveEmployeeSelector is a permission-controlled global selector component that enables employee selection for users with appropriate administrative privileges. It provides comprehensive employee management capabilities with intelligent permission handling.

### Key Capabilities

- **Permission Control**: Automatically hides for users without CHANGE_SELECTED_EMPLOYEE permission
- **Employee Management**: Displays all organization members with "All employees" option for comprehensive filtering
- **Icon Integration**: Optional labeled mode with Users icon for clear visual identification
- **Loading Handling**: Provides visual feedback during member data fetching
- **Size Flexibility**: Supports multiple size variants for different UI contexts
- **Global State Management**: Seamlessly updates selectedEmployee across the entire application
- **Custom Styling**: Flexible className support for visual customization

### Permission System

The component implements a sophisticated permission system that checks for CHANGE_SELECTED_EMPLOYEE permission. Users without this permission will not see the component at all, ensuring secure access control for employee selection functionality.

### Technical Implementation

The component integrates with the TeamsProvider context to access organization members, permission data, and global employee selection state. It provides intelligent permission checking and graceful handling of loading states.
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
		labeled: {
			control: 'boolean',
			description: 'Whether to show the label with Users icon above the select',
			table: {
				type: { summary: 'boolean' },
				defaultValue: { summary: 'false' }
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
 * Default employee selector without label, showing clean selection interface.
 * Displays employee dropdown with "All employees" option and standard styling.
 */
export const Default: Story = {
	args: {
		size: 'default',
		labeled: false
	},
	parameters: {
		docs: {
			description: {
				story: 'The default TeamsActiveEmployeeSelector component without label. Shows the employee selection dropdown with "All employees" option, loading states, and permission-based visibility.'
			}
		}
	}
};

/**
 * Employee selector with label and Users icon for clear identification.
 * Provides enhanced visual context for the selection purpose.
 */
export const WithLabel: Story = {
	args: {
		size: 'default',
		labeled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveEmployeeSelector with label enabled (labeled=true). Displays the "Employee" label with Users icon above the selection dropdown for clear visual identification.'
			}
		}
	}
};

/**
 * Small-sized employee selector optimized for compact layouts.
 * Maintains full functionality while taking up less space.
 */
export const SmallSize: Story = {
	args: {
		size: 'sm',
		labeled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveEmployeeSelector with small size variant (size="sm"). Ideal for compact layouts, toolbars, or dense interfaces while maintaining full employee selection functionality.'
			}
		}
	}
};

/**
 * Large-sized employee selector for prominent placement.
 * Provides enhanced visibility and easier interaction.
 */
export const LargeSize: Story = {
	args: {
		size: 'lg',
		labeled: true
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveEmployeeSelector with large size variant (size="lg"). Perfect for prominent placement in main workflows or when employee selection is a primary action.'
			}
		}
	}
};

/**
 * Employee selector with custom styling applied through className prop.
 * Demonstrates visual customization while maintaining full functionality.
 */
export const CustomStyling: Story = {
	args: {
		size: 'default',
		labeled: true,
		className: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
	},
	parameters: {
		docs: {
			description: {
				story: 'TeamsActiveEmployeeSelector with custom styling applied through the className prop. Features custom border and background colors while preserving all employee selection functionality.'
			}
		}
	}
};
