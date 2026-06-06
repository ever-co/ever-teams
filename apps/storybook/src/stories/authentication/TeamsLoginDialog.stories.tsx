import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsLoginDialog } from '@ever-teams/atoms';
import { Button } from '@ever-teams/toolkit-ui';
import { LogIn, User, Settings } from 'lucide-react';

const meta = {
	title: 'Authentication/Teams Login Dialog',
	component: TeamsLoginDialog,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A login dialog component that displays a modal with login form when user is not authenticated, or shows user avatar when authenticated. Provides flexible trigger customization.'
			}
		}
	},
	argTypes: {
		trigger: {
			control: false,
			description: 'Custom trigger element to open the dialog'
		},
		signupLink: {
			control: 'text',
			description: 'URL for the signup page link'
		},
		redirectHandler: {
			action: 'redirected',
			description: 'Function called after successful authentication'
		}
	}
} satisfies Meta<typeof TeamsLoginDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {}
};

export const WithSignupLink: Story = {
	args: {
		signupLink: '/signup'
	}
};

export const CustomTrigger: Story = {
	args: {
		trigger: (
			<Button variant="outline" className="flex items-center gap-2">
				<LogIn size={16} />
				Login
			</Button>
		)
	}
};

export const IconTrigger: Story = {
	args: {
		trigger: (
			<Button variant="ghost" size="icon">
				<User size={20} />
			</Button>
		)
	}
};

export const PrimaryButton: Story = {
	args: {
		trigger: <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>,
		signupLink: '/signup'
	}
};

export const NavigationItem: Story = {
	args: {
		trigger: (
			<button className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">
				Sign In
			</button>
		)
	}
};

export const HeaderAction: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
			<div className="flex items-center justify-between max-w-6xl mx-auto">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
						<span className="text-white font-bold text-sm">C</span>
					</div>
					<span className="font-semibold text-gray-900 dark:text-white">Teams</span>
				</div>
				<nav className="flex items-center gap-6">
					<a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
						Features
					</a>
					<a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
						Pricing
					</a>
					<TeamsLoginDialog
						trigger={
							<Button variant="outline" size="sm">
								Sign In
							</Button>
						}
					/>
				</nav>
			</div>
		</div>
	)
};

export const CallToAction: Story = {
	render: () => (
		<div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg text-center">
			<h2 className="text-2xl font-bold mb-2">Start Tracking Your Time Today</h2>
			<p className="text-blue-100 mb-6">
				Join thousands of professionals who trust Teams for their time tracking needs
			</p>
			<TeamsLoginDialog
				trigger={
					<Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
						Get Started Free
					</Button>
				}
				signupLink="/signup"
			/>
		</div>
	)
};

export const SettingsMenu: Story = {
	args: {
		trigger: (
			<Button variant="ghost" size="sm" className="flex items-center gap-2">
				<Settings size={16} />
				Account
			</Button>
		)
	}
};

export const MobileMenu: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-full max-w-sm">
			<div className="space-y-3">
				<a
					href="#"
					className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
				>
					Dashboard
				</a>
				<a
					href="#"
					className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
				>
					Projects
				</a>
				<a
					href="#"
					className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
				>
					Reports
				</a>
				<div className="border-t border-gray-200 dark:border-gray-700 pt-3">
					<TeamsLoginDialog
						trigger={
							<Button variant="outline" className="w-full">
								Sign In
							</Button>
						}
					/>
				</div>
			</div>
		</div>
	)
};

export const LandingPageHero: Story = {
	render: () => (
		<div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 rounded-lg">
			<div className="text-center max-w-2xl mx-auto">
				<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Time Tracking Made Simple</h1>
				<p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
					Track your time, manage projects, and boost productivity with our intuitive time tracking solution.
				</p>
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<TeamsLoginDialog
						trigger={
							<Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
								Start Free Trial
							</Button>
						}
						signupLink="/signup"
					/>
					<Button variant="outline" size="lg" className="px-8">
						Watch Demo
					</Button>
				</div>
			</div>
		</div>
	)
};
