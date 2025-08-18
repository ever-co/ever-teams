import { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import { atom } from 'jotai';

export const currentOrganizationState = atom<TOrganization | null>(null);
export const currentOrganizationFetchingState = atom<boolean>(false);
