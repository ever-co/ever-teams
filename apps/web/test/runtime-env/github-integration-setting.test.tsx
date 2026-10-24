/**
 * @jest-environment jsdom
 */
/**
 * A reused image has no GitHub App unless its deployment names one (NEXT_PUBLIC_GITHUB_APP_NAME, no code
 * default): the team settings must then not offer a github.com/apps//installations/new link (a 404),
 * let alone one to Ever's app.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntegrationSetting } from '@/core/components/pages/settings/team/integration-setting';

jest.mock('@/core/constants/config/constants', () => ({ GITHUB_APP_NAME: { value: '' } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useParams: () => ({ locale: 'fr' }) }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: React.ComponentProps<'a'>) => <a href={href}>{children}</a>
}));
jest.mock('jotai', () => ({ useAtomValue: () => null }));
jest.mock('@/core/stores', () => ({ activeTeamState: Symbol('activeTeamState') }));
jest.mock('assets/svg', () => ({ TrashIcon: () => null }), { virtual: true });
jest.mock('@/core/lib/helpers/index', () => ({ getActiveProjectIdCookie: () => undefined }));
jest.mock('@/core/hooks', () => ({
	useGitHubIntegration: () => ({
		integrationGithubRepositories: undefined,
		getRepositories: jest.fn(),
		syncGitHubRepository: jest.fn(),
		integrationGithubMetadata: undefined,
		metaData: jest.fn()
	}),
	useIntegrationTenant: () => ({
		getIntegrationTenant: jest.fn(),
		loading: false,
		integrationTenant: [],
		deleteIntegrationTenant: jest.fn()
	}),
	useIntegrationTypes: () => ({ getIntegrationTypes: () => Promise.resolve([]) })
}));
jest.mock('@/core/hooks/organizations/projects/use-edit-organization-project', () => ({
	useEditOrganizationProject: () => ({
		editOrganizationProjectSetting: jest.fn(),
		editOrganizationProject: jest.fn()
	})
}));
jest.mock('@/core/components', () => ({
	Button: ({ children, disabled, title }: React.ComponentProps<'button'>) => (
		<button disabled={disabled} title={title}>
			{children}
		</button>
	)
}));
jest.mock('@/core/components/common/select', () => {
	const Passthrough = ({ children }: React.PropsWithChildren) => <>{children}</>;
	return {
		Select: Passthrough,
		SelectContent: Passthrough,
		SelectItem: Passthrough,
		SelectTrigger: Passthrough,
		SelectValue: () => null
	};
});
jest.mock('@/core/components/duplicated-components/_input', () => ({ InputField: () => null }));

const constants = jest.requireMock('@/core/constants/config/constants') as { GITHUB_APP_NAME: { value: string } };

beforeEach(() => {
	constants.GITHUB_APP_NAME = { value: '' };
});

describe('GitHub integration settings', () => {
	it('offers no install link when the deployment has no GitHub App', () => {
		const { container } = render(<IntegrationSetting />);

		expect(container.querySelector('a[href*="github.com/apps"]')).toBeNull();
		const install = screen.getByRole('button', { name: 'pages.settingsTeam.INSTALL' }) as HTMLButtonElement;
		expect(install.disabled).toBe(true);
	});

	it("links to the deployment's own GitHub App", () => {
		constants.GITHUB_APP_NAME = { value: 'acme-github' };

		render(<IntegrationSetting />);

		const href = screen.getByRole('link', { name: 'pages.settingsTeam.INSTALL' }).getAttribute('href');
		expect(href).toBe(
			`https://github.com/apps/acme-github/installations/new?state=${encodeURIComponent(
				`${window.location.origin}/fr/integration/github`
			)}`
		);
		expect(screen.queryByRole('button', { name: 'pages.settingsTeam.INSTALL' })).toBeNull();
	});
});
