import { IGithubMetadata, IGithubRepositories } from '@/core/types/interfaces';
import { atom } from 'jotai';

export const integrationGithubMetadataState = atom<IGithubMetadata | null>(null);

export const integrationGithubRepositoriesState = atom<IGithubRepositories | null>(null);
