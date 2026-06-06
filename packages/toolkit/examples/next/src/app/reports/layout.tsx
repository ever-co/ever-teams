'use client';

import { TeamsThemeToggle, useTeamsContext } from '@ever-teams/atoms';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
	const { authenticatedUser: user } = useTeamsContext();
	const path = usePathname();

	useEffect(() => {
		if (!user) {
			window.location.href = '/';
		}
	}, [user]);

	return (
		<div className=" min-h-screen bg-gray-50 dark:bg-gray-900 p-8 rounded-xl">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl capitalize  font-bold">{path.split('/')[2]} Stats</h1>
				<div className="flex gap-2 justify-center items-center">
					<span>Theme :</span>
					<TeamsThemeToggle />
				</div>
			</div>

			<div className="mt-6 flex justify-between p-2 gap-6 flex-wrap  shadow-md  rounded-lg">{children}</div>
		</div>
	);
}
