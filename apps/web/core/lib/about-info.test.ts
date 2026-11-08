import { formatAboutDetails, getBrandingLinks, getBuildKind, getRepositoryLinks } from './about-info';

const settings = {
	appLink: 'https://app.example.com',
	companyLink: 'https://example.com',
	companyName: 'Example Ltd',
	termsLink: 'https://example.com/tos',
	privacyLink: 'https://example.com/privacy'
};

describe('About page links', () => {
	it('lists the project pages on GitHub', () => {
		expect(getRepositoryLinks('https://github.com/ever-co/ever-teams/')).toEqual([
			{ key: 'REPOSITORY', href: 'https://github.com/ever-co/ever-teams' },
			{ key: 'RELEASES', href: 'https://github.com/ever-co/ever-teams/releases' },
			{ key: 'ISSUES', href: 'https://github.com/ever-co/ever-teams/issues' },
			{ key: 'PULL_REQUESTS', href: 'https://github.com/ever-co/ever-teams/pulls' },
			{ key: 'CONTRIBUTORS', href: 'https://github.com/ever-co/ever-teams/graphs/contributors' },
			{ key: 'CONTRIBUTING', href: 'https://github.com/ever-co/ever-teams/blob/HEAD/.github/CONTRIBUTING.MD' }
		]);
	});

	it('shows no branding link the operator did not set, so the page references no Ever host by default', () => {
		expect(
			getBrandingLinks({
				...settings,
				appLink: 'https://app.ever.team',
				companyLink: 'https://ever.co',
				setByOperator: { app: false, company: false, terms: false, privacy: false }
			})
		).toEqual([]);
	});

	it("shows the operator's links: the app by its host, the company by its name, the legal pages by label", () => {
		expect(
			getBrandingLinks({ ...settings, setByOperator: { app: true, company: true, terms: true, privacy: true } })
		).toEqual([
			{ id: 'app', href: 'https://app.example.com', label: 'app.example.com' },
			{ id: 'company', href: 'https://example.com', label: 'Example Ltd' },
			{ id: 'terms', href: 'https://example.com/tos', labelKey: 'layout.footer.TERMS' },
			{ id: 'privacy', href: 'https://example.com/privacy', labelKey: 'layout.footer.PRIVACY_POLICY' }
		]);
	});

	it('leaves out a link turned off or not an http(s) address', () => {
		expect(
			getBrandingLinks({
				...settings,
				companyLink: '',
				termsLink: 'javascript:alert(1)',
				setByOperator: { app: false, company: true, terms: true, privacy: true }
			}).map(({ id }) => id)
		).toEqual(['privacy']);
	});
});

describe('About page link checks', () => {
	it('refuses a malformed address or one carrying credentials', () => {
		expect(
			getBrandingLinks({
				...settings,
				appLink: 'https://[bad',
				companyLink: 'https://user:secret@example.com',
				setByOperator: { app: true, company: true, terms: false, privacy: false }
			})
		).toEqual([]);
	});
});

describe('About page details', () => {
	it('reads the build kind from NODE_ENV', () => {
		expect(getBuildKind('production')).toBe('production');
		expect(getBuildKind('development')).toBe('development');
		expect(getBuildKind(undefined)).toBe('development');
	});

	it('copies the facts as label: value lines, leaving out empty ones', () => {
		expect(
			formatAboutDetails('Ever Teams', [
				['Web App', 'v1.2.3 (abc1234)'],
				['Deployment', null],
				['Mode', '  '],
				['Language', 'English']
			])
		).toBe('Ever Teams\nWeb App: v1.2.3 (abc1234)\nLanguage: English');
	});
});
