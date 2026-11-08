/**
 * What the About page shows besides the versions: its links and the copyable summary. Pure, so the rules (which
 * links may show, how the summary reads) are tested apart from the page.
 */

/** A GitHub page of the project, named by its translation key under `pages.about`. */
export interface RepositoryLink {
	key: 'REPOSITORY' | 'RELEASES' | 'ISSUES' | 'PULL_REQUESTS' | 'CONTRIBUTORS' | 'CONTRIBUTING';
	href: string;
}

/** The project's pages on GitHub: github.com is not an Ever host, so every deployment may show them. */
export function getRepositoryLinks(repositoryUrl: string): RepositoryLink[] {
	const base = repositoryUrl.endsWith('/') ? repositoryUrl.slice(0, -1) : repositoryUrl;
	return [
		{ key: 'REPOSITORY', href: base },
		{ key: 'RELEASES', href: `${base}/releases` },
		{ key: 'ISSUES', href: `${base}/issues` },
		{ key: 'PULL_REQUESTS', href: `${base}/pulls` },
		{ key: 'CONTRIBUTORS', href: `${base}/graphs/contributors` },
		{ key: 'CONTRIBUTING', href: `${base}/blob/HEAD/.github/CONTRIBUTING.MD` }
	];
}

/** The deployment's own links (its app, company, terms and privacy pages), as configured. */
export interface BrandingLinkSettings {
	appLink: string;
	companyLink: string;
	companyName: string;
	termsLink: string;
	privacyLink: string;
	/** Which of them the operator set, as opposed to the built-in Ever defaults. */
	setByOperator: { app: boolean; company: boolean; terms: boolean; privacy: boolean };
}

/** One "Learn more" link: a label of its own (a host, a company name), or a translation key for it. */
export interface BrandingLink {
	id: 'app' | 'company' | 'terms' | 'privacy';
	href: string;
	label?: string;
	labelKey?: 'layout.footer.TERMS' | 'layout.footer.PRIVACY_POLICY';
}

const isHttpUrl = (value: string) => /^https?:\/\/[^\s/?#]/i.test(value.trim());

const hostOf = (value: string) => {
	try {
		return new URL(value).host;
	} catch {
		return value;
	}
};

/**
 * The "Learn more" links. Only those the operator set show: the About page is not in the egress audit's UI
 * baseline, so with nothing set it must reference no Ever host (the defaults of these links are Ever pages). An
 * empty or non-http value (`none` turns a link off) shows nothing either.
 */
export function getBrandingLinks(settings: BrandingLinkSettings): BrandingLink[] {
	const links: BrandingLink[] = [];
	const { setByOperator } = settings;
	if (setByOperator.app && isHttpUrl(settings.appLink)) {
		links.push({ id: 'app', href: settings.appLink.trim(), label: hostOf(settings.appLink.trim()) });
	}
	if (setByOperator.company && isHttpUrl(settings.companyLink)) {
		links.push({
			id: 'company',
			href: settings.companyLink.trim(),
			label: settings.companyName.trim() || hostOf(settings.companyLink.trim())
		});
	}
	if (setByOperator.terms && isHttpUrl(settings.termsLink)) {
		links.push({ id: 'terms', href: settings.termsLink.trim(), labelKey: 'layout.footer.TERMS' });
	}
	if (setByOperator.privacy && isHttpUrl(settings.privacyLink)) {
		links.push({ id: 'privacy', href: settings.privacyLink.trim(), labelKey: 'layout.footer.PRIVACY_POLICY' });
	}
	return links;
}

/** The build of the web app as a person reads it: `development` or `production`. */
export function getBuildKind(nodeEnv: string | undefined): 'development' | 'production' {
	return nodeEnv === 'production' ? 'production' : 'development';
}

/**
 * The page's facts as plain `label: value` lines, for pasting into a bug report or a support chat. Rows without a
 * value are left out.
 */
export function formatAboutDetails(
	title: string,
	rows: ReadonlyArray<readonly [string, string | null | undefined]>
): string {
	const lines = rows
		.filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
		.map(([label, value]) => `${label}: ${(value as string).trim()}`);
	return [title, ...lines].join('\n');
}
