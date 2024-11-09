import { IUpdateEmployee, IWorkingEmployee } from '@app/interfaces';
import { atom } from 'jotai';

export const workingEmployeesState = atom<IWorkingEmployee[]>([]);

export const workingEmployeesEmailState = atom<string[]>([]);

export const employeeUpdateState = atom<IUpdateEmployee>();
