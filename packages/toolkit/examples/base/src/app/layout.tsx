import { Inter as FontSans, Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';
import ClientLayout from './client-layout';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased`}>
				<ClientLayout>{children}</ClientLayout>
			</body>
		</html>
	);
}
