import { IUpdateEmployee, IEmployee } from '@/core/types/interfaces/to-review';
import { atom } from 'jotai';

export const workingEmployeesState = atom<IEmployee[]>([]);

export const workingEmployeesEmailState = atom<string[]>([]);

export const employeeUpdateState = atom<IUpdateEmployee>();
