import { atom } from 'jotai';
import { IProject } from '../../core/types/interfaces';

export const organizationProjectsState = atom<IProject[]>([]);
