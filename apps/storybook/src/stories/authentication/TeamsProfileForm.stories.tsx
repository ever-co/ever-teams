import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsProfileForm } from '@ever-teams/atoms';

const meta = {
	title: 'Authentication/Teams Profile Form',
	component: TeamsProfileForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive profile form component for updating user information including personal details, preferences, language, time format, and timezone settings. Includes profile photo upload functionality.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling'
		}
	}
} satisfies Meta<typeof TeamsProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {}
};

export const CustomStyling: Story = {
	args: {
		className: 'max-w-2xl border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-900'
	}
};

export const CompactLayout: Story = {
	args: {
		className: 'max-w-md'
	}
};

export const InSettingsPage: Story = {
	render: () => (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
					<div className="border-b border-gray-200 dark:border-gray-700 p-6">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-1">
							Manage your account information and preferences
						</p>
					</div>
					<div className="p-6">
						<TeamsProfileForm />
					</div>
				</div>
			</div>
		</div>
	)
};

export const InModal: Story = {
	render: () => (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
				</div>
				<div className="p-6">
					<TeamsProfileForm className="border-0 bg-transparent p-0" />
				</div>
			</div>
		</div>
	)
};

export const InTabs: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-4xl">
			<div className="border-b border-gray-200 dark:border-gray-700">
				<nav className="flex space-x-8 px-6">
					<button className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 font-medium text-sm">
						Profile
					</button>
					<button className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm">
						Security
					</button>
					<button className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm">
						Notifications
					</button>
					<button className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm">
						Billing
					</button>
				</nav>
			</div>
			<div className="p-6">
				<TeamsProfileForm />
			</div>
		</div>
	)
};

export const MobileView: Story = {
	render: () => (
		<div className="w-full max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h1>
			</div>
			<div className="p-4">
				<TeamsProfileForm className="space-y-4" />
			</div>
		</div>
	)
};

export const WithSidebar: Story = {
	render: () => (
		<div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen">
			<div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h2>
				<nav className="space-y-2">
					<a
						href="#"
						className="block px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium"
					>
						Profile
					</a>
					<a
						href="#"
						className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
					>
						Account
					</a>
					<a
						href="#"
						className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
					>
						Security
					</a>
					<a
						href="#"
						className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
					>
						Preferences
					</a>
				</nav>
			</div>
			<div className="flex-1 p-6">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
					<TeamsProfileForm />
				</div>
			</div>
		</div>
	)
};

export const OnboardingStep: Story = {
	render: () => (
		<div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-2xl">
				<div className="text-center mb-8">
					<div className="flex justify-center mb-4">
						<div className="flex space-x-2">
							<div className="w-3 h-3 bg-blue-600 rounded-full"></div>
							<div className="w-3 h-3 bg-blue-600 rounded-full"></div>
							<div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
							<div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
						</div>
					</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Help us personalize your experience by completing your profile information
					</p>
				</div>
				<TeamsProfileForm />
				<div className="flex justify-between mt-8">
					<button className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
						Skip for now
					</button>
					<button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
						Continue
					</button>
				</div>
			</div>
		</div>
	)
};
