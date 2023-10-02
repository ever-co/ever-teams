import { IGithubMetadata, IGithubRepositories } from '@app/interfaces';
import { atom } from 'recoil';

export const integrationGithubMetadataState = atom<IGithubMetadata | null>({
	key: 'integrationGithubMetadataState',
	default: null,
});

export const integrationGithubRepositoriesState =
	atom<IGithubRepositories | null>({
		key: 'integrationGithubRepositoriesState',
		default: null,
	});
