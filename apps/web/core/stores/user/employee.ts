import { IUpdateEmployee, IWorkingEmployee } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const workingEmployeesState = atom<IWorkingEmployee[]>([]);

export const workingEmployeesEmailState = atom<string[]>([]);

export const employeeUpdateState = atom<IUpdateEmployee>();
