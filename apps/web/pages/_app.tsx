import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { RecoilRoot } from 'recoil';
import { AppState } from '@components/app/InitState';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		<>
			<Head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
			</Head>
			<RecoilRoot>
				<ThemeProvider attribute="class">
					<AppState />
					<Component {...pageProps} />
				</ThemeProvider>
			</RecoilRoot>
		</>
	);
}
