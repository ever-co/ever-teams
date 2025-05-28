import { atom } from 'jotai';
import { IOrganizationProject } from '@/core/types/interfaces/project/IOrganizationProject';

export const organizationProjectsState = atom<IOrganizationProject[]>([]);
