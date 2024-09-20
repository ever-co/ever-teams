import { IGithubMetadata, IGithubRepositories } from '@app/interfaces';
import { atom } from 'jotai';

export const integrationGithubMetadataState = atom<IGithubMetadata | null>(
  null
);

export const integrationGithubRepositoriesState = atom<IGithubRepositories | null>(
  null
);
