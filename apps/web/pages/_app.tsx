import '../styles/globals.css';
import 'react-loading-skeleton/dist/skeleton.css';

import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { RecoilRoot } from 'recoil';
import { AppState } from 'lib/app/init-state';
import Head from 'next/head';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { SkeletonTheme } from 'react-loading-skeleton';
import { JitsuProvider } from '@jitsu/jitsu-react';
import React from 'react';
import {JitsuAnalytics} from "../lib/components/services/jitsu-analytics";
import {JITSU_BROWSER_URL, JITSU_BROWSER_WRITE_KEY} from "@app/constants";



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
        <JitsuProvider
            options={
							JITSU_BROWSER_URL && JITSU_BROWSER_WRITE_KEY ?
					{
                disabled: false,
                debug: false,
                host: JITSU_BROWSER_URL,
				writeKey:JITSU_BROWSER_WRITE_KEY
            }:{
								disabled: true,
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
}
