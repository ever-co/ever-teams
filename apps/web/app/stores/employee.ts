import { IUpdateEmployee, IWorkingEmployee } from '@app/interfaces';
import { atom } from 'recoil';

export const workingEmployeesState = atom<IWorkingEmployee[]>({
	key: 'workingEmployeesState',
	default: []
});

export const workingEmployeesEmailState = atom<string[]>({
	key: 'workingEmployeesEmailState',
	default: []
});


export const employeeUpdateState = atom<IUpdateEmployee>({
	key: 'employeeUpdateState',
	default: undefined,
})
