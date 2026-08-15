import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTeamMembers } from '@ever-teams/atoms';

const meta = {
	title: 'Team Management/Teams Team Members',
	component: TeamsTeamMembers,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A comprehensive team members management component that provides detailed member information and role-based management capabilities.

**Features:**
- Displays team members with avatars, names, emails, positions, and roles
- Real-time data from TeamsProvider context
- Built-in search functionality for member filtering
- Pagination with configurable items per page (5, 10, 20, 50)
- Role-based actions (managers can remove members)
- Member invitation dialog for adding new members
- Confirmation dialogs for member removal/leaving
- Join/leave date tracking with status badges
- Duplicate member handling by employeeId

**Data Source:**
- Gets data from \`useTeamsContext().selectedTeam\`, \`authenticatedUser\`, \`selectedOrganization\`
- Uses \`organizationTeamsAtom\` from Jotai for team data
- Automatic member deduplication and filtering

**Role-Based Features:**
- Manager permissions for member management
- Member invitation (managers only)
- Member removal with confirmation
- Leave team functionality
- Role differentiation (MANAGER vs regular members)

**Use Cases:**
- Team member management
- Member directory and contact information
- Role-based team administration
- Member onboarding and offboarding
- Team composition analysis
				`
			}
		}
	},
	argTypes: {
		className: {
			control: { type: 'text' },
			description: 'Additional CSS classes for custom styling and layout modifications'
		}
	}
} satisfies Meta<typeof TeamsTeamMembers>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default team members view with standard styling and full functionality.
 * Shows all team members with management capabilities based on user role.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default team members view displays all members of the selected team in a detailed table format.
Data is automatically fetched from TeamsProvider context and Jotai atoms.

**Default Features:**
- Comprehensive member information table
- Search functionality
- Pagination controls
- Role-based action menus
- Member invitation (for managers)
- Loading states and error handling
			`
			}
		}
	}
};

/**
 * Custom styled team members view with enhanced visual definition.
 * Demonstrates className customization for different layouts.
 */
export const CustomStyling: Story = {
	args: {
		className: 'max-w-5xl border-2 border-green-200 dark:border-green-800'
	},
	parameters: {
		docs: {
			description: {
				story: `
Custom styled variant demonstrating className prop usage for visual customization.
Shows how to apply custom borders, width constraints, and theme-aware styling.

**Customizations:**
- Maximum width constraint (5xl)
- Custom green border styling
- Theme-aware border colors
- Enhanced visual definition for member management
			`
			}
		}
	}
};
