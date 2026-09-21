export const EVER_TEAMS_REPOSITORY_URL = 'https://github.com/ever-co/ever-teams';
export const EVER_GAUZY_REPOSITORY_URL = 'https://github.com/ever-co/ever-gauzy';

interface BuildInfo {
	version: string;
	commit: string;
}

export function getWebBuildInfo(): BuildInfo {
	return {
		version: process.env.NEXT_PUBLIC_BUILD_VERSION?.trim() || '0.0.0',
		commit: process.env.NEXT_PUBLIC_BUILD_SHA?.trim() || 'dev'
	};
}

export function getShortCommit(commit: string): string {
	return commit.slice(0, 7);
}

export function getVersionNumber(version: string): string {
	return version.trim().replace(/^v(?=\d)/i, '');
}

export function getCommitUrl(repositoryUrl: string, commit: string): string {
	return `${repositoryUrl}/commit/${commit}`;
}
