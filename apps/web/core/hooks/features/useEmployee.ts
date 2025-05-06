import { workingEmployeesEmailState, workingEmployeesState } from '@/core/stores/employee';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';

import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';
import { IUpdateEmployee } from '@/core/types/interfaces';
import { useFirstLoad } from '../useFirstLoad';
import { employeeService } from '@/core/services/client/api/organization-team';

export const useEmployee = () => {
	const { user } = useAuthenticateUser();
	const [workingEmployees, setWorkingEmployees] = useAtom(workingEmployeesState);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useAtom(workingEmployeesEmailState);
	const { firstLoad, firstLoadData: firstLoadDataEmployee } = useFirstLoad();

	const { queryCall: getWorkingEmployeeQueryCall, loading: getWorkingEmployeeLoading } = useQuery(
		employeeService.getWorkingEmployees
	);

	const getWorkingEmployee = useCallback(() => {
		if (!user?.tenantId) {
			return;
		}
		getWorkingEmployeeQueryCall(user?.tenantId, user?.employee.organizationId).then(({ data }) => {
			if (data?.items && data?.items?.length) {
				const items = data.items || [];

				setWorkingEmployees(items);
				setWorkingEmployeesEmail(items.map((item: any) => item.user?.email || ''));
			}
		});
	}, [getWorkingEmployeeQueryCall, setWorkingEmployees, setWorkingEmployeesEmail, user]);

	useEffect(() => {
		if (firstLoad) {
			getWorkingEmployee();
		}
	}, [getWorkingEmployee, firstLoad]);

	return {
		firstLoadDataEmployee,
		getWorkingEmployeeQueryCall,
		getWorkingEmployeeLoading,
		workingEmployees,
		workingEmployeesEmail
	};
};

export const useEmployeeUpdate = () => {
	const { queryCall: employeeUpdateQuery, loading: isLoading } = useQuery(employeeService.updateEmployee);

	const updateEmployee = useCallback(
		({ id, data }: { id: string; data: IUpdateEmployee }) => {
			employeeUpdateQuery({ id, data })
				.then((res) => res.data)
				.catch((error) => {
					console.log(error);
				});
		},
		[employeeUpdateQuery]
	);

	return { updateEmployee, isLoading };
};
