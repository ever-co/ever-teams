import { atom } from 'jotai';
import { IProject } from '../types/interfaces';

export const organizationProjectsState = atom<IProject[]>([]);
