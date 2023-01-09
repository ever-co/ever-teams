import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }: AppProps) {
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
			<Component {...pageProps} />
			<Analytics />
		</>
	);
}

export default MyApp;
