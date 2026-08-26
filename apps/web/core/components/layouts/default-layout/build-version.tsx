'use client';

import { useAppVersionQuery } from '@/core/hooks/common/use-app-version-query';
import {
	EVER_GAUZY_REPOSITORY_URL,
	EVER_TEAMS_REPOSITORY_URL,
	getCommitUrl,
	getShortCommit,
	getWebBuildInfo
} from '@/core/lib/build-info';

function CommitLink({ commit, repositoryUrl }: { commit: string; repositoryUrl: string }) {
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
			title={`Open commit ${commit}`}
		>
			{shortCommit}
		</a>
	);
}

export function BuildVersion() {
	const webVersion = getWebBuildInfo();
	const { data: apiVersion } = useAppVersionQuery();
	const hasApiVersion = Boolean(apiVersion?.version?.trim() && apiVersion?.commit?.trim());

	return (
		<span>
			Build Web v{webVersion.version} ·{' '}
			<CommitLink commit={webVersion.commit} repositoryUrl={EVER_TEAMS_REPOSITORY_URL} />
			{hasApiVersion && apiVersion ? (
				<>
					{' · '}API v{apiVersion.version} ·{' '}
					<CommitLink commit={apiVersion.commit} repositoryUrl={EVER_GAUZY_REPOSITORY_URL} />
				</>
			) : null}
		</span>
	);
}
