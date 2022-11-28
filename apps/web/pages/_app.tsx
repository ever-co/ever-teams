import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { RecoilRoot } from 'recoil';
import { AppState } from '@components/InitState';

export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		<RecoilRoot>
			<ThemeProvider attribute="class">
				<AppState />
				<Component {...pageProps} />
			</ThemeProvider>
		</RecoilRoot>
	);
}
