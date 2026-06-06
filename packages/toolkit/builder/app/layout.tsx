import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import { Providers } from './providers';

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

export default function RootLayout({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${fontSans.variable} font-sans antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
