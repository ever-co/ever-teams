'use client';
import React, { createContext, useContext } from 'react';
import { installRuntimeEnv, readRuntimeEnv, RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute } from '@/env-config';

type RuntimeEnv = Record<string, string>;

const RuntimeEnvContext = createContext<RuntimeEnv | null>(null);

/**
 * Carries the request's public runtime env (read on the server by app/layout.tsx) down to the
 * <html> rendered by the 'use client' app/[locale]/layout.tsx and app/not-found.tsx. The env reaches
 * the client through the RSC payload, so the server-rendered and hydrated attribute are
 * byte-identical (no hydration mismatch).
 */
export function RuntimeEnvProvider({ env, children }: Readonly<{ env: RuntimeEnv; children: React.ReactNode }>) {
	// Normally a no-op (the <html> attribute already installed the same values before any module ran).
	installRuntimeEnv(env);
	return <RuntimeEnvContext.Provider value={env}>{children}</RuntimeEnvContext.Provider>;
}

/**
 * A value of the request's public runtime env, for components that render differently depending on it.
 *
 * Reads the same object during SSR and hydration (the provider's env), so server and client markup
 * match — unlike readRuntimeEnv(), which reads process.env on the server and the injected payload in
 * the browser. Outside the provider it falls back to readRuntimeEnv(). Whitespace-only counts as ''
 * (secret-store placeholders), as in readRuntimeEnv().
 */
export function useRuntimeEnvValue(name: string): string | undefined {
	const env = useContext(RuntimeEnvContext);
	if (!env) return readRuntimeEnv(name);
	const value = env[name];
	return value?.trim() === '' ? '' : value;
}

/**
 * The <html> attributes that publish the runtime env to the browser. Spread them on the <html> the
 * document renders: its start tag is parsed before anything else, so module-level constants (API
 * service singletons, captcha key, branding) read runtime values from the first module evaluation
 * on — including in the `async` bundle chunks Next puts at the top of <head>.
 */
export function useRuntimeEnvHtmlProps(): Record<string, string> {
	const env = useContext(RuntimeEnvContext);
	if (!env) return {};
	return { [RUNTIME_ENV_ATTRIBUTE]: serializeRuntimeEnvAttribute(env) };
}
