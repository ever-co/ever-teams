import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import type { LinksFunction } from '@remix-run/node';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TeamsProvider } from '@ever-teams/atoms';
import { json } from '@remix-run/node';

import stylesheet from '~/styles/global.css?url';

export const links: LinksFunction = () => [
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous'
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
	},
	{ rel: 'icon', href: '/icon.svg' },
	{ rel: 'stylesheet', href: stylesheet }
];

export async function loader() {
	return json({
		ENV: {
			PUBLIC_TEAMS_API_URL: process.env.PUBLIC_TEAMS_API_URL
		}
	});
}

export default function App() {
	const { ENV } = useLoaderData<typeof loader>();

	const TEAMS_CONFIG = {
		apiUrl: ENV.PUBLIC_TEAMS_API_URL
	};

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
				<script
					dangerouslySetInnerHTML={{
						__html: `
              let theme = localStorage.getItem('theme');
              if (!theme) {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            `
					}}
				/>
			</head>
			<body className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<TeamsProvider config={TEAMS_CONFIG}>
					<div className=" pt-24 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
						<Header />

						<main className="container mx-auto">
							<Outlet />
						</main>
						<Footer />
					</div>
					<ScrollRestoration />
					<Scripts />
					<LiveReload />
				</TeamsProvider>
			</body>
		</html>
	);
}
