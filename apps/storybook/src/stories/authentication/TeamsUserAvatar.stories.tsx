import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsUserAvatar } from '@ever-teams/atoms';
import { Settings, User, Bell } from 'lucide-react';

const meta: Meta<typeof TeamsUserAvatar> = {
	title: 'Authentication/Teams User Avatar',
	component: TeamsUserAvatar,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					"A user avatar component that displays the authenticated user's profile picture with an optional popover menu. Shows loading state when user data is being fetched and provides navigation options when clicked."
			}
		}
	},
	argTypes: {
		showMenu: {
			control: 'boolean',
			description: 'Whether to show the popover menu on click'
		},
		position: {
			control: 'select',
			options: ['center', 'end', 'start'],
			description: 'Position alignment for the popover menu'
		},
		children: {
			control: false,
			description: 'Custom content to display in the popover'
		}
	}
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		showMenu: true,
		position: 'end'
	}
};

export const WithoutMenu: Story = {
	args: {
		showMenu: false
	}
};

export const CenterPosition: Story = {
	args: {
		showMenu: true,
		position: 'center'
	}
};

export const StartPosition: Story = {
	args: {
		showMenu: true,
		position: 'start'
	}
};

export const InNavigation: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
			<div className="flex items-center justify-between max-w-6xl mx-auto">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
						<span className="text-white font-bold text-sm">C</span>
					</div>
					<span className="font-semibold text-gray-900 dark:text-white">Teams Dashboard</span>
				</div>
				<div className="flex items-center gap-4">
					<button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
						<Bell size={20} />
					</button>
					<TeamsUserAvatar showMenu={true} position="end" />
				</div>
			</div>
		</div>
	)
};

export const InSidebar: Story = {
	render: () => (
		<div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
			<div className="space-y-4">
				<div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
					<TeamsUserAvatar showMenu={false} />
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 dark:text-white truncate">John Doe</p>
						<p className="text-xs text-gray-500 dark:text-gray-400 truncate">john@example.com</p>
					</div>
				</div>
				<nav className="space-y-1">
					<a
						href="#"
						className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
					>
						<User size={16} />
						Profile
					</a>
					<a
						href="#"
						className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
					>
						<Settings size={16} />
						Settings
					</a>
				</nav>
			</div>
		</div>
	)
};

export const WithCustomMenu: Story = {
	args: {
		showMenu: true,
		position: 'end',
		children: (
			<div className="p-2 space-y-1">
				<button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
					<User size={16} />
					View Profile
				</button>
				<button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
					<Settings size={16} />
					Account Settings
				</button>
				<hr className="border-gray-200 dark:border-gray-700" />
			</div>
		)
	}
};

export const CompactView: Story = {
	render: () => (
		<div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
			<TeamsUserAvatar showMenu={true} position="end" />
			<span className="text-sm text-gray-700 dark:text-gray-300">John D.</span>
		</div>
	)
};

export const InToolbar: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Dashboard</h2>
				</div>
				<div className="flex items-center gap-3">
					<button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
						New Project
					</button>
					<TeamsUserAvatar showMenu={true} position="end" />
				</div>
			</div>
		</div>
	)
};

export const MobileHeader: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold text-gray-900 dark:text-white">Teams</h1>
				<TeamsUserAvatar showMenu={true} position="end" />
			</div>
		</div>
	)
};
