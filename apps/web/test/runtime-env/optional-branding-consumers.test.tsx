/**
 * @jest-environment jsdom
 */
/**
 * A deployment turns optional branding off with the value 'none', which constants.tsx turns into ''
 * (see deployment-defaults.test.ts). The components that render the slogan, the company link and the
 * legal links must then render nothing for it, instead of an empty or dead link, and keep Ever's
 * defaults unchanged otherwise.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import Footer from '@/core/components/layouts/default-layout/footer/footer';
import { CompleteInvitationRegistrationForm } from '@/core/components/pages/auth/accept-invite/complete-invitation-registration-form';

// Filled per test from EVER_BRANDING (see beforeEach): the components read these at render time.
jest.mock('@/core/constants/config/constants', () => ({}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href, target, rel }: React.ComponentProps<'a'>) => (
		<a href={href} target={target} rel={rel}>
			{children}
		</a>
	)
}));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('@/core/lib/helpers', () => ({ cn: (...values: unknown[]) => values.filter(Boolean).join(' ') }));
jest.mock('@/core/components/svgs', () => ({ EverTeamsLogo: () => null }));
jest.mock('@/core/components/common/language-dropdown-flags', () => ({ LanguageDropDownWithFlags: () => null }));
jest.mock('@/core/components/layouts/default-layout/toggle-theme-btns', () => ({
	__esModule: true,
	default: () => null
}));
jest.mock('@/core/components', () => ({
	Text: {
		Link: ({ children, href }: React.ComponentProps<'a'>) => <a href={href}>{children}</a>
	},
	ThemeToggler: () => null,
	BackdropLoader: () => null,
	Button: ({ children, disabled, type }: React.ComponentProps<'button'> & { loading?: boolean }) => (
		<button disabled={disabled} type={type}>
			{children}
		</button>
	)
}));
jest.mock('@/core/components/common/checkbox', () => ({
	Checkbox: ({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: () => void }) => (
		<input id={id} type="checkbox" checked={checked} onChange={onCheckedChange} />
	)
}));
jest.mock('@/core/components/common/ever-card', () => ({
	EverCard: ({ children }: React.PropsWithChildren) => <div>{children}</div>
}));
jest.mock('@/core/components/common/typography', () => ({
	Text: {
		Heading: ({ children }: React.PropsWithChildren) => <h3>{children}</h3>,
		Error: ({ children }: React.PropsWithChildren) => <p>{children}</p>
	}
}));
jest.mock('@/core/components/duplicated-components/_input', () => ({
	InputField: ({ name, type, value, onChange }: React.ComponentProps<'input'>) => (
		<input name={name} type={type} value={value} onChange={onChange} />
	)
}));

const EVER_BRANDING = {
	APP_NAME: 'Ever Teams',
	APP_LINK: 'https://app.ever.team',
	APP_SLOGAN_TEXT: 'Real-Time Clarity, Real-Time Reality™.',
	COMPANY_NAME: 'Ever Co. LTD',
	COMPANY_LINK: 'https://ever.co',
	TERMS_LINK: 'https://ever.team/tos',
	PRIVACY_POLICY_LINK: 'https://ever.team/privacy',
	MAIN_PICTURE: '/assets/cover/auth-bg-cover.png',
	MAIN_PICTURE_DARK: '/assets/cover/auth-bg-cover-dark.png',
	IS_DEMO_MODE: false
};
const TURNED_OFF = { APP_SLOGAN_TEXT: '', COMPANY_LINK: '', TERMS_LINK: '', PRIVACY_POLICY_LINK: '' };

const constants = jest.requireMock('@/core/constants/config/constants') as Record<string, unknown>;

beforeEach(() => {
	Object.assign(constants, EVER_BRANDING);
});

const linkTo = (name: string) => screen.queryByRole('link', { name })?.getAttribute('href');

describe('AuthLayout', () => {
	it('renders the slogan, company, terms and privacy links by default', () => {
		render(<AuthLayout>content</AuthLayout>);

		expect(screen.getByText('Real-Time Clarity, Real-Time Reality™.')).toBeTruthy();
		expect(linkTo('Ever Co. LTD')).toBe('https://ever.co');
		expect(linkTo('pages.auth.TERMS_OF_SERVICE')).toBe('https://ever.team/tos');
		expect(linkTo('pages.auth.PRIVACY_POLICY')).toBe('https://ever.team/privacy');
		expect(screen.getByText('·', { exact: false })).toBeTruthy();
	});

	it('renders none of them when the deployment turned them off', () => {
		Object.assign(constants, TURNED_OFF);

		const { container } = render(<AuthLayout>content</AuthLayout>);

		expect(screen.queryByText('Real-Time Clarity, Real-Time Reality™.')).toBeNull();
		expect(screen.queryByText('pages.auth.TERMS_OF_SERVICE')).toBeNull();
		expect(screen.queryByText('pages.auth.PRIVACY_POLICY')).toBeNull();
		expect(container.textContent).not.toContain('·');
		// The company is still credited, just not linked.
		expect(screen.getByText('Ever Co. LTD').tagName).toBe('SPAN');
		expect(container.querySelector('a[href=""]')).toBeNull();
	});

	it('drops the separator when only one legal link is left', () => {
		Object.assign(constants, { TERMS_LINK: '' });

		const { container } = render(<AuthLayout>content</AuthLayout>);

		expect(screen.queryByText('pages.auth.TERMS_OF_SERVICE')).toBeNull();
		expect(linkTo('pages.auth.PRIVACY_POLICY')).toBe('https://ever.team/privacy');
		expect(container.textContent).not.toContain('·');
	});
});

describe('app Footer', () => {
	it('links the terms and privacy policy by default', () => {
		render(<Footer />);

		expect(linkTo('layout.footer.TERMS')).toBe('https://ever.team/tos');
		expect(linkTo('layout.footer.PRIVACY_POLICY')).toBe('https://ever.team/privacy');
		expect(linkTo('Ever Co. LTD')).toBe('https://ever.co');
	});

	it('renders no terms, privacy or company link when the deployment turned them off', () => {
		Object.assign(constants, TURNED_OFF);

		const { container } = render(<Footer />);

		expect(screen.queryByText('layout.footer.TERMS')).toBeNull();
		expect(screen.queryByText('layout.footer.PRIVACY_POLICY')).toBeNull();
		expect(screen.getByText('Ever Co. LTD').tagName).toBe('SPAN');
		expect(container.querySelector('a[href=""]')).toBeNull();
	});
});

describe('CompleteInvitationRegistrationForm', () => {
	const invitationData = {
		fullName: 'Jane Doe',
		email: 'jane@example.org',
		organization: { name: 'Acme' }
	} as unknown as React.ComponentProps<typeof CompleteInvitationRegistrationForm>['invitationData'];
	const renderForm = () =>
		render(
			<CompleteInvitationRegistrationForm
				invitationData={invitationData}
				onCompleteRegistration={jest.fn()}
				acceptInvitationLoading={false}
			/>
		);
	const joinButton = () => screen.getByRole('button', { name: 'common.JOIN_REQUEST' }) as HTMLButtonElement;

	it('asks the invitee to agree to the terms by default', () => {
		renderForm();

		expect(linkTo('layout.footer.TERMS_AND_CONDITIONS')).toBe('https://ever.team/tos');
		expect(joinButton().disabled).toBe(true);

		fireEvent.click(screen.getByRole('checkbox'));

		expect(joinButton().disabled).toBe(false);
	});

	it('has nothing to agree to when the deployment turned the terms off', () => {
		Object.assign(constants, { TERMS_LINK: '' });

		renderForm();

		expect(screen.queryByRole('checkbox')).toBeNull();
		expect(screen.queryByText('form.AGREE_TO', { exact: false })).toBeNull();
		expect(joinButton().disabled).toBe(false);
	});
});
