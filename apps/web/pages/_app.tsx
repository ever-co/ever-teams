/* eslint-disable no-mixed-spaces-and-tabs */
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/globals.css';

import { GA_MEASUREMENT_ID, RECAPTCHA_SITE_KEY, jitsuConfiguration } from '@app/constants';
import { JitsuProvider } from '@jitsu/jitsu-react';
import { Analytics } from '@vercel/analytics/react';
import { AppState } from 'lib/app/init-state';
import ChatwootWidget from 'lib/features/integrations/chatwoot';
import { ThemeProvider } from 'next-themes';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { I18nextProvider } from 'react-i18next';
import { SkeletonTheme } from 'react-loading-skeleton';
import { RecoilRoot } from 'recoil';
import { JitsuAnalytics } from '../lib/components/services/jitsu-analytics';
import i18n from '../ni18n.config';
const MyApp = ({ Component, pageProps }: AppProps) => {
	const isJitsuEnvsPresent = jitsuConfiguration.host && jitsuConfiguration.writeKey;
	return (
		<>
			
			{RECAPTCHA_SITE_KEY && (
				<>
					<Script
					strategy="lazyOnload"
					src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
				/>
				<Script strategy="lazyOnload" id="google-analytic-script">
					{` window.dataLayer = window.dataLayer || [];
					  function gtag(){dataLayer.push(arguments);}
					  gtag('js', new Date());
					  gtag('config', '${GA_MEASUREMENT_ID}');`}
				</Script>
				</>
			)}
			
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
							<I18nextProvider i18n={i18n}>
								<AppState />
								<JitsuAnalytics user={pageProps?.user} />
								<ChatwootWidget />
								<Component {...pageProps} />
							</I18nextProvider>
						</SkeletonTheme>
					</ThemeProvider>
				</RecoilRoot>
			</JitsuProvider>
			<Analytics />
		</>
	);
};
export default MyApp;
