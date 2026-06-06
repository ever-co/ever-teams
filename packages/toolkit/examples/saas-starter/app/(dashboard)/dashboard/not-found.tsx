'use client';

import { TeamsLogoIcon } from '@ever-teams/toolkit-ui';
import Link from 'next/link';
import { ReactElement } from 'react';

export default function NotFound(): ReactElement {
	return (
		<div className="flex items-center justify-center min-h-[100dvh]">
			<div className="max-w-md space-y-8 p-4 text-center">
				<TeamsLogoIcon className="size-12" />
				<h1 className="text-4xl font-bold  tracking-tight">Page Not Found</h1>
				<p className="text-base text-gray-500 dark:text-gray-400">
					The page you are looking for might have been removed, had its name changed, or is temporarily
					unavailable.
				</p>
				<Link
					href="/"
					className="max-w-48 mx-auto flex justify-center py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 "
				>
					Back to Home
				</Link>
			</div>
		</div>
	);
}
