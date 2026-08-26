'use client';

import { useTranslations } from 'next-intl';
import { useAppVersionQuery } from '@/core/hooks/common/use-app-version-query';
import {
	EVER_GAUZY_REPOSITORY_URL,
	EVER_TEAMS_REPOSITORY_URL,
	getCommitUrl,
	getShortCommit,
	getWebBuildInfo
} from '@/core/lib/build-info';

function CommitLink({ commit, repositoryUrl }: { commit: string; repositoryUrl: string }) {
	const t = useTranslations();
	const shortCommit = getShortCommit(commit);

	if (commit === 'dev') {
		return <span>{shortCommit}</span>;
	}

	return (
		<a
			className="hover:underline"
			href={getCommitUrl(repositoryUrl, commit)}
			target="_blank"
			rel="noopener noreferrer"
			title={t('layout.footer.OPEN_COMMIT', { commit })}
		>
			{shortCommit}
		</a>
	);
}

export function BuildVersion() {
	const t = useTranslations();
	const webVersion = getWebBuildInfo();
	const { data: apiVersion } = useAppVersionQuery();
	const hasApiVersion = Boolean(apiVersion?.version?.trim() && apiVersion?.commit?.trim());

	return (
		<span>
			{t('layout.footer.BUILD_WEB', { version: webVersion.version })} ·{' '}
			<CommitLink commit={webVersion.commit} repositoryUrl={EVER_TEAMS_REPOSITORY_URL} />
			{hasApiVersion && apiVersion ? (
				<>
					{' · '}
					{t('layout.footer.API_VERSION', { version: apiVersion.version })} ·{' '}
					<CommitLink commit={apiVersion.commit} repositoryUrl={EVER_GAUZY_REPOSITORY_URL} />
				</>
			) : null}
		</span>
	);
}
