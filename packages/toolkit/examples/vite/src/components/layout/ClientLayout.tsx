import { TeamsProvider, theme8, useTeamsContext } from '@ever-teams/atoms';
import NavBar from './NavBar';
import { ErrorBoundary } from 'react-error-boundary';
import { Footer } from './Footer';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import GradientBackground from './GradientBackground';
import { tracker } from '@ever-teams/tracking';

function ErrorFallback({ error }: { error: Error }) {
	const isDev = import.meta.env.DEV;
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h2 className="text-lg font-semibold">Something went wrong</h2>
				<p className="mt-2 text-sm text-gray-500">
					{isDev ? error.message : 'Please try refreshing the page or contact support.'}
				</p>
			</div>
		</div>
	);
}

const teamsConfig = {
	apiUrl: import.meta.env.VITE_TEAMS_API_URL
};

export default function ClientLayout() {
	return (
		<TeamsProvider config={teamsConfig} theme={theme8}>
			<ClientLayoutContent />
		</TeamsProvider>
	);
}

function ClientLayoutContent() {
	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();

	useEffect(() => {
		if (user && token && organizationId) {
			try {
				tracker.start({
					organizationId,
					tenantId: user.tenantId,
					token
				});
			} catch (error) {
				console.error('Failed to start tracker:', error);
			}
			return () => {
				try {
					tracker.stop();
				} catch (error) {
					console.error('Failed to stop tracker:', error);
				}
			};
		}
	}, [user, token, organizationId]);

	return (
		<ErrorBoundary FallbackComponent={ErrorFallback}>
			<GradientBackground />
			<div
				data-clarity-unmask="true"
				className="relative min-h-screen text-black dark:text-white font-[family-name:var(--font-geist-sans)] tracking-[-0.020em] flex flex-col justify-center items-center  mx-auto py-8 px-4"
			>
				<NavBar />
				<main className="tracking-tight">
					<div>
						<Outlet />
					</div>
				</main>
				<Footer />
			</div>
		</ErrorBoundary>
	);
}
