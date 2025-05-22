import { atom } from 'jotai';
<<<<<<< HEAD:apps/web/core/stores/projects/organization-projects.ts
import { IProject } from '../../types/interfaces';
=======
import { IProject } from '../types/interfaces/to-review';
>>>>>>> d2027d8b9 (refactor tasks and related types/interfaces):apps/web/core/stores/organization-projects.ts

export const organizationProjectsState = atom<IProject[]>([]);
