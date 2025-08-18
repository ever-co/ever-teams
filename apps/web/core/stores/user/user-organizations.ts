import { TOrganization } from '@/core/types/schemas/organization/organization.schema';
import { atom } from 'jotai';

export const currentOrganizationState = atom<TOrganization>();
export const currentOrganizationFetchingState = atom<boolean>(false);
