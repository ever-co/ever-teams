/**
 * @jest-environment jsdom
 */
/**
 * Next renders some documents WITHOUT app/layout.tsx — its own `<html id="__next_error__">` shell,
 * client-rendered after an SSR error or a notFound() raised during SSR (a first path segment with a
 * dot, e.g. /foo.bar, which proxy.ts's matcher skips). They carry no runtime env, so the
 * module-level constants of that bundle keep the build-time defaults: leaving such a document must
 * be a full page load, never a soft navigation that would carry them into the app.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const ATTRIBUTE = 'data-ever-teams-runtime-env';
const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const PAYLOAD = JSON.stringify({ APP_NAME: 'Acme Teams' });

jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: React.ComponentProps<'a'>) => (
		<a data-soft-navigation="true" href={href}>
			{children}
		</a>
	)
}));
jest.mock('@/core/components', () => ({
	Text: ({ children, className }: React.ComponentProps<'span'>) => <span className={className}>{children}</span>,
	Button: ({ children }: React.ComponentProps<'button'>) => <button type="button">{children}</button>
}));

type EnvConfig = typeof import('@/env-config');

/** A fresh module registry: the flag is decided once, when the bundle first runs. */
function loadDocumentModules(): { envConfig: EnvConfig; NotFound: React.ComponentType } {
	let loaded!: { envConfig: EnvConfig; NotFound: React.ComponentType };
	jest.isolateModules(() => {
		loaded = {
			envConfig: require('@/env-config'),
			NotFound: require('@/core/components/pages/404').default
		};
	});
	return loaded;
}

beforeEach(() => {
	document.documentElement.removeAttribute(ATTRIBUTE);
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('a document Next rendered without app/layout.tsx', () => {
	it('keeps the soft navigation when the runtime env reached the module constants', () => {
		document.documentElement.setAttribute(ATTRIBUTE, PAYLOAD);

		const { envConfig, NotFound } = loadDocumentModules();

		expect(envConfig.moduleConstantsSawRuntimeEnv()).toBe(true);
		render(<NotFound />);
		expect(screen.getByText('Go back to home').getAttribute('data-soft-navigation')).toBe('true');
	});

	it('is left by a full page load when it carried no payload', () => {
		const { envConfig, NotFound } = loadDocumentModules();

		expect(envConfig.moduleConstantsSawRuntimeEnv()).toBe(false);
		render(<NotFound />);
		const home = screen.getByText('Go back to home');
		expect(home.getAttribute('data-soft-navigation')).toBeNull();
		expect(home.getAttribute('href')).toBe('/');
	});

	it('re-publishes on <html> the payload the document was served with (app/global-error.tsx)', () => {
		document.documentElement.setAttribute(ATTRIBUTE, PAYLOAD);

		const { envConfig } = loadDocumentModules();

		expect(envConfig.injectedRuntimeEnvHtmlProps()).toEqual({ [ATTRIBUTE]: PAYLOAD });
	});

	it('publishes nothing when there is nothing to publish', () => {
		const { envConfig } = loadDocumentModules();

		expect(envConfig.injectedRuntimeEnvHtmlProps()).toEqual({});
	});
});
