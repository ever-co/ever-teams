/* eslint-disable no-mixed-spaces-and-tabs */
import { getNextPublicEnv, loadNextPublicEnvs, setNextPublicEnv } from '@app/env';
import { GA_MEASUREMENT_ID, jitsuConfiguration } from '@app/constants';
import { JitsuProvider } from '@jitsu/jitsu-react';
import { Analytics } from '@vercel/analytics/react';
import { AppState } from 'lib/app/init-state';
import ChatwootWidget from 'lib/features/integrations/chatwoot';
import { NextPage, NextPageContext } from 'next';
import { ThemeProvider } from 'next-themes';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { I18nextProvider } from 'react-i18next';
import { SkeletonTheme } from 'react-loading-skeleton';
import { RecoilRoot } from 'recoil';
import { JitsuAnalytics } from '../lib/components/services/jitsu-analytics';
import i18n from '../ni18n.config';
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/globals.css';

const MyApp = ({ Component, pageProps }: AppProps) => {
	setNextPublicEnv(pageProps.envs);

	const jitsuConf = pageProps?.jitsuConf;
	console.log(`Jitsu Configuration: ${JSON.stringify(jitsuConf)}`);

	const isJitsuEnvsPresent: boolean = jitsuConf?.host !== '' && jitsuConf?.writeKey !== '';
	console.log(`Jitsu Enabled: ${isJitsuEnvsPresent}`);

	return (
		<>
			{GA_MEASUREMENT_ID.value && (
				<>
					<Script
						strategy="lazyOnload"
						src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID.value}`}
					/>
					<Script strategy="lazyOnload" id="google-analytic-script">
						{` window.dataLayer = window.dataLayer || [];
					  function gtag(){dataLayer.push(arguments);}
					  gtag('js', new Date());
					  gtag('config', '${GA_MEASUREMENT_ID.value}');`}
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
						? {
								host: jitsuConf.host ?? '',
								writeKey: jitsuConf.writeKey ?? undefined,
								debug: jitsuConf.debug,
								cookieDomain: jitsuConf.cookieDomain ?? undefined,
								echoEvents: jitsuConf.echoEvents
						  }
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

MyApp.getInitialProps = async ({ Component, ctx }: { Component: NextPage<AppProps>; ctx: NextPageContext }) => {
	// Recover environment variables
	const jitsuHost = getNextPublicEnv('NEXT_PUBLIC_JITSU_BROWSER_URL').value;
	const jitsuWriteKey = getNextPublicEnv('NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY').value;

	const jitsuConf = jitsuConfiguration();

	console.log(`Jitsu Host: ${jitsuHost}`);
	console.log(`Jitsu Write Key: ${jitsuWriteKey}`);

	console.log(`Jitsu Configuration: ${JSON.stringify(jitsuConf)}`);

	// Call the static method getInitialProps
	// of the page component if it exists
	let pageProps = {};

	if (Component.getInitialProps) {
		pageProps = await Component.getInitialProps(ctx);
	}

	return {
		pageProps: {
			...pageProps,
			jitsuConf,
			jitsuHost,
			jitsuWriteKey,
			envs: loadNextPublicEnvs()
		}
	};
};

export default MyApp;
