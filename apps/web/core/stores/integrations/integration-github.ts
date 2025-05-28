import { IGithubMetadata } from '@/core/types/interfaces/integrations/github-metadata';
import { IGithubRepositories } from '@/core/types/interfaces/integrations/github-repositories';
import { atom } from 'jotai';

export const integrationGithubMetadataState = atom<IGithubMetadata | null>(null);

export const integrationGithubRepositoriesState = atom<IGithubRepositories | null>(null);
