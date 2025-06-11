import { atom } from 'jotai';
import { TOrganizationProject } from '@/core/types/schemas';

export const organizationProjectsState = atom<TOrganizationProject[]>([]);
