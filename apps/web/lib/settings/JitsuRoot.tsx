/* eslint-disable no-mixed-spaces-and-tabs */
import type { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';
import { JitsuProvider } from '@jitsu/jitsu-react';
import { setNextPublicEnv } from '@app/env';
import React from 'react';
import { JitsuAnalytics } from 'lib/components/services/jitsu-analytics';

type MyAppProps = {
	pageProps?: {
		jitsuConf?: JitsuOptions;
		jitsuHost?: string;
		envs: Record<string, string>;
		user?: any;
	};
	children: React.ReactNode;
};

export function JitsuRoot({ pageProps, children }: MyAppProps) {
	pageProps?.envs && setNextPublicEnv(pageProps?.envs);
	const jitsuConf = pageProps?.jitsuConf;
	const isJitsuEnvs: boolean = jitsuConf?.host !== '' && jitsuConf?.writeKey !== '';

	return (
		<JitsuProvider
			options={
				isJitsuEnvs
					? {
							host: jitsuConf?.host ?? '',
							writeKey: jitsuConf?.writeKey ?? undefined,
							debug: jitsuConf?.debug,
							cookieDomain: jitsuConf?.cookieDomain ?? undefined,
							echoEvents: jitsuConf?.echoEvents
					  }
					: {
							disabled: true
					  }
			}
		>
			<JitsuAnalytics user={pageProps?.user} />
			{children}
		</JitsuProvider>
	);
}
