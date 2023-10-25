/* eslint-disable no-mixed-spaces-and-tabs */
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/globals.css';

import { jitsuConfiguration } from '@app/constants';
import { JitsuProvider } from '@jitsu/jitsu-react';
import { Analytics } from '@vercel/analytics/react';
import { AppState } from 'lib/app/init-state';
import { ThemeProvider } from 'next-themes';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { appWithI18Next } from 'ni18n';
import { SkeletonTheme } from 'react-loading-skeleton';
import { RecoilRoot } from 'recoil';
import { JitsuAnalytics } from '../lib/components/services/jitsu-analytics';
import { ni18nConfig } from '../ni18n.config';

const MyApp = ({ Component, pageProps }: AppProps) => {
	const isJitsuEnvsPresent = jitsuConfiguration.host && jitsuConfiguration.writeKey;
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
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
			</Head>
			<JitsuProvider
				options={
					isJitsuEnvsPresent
						? { ...jitsuConfiguration }
						: {
								disabled: true
						  }
				}
			>
				<RecoilRoot>
					<ThemeProvider attribute="class">
						<SkeletonTheme baseColor="#F0F0F0" enableAnimation={false}>
							<AppState />
							<JitsuAnalytics user={pageProps?.user} />
							<Component {...pageProps} />
						</SkeletonTheme>
					</ThemeProvider>
				</RecoilRoot>
			</JitsuProvider>
			<Analytics />
		</>
	);
};
export default appWithI18Next(MyApp, ni18nConfig);
