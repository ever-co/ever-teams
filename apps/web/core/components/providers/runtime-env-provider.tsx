'use client';
import React, { createContext, useContext } from 'react';
import { installRuntimeEnv, RUNTIME_ENV_SCRIPT_ID, serializeRuntimeEnvScript } from '@/env-config';

type RuntimeEnv = Record<string, string>;

const RuntimeEnvContext = createContext<RuntimeEnv | null>(null);

/**
 * Carries the request's public runtime env (read on the server by app/layout.tsx) down to
 * <RuntimeEnvScript />, which must live inside the <head> rendered by the 'use client'
 * app/[locale]/layout.tsx. The env reaches the client through the RSC payload, so the server-rendered
 * and hydrated script are byte-identical (no hydration mismatch).
 */
export function RuntimeEnvProvider({ env, children }: { env: RuntimeEnv; children: React.ReactNode }) {
	// Normally a no-op (the inline script already installed the same values before any module ran).
	installRuntimeEnv(env);
	return <RuntimeEnvContext.Provider value={env}>{children}</RuntimeEnvContext.Provider>;
}

/**
 * Publishes the runtime env as `self.__EVER_TEAMS_RUNTIME_ENV__`. Render it as the FIRST child of
 * <head>: it executes while the HTML is parsed, before Next's bootstrap chunks evaluate any module,
 * so module-level constants (API service singletons, captcha key, branding) read runtime values.
 * It must stay in the initial shell — never inside a Suspense boundary or client-only branch,
 * where it would arrive too late (or, when created by React on the client, never execute).
 */
export function RuntimeEnvScript() {
	const env = useContext(RuntimeEnvContext);
	if (!env) return null;
	return (
		<script
			id={RUNTIME_ENV_SCRIPT_ID}
			suppressHydrationWarning
			dangerouslySetInnerHTML={{ __html: serializeRuntimeEnvScript(env) }}
		/>
	);
}
