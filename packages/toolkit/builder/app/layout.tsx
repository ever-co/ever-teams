import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import { connection } from 'next/server';
import { Providers } from './providers';
import { readRuntimeEnv } from './env';

const fontSans = FontSans({
	subsets: ['latin'],
	variable: '--font-sans'
});

export const metadata: Metadata = {
	title: 'Ever® Teams™ Builder',
	description: 'Open Productivity & Time Tracking Platform',
	icons: {
		icon: [
			{
				url: '/favicon.svg',
				type: 'image/svg+xml',
			}
		],
	},
};

export default async function RootLayout({
	children
}: {
	children: React.ReactNode;
}) {
	// Per request, never prerendered: a page rendered at build time would freeze the build machine's env
	// into its HTML, which is exactly what a re-usable image must avoid.
	await connection();
	const apiUrl = readRuntimeEnv('NEXT_PUBLIC_TEAMS_API_URL') || process.env.NEXT_PUBLIC_TEAMS_API_URL;

	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${fontSans.variable} font-sans antialiased`}>
				<Providers apiUrl={apiUrl}>{children}</Providers>
			</body>
		</html>
	);
}
