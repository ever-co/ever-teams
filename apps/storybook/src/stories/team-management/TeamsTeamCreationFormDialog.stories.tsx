import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsTeamCreationFormDialog } from '@ever-teams/atoms';
import { ThemedButton } from '@ever-teams/toolkit-ui';
import { Plus, Users, Building } from 'lucide-react';

const meta: Meta<typeof TeamsTeamCreationFormDialog> = {
	title: 'Team Management/Team Creation Form Dialog',
	component: TeamsTeamCreationFormDialog,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A dialog wrapper component for the team creation form. Provides a modal interface for creating new teams with customizable trigger elements. Automatically handles dialog state and form submission within the modal context.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the dialog content'
		},
		trigger: {
			control: false,
			description: 'Custom trigger element to open the dialog. If not provided, uses default button.'
		}
	}
} satisfies Meta<typeof TeamsTeamCreationFormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default team creation dialog with standard trigger button.
 * Uses the built-in "Create New Team" button to open the dialog.
 */
export const Default: Story = {
	args: {}
};

/**
 * Team creation dialog with custom styling applied to the form content.
 * Demonstrates how to customize the dialog appearance.
 */
export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-purple-200 dark:border-purple-800'
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog with custom purple-themed border styling applied to the form content.'
			}
		}
	}
};

/**
 * Team creation dialog with custom trigger element.
 * Shows how to provide a custom button or element to trigger the dialog.
 */
export const CustomTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton className="bg-green-600 hover:bg-green-700 text-white">
				<Users size={16} className="mr-2" />
				New Team
			</ThemedButton>
		)
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by a custom green-themed button with Users icon.'
			}
		}
	}
};

/**
 * Team creation dialog with organization-themed trigger.
 * Demonstrates a trigger styled for organization management contexts.
 */
export const OrganizationTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton className="bg-blue-600 hover:bg-blue-700 text-white">
				<Building size={16} className="mr-2" />
				Add Team to Organization
			</ThemedButton>
		)
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by an organization-themed button, suitable for admin interfaces.'
			}
		}
	}
};

/**
 * Team creation dialog with icon-only trigger.
 * Demonstrates a compact trigger for toolbar or header usage.
 */
export const IconTrigger: Story = {
	args: {
		trigger: (
			<ThemedButton size="sm" className="p-2">
				<Plus size={16} />
			</ThemedButton>
		)
	},
	parameters: {
		docs: {
			description: {
				story: 'Dialog triggered by a compact icon-only button, suitable for toolbars or headers.'
			}
		}
	}
};
