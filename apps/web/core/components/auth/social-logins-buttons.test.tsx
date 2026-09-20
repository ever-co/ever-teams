/** @jest-environment jsdom */
/**
 * The social-login buttons are a client component: they render the providers the SERVER found usable
 * (EVER_TEAMS_AUTH_PROVIDERS in the runtime env payload, see core/services/server/runtime-env.ts). They
 * used to compute the list in the browser from server-only client ids, so no button ever rendered.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { RuntimeEnvProvider } from '@/core/components/providers/runtime-env-provider';
import SocialLogins from './social-logins-buttons';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const mockSignInFunction = jest.fn();
let mockDemoMode = false;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

// A server action: the real module imports next-auth, which only runs on the server.
jest.mock('@/core/lib/helpers/social-logins', () => ({
	signInFunction: (...args: unknown[]) => mockSignInFunction(...args)
}));

jest.mock('@/core/constants/config/constants', () => ({
	get IS_DEMO_MODE() {
		return mockDemoMode;
	}
}));

jest.mock('@/core/components/icons', () => ({
	IconsBrandGoogleSolid: () => <svg />,
	IconsFacebook: () => <svg />,
	IconsGithubFilled: () => <svg />,
	IconsTwitterFilled: () => <svg />
}));

jest.mock('../common/button', () => ({
	Button: ({ children, variant: _variant, ...props }: React.ComponentProps<'button'> & { variant?: string }) => (
		<button {...props}>{children}</button>
	)
}));

function renderWithRuntimeEnv(env: Record<string, string>) {
	return render(
		<RuntimeEnvProvider env={env}>
			<SocialLogins />
		</RuntimeEnvProvider>
	);
}

const buttonLabels = () => screen.queryAllByRole('button').map((button) => button.textContent);

beforeEach(() => {
	mockDemoMode = false;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

afterAll(() => {
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('SocialLogins', () => {
	it('renders a button for each provider the server published, in the usual order', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'twitter,google' });

		expect(buttonLabels()).toEqual(['Google', 'Twitter']);
		expect(screen.getByText('pages.auth.OR_CONTINUE_WITH')).toBeTruthy();
	});

	it('renders nothing when the server published no provider', () => {
		const { container } = renderWithRuntimeEnv({ NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google' });

		expect(container.innerHTML).toBe('');
	});

	it('skips usable providers that have no button', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'apple,slack, github' });

		expect(buttonLabels()).toEqual(['GitHub']);
	});

	it('hides the buttons in demo mode', () => {
		mockDemoMode = true;

		const { container } = renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'google,github' });

		expect(container.innerHTML).toBe('');
	});

	it('signs in with the chosen provider', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'google,github' });

		fireEvent.click(screen.getByRole('button', { name: 'GitHub' }));

		expect(mockSignInFunction).toHaveBeenCalledTimes(1);
		expect(mockSignInFunction).toHaveBeenCalledWith({ id: 'github', name: 'GitHub' });
	});

	it('reads the injected runtime env when rendered outside the provider', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = { EVER_TEAMS_AUTH_PROVIDERS: 'facebook' };

		render(<SocialLogins />);

		expect(buttonLabels()).toEqual(['Facebook']);
	});

	it('does not ship the server-only provider module (next-auth, client ids) to the browser', () => {
		const source = readFileSync(join(__dirname, 'social-logins-buttons.tsx'), 'utf8');
		const imports = Array.from(source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g), (match) => match[1]);

		expect(imports.length).toBeGreaterThan(0);
		expect(imports.filter((path) => /check-provider-env-vars|next-auth/.test(path))).toEqual([]);
		expect(source).not.toMatch(/_CLIENT_ID/);
	});
});
