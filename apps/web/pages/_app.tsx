import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { RecoilRoot } from 'recoil';
import { AppState } from 'lib/app/init-state';
import Head from 'next/head';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
					<SkeletonTheme baseColor="#E6E6E8" highlightColor="#6B7280">
						<AppState />
						<Component {...pageProps} />
					</SkeletonTheme>
				</ThemeProvider>
			</RecoilRoot>
			<Analytics />
		</>
	);
}
