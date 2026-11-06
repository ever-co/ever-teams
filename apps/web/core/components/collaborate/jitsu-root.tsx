/* eslint-disable no-mixed-spaces-and-tabs */
import type { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';
import { JitsuProvider } from '@jitsu/jitsu-react';
import { readRuntimeEnv, setNextPublicEnv } from '@/env-config';
import React, { useMemo } from 'react';
import { JitsuAnalytics } from '@/core/components/analytics/jitsu-analytics';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { isAccountDeletionPath } from '@/core/lib/auth/account-deletion';

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
	// Get user data directly if not provided via pageProps
	const { data: user } = useUserQuery();

	pageProps?.envs && setNextPublicEnv(pageProps?.envs);

	const options = useMemo(() => {
		// Runtime (container) env first, so a published Docker image can enable Jitsu without a rebuild;
		// the literal is the build-time fallback (non-Docker builds).
		const jitsuConf = pageProps?.jitsuConf || {
			host: readRuntimeEnv('NEXT_PUBLIC_JITSU_BROWSER_URL') || process.env.NEXT_PUBLIC_JITSU_BROWSER_URL,
			writeKey:
				readRuntimeEnv('NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY') ||
				process.env.NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY,
			debug: false,
			cookieDomain:
				readRuntimeEnv('NEXT_PUBLIC_JITSU_COOKIE_DOMAIN') || process.env.NEXT_PUBLIC_JITSU_COOKIE_DOMAIN,
			echoEvents: false
		};

		// A page load that starts on the account deletion pages leaves Jitsu off, like Sentry and PostHog: the
		// e-mailed link carries a deletion token in its address (isAccountDeletionPath).
		const startsOnAccountDeletion =
			typeof window !== 'undefined' && isAccountDeletionPath(window.location.pathname);
		const isJitsuEnvs: boolean = !!jitsuConf.host && !!jitsuConf.writeKey && !startsOnAccountDeletion;

		console.log(`Jitsu Enabled: ${isJitsuEnvs}`);
		console.log(`Jitsu Configuration: ${JSON.stringify(jitsuConf)}`);

		return isJitsuEnvs
			? {
					host: jitsuConf.host ?? '',
					writeKey: jitsuConf.writeKey ?? undefined,
					debug: jitsuConf.debug,
					cookieDomain: jitsuConf.cookieDomain ?? undefined,
					echoEvents: jitsuConf.echoEvents
				}
			: { disabled: true };
	}, [pageProps?.jitsuConf]);

	return (
		<JitsuProvider options={options as any}>
			{React.Children.map(
				[<JitsuAnalytics user={pageProps?.user || user} key="analytics" />, children],
				(child, index) => (
					<React.Fragment key={`jitsu-child-${index}`}>{child}</React.Fragment>
				)
			)}
		</JitsuProvider>
	);
}
