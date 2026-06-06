import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsLoginForm } from '@ever-teams/atoms';

const meta = {
	title: 'Authentication/Teams Login Form',
	component: TeamsLoginForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive login form component with password and token authentication options. Includes tabs for different authentication methods and integrates with the Teams authentication system.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling'
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
} satisfies Meta<typeof TeamsLoginForm>;

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

export const CustomStyling: Story = {
	args: {
		className: 'border-2 border-blue-300 rounded-lg p-6 bg-blue-50 dark:bg-blue-950'
	}
};

export const WithRedirectHandler: Story = {
	args: {
		signupLink: '/signup',
		redirectHandler: () => {
			console.log('User authenticated successfully');
		}
	}
};

export const CompactForm: Story = {
	args: {
		className: 'max-w-sm'
	}
};

export const FullWidthForm: Story = {
	args: {
		className: 'w-full max-w-md'
	}
};

export const InModal: Story = {
	render: () => (
		<div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md">
			<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sign In to Your Account</h2>
			<TeamsLoginForm />
		</div>
	)
};

export const OnboardingFlow: Story = {
	render: () => (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md">
				<div className="text-center mb-6">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Sign in to continue your time tracking journey
					</p>
				</div>
				<TeamsLoginForm signupLink="/signup" />
				<div className="mt-6 text-center">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Don't have an account?{' '}
						<a href="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
							Sign up here
						</a>
					</p>
				</div>
			</div>
		</div>
	)
};

export const WithBranding: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md">
			<div className="text-center mb-6">
				<div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
					<span className="text-white font-bold text-xl">C</span>
				</div>
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Teams Time Tracker</h2>
				<p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Professional time tracking made simple</p>
			</div>
			<TeamsLoginForm />
		</div>
	)
};

export const MobileOptimized: Story = {
	render: () => (
		<div className="w-full max-w-sm mx-auto p-4">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">Sign In</h2>
				<TeamsLoginForm className="space-y-4" />
			</div>
		</div>
	)
};
