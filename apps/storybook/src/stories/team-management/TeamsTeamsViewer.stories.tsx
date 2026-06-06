import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TeamsTeamsViewer } from '@ever-teams/atoms';

const meta = {
	title: 'Team Management/Teams Teams Viewer',
	component: TeamsTeamsViewer,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
A comprehensive teams viewer component that displays organization teams in a table format with advanced management capabilities.

**Features:**
- Displays organization teams with avatars, names, managers, and members
- Real-time data from TeamsProvider context (organizationTeams)
- Built-in search functionality for team filtering
- Pagination with configurable items per page (5, 10, 20, 50)
- Team creation dialog for adding new teams
- Responsive table design with loading states
- Manager and member role differentiation
- Team selection integration with context

**Data Source:**
- Gets data from \`useTeamsContext().organizationTeams\` (IOrganizationTeamList[])
- Uses \`selectedTeam\`, \`userOrganizations\`, \`selectedOrganization\`
- Loading state managed through \`organisationsLoading\`

**Team Management:**
- View team details and composition
- Create new teams (dialog-based)
- Search and filter teams
- Navigate between teams
- Role-based access control

**Use Cases:**
- Organization team management
- Team overview dashboards
- Administrative interfaces
- Team selection and navigation
- Organizational structure visualization
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
} satisfies Meta<typeof TeamsTeamsViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default teams viewer with standard styling and full functionality.
 * Shows all organization teams with management capabilities.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: `
The default teams viewer displays all organization teams in a comprehensive table format.
Data is automatically fetched from the TeamsProvider context.

**Default Features:**
- Full-width responsive table
- Search functionality
- Pagination controls
- Team creation button
- Loading states
- Role-based team information
			`
			}
		}
	}
};

/**
 * Custom styled teams viewer with enhanced visual definition.
 * Demonstrates className customization for different layouts.
 */
export const CustomStyling: Story = {
	args: {
		className: 'max-w-4xl border-2 border-blue-200 dark:border-blue-800'
	},
	parameters: {
		docs: {
			description: {
				story: `
Custom styled variant demonstrating className prop usage for visual customization.
Shows how to apply custom borders, width constraints, and theme-aware styling.

**Customizations:**
- Maximum width constraint (4xl)
- Custom border styling
- Theme-aware border colors
- Enhanced visual definition
			`
			}
		}
	}
};
