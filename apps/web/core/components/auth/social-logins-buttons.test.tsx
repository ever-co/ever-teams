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

// The English messages the Ever ID button reads, with next-intl's rich text (a tag becomes a component).
const mockMessages: Record<string, string> = {
	'pages.auth.everId.LOGIN_WITH_EVER_ID': 'Login with <wordmark>Ever ID</wordmark>'
};
jest.mock('next-intl', () => ({
	useTranslations: () =>
		Object.assign((key: string) => key, {
			rich: (key: string, tags: Record<string, (chunks: React.ReactNode) => React.ReactNode>) => {
				const [before, tag, chunks, after] = (mockMessages[key] ?? key).split(/<(\w+)>(.*?)<\/\w+>/);
				return [before, tags[tag]?.(chunks), after];
			}
		})
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

/**
 * The Ever ID button: rendered from the published list like the others and hidden in demo mode, but on a row of its
 * own above them, as wide as the form's primary button: the spinning Ever star, "Login with" and the "Ever ID"
 * wordmark. These cases extend the suite; the ones above are unchanged.
 */
describe('SocialLogins: Ever ID', () => {
	it('renders "Login with Ever ID" on its own row, above the other providers', () => {
		const { container } = renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'github,ever-id,google' });

		expect(buttonLabels()).toEqual(['Login with Ever ID', 'Google', 'GitHub']);
		const everIdForm = screen.getByRole('button', { name: 'Login with Ever ID' }).closest('form');
		expect(everIdForm?.closest('.grid-cols-2')).toBeNull();
		expect(container.querySelectorAll('.grid-cols-2 form')).toHaveLength(2);
	});

	it('renders the Ever ID button alone when it is the only published provider', () => {
		const { container } = renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'ever-id' });

		expect(buttonLabels()).toEqual(['Login with Ever ID']);
		expect(screen.getByText('pages.auth.OR_CONTINUE_WITH')).toBeTruthy();
		expect(container.querySelector('.grid-cols-2')).toBeNull();
	});

	it("follows the brand kit: the form's full width, at least 40 px high, black in light and #EDEDED in dark", () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'ever-id' });

		const classes = screen.getByRole('button', { name: 'Login with Ever ID' }).className.split(' ');
		expect(classes).toEqual(
			expect.arrayContaining([
				'w-full',
				'min-h-10',
				'rounded-[8px]',
				'bg-[#0a0a0a]',
				'text-white',
				'dark:bg-[#ededed]'
			])
		);
	});

	it('spins the Ever star only without a reduced-motion setting, and draws "Ever ID" as its wordmark', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'ever-id' });

		const [star, wordmark] = Array.from(
			screen.getByRole('button', { name: 'Login with Ever ID' }).querySelectorAll('svg')
		);
		expect(star.getAttribute('class')).toContain('motion-safe:animate-[spin_9s_linear_infinite]');
		expect(star.getAttribute('class')).not.toMatch(/(^|\s)animate-/);
		expect(star.getAttribute('viewBox')).toBe('0 0 40 42');
		expect(wordmark.getAttribute('viewBox')).toBe('0 0 92 17');
		expect(wordmark.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
	});

	it('renders no Ever ID button when the server did not publish it', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'google', NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' });

		expect(buttonLabels()).toEqual(['Google']);
	});

	it('hides the Ever ID button in demo mode', () => {
		mockDemoMode = true;

		const { container } = renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'google,ever-id' });

		expect(container.innerHTML).toBe('');
	});

	it('starts the Ever ID sign-in', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'google,ever-id' });

		fireEvent.click(screen.getByRole('button', { name: 'Login with Ever ID' }));

		expect(mockSignInFunction).toHaveBeenCalledTimes(1);
		expect(mockSignInFunction).toHaveBeenCalledWith({ id: 'ever-id', name: 'Ever ID' });
	});

	it('reads "Login with Ever ID" to screen readers, with a decorative star and wordmark', () => {
		renderWithRuntimeEnv({ EVER_TEAMS_AUTH_PROVIDERS: 'ever-id' });

		const button = screen.getByRole('button', { name: 'Login with Ever ID' });
		expect(button.textContent).toBe('Login with Ever ID');
		const svgs = Array.from(button.querySelectorAll('svg'));
		expect(svgs).toHaveLength(2);
		for (const svg of svgs) expect(svg.getAttribute('aria-hidden')).toBe('true');
	});
});
