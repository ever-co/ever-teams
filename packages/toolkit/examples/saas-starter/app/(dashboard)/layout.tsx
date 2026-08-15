import { ReactNode } from 'react';
import { TeamsAuthHandler } from '@/components/auth/teams-auth-handler';

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<main>
			<TeamsAuthHandler />
			{children}
		</main>
	);
}
