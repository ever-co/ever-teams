import { atom } from 'jotai';
import { IOrganizationProject } from '../types/interfaces/project/organization-project';

export const organizationProjectsState = atom<IOrganizationProject[]>([]);
