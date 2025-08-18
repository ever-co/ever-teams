import { IUserOrganization } from '@/core/types/interfaces/organization/user-organization';
import { atom } from 'jotai';

export const currentUserOrganizationState = atom<IUserOrganization>();
export const currentUserOrganizationFetchingState = atom<boolean>(false);
