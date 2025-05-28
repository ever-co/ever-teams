import { atom } from 'jotai';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';

export const organizationProjectsState = atom<IOrganizationProject[]>([]);
