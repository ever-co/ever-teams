import { atom } from 'jotai';
import { TUpdateEmployee } from '@/core/types/schemas/organization/employee.schema';
import { TOrganizationTeamEmployee } from '@/core/types/schemas/team/organization-team-employee.schema';

export const workingEmployeesState = atom<TOrganizationTeamEmployee[]>([]);

export const workingEmployeesEmailState = atom<string[]>([]);

export const employeeUpdateState = atom<TUpdateEmployee>();
