import { Inter as FontSans, Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import { connection } from 'next/server';
import ClientLayout from './client-layout';
import { readRuntimeEnv } from '@/lib/runtime-env';
import './prism-custom.css';
const inter = Inter({
	subsets: ['latin'],
	fallback: [
		'-apple-system',
		'BlinkMacSystemFont',
		'Segoe UI',
		'Roboto',
		'Oxygen',
		'Ubuntu',
		'Cantarell',
		'Fira Sans',
		'Droid Sans',
		'Helvetica Neue',
		'sans-serif'
	],
	variable: '--font-sans'
});
export const metadata: Metadata = {
	title: 'Teams | Examples',
	description: 'Components examples of Teams'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	// Per request, never prerendered: a page rendered at build time would freeze the build machine's env
	// into its HTML, which is exactly what a re-usable image must avoid.
	await connection();
	const apiUrl = readRuntimeEnv('NEXT_PUBLIC_TEAMS_API_URL') || process.env.NEXT_PUBLIC_TEAMS_API_URL;

	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased`}>
				<ClientLayout apiUrl={apiUrl}>{children}</ClientLayout>
			</body>
		</html>
	);
}
