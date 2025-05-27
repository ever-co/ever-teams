import { atom } from 'jotai';
import { IEmployee, IUpdateEmployee } from '../types/interfaces/organization/employee/IEmployee';

export const workingEmployeesState = atom<IEmployee[]>([]);

export const workingEmployeesEmailState = atom<string[]>([]);

export const employeeUpdateState = atom<IUpdateEmployee>();
