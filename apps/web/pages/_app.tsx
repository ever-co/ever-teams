import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { RecoilRoot } from 'recoil';
import { AppState } from '@components/app/InitState';
import Head from 'next/head';
import Script from 'next/script';

export default function MyApp({ Component, pageProps }: AppProps) {
	return (
		<>
			<Script
				strategy="lazyOnload"
				src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
			/>
			<Script strategy="lazyOnload" id="google-analytic-script">
				{` window.dataLayer = window.dataLayer || [];
  				function gtag(){dataLayer.push(arguments);}
  				gtag('js', new Date());
  				gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');`}
			</Script>
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
