import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsProfilePhotoForm } from '@ever-teams/atoms';

const meta: Meta<typeof TeamsProfilePhotoForm> = {
	title: 'User Account Management/Profile Photo Form',
	component: TeamsProfilePhotoForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A profile photo upload form component with avatar display, file upload functionality, and preview capabilities. Features a pencil edit icon overlay, loading overlay during upload, fallback initials display, and image file type validation. Requires authenticated user context to function properly.'
			}
		}
	},
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes for styling the avatar container'
		}
	}
} satisfies Meta<typeof TeamsProfilePhotoForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default profile photo form with standard avatar size and functionality.
 * Shows avatar with edit overlay and file upload capability.
 */
export const Default: Story = {
	args: {}
};

/**
 * Profile photo form in a profile settings context.
 * Shows how the component appears within a comprehensive profile interface.
 */
export const InProfileSettings: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md">
			<div className="text-center">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Photo</h2>
				<div className="flex justify-center mb-4">
					<TeamsProfilePhotoForm />
				</div>
				<p className="text-gray-600 dark:text-gray-400 text-sm">
					Click the pencil icon to upload a new profile photo
				</p>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Profile photo form within a dedicated profile settings card with instructions.'
			}
		}
	}
};

/**
 * Profile photo form in a user card layout.
 * Shows how the component appears in user profile cards or headers.
 */
export const InUserCard: Story = {
	render: () => (
		<div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-sm">
			<div className="flex items-center space-x-4">
				<TeamsProfilePhotoForm />
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">John Doe</h3>
					<p className="text-gray-600 dark:text-gray-400">Software Developer</p>
					<p className="text-gray-500 dark:text-gray-500 text-sm">john.doe@example.com</p>
				</div>
			</div>
			<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
				<button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
					Edit Profile
				</button>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: 'Profile photo form integrated within a user profile card layout.'
			}
		}
	}
};
