import { IGithubMetadata } from '@/core/types/interfaces/integrations/IGithubMetadata';
import { IGithubRepositories } from '@/core/types/interfaces/integrations/IGithubRepositories';
import { atom } from 'jotai';

export const integrationGithubMetadataState = atom<IGithubMetadata | null>(null);

export const integrationGithubRepositoriesState = atom<IGithubRepositories | null>(null);
